'use client'

import { useState, useCallback, useEffect } from 'react'
import { parseHadith } from '@/lib/parser'
import type { NarratorMention } from '@/lib/parser'
import { createClient } from '@/lib/supabase/client'
import { findBestMatch } from '@/lib/matching/fuzzyMatch'
import type { StudyNarratorRow } from '@/lib/narrator/registry'

const SOURCE_BOOKS = [
  { code: 'BK', name: 'صحيح البخاري', nameEn: 'Sahih al-Bukhari' },
  { code: 'SM', name: 'صحيح مسلم', nameEn: 'Sahih Muslim' },
  { code: 'SAD', name: 'سنن أبي داود', nameEn: 'Sunan Abi Dawud' },
  { code: 'JT', name: 'جامع الترمذي', nameEn: 'Jami al-Tirmidhi' },
  { code: 'SN', name: 'سنن النسائي', nameEn: 'Sunan al-Nasai' },
  { code: 'SIM', name: 'سنن ابن ماجه', nameEn: 'Sunan Ibn Majah' },
  { code: 'MA', name: 'مسند أحمد', nameEn: 'Musnad Ahmad' },
  { code: 'MW', name: 'موطأ مالك', nameEn: 'Muwatta Malik' },
  { code: 'DM', name: 'سنن الدارمي', nameEn: 'Sunan al-Darimi' },
  { code: 'HK', name: 'المستدرك', nameEn: 'Mustadrak al-Hakim' },
  { code: 'MKT', name: 'المعجم الكبير', nameEn: "Mu'jam al-Kabir" },
  { code: 'IH', name: 'صحيح ابن حبان', nameEn: 'Sahih Ibn Hibban' },
  { code: 'OTHER', name: 'Other', nameEn: 'Other (custom)' },
]

const TRANSMISSION_MODES = ['سماع', 'إخبار', 'عنعنة', 'قال', 'إنباء']

interface EditableNarrator extends NarratorMention {
  id: string // local UUID for list key
}

// Parsed result for one chain (single or one slot in multi-mode)
interface ChainResult {
  hadithText: string
  isnadText: string
  matanText: string
  boundaryType: string
  confidence: number
  introPhrase: string | null
  narrativeText: string | null
  postMatanCommentary: string | null
  narrators: EditableNarrator[]
}

interface Props {
  studyId: string
  onSaved: () => void
  onClose: () => void
}

type View = 'input' | 'result' | 'linking'

const MAX_MULTI_CHAINS = 3

// ── Linking view types ─────────────────────────────────────────────────────────

interface SavedMention {
  id: string
  narrator_name_original: string
  narrator_name_normalized: string
}

interface LinkingDecision {
  mentionId: string
  narratorNameOriginal: string
  narratorNameNormalized: string
  // 'new' | narrator_key of existing narrator
  decision: string
  // populated when decision is a narrator_key
  canonicalName?: string
  matchType: 'auto_exact' | 'auto_fuzzy' | 'new' | 'previously_resolved'
  fuzzyScore?: number
  isPreviouslyResolved?: boolean
}

export default function AddVersionModal({ studyId, onSaved, onClose }: Props) {
  const [view, setView] = useState<View>('input')

  // Input view state
  const [selectedBookCode, setSelectedBookCode] = useState('BK')
  const [customBookName, setCustomBookName] = useState('')
  const [customBookCode, setCustomBookCode] = useState('')
  const [customBookAuthor, setCustomBookAuthor] = useState('')
  const [sourceReference, setSourceReference] = useState('')
  // Single-mode text
  const [hadithText, setHadithText] = useState('')
  // Multi-mode
  const [multiMode, setMultiMode] = useState(false)
  const [chainTexts, setChainTexts] = useState<string[]>(['', '', ''])

  // Result state — array so multi-mode chains each have their own slot
  const [chainResults, setChainResults] = useState<ChainResult[]>([])
  const [activeChainIdx, setActiveChainIdx] = useState(0)
  const [parseError, setParseError] = useState<string | null>(null)

  // Derived from active chain
  const activeChain = chainResults[activeChainIdx]
  const isnadText    = activeChain?.isnadText ?? ''
  const matanText    = activeChain?.matanText ?? ''
  const confidence   = activeChain?.confidence ?? 1
  const narrators    = activeChain?.narrators ?? []

  // Helpers to update the active chain's narrators
  const setNarrators = (updater: EditableNarrator[] | ((prev: EditableNarrator[]) => EditableNarrator[])) => {
    setChainResults(prev => prev.map((c, i) => {
      if (i !== activeChainIdx) return c
      const next = typeof updater === 'function' ? updater(c.narrators) : updater
      return { ...c, narrators: next }
    }))
  }

  // Save state
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Inline editing state
  const [editingNameId, setEditingNameId] = useState<string | null>(null)

  // Linking view state
  const [linkingDecisions, setLinkingDecisions] = useState<LinkingDecision[]>([])
  const [existingStudyNarrators, setExistingStudyNarrators] = useState<StudyNarratorRow[]>([])
  const [savedMentions, setSavedMentions] = useState<SavedMention[]>([])
  const [savedVersionId, setSavedVersionId] = useState<string | null>(null)
  const [loadingLinking, setLoadingLinking] = useState(false)

  // User-saved custom books
  const [customBooks, setCustomBooks] = useState<{ name: string; code: string; author: string | null }[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase.from('custom_source_books').select('name, code, author').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setCustomBooks(data) })
  }, [])

  const selectedBook = SOURCE_BOOKS.find(b => b.code === selectedBookCode)
  const selectedCustomBook = customBooks.find(b => b.code === selectedBookCode)
  const isOther = selectedBookCode === 'OTHER'

  const parseOneChain = (text: string, chainIdx: number): ChainResult => {
    const result = parseHadith(text)
    return {
      hadithText: text,
      isnadText: result.boundary.isnadText,
      matanText: result.boundary.matanText,
      boundaryType: result.boundary.boundaryType,
      confidence: result.boundary.confidence,
      introPhrase: result.boundary.introPhrase ?? null,
      narrativeText: result.boundary.narrativeText ?? null,
      postMatanCommentary: result.boundary.postMatanCommentary ?? null,
      narrators: result.narrators.map((n, i) => ({
        ...n,
        id: `narrator-${chainIdx}-${i}-${Date.now()}`,
      })),
    }
  }

  const handleParse = useCallback(() => {
    if (!hadithText.trim()) return
    setParseError(null)
    try {
      setChainResults([parseOneChain(hadithText, 0)])
      setActiveChainIdx(0)
      setView('result')
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Could not parse this text. Please check the input.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hadithText])

  const handleParseMulti = useCallback(() => {
    const nonEmpty = chainTexts.map((t, i) => ({ text: t.trim(), idx: i })).filter(c => c.text)
    if (nonEmpty.length === 0) return
    setParseError(null)
    try {
      const results = nonEmpty.map(({ text, idx }) => parseOneChain(text, idx))
      setChainResults(results)
      setActiveChainIdx(0)
      setView('result')
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Could not parse one of the chains. Please check the input.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainTexts])

  // Save one chain to DB, return inserted non-Prophet mentions
  const saveOneChain = async (
    supabase: ReturnType<typeof createClient>,
    chain: ChainResult,
    bookCode: string,
    bookName: string,
    bookAuthor: string,
  ): Promise<{ mentions: SavedMention[]; error: string | null }> => {
    const { data: version, error: versionError } = await supabase
      .from('versions')
      .insert({
        study_id: studyId,
        source_book: bookName,
        source_book_code: bookCode || null,
        source_book_author: bookAuthor || null,
        source_reference: sourceReference || null,
        raw_text: chain.hadithText,
        isnad_text: chain.isnadText || null,
        matan_text: chain.matanText || null,
        matan_intro_phrase: chain.introPhrase || null,
        narrative_text: chain.narrativeText || null,
        post_matan_commentary: chain.postMatanCommentary || null,
        boundary_type: chain.boundaryType || null,
        boundary_confidence: chain.confidence,
      })
      .select()
      .single()

    if (versionError || !version) {
      return { mentions: [], error: versionError?.message ?? 'Failed to save version.' }
    }

    if (chain.narrators.length === 0) return { mentions: [], error: null }

    const { data: mentionsData, error: mentionsError } = await supabase
      .from('narrator_mentions')
      .insert(chain.narrators.map(n => ({
        version_id: version.id,
        position: n.position,
        narrator_name_original: n.narratorName,
        narrator_name_normalized: n.narratorNameNormalized,
        transmission_phrase: n.transmissionPhrase || null,
        transmission_mode: n.transmissionMode || null,
        transmission_strength: n.transmissionStrength || null,
        has_clarification: n.hasClarification,
        editorial_note: n.editorialNote || null,
        is_parallel: (n.parallelNarrators?.length ?? 0) > 0,
        parallel_names: n.parallelNarrators ?? null,
      })))
      .select('id, narrator_name_original, narrator_name_normalized')

    if (mentionsError) return { mentions: [], error: mentionsError.message }

    const allMentions = (mentionsData ?? []) as SavedMention[]
    const prophetMentions = allMentions.filter(m => m.narrator_name_normalized === 'النبي')
    if (prophetMentions.length > 0) {
      await supabase
        .from('narrator_mentions')
        .update({ resolved_narrator_key: '__prophet__', match_method: 'auto_exact' })
        .in('id', prophetMentions.map(m => m.id))
    }
    return { mentions: allMentions.filter(m => m.narrator_name_normalized !== 'النبي'), error: null }
  }

  // Save version + mentions, then decide whether to show linking view
  const handleSaveToDb = useCallback(async () => {
    setSaving(true)
    setSaveError(null)

    const supabase = createClient()
    const bookCode   = isOther ? customBookCode   : selectedBookCode
    const bookName   = isOther ? customBookName   : (selectedBook?.name ?? selectedCustomBook?.name ?? selectedBookCode)
    const bookAuthor = isOther ? customBookAuthor : (selectedCustomBook?.author ?? '')

    // Persist new custom book for future re-use
    if (isOther && customBookCode && customBookName) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('custom_source_books').upsert(
          { user_id: user.id, code: customBookCode, name: customBookName, author: customBookAuthor || null },
          { onConflict: 'user_id,code' }
        )
      }
      setCustomBooks(prev => {
        const existing = prev.findIndex(b => b.code === customBookCode)
        const entry = { name: customBookName, code: customBookCode, author: customBookAuthor || null }
        if (existing !== -1) {
          const next = [...prev]; next[existing] = entry; return next
        }
        return [entry, ...prev]
      })
    }

    // Save all chains (1 in single mode, up to 3 in multi mode)
    let allInsertedMentions: SavedMention[] = []
    for (const chain of chainResults) {
      const { mentions, error } = await saveOneChain(supabase, chain, bookCode, bookName, bookAuthor)
      if (error) {
        setSaveError(error)
        setSaving(false)
        return
      }
      allInsertedMentions = [...allInsertedMentions, ...mentions]
    }
    const insertedMentions = allInsertedMentions

    setSaving(false)

    if (insertedMentions.length === 0) {
      onSaved()
      onClose()
      return
    }

    // Check if there are existing study_narrators
    const { data: existingNarrators } = await supabase
      .from('study_narrators')
      .select('*')
      .eq('study_id', studyId)

    const existing = (existingNarrators ?? []) as StudyNarratorRow[]

    if (existing.length === 0) {
      // First version — auto-create all narrators without linking view
      await autoCreateNarrators(supabase, studyId, insertedMentions)
      onSaved()
      onClose()
      return
    }

    // There are existing narrators — show linking view
    setExistingStudyNarrators(existing)
    setSavedMentions(insertedMentions)
    setSavedVersionId(null) // multi-chain: no single version id

    // Build initial decisions using fuzzy matching + cross-study resolutions
    await buildLinkingDecisions(supabase, studyId, insertedMentions, existing)
  }, [
    studyId,
    isOther,
    customBookCode,
    customBookName,
    customBookAuthor,
    selectedBookCode,
    selectedBook,
    selectedCustomBook,
    sourceReference,
    chainResults,
    onSaved,
    onClose,
  ])

  const buildLinkingDecisions = async (
    supabase: ReturnType<typeof createClient>,
    studyId: string,
    mentions: SavedMention[],
    existing: StudyNarratorRow[]
  ) => {
    setLoadingLinking(true)

    // Get user for cross-study resolution lookup
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id

    // Fetch narrator_resolutions for these normalized names
    const normalizedNames = mentions.map(m => m.narrator_name_normalized)
    let resolutionMap: Record<string, string> = {}

    if (userId && normalizedNames.length > 0) {
      const { data: resolutions } = await supabase
        .from('narrator_resolutions')
        .select('narrator_text_normalized, resolved_canonical_name')
        .eq('user_id', userId)
        .in('narrator_text_normalized', normalizedNames)

      if (resolutions) {
        for (const r of resolutions as { narrator_text_normalized: string; resolved_canonical_name: string }[]) {
          resolutionMap[r.narrator_text_normalized] = r.resolved_canonical_name
        }
      }
    }

    const decisions: LinkingDecision[] = mentions.map(mention => {
      const normalized = mention.narrator_name_normalized

      // Check exact match first
      const exactMatch = existing.find(n => n.name_variants.includes(normalized))
      if (exactMatch) {
        return {
          mentionId: mention.id,
          narratorNameOriginal: mention.narrator_name_original,
          narratorNameNormalized: normalized,
          decision: exactMatch.narrator_key,
          canonicalName: exactMatch.canonical_name,
          matchType: 'auto_exact' as const,
        }
      }

      // Check cross-study resolution
      const previouslyResolved = resolutionMap[normalized]
      if (previouslyResolved) {
        // Find the narrator in existing that matches
        const resolvedNarrator = existing.find(n => n.canonical_name === previouslyResolved)
        if (resolvedNarrator) {
          return {
            mentionId: mention.id,
            narratorNameOriginal: mention.narrator_name_original,
            narratorNameNormalized: normalized,
            decision: resolvedNarrator.narrator_key,
            canonicalName: resolvedNarrator.canonical_name,
            matchType: 'previously_resolved' as const,
            isPreviouslyResolved: true,
          }
        }
      }

      // Try fuzzy match
      const fuzzyResult = findBestMatch(normalized, existing)
      if (fuzzyResult && fuzzyResult.matchType === 'fuzzy') {
        return {
          mentionId: mention.id,
          narratorNameOriginal: mention.narrator_name_original,
          narratorNameNormalized: normalized,
          decision: fuzzyResult.narratorKey,
          canonicalName: fuzzyResult.canonicalName,
          matchType: 'auto_fuzzy' as const,
          fuzzyScore: fuzzyResult.score,
        }
      }

      // Default: create new
      return {
        mentionId: mention.id,
        narratorNameOriginal: mention.narrator_name_original,
        narratorNameNormalized: normalized,
        decision: 'new',
        matchType: 'new' as const,
      }
    })

    setLinkingDecisions(decisions)
    setLoadingLinking(false)
    setView('linking')
  }

  const autoCreateNarrators = async (
    supabase: ReturnType<typeof createClient>,
    studyId: string,
    mentions: SavedMention[]
  ) => {
    let nextNum = 1
    for (const mention of mentions) {
      const narratorKey = `narrator_${nextNum}`
      nextNum++
      const { data: newNarrator } = await supabase
        .from('study_narrators')
        .insert({
          study_id: studyId,
          narrator_key: narratorKey,
          canonical_name: mention.narrator_name_original,
          name_variants: [mention.narrator_name_normalized],
        })
        .select()
        .single()

      if (newNarrator) {
        await supabase
          .from('narrator_mentions')
          .update({ resolved_narrator_key: narratorKey, match_method: 'auto_new' })
          .eq('id', mention.id)
      }
    }
  }

  const handleLinkingSave = useCallback(async () => {
    setSaving(true)
    setSaveError(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id

    // Track updated study_narrators for resolution upsert
    const updatedStudyNarrators = [...existingStudyNarrators]

    // Get current count to assign keys to new narrators
    let nextNum = existingStudyNarrators.length + 1

    for (const decision of linkingDecisions) {
      if (decision.decision === 'new') {
        // Create new study_narrator
        const narratorKey = `narrator_${nextNum}`
        nextNum++

        const { data: newNarrator } = await supabase
          .from('study_narrators')
          .insert({
            study_id: studyId,
            narrator_key: narratorKey,
            canonical_name: decision.narratorNameOriginal,
            name_variants: [decision.narratorNameNormalized],
          })
          .select()
          .single()

        if (newNarrator) {
          updatedStudyNarrators.push(newNarrator as StudyNarratorRow)
          await supabase
            .from('narrator_mentions')
            .update({ resolved_narrator_key: narratorKey, match_method: 'auto_new' })
            .eq('id', decision.mentionId)
        }
      } else {
        // Link to existing narrator
        const matchMethod =
          decision.matchType === 'auto_exact'
            ? 'auto_exact'
            : decision.matchType === 'previously_resolved'
            ? 'auto_exact'
            : 'manual'

        await supabase
          .from('narrator_mentions')
          .update({ resolved_narrator_key: decision.decision, match_method: matchMethod })
          .eq('id', decision.mentionId)

        // Add variant to existing narrator if not present
        const existingNarrator = updatedStudyNarrators.find(n => n.narrator_key === decision.decision)
        if (existingNarrator && !existingNarrator.name_variants.includes(decision.narratorNameNormalized)) {
          const newVariants = [...existingNarrator.name_variants, decision.narratorNameNormalized]
          await supabase
            .from('study_narrators')
            .update({ name_variants: newVariants })
            .eq('id', existingNarrator.id)
          existingNarrator.name_variants = newVariants
        }
      }
    }

    // Task 3.4: Upsert narrator_resolutions for cross-study propagation
    if (userId) {
      for (const decision of linkingDecisions) {
        let resolvedCanonicalName: string | undefined

        if (decision.decision === 'new') {
          resolvedCanonicalName = decision.narratorNameOriginal
        } else {
          const narrator = updatedStudyNarrators.find(n => n.narrator_key === decision.decision)
          resolvedCanonicalName = narrator?.canonical_name
        }

        if (resolvedCanonicalName) {
          await supabase.from('narrator_resolutions').upsert({
            user_id: userId,
            narrator_text_normalized: decision.narratorNameNormalized,
            resolved_canonical_name: resolvedCanonicalName,
            last_used_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,narrator_text_normalized,resolved_canonical_name',
          })
        }
      }
    }

    setSaving(false)
    onSaved()
    onClose()
  }, [linkingDecisions, existingStudyNarrators, studyId, onSaved, onClose])

  const updateDecision = (mentionId: string, narratorKey: string) => {
    setLinkingDecisions(prev =>
      prev.map(d => {
        if (d.mentionId !== mentionId) return d
        if (narratorKey === 'new') {
          return { ...d, decision: 'new', canonicalName: undefined, matchType: 'new' as const }
        }
        const narrator = existingStudyNarrators.find(n => n.narrator_key === narratorKey)
        return {
          ...d,
          decision: narratorKey,
          canonicalName: narrator?.canonical_name,
          matchType: 'auto_fuzzy' as const,
        }
      })
    )
  }

  // Re-compute decisions when linking view mounts (side effect handled inline in buildLinkingDecisions)
  // This useEffect is only needed if we need to do something on view change:
  useEffect(() => {
    // nothing needed here
  }, [view])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 shrink-0">
          <h2 className="text-base font-semibold text-neutral-900">
            {view === 'input' && (multiMode ? 'Add Multiple Chains' : 'Add Ḥadīth Version')}
            {view === 'result' && 'Review Parse Result'}
            {view === 'linking' && 'Link Narrators'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-neutral-100 transition-colors text-neutral-500 hover:text-neutral-700"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {view === 'input' && (
            <InputView
              selectedBookCode={selectedBookCode}
              setSelectedBookCode={setSelectedBookCode}
              customBooks={customBooks}
              customBookName={customBookName}
              setCustomBookName={setCustomBookName}
              customBookCode={customBookCode}
              setCustomBookCode={setCustomBookCode}
              customBookAuthor={customBookAuthor}
              setCustomBookAuthor={setCustomBookAuthor}
              sourceReference={sourceReference}
              setSourceReference={setSourceReference}
              hadithText={hadithText}
              setHadithText={setHadithText}
              parseError={parseError}
              isOther={isOther}
              multiMode={multiMode}
              setMultiMode={setMultiMode}
              chainTexts={chainTexts}
              setChainText={(idx, v) => setChainTexts(prev => prev.map((t, i) => i === idx ? v : t))}
            />
          )}
          {view === 'result' && (
            <>
              {/* Chain tabs — only shown in multi mode */}
              {chainResults.length > 1 && (
                <div className="flex gap-1 px-6 pt-4 pb-0 border-b border-neutral-200">
                  {chainResults.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setActiveChainIdx(i); setEditingNameId(null) }}
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg border transition-colors ${
                        i === activeChainIdx
                          ? 'bg-white border-neutral-200 border-b-white text-blue-700 -mb-px'
                          : 'bg-neutral-50 border-transparent text-neutral-500 hover:text-neutral-700'
                      }`}
                    >
                      Chain {i + 1}
                    </button>
                  ))}
                </div>
              )}
              <ResultView
                isnadText={isnadText}
                matanText={matanText}
                confidence={confidence}
                narrators={narrators}
                editingNameId={editingNameId}
                setEditingNameId={setEditingNameId}
                updateNarratorName={(id, name) =>
                  setNarrators(prev =>
                    prev.map(n =>
                      n.id === id
                        ? { ...n, narratorName: name, narratorNameNormalized: name }
                        : n
                    )
                  )
                }
                updateNarratorMode={(id, mode) =>
                  setNarrators(prev =>
                    prev.map(n => (n.id === id ? { ...n, transmissionMode: mode } : n))
                  )
                }
                deleteNarrator={(id) =>
                  setNarrators(prev => {
                    const next = prev.filter(n => n.id !== id)
                    return next.map((n, i) => ({ ...n, position: i }))
                  })
                }
                addNarratorAt={(afterIndex) => {
                  const newNarrator: EditableNarrator = {
                    id: `narrator-new-${Date.now()}`,
                    transmissionPhrase: 'عن',
                    transmissionMode: 'عنعنة',
                    transmissionStrength: 'ambiguous',
                    narratorName: '',
                    narratorNameNormalized: '',
                    hasClarification: false,
                    position: afterIndex + 1,
                  }
                  setNarrators(prev => {
                    const next = [
                      ...prev.slice(0, afterIndex + 1),
                      newNarrator,
                      ...prev.slice(afterIndex + 1),
                    ]
                    return next.map((n, i) => ({ ...n, position: i }))
                  })
                  setEditingNameId(newNarrator.id)
                }}
                moveNarrator={(id, direction) =>
                  setNarrators(prev => {
                    const idx = prev.findIndex(n => n.id === id)
                    if (idx === -1) return prev
                    if (direction === 'up' && idx === 0) return prev
                    if (direction === 'down' && idx === prev.length - 1) return prev
                    const next = [...prev]
                    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
                    ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
                    return next.map((n, i) => ({ ...n, position: i }))
                  })
                }
                saveError={saveError}
              />
            </>
          )}
          {view === 'linking' && (
            <LinkingView
              decisions={linkingDecisions}
              existingNarrators={existingStudyNarrators}
              loading={loadingLinking}
              onUpdateDecision={updateDecision}
              saveError={saveError}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-200 bg-neutral-50 shrink-0">
          {view === 'input' && (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={multiMode ? handleParseMulti : handleParse}
                disabled={multiMode ? chainTexts.every(t => !t.trim()) : !hadithText.trim()}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {multiMode ? 'Parse All' : 'Parse'}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </>
          )}
          {view === 'result' && (
            <>
              <button
                onClick={() => setView('input')}
                className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-800 transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                Back
              </button>
              <button
                onClick={handleSaveToDb}
                disabled={saving}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : chainResults.length > 1 ? `Confirm & Save All (${chainResults.length})` : 'Confirm & Save'}
              </button>
            </>
          )}
          {view === 'linking' && (
            <>
              <button
                onClick={() => setView('result')}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-800 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                Back
              </button>
              <button
                onClick={handleLinkingSave}
                disabled={saving || loadingLinking}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Linking View ──────────────────────────────────────────────────────────────

interface LinkingViewProps {
  decisions: LinkingDecision[]
  existingNarrators: StudyNarratorRow[]
  loading: boolean
  onUpdateDecision: (mentionId: string, narratorKey: string) => void
  saveError: string | null
}

function LinkingView({ decisions, existingNarrators, loading, onUpdateDecision, saveError }: LinkingViewProps) {
  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-14 bg-neutral-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  const autoLinked = decisions.filter(d => d.matchType === 'auto_exact')
  const needsReview = decisions.filter(d => d.matchType !== 'auto_exact')

  return (
    <div className="p-6 space-y-5">
      <p className="text-sm text-neutral-500">
        Review how each narrator from this version links to the study&apos;s narrator registry.
      </p>

      {/* Auto-linked section */}
      {autoLinked.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">
            Auto-linked ({autoLinked.length})
          </div>
          <div className="space-y-1.5">
            {autoLinked.map(d => (
              <div
                key={d.mentionId}
                className="flex items-center gap-3 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg"
              >
                <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                <span
                  className="flex-1 text-sm text-neutral-800"
                  dir="rtl"
                  style={{ fontFamily: "'Amiri', serif" }}
                >
                  {d.narratorNameOriginal}
                </span>
                <span className="text-xs text-neutral-500">matched to</span>
                <span
                  className="text-sm font-medium text-green-700"
                  dir="rtl"
                  style={{ fontFamily: "'Amiri', serif" }}
                >
                  {d.canonicalName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Needs review section */}
      {needsReview.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">
            Needs Review ({needsReview.length})
          </div>
          <div className="space-y-2.5">
            {needsReview.map(d => (
              <NeedsReviewRow
                key={d.mentionId}
                decision={d}
                existingNarrators={existingNarrators}
                onUpdate={onUpdateDecision}
              />
            ))}
          </div>
        </div>
      )}

      {decisions.length === 0 && (
        <div className="text-sm text-neutral-400 italic py-4 text-center">
          No narrators to link.
        </div>
      )}

      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {saveError}
        </div>
      )}
    </div>
  )
}

interface NeedsReviewRowProps {
  decision: LinkingDecision
  existingNarrators: StudyNarratorRow[]
  onUpdate: (mentionId: string, narratorKey: string) => void
}

function NeedsReviewRow({ decision, existingNarrators, onUpdate }: NeedsReviewRowProps) {
  const isNew = decision.decision === 'new'

  return (
    <div className="px-3 py-2.5 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
        <span
          className="flex-1 text-sm text-neutral-800"
          dir="rtl"
          style={{ fontFamily: "'Amiri', serif" }}
        >
          {decision.narratorNameOriginal}
        </span>
        {decision.isPreviouslyResolved && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full shrink-0">
            Previously resolved
          </span>
        )}
        {decision.matchType === 'auto_fuzzy' && !decision.isPreviouslyResolved && (
          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full shrink-0">
            Fuzzy {decision.fuzzyScore !== undefined ? `${(decision.fuzzyScore * 100).toFixed(0)}%` : ''}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 pl-4">
        <button
          onClick={() => onUpdate(decision.mentionId, 'new')}
          className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
            isNew
              ? 'bg-neutral-800 text-white border-neutral-800'
              : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400'
          }`}
        >
          Create New
        </button>

        <span className="text-xs text-neutral-400">or link to:</span>

        <select
          value={isNew ? '' : decision.decision}
          onChange={e => {
            if (e.target.value) onUpdate(decision.mentionId, e.target.value)
          }}
          className="flex-1 text-xs border border-neutral-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          style={{ fontFamily: "'Amiri', serif" }}
        >
          <option value="">— select existing —</option>
          {existingNarrators.map(n => (
            <option key={n.narrator_key} value={n.narrator_key}>
              {n.canonical_name}
              {decision.matchType === 'auto_fuzzy' && decision.decision === n.narrator_key && ' (suggested)'}
              {decision.matchType === 'previously_resolved' && decision.decision === n.narrator_key && ' (suggested)'}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ── Input View ────────────────────────────────────────────────────────────────

interface InputViewProps {
  selectedBookCode: string
  setSelectedBookCode: (v: string) => void
  customBooks: { name: string; code: string; author: string | null }[]
  customBookName: string
  setCustomBookName: (v: string) => void
  customBookCode: string
  setCustomBookCode: (v: string) => void
  customBookAuthor: string
  setCustomBookAuthor: (v: string) => void
  sourceReference: string
  setSourceReference: (v: string) => void
  hadithText: string
  setHadithText: (v: string) => void
  parseError: string | null
  isOther: boolean
  // Multi-chain mode
  multiMode: boolean
  setMultiMode: (v: boolean) => void
  chainTexts: string[]
  setChainText: (idx: number, v: string) => void
}

const ARABIC_TEXTAREA_STYLE: React.CSSProperties = {
  minHeight: '160px',
  fontFamily: "'Amiri', 'Scheherazade New', 'Traditional Arabic', serif",
  lineHeight: '2',
}

function InputView({
  selectedBookCode,
  setSelectedBookCode,
  customBooks,
  customBookName,
  setCustomBookName,
  customBookCode,
  setCustomBookCode,
  customBookAuthor,
  setCustomBookAuthor,
  sourceReference,
  setSourceReference,
  hadithText,
  setHadithText,
  parseError,
  isOther,
  multiMode,
  setMultiMode,
  chainTexts,
  setChainText,
}: InputViewProps) {
  return (
    <div className="p-6 space-y-4">
      {/* Source book + reference row */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-neutral-600 mb-1.5">
            Source Book
          </label>
          <select
            value={selectedBookCode}
            onChange={e => setSelectedBookCode(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <optgroup label="Standard Collections">
              {SOURCE_BOOKS.filter(b => b.code !== 'OTHER').map(book => (
                <option key={book.code} value={book.code}>
                  {book.nameEn} — {book.name}
                </option>
              ))}
            </optgroup>
            {customBooks.length > 0 && (
              <optgroup label="Your Books">
                {customBooks.map(book => (
                  <option key={book.code} value={book.code}>
                    {book.name}{book.author ? ` — ${book.author}` : ''}
                  </option>
                ))}
              </optgroup>
            )}
            <option value="OTHER">Other (custom)…</option>
          </select>
        </div>
        <div className="w-40">
          <label className="block text-xs font-medium text-neutral-600 mb-1.5">
            Reference (optional)
          </label>
          <input
            type="text"
            value={sourceReference}
            onChange={e => setSourceReference(e.target.value)}
            placeholder="e.g. 1/234"
            className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Custom book inputs */}
      {isOther && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                Book Name (Arabic)
              </label>
              <input
                type="text"
                value={customBookName}
                onChange={e => setCustomBookName(e.target.value)}
                placeholder="اسم الكتاب"
                dir="rtl"
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-[Amiri,serif]"
              />
            </div>
            <div className="w-32">
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                Short Code
              </label>
              <input
                type="text"
                value={customBookCode}
                onChange={e => setCustomBookCode(e.target.value.toUpperCase())}
                placeholder="e.g. XYZ"
                maxLength={10}
                className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1.5">
              Author / Compiler (Arabic)
            </label>
            <input
              type="text"
              value={customBookAuthor}
              onChange={e => setCustomBookAuthor(e.target.value)}
              placeholder="اسم المؤلف"
              dir="rtl"
              className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-[Amiri,serif]"
            />
          </div>
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMultiMode(false)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            !multiMode
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400'
          }`}
        >
          Single chain
        </button>
        <button
          type="button"
          onClick={() => setMultiMode(true)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
            multiMode
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-400'
          }`}
        >
          Multiple chains (up to {MAX_MULTI_CHAINS})
        </button>
      </div>

      {/* Single-chain text area */}
      {!multiMode && (
        <div>
          <label className="block text-xs font-medium text-neutral-600 mb-1.5">
            Ḥadīth Text
          </label>
          <textarea
            value={hadithText}
            onChange={e => setHadithText(e.target.value)}
            dir="rtl"
            placeholder="الصق نص الحديث هنا..."
            className="w-full px-4 py-3 text-base border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none leading-loose"
            style={{ ...ARABIC_TEXTAREA_STYLE, minHeight: '200px' }}
          />
        </div>
      )}

      {/* Multi-chain text areas */}
      {multiMode && (
        <div className="space-y-3">
          {Array.from({ length: MAX_MULTI_CHAINS }).map((_, i) => (
            <div key={i}>
              <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                Chain {i + 1}{i > 0 ? ' (optional)' : ''}
              </label>
              <textarea
                value={chainTexts[i] ?? ''}
                onChange={e => setChainText(i, e.target.value)}
                dir="rtl"
                placeholder="الصق نص الحديث هنا..."
                className="w-full px-4 py-3 text-base border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none leading-loose"
                style={ARABIC_TEXTAREA_STYLE}
              />
            </div>
          ))}
        </div>
      )}

      {parseError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {parseError}
        </div>
      )}
    </div>
  )
}

// ── Result View ───────────────────────────────────────────────────────────────

interface ResultViewProps {
  isnadText: string
  matanText: string
  confidence: number
  narrators: EditableNarrator[]
  editingNameId: string | null
  setEditingNameId: (id: string | null) => void
  updateNarratorName: (id: string, name: string) => void
  updateNarratorMode: (id: string, mode: string) => void
  deleteNarrator: (id: string) => void
  addNarratorAt: (afterIndex: number) => void
  moveNarrator: (id: string, direction: 'up' | 'down') => void
  saveError: string | null
}

function ResultView({
  isnadText,
  matanText,
  confidence,
  narrators,
  editingNameId,
  setEditingNameId,
  updateNarratorName,
  updateNarratorMode,
  deleteNarrator,
  addNarratorAt,
  moveNarrator,
  saveError,
}: ResultViewProps) {
  const lowConfidence = confidence < 0.8

  return (
    <div className="p-6 space-y-4">
      {/* Low confidence warning */}
      {lowConfidence && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
          <svg className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <p className="text-sm text-yellow-800">
            Low confidence — please review the isnād/matan boundary manually.{' '}
            <span className="text-yellow-600 text-xs">
              (confidence: {(confidence * 100).toFixed(0)}%)
            </span>
          </p>
        </div>
      )}

      {/* Isnād section */}
      <div>
        <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-1.5 flex items-center gap-2">
          Isnād
          {!lowConfidence && (
            <span className="text-blue-400 font-normal normal-case tracking-normal">
              {(confidence * 100).toFixed(0)}% confidence
            </span>
          )}
        </div>
        <div
          className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm leading-loose"
          dir="rtl"
          style={{ fontFamily: "'Amiri', 'Scheherazade New', serif", lineHeight: '2' }}
        >
          {isnadText || <span className="text-blue-300 italic">No isnād detected</span>}
        </div>
      </div>

      {/* Matan section */}
      <div>
        <div className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1.5">
          Matan
        </div>
        <div
          className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm leading-loose"
          dir="rtl"
          style={{ fontFamily: "'Amiri', 'Scheherazade New', serif", lineHeight: '2' }}
        >
          {matanText || <span className="text-green-300 italic">No matan detected</span>}
        </div>
      </div>

      {/* Narrators */}
      <div>
        <div className="text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-2">
          Narrators ({narrators.length} found)
        </div>

        {narrators.length === 0 ? (
          <div className="text-sm text-neutral-400 italic py-2">
            No narrators extracted. You can add them manually.
          </div>
        ) : (
          <div className="space-y-1">
            {narrators.map((narrator, index) => (
              <div key={narrator.id}>
                <NarratorRow
                  narrator={narrator}
                  index={index}
                  total={narrators.length}
                  isEditing={editingNameId === narrator.id}
                  onStartEdit={() => setEditingNameId(narrator.id)}
                  onEndEdit={() => setEditingNameId(null)}
                  onNameChange={(name) => updateNarratorName(narrator.id, name)}
                  onModeChange={(mode) => updateNarratorMode(narrator.id, mode)}
                  onDelete={() => deleteNarrator(narrator.id)}
                  onMoveUp={() => moveNarrator(narrator.id, 'up')}
                  onMoveDown={() => moveNarrator(narrator.id, 'down')}
                />
                {/* Add between button */}
                <AddNarratorButton onAdd={() => addNarratorAt(index)} />
              </div>
            ))}
          </div>
        )}

        {/* Add at end if list is empty */}
        {narrators.length === 0 && (
          <button
            onClick={() => addNarratorAt(-1)}
            className="mt-2 px-3 py-1.5 text-xs text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded-lg transition-colors"
          >
            + Add narrator
          </button>
        )}
      </div>

      {saveError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {saveError}
        </div>
      )}
    </div>
  )
}

// ── Narrator Row ──────────────────────────────────────────────────────────────

interface NarratorRowProps {
  narrator: EditableNarrator
  index: number
  total: number
  isEditing: boolean
  onStartEdit: () => void
  onEndEdit: () => void
  onNameChange: (name: string) => void
  onModeChange: (mode: string) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function NarratorRow({
  narrator,
  index,
  total,
  isEditing,
  onStartEdit,
  onEndEdit,
  onNameChange,
  onModeChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: NarratorRowProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-lg group">
      {/* Position number */}
      <span className="text-xs font-mono text-neutral-400 w-5 shrink-0 text-center">
        {index + 1}
      </span>

      {/* Transmission mode dropdown */}
      <select
        value={narrator.transmissionMode}
        onChange={e => onModeChange(e.target.value)}
        className="text-xs border border-neutral-200 rounded px-1.5 py-0.5 bg-white text-neutral-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
        style={{ fontFamily: "'Amiri', serif" }}
      >
        {TRANSMISSION_MODES.map(mode => (
          <option key={mode} value={mode}>
            {mode}
          </option>
        ))}
      </select>

      <span className="text-neutral-400 text-xs">←</span>

      {/* Narrator name (editable) */}
      {isEditing ? (
        <input
          type="text"
          value={narrator.narratorName}
          onChange={e => onNameChange(e.target.value)}
          onBlur={onEndEdit}
          autoFocus
          dir="rtl"
          className="flex-1 px-2 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
          style={{ fontFamily: "'Amiri', serif" }}
        />
      ) : (
        <button
          onClick={onStartEdit}
          className="flex-1 text-right px-2 py-0.5 text-sm rounded hover:bg-white hover:border hover:border-blue-200 transition-colors"
          dir="rtl"
          style={{ fontFamily: "'Amiri', serif" }}
          title="Click to edit"
        >
          {narrator.narratorName || <span className="text-neutral-300 italic text-xs">click to enter name</span>}
        </button>
      )}

      {/* Parallel narrators indicator */}
      {narrator.parallelNarrators && narrator.parallelNarrators.length > 0 && (
        <span className="text-xs text-neutral-400 shrink-0">
          +{narrator.parallelNarrators.length}
        </span>
      )}

      {/* Up/down buttons */}
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onMoveUp}
          disabled={index === 0}
          className="p-1 rounded hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Move up"
        >
          <svg className="w-3 h-3 text-neutral-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
          </svg>
        </button>
        <button
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="p-1 rounded hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Move down"
        >
          <svg className="w-3 h-3 text-neutral-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      </div>

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="p-1 rounded hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all text-neutral-400 hover:text-red-500"
        title="Delete narrator"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
        </svg>
      </button>
    </div>
  )
}

// ── Add Narrator Button ───────────────────────────────────────────────────────

function AddNarratorButton({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex items-center my-0.5 opacity-0 hover:opacity-100 transition-opacity group/add">
      <div className="flex-1 h-px bg-neutral-200" />
      <button
        onClick={onAdd}
        className="mx-2 p-0.5 rounded-full border border-neutral-300 bg-white hover:border-blue-400 hover:bg-blue-50 transition-colors"
        title="Add narrator here"
      >
        <svg className="w-3 h-3 text-neutral-400 group-hover/add:text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      </button>
      <div className="flex-1 h-px bg-neutral-200" />
    </div>
  )
}
