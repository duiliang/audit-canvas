import type { AuditRun } from "@audit-canvas/schema";

export function exportAuditJson(run: AuditRun): string {
  return JSON.stringify(run, null, 2);
}

export function exportAuditMarkdown(run: AuditRun): string {
  const lines: string[] = [
    `# AuditCanvas Report`,
    "",
    `- Run ID: ${run.auditRunId}`,
    `- Target commit: ${run.targetCommit}`,
    `- Source blocks: ${run.sourceBlockCount}`,
    `- Covered blocks: ${run.coveredBlockCount}`,
    `- Excluded blocks: ${run.excludedBlockCount}`,
    ""
  ];

  for (const finding of run.findings) {
    lines.push(`## ${finding.title}`, "");
    lines.push(`- Finding ID: ${finding.findingId}`);
    lines.push(`- Rule: ${finding.ruleId}`);
    lines.push(`- Category: ${finding.category}`);
    lines.push(`- Severity: ${finding.severity}`);
    lines.push(`- Status: ${finding.status}`);
    lines.push("");
    lines.push(finding.explanation);
    lines.push("");
    lines.push("### Evidence");
    lines.push("");

    finding.evidence.forEach((evidence, index) => {
      lines.push(`#### Occurrence ${index + 1}`);
      lines.push("");
      lines.push(`- Path: ${evidence.sourcePath}`);
      lines.push(`- Lines: ${evidence.startLine}-${evidence.endLine}`);
      lines.push(`- Heading: ${evidence.headingPath.join(" > ") || "(none)"}`);
      lines.push("");
      lines.push("```text");
      lines.push(evidence.fullText);
      lines.push("```");
      lines.push("");
    });
  }

  return lines.join("\n");
}

export function exportAuditHtml(run: AuditRun): string {
  const findings = run.findings
    .map((finding) => {
      const evidenceHtml = finding.evidence
        .map((evidence, index) => {
          return `<article class="evidence"><h3>Occurrence ${index + 1}</h3><dl><dt>Path</dt><dd>${escapeHtml(
            evidence.sourcePath
          )}</dd><dt>Lines</dt><dd>${evidence.startLine}-${evidence.endLine}</dd><dt>Heading</dt><dd>${escapeHtml(
            evidence.headingPath.join(" > ") || "(none)"
          )}</dd></dl><pre>${escapeHtml(evidence.fullText)}</pre></article>`;
        })
        .join("\n");

      return `<section class="finding"><h2>${escapeHtml(finding.title)}</h2><p>${escapeHtml(
        finding.explanation
      )}</p><p><strong>${finding.category}</strong> ${finding.severity} ${finding.status}</p>${evidenceHtml}</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AuditCanvas Report ${escapeHtml(run.auditRunId)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; color: #111827; background: #f8fafc; }
    main { max-width: 1120px; margin: 0 auto; }
    .finding, .evidence { border: 1px solid #cbd5e1; background: #fff; padding: 1rem; margin: 1rem 0; border-radius: 6px; }
    pre { white-space: pre-wrap; background: #0f172a; color: #f8fafc; padding: 1rem; border-radius: 4px; overflow: auto; }
    dt { font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <h1>AuditCanvas Report</h1>
    <p>Run ${escapeHtml(run.auditRunId)} covers ${run.coveredBlockCount} of ${run.sourceBlockCount} source blocks.</p>
    ${findings}
  </main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

