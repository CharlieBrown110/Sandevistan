/**
 * Seeded PRNG using the Mulberry32 algorithm.
 * Guarantees identical sequence across browser and Node.js environments.
 */
export function createMulberry32(seed: number) {
  let a = (seed >>> 0) || 1;
  return function next(): number {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns a random integer in [min, max] inclusive
 */
export function randomInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}
