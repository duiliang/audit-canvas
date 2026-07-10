import type { AuditRun } from "@audit-canvas/schema";

export const repeatedEvidence =
  "The checkout service shall keep every duplicate requirement visible with complete evidence, path, heading, and line numbers.";

export const sampleRun: AuditRun = {
  auditRunId: "run_sample_review_canvas",
  schemaVersion: "0.1.0",
  baselineCommit: "3f6e1a0",
  targetCommit: "8b7d9c2",
  sourceBlockCount: 7,
  coveredBlockCount: 7,
  excludedBlockCount: 0,
  coverage: {
    percentage: 1,
    excludedSourceBlocks: []
  },
  provider: "none",
  configuration: {
    localRules: ["exact-duplicate", "near-duplicate"],
    remoteProvidersEnabled: false
  },
  invalidProviderResults: [],
  timestamps: {
    startedAt: "2026-07-10T06:00:00.000Z",
    completedAt: "2026-07-10T06:00:00.000Z"
  },
  artifacts: [
    {
      artifactId: "art_checkout_spec",
      artifactType: "markdown",
      sourcePath: "docs/checkout.md",
      repository: "audit-canvas-example",
      gitCommit: "8b7d9c2",
      gitBranch: "main",
      fileHash: "hash_checkout",
      parser: "audit-canvas/markdown",
      createdAt: "2026-07-10T06:00:00.000Z"
    },
    {
      artifactId: "art_release_plan",
      artifactType: "markdown",
      sourcePath: "docs/release-plan.md",
      repository: "audit-canvas-example",
      gitCommit: "8b7d9c2",
      gitBranch: "main",
      fileHash: "hash_release",
      parser: "audit-canvas/markdown",
      createdAt: "2026-07-10T06:00:00.000Z"
    },
    {
      artifactId: "art_tests",
      artifactType: "txt",
      sourcePath: "tests/acceptance.txt",
      repository: "audit-canvas-example",
      gitCommit: "8b7d9c2",
      gitBranch: "main",
      fileHash: "hash_tests",
      parser: "audit-canvas/txt",
      createdAt: "2026-07-10T06:00:00.000Z"
    }
  ],
  sourceBlocks: [
    {
      blockId: "blk_checkout_heading",
      artifactId: "art_checkout_spec",
      blockType: "heading",
      fullText: "# Checkout requirements",
      normalizedText: "# checkout requirements",
      headingPath: ["Checkout requirements"],
      startLine: 1,
      endLine: 1,
      contentHash: "hash_h1",
      previousBlockId: null,
      nextBlockId: "blk_checkout_duplicate"
    },
    {
      blockId: "blk_checkout_duplicate",
      artifactId: "art_checkout_spec",
      blockType: "paragraph",
      fullText: repeatedEvidence,
      normalizedText: repeatedEvidence.toLowerCase(),
      headingPath: ["Checkout requirements"],
      startLine: 3,
      endLine: 3,
      contentHash: "hash_duplicate",
      previousBlockId: "blk_checkout_heading",
      nextBlockId: "blk_checkout_similar"
    },
    {
      blockId: "blk_checkout_similar",
      artifactId: "art_checkout_spec",
      blockType: "paragraph",
      fullText:
        "The checkout service must keep each duplicated requirement occurrence visible with its full evidence and line location.",
      normalizedText:
        "the checkout service must keep each duplicated requirement occurrence visible with its full evidence and line location.",
      headingPath: ["Checkout requirements"],
      startLine: 5,
      endLine: 5,
      contentHash: "hash_similar",
      previousBlockId: "blk_checkout_duplicate",
      nextBlockId: null
    },
    {
      blockId: "blk_release_heading",
      artifactId: "art_release_plan",
      blockType: "heading",
      fullText: "# Release plan",
      normalizedText: "# release plan",
      headingPath: ["Release plan"],
      startLine: 1,
      endLine: 1,
      contentHash: "hash_release_heading",
      previousBlockId: null,
      nextBlockId: "blk_release_duplicate"
    },
    {
      blockId: "blk_release_duplicate",
      artifactId: "art_release_plan",
      blockType: "paragraph",
      fullText: repeatedEvidence,
      normalizedText: repeatedEvidence.toLowerCase(),
      headingPath: ["Release plan"],
      startLine: 4,
      endLine: 4,
      contentHash: "hash_duplicate",
      previousBlockId: "blk_release_heading",
      nextBlockId: null
    },
    {
      blockId: "blk_tests_duplicate",
      artifactId: "art_tests",
      blockType: "text",
      fullText: repeatedEvidence,
      normalizedText: repeatedEvidence.toLowerCase(),
      headingPath: ["Acceptance tests"],
      startLine: 2,
      endLine: 2,
      contentHash: "hash_duplicate",
      previousBlockId: null,
      nextBlockId: "blk_tests_contradiction"
    },
    {
      blockId: "blk_tests_contradiction",
      artifactId: "art_tests",
      blockType: "text",
      fullText: "Checkout errors may be hidden from the final review when they are similar to existing failures.",
      normalizedText:
        "checkout errors may be hidden from the final review when they are similar to existing failures.",
      headingPath: ["Acceptance tests"],
      startLine: 4,
      endLine: 4,
      contentHash: "hash_contradiction",
      previousBlockId: "blk_tests_duplicate",
      nextBlockId: null
    }
  ],
  findings: [
    {
      findingId: "fnd_duplicate_three",
      ruleId: "local/exact-duplicate",
      category: "exact-duplicate",
      severity: "high",
      confidence: 1,
      title: "Duplicate content repeated 3 times",
      explanation: "Every duplicate occurrence is preserved as full evidence.",
      evidence: [
        {
          evidenceId: "evd_checkout_duplicate",
          sourceBlockId: "blk_checkout_duplicate",
          artifactId: "art_checkout_spec",
          sourcePath: "docs/checkout.md",
          headingPath: ["Checkout requirements"],
          startLine: 3,
          endLine: 3,
          fullText: repeatedEvidence,
          contentHash: "hash_duplicate"
        },
        {
          evidenceId: "evd_release_duplicate",
          sourceBlockId: "blk_release_duplicate",
          artifactId: "art_release_plan",
          sourcePath: "docs/release-plan.md",
          headingPath: ["Release plan"],
          startLine: 4,
          endLine: 4,
          fullText: repeatedEvidence,
          contentHash: "hash_duplicate"
        },
        {
          evidenceId: "evd_tests_duplicate",
          sourceBlockId: "blk_tests_duplicate",
          artifactId: "art_tests",
          sourcePath: "tests/acceptance.txt",
          headingPath: ["Acceptance tests"],
          startLine: 2,
          endLine: 2,
          fullText: repeatedEvidence,
          contentHash: "hash_duplicate"
        }
      ],
      sourceBlockIds: ["blk_checkout_duplicate", "blk_release_duplicate", "blk_tests_duplicate"],
      relatedBlockIds: ["blk_checkout_duplicate", "blk_release_duplicate", "blk_tests_duplicate"],
      suggestedAction: null,
      status: "pending",
      reviewerComment: null,
      generatedBy: "local-rule",
      model: null,
      promptVersion: null,
      createdAt: "2026-07-10T06:00:00.000Z",
      resolvedAt: null
    },
    {
      findingId: "fnd_near_duplicate",
      ruleId: "local/near-duplicate",
      category: "near-duplicate",
      severity: "medium",
      confidence: 0.82,
      title: "Near duplicate checkout requirement",
      explanation: "The two requirements are similar enough to compare before release.",
      evidence: [
        {
          evidenceId: "evd_checkout_duplicate_near",
          sourceBlockId: "blk_checkout_duplicate",
          artifactId: "art_checkout_spec",
          sourcePath: "docs/checkout.md",
          headingPath: ["Checkout requirements"],
          startLine: 3,
          endLine: 3,
          fullText: repeatedEvidence,
          contentHash: "hash_duplicate"
        },
        {
          evidenceId: "evd_checkout_similar",
          sourceBlockId: "blk_checkout_similar",
          artifactId: "art_checkout_spec",
          sourcePath: "docs/checkout.md",
          headingPath: ["Checkout requirements"],
          startLine: 5,
          endLine: 5,
          fullText:
            "The checkout service must keep each duplicated requirement occurrence visible with its full evidence and line location.",
          contentHash: "hash_similar"
        }
      ],
      sourceBlockIds: ["blk_checkout_duplicate", "blk_checkout_similar"],
      relatedBlockIds: ["blk_checkout_duplicate", "blk_checkout_similar"],
      suggestedAction: null,
      status: "pending",
      reviewerComment: null,
      generatedBy: "local-rule",
      model: null,
      promptVersion: null,
      createdAt: "2026-07-10T06:00:00.000Z",
      resolvedAt: null
    },
    {
      findingId: "fnd_contradiction_manual",
      ruleId: "local/contradiction-seed",
      category: "contradiction",
      severity: "critical",
      confidence: 0.7,
      title: "Review visibility contradiction",
      explanation: "One artifact requires visibility while another allows hidden similar failures.",
      evidence: [
        {
          evidenceId: "evd_visible_requirement",
          sourceBlockId: "blk_checkout_duplicate",
          artifactId: "art_checkout_spec",
          sourcePath: "docs/checkout.md",
          headingPath: ["Checkout requirements"],
          startLine: 3,
          endLine: 3,
          fullText: repeatedEvidence,
          contentHash: "hash_duplicate"
        },
        {
          evidenceId: "evd_hidden_failure",
          sourceBlockId: "blk_tests_contradiction",
          artifactId: "art_tests",
          sourcePath: "tests/acceptance.txt",
          headingPath: ["Acceptance tests"],
          startLine: 4,
          endLine: 4,
          fullText:
            "Checkout errors may be hidden from the final review when they are similar to existing failures.",
          contentHash: "hash_contradiction"
        }
      ],
      sourceBlockIds: ["blk_checkout_duplicate", "blk_tests_contradiction"],
      relatedBlockIds: ["blk_checkout_duplicate", "blk_tests_contradiction"],
      suggestedAction: null,
      status: "pending",
      reviewerComment: null,
      generatedBy: "local-rule",
      model: null,
      promptVersion: null,
      createdAt: "2026-07-10T06:00:00.000Z",
      resolvedAt: null
    }
  ]
};

