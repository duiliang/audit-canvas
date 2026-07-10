import type { AuditRun, Finding } from "@audit-canvas/schema";

export type ExportLocale = "zh-CN" | "en";

export function exportAuditJson(run: AuditRun): string {
  return JSON.stringify(run, null, 2);
}

export function exportAuditMarkdown(run: AuditRun, locale: ExportLocale = "zh-CN"): string {
  const zh = locale === "zh-CN";
  const lines: string[] = [
    zh ? "# AuditCanvas 审计报告" : "# AuditCanvas Report",
    "",
    `- ${zh ? "运行 ID" : "Run ID"}: ${run.auditRunId}`,
    `- ${zh ? "目标提交" : "Target commit"}: ${run.targetCommit}`,
    `- ${zh ? "原文块" : "Source blocks"}: ${run.sourceBlockCount}`,
    `- ${zh ? "已覆盖原文块" : "Covered blocks"}: ${run.coveredBlockCount}`,
    `- ${zh ? "已排除原文块" : "Excluded blocks"}: ${run.excludedBlockCount}`,
    ""
  ];

  for (const finding of run.findings) {
    lines.push(`## ${localizedFindingTitle(finding, locale)}`, "");
    lines.push(`- ${zh ? "问题 ID" : "Finding ID"}: ${finding.findingId}`);
    lines.push(`- ${zh ? "规则" : "Rule"}: ${finding.ruleId}`);
    lines.push(`- ${zh ? "类别" : "Category"}: ${finding.category}`);
    lines.push(`- ${zh ? "严重程度" : "Severity"}: ${finding.severity}`);
    lines.push(`- ${zh ? "状态" : "Status"}: ${finding.status}`);
    lines.push("");
    lines.push(localizedFindingExplanation(finding, locale));
    lines.push("");
    lines.push(zh ? "### 证据" : "### Evidence");
    lines.push("");

    finding.evidence.forEach((evidence, index) => {
      lines.push(`#### ${zh ? "出现位置" : "Occurrence"} ${index + 1}`);
      lines.push("");
      lines.push(`- ${zh ? "路径" : "Path"}: ${evidence.sourcePath}`);
      lines.push(`- ${zh ? "行号" : "Lines"}: ${evidence.startLine}-${evidence.endLine}`);
      lines.push(
        `- ${zh ? "章节" : "Heading"}: ${evidence.headingPath.join(" > ") || (zh ? "（无）" : "(none)")}`
      );
      lines.push("");
      lines.push("```text");
      lines.push(evidence.fullText);
      lines.push("```");
      lines.push("");
    });
  }

  return lines.join("\n");
}

export function exportAuditHtml(run: AuditRun, locale: ExportLocale = "zh-CN"): string {
  const zh = locale === "zh-CN";
  const findings = run.findings
    .map((finding) => {
      const evidenceHtml = finding.evidence
        .map((evidence, index) => {
          return `<article class="evidence"><h3>${zh ? "出现位置" : "Occurrence"} ${index + 1}</h3><dl><dt>${zh ? "路径" : "Path"}</dt><dd>${escapeHtml(
            evidence.sourcePath
          )}</dd><dt>${zh ? "行号" : "Lines"}</dt><dd>${evidence.startLine}-${evidence.endLine}</dd><dt>${zh ? "章节" : "Heading"}</dt><dd>${escapeHtml(
            evidence.headingPath.join(" > ") || (zh ? "（无）" : "(none)")
          )}</dd></dl><pre>${escapeHtml(evidence.fullText)}</pre></article>`;
        })
        .join("\n");

      return `<section class="finding"><h2>${escapeHtml(localizedFindingTitle(finding, locale))}</h2><p>${escapeHtml(
        localizedFindingExplanation(finding, locale)
      )}</p><p><strong>${finding.category}</strong> ${finding.severity} ${finding.status}</p>${evidenceHtml}</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>AuditCanvas ${zh ? "审计报告" : "Report"} ${escapeHtml(run.auditRunId)}</title>
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
    <h1>AuditCanvas ${zh ? "审计报告" : "Report"}</h1>
    <p>${zh ? "运行" : "Run"} ${escapeHtml(run.auditRunId)} ${zh ? `已覆盖 ${run.coveredBlockCount}/${run.sourceBlockCount} 个原文块。` : `covers ${run.coveredBlockCount} of ${run.sourceBlockCount} source blocks.`}</p>
    ${findings}
  </main>
</body>
</html>`;
}

function localizedFindingTitle(finding: Finding, locale: ExportLocale): string {
  if (locale === "en") return finding.title;
  if (
    finding.ruleId === "local/exact-duplicate" ||
    finding.ruleId === "local/normalized-duplicate"
  ) {
    return `同一内容重复出现 ${finding.evidence.length} 次`;
  }
  if (finding.ruleId === "local/near-duplicate") return "发现近似重复内容";
  return finding.title;
}

function localizedFindingExplanation(finding: Finding, locale: ExportLocale): string {
  if (locale === "en") return finding.explanation;
  if (
    finding.ruleId === "local/exact-duplicate" ||
    finding.ruleId === "local/normalized-duplicate"
  ) {
    return "每一处重复内容均作为完整证据保留。";
  }
  if (finding.ruleId === "local/near-duplicate") {
    return `两个原文块的 token Jaccard 相似度为 ${finding.confidence.toFixed(2)}。`;
  }
  return finding.explanation;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
