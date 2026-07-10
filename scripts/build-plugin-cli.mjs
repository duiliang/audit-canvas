import { build } from "esbuild";
import { resolve } from "node:path";

const repoRoot = process.cwd();

await build({
  entryPoints: [resolve(repoRoot, "packages", "cli", "src", "index.ts")],
  outfile: resolve(
    repoRoot,
    "plugins",
    "codex-audit-canvas",
    "scripts",
    "audit-canvas-cli.mjs"
  ),
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

console.log("Built standalone Codex plugin CLI");
