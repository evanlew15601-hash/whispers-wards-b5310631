export type RngSeed = number;

const UINT32_RANGE = 0x100000000;
const NON_ZERO_FALLBACK_SEED = 0x6d2b79f5;

export const normalizeSeed = (seed: number): number => {
  const s = seed >>> 0;
  return s === 0 ? NON_ZERO_FALLBACK_SEED : s;
};

// xorshift32 (fast, deterministic, 32-bit)
export const nextSeed = (seed: number): number => {
  let x = normalizeSeed(seed);
  x ^= (x << 13) >>> 0;
  x ^= x >>> 17;
  x ^= (x << 5) >>> 0;
  return x >>> 0;
};

export const rngFloat01 = (seed: number): { value: number; seed: number } => {
  const next = nextSeed(seed);
  return { value: next / UINT32_RANGE, seed: next };
};

export const rngIntInclusive = (
  seed: number,
  min: number,
  max: number
): { value: number; seed: number } => {
  if (max < min) throw new Error('rngIntInclusive: max must be >= min');
  const { value: r, seed: next } = rngFloat01(seed);
  const span = max - min + 1;
  return { value: min + Math.floor(r * span), seed: next };
};

export const rngPickOne = <T>(
  seed: number,
  items: readonly T[]
): { value: T; seed: number } => {
  if (items.length === 0) throw new Error('rngPickOne: items must be non-empty');
  const { value: idx, seed: next } = rngIntInclusive(seed, 0, items.length - 1);
  return { value: items[idx]!, seed: next };
};

export const rngWeightedChoice = <T>(
  seed: number,
  items: readonly T[],
  weights: readonly number[]
): { value: T; seed: number } => {
  if (items.length === 0) throw new Error('rngWeightedChoice: items must be non-empty');
  if (items.length !== weights.length) {
    throw new Error('rngWeightedChoice: items and weights must have the same length');
  }

  let total = 0;
  for (const w of weights) total += Math.max(0, w);
  if (total <= 0) {
    return rngPickOne(seed, items);
  }

  const { value: r, seed: next } = rngFloat01(seed);
  let roll = r * total;

  for (let i = 0; i < items.length; i++) {
    roll -= Math.max(0, weights[i]!);
    if (roll <= 0) return { value: items[i]!, seed: next };
  }

  return { value: items[items.length - 1]!, seed: next };
};
