import { chmodSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const target = resolve(process.cwd(), process.argv[2] ?? "");
if (existsSync(target)) {
  chmodSync(target, 0o755);
}

