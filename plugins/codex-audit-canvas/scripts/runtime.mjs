import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const cliPath = resolve(pluginRoot, "scripts", "audit-canvas-cli.mjs");

// Codex launches plugin commands from the repository being audited. The optional
// override supports launchers that cannot set their child process working directory.
export const workspaceRoot = resolve(process.env.AUDIT_CANVAS_WORKSPACE || process.cwd());

export function runCli(args) {
  if (!existsSync(cliPath)) {
    console.error("AuditCanvas bundled CLI is missing. Reinstall the codex-audit-canvas plugin.");
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: workspaceRoot,
    stdio: "inherit"
  });

  if (result.error) console.error(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
