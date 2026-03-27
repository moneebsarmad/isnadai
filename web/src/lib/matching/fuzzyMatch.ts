import { similarityScore } from './similarity'

export interface FuzzyMatchResult {
  narratorKey: string
  canonicalName: string
  score: number
  matchType: 'exact' | 'fuzzy' | 'none'
}

export function findBestMatch(
  normalizedText: string,
  existingNarrators: Array<{ narrator_key: string; canonical_name: string; name_variants: string[] }>
): FuzzyMatchResult | null {
  let best: FuzzyMatchResult | null = null

  for (const narrator of existingNarrators) {
    for (const variant of narrator.name_variants) {
      const score = similarityScore(normalizedText, variant)
      if (score === 1.0) {
        return { narratorKey: narrator.narrator_key, canonicalName: narrator.canonical_name, score, matchType: 'exact' }
      }
      if (score > 0.6 && (!best || score > best.score)) {
        best = { narratorKey: narrator.narrator_key, canonicalName: narrator.canonical_name, score, matchType: 'fuzzy' }
      }
    }
  }

  return best
}
