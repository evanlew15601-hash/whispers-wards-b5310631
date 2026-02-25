// World setup remains here because it is already imported by the app state hook.
// The simulation module re-exports the canonical world initializer.

// Keep this deterministic when starting a fresh game, but still varied.
export const createInitialRngSeed = () => {
  // 32-bit seed
  return (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0;
};

export { createInitialWorldState } from './simulation';
