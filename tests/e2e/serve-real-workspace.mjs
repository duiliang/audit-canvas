import { spawnSync } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const workspace = resolve(repoRoot, "test-results", "review-canvas-workspace");
const repeated = "结算服务必须完整展示每一处重复需求，包括完整证据、文件路径、章节和行号。";

await rm(workspace, { recursive: true, force: true });
await mkdir(resolve(workspace, "docs"), { recursive: true });
await mkdir(resolve(workspace, "tests"), { recursive: true });
await writeFile(resolve(workspace, "docs", "checkout.md"), `# 结算需求\n\n${repeated}\n`, "utf8");
await writeFile(
  resolve(workspace, "docs", "release-plan.md"),
  `# 发布计划\n\n${repeated}\n`,
  "utf8"
);
await writeFile(resolve(workspace, "tests", "acceptance.txt"), `${repeated}\n`, "utf8");

run("git", ["init", "--initial-branch=main"]);
run("git", ["config", "user.name", "AuditCanvas E2E"]);
run("git", ["config", "user.email", "audit-canvas@example.invalid"]);
run("git", ["add", "."]);
run("git", ["commit", "-m", "add review canvas fixture"]);
run(process.execPath, [resolve(repoRoot, "packages", "cli", "dist", "index.js"), "scan", "."]);

process.env.AUDIT_CANVAS_WEB_DIST = resolve(repoRoot, "apps", "web", "dist");
const { serveCommand } = await import("../../packages/cli/dist/commands.js");
const server = await serveCommand({ port: 5188, cwd: workspace });
console.log(`Real Review Canvas fixture: ${server.url}`);

async function shutdown() {
  await server.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function run(command, args) {
  const result = spawnSync(command, args, { cwd: workspace, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\n${result.stdout}\n${result.stderr}`);
  }
}
