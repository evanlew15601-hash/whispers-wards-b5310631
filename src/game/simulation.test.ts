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

  it('does not put offer/embargo actions on cooldown on turn 1 just because aiMemory was initialized', () => {
    // Regression test: initializing lastOfferTurn/lastEmbargoTurn to 0 makes cooldown checks
    // treat turn 1/2 as "recent" and can suppress offers/embargoes early-game.

    const factions = [
      initialFactions.find(f => f.id === 'ember-throne')!,
      initialFactions.find(f => f.id === 'iron-pact')!,
    ];

    const makeWorld = (tension: number) => {
      const world = createInitialWorldState(factions);
      // Remove unrelated RNG consumption from contested-region cooling.
      world.regions.greenmarch = { ...world.regions.greenmarch, contested: false };
      world.tensions['ember-throne']['iron-pact'] = tension;
      world.tensions['iron-pact']['ember-throne'] = tension;
      return world;
    };

    const findSeed = (make: () => ReturnType<typeof makeWorld>, predicate: (log: string[]) => boolean) => {
      for (let seed = 1; seed <= 2000; seed++) {
        const result = simulateWorldTurn({
          world: make(),
          factions,
          turnNumber: 1,
          rngSeed: seed,
        });
        if (predicate(result.logEntries)) return seed;
      }
      return null;
    };

    const offerSeed = findSeed(() => makeWorld(0), log => log.some(l => l.includes('olive-branch offer')));
    expect(offerSeed).not.toBeNull();

    const embargoSeed = findSeed(() => makeWorld(55), log => log.some(l => l.includes('imposes an embargo')));
    expect(embargoSeed).not.toBeNull();
  });
});
