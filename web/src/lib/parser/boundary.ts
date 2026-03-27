import { stripDiacritics } from './normalize'
import { NARRATIVE_INDICATORS, POST_MATAN_PATTERNS } from './lexicon'
import type { BoundaryResult } from './types'

const DIACRITIC_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/

/**
 * Build a position map: strippedIndex → originalIndex.
 * Since stripping only removes characters (not replaces), non-diacritic
 * characters maintain their relative order.
 */
function buildPosMap(original: string): number[] {
  const map: number[] = []
  for (let i = 0; i < original.length; i++) {
    if (!DIACRITIC_RE.test(original[i])) {
      map.push(i)
    }
  }
  return map
}

/** Convert a stripped-text index to its original-text index. */
function toOrig(map: number[], sIdx: number): number {
  if (sIdx <= 0) return 0
  if (sIdx >= map.length) return map.length > 0 ? map[map.length - 1] + 1 : 0
  return map[sIdx]
}

/**
 * Detect the isnad/matan boundary.
 *
 * All pattern matching runs on diacritics-stripped text so that patterns
 * like /أن رسول الله/ match vocalized text like /أَنَّ رَسُولَ اللَّهِ/.
 * Positions are then mapped back to the original text for correct slicing.
 */
export function detectMatanBoundary(text: string): BoundaryResult {
  const stripped = stripDiacritics(text)
  const posMap = buildPosMap(text)

  // ── Strategy 1: Guillemet quotes «…» ─────────────────────────────────────
  const guillemet = text.indexOf('«')
  if (guillemet !== -1) {
    const closing = text.lastIndexOf('»')
    let rawIsnad = text.slice(0, guillemet).trim()
    let matanText = closing !== -1
      ? text.slice(guillemet + 1, closing).trim()
      : text.slice(guillemet + 1).trim()
    let postMatanCommentary: string | null = null

    if (closing !== -1 && closing < text.length - 1) {
      const afterMatan = text.slice(closing + 1).trim()
      if (afterMatan.length > 0) {
        const hasPost = POST_MATAN_PATTERNS.some(p => p.test(stripDiacritics(afterMatan)))
        if (hasPost) postMatanCommentary = afterMatan
      }
    }

    // Strip trailing prophetic intro phrase from isnad text.
    // Without this, text like "عن أبي هريرة قال: قال رسول الله ﷺ:" stays in
    // the isnad, causing the segmenter to either (a) filter out the companion
    // via isProphet() because "رسول الله" is in the segment, or (b) create
    // fake narrator entries from قال inside the intro.
    const strippedIsnad = stripDiacritics(rawIsnad)
    const INTRO_STRIP_PATTERNS = [
      // أنه حدثه أن رسول الله ﷺ قال (double أن attribution)
      /[،,]?\s*أنه\s+حدثه\s+أن\s+(?:رسول الله|النبي)\s*(?:ﷺ|صلى الله عليه وسلم|صلى الله عليه وآله وسلم)?\s*قال\s*:?\s*$/,
      // أنه حدثهم ... أن رسول الله ﷺ قال (variant with حدثهم)
      /[،,]?\s*أنه\s+حدثهم[^]*أن\s+(?:رسول الله|النبي)\s*(?:ﷺ|صلى الله عليه وسلم)?\s*قال\s*:?\s*$/,
      // قال: قال رسول الله ﷺ: / قال قال النبي
      /[،,]?\s*قال\s*:?\s*قال\s+(?:رسول الله|النبي)\s*(?:ﷺ|صلى الله عليه وسلم|صلى الله عليه وآله وسلم)?\s*:?\s*$/,
      // أن رسول الله ﷺ قال / أن النبي قال (KEY FIX — أن not أنه, not عن)
      // The verb after the Prophet can be anything: قال, سئل, نهى, أمر, كان, etc.
      /[،,]?\s*[ـ\-]?\s*(?:رضى? الله عنه(?:ما)?)\s*[ـ\-]?\s*أن\s+(?:رسول الله|النبي)\s*(?:ﷺ|صلى الله عليه وسلم|صلى الله عليه وآله وسلم)?[\s\S]*$/,
      /[،,]?\s*أن\s+(?:رسول الله|النبي)\s*(?:ﷺ|صلى الله عليه وسلم|صلى الله عليه وآله وسلم)?[\s\S]*$/,
      // قال النبي / قال رسول الله (without preceding قال)
      /[،,]?\s*(?:قال|فقال|يقول)\s+(?:رسول الله|النبي)\s*(?:ﷺ|صلى الله عليه وسلم|صلى الله عليه وآله وسلم)?\s*:?\s*$/,
      // عن النبي ﷺ قال / عن رسول الله قال
      /[،,]?\s*عن\s+(?:النبي|رسول الله)\s*(?:ﷺ|صلى الله عليه وسلم|صلى الله عليه وآله وسلم)?\s*(?:قال|يقول|فقال)?\s*:?\s*$/,
      // سمعت رسول الله ﷺ يقول / سمعت النبي يقول
      /[،,]?\s*سمع(?:ت|نا|ه)?\s+(?:النبي|رسول الله)\s*(?:ﷺ|صلى الله عليه وسلم|صلى الله عليه وآله وسلم)?\s*(?:يقول|قال)?\s*:?\s*$/,
      // أنه قال: (companion mawquf)
      /[،,]?\s*أنه\s+قال\s*:?\s*$/,
      // Just trailing قال: at the very end
      /[،,]?\s*قال\s*:?\s*$/,
    ]

    let introPhrase: string | null = null
    let isnadText = rawIsnad

    for (const pat of INTRO_STRIP_PATTERNS) {
      const introMatch = strippedIsnad.match(pat)
      if (introMatch && introMatch.index !== undefined) {
        // Map back to original text position
        const introPosMap = buildPosMap(rawIsnad)
        const oStart = toOrig(introPosMap, introMatch.index)
        introPhrase = rawIsnad.slice(oStart).trim()
        isnadText = rawIsnad.slice(0, oStart).trim().replace(/[،,\s]+$/, '')
        break
      }
    }

    return {
      isnadText,
      matanText,
      boundaryType: 'guillemet',
      confidence: 0.98,
      introPhrase,
      narrativeText: null,
      postMatanCommentary,
    }
  }

  // ── Strategy 2-6: Named patterns on stripped text ─────────────────────────
  for (const indicator of NARRATIVE_INDICATORS) {
    if (indicator.type === 'guillemet') continue

    const match = stripped.match(indicator.pattern)
    if (!match || match.index === undefined) continue

    const sStart = match.index
    const sEnd   = match.index + match[0].length

    // Map to original-text positions
    const oStart = toOrig(posMap, sStart)
    const oEnd   = toOrig(posMap, sEnd)

    let confidence  = 0.85
    let boundaryIdx = oEnd          // where matan begins in original text
    let introPhrase: string | null = null

    if (indicator.type === 'attribution') {
      confidence = 0.90
      // The intro phrase runs from pattern start to end of the first قال
      const afterStart = text.slice(oStart)
      const qalM = afterStart.match(/قال/)
      if (qalM && qalM.index !== undefined) {
        const absQalEnd = oStart + qalM.index + qalM[0].length
        introPhrase = text.slice(oStart, absQalEnd).trim()
        boundaryIdx = absQalEnd
      } else {
        introPhrase = text.slice(oStart, oEnd).trim()
      }
    } else if (indicator.type === 'speech') {
      confidence  = 0.88
      introPhrase = text.slice(oStart, oEnd).trim()
      if (text[boundaryIdx] === ':' || text[boundaryIdx] === '،') boundaryIdx++
    } else if (indicator.type === 'hearing') {
      confidence  = 0.88
      introPhrase = text.slice(oStart, oEnd).trim()
      const qalM  = text.slice(oStart).match(/(?:يقول|قال)/)
      if (qalM && qalM.index !== undefined) {
        boundaryIdx = oStart + qalM.index + qalM[0].length
      }
    }

    const isnadText = text.slice(0, oStart).trim()
    if (isnadText.length < 5) continue

    let matanText = text.slice(boundaryIdx).trim()

    // Check for post-matan commentary
    let postMatanCommentary: string | null = null
    const strippedMatan = stripDiacritics(matanText)
    const matanPosMap   = buildPosMap(matanText)
    for (const postPat of POST_MATAN_PATTERNS) {
      const pm = strippedMatan.match(postPat)
      if (pm && pm.index !== undefined && pm.index > 20) {
        const oPost    = toOrig(matanPosMap, pm.index)
        postMatanCommentary = matanText.slice(oPost).trim()
        matanText           = matanText.slice(0, oPost).trim()
        break
      }
    }

    return {
      isnadText,
      matanText,
      boundaryType: indicator.type,
      confidence,
      introPhrase,
      narrativeText: null,
      postMatanCommentary,
    }
  }

  // ── Strategy 7: Fallback heuristic ───────────────────────────────────────
  return fallbackBoundary(text, stripped, posMap)
}

function fallbackBoundary(
  text: string,
  stripped: string,
  posMap: number[]
): BoundaryResult {
  // Look for أن / أنه / أنها that precede the matan clause
  const anPat = /\bأن(?:ه|ها|هم)?\b/g
  let lastMatch: RegExpExecArray | null = null
  let m: RegExpExecArray | null

  while ((m = anPat.exec(stripped)) !== null) {
    if (m.index > 30) lastMatch = m
  }

  if (lastMatch) {
    const oIdx = toOrig(posMap, lastMatch.index)
    const isnadText = text.slice(0, oIdx).trim()
    const matanText = text.slice(oIdx).trim()

    if (isnadText.length > 10 && matanText.length > 10) {
      return {
        isnadText,
        matanText,
        boundaryType: 'heuristic',
        confidence: 0.65,
        introPhrase: null,
        narrativeText: null,
        postMatanCommentary: null,
        warning: 'Low-confidence boundary. Please verify manually.',
      }
    }
  }

  return {
    isnadText: text,
    matanText: '',
    boundaryType: 'none',
    confidence: 0.3,
    introPhrase: null,
    narrativeText: null,
    postMatanCommentary: null,
    warning: 'Could not detect isnad/matan boundary. Full text preserved as isnad for narrator extraction.',
  }
}
