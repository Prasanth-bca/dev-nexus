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

export interface Branch {
  name: string;
  protected: boolean;
}

export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  htmlUrl: string;
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

export interface Issue {
  number: number;
  title: string;
  state: "open" | "closed";
  author: string;
  createdAt: string;
  htmlUrl: string;
  commentCount: number;
}
