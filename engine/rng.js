// Seedable RNG so combat is reproducible in tests/sims.
// Mulberry32 — tiny, fast, good enough for a game.

export function createRng(seed = Date.now()) {
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next, // float in [0, 1)
    chance: (pct) => next() * 100 < pct, // pct is 0..100
    int: (min, max) => Math.floor(next() * (max - min + 1)) + min, // inclusive
    pick: (arr) => arr[Math.floor(next() * arr.length)],
  };
}
