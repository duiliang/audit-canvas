import type { Artifact, ArtifactType, BlockType, SourceBlock } from "@audit-canvas/schema";
import { AUDIT_CANVAS_SCHEMA_VERSION } from "@audit-canvas/schema";
import { normalizeText } from "./normalize.js";
import { sha256, stableId } from "./ids.js";

export interface ParseInput {
  sourcePath: string;
  content: string;
  repository?: string;
  gitCommit?: string;
  gitBranch?: string;
  createdAt?: string;
}

export interface ParsedArtifact {
  artifact: Artifact;
  sourceBlocks: SourceBlock[];
}

interface RawBlock {
  blockType: BlockType;
  fullText: string;
  headingPath: string[];
  startLine: number;
  endLine: number;
}

export function detectArtifactType(sourcePath: string): ArtifactType {
  const lowerPath = sourcePath.toLowerCase();
  if (lowerPath.endsWith(".md") || lowerPath.endsWith(".markdown")) return "markdown";
  if (lowerPath.endsWith(".txt")) return "txt";
  if (lowerPath.endsWith(".json")) return "json";
  return "source";
}

export function parseArtifact(input: ParseInput): ParsedArtifact {
  const artifactType = detectArtifactType(input.sourcePath);
  const createdAt = input.createdAt ?? new Date().toISOString();
  const repository = input.repository ?? "local";
  const gitCommit = input.gitCommit ?? "WORKTREE";
  const gitBranch = input.gitBranch ?? "unknown";
  const fileHash = sha256(input.content);
  const artifactId = stableId("art", [
    AUDIT_CANVAS_SCHEMA_VERSION,
    repository,
    input.sourcePath,
    fileHash
  ]);

  const artifact: Artifact = {
    artifactId,
    artifactType,
    sourcePath: input.sourcePath,
    repository,
    gitCommit,
    gitBranch,
    fileHash,
    parser: `audit-canvas/${artifactType}`,
    createdAt
  };

  const rawBlocks = parseBlocks(artifactType, input.content);
  const sourceBlocks: SourceBlock[] = rawBlocks.map((block) => {
    const normalizedText = normalizeText(block.fullText);
    const contentHash = sha256(block.fullText);
    return {
      blockId: stableId("blk", [
        AUDIT_CANVAS_SCHEMA_VERSION,
        artifactId,
        input.sourcePath,
        String(block.startLine),
        String(block.endLine),
        contentHash
      ]),
      artifactId,
      blockType: block.blockType,
      fullText: block.fullText,
      normalizedText,
      headingPath: block.headingPath,
      startLine: block.startLine,
      endLine: block.endLine,
      contentHash,
      previousBlockId: null,
      nextBlockId: null
    };
  });

  for (let index = 0; index < sourceBlocks.length; index += 1) {
    sourceBlocks[index].previousBlockId = sourceBlocks[index - 1]?.blockId ?? null;
    sourceBlocks[index].nextBlockId = sourceBlocks[index + 1]?.blockId ?? null;
  }

  return { artifact, sourceBlocks };
}

function parseBlocks(artifactType: ArtifactType, content: string): RawBlock[] {
  if (artifactType === "json") {
    return parseJsonBlocks(content);
  }

  if (artifactType === "markdown") {
    return parseMarkdownLikeBlocks(content);
  }

  return parsePlainBlocks(content, artifactType === "source" ? "source" : "text");
}

function parseMarkdownLikeBlocks(content: string): RawBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: RawBlock[] = [];
  const headings: string[] = [];
  let paragraph: string[] = [];
  let paragraphStart = 1;

  const flushParagraph = (endLine: number) => {
    const fullText = paragraph.join("\n").trim();
    if (fullText.length > 0) {
      blocks.push({
        blockType: "paragraph",
        fullText,
        headingPath: [...headings],
        startLine: paragraphStart,
        endLine
      });
    }
    paragraph = [];
  };

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const headingMatch = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (headingMatch) {
      flushParagraph(lineNumber - 1);
      const level = headingMatch[1].length;
      headings.splice(level - 1);
      headings[level - 1] = headingMatch[2];
      blocks.push({
        blockType: "heading",
        fullText: line,
        headingPath: [...headings],
        startLine: lineNumber,
        endLine: lineNumber
      });
      return;
    }

    if (line.trim().length === 0) {
      flushParagraph(lineNumber - 1);
      return;
    }

    if (paragraph.length === 0) {
      paragraphStart = lineNumber;
    }
    paragraph.push(line);
  });

  flushParagraph(lines.length);
  return blocks;
}

function parsePlainBlocks(content: string, blockType: BlockType): RawBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: RawBlock[] = [];
  let current: string[] = [];
  let startLine = 1;

  const flush = (endLine: number) => {
    const fullText = current.join("\n").trim();
    if (fullText.length > 0) {
      blocks.push({ blockType, fullText, headingPath: [], startLine, endLine });
    }
    current = [];
  };

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    if (line.trim().length === 0) {
      flush(lineNumber - 1);
      return;
    }
    if (current.length === 0) {
      startLine = lineNumber;
    }
    current.push(line);
  });

  flush(lines.length);
  return blocks;
}

function parseJsonBlocks(content: string): RawBlock[] {
  try {
    const parsed = JSON.parse(content) as unknown;
    const blocks: RawBlock[] = [];
    flattenJson(parsed, "$", blocks);
    if (blocks.length > 0) {
      return blocks;
    }
  } catch {
    return parsePlainBlocks(content, "json");
  }

  return parsePlainBlocks(content, "json");
}

function flattenJson(value: unknown, path: string, blocks: RawBlock[]): void {
  if (value === null || typeof value !== "object") {
    blocks.push({
      blockType: "json",
      fullText: `${path}: ${String(value)}`,
      headingPath: [path],
      startLine: 1,
      endLine: 1
    });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => flattenJson(item, `${path}[${index}]`, blocks));
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    flattenJson(child, `${path}.${key}`, blocks);
  }
}
