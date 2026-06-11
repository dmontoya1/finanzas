const CACHE_KEY = 'fx_eur_cop'
const TTL_MS = 12 * 60 * 60 * 1000 // 12h
export const FALLBACK_RATE = 4600

interface CachedRate { rate: number; at: number }

/** Tasa actual COP por 1 EUR, con caché local y fallback. */
export async function getEurCopRate(): Promise<number> {
  const cached = readCache()
  if (cached && Date.now() - cached.at < TTL_MS) return cached.rate
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/EUR')
    const data = await res.json()
    const rate = data?.rates?.COP
    if (typeof rate === 'number' && rate > 0) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ rate, at: Date.now() } satisfies CachedRate))
      return rate
    }
  } catch { /* red caída: usar lo que haya */ }
  return cached?.rate ?? FALLBACK_RATE
}

function readCache(): CachedRate | null {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') } catch { return null }
}
