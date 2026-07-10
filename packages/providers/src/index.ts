import { stableId } from "@audit-canvas/core";
import { AUDIT_CANVAS_SCHEMA_VERSION, type AuditRun, type Finding, type FindingEvidence } from "@audit-canvas/schema";

export interface ProviderAuditRequest {
  run: AuditRun;
  promptVersion: string;
  enabled: boolean;
}

export interface ProviderFindingCandidate {
  ruleId: string;
  category: Finding["category"];
  severity: Finding["severity"];
  confidence: number;
  title: string;
  explanation: string;
  sourceBlockIds: string[];
  relatedBlockIds?: string[];
}

export interface ProviderRawResult {
  provider: string;
  model: string;
  rawText: string;
}

export interface ProviderAuditResult {
  findings: Finding[];
  invalidProviderResults: AuditRun["invalidProviderResults"];
}

export interface AuditProvider {
  readonly name: string;
  readonly model: string;
  audit(request: ProviderAuditRequest): Promise<ProviderRawResult>;
}

export class MockProvider implements AuditProvider {
  readonly name = "mock";
  readonly model = "mock-audit-model";

  constructor(private readonly rawText: string) {}

  async audit(_request: ProviderAuditRequest): Promise<ProviderRawResult> {
    return { provider: this.name, model: this.model, rawText: this.rawText };
  }
}

export class OpenAICompatibleProvider implements AuditProvider {
  readonly name = "openai-compatible";

  constructor(
    private readonly options: {
      endpoint: string;
      model: string;
      apiKeyEnv?: string;
    }
  ) {}

  get model(): string {
    return this.options.model;
  }

  async audit(request: ProviderAuditRequest): Promise<ProviderRawResult> {
    assertProviderEnabled(request.enabled, this.name);
    const apiKey = readSecretFromEnv(this.options.apiKeyEnv ?? "OPENAI_API_KEY");
    const response = await fetch(this.options.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: this.options.model,
        messages: [{ role: "user", content: buildProviderPrompt(request.run) }]
      })
    });
    const text = await response.text();
    return { provider: this.name, model: this.options.model, rawText: text };
  }
}

export class OllamaProvider implements AuditProvider {
  readonly name = "ollama";

  constructor(
    private readonly options: {
      endpoint?: string;
      model: string;
    }
  ) {}

  get model(): string {
    return this.options.model;
  }

  async audit(request: ProviderAuditRequest): Promise<ProviderRawResult> {
    assertProviderEnabled(request.enabled, this.name);
    const response = await fetch(this.options.endpoint ?? "http://127.0.0.1:11434/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.options.model,
        prompt: buildProviderPrompt(request.run),
        stream: false
      })
    });
    const text = await response.text();
    return { provider: this.name, model: this.options.model, rawText: text };
  }
}

export async function runProviderAudit(
  run: AuditRun,
  provider: AuditProvider,
  options: { enabled: boolean; promptVersion?: string }
): Promise<AuditRun> {
  if (!options.enabled) {
    return {
      ...run,
      provider: "none"
    };
  }

  const raw = await provider.audit({
    run,
    promptVersion: options.promptVersion ?? "provider-v1",
    enabled: options.enabled
  });
  const parsed = parseProviderRawResult(run, raw, options.promptVersion ?? "provider-v1");
  return {
    ...run,
    provider: raw.provider,
    findings: [...run.findings, ...parsed.findings],
    invalidProviderResults: [...run.invalidProviderResults, ...parsed.invalidProviderResults]
  };
}

export function parseProviderRawResult(
  run: AuditRun,
  raw: ProviderRawResult,
  promptVersion: string
): ProviderAuditResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.rawText);
  } catch {
    return invalid(raw.provider, "Provider returned invalid JSON");
  }

  const candidates = extractCandidates(parsed);
  if (!candidates) {
    return invalid(raw.provider, "Provider JSON did not contain a findings array");
  }

  const findings: Finding[] = [];
  const invalidProviderResults: AuditRun["invalidProviderResults"] = [];
  for (const candidate of candidates) {
    const validCandidate = validateCandidate(candidate);
    if (!validCandidate.valid) {
      invalidProviderResults.push(invalidEntry(raw.provider, validCandidate.reason));
      continue;
    }

    const evidence = buildEvidence(run, validCandidate.candidate.sourceBlockIds);
    if (evidence.length !== validCandidate.candidate.sourceBlockIds.length) {
      invalidProviderResults.push(invalidEntry(raw.provider, "Provider finding referenced missing evidence"));
      continue;
    }

    findings.push(providerFinding(run, raw, promptVersion, validCandidate.candidate, evidence));
  }

  return { findings, invalidProviderResults };
}

export function redactSecrets(value: string, secrets: string[]): string {
  let redacted = value;
  for (const secret of secrets.filter((item) => item.length > 0)) {
    redacted = redacted.split(secret).join("[REDACTED]");
  }
  redacted = redacted.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [REDACTED]");
  redacted = redacted.replace(/sk-[A-Za-z0-9_-]{8,}/g, "sk-[REDACTED]");
  return redacted;
}

function buildProviderPrompt(run: AuditRun): string {
  return JSON.stringify({
    instruction:
      "Return JSON with a findings array. Each finding must cite sourceBlockIds. Do not summarize or omit evidence.",
    schemaVersion: run.schemaVersion,
    sourceBlocks: run.sourceBlocks.map((block) => ({
      blockId: block.blockId,
      sourcePath: run.artifacts.find((artifact) => artifact.artifactId === block.artifactId)?.sourcePath,
      startLine: block.startLine,
      endLine: block.endLine,
      fullText: block.fullText
    }))
  });
}

function extractCandidates(parsed: unknown): unknown[] | null {
  if (!isObject(parsed)) return null;
  const findings = parsed["findings"];
  return Array.isArray(findings) ? findings : null;
}

function validateCandidate(value: unknown):
  | { valid: true; candidate: ProviderFindingCandidate }
  | { valid: false; reason: string } {
  if (!isObject(value)) return { valid: false, reason: "Provider finding is not an object" };
  const sourceBlockIds = value["sourceBlockIds"];
  if (!Array.isArray(sourceBlockIds) || sourceBlockIds.length === 0 || !sourceBlockIds.every((item) => typeof item === "string")) {
    return { valid: false, reason: "Provider finding is missing sourceBlockIds" };
  }
  const title = value["title"];
  const explanation = value["explanation"];
  const ruleId = value["ruleId"];
  const category = value["category"];
  const severity = value["severity"];
  const confidence = value["confidence"];
  if (
    typeof title !== "string" ||
    typeof explanation !== "string" ||
    typeof ruleId !== "string" ||
    typeof category !== "string" ||
    typeof severity !== "string" ||
    typeof confidence !== "number"
  ) {
    return { valid: false, reason: "Provider finding is missing required fields" };
  }

  return {
    valid: true,
    candidate: {
      title,
      explanation,
      ruleId,
      category: category as Finding["category"],
      severity: severity as Finding["severity"],
      confidence,
      sourceBlockIds,
      relatedBlockIds: Array.isArray(value["relatedBlockIds"])
        ? value["relatedBlockIds"].filter((item): item is string => typeof item === "string")
        : sourceBlockIds
    }
  };
}

function providerFinding(
  run: AuditRun,
  raw: ProviderRawResult,
  promptVersion: string,
  candidate: ProviderFindingCandidate,
  evidence: FindingEvidence[]
): Finding {
  return {
    findingId: stableId("fnd", [
      AUDIT_CANVAS_SCHEMA_VERSION,
      raw.provider,
      raw.model,
      candidate.ruleId,
      ...candidate.sourceBlockIds
    ]),
    ruleId: candidate.ruleId,
    category: candidate.category,
    severity: candidate.severity,
    confidence: Math.max(0, Math.min(1, candidate.confidence)),
    title: candidate.title,
    explanation: candidate.explanation,
    evidence,
    sourceBlockIds: candidate.sourceBlockIds,
    relatedBlockIds: candidate.relatedBlockIds ?? candidate.sourceBlockIds,
    suggestedAction: null,
    status: "pending",
    reviewerComment: null,
    generatedBy: "provider",
    model: raw.model,
    promptVersion,
    createdAt: run.timestamps.completedAt,
    resolvedAt: null
  };
}

function buildEvidence(run: AuditRun, sourceBlockIds: string[]): FindingEvidence[] {
  return sourceBlockIds.flatMap((sourceBlockId) => {
    const block = run.sourceBlocks.find((item) => item.blockId === sourceBlockId);
    if (!block) return [];
    const artifact = run.artifacts.find((item) => item.artifactId === block.artifactId);
    if (!artifact) return [];
    return [
      {
        evidenceId: stableId("evd", [sourceBlockId, artifact.sourcePath]),
        sourceBlockId,
        artifactId: artifact.artifactId,
        sourcePath: artifact.sourcePath,
        headingPath: block.headingPath,
        startLine: block.startLine,
        endLine: block.endLine,
        fullText: block.fullText,
        contentHash: block.contentHash
      }
    ];
  });
}

function invalid(provider: string, reason: string): ProviderAuditResult {
  return { findings: [], invalidProviderResults: [invalidEntry(provider, reason)] };
}

function invalidEntry(provider: string, reason: string): AuditRun["invalidProviderResults"][number] {
  return {
    provider,
    reason,
    createdAt: new Date().toISOString()
  };
}

function assertProviderEnabled(enabled: boolean, provider: string): void {
  if (!enabled) {
    throw new Error(`${provider} provider is disabled by configuration`);
  }
}

function readSecretFromEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required API key environment variable ${name} is not set`);
  }
  return value;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

