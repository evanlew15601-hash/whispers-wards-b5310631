import { describe, expect, it } from 'vitest';
import { initialFactions } from './data';
import { createInitialWorldState, simulateWorldTurn } from './simulation';

describe('world simulation', () => {
  it('is deterministic given the same inputs', () => {
    const seed = 123456789;

    const worldA = createInitialWorldState(initialFactions);
    const resultA = simulateWorldTurn({
      world: worldA,
      factions: initialFactions,
      turnNumber: 1,
      rngSeed: seed,
    });

    const worldB = createInitialWorldState(initialFactions);
    const resultB = simulateWorldTurn({
      world: worldB,
      factions: initialFactions,
      turnNumber: 1,
      rngSeed: seed,
    });

    expect(resultA).toEqual(resultB);
  });

  it('does not mutate the input world object', () => {
    const world = createInitialWorldState(initialFactions);
    const snapshot = JSON.parse(JSON.stringify(world));

    simulateWorldTurn({
      world,
      factions: initialFactions,
      turnNumber: 1,
      rngSeed: 42,
    });

    expect(world).toEqual(snapshot);
  });

  it('advances rngSeed', () => {
    const world = createInitialWorldState(initialFactions);
    const result = simulateWorldTurn({
      world,
      factions: initialFactions,
      turnNumber: 1,
      rngSeed: 42,
    });

    expect(result.rngSeed).not.toBe(42);
  });
});
