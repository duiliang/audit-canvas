import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const packageJson = readJson("package.json");
const pluginManifest = readJson("plugins/codex-audit-canvas/.codex-plugin/plugin.json");
const expectedRepository = "https://github.com/duiliang/audit-canvas";
const ownerPlaceholder = ["YOUR", "GITHUB", "OWNER"].join("_");
const workspacePackages = ["cli", "core", "git", "providers", "schema", "ui"];

assert(packageJson.version === pluginManifest.version, "root and plugin versions must match");
assert(packageJson.license === "MIT", "root package license must be MIT");
assert(packageJson.engines?.node === ">=22", "Node.js >=22 must be declared");
assert(
  packageJson.repository?.url === `git+${expectedRepository}.git`,
  "root repository URL is incorrect"
);
assert(pluginManifest.repository === expectedRepository, "plugin repository URL is incorrect");

for (const workspacePackage of workspacePackages) {
  const manifest = readJson(`packages/${workspacePackage}/package.json`);
  assert(
    manifest.private === true,
    `${manifest.name} must remain private for the GitHub-only v0.1 release`
  );
  assert(
    manifest.version === packageJson.version,
    `${manifest.name} version must match the release`
  );
}

for (const file of [
  "README.md",
  "README.zh-CN.md",
  "README.en.md",
  "LICENSE",
  "CHANGELOG.md",
  "CHANGELOG.en.md",
  "SECURITY.md",
  "PRIVACY.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  ".github/workflows/ci.yml",
  ".github/workflows/pages.yml",
  "docs/assets/ui-screenshot.png"
]) {
  assert(existsSync(resolve(repoRoot, file)), `${file} is required for release`);
}

for (const file of [
  "README.md",
  "README.zh-CN.md",
  "README.en.md",
  "plugins/codex-audit-canvas/.codex-plugin/plugin.json"
]) {
  const content = readFileSync(resolve(repoRoot, file), "utf8");
  assert(!content.includes(ownerPlaceholder), `${file} contains an owner placeholder`);
  assert(
    content.includes("duiliang/audit-canvas"),
    `${file} must link to the published repository`
  );
}

assert(
  pluginManifest.interface.defaultPrompt.every((prompt) => /[\u3400-\u9fff]/u.test(prompt)),
  "plugin starter prompts must default to Chinese"
);

const pagesWorkflow = readFileSync(resolve(repoRoot, ".github/workflows/pages.yml"), "utf8");
assertActionMajor(pagesWorkflow, "actions/configure-pages", 5);
assertActionMajor(pagesWorkflow, "actions/upload-pages-artifact", 4);
assertActionMajor(pagesWorkflow, "actions/deploy-pages", 4);
assert(
  pagesWorkflow.includes("pnpm --filter @audit-canvas/web... build"),
  "Pages must build the Web package and its workspace dependencies"
);

console.log(`Release metadata validation passed for v${packageJson.version}`);

function readJson(path) {
  return JSON.parse(readFileSync(resolve(repoRoot, path), "utf8"));
}

function assertActionMajor(content, action, minimumMajor) {
  const match = content.match(new RegExp(`${action}@v(\\d+)`));
  assert(match, `${action} is missing`);
  assert(Number(match[1]) >= minimumMajor, `${action} must use v${minimumMajor} or newer`);
}

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exit(1);
  }
}
