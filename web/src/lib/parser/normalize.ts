// Arabic diacritics Unicode ranges
const DIACRITICS_REGEX = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g

/**
 * Strip Arabic diacritics (tashkeel) from text.
 */
export function stripDiacritics(text: string): string {
  return text.replace(DIACRITICS_REGEX, '')
}

/**
 * Normalize Arabic text for matching:
 * - Strip diacritics
 * - Normalize alef variants to bare alef
 * - Normalize taa marbuta to haa
 * - Normalize yaa variants
 * - Collapse multiple spaces
 * - Trim
 */
export function normalize(text: string): string {
  let result = stripDiacritics(text)
  // Normalize alef forms: أ إ آ ٱ → ا
  result = result.replace(/[أإآٱ]/g, 'ا')
  // Normalize taa marbuta → haa
  result = result.replace(/ة/g, 'ه')
  // Normalize dotless yaa (alef maqsura) → yaa
  result = result.replace(/ى/g, 'ي')
  // Normalize waw with hamza
  result = result.replace(/ؤ/g, 'و')
  // Normalize hamza on seat of yaa
  result = result.replace(/ئ/g, 'ي')
  // Normalize standalone hamza variants
  result = result.replace(/ء/g, '')
  // Collapse multiple whitespace
  result = result.replace(/\s+/g, ' ').trim()
  return result
}
