import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const pluginRoot = resolve(repoRoot, "plugins", "codex-audit-canvas");
const manifestPath = resolve(pluginRoot, ".codex-plugin", "plugin.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

assert(manifest.name === "codex-audit-canvas", "plugin name must be codex-audit-canvas");
assert(/^\d+\.\d+\.\d+$/.test(manifest.version), "plugin version must be strict semver");
assert(
  manifest.description && !manifest.description.includes("[TODO"),
  "description must be complete"
);
assert(manifest.author?.name, "author.name is required");
assert(manifest.skills === "./skills/", "skills path must be ./skills/");
assert(manifest.interface?.displayName, "interface.displayName is required");
assert(Array.isArray(manifest.interface?.defaultPrompt), "interface.defaultPrompt is required");

for (const skill of ["audit-artifacts", "compare-baselines", "resolve-findings"]) {
  const skillPath = resolve(pluginRoot, "skills", skill, "SKILL.md");
  assert(existsSync(skillPath), `${skill} SKILL.md is missing`);
  const content = readFileSync(skillPath, "utf8");
  assert(content.includes("## Trigger"), `${skill} must document triggers`);
  assert(content.includes("## Do Not Trigger"), `${skill} must document non-triggers`);
}

for (const script of [
  "audit-artifacts.mjs",
  "compare-baselines.mjs",
  "resolve-findings.mjs",
  "runtime.mjs",
  "audit-canvas-cli.mjs"
]) {
  assert(existsSync(resolve(pluginRoot, "scripts", script)), `${script} is missing`);
}

const webRoot = resolve(pluginRoot, "assets", "web");
assert(
  existsSync(resolve(webRoot, "index.html")),
  "standalone Review Canvas index.html is missing"
);
const webAssets = readdirSync(resolve(webRoot, "assets"));
assert(
  webAssets.some((file) => file.endsWith(".js")),
  "standalone Review Canvas JavaScript is missing"
);
assert(
  webAssets.some((file) => file.endsWith(".css")),
  "standalone Review Canvas CSS is missing"
);

console.log("Plugin manifest validation passed");

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}
