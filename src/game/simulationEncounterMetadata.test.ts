import { describe, expect, it } from 'vitest';

import { initialFactions } from './data';
import { createEncounterFromCandidate, createInitialWorldState } from './simulation';

describe('pendingEncounter metadata', () => {
  it('includes kind and optional routeId/regionId when an encounter is generated', () => {
    const world = createInitialWorldState(initialFactions);
    const factionNameById = new Map(initialFactions.map(f => [f.id, f.name] as const));

    const embargo = createEncounterFromCandidate(
      { kind: 'embargo', a: 'ember-throne', b: 'iron-pact', routeId: 'ashroad' },
      10,
      1,
      factionNameById,
      world,
    );

    expect(embargo.kind).toBe('embargo');
    expect(embargo.routeId).toBe('ashroad');
    expect(world.tradeRoutes[embargo.routeId!]).toBeTruthy();
    expect(embargo.regionId).toBeUndefined();

    const raid = createEncounterFromCandidate(
      { kind: 'raid', a: 'iron-pact', b: 'verdant-court', routeId: 'passcourier' },
      10,
      2,
      factionNameById,
      world,
    );

    expect(raid.kind).toBe('raid');
    expect(raid.routeId).toBe('passcourier');
    expect(world.tradeRoutes[raid.routeId!]).toBeTruthy();
    expect(raid.regionId).toBeUndefined();

    const skirmish = createEncounterFromCandidate(
      { kind: 'skirmish', a: 'iron-pact', b: 'verdant-court', regionId: 'greenmarch' },
      10,
      3,
      factionNameById,
      world,
    );

    expect(skirmish.kind).toBe('skirmish');
    expect(skirmish.regionId).toBe('greenmarch');
    expect(world.regions[skirmish.regionId!]).toBeTruthy();
    expect(skirmish.routeId).toBeUndefined();
  });
});
