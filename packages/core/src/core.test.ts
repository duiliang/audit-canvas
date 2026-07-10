import { describe, expect, it } from "vitest";
import { validateAuditRun } from "@audit-canvas/schema";
import { exportAuditHtml, exportAuditJson, exportAuditMarkdown } from "./exporters.js";
import { parseArtifact } from "./parse.js";
import { runLocalAudit } from "./audit.js";
import { verifyCoverageInvariant } from "./coverage.js";

const duplicateText =
  "The system shall keep every duplicate requirement visible with complete evidence and line numbers.";

describe("parser", () => {
  it("parses markdown headings and paragraph blocks with stable IDs", () => {
    const first = parseArtifact({
      sourcePath: "docs/spec.md",
      content: `# Scope\n\n${duplicateText}\n`,
      createdAt: "2026-07-10T00:00:00.000Z"
    });
    const second = parseArtifact({
      sourcePath: "docs/spec.md",
      content: `# Scope\n\n${duplicateText}\n`,
      createdAt: "2026-07-10T00:00:00.000Z"
    });

    expect(first.sourceBlocks).toHaveLength(2);
    expect(first.sourceBlocks[1].headingPath).toEqual(["Scope"]);
    expect(first.sourceBlocks.map((block) => block.blockId)).toEqual(
      second.sourceBlocks.map((block) => block.blockId)
    );
  });
});

describe("local audit", () => {
  it("preserves all three duplicate occurrences as complete evidence", () => {
    const run = runLocalAudit(
      [
        {
          sourcePath: "a.md",
          content: `# A\n\n${duplicateText}\n`,
          createdAt: "2026-07-10T00:00:00.000Z"
        },
        {
          sourcePath: "b.md",
          content: `# B\n\n${duplicateText}\n`,
          createdAt: "2026-07-10T00:00:00.000Z"
        },
        {
          sourcePath: "c.md",
          content: `# C\n\n${duplicateText}\n`,
          createdAt: "2026-07-10T00:00:00.000Z"
        }
      ],
      { createdAt: "2026-07-10T00:00:00.000Z" }
    );

    const duplicateFinding = run.findings.find(
      (finding) => finding.ruleId === "local/exact-duplicate"
    );
    expect(duplicateFinding?.evidence).toHaveLength(3);
    expect(duplicateFinding?.evidence.map((evidence) => evidence.fullText)).toEqual([
      duplicateText,
      duplicateText,
      duplicateText
    ]);
    expect(verifyCoverageInvariant(run)).toEqual({ valid: true });
  });

  it("detects near duplicates without requiring a model", () => {
    const run = runLocalAudit(
      [
        {
          sourcePath: "one.md",
          content:
            "The checkout service shall validate payment totals before confirming the customer order.",
          createdAt: "2026-07-10T00:00:00.000Z"
        },
        {
          sourcePath: "two.md",
          content:
            "Checkout service must validate payment total before it confirms a customer order.",
          createdAt: "2026-07-10T00:00:00.000Z"
        }
      ],
      { createdAt: "2026-07-10T00:00:00.000Z", nearDuplicateThreshold: 0.45 }
    );

    expect(run.findings.some((finding) => finding.category === "near-duplicate")).toBe(true);
    expect(run.provider).toBe("none");
  });

  it("validates the generated audit run against JSON Schema", () => {
    const run = runLocalAudit(
      [{ sourcePath: "spec.txt", content: duplicateText, createdAt: "2026-07-10T00:00:00.000Z" }],
      { createdAt: "2026-07-10T00:00:00.000Z" }
    );
    expect(validateAuditRun(run)).toMatchObject({ valid: true });
  });

  it("does not replace duplicate evidence with ellipses in JSON, Markdown, or HTML", () => {
    const run = runLocalAudit(
      [
        { sourcePath: "a.md", content: duplicateText, createdAt: "2026-07-10T00:00:00.000Z" },
        { sourcePath: "b.md", content: duplicateText, createdAt: "2026-07-10T00:00:00.000Z" },
        { sourcePath: "c.md", content: duplicateText, createdAt: "2026-07-10T00:00:00.000Z" }
      ],
      { createdAt: "2026-07-10T00:00:00.000Z" }
    );

    for (const output of [exportAuditJson(run), exportAuditMarkdown(run), exportAuditHtml(run)]) {
      expect(output).not.toContain("...");
      expect(output.match(new RegExp(duplicateText, "g"))?.length).toBeGreaterThanOrEqual(3);
    }
    expect(exportAuditMarkdown(run)).toContain("# AuditCanvas 审计报告");
    expect(exportAuditHtml(run)).toContain('<html lang="zh-CN">');
    expect(exportAuditMarkdown(run, "en")).toContain("# AuditCanvas Report");
    expect(exportAuditHtml(run, "en")).toContain('<html lang="en">');
  });
});
