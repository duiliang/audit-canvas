import { build } from "esbuild";
import { access, cp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const repoRoot = process.cwd();

await build({
  entryPoints: [resolve(repoRoot, "packages", "cli", "src", "index.ts")],
  outfile: resolve(repoRoot, "plugins", "codex-audit-canvas", "scripts", "audit-canvas-cli.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  banner: {
    js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);'
  },
  legalComments: "none",
  sourcemap: false
});

const webDist = resolve(repoRoot, "apps", "web", "dist");
const pluginWebAssets = resolve(repoRoot, "plugins", "codex-audit-canvas", "assets", "web");
await access(resolve(webDist, "index.html"));
await rm(pluginWebAssets, { recursive: true, force: true });
await cp(webDist, pluginWebAssets, {
  recursive: true,
  filter: (source) => !source.endsWith(".map")
});
await normalizePluginWebTextAssets(pluginWebAssets);
console.log("Copied Review Canvas assets into standalone Codex plugin");

console.log("Built standalone Codex plugin CLI");

async function normalizePluginWebTextAssets(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await normalizePluginWebTextAssets(filePath);
      continue;
    }
    if (![".css", ".html", ".js", ".svg"].includes(extname(entry.name))) continue;
    const content = await readFile(filePath, "utf8");
    await writeFile(filePath, content.replaceAll("\r\r\n", "\n").replaceAll("\r\n", "\n"), "utf8");
  }
}
