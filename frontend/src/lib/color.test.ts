import { describe, expect, it } from 'vitest'
import { initials, tint } from './color'

describe('color', () => {
  it('mixes a color with white', () => {
    expect(tint('#000000', 50)).toBe('#808080')
    expect(tint('#ffffff', 22)).toBe('#ffffff')
    expect(tint('#3b82f6', 100)).toBe('#3b82f6')
    expect(tint('#3b82f6', 0)).toBe('#ffffff')
  })

  it('uses 22% by default', () => {
    expect(tint('#000000')).toBe('#c7c7c7')
  })

  it('builds initials from the first two words', () => {
    expect(initials('Padaria Trigo')).toBe('PT')
    expect(initials('dra. luana souza')).toBe('DL')
    expect(initials('Studio')).toBe('ST')
    expect(initials('  ')).toBe('?')
  })
})
