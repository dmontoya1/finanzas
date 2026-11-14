import { chartPalette } from './theme'

// Deterministic: same id/name always maps to the same palette color (no DB column needed).
export function categoryColor(key: string): string {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return chartPalette[h % chartPalette.length]
}
