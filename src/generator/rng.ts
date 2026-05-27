/**
 * mulberry32: small, fast, seedable PRNG. Returns a function that yields
 * uniformly distributed floats in [0, 1).
 *
 * Source: https://en.wikipedia.org/wiki/Linear_congruential_generator (mulberry32 variant).
 * Used by tests for deterministic generation.
 */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
