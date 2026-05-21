/** Exact fractions — no floating point, so equality is always trustworthy. */
export interface Frac {
  n: number
  d: number
}

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))

export const frac = (n: number, d: number): Frac => {
  const g = gcd(n, d) || 1
  const s = d < 0 ? -1 : 1
  return { n: (s * n) / g, d: (s * d) / g }
}

export const add = (a: Frac, b: Frac): Frac => frac(a.n * b.d + b.n * a.d, a.d * b.d)
export const half = (a: Frac): Frac => frac(a.n, a.d * 2)
export const eq = (a: Frac, b: Frac): boolean => a.n * b.d === b.n * a.d
export const cmp = (a: Frac, b: Frac): number => a.n * b.d - b.n * a.d
export const toNum = (a: Frac): number => a.n / a.d
export const label = (a: Frac): string => (a.d === 1 ? `${a.n}` : `${a.n}/${a.d}`)
export const isZero = (a: Frac): boolean => a.n === 0

const CARDINAL = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const DENOM_SINGULAR: Record<number, string> = {
  2: 'half',
  3: 'third',
  4: 'quarter',
  5: 'fifth',
  6: 'sixth',
  7: 'seventh',
  8: 'eighth',
  9: 'ninth',
  10: 'tenth',
}
const DENOM_PLURAL: Record<number, string> = {
  2: 'halves',
  3: 'thirds',
  4: 'quarters',
  5: 'fifths',
  6: 'sixths',
  7: 'sevenths',
  8: 'eighths',
  9: 'ninths',
  10: 'tenths',
}

/** Human-readable, speakable form of a fraction. `1/2` → "one half",
 *  `3/4` → "three quarters". Falls back to "n over d" for shapes we
 *  don't have a word for. */
export const spokenLabel = (a: Frac): string => {
  if (a.d === 1) return a.n === 1 ? 'one' : (CARDINAL[a.n] ?? `${a.n}`)
  const num = CARDINAL[a.n] ?? `${a.n}`
  if (a.n === 1 && DENOM_SINGULAR[a.d]) return `${num} ${DENOM_SINGULAR[a.d]}`
  if (DENOM_PLURAL[a.d]) return `${num} ${DENOM_PLURAL[a.d]}`
  return `${a.n} over ${a.d}`
}
