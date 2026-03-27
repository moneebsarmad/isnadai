/**
 * Pre-clean raw hadith text before parsing.
 * Handles:
 * - Hadith number prefixes (e.g., "١٢٣ -", "1234.")
 * - Page markers (e.g., "[صفحة ١٢]", "(ص:١٢)")
 * - كما قد prefix (editorial note indicating parallel)
 * - Quote normalization (« » → standard, " " → standard)
 * - ﵁ (sallallahu alayhi wasallam glyph) — keep it but normalize whitespace around it
 * - Whitespace normalization
 */
export function preClean(text: string): string {
  let result = text

  // Remove BOM and zero-width characters
  result = result.replace(/[\uFEFF\u200B\u200C\u200D\u200E\u200F]/g, '')

  // Normalize Arabic-Indic numerals to Western
  result = result.replace(/[٠١٢٣٤٥٦٧٨٩]/g, (c) => String(c.codePointAt(0)! - 0x0660))

  // Remove hadith number prefixes: lines starting with a number followed by dash/dot/colon
  result = result.replace(/^\s*\d+\s*[-–—.:]\s*/m, '')
  // Also handle parenthesized number at start: (١٢٣)
  result = result.replace(/^\s*\(\d+\)\s*/m, '')

  // Remove page markers like [صفحة 12] or (ص:12) or «صفحة:12»
  result = result.replace(/[\[(\u00AB]\s*صفحة\s*:?\s*\d+\s*[\])\u00BB]/g, '')
  result = result.replace(/[\[(\u00AB]\s*ص\s*:?\s*\d+\s*[\])\u00BB]/g, '')

  // Remove كما قد prefix (indicates this is a parallel reference)
  result = result.replace(/^كما قد\s+/, '')
  result = result.replace(/^كما\s+/, '')

  // Normalize all matan-quote variants to guillemets «» so boundary.ts can detect them
  // Curly double quotes " " → «»
  result = result.replace(/\u201C/g, '\u00AB').replace(/\u201D/g, '\u00BB')
  // Low-9 quotation „ → «
  result = result.replace(/\u201E/g, '\u00AB')
  // Straight " used as a matan boundary (e.g. some Sunan editions) → «»
  // Only convert when it encloses Arabic text — heuristic: convert standalone " that isn't inside a word
  result = result.replace(/"\s*([\u0600-\u06FF])/g, '«$1')
  result = result.replace(/([\u0600-\u06FF\s])\s*"/g, '$1»')
  // Normalize curly single quotes
  result = result.replace(/[\u2018\u2019]/g, "'")

  // Normalize whitespace: tabs and newlines to spaces
  result = result.replace(/[\t\r\n]+/g, ' ')

  // Collapse multiple spaces
  result = result.replace(/  +/g, ' ')

  // Trim
  result = result.trim()

  return result
}
