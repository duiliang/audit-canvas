#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const repoRoot = resolve(pluginRoot, "..", "..");
const cliPath = resolve(repoRoot, "packages", "cli", "dist", "index.js");

if (process.argv.includes("--doctor")) {
  runCli(["doctor"]);
  process.exit(0);
}

const target = process.argv.slice(2).find((arg) => !arg.startsWith("--")) ?? ".";
ensureCli();
runCli(["scan", target]);

function ensureCli() {
  if (existsSync(cliPath)) return;
  const build = spawnSync("pnpm", ["build"], { cwd: repoRoot, stdio: "inherit", shell: true });
  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

function runCli(args) {
  ensureCli();
  const result = spawnSync("node", [cliPath, ...args], { cwd: repoRoot, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

