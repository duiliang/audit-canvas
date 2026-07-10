import {
  AUDIT_CANVAS_SCHEMA_VERSION,
  type Artifact,
  type AuditRun,
  type Finding,
  type FindingEvidence,
  type SourceBlock
} from "@audit-canvas/schema";
import { computeCoverage } from "./coverage.js";
import { parseArtifact, type ParseInput } from "./parse.js";
import { jaccardSimilarity, normalizeForDuplicate } from "./normalize.js";
import { stableId } from "./ids.js";

export type AuditInput = ParseInput;

export interface AuditOptions {
  baselineCommit?: string | null;
  targetCommit?: string;
  provider?: string;
  createdAt?: string;
  nearDuplicateThreshold?: number;
}

interface BlockWithArtifact {
  block: SourceBlock;
  artifact: Artifact;
}

export function runLocalAudit(inputs: AuditInput[], options: AuditOptions = {}): AuditRun {
  const startedAt = options.createdAt ?? new Date().toISOString();
  const parsed = inputs.map((input) => parseArtifact({ ...input, createdAt: startedAt }));
  const artifacts = parsed.map((item) => item.artifact);
  const sourceBlocks = parsed.flatMap((item) => item.sourceBlocks);
  const findings = [
    ...findExactDuplicates(artifacts, sourceBlocks, startedAt),
    ...findNormalizedDuplicates(artifacts, sourceBlocks, startedAt),
    ...findNearDuplicates(artifacts, sourceBlocks, startedAt, options.nearDuplicateThreshold ?? 0.78)
  ];
  const coverage = computeCoverage(sourceBlocks, findings);
  const completedAt = startedAt;
  const targetCommit = options.targetCommit ?? artifacts[0]?.gitCommit ?? "WORKTREE";

  return {
    auditRunId: stableId("run", [
      AUDIT_CANVAS_SCHEMA_VERSION,
      targetCommit,
      ...artifacts.map((artifact) => artifact.fileHash).sort()
    ]),
    schemaVersion: AUDIT_CANVAS_SCHEMA_VERSION,
    baselineCommit: options.baselineCommit ?? null,
    targetCommit,
    ...coverage,
    findings,
    artifacts,
    sourceBlocks,
    invalidProviderResults: [],
    provider: options.provider ?? "none",
    configuration: {
      localRules: ["exact-duplicate", "normalized-duplicate", "near-duplicate"],
      nearDuplicateThreshold: options.nearDuplicateThreshold ?? 0.78
    },
    timestamps: { startedAt, completedAt }
  };
}

function auditableBlocks(artifacts: Artifact[], sourceBlocks: SourceBlock[]): BlockWithArtifact[] {
  const artifactsById = new Map(artifacts.map((artifact) => [artifact.artifactId, artifact]));
  return sourceBlocks
    .filter((block) => block.normalizedText.length > 0 && block.blockType !== "heading")
    .map((block) => ({ block, artifact: artifactsById.get(block.artifactId) }))
    .filter((entry): entry is BlockWithArtifact => Boolean(entry.artifact));
}

function findExactDuplicates(artifacts: Artifact[], sourceBlocks: SourceBlock[], createdAt: string): Finding[] {
  const groups = groupBy(auditableBlocks(artifacts, sourceBlocks), (entry) => entry.block.fullText.trim());
  return duplicateFindings(groups, "local/exact-duplicate", "exact-duplicate", createdAt);
}

function findNormalizedDuplicates(artifacts: Artifact[], sourceBlocks: SourceBlock[], createdAt: string): Finding[] {
  const groups = groupBy(auditableBlocks(artifacts, sourceBlocks), (entry) => normalizeForDuplicate(entry.block.fullText));
  return duplicateFindings(groups, "local/normalized-duplicate", "exact-duplicate", createdAt).filter((finding) => {
    const fullTexts = new Set(finding.evidence.map((entry) => entry.fullText));
    return fullTexts.size > 1;
  });
}

function findNearDuplicates(
  artifacts: Artifact[],
  sourceBlocks: SourceBlock[],
  createdAt: string,
  threshold: number
): Finding[] {
  const blocks = auditableBlocks(artifacts, sourceBlocks);
  const findings: Finding[] = [];
  const seenPairs = new Set<string>();

  for (let leftIndex = 0; leftIndex < blocks.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < blocks.length; rightIndex += 1) {
      const left = blocks[leftIndex];
      const right = blocks[rightIndex];
      if (left.block.contentHash === right.block.contentHash) {
        continue;
      }
      if (normalizeForDuplicate(left.block.fullText) === normalizeForDuplicate(right.block.fullText)) {
        continue;
      }
      const similarity = jaccardSimilarity(left.block.fullText, right.block.fullText);
      if (similarity < threshold) {
        continue;
      }

      const pairKey = [left.block.blockId, right.block.blockId].sort().join(":");
      if (seenPairs.has(pairKey)) {
        continue;
      }
      seenPairs.add(pairKey);
      findings.push(createFinding({
        ruleId: "local/near-duplicate",
        category: "near-duplicate",
        title: "Near duplicate content",
        explanation: `Two source blocks are similar with token Jaccard similarity ${similarity.toFixed(2)}.`,
        entries: [left, right],
        createdAt,
        confidence: Number(similarity.toFixed(3))
      }));
    }
  }

  return findings;
}

function duplicateFindings(
  groups: Map<string, BlockWithArtifact[]>,
  ruleId: string,
  category: "exact-duplicate",
  createdAt: string
): Finding[] {
  const findings: Finding[] = [];
  for (const entries of groups.values()) {
    if (entries.length < 2) {
      continue;
    }

    findings.push(
      createFinding({
        ruleId,
        category,
        title: entries.length === 2 ? "Duplicate content" : `Duplicate content repeated ${entries.length} times`,
        explanation: "Every duplicate occurrence is preserved as full evidence.",
        entries,
        createdAt,
        confidence: 1
      })
    );
  }

  return findings;
}

function createFinding(args: {
  ruleId: string;
  category: Finding["category"];
  title: string;
  explanation: string;
  entries: BlockWithArtifact[];
  createdAt: string;
  confidence: number;
}): Finding {
  const sourceBlockIds = args.entries.map((entry) => entry.block.blockId);
  const evidence = args.entries.map((entry) => createEvidence(entry));
  return {
    findingId: stableId("fnd", [
      AUDIT_CANVAS_SCHEMA_VERSION,
      args.ruleId,
      args.category,
      ...sourceBlockIds.sort()
    ]),
    ruleId: args.ruleId,
    category: args.category,
    severity: args.category === "near-duplicate" ? "medium" : "high",
    confidence: args.confidence,
    title: args.title,
    explanation: args.explanation,
    evidence,
    sourceBlockIds,
    relatedBlockIds: sourceBlockIds,
    suggestedAction: null,
    status: "pending",
    reviewerComment: null,
    generatedBy: "local-rule",
    model: null,
    promptVersion: null,
    createdAt: args.createdAt,
    resolvedAt: null
  };
}

function createEvidence(entry: BlockWithArtifact): FindingEvidence {
  return {
    evidenceId: stableId("evd", [entry.block.blockId, entry.artifact.sourcePath]),
    sourceBlockId: entry.block.blockId,
    artifactId: entry.artifact.artifactId,
    sourcePath: entry.artifact.sourcePath,
    headingPath: entry.block.headingPath,
    startLine: entry.block.startLine,
    endLine: entry.block.endLine,
    fullText: entry.block.fullText,
    contentHash: entry.block.contentHash
  };
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    if (key.length === 0) {
      continue;
    }
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}
