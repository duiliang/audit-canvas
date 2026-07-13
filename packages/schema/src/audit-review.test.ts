import { describe, expect, it } from "vitest";
import type { AuditRun } from "./types.js";
import {
  applyAuditReview,
  AUDIT_CANVAS_REVIEW_SCHEMA_VERSION,
  validateAuditReview
} from "./index.js";

const validReview = {
  schemaVersion: AUDIT_CANVAS_REVIEW_SCHEMA_VERSION,
  auditRunId: "audit-run-001",
  statusByFinding: {
    "finding-001": "accepted",
    "finding-002": "ignored-with-reason"
  },
  commentsByFinding: {
    "finding-002": "Covered by an approved exception."
  },
  updatedAt: "2026-07-13T08:30:00.000Z"
};

describe("validateAuditReview", () => {
  it("accepts a complete persisted review", () => {
    expect(validateAuditReview(validReview)).toEqual({ valid: true, data: validReview });
  });

  it("rejects a status outside FindingStatus", () => {
    const result = validateAuditReview({
      ...validReview,
      statusByFinding: { "finding-001": "approved" }
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toEqual(
        expect.arrayContaining([expect.objectContaining({ keyword: "enum" })])
      );
    }
  });

  it("rejects a review with a missing required field", () => {
    const reviewWithoutUpdatedAt: Partial<typeof validReview> = { ...validReview };
    delete reviewWithoutUpdatedAt.updatedAt;
    const result = validateAuditReview(reviewWithoutUpdatedAt);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            keyword: "required",
            params: expect.objectContaining({ missingProperty: "updatedAt" })
          })
        ])
      );
    }
  });

  it("rejects an audit run ID that can escape the reviews directory", () => {
    const result = validateAuditReview({ ...validReview, auditRunId: "../outside" });
    expect(result.valid).toBe(false);
  });
});

function createRun(): AuditRun {
  return {
    auditRunId: "audit-run-001",
    schemaVersion: "0.1.0",
    baselineCommit: null,
    targetCommit: "abc123",
    sourceBlockCount: 0,
    coveredBlockCount: 0,
    excludedBlockCount: 0,
    coverage: { percentage: 1, excludedSourceBlocks: [] },
    findings: [
      {
        findingId: "finding-001",
        ruleId: "test/rule",
        category: "custom-rule",
        severity: "medium",
        confidence: 1,
        title: "First finding",
        explanation: "Test finding",
        evidence: [],
        sourceBlockIds: [],
        relatedBlockIds: [],
        suggestedAction: null,
        status: "pending",
        reviewerComment: null,
        generatedBy: "local-rule",
        model: null,
        promptVersion: null,
        createdAt: "2026-07-13T08:00:00.000Z",
        resolvedAt: null
      },
      {
        findingId: "finding-002",
        ruleId: "test/rule",
        category: "custom-rule",
        severity: "low",
        confidence: 1,
        title: "Second finding",
        explanation: "Test finding",
        evidence: [],
        sourceBlockIds: [],
        relatedBlockIds: [],
        suggestedAction: null,
        status: "resolved",
        reviewerComment: "Existing comment",
        generatedBy: "local-rule",
        model: null,
        promptVersion: null,
        createdAt: "2026-07-13T08:00:00.000Z",
        resolvedAt: "2026-07-13T08:10:00.000Z"
      }
    ],
    artifacts: [],
    sourceBlocks: [],
    invalidProviderResults: [],
    provider: "none",
    configuration: {},
    timestamps: {
      startedAt: "2026-07-13T08:00:00.000Z",
      completedAt: "2026-07-13T08:01:00.000Z"
    }
  };
}

describe("applyAuditReview", () => {
  it("merges statuses and comments without mutating the audit run", () => {
    const run = createRun();
    const review = {
      ...validReview,
      statusByFinding: {
        "finding-001": "resolved" as const,
        "finding-002": "accepted" as const
      },
      commentsByFinding: { "finding-001": "Fixed in the target commit." }
    };

    const result = applyAuditReview(run, review);

    expect(result).not.toBe(run);
    expect(result.findings[0]).toMatchObject({
      status: "resolved",
      reviewerComment: "Fixed in the target commit.",
      resolvedAt: review.updatedAt
    });
    expect(result.findings[1]).toMatchObject({
      status: "accepted",
      reviewerComment: "Existing comment",
      resolvedAt: null
    });
    expect(run.findings[0]).toMatchObject({
      status: "pending",
      reviewerComment: null,
      resolvedAt: null
    });
  });

  it("preserves an existing resolvedAt value for resolved findings", () => {
    const run = createRun();
    const result = applyAuditReview(run, {
      ...validReview,
      statusByFinding: {},
      commentsByFinding: {}
    });

    expect(result.findings[1].resolvedAt).toBe("2026-07-13T08:10:00.000Z");
  });
});
