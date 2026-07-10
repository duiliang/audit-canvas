import Ajv2020Module from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import type { ErrorObject, Options, ValidateFunction } from "ajv";
import auditRunSchema from "./audit-run.schema.json" with { type: "json" };
import type { AuditRun } from "./types.js";

export * from "./types.js";

export const AUDIT_CANVAS_SCHEMA_VERSION = "0.1.0";

type AjvLike = {
  compile<T>(schema: unknown): ValidateFunction<T>;
};

const Ajv2020 = Ajv2020Module as unknown as new (options: Options) => AjvLike;
const addFormats = addFormatsModule as unknown as (ajv: AjvLike) => void;
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validateAuditRunFn = ajv.compile<AuditRun>(auditRunSchema);

export function validateAuditRun(value: unknown): { valid: true; data: AuditRun } | { valid: false; errors: ErrorObject[] } {
  if (validateAuditRunFn(value)) {
    return { valid: true, data: value as AuditRun };
  }

  return { valid: false, errors: validateAuditRunFn.errors ?? [] };
}

export { auditRunSchema };
