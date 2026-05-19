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
