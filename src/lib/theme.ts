// Raw hex for Recharts. Mirrors the CSS tokens in src/index.css; keep both in sync.
export const chartPalette = [
  '#5b3df5', // violet
  '#2563eb', // blue
  '#0369a1', // deep sky
  '#8e44ad', // purple
  '#d63384', // pink
  '#831843', // wine
  '#b45309', // amber
  '#7a8600', // olive
  '#8a5a3c', // brown
  '#475569', // slate
] as const

export const chartColors = {
  income: '#1fb86b',
  expense: '#ff6b4a',
  axis: '#5f6965',
  grid: '#e4dfd2',
  tooltipBg: '#ffffff',
  tooltipBorder: '#d6d0c0',
  tooltipText: '#17201b',
} as const
