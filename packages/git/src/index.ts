import { execFileSync } from "node:child_process";

export interface GitMetadata {
  repository: string;
  gitCommit: string;
  gitBranch: string;
  isGitRepository: boolean;
}

export function readGitMetadata(cwd: string, targetRef?: string): GitMetadata {
  const repository = safeGit(["rev-parse", "--show-toplevel"], cwd) ?? cwd;
  const gitCommit = targetRef
    ? (safeGit(["rev-parse", targetRef], cwd) ?? targetRef)
    : (safeGit(["rev-parse", "HEAD"], cwd) ?? "WORKTREE");
  const gitBranch = safeGit(["branch", "--show-current"], cwd) ?? "unknown";

  return {
    repository: normalizePath(repository),
    gitCommit,
    gitBranch: gitBranch.length > 0 ? gitBranch : "detached",
    isGitRepository: gitCommit !== "WORKTREE"
  };
}

export function compareNameStatus(cwd: string, baseline: string, target: string): string {
  return safeGit(["diff", "--name-status", baseline, target], cwd) ?? "";
}

function safeGit(args: string[], cwd: string): string | null {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return null;
  }
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/");
}

