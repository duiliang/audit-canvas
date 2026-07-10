import { createHash } from "node:crypto";

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function shortHash(value: string): string {
  return sha256(value).slice(0, 16);
}

export function stableId(prefix: string, parts: readonly string[]): string {
  return `${prefix}_${shortHash(parts.join("\u001f"))}`;
}

