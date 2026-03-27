/**
 * Lexicon constants for hadith parser.
 * All Arabic regex patterns are kept exactly as-is.
 */

export interface TransmissionEntry {
  phrase: string
  mode: string
  strength: string
}

/**
 * Transmission phrases ordered from most specific to least specific.
 * mode: سماع | إخبار | عنعنة | قال | إنباء
 * strength: direct | explicit | ambiguous
 */
export const TRANSMISSION_PHRASES: TransmissionEntry[] = [
  // سماع (direct hearing)
  { phrase: 'سمعت', mode: 'سماع', strength: 'direct' },
  { phrase: 'سمعناه', mode: 'سماع', strength: 'direct' },
  { phrase: 'سمعه', mode: 'سماع', strength: 'direct' },
  { phrase: 'حدثنا', mode: 'سماع', strength: 'direct' },
  { phrase: 'حدثني', mode: 'سماع', strength: 'direct' },
  { phrase: 'حدثه', mode: 'سماع', strength: 'direct' },
  { phrase: 'حدثهم', mode: 'سماع', strength: 'direct' },
  { phrase: 'ثنا', mode: 'سماع', strength: 'direct' },
  { phrase: 'ثني', mode: 'سماع', strength: 'direct' },
  // قراءة على (recitation to/before a teacher)
  { phrase: 'قرأت على', mode: 'سماع', strength: 'direct' },
  { phrase: 'قرأنا على', mode: 'سماع', strength: 'direct' },
  { phrase: 'قرئ على', mode: 'سماع', strength: 'direct' },

  // إخبار (reporting/informing)
  { phrase: 'أخبرنا', mode: 'إخبار', strength: 'explicit' },
  { phrase: 'أخبرني', mode: 'إخبار', strength: 'explicit' },
  { phrase: 'أخبره', mode: 'إخبار', strength: 'explicit' },
  { phrase: 'أخبرهم', mode: 'إخبار', strength: 'explicit' },
  { phrase: 'خبرنا', mode: 'إخبار', strength: 'explicit' },
  { phrase: 'خبرني', mode: 'إخبار', strength: 'explicit' },
  { phrase: 'أنبأنا', mode: 'إنباء', strength: 'explicit' },
  { phrase: 'أنبأني', mode: 'إنباء', strength: 'explicit' },
  { phrase: 'أنبأه', mode: 'إنباء', strength: 'explicit' },
  { phrase: 'نبأنا', mode: 'إنباء', strength: 'explicit' },
  { phrase: 'نبأني', mode: 'إنباء', strength: 'explicit' },

  // قال (saying/reporting)
  { phrase: 'قال لنا', mode: 'قال', strength: 'explicit' },
  { phrase: 'قال لي', mode: 'قال', strength: 'explicit' },
  { phrase: 'قال', mode: 'قال', strength: 'explicit' },

  // عنعنة (chain of "from")
  { phrase: 'عن', mode: 'عنعنة', strength: 'ambiguous' },
  { phrase: 'عن أبيه', mode: 'عنعنة', strength: 'ambiguous' },
  { phrase: 'عن جده', mode: 'عنعنة', strength: 'ambiguous' },
  { phrase: 'روى', mode: 'عنعنة', strength: 'ambiguous' },
  { phrase: 'رواه', mode: 'عنعنة', strength: 'ambiguous' },
]

/**
 * Patterns that identify the Prophet ﷺ — these should NOT be treated as narrator names.
 * Matches various forms of referring to the Prophet.
 */
export const PROPHET_PATTERNS: RegExp[] = [
  /النبي\s*(?:ﷺ|صلى الله عليه وسلم|صلى الله عليه وآله وسلم)?/,
  /رسول الله\s*(?:ﷺ|صلى الله عليه وسلم|صلى الله عليه وآله وسلم)?/,
  /محمد\s*(?:ﷺ|صلى الله عليه وسلم|صلى الله عليه وآله وسلم)/,
  /المصطفى\s*(?:ﷺ|صلى الله عليه وسلم)?/,
  /خاتم الأنبياء\s*(?:ﷺ|صلى الله عليه وسلم)?/,
  /صلى الله عليه وسلم/,
  /ﷺ/,
]

/**
 * Honorific patterns — these trailing phrases on narrator names should be stripped
 * when extracting the narrator name.
 */
export const HONORIFIC_PATTERNS: RegExp[] = [
  /\s*صلى الله عليه وسلم/g,
  /\s*صلى الله عليه وآله وسلم/g,
  /\s*صلى الله عليه وآله/g,
  /\s*عليه السلام/g,
  /\s*عليه الصلاة والسلام/g,
  // Dash-wrapped رضي الله عنه must come before the plain form so it consumes the whole - ... - unit
  /\s*-\s*رض[يى] الله عنه(?:ما|م)?\s*-/g,
  /\s*رض[يى] الله عنه(?:ما|م)?/g,
  /\s*رحمه الله/g,
  /\s*حفظه الله/g,
  /\s*وفقه الله/g,
  /\s*أمه الله/g,
  // Companion epithet — "companion of the Prophet ﷺ" is a descriptor, not part of the name
  /\s*،?\s*صاحب\s+(?:النبي|رسول الله)(?:\s*ﷺ)?/g,
]

/**
 * Indicators that mark the beginning of the matan (hadith text proper).
 * These follow the isnad and introduce the Prophet's words or the narrative.
 */
export const NARRATIVE_INDICATORS: Array<{ pattern: RegExp; type: string }> = [
  // Guillemet quotes — very high confidence
  { pattern: /«/, type: 'guillemet' },
  // أن / أنه / أنهم + النبي / رسول الله (indirect attribution)
  { pattern: /(?:أن|أنه|أنها|أنهم)\s+(?:النبي|رسول الله)\s*(?:ﷺ|صلى الله عليه وسلم|صلى الله عليه وآله وسلم)?\s+قال/, type: 'attribution' },
  { pattern: /(?:أن|أنه|أنها|أنهم)\s+(?:النبي|رسول الله)\s*(?:ﷺ|صلى الله عليه وسلم|صلى الله عليه وآله وسلم)?/, type: 'attribution' },
  // عن النبي / عن رسول الله + قال (very common in Sunan literature)
  { pattern: /(?:عن)\s+(?:النبي|رسول الله)\s*(?:ﷺ|صلى الله عليه وسلم|صلى الله عليه وآله وسلم)?\s+(?:قال|يقول|فقال)/, type: 'attribution' },
  // أن رسول الله / عن رسول الله + قال (with رسول الله specifically)
  { pattern: /(?:عن|أن)\s+رسول الله\s*(?:ﷺ|صلى الله عليه وسلم|صلى الله عليه وآله وسلم)?\s+قال/, type: 'attribution' },
  // قال النبي / قال رسول الله (direct speech marker)
  { pattern: /(?:قال|فقال|يقول)\s+(?:النبي|رسول الله)\s*(?:ﷺ|صلى الله عليه وسلم|صلى الله عليه وآله وسلم)?/, type: 'speech' },
  // قال ﷺ (generic speech marker — colon alone excluded to avoid false cuts on mid-isnad قال:)
  { pattern: /(?:قال|فقال|يقول)\s*ﷺ/, type: 'speech' },
  // سمعت / سمع النبي يقول (direct hearing)
  { pattern: /سمع(?:ت|نا|ه)?\s+(?:النبي|رسول الله)\s*(?:ﷺ|صلى الله عليه وسلم|صلى الله عليه وآله وسلم)?\s+(?:يقول|قال)/, type: 'hearing' },
  // عن النبي / عن رسول الله without قال — covers مثله / نحوه / بمعناه endings
  { pattern: /عن\s+(?:النبي|رسول الله)\s*(?:ﷺ|صلى الله عليه وسلم|صلى الله عليه وآله وسلم)?/, type: 'attribution' },
]

/**
 * Clarification patterns — parenthetical or bracketed notes clarifying a narrator name.
 * e.g., "(وهو فلان)" or "[يعني فلانا]"
 */
export const CLARIFICATION_PATTERNS: RegExp[] = [
  /\(\s*(?:وهو|وهي|يعني|أي|يقصد|المعروف ب|المعروفة ب)\s+[^)]+\)/g,
  /\[\s*(?:وهو|وهي|يعني|أي|يقصد)\s+[^\]]+\]/g,
  /\(\s*هو\s+[^)]+\)/g,
]

/**
 * Editorial patterns — asides inserted by compilers/editors.
 * e.g., "(قال أبو عيسى: ...)", "(قال ابن أبي حاتم: ...)"
 */
export const EDITORIAL_PATTERNS: RegExp[] = [
  /\(\s*قال\s+[^)]+\)/g,
  /\(\s*ذكر\s+[^)]+\)/g,
  /\[\s*قال\s+[^\]]+\]/g,
  /\[\s*زاد\s+[^\]]+\]/g,
  /\[\s*كذا\s+[^\]]+\]/g,
  // Dash-wrapped route attribution notes: - قال ابن أيوب حدثنا إسماعيل بن جعفر، -
  // Common in Sahih Muslim and other collections to clarify which version a grouped narrator used
  /،?\s*-\s*قال\s+[^-]+-/g,
]

/**
 * Patterns that mark post-matan commentary.
 * e.g., "هذا حديث حسن", "قال الترمذي: ...", "إسناده صحيح"
 */
export const POST_MATAN_PATTERNS: RegExp[] = [
  /هذا حديث\s+(?:حسن|صحيح|ضعيف|غريب|منكر)/,
  /(?:قال|قال ابن|قال أبو)\s+\w+\s*:/,
  /إسناده\s+(?:صحيح|حسن|ضعيف|منقطع|مرسل)/,
  /رجاله\s+(?:ثقات|موثقون)/,
  /(?:أخرجه|رواه)\s+(?:البخاري|مسلم|أبو داود|الترمذي|النسائي|ابن ماجه|أحمد)/,
]
