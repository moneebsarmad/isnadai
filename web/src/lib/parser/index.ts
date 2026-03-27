import { preClean } from './preclean'
import { detectMatanBoundary } from './boundary'
import { segmentNarrators } from './segmenter'
import { stripDiacritics, normalize } from './normalize'
import type { ParseResult } from './types'

const PROPHET_IN_INTRO = /(?:النبي|رسول الله|المصطفى|خاتم الانبياء)/
// Detects chains that end "عن النبي ... قال" or "عن رسول الله ... قال" before the matan
const PROPHET_AT_END_OF_ISNAD = /(?:عن|أن)\s+(?:النبي|رسول الله)\s*(?:ﷺ|صلى الله عليه وسلم|صلى الله عليه وآله وسلم)?\s*(?:قال|يقول|فقال)?\s*$/

const INTRO_VERB_MODE: Record<string, { mode: string; strength: string }> = {
  'قال':   { mode: 'قال',    strength: 'explicit'  },
  'فقال':  { mode: 'قال',    strength: 'explicit'  },
  'يقول':  { mode: 'قال',    strength: 'explicit'  },
  'سمعت':  { mode: 'سماع',   strength: 'direct'    },
  'سمعنا': { mode: 'سماع',   strength: 'direct'    },
  'عن':    { mode: 'عنعنة',  strength: 'ambiguous' },
  'أن':    { mode: 'عنعنة',  strength: 'ambiguous' },
  'أنه':   { mode: 'عنعنة',  strength: 'ambiguous' },
}

export function parseHadith(rawText: string): ParseResult {
  const text = preClean(rawText)
  const boundary = detectMatanBoundary(text)
  const narrators = boundary.isnadText ? segmentNarrators(boundary.isnadText) : []

  // If isnadText itself ends with "عن النبي ... قال" (guillemet-boundary case),
  // the Prophet was filtered from narrators — add him back as terminal node
  if (boundary.isnadText && !boundary.introPhrase) {
    const strippedIsnad = stripDiacritics(boundary.isnadText)
    if (PROPHET_AT_END_OF_ISNAD.test(strippedIsnad)) {
      narrators.push({
        transmissionPhrase: 'عن',
        transmissionMode: 'عنعنة',
        transmissionStrength: 'ambiguous',
        narratorName: 'النبي ﷺ',
        narratorNameNormalized: normalize('النبي'),
        hasClarification: false,
        position: narrators.length,
        isProphet: true,
      })
    }
  }

  // If the boundary intro phrase references the Prophet, append him as a terminal node
  if (boundary.introPhrase) {
    const strippedIntro = stripDiacritics(boundary.introPhrase)
    if (PROPHET_IN_INTRO.test(strippedIntro)) {
      const verbMatch = strippedIntro.match(/^(قال|فقال|يقول|سمعت|سمعنا|عن|أن|أنه)/)
      const verb = verbMatch?.[1] ?? 'عن'
      const { mode, strength } = INTRO_VERB_MODE[verb] ?? { mode: 'قال', strength: 'explicit' }
      narrators.push({
        transmissionPhrase: verb,
        transmissionMode: mode,
        transmissionStrength: strength,
        narratorName: 'النبي ﷺ',
        narratorNameNormalized: normalize('النبي'),
        hasClarification: false,
        position: narrators.length,
        isProphet: true,
      })
    }
  }

  return { boundary, narrators }
}

export type { ParseResult, BoundaryResult, NarratorMention } from './types'
