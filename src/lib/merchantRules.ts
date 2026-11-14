const trimPunct = (s: string) => s.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').trim()

/**
 * Derives an UPPERCASE rule pattern as a raw substring of the merchant (original spacing/punctuation kept):
 * cut at `#`/`*`, trailing codes dropped. Null if under 3 chars or if it would not match its own merchant.
 */
export function suggestPattern(merchant: string | null | undefined): string | null {
  const raw = (merchant ?? '').trim()
  let s = raw
  const hash = s.indexOf('#')
  if (hash >= 0) s = s.slice(0, hash)
  const star = s.indexOf('*')
  if (star >= 0) {
    const after = trimPunct(s.slice(star + 1))
    // Keep the prefix with a stable suffix ("PAYPAL *SPOTIFY") so the rule stays specific; a bare "TRIP" would match unrelated merchants.
    if (!(after.length >= 3 && !/\d/.test(after))) s = s.slice(0, star)
  }
  while (/\s\S*\d\S*$/.test(s)) s = s.replace(/\s+\S*\d\S*$/, '')
  const out = trimPunct(s).toUpperCase()
  // Guard: no rule beats a rule that never matches (e.g. uppercasing that changes length).
  return out.length >= 3 && matchesPattern(raw, out) ? out : null
}

/** Case-insensitive "contains", identical to the applepay-webhook matching. */
export function matchesPattern(merchant: string | null | undefined, pattern: string): boolean {
  return !!merchant && merchant.toLowerCase().includes(pattern.toLowerCase())
}

/** True when an existing rule equals the candidate or already matches the merchant (avoids redundant rules). */
export function hasRuleFor(rules: { pattern: string }[], pattern: string, merchant?: string | null): boolean {
  const p = pattern.trim().toLowerCase()
  return rules.some((r) => r.pattern.trim().toLowerCase() === p || matchesPattern(merchant ?? pattern, r.pattern))
}
