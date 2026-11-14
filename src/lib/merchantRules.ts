const trimPunct = (s: string) => s.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').trim()

/** Normalizes a raw merchant into an UPPERCASE rule pattern (cut at `*`/`#`, trailing codes dropped), or null if under 3 chars. */
export function suggestPattern(merchant: string | null | undefined): string | null {
  let s = (merchant ?? '').trim().toUpperCase().replace(/\s+/g, ' ')
  const hash = s.indexOf('#')
  if (hash >= 0) s = s.slice(0, hash)
  const star = s.indexOf('*')
  if (star >= 0) {
    const before = s.slice(0, star)
    const after = trimPunct(s.slice(star + 1))
    s = after.length >= 3 && !/\d/.test(after) ? after : before
  }
  const tokens = s.trim().split(' ')
  while (tokens.length > 1 && /\d/.test(tokens[tokens.length - 1])) tokens.pop()
  const out = trimPunct(tokens.join(' '))
  return out.length >= 3 ? out : null
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
