import type { createClient } from '@/lib/supabase/client'

export interface StudyNarratorRow {
  id: string
  study_id: string
  narrator_key: string
  canonical_name: string
  name_variants: string[]
}

// Called after saving narrator_mentions for a new version
// Returns mapping: narrator_name_normalized -> narrator_key
export async function autoLinkNarrators(
  supabase: ReturnType<typeof createClient>,
  studyId: string,
  mentionNarrators: Array<{ id: string; narrator_name_original: string; narrator_name_normalized: string }>
): Promise<void> {
  // 1. Fetch all existing study_narrators for this study
  const { data: existing } = await supabase
    .from('study_narrators')
    .select('*')
    .eq('study_id', studyId)

  const existingNarrators: StudyNarratorRow[] = (existing ?? []) as StudyNarratorRow[]

  // 2. Get next narrator number for key generation
  let nextNum = existingNarrators.length + 1

  for (const mention of mentionNarrators) {
    const normalized = mention.narrator_name_normalized

    // Check for exact match in name_variants
    const exactMatch = existingNarrators.find(n =>
      n.name_variants.some(v => v === normalized)
    )

    if (exactMatch) {
      // Update mention with resolved key
      await supabase
        .from('narrator_mentions')
        .update({ resolved_narrator_key: exactMatch.narrator_key, match_method: 'auto_exact' })
        .eq('id', mention.id)

      // Add new variant if not already present
      if (!exactMatch.name_variants.includes(normalized)) {
        const newVariants = [...exactMatch.name_variants, normalized]
        await supabase
          .from('study_narrators')
          .update({ name_variants: newVariants })
          .eq('id', exactMatch.id)
        exactMatch.name_variants = newVariants
      }
    } else {
      // Create new study_narrator
      const narratorKey = `narrator_${nextNum}`
      nextNum++

      const { data: newNarrator } = await supabase
        .from('study_narrators')
        .insert({
          study_id: studyId,
          narrator_key: narratorKey,
          canonical_name: mention.narrator_name_original,
          name_variants: [normalized],
        })
        .select()
        .single()

      if (newNarrator) {
        existingNarrators.push(newNarrator as StudyNarratorRow)
        await supabase
          .from('narrator_mentions')
          .update({ resolved_narrator_key: narratorKey, match_method: 'auto_new' })
          .eq('id', mention.id)
      }
    }
  }
}
