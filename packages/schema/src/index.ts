import Ajv2020Module from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import type { ErrorObject, Options, ValidateFunction } from "ajv";
import auditReviewSchema from "./audit-review.schema.json" with { type: "json" };
import auditRunSchema from "./audit-run.schema.json" with { type: "json" };
import type { AuditReview, AuditRun } from "./types.js";

export * from "./types.js";

export const AUDIT_CANVAS_SCHEMA_VERSION = "0.1.0";
export const AUDIT_CANVAS_REVIEW_SCHEMA_VERSION: AuditReview["schemaVersion"] = "0.1.0";

type AjvLike = {
  compile<T>(schema: unknown): ValidateFunction<T>;
};

const Ajv2020 = Ajv2020Module as unknown as new (options: Options) => AjvLike;
const addFormats = addFormatsModule as unknown as (ajv: AjvLike) => void;
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateAuditReviewFn = ajv.compile<AuditReview>(auditReviewSchema);
const validateAuditRunFn = ajv.compile<AuditRun>(auditRunSchema);

/** Returns a new audit run with persisted review fields merged by finding ID. */
export function applyAuditReview(run: AuditRun, review: AuditReview): AuditRun {
  return {
    ...run,
    findings: run.findings.map((finding) => {
      const status = Object.hasOwn(review.statusByFinding, finding.findingId)
        ? review.statusByFinding[finding.findingId]
        : finding.status;
      const reviewerComment = Object.hasOwn(review.commentsByFinding, finding.findingId)
        ? review.commentsByFinding[finding.findingId]
        : finding.reviewerComment;

      return {
        ...finding,
        status,
        reviewerComment,
        resolvedAt: status === "resolved" ? (finding.resolvedAt ?? review.updatedAt) : null
      };
    })
  };
}

export function validateAuditReview(
  value: unknown
): { valid: true; data: AuditReview } | { valid: false; errors: ErrorObject[] } {
  if (validateAuditReviewFn(value)) {
    return { valid: true, data: value as AuditReview };
  }

  return { valid: false, errors: validateAuditReviewFn.errors ?? [] };
}

export function validateAuditRun(
  value: unknown
): { valid: true; data: AuditRun } | { valid: false; errors: ErrorObject[] } {
  if (validateAuditRunFn(value)) {
    return { valid: true, data: value as AuditRun };
  }

  return { valid: false, errors: validateAuditRunFn.errors ?? [] };
}

export { auditReviewSchema, auditRunSchema };
