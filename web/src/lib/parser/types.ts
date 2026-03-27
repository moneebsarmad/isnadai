export interface BoundaryResult {
  isnadText: string
  matanText: string
  boundaryType: string
  confidence: number
  introPhrase?: string | null
  narrativeText?: string | null
  postMatanCommentary?: string | null
  warning?: string
}

export interface NarratorMention {
  transmissionPhrase: string
  transmissionMode: string      // سماع | إخبار | عنعنة | قال | إنباء
  transmissionStrength: string  // direct | explicit | ambiguous
  narratorName: string          // original Arabic with diacritics
  narratorNameNormalized: string // stripped/normalized for matching
  hasClarification: boolean
  position: number
  isProphet?: boolean           // true for the Prophet ﷺ terminal node
  parallelNarrators?: string[]
  editorialNote?: string
  editorialAsides?: string[]
}

export interface ParseResult {
  boundary: BoundaryResult
  narrators: NarratorMention[]
}
