#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const repoRoot = resolve(pluginRoot, "..", "..");
const latestRunPath = resolve(repoRoot, ".auditcanvas", "runs", "latest.json");
const outputPath = resolve(repoRoot, ".auditcanvas", "reviews", "accepted-findings-impact.md");

const run = JSON.parse(readFileSync(latestRunPath, "utf8"));
const accepted = run.findings.filter((finding) => finding.status === "accepted");

mkdirSync(dirname(outputPath), { recursive: true });

if (accepted.length === 0) {
  writeFileSync(outputPath, "# Accepted Finding Impact\n\nNo accepted findings were present in the latest audit run.\n", "utf8");
  console.log(`Accepted findings: 0`);
  console.log(`Impact report: ${outputPath}`);
  process.exit(0);
}

const lines = ["# Accepted Finding Impact", "", `Run: ${run.auditRunId}`, ""];
for (const finding of accepted) {
  lines.push(`## ${finding.title}`, "");
  lines.push(`- Finding: ${finding.findingId}`);
  lines.push(`- Category: ${finding.category}`);
  lines.push(`- Severity: ${finding.severity}`);
  lines.push("");
  for (const evidence of finding.evidence) {
    lines.push(`- ${evidence.sourcePath}:${evidence.startLine}-${evidence.endLine}`);
  }
  lines.push("");
}

writeFileSync(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Accepted findings: ${accepted.length}`);
console.log(`Impact report: ${outputPath}`);

