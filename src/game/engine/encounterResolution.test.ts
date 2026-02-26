import { describe, expect, it } from 'vitest';

import type { GameState, SecondaryEncounter, WorldState } from '../types';

import { initialFactions } from '../data';
import { buildEncounterDialogueNode, parseEncounterResolutionChoiceId } from '../encounters';
import { createInitialWorldState } from '../simulation';
import { tsConversationEngine } from './tsConversationEngine';

const setTensionPair = (world: WorldState, a: string, b: string, value: number) => {
  world.tensions[a][b] = value;
  world.tensions[b][a] = value;
};

const createBaseState = (world: WorldState, encounter: SecondaryEncounter): GameState => {
  const base = tsConversationEngine.createInitialState();
  const encounterNode = buildEncounterDialogueNode(encounter);

  return {
    ...base,
    currentScene: 'game',
    factions: initialFactions.map(f => ({ ...f })),
    log: [],
    turnNumber: 10,
    rngSeed: 1,
    world,
    currentDialogue: encounterNode,
    pendingEncounter: encounter,
  };
};

describe('encounter resolution (engine integration)', () => {
  it('resolves embargo encounters and clears pendingEncounter', () => {
    const a = 'ember-throne';
    const b = 'iron-pact';
    const routeId = 'ashroad';

    const baseWorld = createInitialWorldState(initialFactions);
    baseWorld.tradeRoutes[routeId] = { ...baseWorld.tradeRoutes[routeId], status: 'embargoed', embargoedBy: a, untilTurn: 15 };
    setTensionPair(baseWorld, a, b, 50);

    const encounter: SecondaryEncounter = {
      id: 'enc-embargo',
      kind: 'embargo',
      routeId,
      title: 'Embargo crisis',
      description: 'Test embargo encounter.',
      relatedFactions: [a, b],
      expiresOnTurn: 12,
    };

    const node = buildEncounterDialogueNode(encounter);

    for (const choice of node.choices) {
      const start = createBaseState(JSON.parse(JSON.stringify(baseWorld)) as WorldState, encounter);
      const next = tsConversationEngine.applyChoice(start, choice);

      expect(next.pendingEncounter).toBeNull();
      expect(next.currentDialogue?.id).toBe('concord-hub');
      expect(next.log.some(l => l.startsWith('⚔'))).toBe(true);

      const resolution = parseEncounterResolutionChoiceId(choice.id)!.resolution;
      const tension = next.world.tensions[a][b];
      const route = next.world.tradeRoutes[routeId];

      if (resolution === 'embargo-lift') {
        expect(route.status).toBe('open');
        expect(route.embargoedBy).toBeUndefined();
        expect(route.untilTurn).toBeUndefined();
        expect(tension).toBe(38);
      } else if (resolution === 'embargo-compromise') {
        expect(route.status).toBe('open');
        expect(route.embargoedBy).toBeUndefined();
        expect(route.untilTurn).toBeUndefined();
        expect(tension).toBe(45);
      } else if (resolution === 'embargo-extend') {
        expect(route.status).toBe('embargoed');
        expect(route.embargoedBy).toBe(a);
        expect(route.untilTurn).toBe(13);
        expect(tension).toBe(58);
      } else {
        throw new Error(`unexpected resolution: ${resolution}`);
      }
    }
  });

  it('resolves raid encounters and clears pendingEncounter', () => {
    const a = 'iron-pact';
    const b = 'ember-throne';
    const routeId = 'ashroad';

    const baseWorld = createInitialWorldState(initialFactions);
    baseWorld.tradeRoutes[routeId] = { ...baseWorld.tradeRoutes[routeId], status: 'raided', untilTurn: 11, embargoedBy: undefined };
    setTensionPair(baseWorld, a, b, 50);

    const encounter: SecondaryEncounter = {
      id: 'enc-raid',
      kind: 'raid',
      routeId,
      title: 'Raid report',
      description: 'Test raid encounter.',
      relatedFactions: [a, b],
      expiresOnTurn: 12,
    };

    const node = buildEncounterDialogueNode(encounter);

    for (const choice of node.choices) {
      const start = createBaseState(JSON.parse(JSON.stringify(baseWorld)) as WorldState, encounter);
      const next = tsConversationEngine.applyChoice(start, choice);

      expect(next.pendingEncounter).toBeNull();
      expect(next.currentDialogue?.id).toBe('concord-hub');
      expect(next.log.some(l => l.startsWith('⚔'))).toBe(true);

      const resolution = parseEncounterResolutionChoiceId(choice.id)!.resolution;
      const tension = next.world.tensions[a][b];
      const route = next.world.tradeRoutes[routeId];

      if (resolution === 'raid-patrol') {
        expect(route.status).toBe('open');
        expect(route.untilTurn).toBeUndefined();
        expect(tension).toBe(40);
      } else if (resolution === 'raid-compensate') {
        expect(route.status).toBe('open');
        expect(route.untilTurn).toBeUndefined();
        expect(tension).toBe(46);
      } else if (resolution === 'raid-retaliate') {
        expect(route.status).toBe('raided');
        expect(route.untilTurn).toBe(12);
        expect(tension).toBe(60);
      } else {
        throw new Error(`unexpected resolution: ${resolution}`);
      }
    }
  });

  it('resolves skirmish encounters and clears pendingEncounter', () => {
    const a = 'iron-pact';
    const b = 'verdant-court';
    const regionId = 'crownlands';

    const baseWorld = createInitialWorldState(initialFactions);
    baseWorld.regions[regionId] = { ...baseWorld.regions[regionId], contested: true, control: 'neutral' };
    setTensionPair(baseWorld, a, b, 50);

    const encounter: SecondaryEncounter = {
      id: 'enc-skirmish',
      kind: 'skirmish',
      regionId,
      title: 'Skirmish rumors',
      description: 'Test skirmish encounter.',
      relatedFactions: [a, b],
      expiresOnTurn: 12,
    };

    const node = buildEncounterDialogueNode(encounter);

    for (const choice of node.choices) {
      const start = createBaseState(JSON.parse(JSON.stringify(baseWorld)) as WorldState, encounter);
      const next = tsConversationEngine.applyChoice(start, choice);

      expect(next.pendingEncounter).toBeNull();
      expect(next.currentDialogue?.id).toBe('concord-hub');
      expect(next.log.some(l => l.startsWith('⚔'))).toBe(true);

      const resolution = parseEncounterResolutionChoiceId(choice.id)!.resolution;
      const tension = next.world.tensions[a][b];
      const region = next.world.regions[regionId];

      if (resolution === 'skirmish-ceasefire') {
        expect(region.contested).toBe(false);
        expect(region.control).toBe('neutral');
        expect(tension).toBe(42);
      } else if (resolution === 'skirmish-back-a') {
        expect(region.contested).toBe(false);
        expect(region.control).toBe(a);
        expect(tension).toBe(56);
      } else if (resolution === 'skirmish-back-b') {
        expect(region.contested).toBe(false);
        expect(region.control).toBe(b);
        expect(tension).toBe(56);
      } else {
        throw new Error(`unexpected resolution: ${resolution}`);
      }
    }
  });

  it('resolves summit encounters and clears pendingEncounter', () => {
    const a = 'verdant-court';
    const b = 'ember-throne';

    const baseWorld = createInitialWorldState(initialFactions);
    setTensionPair(baseWorld, a, b, 50);

    const encounter: SecondaryEncounter = {
      id: 'enc-summit',
      kind: 'summit',
      title: 'Summit',
      description: 'Test summit encounter.',
      relatedFactions: [a, b],
      expiresOnTurn: 12,
    };

    const node = buildEncounterDialogueNode(encounter);

    for (const choice of node.choices) {
      const start = createBaseState(JSON.parse(JSON.stringify(baseWorld)) as WorldState, encounter);
      const next = tsConversationEngine.applyChoice(start, choice);

      expect(next.pendingEncounter).toBeNull();
      expect(next.currentDialogue?.id).toBe('concord-hub');
      expect(next.log.some(l => l.startsWith('⚔'))).toBe(true);

      const resolution = parseEncounterResolutionChoiceId(choice.id)!.resolution;
      const tension = next.world.tensions[a][b];

      if (resolution === 'summit-accord') {
        expect(tension).toBe(35);
      } else if (resolution === 'summit-slight-a') {
        expect(tension).toBe(60);
      } else if (resolution === 'summit-slight-b') {
        expect(tension).toBe(60);
      } else {
        throw new Error(`unexpected resolution: ${resolution}`);
      }
    }
  });
});