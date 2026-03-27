/**
 * Build a position map between normalized text positions and original text positions.
 * This allows extracting substrings from the original text that correspond to
 * positions computed on the normalized text.
 */
export interface PositionMap {
  /** Extract original text slice using normalized positions */
  extractOriginal: (normStart: number, normEnd: number) => string
  /** Convert a normalized position to an original position */
  toOriginal: (normPos: number) => number
  normalizedText: string
  originalText: string
}

export function buildPositionMap(original: string, normalized: string): PositionMap {
  // Build a forward mapping: normPos → origPos
  const normToOrig: number[] = []
  let origIdx = 0
  let normIdx = 0

  while (normIdx < normalized.length && origIdx < original.length) {
    if (normalized[normIdx] === original[origIdx]) {
      normToOrig[normIdx] = origIdx
      normIdx++
      origIdx++
    } else {
      // Original char was removed during normalization (e.g., diacritic)
      origIdx++
    }
  }

  // Fill any remaining normalized positions
  while (normIdx < normalized.length) {
    normToOrig[normIdx] = origIdx
    normIdx++
  }

  function toOriginal(normPos: number): number {
    if (normPos <= 0) return 0
    if (normPos >= normalized.length) return original.length
    return normToOrig[normPos] ?? original.length
  }

  function extractOriginal(normStart: number, normEnd: number): string {
    const origStart = toOriginal(normStart)
    const origEnd = normEnd >= normalized.length ? original.length : toOriginal(normEnd)
    return original.slice(origStart, origEnd)
  }

  return {
    extractOriginal,
    toOriginal,
    normalizedText: normalized,
    originalText: original,
  }
}
