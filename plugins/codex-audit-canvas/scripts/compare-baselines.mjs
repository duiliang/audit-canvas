#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const repoRoot = resolve(pluginRoot, "..", "..");
const cliPath = resolve(repoRoot, "packages", "cli", "dist", "index.js");

const args = process.argv.slice(2);
const baseline = readOption(args, "--baseline") ?? "main";
const target = readOption(args, "--target") ?? "HEAD";
const scanTarget = args.find((arg) => !arg.startsWith("--") && arg !== baseline && arg !== target) ?? ".";

ensureCli();
runCli(["scan", scanTarget, "--baseline", baseline, "--target", target]);

function readOption(values, name) {
  const index = values.indexOf(name);
  return index >= 0 ? values[index + 1] : null;
}

function ensureCli() {
  if (existsSync(cliPath)) return;
  const build = spawnSync("pnpm", ["build"], { cwd: repoRoot, stdio: "inherit", shell: true });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

function runCli(cliArgs) {
  const result = spawnSync("node", [cliPath, ...cliArgs], { cwd: repoRoot, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

