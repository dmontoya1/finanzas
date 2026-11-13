// Raw hex for Recharts. Mirrors the CSS tokens in src/index.css; keep both in sync.
export const chartPalette = [
  '#5b3df5', // violet
  '#0f9d58', // green
  '#e8502f', // coral
  '#c47a00', // amber
  '#0b84d4', // blue
  '#d63384', // pink
  '#7a8600', // olive
  '#8a5a3c', // brown
  '#0d9488', // teal
  '#8e44ad', // purple
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
