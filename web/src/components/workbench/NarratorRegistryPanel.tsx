'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

interface StudyNarrator {
  id: string
  study_id: string
  narrator_key: string
  canonical_name: string
  name_variants: string[]
  mention_count: number
}

interface NarratorMention {
  id: string
  narrator_name_original: string
  narrator_name_normalized: string
  resolved_narrator_key: string | null
  position: number
}

interface Props {
  studyId: string
}

export default function NarratorRegistryPanel({ studyId }: Props) {
  const [narrators, setNarrators] = useState<StudyNarrator[]>([])
  const [loading, setLoading] = useState(true)
  const [unresolvedCount, setUnresolvedCount] = useState(0)

  // Rename state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [renameSaving, setRenameSaving] = useState(false)

  // Merge state
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set())
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [mergeKeepKey, setMergeKeepKey] = useState<string>('')
  const [mergeSaving, setMergeSaving] = useState(false)

  // Delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Split state
  const [splitNarratorId, setSplitNarratorId] = useState<string | null>(null)
  const [splitMentions, setSplitMentions] = useState<NarratorMention[]>([])
  const [selectedSplitMentions, setSelectedSplitMentions] = useState<Set<string>>(new Set())
  const [splitSaving, setSplitSaving] = useState(false)
  const [loadingSplitMentions, setLoadingSplitMentions] = useState(false)

  const fetchNarrators = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: narratorsData } = await supabase
      .from('study_narrators')
      .select('id, study_id, narrator_key, canonical_name, name_variants')
      .eq('study_id', studyId)
      .order('created_at', { ascending: true })

    if (!narratorsData) {
      setLoading(false)
      return
    }

    // Count mentions per narrator
    const { data: mentionsData } = await supabase
      .from('narrator_mentions')
      .select('resolved_narrator_key')
      .in(
        'version_id',
        (
          await supabase
            .from('versions')
            .select('id')
            .eq('study_id', studyId)
        ).data?.map(v => v.id) ?? []
      )

    const mentionCounts: Record<string, number> = {}
    for (const m of (mentionsData ?? []) as { resolved_narrator_key: string | null }[]) {
      if (m.resolved_narrator_key) {
        mentionCounts[m.resolved_narrator_key] = (mentionCounts[m.resolved_narrator_key] ?? 0) + 1
      }
    }

    setNarrators(
      narratorsData.map(n => ({
        ...n,
        mention_count: mentionCounts[n.narrator_key] ?? 0,
      })) as StudyNarrator[]
    )

    // Count unresolved mentions
    const unresolvedMentions = (mentionsData ?? []).filter(
      (m: { resolved_narrator_key: string | null }) => m.resolved_narrator_key === null
    )
    setUnresolvedCount(unresolvedMentions.length)

    setLoading(false)
  }, [studyId])

  useEffect(() => {
    fetchNarrators()
  }, [fetchNarrators])

  // ── Rename ────────────────────────────────────────────────────────────────

  const startRename = (narrator: StudyNarrator) => {
    setEditingId(narrator.id)
    setEditingName(narrator.canonical_name)
  }

  const saveRename = async (narratorId: string) => {
    if (!editingName.trim()) return
    setRenameSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('study_narrators')
      .update({ canonical_name: editingName.trim() })
      .eq('id', narratorId)

    if (!error) {
      setNarrators(prev =>
        prev.map(n => (n.id === narratorId ? { ...n, canonical_name: editingName.trim() } : n))
      )
    }
    setEditingId(null)
    setRenameSaving(false)
  }

  // ── Merge ─────────────────────────────────────────────────────────────────

  const toggleMergeSelect = (narratorId: string) => {
    setSelectedForMerge(prev => {
      const next = new Set(prev)
      if (next.has(narratorId)) {
        next.delete(narratorId)
      } else {
        next.add(narratorId)
      }
      return next
    })
  }

  const openMergeModal = () => {
    const [firstId] = selectedForMerge
    const first = narrators.find(n => n.id === firstId)
    setMergeKeepKey(first?.narrator_key ?? '')
    setShowMergeModal(true)
  }

  const executeMerge = async () => {
    if (selectedForMerge.size < 2 || !mergeKeepKey) return
    setMergeSaving(true)

    const supabase = createClient()
    const selectedNarrators = narrators.filter(n => selectedForMerge.has(n.id))
    const keepNarrator = selectedNarrators.find(n => n.narrator_key === mergeKeepKey)
    const toDeleteNarrators = selectedNarrators.filter(n => n.narrator_key !== mergeKeepKey)

    if (!keepNarrator) {
      setMergeSaving(false)
      return
    }

    // Merge all name_variants
    const allVariants = Array.from(
      new Set([
        ...keepNarrator.name_variants,
        ...toDeleteNarrators.flatMap(n => n.name_variants),
      ])
    )

    // Update narrator_mentions to point to the kept narrator
    for (const toDelete of toDeleteNarrators) {
      await supabase
        .from('narrator_mentions')
        .update({ resolved_narrator_key: mergeKeepKey })
        .eq('resolved_narrator_key', toDelete.narrator_key)
    }

    // Update the kept narrator's variants
    await supabase
      .from('study_narrators')
      .update({ name_variants: allVariants })
      .eq('id', keepNarrator.id)

    // Delete the merged narrators
    for (const toDelete of toDeleteNarrators) {
      await supabase.from('study_narrators').delete().eq('id', toDelete.id)
    }

    setSelectedForMerge(new Set())
    setShowMergeModal(false)
    setMergeSaving(false)
    fetchNarrators()
  }

  // ── Split ─────────────────────────────────────────────────────────────────

  const openSplitModal = async (narratorId: string) => {
    setSplitNarratorId(narratorId)
    setSelectedSplitMentions(new Set())
    setLoadingSplitMentions(true)

    const narrator = narrators.find(n => n.id === narratorId)
    if (!narrator) return

    const supabase = createClient()

    // Get version IDs for this study
    const { data: versionData } = await supabase
      .from('versions')
      .select('id')
      .eq('study_id', studyId)

    const versionIds = (versionData ?? []).map(v => v.id)

    if (versionIds.length === 0) {
      setSplitMentions([])
      setLoadingSplitMentions(false)
      return
    }

    const { data: mentions } = await supabase
      .from('narrator_mentions')
      .select('id, narrator_name_original, narrator_name_normalized, resolved_narrator_key, position')
      .eq('resolved_narrator_key', narrator.narrator_key)
      .in('version_id', versionIds)
      .order('position', { ascending: true })

    setSplitMentions((mentions ?? []) as NarratorMention[])
    setLoadingSplitMentions(false)
  }

  const toggleSplitMention = (mentionId: string) => {
    setSelectedSplitMentions(prev => {
      const next = new Set(prev)
      if (next.has(mentionId)) {
        next.delete(mentionId)
      } else {
        next.add(mentionId)
      }
      return next
    })
  }

  const executeSplit = async () => {
    if (!splitNarratorId || selectedSplitMentions.size === 0) return
    setSplitSaving(true)

    const supabase = createClient()
    const splitNarrator = narrators.find(n => n.id === splitNarratorId)
    if (!splitNarrator) return

    // Get next narrator key
    const { data: allNarrators } = await supabase
      .from('study_narrators')
      .select('narrator_key')
      .eq('study_id', studyId)

    const existingKeys = (allNarrators ?? []).map(n => n.narrator_key)
    let nextNum = existingKeys.length + 1
    while (existingKeys.includes(`narrator_${nextNum}`)) nextNum++
    const newKey = `narrator_${nextNum}`

    // Find the first selected mention to use as canonical name
    const firstSelected = splitMentions.find(m => selectedSplitMentions.has(m.id))
    const newCanonicalName = firstSelected?.narrator_name_original ?? splitNarrator.canonical_name

    // Create new study_narrator
    await supabase.from('study_narrators').insert({
      study_id: studyId,
      narrator_key: newKey,
      canonical_name: newCanonicalName,
      name_variants: [],
    })

    // Reassign selected mentions to new narrator
    const selectedIds = Array.from(selectedSplitMentions)
    await supabase
      .from('narrator_mentions')
      .update({ resolved_narrator_key: newKey })
      .in('id', selectedIds)

    setSplitNarratorId(null)
    setSplitMentions([])
    setSelectedSplitMentions(new Set())
    setSplitSaving(false)
    fetchNarrators()
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  const executeDelete = async (narratorId: string) => {
    setDeletingId(narratorId)
    const narrator = narrators.find(n => n.id === narratorId)
    if (!narrator) { setDeletingId(null); return }

    const supabase = createClient()

    // Unlink all narrator_mentions pointing to this key
    await supabase
      .from('narrator_mentions')
      .update({ resolved_narrator_key: null, match_method: null })
      .eq('resolved_narrator_key', narrator.narrator_key)

    // Delete the study_narrator row
    await supabase.from('study_narrators').delete().eq('id', narratorId)

    setDeletingId(null)
    setConfirmDeleteId(null)
    fetchNarrators()
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 bg-neutral-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  const mergeEnabled = selectedForMerge.size >= 2

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
            Narrator Registry
          </span>
          <div className="flex items-center gap-2">
            {unresolvedCount > 0 && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">
                {unresolvedCount} unresolved
              </span>
            )}
            <span className="text-xs text-neutral-400">
              {narrators.length} narrators
            </span>
          </div>
        </div>

        {mergeEnabled && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-neutral-500">
              {selectedForMerge.size} selected
            </span>
            <button
              onClick={openMergeModal}
              className="px-3 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Merge
            </button>
            <button
              onClick={() => setSelectedForMerge(new Set())}
              className="px-3 py-1 text-xs bg-neutral-200 hover:bg-neutral-300 text-neutral-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {narrators.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-neutral-400">
              No narrators yet. Add versions to build the registry.
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {narrators.map(narrator => (
              <NarratorCard
                key={narrator.id}
                narrator={narrator}
                isEditingName={editingId === narrator.id}
                editingName={editingName}
                renameSaving={renameSaving}
                isSelectedForMerge={selectedForMerge.has(narrator.id)}
                isDeleting={deletingId === narrator.id}
                onStartRename={() => startRename(narrator)}
                onRenameChange={setEditingName}
                onSaveRename={() => saveRename(narrator.id)}
                onCancelRename={() => setEditingId(null)}
                onToggleMerge={() => toggleMergeSelect(narrator.id)}
                onSplit={() => openSplitModal(narrator.id)}
                onDelete={() => setConfirmDeleteId(narrator.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Merge modal */}
      {showMergeModal && (
        <MergeModal
          selectedNarrators={narrators.filter(n => selectedForMerge.has(n.id))}
          keepKey={mergeKeepKey}
          onKeepKeyChange={setMergeKeepKey}
          onConfirm={executeMerge}
          onCancel={() => setShowMergeModal(false)}
          saving={mergeSaving}
        />
      )}

      {/* Split modal */}
      {splitNarratorId && (
        <SplitModal
          narrator={narrators.find(n => n.id === splitNarratorId) ?? null}
          mentions={splitMentions}
          loading={loadingSplitMentions}
          selected={selectedSplitMentions}
          onToggle={toggleSplitMention}
          onConfirm={executeSplit}
          onCancel={() => {
            setSplitNarratorId(null)
            setSplitMentions([])
            setSelectedSplitMentions(new Set())
          }}
          saving={splitSaving}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Delete narrator"
        message={(() => {
          const n = narrators.find(x => x.id === confirmDeleteId)
          const count = n?.mention_count ?? 0
          return count > 0
            ? `This will delete "${n?.canonical_name}" and unlink ${count} mention${count !== 1 ? 's' : ''}. Those mentions will appear as unresolved.`
            : `Delete "${n?.canonical_name}" from the registry?`
        })()}
        confirmLabel="Delete"
        onConfirm={() => { if (confirmDeleteId) executeDelete(confirmDeleteId) }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  )
}

// ── Narrator Card ──────────────────────────────────────────────────────────────

interface NarratorCardProps {
  narrator: StudyNarrator
  isEditingName: boolean
  editingName: string
  renameSaving: boolean
  isSelectedForMerge: boolean
  isDeleting: boolean
  onStartRename: () => void
  onRenameChange: (v: string) => void
  onSaveRename: () => void
  onCancelRename: () => void
  onToggleMerge: () => void
  onSplit: () => void
  onDelete: () => void
}

function NarratorCard({
  narrator,
  isEditingName,
  editingName,
  renameSaving,
  isSelectedForMerge,
  isDeleting,
  onStartRename,
  onRenameChange,
  onSaveRename,
  onCancelRename,
  onToggleMerge,
  onSplit,
  onDelete,
}: NarratorCardProps) {
  return (
    <div
      className={`group bg-white border rounded-lg p-3 transition-colors ${
        isSelectedForMerge ? 'border-purple-400 bg-purple-50' : 'border-neutral-200 hover:border-neutral-300'
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Merge checkbox */}
        <input
          type="checkbox"
          checked={isSelectedForMerge}
          onChange={onToggleMerge}
          className="mt-1 rounded border-neutral-300 text-purple-600 focus:ring-purple-500 shrink-0"
          title="Select for merge"
        />

        <div className="flex-1 min-w-0">
          {/* Canonical name */}
          {isEditingName ? (
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={editingName}
                onChange={e => onRenameChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') onSaveRename()
                  if (e.key === 'Escape') onCancelRename()
                }}
                autoFocus
                dir="rtl"
                className="flex-1 px-2 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                style={{ fontFamily: "'Amiri', serif" }}
              />
              <button
                onClick={onSaveRename}
                disabled={renameSaving}
                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {renameSaving ? '…' : 'Save'}
              </button>
              <button
                onClick={onCancelRename}
                className="px-2 py-1 text-xs bg-neutral-200 text-neutral-700 rounded hover:bg-neutral-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={onStartRename}
              className="text-sm font-medium text-neutral-800 hover:text-blue-600 transition-colors text-right block w-full mb-1.5"
              dir="rtl"
              style={{ fontFamily: "'Amiri', serif" }}
              title="Click to rename"
            >
              {narrator.canonical_name}
            </button>
          )}

          {/* Name variants as chips */}
          {narrator.name_variants.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-1.5" dir="rtl">
              {narrator.name_variants.map((variant, i) => (
                <span
                  key={i}
                  className="inline-block text-xs bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full"
                  style={{ fontFamily: "'Amiri', serif" }}
                >
                  {variant}
                </span>
              ))}
            </div>
          )}

          {/* Footer: mention count + actions */}
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-neutral-400">
              {narrator.mention_count} mention{narrator.mention_count !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={onSplit}
                className="text-xs text-neutral-400 hover:text-orange-600 transition-colors px-2 py-0.5 rounded hover:bg-orange-50"
                title="Split narrator"
              >
                Split
              </button>
              {isDeleting ? (
                <div className="w-6 h-6 flex items-center justify-center">
                  <div className="w-3 h-3 border border-neutral-300 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <button
                  onClick={onDelete}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 text-neutral-300 hover:text-red-500 transition-all"
                  title="Delete narrator"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Merge Modal ───────────────────────────────────────────────────────────────

interface MergeModalProps {
  selectedNarrators: StudyNarrator[]
  keepKey: string
  onKeepKeyChange: (key: string) => void
  onConfirm: () => void
  onCancel: () => void
  saving: boolean
}

function MergeModal({ selectedNarrators, keepKey, onKeepKeyChange, onConfirm, onCancel, saving }: MergeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-base font-semibold text-neutral-900">Merge Narrators</h3>
        <p className="text-sm text-neutral-500">
          All mentions will be reassigned to the kept narrator. Choose which canonical name to keep:
        </p>
        <div className="space-y-2">
          {selectedNarrators.map(n => (
            <label key={n.id} className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="mergeKeep"
                value={n.narrator_key}
                checked={keepKey === n.narrator_key}
                onChange={() => onKeepKeyChange(n.narrator_key)}
                className="text-purple-600 focus:ring-purple-500"
              />
              <span
                className="text-sm text-neutral-800"
                dir="rtl"
                style={{ fontFamily: "'Amiri', serif" }}
              >
                {n.canonical_name}
              </span>
              <span className="text-xs text-neutral-400">({n.mention_count} mentions)</span>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving || !keepKey}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-neutral-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Merging…' : 'Merge'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Split Modal ───────────────────────────────────────────────────────────────

interface SplitModalProps {
  narrator: StudyNarrator | null
  mentions: NarratorMention[]
  loading: boolean
  selected: Set<string>
  onToggle: (id: string) => void
  onConfirm: () => void
  onCancel: () => void
  saving: boolean
}

function SplitModal({ narrator, mentions, loading, selected, onToggle, onConfirm, onCancel, saving }: SplitModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="px-6 py-4 border-b border-neutral-200">
          <h3 className="text-base font-semibold text-neutral-900">Split Narrator</h3>
          {narrator && (
            <p
              className="text-sm text-neutral-500 mt-0.5"
              dir="rtl"
              style={{ fontFamily: "'Amiri', serif" }}
            >
              {narrator.canonical_name}
            </p>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-neutral-500 mb-3">
            Select the mentions to move to a new narrator entry:
          </p>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-neutral-100 rounded animate-pulse" />
              ))}
            </div>
          ) : mentions.length === 0 ? (
            <p className="text-sm text-neutral-400 italic">No mentions found.</p>
          ) : (
            <div className="space-y-1.5">
              {mentions.map(m => (
                <label key={m.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-neutral-50">
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
                    onChange={() => onToggle(m.id)}
                    className="rounded border-neutral-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span
                    className="text-sm text-neutral-800"
                    dir="rtl"
                    style={{ fontFamily: "'Amiri', serif" }}
                  >
                    {m.narrator_name_original}
                  </span>
                  <span className="text-xs text-neutral-400 ml-auto">pos. {m.position + 1}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving || selected.size === 0}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-neutral-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? 'Splitting…' : `Split ${selected.size > 0 ? `(${selected.size})` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
