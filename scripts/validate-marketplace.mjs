import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const marketplacePath = resolve(process.cwd(), ".agents", "plugins", "marketplace.json");
const marketplace = JSON.parse(readFileSync(marketplacePath, "utf8"));
const entry = marketplace.plugins?.find((plugin) => plugin.name === "codex-audit-canvas");

assert(marketplace.name === "audit-canvas", "marketplace name must be audit-canvas");
assert(marketplace.interface?.displayName === "AuditCanvas", "marketplace displayName must be AuditCanvas");
assert(entry, "codex-audit-canvas entry is missing");
assert(entry.source?.source === "local", "plugin source must be local");
assert(entry.source?.path === "./plugins/codex-audit-canvas", "plugin source path is incorrect");
assert(entry.policy?.installation === "AVAILABLE", "installation policy must be AVAILABLE");
assert(entry.policy?.authentication === "ON_INSTALL", "authentication policy must be ON_INSTALL");
assert(entry.category === "Developer Tools", "category must be Developer Tools");

console.log("Marketplace validation passed");

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}

