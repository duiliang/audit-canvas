export type ArtifactType = "markdown" | "txt" | "json" | "source";
export type BlockType = "heading" | "paragraph" | "json" | "source" | "text";

export type FindingCategory =
  | "exact-duplicate"
  | "near-duplicate"
  | "semantic-duplicate"
  | "partial-overlap"
  | "contradiction"
  | "ambiguity"
  | "missing-acceptance-criteria"
  | "missing-input-output"
  | "missing-error-handling"
  | "non-testable"
  | "traceability-gap"
  | "stale-content"
  | "uncovered-content"
  | "implementation-mismatch"
  | "custom-rule";

export type FindingSeverity = "info" | "low" | "medium" | "high" | "critical";
export type FindingStatus = "pending" | "accepted" | "rejected" | "resolved" | "ignored-with-reason" | "invalid";

export interface Artifact {
  artifactId: string;
  artifactType: ArtifactType;
  sourcePath: string;
  repository: string;
  gitCommit: string;
  gitBranch: string;
  fileHash: string;
  parser: string;
  createdAt: string;
}

export interface SourceBlock {
  blockId: string;
  artifactId: string;
  blockType: BlockType;
  fullText: string;
  normalizedText: string;
  headingPath: string[];
  startLine: number;
  endLine: number;
  contentHash: string;
  previousBlockId: string | null;
  nextBlockId: string | null;
}

export interface FindingEvidence {
  evidenceId: string;
  sourceBlockId: string;
  artifactId: string;
  sourcePath: string;
  headingPath: string[];
  startLine: number;
  endLine: number;
  fullText: string;
  contentHash: string;
}

export interface Finding {
  findingId: string;
  ruleId: string;
  category: FindingCategory;
  severity: FindingSeverity;
  confidence: number;
  title: string;
  explanation: string;
  evidence: FindingEvidence[];
  sourceBlockIds: string[];
  relatedBlockIds: string[];
  suggestedAction: string | null;
  status: FindingStatus;
  reviewerComment: string | null;
  generatedBy: "local-rule" | "provider" | "human";
  model: string | null;
  promptVersion: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface CoverageExclusion {
  sourceBlockId: string;
  reason: string;
}

export interface AuditCoverage {
  percentage: number;
  excludedSourceBlocks: CoverageExclusion[];
}

export interface AuditTimestamps {
  startedAt: string;
  completedAt: string;
}

export interface InvalidProviderResult {
  provider: string;
  reason: string;
  createdAt: string;
}

export interface AuditRun {
  auditRunId: string;
  schemaVersion: string;
  baselineCommit: string | null;
  targetCommit: string;
  sourceBlockCount: number;
  coveredBlockCount: number;
  excludedBlockCount: number;
  coverage: AuditCoverage;
  findings: Finding[];
  artifacts: Artifact[];
  sourceBlocks: SourceBlock[];
  invalidProviderResults: InvalidProviderResult[];
  provider: string;
  configuration: Record<string, unknown>;
  timestamps: AuditTimestamps;
}

