'use client'

import { useState, useEffect, useCallback, type MutableRefObject } from 'react'
import { createClient } from '@/lib/supabase/client'
import AddVersionModal from './AddVersionModal'
import UpgradeModal from './UpgradeModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { canAddVersion } from '@/lib/freemium'

interface Version {
  id: string
  source_book: string
  source_book_code: string | null
  source_reference: string | null
  matan_text: string | null
  boundary_confidence: number | null
  created_at: string
  narrator_count: number
}

interface BookColor {
  book_code: string
  color_hex: string
}

interface Props {
  studyId: string
  onVersionSaved?: () => void
  onAddRef?: MutableRefObject<(() => void) | null>
}

export default function VersionPanel({ studyId, onVersionSaved, onAddRef }: Props) {
  const [versions, setVersions] = useState<Version[]>([])
  const [bookColors, setBookColors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const isPro = false // deferred Stripe integration

  const fetchVersions = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('versions')
      .select(`
        id,
        source_book,
        source_book_code,
        source_reference,
        matan_text,
        boundary_confidence,
        created_at,
        narrator_mentions(count)
      `)
      .eq('study_id', studyId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (!error && data) {
      setVersions(
        data.map(v => ({
          id: v.id,
          source_book: v.source_book,
          source_book_code: v.source_book_code,
          source_reference: v.source_reference,
          matan_text: v.matan_text,
          boundary_confidence: v.boundary_confidence,
          created_at: v.created_at,
          narrator_count: Array.isArray(v.narrator_mentions)
            ? (v.narrator_mentions[0] as { count: number } | undefined)?.count ?? 0
            : 0,
        }))
      )
    }
    setLoading(false)
  }, [studyId])

  const fetchBookColors = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('source_book_colors')
      .select('book_code, color_hex')

    if (data) {
      const colorMap: Record<string, string> = {}
      for (const row of data as BookColor[]) {
        colorMap[row.book_code] = row.color_hex
      }
      setBookColors(colorMap)
    }
  }, [])

  useEffect(() => {
    fetchVersions()
    fetchBookColors()
  }, [fetchVersions, fetchBookColors])

  const handleAddClick = useCallback(() => {
    if (!canAddVersion(versions.length, isPro)) {
      setShowUpgrade(true)
    } else {
      setShowModal(true)
    }
  }, [versions.length, isPro])

  // Expose handleAddClick to keyboard shortcut handler
  useEffect(() => {
    if (onAddRef) {
      onAddRef.current = handleAddClick
    }
  }, [onAddRef, handleAddClick])

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    const supabase = createClient()
    const { error } = await supabase.from('versions').delete().eq('id', id)
    if (!error) {
      setVersions(prev => prev.filter(v => v.id !== id))
    }
    setDeletingId(null)
    setConfirmDeleteId(null)
  }

  const getColor = (bookCode: string | null): string => {
    if (!bookCode) return '#6B7280'
    return bookColors[bookCode] ?? '#6B7280'
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50 shrink-0 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          Versions
        </h2>
        <button
          onClick={handleAddClick}
          className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-white"
          title="Add version"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <VersionSkeleton />
        ) : versions.length === 0 ? (
          <EmptyState onAdd={handleAddClick} />
        ) : (
          <div className="p-3 space-y-2">
            {versions.map(version => (
              <VersionCard
                key={version.id}
                version={version}
                color={getColor(version.source_book_code)}
                isDeleting={deletingId === version.id}
                onDeleteClick={() => setConfirmDeleteId(version.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Version Modal */}
      {showModal && (
        <AddVersionModal
          studyId={studyId}
          onSaved={() => {
            fetchVersions()
            onVersionSaved?.()
          }}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgrade}
        featureDescription="Free tier allows up to 5 versions per study. Upgrade to Pro for unlimited versions."
        onClose={() => setShowUpgrade(false)}
      />

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete version"
        message="This will permanently delete this version and all its narrator data. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { if (confirmDeleteId) handleDelete(confirmDeleteId) }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}

// ── Version Card ──────────────────────────────────────────────────────────────

interface VersionCardProps {
  version: Version
  color: string
  isDeleting: boolean
  onDeleteClick: () => void
}

function VersionCard({
  version,
  color,
  isDeleting,
  onDeleteClick,
}: VersionCardProps) {
  const matnPreview = version.matan_text
    ? version.matan_text.slice(0, 50) + (version.matan_text.length > 50 ? '…' : '')
    : null

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-3 hover:border-neutral-300 hover:shadow-sm transition-all group">
      <div className="flex items-start gap-2.5">
        {/* Color dot */}
        <div
          className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
          style={{ backgroundColor: color }}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Book name */}
          <div
            className="text-sm font-medium text-neutral-800 truncate"
            dir="rtl"
            style={{ fontFamily: "'Amiri', serif" }}
          >
            {version.source_book}
            {version.source_reference && (
              <span className="text-neutral-400 text-xs mr-1">
                ({version.source_reference})
              </span>
            )}
          </div>

          {/* Narrator count badge */}
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1 text-xs text-neutral-500 bg-neutral-100 rounded-full px-2 py-0.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
              {version.narrator_count} narrator{version.narrator_count !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Matan preview */}
          {matnPreview && (
            <p
              className="text-xs text-neutral-500 mt-1.5 leading-relaxed line-clamp-2"
              dir="rtl"
              style={{ fontFamily: "'Amiri', serif", lineHeight: '1.7' }}
            >
              {matnPreview}
            </p>
          )}
        </div>

        {/* Delete button */}
        <div className="shrink-0">
          {isDeleting ? (
            <div className="w-7 h-7 flex items-center justify-center">
              <div className="w-3 h-3 border border-neutral-300 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <button
              onClick={onDeleteClick}
              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-all"
              title="Delete version"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center h-full">
      <div className="w-10 h-10 bg-neutral-100 rounded-full flex items-center justify-center mb-3">
        <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
        </svg>
      </div>
      <p className="text-xs text-neutral-500 leading-relaxed mb-3">
        No versions yet.<br />
        Click &lsquo;Add&rsquo; to paste your first ḥadīth.
      </p>
      <button
        onClick={onAdd}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
      >
        Add version
      </button>
    </div>
  )
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function VersionSkeleton() {
  return (
    <div className="p-3 space-y-2">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white border border-neutral-200 rounded-lg p-3 animate-pulse">
          <div className="flex items-start gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-200 shrink-0 mt-1" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-neutral-200 rounded w-3/4" />
              <div className="h-3 bg-neutral-100 rounded w-1/3" />
              <div className="h-3 bg-neutral-100 rounded w-full" />
              <div className="h-3 bg-neutral-100 rounded w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
