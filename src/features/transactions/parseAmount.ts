/** "12,5" -> 12.5, "1.234,50" -> 1234.5, "1.234" -> 1234. Null for empty, NaN, <= 0. */
export function parseAmountInput(raw: string): number | null {
  const s = raw.trim()
  if (!/^\d([\d.,]*\d)?$/.test(s)) return null
  // Last separator followed by 1-2 digits is the decimal point; anything else is thousands.
  const m = s.match(/^(.*)[.,](\d{1,2})$/)
  const n = Number(m ? `${m[1].replace(/[.,]/g, '')}.${m[2]}` : s.replace(/[.,]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}
