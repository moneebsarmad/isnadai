'use client'
import { useMemo } from 'react'
import { tokenize } from '@/lib/matan/arabicNorm'
import { diffWords } from '@/lib/matan/wordDiff'
import type { DiffChunk } from '@/lib/matan/wordDiff'

interface MatanDiffViewProps {
  baseText: string
  cmpText: string
  /** Which version's words to render (default: 'cmp') */
  perspective?: 'base' | 'cmp'
}

/**
 * Renders a single version's matan text with word-level diff highlighting
 * relative to a base version.
 *
 * Color semantics (from compare version's POV):
 *   green  = ziyadah — word in cmp, absent from base  (insert)
 *   orange = variant  — different word at same position (replace)
 *   red/strikethrough = omission — word in base, absent from cmp (delete)
 *   plain  = equal
 */
export default function MatanDiffView({ baseText, cmpText, perspective = 'cmp' }: MatanDiffViewProps) {
  const chunks = useMemo<DiffChunk[]>(() => {
    const baseToks = tokenize(baseText)
    const cmpToks  = tokenize(cmpText)
    return diffWords(
      baseToks.map(t => t.norm), baseToks.map(t => t.orig),
      cmpToks.map(t => t.norm),  cmpToks.map(t => t.orig),
    )
  }, [baseText, cmpText])

  return (
    <span dir="rtl" style={{ fontFamily: "'Amiri', serif", lineHeight: '2', fontSize: '1rem' }}>
      {chunks.map((chunk, i) => {
        if (chunk.tag === 'equal') {
          return (
            <span key={i}>
              {(perspective === 'cmp' ? chunk.cmpWords : chunk.baseWords).join(' ')}{' '}
            </span>
          )
        }

        if (chunk.tag === 'insert') {
          // Word present in cmp, absent from base → ziyadah (green)
          if (perspective === 'cmp') {
            return (
              <span
                key={i}
                className="bg-emerald-100 text-emerald-800 rounded px-0.5 mx-0.5"
                title="زيادة — present here, absent in base"
              >
                {chunk.cmpWords.join(' ')}{' '}
              </span>
            )
          }
          // From base perspective: these words are missing → show nothing (they're omissions from base's view)
          return null
        }

        if (chunk.tag === 'delete') {
          // Word in base, absent from cmp → omission
          if (perspective === 'cmp') {
            // Show strikethrough placeholder so the reader can see what was omitted
            return (
              <span
                key={i}
                className="line-through text-red-400 opacity-60 mx-0.5"
                title="حذف — present in base, absent here"
              >
                {chunk.baseWords.join(' ')}{' '}
              </span>
            )
          }
          // Base perspective: these words are present, show normally
          return (
            <span key={i}>
              {chunk.baseWords.join(' ')}{' '}
            </span>
          )
        }

        if (chunk.tag === 'replace') {
          // Variant wording (orange)
          const words = perspective === 'cmp' ? chunk.cmpWords : chunk.baseWords
          return (
            <span
              key={i}
              className="bg-amber-100 text-amber-800 rounded px-0.5 mx-0.5"
              title={`رواية — variant: ${(perspective === 'cmp' ? chunk.baseWords : chunk.cmpWords).join(' ')}`}
            >
              {words.join(' ')}{' '}
            </span>
          )
        }

        return null
      })}
    </span>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────

export function DiffLegend() {
  return (
    <div className="flex items-center gap-3 flex-wrap text-xs text-neutral-500">
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded bg-emerald-100 border border-emerald-300" />
        زيادة
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded bg-amber-100 border border-amber-300" />
        رواية مختلفة
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block w-3 h-3 rounded bg-red-50 border border-red-200 line-through" />
        محذوف
      </span>
    </div>
  )
}
