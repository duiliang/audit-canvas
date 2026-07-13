import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
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

  it("serves the real Review Canvas from standalone plugin assets", async () => {
    const { installedPlugin, workspace } = createStandaloneFixture();
    const repeated = "Keep every evidence occurrence in the real Review Canvas.";
    writeFileSync(
      resolve(workspace, "requirements.md"),
      `# Checkout\n\n${repeated}\n\n${repeated}\n`,
      "utf8"
    );
    const audit = runPluginScript(installedPlugin, workspace, "audit-artifacts.mjs", ["."]);
    expect(audit.status, `${audit.stdout}\n${audit.stderr}`).toBe(0);

    const server = await startPluginServer(installedPlugin, workspace);
    const secondServer = await startPluginServer(installedPlugin, workspace);
    try {
      const htmlResponse = await fetch(server.url);
      const html = await htmlResponse.text();
      expect(htmlResponse.status).toBe(200);
      const scriptPath = /<script[^>]+src="([^"]+\.js)"/.exec(html)?.[1];
      expect(scriptPath).toBeTruthy();
      const scriptResponse = await fetch(new URL(scriptPath ?? "", server.url));
      expect(scriptResponse.status).toBe(200);

      const workspaceResponse = await fetch(new URL("/api/workspace/latest", server.url));
      const payload = (await workspaceResponse.json()) as {
        run: {
          auditRunId: string;
          artifacts: Array<{ sourcePath: string }>;
          findings: Array<{ findingId: string; evidence: unknown[] }>;
        };
      };
      expect(payload.run.artifacts.map((artifact) => artifact.sourcePath)).toContain(
        "requirements.md"
      );
      expect(payload.run.findings[0]?.evidence).toHaveLength(2);

      const findingId = payload.run.findings[0]?.findingId;
      if (!findingId) throw new Error("Standalone plugin audit did not create a finding");
      const responses = await Promise.all(
        Array.from({ length: 20 }, (_, index) => {
          const endpoint = index % 2 === 0 ? server.url : secondServer.url;
          const patch =
            index % 2 === 0
              ? {
                  auditRunId: payload.run.auditRunId,
                  statusByFinding: { [findingId]: "accepted" },
                  updatedAt: new Date(Date.now() + index).toISOString()
                }
              : {
                  auditRunId: payload.run.auditRunId,
                  commentsByFinding: { [findingId]: `cross-process ${index}` },
                  updatedAt: new Date(Date.now() + index).toISOString()
                };
          return fetch(new URL(`/api/reviews/${payload.run.auditRunId}`, endpoint), {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(patch)
          });
        })
      );
      expect(responses.every((response) => response.status === 200)).toBe(true);
      const review = JSON.parse(
        readFileSync(
          resolve(workspace, ".auditcanvas", "reviews", `${payload.run.auditRunId}.json`),
          "utf8"
        )
      ) as {
        statusByFinding: Record<string, string>;
        commentsByFinding: Record<string, string>;
      };
      expect(review.statusByFinding[findingId]).toBe("accepted");
      expect(review.commentsByFinding[findingId]).toMatch(/^cross-process \d+$/);
    } finally {
      await Promise.all([server.stop(), secondServer.stop()]);
    }
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
            status: "pending",
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
    const reviewPath = resolve(workspace, ".auditcanvas", "reviews", "run-plugin-test.json");
    mkdirSync(dirname(reviewPath), { recursive: true });
    writeFileSync(
      reviewPath,
      JSON.stringify({
        schemaVersion: "0.1.0",
        auditRunId: "run-plugin-test",
        statusByFinding: { "finding-accepted": "accepted" },
        commentsByFinding: { "finding-accepted": "Approved in Review Canvas" },
        updatedAt: "2026-07-13T00:00:00.000Z"
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

async function startPluginServer(installedPlugin: string, workspace: string) {
  const child = spawn(
    process.execPath,
    [resolve(installedPlugin, "scripts", "audit-canvas-cli.mjs"), "serve", "--port", "0"],
    { cwd: workspace, stdio: ["ignore", "pipe", "pipe"] }
  );
  let output = "";
  const url = await new Promise<string>((resolveUrl, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Plugin server did not start\n${output}`)),
      10_000
    );
    const collect = (chunk: Buffer) => {
      output += chunk.toString("utf8");
      const match = /http:\/\/127\.0\.0\.1:\d+/.exec(output);
      if (match) {
        clearTimeout(timer);
        resolveUrl(match[0]);
      }
    };
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    child.once("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`Plugin server exited with ${code}\n${output}`));
    });
  });

  return {
    url,
    stop: async () => {
      if (child.exitCode !== null) return;
      child.kill();
      await once(child, "exit");
    }
  };
}
