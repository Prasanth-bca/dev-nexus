import { getSecret } from "@/lib/kernel/secrets";

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

async function githubFetch<T>(path: string): Promise<T> {
  const token = await getSecret("GITHUB_TOKEN");
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...API_HEADERS, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as GithubApiError;
    throw new Error(`GitHub API ${path} failed (${res.status}): ${body.message ?? res.statusText}`);
  }
  return res.json();
}

/** Verifies a token the user just typed in (not yet saved) before persisting it — mirrors how Gmail validates OAuth tokens on exchange. */
export async function verifyToken(token: string): Promise<{ login: string }> {
  const res = await fetch(`${API_BASE}/user`, { headers: { ...API_HEADERS, Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(res.status === 401 ? "Invalid GitHub token." : `GitHub API error (${res.status}).`);
  const data = await res.json();
  return { login: data.login };
}

export interface RepoSummary {
  id: number;
  fullName: string;
  description: string | null;
  private: boolean;
  stars: number;
  language: string | null;
  updatedAt: string;
  htmlUrl: string;
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
}

function toRepoSummary(r: GithubApiRepo): RepoSummary {
  return {
    id: r.id,
    fullName: r.full_name,
    description: r.description,
    private: r.private,
    stars: r.stargazers_count,
    language: r.language,
    updatedAt: r.updated_at,
    htmlUrl: r.html_url,
  };
}

/** Most-recently-updated first. Capped at `maxResults` — fine for a personal account's dashboard/search use, not a full paginated browser. */
export async function listRepos(maxResults = 100): Promise<RepoSummary[]> {
  const repos = await githubFetch<GithubApiRepo[]>(`/user/repos?sort=updated&per_page=${maxResults}`);
  return repos.map(toRepoSummary);
}

export async function getRepo(owner: string, repo: string): Promise<RepoSummary> {
  return toRepoSummary(await githubFetch<GithubApiRepo>(`/repos/${owner}/${repo}`));
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
