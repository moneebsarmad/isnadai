/**
 * LCS-based word-level diff for Arabic matan comparison.
 *
 * Takes two sequences of normalized tokens and produces a sequence of
 * DiffChunk entries that can be rendered with color highlighting.
 *
 * Tag semantics (from the compare version's point of view):
 *   equal   — word matches the base (same normalized form)
 *   insert  — word present in compare, absent from base  (ziyadah ↑)
 *   delete  — word present in base, absent from compare  (omission ↓)
 *   replace — different word at the same aligned position (variant ~)
 */

export type DiffTag = 'equal' | 'insert' | 'delete' | 'replace'

export interface DiffChunk {
  tag: DiffTag
  baseWords: string[]    // original (diacriticised) words from base
  cmpWords: string[]     // original words from compare version
}

// ── Standard LCS DP table ────────────────────────────────────────────────────

function buildDP(a: string[], b: string[]): number[][] {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp
}

// ── Backtrack + merge adjacent del/ins as replace ────────────────────────────

type RawOp =
  | { op: 'eq';  bi: number; ci: number }
  | { op: 'del'; bi: number }
  | { op: 'ins'; ci: number }

export function diffWords(
  baseNorm: string[], baseOrig: string[],
  cmpNorm:  string[], cmpOrig:  string[],
): DiffChunk[] {
  const dp = buildDP(baseNorm, cmpNorm)
  const raw: RawOp[] = []

  let i = baseNorm.length
  let j = cmpNorm.length
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && baseNorm[i - 1] === cmpNorm[j - 1]) {
      raw.unshift({ op: 'eq', bi: i - 1, ci: j - 1 })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.unshift({ op: 'ins', ci: j - 1 })
      j--
    } else {
      raw.unshift({ op: 'del', bi: i - 1 })
      i--
    }
  }

  // Merge adjacent del+ins groups into 'replace' chunks
  const chunks: DiffChunk[] = []
  let k = 0
  while (k < raw.length) {
    const cur = raw[k]
    if (cur.op === 'eq') {
      chunks.push({ tag: 'equal', baseWords: [baseOrig[cur.bi]], cmpWords: [cmpOrig[cur.ci]] })
      k++
      continue
    }

    // Collect a run of del and ins ops
    const dels: number[] = []
    const ins: number[] = []
    while (k < raw.length && (raw[k].op === 'del' || raw[k].op === 'ins')) {
      if (raw[k].op === 'del') dels.push((raw[k] as { op: 'del'; bi: number }).bi)
      else ins.push((raw[k] as { op: 'ins'; ci: number }).ci)
      k++
    }

    if (dels.length > 0 && ins.length > 0) {
      // Both sides have words at this position → replace/variant
      chunks.push({
        tag: 'replace',
        baseWords: dels.map(idx => baseOrig[idx]),
        cmpWords:  ins.map(idx => cmpOrig[idx]),
      })
    } else if (dels.length > 0) {
      chunks.push({ tag: 'delete', baseWords: dels.map(idx => baseOrig[idx]), cmpWords: [] })
    } else {
      chunks.push({ tag: 'insert', baseWords: [], cmpWords: ins.map(idx => cmpOrig[idx]) })
    }
  }

  return chunks
}
