'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import MatanDiffView, { DiffLegend } from './MatanDiffView'

interface Version {
  id: string
  source_book: string
  source_book_code: string | null
  source_reference: string | null
  matan_intro_phrase: string | null
  matan_text: string | null
  narrative_text: string | null
  post_matan_commentary: string | null
  display_order: number
}

interface BookColor {
  book_code: string
  color_hex: string
}

interface Props {
  studyId: string
  refreshKey?: number
}

type Mode = 'basic' | 'compare'

export default function MatanComparisonPanel({ studyId, refreshKey = 0 }: Props) {
  const [versions, setVersions] = useState<Version[]>([])
  const [bookColors, setBookColors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<Mode>('basic')
  const [baseId, setBaseId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const [{ data: versionsData }, { data: colorData }] = await Promise.all([
      supabase
        .from('versions')
        .select(
          'id, source_book, source_book_code, source_reference, matan_intro_phrase, matan_text, narrative_text, post_matan_commentary, display_order'
        )
        .eq('study_id', studyId)
        .order('display_order', { ascending: true }),
      supabase.from('source_book_colors').select('book_code, color_hex'),
    ])

    if (versionsData) {
      setVersions(versionsData as Version[])
      // Default base = first version with matan text
      setBaseId(prev => {
        if (prev) return prev
        const first = (versionsData as Version[]).find(v => v.matan_text)
        return first?.id ?? null
      })
    }

    if (colorData) {
      const colorMap: Record<string, string> = {}
      for (const row of colorData as BookColor[]) {
        colorMap[row.book_code] = row.color_hex
      }
      setBookColors(colorMap)
    }

    setLoading(false)
  }, [studyId, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const getColor = (bookCode: string | null): string => {
    if (!bookCode) return '#6B7280'
    return bookColors[bookCode] ?? '#6B7280'
  }

  const baseVersion = versions.find(v => v.id === baseId) ?? null
  const versionsWithMatan = versions.filter(v => v.matan_text)

  if (loading) return <MatanSkeleton />

  if (versions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <p className="text-xs text-neutral-400 text-center">No versions yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-neutral-100 bg-white flex-wrap">
        {/* Mode toggle */}
        <div className="flex items-center rounded-lg border border-neutral-200 overflow-hidden">
          <button
            onClick={() => setMode('basic')}
            className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
              mode === 'basic'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            Basic
          </button>
          <button
            onClick={() => setMode('compare')}
            className={`px-2.5 py-1.5 text-xs font-medium transition-colors border-l border-neutral-200 ${
              mode === 'compare'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-neutral-500 hover:bg-neutral-50'
            }`}
          >
            Compare
          </button>
        </div>

        {/* Base version selector (compare mode only) */}
        {mode === 'compare' && versionsWithMatan.length > 1 && (
          <>
            <span className="text-xs text-neutral-400">Base:</span>
            <select
              value={baseId ?? ''}
              onChange={e => setBaseId(e.target.value)}
              className="text-xs border border-neutral-200 rounded-lg px-2 py-1.5 bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              dir="rtl"
              style={{ fontFamily: "'Amiri', serif" }}
            >
              {versionsWithMatan.map(v => (
                <option key={v.id} value={v.id}>
                  {v.source_book}{v.source_reference ? ` (${v.source_reference})` : ''}
                </option>
              ))}
            </select>

            <div className="ml-auto">
              <DiffLegend />
            </div>
          </>
        )}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {versions.map(version => (
          <VersionCard
            key={version.id}
            version={version}
            color={getColor(version.source_book_code)}
            mode={mode}
            baseVersion={baseVersion}
            isBase={version.id === baseId}
          />
        ))}
      </div>
    </div>
  )
}

// ── Version Card ──────────────────────────────────────────────────────────────

interface VersionCardProps {
  version: Version
  color: string
  mode: Mode
  baseVersion: Version | null
  isBase: boolean
}

function VersionCard({ version, color, mode, baseVersion, isBase }: VersionCardProps) {
  const showDiff =
    mode === 'compare' &&
    baseVersion !== null &&
    version.matan_text !== null &&
    baseVersion.matan_text !== null

  return (
    <div className="rounded-lg border border-neutral-200 overflow-hidden shadow-sm">
      {/* Header bar */}
      <div className="px-3 py-2 flex items-center gap-2" style={{ backgroundColor: color }}>
        <p
          className="text-sm font-semibold text-white leading-snug flex-1"
          dir="rtl"
          style={{ fontFamily: "'Amiri', serif" }}
        >
          {version.source_book}
          {version.source_reference && (
            <span className="text-white/70 text-xs mr-1.5">
              ({version.source_reference})
            </span>
          )}
        </p>
        {mode === 'compare' && isBase && (
          <span className="shrink-0 text-xs bg-white/25 text-white rounded px-1.5 py-0.5 font-medium">
            أساس
          </span>
        )}
      </div>

      {/* Body */}
      <div className="bg-white px-3 py-3 space-y-2">
        {/* Intro phrase */}
        {version.matan_intro_phrase && (
          <p
            className="text-xs text-neutral-500 italic leading-relaxed"
            dir="rtl"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            {version.matan_intro_phrase}
          </p>
        )}

        {/* Matan text */}
        {version.matan_text ? (
          <div
            className="text-sm text-neutral-900"
            dir="rtl"
            style={{ lineHeight: '2' }}
          >
            {showDiff ? (
              <MatanDiffView
                baseText={baseVersion!.matan_text!}
                cmpText={version.matan_text}
                perspective={isBase ? 'base' : 'cmp'}
              />
            ) : (
              <p style={{ fontFamily: "'Amiri', serif", lineHeight: '1.8' }}>
                {version.matan_text}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-neutral-400 italic">No matan text.</p>
        )}

        {/* Narrative text */}
        {version.narrative_text && (
          <div className="bg-neutral-50 rounded-md px-3 py-2 border-r-2 border-neutral-300 ml-2">
            <p
              className="text-sm text-neutral-700 leading-relaxed"
              dir="rtl"
              style={{ fontFamily: "'Amiri', serif", lineHeight: '1.8' }}
            >
              {version.narrative_text}
            </p>
          </div>
        )}

        {/* Post-matan commentary */}
        {version.post_matan_commentary && (
          <p
            className="text-xs text-neutral-400 leading-relaxed"
            dir="rtl"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            {version.post_matan_commentary}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function MatanSkeleton() {
  return (
    <div className="p-3 space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="rounded-lg border border-neutral-200 overflow-hidden animate-pulse">
          <div className="h-8 bg-neutral-300" />
          <div className="bg-white p-3 space-y-2">
            <div className="h-3 bg-neutral-100 rounded w-2/3" />
            <div className="h-4 bg-neutral-200 rounded w-full" />
            <div className="h-4 bg-neutral-200 rounded w-5/6" />
            <div className="h-4 bg-neutral-100 rounded w-4/5" />
          </div>
        </div>
      ))}
    </div>
  )
}
