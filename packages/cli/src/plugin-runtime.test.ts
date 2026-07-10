import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const pluginSource = resolve(repoRoot, "plugins", "codex-audit-canvas");
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("standalone Codex plugin scripts", () => {
  it("audits the user workspace instead of the installed plugin directory", () => {
    const { installedPlugin, workspace } = createStandaloneFixture();
    writeFileSync(
      resolve(workspace, "requirements.md"),
      "# Checkout\n\nKeep every evidence occurrence.\n\nKeep every evidence occurrence.\n",
      "utf8"
    );

    const result = runPluginScript(installedPlugin, workspace, "audit-artifacts.mjs", ["."]);

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(existsSync(resolve(workspace, ".auditcanvas", "runs", "latest.json"))).toBe(true);
    expect(existsSync(resolve(installedPlugin, ".auditcanvas"))).toBe(false);
  });

  it("writes accepted-finding impact into the user workspace", () => {
    const { installedPlugin, workspace } = createStandaloneFixture();
    const latestRunPath = resolve(workspace, ".auditcanvas", "runs", "latest.json");
    mkdirSync(dirname(latestRunPath), { recursive: true });
    writeFileSync(
      latestRunPath,
      JSON.stringify({
        auditRunId: "run-plugin-test",
        findings: [
          {
            findingId: "finding-accepted",
            title: "Accepted requirement",
            category: "traceability",
            severity: "medium",
            status: "accepted",
            evidence: [{ sourcePath: "requirements.md", startLine: 3, endLine: 3 }]
          },
          {
            findingId: "finding-rejected",
            title: "Rejected requirement",
            category: "traceability",
            severity: "low",
            status: "rejected",
            evidence: []
          }
        ]
      }),
      "utf8"
    );

    const result = runPluginScript(installedPlugin, workspace, "resolve-findings.mjs");
    const report = readFileSync(
      resolve(workspace, ".auditcanvas", "reviews", "accepted-findings-impact.md"),
      "utf8"
    );

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(report).toContain("Accepted requirement");
    expect(report).not.toContain("Rejected requirement");
  });

  it("compares Git baselines in the user workspace", () => {
    const { installedPlugin, workspace } = createStandaloneFixture();
    runCommand("git", ["init", "--initial-branch=main"], workspace);
    runCommand("git", ["config", "user.name", "AuditCanvas Test"], workspace);
    runCommand("git", ["config", "user.email", "audit-canvas@example.invalid"], workspace);
    writeFileSync(resolve(workspace, "requirements.md"), "# Checkout\n\nKeep evidence.\n", "utf8");
    runCommand("git", ["add", "requirements.md"], workspace);
    runCommand("git", ["commit", "-m", "initial"], workspace);
    writeFileSync(
      resolve(workspace, "requirements.md"),
      "# Checkout\n\nKeep all evidence occurrences.\n",
      "utf8"
    );
    runCommand("git", ["add", "requirements.md"], workspace);
    runCommand("git", ["commit", "-m", "update requirement"], workspace);

    const result = runPluginScript(installedPlugin, workspace, "compare-baselines.mjs", [
      "--baseline",
      "HEAD~1",
      "--target",
      "HEAD",
      "."
    ]);

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(existsSync(resolve(workspace, ".auditcanvas", "runs", "latest.json"))).toBe(true);
  });
});

function createStandaloneFixture() {
  const root = mkdtempSync(resolve(tmpdir(), "audit-canvas-plugin-"));
  temporaryRoots.push(root);
  const installedPlugin = resolve(root, "installed", "codex-audit-canvas");
  const workspace = resolve(root, "workspace");
  cpSync(pluginSource, installedPlugin, { recursive: true });
  mkdirSync(workspace, { recursive: true });
  return { installedPlugin, workspace };
}

function runPluginScript(
  installedPlugin: string,
  workspace: string,
  script: string,
  args: string[] = []
) {
  return spawnSync(process.execPath, [resolve(installedPlugin, "scripts", script), ...args], {
    cwd: workspace,
    encoding: "utf8"
  });
}

function runCommand(command: string, args: string[], cwd: string) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
}
