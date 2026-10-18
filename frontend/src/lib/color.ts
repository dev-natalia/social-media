/** Mistura `pct`% da cor com branco (fundo claro dos blocos; o texto fica sempre escuro). */
export function tint(hex: string, pct = 22): string {
  const p = pct / 100
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return (
    '#' +
    channels
      .map((c) => Math.round(c * p + 255 * (1 - p)))
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
  )
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
