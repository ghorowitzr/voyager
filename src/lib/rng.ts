/**
 * Deterministic pseudo-random generation. Seeding a voyage's events and
 * encounters from a stable hash is what makes a ship's *story* identical every
 * time you reload — the core trick that lets the world persist while you're away.
 */

/** Hash a string to a 32-bit unsigned integer seed. */
export function hashStr(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

/** Mulberry32 PRNG — returns a function yielding floats in [0,1). */
export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
