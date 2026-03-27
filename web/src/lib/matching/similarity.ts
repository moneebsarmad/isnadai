import { normalize } from '@/lib/parser/normalize'

export function similarityScore(textA: string, textB: string): number {
  const normA = normalize(textA)
  const normB = normalize(textB)
  if (normA === normB) return 1.0
  if (normA.includes(normB) || normB.includes(normA)) {
    const ratio = Math.min(normA.length, normB.length) / Math.max(normA.length, normB.length)
    return 0.6 + (ratio * 0.3)
  }
  const distance = levenshteinDistance(normA, normB)
  const maxLen = Math.max(normA.length, normB.length)
  return Math.max(0, 1 - (distance / maxLen))
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}
