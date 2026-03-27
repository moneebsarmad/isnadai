import { normalize, stripDiacritics } from './normalize'
import {
  TRANSMISSION_PHRASES,
  PROPHET_PATTERNS,
  HONORIFIC_PATTERNS,
  CLARIFICATION_PATTERNS,
  EDITORIAL_PATTERNS,
} from './lexicon'
import type { NarratorMention } from './types'

const DIACRITIC_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/

function buildPosMap(original: string): number[] {
  const map: number[] = []
  for (let i = 0; i < original.length; i++) {
    if (!DIACRITIC_RE.test(original[i])) map.push(i)
  }
  return map
}

function toOrig(map: number[], sIdx: number): number {
  if (sIdx <= 0) return 0
  if (sIdx >= map.length) return map.length > 0 ? map[map.length - 1] + 1 : 0
  return map[sIdx]
}

export function extractEditorialAsides(text: string): {
  cleanText: string
  asides: string[]
} {
  const asides: string[] = []
  // Match patterns against stripped text so diacritics don't break plain-Arabic patterns
  const strippedInput = stripDiacritics(text)
  const posMap = buildPosMap(text)

  const removals: Array<[number, number]> = []
  for (const pattern of EDITORIAL_PATTERNS) {
    const re = new RegExp(pattern.source, 'g')
    let m: RegExpExecArray | null
    while ((m = re.exec(strippedInput)) !== null) {
      const oStart = toOrig(posMap, m.index)
      const oEnd   = toOrig(posMap, m.index + m[0].length)
      const aside  = text.slice(oStart, oEnd)
        .replace(/^[،,\[(\-\s]+|[\s\-)\]]+$/g, '').trim()
      if (aside) asides.push(aside)
      removals.push([oStart, oEnd])
    }
  }

  if (removals.length === 0) return { cleanText: text, asides }

  // Apply removals highest-first to avoid index shifting
  removals.sort((a, b) => b[0] - a[0])
  let cleanText = text
  for (const [oStart, oEnd] of removals) {
    cleanText = cleanText.slice(0, oStart) + ' ' + cleanText.slice(oEnd)
  }
  cleanText = cleanText.replace(/  +/g, ' ').trim()
  return { cleanText, asides }
}

function isProphet(text: string): boolean {
  // Strip diacritics before testing since PROPHET_PATTERNS are plain Arabic
  const stripped = stripDiacritics(text)
  return PROPHET_PATTERNS.some(p => p.test(stripped))
}

function stripHonorifics(name: string): string {
  // Apply patterns to the diacritics-stripped version since patterns are plain Arabic
  const stripped = stripDiacritics(name)
  let result = stripped
  for (const pattern of HONORIFIC_PATTERNS) {
    result = result.replace(pattern, '')
  }
  result = result.trim()
  // If nothing was stripped, return the original (with diacritics preserved)
  if (stripDiacritics(name).trim() === result) return name.trim()
  // Otherwise return the cleaned stripped version (diacritics lost for stripped portions)
  return result
}

function extractClarification(segment: string): {
  cleanSegment: string
  clarification: string | null
} {
  // Match on stripped text since patterns are plain Arabic
  const stripped = stripDiacritics(segment)
  for (const pattern of CLARIFICATION_PATTERNS) {
    const match = stripped.match(pattern)
    if (match) {
      return {
        cleanSegment: stripped.replace(pattern, ' ').replace(/  +/g, ' ').trim(),
        clarification: match[0].replace(/^[\[(]\s*|\s*[\])]$/g, '').trim(),
      }
    }
  }
  // Return stripped segment (or original if no change) to keep things consistent
  return { cleanSegment: segment, clarification: null }
}

const RECONVERGENCE_RE = /[\s،,]*(?:جميعا|قالا|قالوا|كلهم|كلاهما)\s*$/

function trimReconvergence(s: string): string {
  return s.replace(RECONVERGENCE_RE, '').trim()
}

function splitParallelNarrators(text: string): { primary: string; parallels: string[] } {
  // Work on stripped text for matching (handles diacritics on و)
  const stripped = stripDiacritics(text)
  // Split on ،و or space+و when followed by Arabic (parallel narrator conjunction)
  const parallelRegex = /(?:،\s*|\s+)و(?=\s*[\u0600-\u06FF])/g
  const parts: string[] = []
  let lastIndex = 0
  let m: RegExpExecArray | null

  while ((m = parallelRegex.exec(stripped)) !== null) {
    parts.push(stripped.slice(lastIndex, m.index).replace(/[،,\s]+$/, '').trim())
    lastIndex = m.index + m[0].length
  }
  const tail = stripped.slice(lastIndex).replace(/[،,\s]+$/, '').trim()
  if (tail) parts.push(tail)

  if (parts.length === 0) return { primary: text.trim(), parallels: [] }

  // Trim reconvergence markers (جميعا, قالا…) from each part
  const trimmed = parts.map(trimReconvergence).filter(p => p.length > 0)

  if (trimmed.length === 0) return { primary: text.trim(), parallels: [] }

  // No actual parallel split — preserve original text (keeps diacritics) unless marker was trimmed
  if (parts.length === 1) {
    const origStripped = stripped.replace(/[،,\s]+$/, '').trim()
    const origTrimmed  = trimReconvergence(origStripped)
    return {
      primary: origStripped === origTrimmed ? text.trim() : origTrimmed,
      parallels: [],
    }
  }

  // Drop "parallel" parts that are editorial remarks rather than narrator names.
  // These start with negation/verb words that can never begin an Arabic proper name.
  const EDITORIAL_STARTS = /^(?:لم|لا|لو|ولم|قال|ذكر|لم يذكر|لم يسم)/
  const trueParallels = trimmed.slice(1).filter(p => !EDITORIAL_STARTS.test(p))

  return { primary: trimmed[0], parallels: trueParallels }
}

/**
 * Strip trailing cue-word residues that leaked from the following link into the name.
 * e.g. "أبي أيوب الأنصاري، أنه" → "أبي أيوب الأنصاري"
 *      "جابر بن عبد الله يقول"  → "جابر بن عبد الله"
 * Works on stripped text and returns stripped result when a residue is removed.
 */
function trimTrailingCueResidues(name: string): string {
  const s = stripDiacritics(name)
  const cleaned = s
    .replace(/\s*-\s*-\s*/g, ' ')               // orphaned dash pairs left by honorific stripping
    .replace(/\s+(?:أنه|أنها|أنهم|قال|فقال|يقول)\s*$/, '')
    .replace(/[،,\s\-]+$/, '')
    .trim()
  const baseline = s.replace(/\s*-\s*-\s*/g, ' ').replace(/[،,\s\-]+$/, '').trim()
  if (cleaned === baseline) {
    // Nothing changed — preserve original (may have diacritics)
    return name.replace(/[،,\s\-]+$/, '').trim()
  }
  return cleaned
}

/**
 * Segment the isnad into narrator mentions.
 *
 * Works on diacritics-stripped text for phrase matching, then maps
 * positions back to the original text to preserve vocalization.
 */
export function segmentNarrators(isnadText: string): NarratorMention[] {
  const { cleanText, asides } = extractEditorialAsides(isnadText)

  // Strip diacritics for matching
  const stripped = stripDiacritics(cleanText)
  const posMap   = buildPosMap(cleanText)

  // Sort phrases longest-first so multi-word phrases match before substrings
  const sortedPhrases = [...TRANSMISSION_PHRASES].sort(
    (a, b) => b.phrase.length - a.phrase.length
  )

  interface Token {
    phrase: string
    origPhrase: string   // slice of original text
    mode: string
    strength: string
    sStart: number       // position in stripped text
    sEnd: number
    oStart: number       // position in original text
    oEnd: number
  }

  const tokens: Token[] = []

  for (const entry of sortedPhrases) {
    const escaped = entry.phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Match phrase at word boundary in stripped text
    const regex = new RegExp(`(?:^|(?<=[\\s,،;:\\-]))${escaped}(?=[\\s,،;:\\-]|$)`, 'g')
    let m: RegExpExecArray | null
    while ((m = regex.exec(stripped)) !== null) {
      const sStart = m.index
      const sEnd   = m.index + m[0].length
      const oStart = toOrig(posMap, sStart)
      const oEnd   = toOrig(posMap, sEnd)
      tokens.push({
        phrase: entry.phrase,
        origPhrase: cleanText.slice(oStart, oEnd).trim(),
        mode: entry.mode,
        strength: entry.strength,
        sStart, sEnd, oStart, oEnd,
      })
    }
  }

  if (tokens.length === 0) return []

  // Sort by position, remove overlapping (keep earliest/longest)
  tokens.sort((a, b) => a.sStart - b.sStart)
  const filtered: Token[] = []
  let lastEnd = -1
  for (const tok of tokens) {
    if (tok.sStart >= lastEnd) {
      filtered.push(tok)
      lastEnd = tok.sEnd
    }
  }

  // Extract narrator names between consecutive tokens
  const narrators: NarratorMention[] = []
  let position = 0

  for (let i = 0; i < filtered.length; i++) {
    const tok     = filtered[i]
    const nextTok = filtered[i + 1]

    // Name runs from end of this phrase to start of next phrase (in original text)
    const nameOStart = tok.oEnd
    const nameOEnd   = nextTok ? nextTok.oStart : cleanText.length
    const rawName    = cleanText.slice(nameOStart, nameOEnd).trim()
      .replace(/^[,،;\-\s]+/, '')  // strip leading punctuation
      .replace(/[,،;\-\s]+$/, '')  // strip trailing punctuation

    if (!rawName || rawName.length < 2) continue

    const { cleanSegment, clarification } = extractClarification(rawName)
    // Strip honorifics BEFORE splitting on و — prevents وسلم inside salla phrases
    // from being misread as a parallel-narrator conjunction
    const noHonorifics                    = stripHonorifics(cleanSegment)
    const { primary, parallels }          = splitParallelNarrators(noHonorifics)
    const primaryName                     = trimTrailingCueResidues(primary)

    if (!primaryName || isProphet(primaryName)) continue

    narrators.push({
      transmissionPhrase:    tok.origPhrase || tok.phrase,
      transmissionMode:      tok.mode,
      transmissionStrength:  tok.strength,
      narratorName:          primaryName,
      narratorNameNormalized: normalize(primaryName),
      hasClarification:      clarification !== null,
      position,
      parallelNarrators:     parallels.length > 0
        ? parallels.map(p => trimTrailingCueResidues(p))
        : undefined,
      editorialNote:         clarification ?? undefined,
      editorialAsides:       asides.length > 0 ? asides : undefined,
    })

    position++
  }

  return narrators
}

export { isProphet }
