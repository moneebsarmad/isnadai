/**
 * Arabic text normalization utilities for matan comparison.
 * Strips diacritics and normalizes variant letter forms so that
 * the same word written differently (with/without tashkeel, alef variants, etc.)
 * is treated as a match.
 */

const DIACRITIC_RE = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g

export function normalizeWord(word: string): string {
  return word
    .replace(DIACRITIC_RE, '')           // strip all diacritics / tashkeel
    .replace(/[أإآٱ]/g, 'ا')             // normalize alef variants → bare alef
    .replace(/ة/g, 'ه')                  // ta marbuta → ha
    .replace(/ى/g, 'ي')                  // alef maqsura → ya
    .replace(/[،,.؟?!:;()\[\]«»]/g, '') // strip punctuation
    .trim()
}

export function tokenize(text: string): { orig: string; norm: string }[] {
  return text
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0)
    .map(w => ({ orig: w, norm: normalizeWord(w) }))
    .filter(w => w.norm.length > 0)
}
