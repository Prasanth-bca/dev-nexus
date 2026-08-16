import { getSecret } from "@/lib/kernel/secrets";
import { EXTERNAL_FETCH_TIMEOUT_MS } from "@/lib/fetch-timeout";

/**
 * Shared GitHub API client — lives here (not inside the `github` module) so other modules could
 * call it later without reaching into github's internals, same pattern as gmail.ts. Auth is a
 * classic/fine-grained personal access token the user pastes in during Settings — no OAuth app
 * registration needed, unlike Gmail, since GitHub PATs are a first-class self-service credential.
 */

const API_BASE = "https://api.github.com";
const API_HEADERS = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };

interface GithubApiError {
  message?: string;
}

declare global {
  var _devNexusGithubToken: string | undefined;
}

/**
 * Unlike Gmail's OAuth access token, a GitHub PAT doesn't expire on a timer — it's a static
 * secret that only changes when the user edits it in Settings — so this just caches the
 * decrypted value for the process lifetime rather than tracking an expiry. Without this,
 * opening one repo-detail view (branches/commits/pulls/issues fetched in parallel) triggered
 * that many redundant DB round-trips and AES-256-GCM decrypts of the identical token.
 */
async function getGithubToken(): Promise<string> {
  if (global._devNexusGithubToken !== undefined) return global._devNexusGithubToken;
  const token = await getSecret("GITHUB_TOKEN");
  global._devNexusGithubToken = token;
  return token;
}

/** Called when the token changes (Settings save/remove), so a stale one can't outlive the credential it belongs to. */
export function invalidateGithubToken(): void {
  global._devNexusGithubToken = undefined;
}

async function githubFetch<T>(path: string): Promise<T> {
  const token = await getGithubToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...API_HEADERS, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as GithubApiError;
    throw new Error(`GitHub API ${path} failed (${res.status}): ${body.message ?? res.statusText}`);
  }
  return res.json();
}

/**
 * Verifies a token the user just typed in (not yet saved) before persisting it — mirrors how
 * Gmail validates OAuth tokens on exchange.
 *
 * Also surfaces the token's granted scopes, read off the `X-OAuth-Scopes` response header.
 * That header is only ever set for *classic* PATs — fine-grained PATs don't use OAuth scopes
 * at all (their access is repo-by-repo, configured when the token was created), so `scopes`
 * comes back empty for those. Both are legitimate; this just can't describe a fine-grained
 * token's access as a scope list because GitHub doesn't expose one.
 */
export async function verifyToken(token: string): Promise<{ login: string; scopes: string[] }> {
  const res = await fetch(`${API_BASE}/user`, {
    headers: { ...API_HEADERS, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(res.status === 401 ? "Invalid GitHub token." : `GitHub API error (${res.status}).`);
  const data = await res.json();
  const scopesHeader = res.headers.get("x-oauth-scopes");
  const scopes = scopesHeader
    ? scopesHeader
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  return { login: data.login, scopes };
}

export type RepoRelationship = "owner" | "collaborator" | "organization";
export type RepoPermission = "admin" | "maintain" | "write" | "triage" | "read" | null;

export interface RepoSummary {
  id: number;
  fullName: string;
  description: string | null;
  private: boolean;
  stars: number;
  language: string | null;
  updatedAt: string;
  htmlUrl: string;
  ownerLogin: string;
  ownerType: "User" | "Organization";
  /**
   * Why this repo shows up at all, derived (not returned directly by GitHub) by comparing
   * the repo's owner to the authenticated user: "owner" if it's the viewer's own account,
   * "organization" if the owner is an org, otherwise "collaborator" (added to someone else's
   * personal repo). This is exactly the distinction GitHub's own permission model draws —
   * `/user/repos` defaults to returning repos from all three affiliations at once.
   */
  relationship: RepoRelationship;
  /** The viewer's own access level on this specific repo, highest-privilege label first. Only present when GitHub includes a `permissions` object on the repo (it does for authenticated list/get calls). */
  permission: RepoPermission;
}

interface GithubApiRepo {
  id: number;
  full_name: string;
  description: string | null;
  private: boolean;
  stargazers_count: number;
  language: string | null;
  updated_at: string;
  html_url: string;
  owner: { login: string; type: string };
  permissions?: { admin?: boolean; maintain?: boolean; push?: boolean; triage?: boolean; pull?: boolean };
}

function derivePermission(p: GithubApiRepo["permissions"]): RepoPermission {
  if (!p) return null;
  if (p.admin) return "admin";
  if (p.maintain) return "maintain";
  if (p.push) return "write";
  if (p.triage) return "triage";
  if (p.pull) return "read";
  return null;
}

function toRepoSummary(r: GithubApiRepo, viewerLogin: string): RepoSummary {
  const relationship: RepoRelationship =
    r.owner.login.toLowerCase() === viewerLogin.toLowerCase()
      ? "owner"
      : r.owner.type === "Organization"
        ? "organization"
        : "collaborator";
  return {
    id: r.id,
    fullName: r.full_name,
    description: r.description,
    private: r.private,
    stars: r.stargazers_count,
    language: r.language,
    updatedAt: r.updated_at,
    htmlUrl: r.html_url,
    ownerLogin: r.owner.login,
    ownerType: r.owner.type === "Organization" ? "Organization" : "User",
    relationship,
    permission: derivePermission(r.permissions),
  };
}

/**
 * Most-recently-updated first. Capped at `maxResults` — fine for a personal account's
 * dashboard/search use, not a full paginated browser.
 *
 * Hits `GET /user/repos` with no `affiliation`/`visibility` filter, which is *why* private
 * and collaborator/org repos show up: that's GitHub's documented default for this endpoint —
 * it returns the union of repos you own, repos you collaborate on, and repos belonging to any
 * organization you belong to, public and private alike (private ones included only because the
 * token itself has read access to them). Filtering to a subset happens client-side against
 * `relationship`/`private` below, rather than making a separate API call per filter.
 */
export async function listRepos(maxResults = 100): Promise<RepoSummary[]> {
  const [repos, viewer] = await Promise.all([
    githubFetch<GithubApiRepo[]>(`/user/repos?sort=updated&per_page=${maxResults}`),
    githubFetch<{ login: string }>("/user"),
  ]);
  return repos.map((r) => toRepoSummary(r, viewer.login));
}

export async function getRepo(owner: string, repo: string): Promise<RepoSummary> {
  const [data, viewer] = await Promise.all([
    githubFetch<GithubApiRepo>(`/repos/${owner}/${repo}`),
    githubFetch<{ login: string }>("/user"),
  ]);
  return toRepoSummary(data, viewer.login);
}

export interface Branch {
  name: string;
  protected: boolean;
}

export async function listBranches(owner: string, repo: string): Promise<Branch[]> {
  const data = await githubFetch<Branch[]>(`/repos/${owner}/${repo}/branches?per_page=30`);
  return data.map((b) => ({ name: b.name, protected: b.protected }));
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  htmlUrl: string;
}

interface GithubApiCommit {
  sha: string;
  html_url: string;
  commit: { message: string; author?: { name?: string; date?: string } };
  author?: { login?: string } | null;
}

export async function listCommits(owner: string, repo: string, branch?: string, maxResults = 20): Promise<Commit[]> {
  const branchParam = branch ? `&sha=${encodeURIComponent(branch)}` : "";
  const data = await githubFetch<GithubApiCommit[]>(`/repos/${owner}/${repo}/commits?per_page=${maxResults}${branchParam}`);
  return data.map((c) => ({
    sha: c.sha.slice(0, 7),
    message: c.commit.message.split("\n")[0],
    author: c.author?.login ?? c.commit.author?.name ?? "unknown",
    date: c.commit.author?.date ?? "",
    htmlUrl: c.html_url,
  }));
}

export interface PullRequest {
  number: number;
  title: string;
  state: "open" | "closed";
  merged: boolean;
  author: string;
  createdAt: string;
  htmlUrl: string;
}

interface GithubApiPull {
  number: number;
  title: string;
  state: "open" | "closed";
  merged_at: string | null;
  user?: { login?: string } | null;
  created_at: string;
  html_url: string;
}

export async function listPullRequests(owner: string, repo: string, maxResults = 20): Promise<PullRequest[]> {
  const data = await githubFetch<GithubApiPull[]>(`/repos/${owner}/${repo}/pulls?state=all&per_page=${maxResults}`);
  return data.map((p) => ({
    number: p.number,
    title: p.title,
    state: p.state,
    merged: Boolean(p.merged_at),
    author: p.user?.login ?? "unknown",
    createdAt: p.created_at,
    htmlUrl: p.html_url,
  }));
}

export interface Issue {
  number: number;
  title: string;
  state: "open" | "closed";
  author: string;
  createdAt: string;
  htmlUrl: string;
  commentCount: number;
}

interface GithubApiIssue {
  number: number;
  title: string;
  state: "open" | "closed";
  user?: { login?: string } | null;
  created_at: string;
  html_url: string;
  comments: number;
  pull_request?: unknown;
}

/** GitHub's /issues endpoint includes pull requests too (a PR is an issue under the hood) — filtered out here since Pull Requests get their own tab. */
export async function listIssues(owner: string, repo: string, maxResults = 20): Promise<Issue[]> {
  const data = await githubFetch<GithubApiIssue[]>(`/repos/${owner}/${repo}/issues?state=all&per_page=${maxResults}`);
  return data
    .filter((i) => !i.pull_request)
    .map((i) => ({
      number: i.number,
      title: i.title,
      state: i.state,
      author: i.user?.login ?? "unknown",
      createdAt: i.created_at,
      htmlUrl: i.html_url,
      commentCount: i.comments,
    }));
}
