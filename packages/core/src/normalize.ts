export function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim()
    .toLowerCase();
}

export function normalizeForDuplicate(value: string): string {
  return normalizeText(value).replace(/[^\p{L}\p{N}\n ]/gu, "").replace(/\s+/g, " ").trim();
}

export function jaccardSimilarity(left: string, right: string): number {
  const leftTokens = new Set(tokenizeForSimilarity(left));
  const rightTokens = new Set(tokenizeForSimilarity(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1;
    }
  }

  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

function tokenizeForSimilarity(value: string): string[] {
  return normalizeForDuplicate(value)
    .split(" ")
    .filter(Boolean)
    .filter((token) => !["a", "an", "the", "shall", "must", "should", "it"].includes(token))
    .map(stemLightly);
}

function stemLightly(token: string): string {
  if (token.length > 6 && token.endsWith("ing")) {
    return token.slice(0, -3);
  }
  if (token.length > 5 && token.endsWith("ed")) {
    return token.slice(0, -2);
  }
  if (token.length > 4 && token.endsWith("s")) {
    return token.slice(0, -1);
  }
  return token;
}
