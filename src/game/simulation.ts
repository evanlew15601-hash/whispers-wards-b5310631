import { Faction, SecondaryEncounter, TradeRouteState, WorldState } from './types';
import { normalizeSeed, rngIntInclusive, rngPickOne, rngWeightedChoice } from './rng';

export interface SimulateWorldTurnArgs {
  world: WorldState;
  factions: Faction[];
  turnNumber: number;
  rngSeed: number;
}

export interface SimulateWorldTurnResult {
  world: WorldState;
  pendingEncounter: SecondaryEncounter | null;
  logEntries: string[];
  rngSeed: number;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

// A very negative baseline ensures the first few turns are never considered "on cooldown"
// for offers/embargoes.
const AI_MEMORY_TURN_BASELINE = -999;

const cloneWorld = (world: WorldState): WorldState => ({
  regions: Object.fromEntries(Object.entries(world.regions).map(([k, v]) => [k, { ...v }])) as WorldState['regions'],
  tradeRoutes: Object.fromEntries(Object.entries(world.tradeRoutes).map(([k, v]) => [k, { ...v }])) as WorldState['tradeRoutes'],
  tensions: Object.fromEntries(
    Object.entries(world.tensions).map(([k, row]) => [k, { ...row }])
  ) as WorldState['tensions'],
  aiMemory: {
    lastOfferTurn: { ...world.aiMemory.lastOfferTurn },
    lastEmbargoTurn: { ...world.aiMemory.lastEmbargoTurn },
  },
});

const sortedRecordValues = <T extends { id: string }>(record: Record<string, T>): T[] => {
  return Object.values(record).slice().sort((a, b) => a.id.localeCompare(b.id));
};

const ensureTensionMatrix = (world: WorldState, factionIds: string[]) => {
  for (const a of factionIds) {
    if (!world.tensions[a]) world.tensions[a] = {};
    for (const b of factionIds) {
      if (world.tensions[a][b] == null) world.tensions[a][b] = a === b ? 0 : 0;
    }
  }
};

const getTension = (world: WorldState, a: string, b: string) => {
  return world.tensions[a]?.[b] ?? 0;
};

const setTensionPair = (world: WorldState, a: string, b: string, value: number) => {
  const v = clamp(value, 0, 100);
  world.tensions[a][b] = v;
  world.tensions[b][a] = v;
};

const adjustTensionPair = (world: WorldState, a: string, b: string, delta: number) => {
  setTensionPair(world, a, b, getTension(world, a, b) + delta);
};

const routesBetween = (world: WorldState, a: string, b: string): TradeRouteState[] => {
  return sortedRecordValues(world.tradeRoutes).filter(r => r.affectedFactions.includes(a) && r.affectedFactions.includes(b));
};

type FactionActionType = 'offer' | 'embargo' | 'raid' | 'skirmish' | 'consolidate';

export interface EncounterCandidate {
  kind: 'embargo' | 'raid' | 'skirmish' | 'summit';
  a: string;
  b: string;
  routeId?: string;
  regionId?: string;
}

const actionWeightsForFaction = (
  faction: Faction,
  maxTension: number
): Record<FactionActionType, number> => {
  const weights: Record<FactionActionType, number> = {
    offer: 1,
    embargo: 1,
    raid: 1,
    skirmish: 1,
    consolidate: 1,
  };

  if (maxTension >= 70) {
    weights.offer -= 0.4;
    weights.embargo += 0.6;
    weights.raid += 1.2;
    weights.skirmish += 0.8;
    weights.consolidate -= 0.2;
  } else if (maxTension >= 40) {
    weights.offer += 0.2;
    weights.embargo += 0.4;
    weights.raid += 0.4;
  } else {
    weights.offer += 0.8;
    weights.embargo -= 0.4;
    weights.raid -= 0.7;
    weights.skirmish -= 0.3;
    weights.consolidate += 0.6;
  }

  if (faction.traits.includes('Militaristic')) {
    weights.raid += 0.9;
    weights.skirmish += 0.5;
    weights.offer -= 0.2;
  }

  if (faction.traits.includes('Mercantile')) {
    weights.embargo += 0.7;
    weights.offer += 0.2;
    weights.raid -= 0.2;
  }

  if (faction.traits.includes('Patient')) {
    weights.consolidate += 0.5;
    weights.raid -= 0.2;
  }

  if (faction.traits.includes('Honorbound')) {
    weights.embargo -= 0.2;
  }

  return weights;
};

export const createInitialWorldState = (factions: Faction[]): WorldState => {
  const factionIds = factions.map(f => f.id);

  const tensions: WorldState['tensions'] = {};
  for (const a of factionIds) {
    tensions[a] = {};
    for (const b of factionIds) {
      tensions[a][b] = a === b ? 0 : 0;
    }
  }

  const aiMemory: WorldState['aiMemory'] = {
    lastOfferTurn: {},
    lastEmbargoTurn: {},
  };

  for (const id of factionIds) {
    // Use a very negative baseline so the first few turns are never considered "on cooldown".
    aiMemory.lastOfferTurn[id] = AI_MEMORY_TURN_BASELINE;
    aiMemory.lastEmbargoTurn[id] = AI_MEMORY_TURN_BASELINE;
  }

  return {
    regions: {
      crownlands: { id: 'crownlands', name: 'Crownlands', control: 'neutral', contested: false },
      greenmarch: { id: 'greenmarch', name: 'Greenmarch Pass', control: 'neutral', contested: true },
      ironhold: { id: 'ironhold', name: 'Ironhold Marches', control: 'iron-pact', contested: false },
      verdantwilds: { id: 'verdantwilds', name: 'Verdant Wilds', control: 'verdant-court', contested: false },
      embercoast: { id: 'embercoast', name: 'Ember Coast', control: 'ember-throne', contested: false },
    },
    tradeRoutes: {
      ashroad: {
        id: 'ashroad',
        name: 'Ash Road',
        status: 'open',
        affectedFactions: ['ember-throne', 'iron-pact'],
        fromRegionId: 'embercoast',
        toRegionId: 'ironhold',
      },
      rootway: {
        id: 'rootway',
        name: 'Rootway Caravans',
        status: 'open',
        affectedFactions: ['verdant-court', 'ember-throne'],
        fromRegionId: 'verdantwilds',
        toRegionId: 'embercoast',
      },
      passcourier: {
        id: 'passcourier',
        name: 'Pass Couriers',
        status: 'open',
        affectedFactions: ['iron-pact', 'verdant-court'],
        fromRegionId: 'ironhold',
        toRegionId: 'verdantwilds',
      },
    },
    tensions,
    aiMemory,
  };
};

export const simulateWorldTurn = (args: SimulateWorldTurnArgs): SimulateWorldTurnResult => {
  const logEntries: string[] = [];
  let seed = normalizeSeed(args.rngSeed);

  const factionIds = args.factions.map(f => f.id);
  const factionNameById = new Map(args.factions.map(f => [f.id, f.name] as const));

  const nextWorld = cloneWorld(args.world);

  ensureTensionMatrix(nextWorld, factionIds);

  for (const id of factionIds) {
    // Backward-compat: older saves may have missing AI memory. Use a very negative baseline
    // so early turns are never considered "on cooldown".
    if (nextWorld.aiMemory.lastOfferTurn[id] == null) nextWorld.aiMemory.lastOfferTurn[id] = AI_MEMORY_TURN_BASELINE;
    if (nextWorld.aiMemory.lastEmbargoTurn[id] == null) nextWorld.aiMemory.lastEmbargoTurn[id] = AI_MEMORY_TURN_BASELINE;
  }

  // Resolve time-based trade route statuses.
  for (const route of sortedRecordValues(nextWorld.tradeRoutes)) {
    if (route.status === 'open') continue;
    if (route.untilTurn != null && route.untilTurn <= args.turnNumber) {
      nextWorld.tradeRoutes[route.id] = {
        ...route,
        status: 'open',
        embargoedBy: undefined,
        untilTurn: undefined,
      };
      logEntries.push(`Trade route reopened: ${route.name}.`);
    }
  }

  // Contested regions can cool off over time.
  for (const region of sortedRecordValues(nextWorld.regions)) {
    if (!region.contested) continue;
    const { value: roll, seed: next } = rngIntInclusive(seed, 1, 100);
    seed = next;

    if (roll <= 20) {
      nextWorld.regions[region.id] = { ...region, contested: false };
      logEntries.push(`Tensions ease in ${region.name}; open conflict subsides.`);
    }
  }

  const encounterCandidates: EncounterCandidate[] = [];

  for (const actingFaction of args.factions) {
    if (factionIds.length < 2) break;

    const others = factionIds.filter(id => id !== actingFaction.id);
    const tensionsToOthers = others.map(id => ({ id, value: getTension(nextWorld, actingFaction.id, id) }));

    let maxTension = 0;
    for (const t of tensionsToOthers) maxTension = Math.max(maxTension, t.value);

    const targetWeights = tensionsToOthers.map(t => 1 + t.value);
    const targetPick = rngWeightedChoice(seed, tensionsToOthers, targetWeights);
    seed = targetPick.seed;
    const targetId = targetPick.value.id;

    const base = actionWeightsForFaction(actingFaction, maxTension);

    const offerCooldown = 3;
    const embargoCooldown = 4;

    if (nextWorld.aiMemory.lastOfferTurn[actingFaction.id] >= args.turnNumber - (offerCooldown - 1)) {
      base.offer = 0;
    }

    if (nextWorld.aiMemory.lastEmbargoTurn[actingFaction.id] >= args.turnNumber - (embargoCooldown - 1)) {
      base.embargo = 0;
    }

    const viableRoutes = routesBetween(nextWorld, actingFaction.id, targetId);
    if (viableRoutes.length === 0) {
      base.embargo = 0;
      base.raid = 0;
    } else {
      if (!viableRoutes.some(r => r.status === 'open')) {
        base.raid = 0;
      }
    }

    const actions: FactionActionType[] = ['offer', 'embargo', 'raid', 'skirmish', 'consolidate'];
    const weights = actions.map(a => Math.max(0, base[a]));

    const actionPick = rngWeightedChoice(seed, actions, weights);
    seed = actionPick.seed;
    const action = actionPick.value;

    const aName = factionNameById.get(actingFaction.id) ?? actingFaction.id;
    const bName = factionNameById.get(targetId) ?? targetId;

    if (action === 'offer') {
      const { value: delta, seed: next } = rngIntInclusive(seed, 5, 15);
      seed = next;
      adjustTensionPair(nextWorld, actingFaction.id, targetId, -delta);
      nextWorld.aiMemory.lastOfferTurn[actingFaction.id] = args.turnNumber;
      logEntries.push(`${aName} extends an olive-branch offer to ${bName} (-${delta} tension).`);

      if (delta >= 12) {
        encounterCandidates.push({ kind: 'summit', a: actingFaction.id, b: targetId });
      }

      continue;
    }

    if (action === 'embargo') {
      const choices = viableRoutes.filter(r => r.status === 'open');
      if (choices.length === 0) {
        logEntries.push(`${aName} threatens sanctions against ${bName}, but commerce is already disrupted.`);
        continue;
      }

      const pick = rngPickOne(seed, choices);
      seed = pick.seed;
      const route = pick.value;

      const { value: duration, seed: next1 } = rngIntInclusive(seed, 2, 4);
      seed = next1;

      const { value: delta, seed: next2 } = rngIntInclusive(seed, 10, 18);
      seed = next2;

      nextWorld.tradeRoutes[route.id] = {
        ...route,
        status: 'embargoed',
        embargoedBy: actingFaction.id,
        untilTurn: args.turnNumber + duration,
      };

      adjustTensionPair(nextWorld, actingFaction.id, targetId, delta);
      nextWorld.aiMemory.lastEmbargoTurn[actingFaction.id] = args.turnNumber;

      logEntries.push(`${aName} imposes an embargo on ${route.name} against ${bName} (+${delta} tension).`);
      encounterCandidates.push({ kind: 'embargo', a: actingFaction.id, b: targetId, routeId: route.id });
      continue;
    }

    if (action === 'raid') {
      const openRoutes = viableRoutes.filter(r => r.status === 'open');
      if (openRoutes.length === 0) {
        logEntries.push(`${aName} rattles sabers at ${bName}, but finds no caravans to strike.`);
        continue;
      }

      const pick = rngPickOne(seed, openRoutes);
      seed = pick.seed;
      const route = pick.value;

      const { value: delta, seed: next } = rngIntInclusive(seed, 15, 25);
      seed = next;

      nextWorld.tradeRoutes[route.id] = {
        ...route,
        status: 'raided',
        untilTurn: args.turnNumber + 1,
      };

      adjustTensionPair(nextWorld, actingFaction.id, targetId, delta);
      logEntries.push(`${aName} sponsors raids along ${route.name} targeting ${bName} (+${delta} tension).`);
      encounterCandidates.push({ kind: 'raid', a: actingFaction.id, b: targetId, routeId: route.id });
      continue;
    }

    if (action === 'skirmish') {
      const regions = sortedRecordValues(nextWorld.regions);
      const targetRegions = regions.filter(r => r.control === targetId || r.control === 'neutral');
      if (targetRegions.length === 0) {
        logEntries.push(`${aName} mobilizes near ${bName}, but no border flashpoint emerges.`);
        continue;
      }

      const pick = rngPickOne(seed, targetRegions);
      seed = pick.seed;
      const region = pick.value;

      const { value: delta, seed: next } = rngIntInclusive(seed, 8, 16);
      seed = next;

      nextWorld.regions[region.id] = { ...region, contested: true };
      adjustTensionPair(nextWorld, actingFaction.id, targetId, delta);

      logEntries.push(`${aName} agitates for control near ${region.name}; ${bName} responds (+${delta} tension).`);
      encounterCandidates.push({ kind: 'skirmish', a: actingFaction.id, b: targetId, regionId: region.id });
      continue;
    }

    // consolidate
    const { value: soften, seed: next } = rngIntInclusive(seed, 0, 2);
    seed = next;
    if (soften > 0) {
      for (const other of others) {
        adjustTensionPair(nextWorld, actingFaction.id, other, -soften);
      }
      logEntries.push(`${aName} consolidates internally; regional tensions cool slightly (-${soften} tension).`);
    } else {
      logEntries.push(`${aName} consolidates internally; the realm holds its breath.`);
    }
  }

  let pendingEncounter: SecondaryEncounter | null = null;
  if (encounterCandidates.length > 0) {
    const pick = rngPickOne(seed, encounterCandidates);
    seed = pick.seed;
    pendingEncounter = createEncounterFromCandidate(
      pick.value,
      args.turnNumber,
      seed,
      factionNameById,
      nextWorld
    );
  }

  return {
    world: nextWorld,
    pendingEncounter,
    logEntries,
    rngSeed: seed,
  };
};

export const createEncounterFromCandidate = (
  c: EncounterCandidate,
  turnNumber: number,
  seed: number,
  factionNameById: Map<string, string>,
  world: WorldState
): SecondaryEncounter => {
  const aName = factionNameById.get(c.a) ?? c.a;
  const bName = factionNameById.get(c.b) ?? c.b;

  const id = `enc-${turnNumber}-${(seed >>> 0).toString(16).padStart(8, '0')}`;

  if (c.kind === 'embargo' && c.routeId) {
    const route = world.tradeRoutes[c.routeId];
    const routeName = route?.name ?? c.routeId;
    return {
      id,
      kind: 'embargo',
      routeId: c.routeId,
      title: `Embargo crisis on ${routeName}`,
      description: `${aName} has cut commerce along ${routeName}, and ${bName} is searching for leverage in return. A mediator could defuse this before it escalates into raids.`,
      relatedFactions: [c.a, c.b],
      expiresOnTurn: turnNumber + 2,
    };
  }

  if (c.kind === 'raid' && c.routeId) {
    const route = world.tradeRoutes[c.routeId];
    const routeName = route?.name ?? c.routeId;
    return {
      id,
      kind: 'raid',
      routeId: c.routeId,
      title: `Caravans attacked on ${routeName}`,
      description: `Bandits bearing ${aName}'s colors have struck along ${routeName}. ${bName} demands restitution, while merchants whisper that this was no mere crime of opportunity.`,
      relatedFactions: [c.a, c.b],
      expiresOnTurn: turnNumber + 2,
    };
  }

  if (c.kind === 'skirmish' && c.regionId) {
    const region = world.regions[c.regionId];
    const regionName = region?.name ?? c.regionId;
    return {
      id,
      kind: 'skirmish',
      regionId: c.regionId,
      title: `Skirmish rumors in ${regionName}`,
      description: `Scouts report rising violence around ${regionName}. ${aName} and ${bName} accuse each other of provocation, and the next clash could draw in allies.`,
      relatedFactions: [c.a, c.b],
      expiresOnTurn: turnNumber + 2,
    };
  }

  // summit (or fallback)
  return {
    id,
    kind: 'summit',
    title: 'A quiet diplomatic summit',
    description: `${aName} signals willingness to negotiate with ${bName}. If either side is publicly slighted, tensions may rebound — but a durable accord is possible.`,
    relatedFactions: [c.a, c.b],
    expiresOnTurn: turnNumber + 2,
  };
};
