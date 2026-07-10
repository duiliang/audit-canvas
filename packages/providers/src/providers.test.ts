import { describe, expect, it } from "vitest";
import { runLocalAudit } from "@audit-canvas/core";
import { MockProvider, parseProviderRawResult, redactSecrets, runProviderAudit } from "./index.js";

const content = "The checkout audit shall preserve evidence before model conclusions are displayed.";

describe("providers", () => {
  it("adds valid mock provider findings with full evidence", async () => {
    const run = runLocalAudit([{ sourcePath: "spec.md", content, createdAt: "2026-07-10T00:00:00.000Z" }], {
      createdAt: "2026-07-10T00:00:00.000Z"
    });
    const blockId = run.sourceBlocks[0]?.blockId;
    const provider = new MockProvider(
      JSON.stringify({
        findings: [
          {
            ruleId: "provider/ambiguity",
            category: "ambiguity",
            severity: "medium",
            confidence: 0.66,
            title: "Ambiguous audit sequence",
            explanation: "The requirement should specify which evidence view appears first.",
            sourceBlockIds: [blockId]
          }
        ]
      })
    );

    const updated = await runProviderAudit(run, provider, { enabled: true });
    const providerFinding = updated.findings.find((finding) => finding.generatedBy === "provider");
    expect(providerFinding?.evidence[0]?.fullText).toBe(content);
    expect(updated.invalidProviderResults).toHaveLength(0);
  });

  it("marks invalid JSON as invalid and does not add findings", () => {
    const run = runLocalAudit([{ sourcePath: "spec.md", content, createdAt: "2026-07-10T00:00:00.000Z" }], {
      createdAt: "2026-07-10T00:00:00.000Z"
    });
    const result = parseProviderRawResult(run, { provider: "mock", model: "mock", rawText: "not-json" }, "test");
    expect(result.findings).toHaveLength(0);
    expect(result.invalidProviderResults[0]?.reason).toContain("invalid JSON");
  });

  it("rejects provider findings without evidence locations", () => {
    const run = runLocalAudit([{ sourcePath: "spec.md", content, createdAt: "2026-07-10T00:00:00.000Z" }], {
      createdAt: "2026-07-10T00:00:00.000Z"
    });
    const result = parseProviderRawResult(
      run,
      {
        provider: "mock",
        model: "mock",
        rawText: JSON.stringify({
          findings: [
            {
              ruleId: "provider/no-evidence",
              category: "ambiguity",
              severity: "medium",
              confidence: 0.5,
              title: "Missing evidence",
              explanation: "This finding has no source location.",
              sourceBlockIds: []
            }
          ]
        })
      },
      "test"
    );
    expect(result.findings).toHaveLength(0);
    expect(result.invalidProviderResults[0]?.reason).toContain("sourceBlockIds");
  });

  it("redacts API keys and bearer tokens from diagnostics", () => {
    const secret = "sk-test-secret-value";
    const text = `Request failed with Bearer ${secret} in headers`;
    const redacted = redactSecrets(text, [secret]);
    expect(redacted).not.toContain(secret);
    expect(redacted).toContain("[REDACTED]");
  });

  it("does not call providers when disabled", async () => {
    const run = runLocalAudit([{ sourcePath: "spec.md", content, createdAt: "2026-07-10T00:00:00.000Z" }], {
      createdAt: "2026-07-10T00:00:00.000Z"
    });
    const provider = new MockProvider(JSON.stringify({ findings: [] }));
    const updated = await runProviderAudit(run, provider, { enabled: false });
    expect(updated.provider).toBe("none");
    expect(updated.findings).toHaveLength(run.findings.length);
  });
});

