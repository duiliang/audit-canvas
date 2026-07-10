import type { AuditRun, CoverageExclusion, Finding, SourceBlock } from "@audit-canvas/schema";

export function computeCoverage(
  sourceBlocks: SourceBlock[],
  findings: Finding[],
  exclusions: CoverageExclusion[] = []
): Pick<AuditRun, "sourceBlockCount" | "coveredBlockCount" | "excludedBlockCount" | "coverage"> {
  const sourceBlockIds = new Set(sourceBlocks.map((block) => block.blockId));
  const coveredIds = new Set<string>();

  for (const finding of findings) {
    for (const blockId of finding.sourceBlockIds) {
      if (sourceBlockIds.has(blockId)) {
        coveredIds.add(blockId);
      }
    }
  }

  for (const block of sourceBlocks) {
    if (!coveredIds.has(block.blockId) && exclusions.some((entry) => entry.sourceBlockId === block.blockId)) {
      coveredIds.delete(block.blockId);
    }
  }

  const excludedSourceBlocks = exclusions.filter((entry) => sourceBlockIds.has(entry.sourceBlockId));
  const sourceBlockCount = sourceBlocks.length;
  const excludedBlockCount = excludedSourceBlocks.length;
  const coveredBlockCount = sourceBlockCount - excludedBlockCount;

  return {
    sourceBlockCount,
    coveredBlockCount,
    excludedBlockCount,
    coverage: {
      percentage: sourceBlockCount === 0 ? 1 : coveredBlockCount / sourceBlockCount,
      excludedSourceBlocks
    }
  };
}

export function verifyCoverageInvariant(run: AuditRun): { valid: true } | { valid: false; message: string } {
  if (run.sourceBlockCount !== run.coveredBlockCount + run.excludedBlockCount) {
    return {
      valid: false,
      message: "sourceBlockCount must equal coveredBlockCount + excludedBlockCount"
    };
  }

  for (const exclusion of run.coverage.excludedSourceBlocks) {
    if (exclusion.reason.trim().length === 0) {
      return { valid: false, message: `exclusion ${exclusion.sourceBlockId} is missing a reason` };
    }
  }

  return { valid: true };
}

