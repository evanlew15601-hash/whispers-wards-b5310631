import type { DialogueChoice, DialogueNode, SecondaryEncounter, SecondaryEncounterKind, WorldState } from './types';

import { pickEncounterVignette } from './encounterVignettes';

type EncounterResolutionKey =
  | 'embargo-lift'
  | 'embargo-extend'
  | 'embargo-compromise'
  | 'raid-patrol'
  | 'raid-retaliate'
  | 'raid-compensate'
  | 'skirmish-ceasefire'
  | 'skirmish-back-a'
  | 'skirmish-back-b'
  | 'summit-accord'
  | 'summit-slight-a'
  | 'summit-slight-b';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const cloneWorld = (world: WorldState): WorldState => ({
  regions: Object.fromEntries(Object.entries(world.regions).map(([k, v]) => [k, { ...v }])) as WorldState['regions'],
  tradeRoutes: Object.fromEntries(Object.entries(world.tradeRoutes).map(([k, v]) => [k, { ...v }])) as WorldState['tradeRoutes'],
  tensions: Object.fromEntries(Object.entries(world.tensions).map(([k, row]) => [k, { ...row }])) as WorldState['tensions'],
  aiMemory: {
    lastOfferTurn: { ...world.aiMemory.lastOfferTurn },
    lastEmbargoTurn: { ...world.aiMemory.lastEmbargoTurn },
  },
});

const ensureTensionPair = (world: WorldState, a: string, b: string) => {
  if (!world.tensions[a]) world.tensions[a] = {};
  if (!world.tensions[b]) world.tensions[b] = {};
  if (world.tensions[a][b] == null) world.tensions[a][b] = 0;
  if (world.tensions[b][a] == null) world.tensions[b][a] = 0;
};

const getTension = (world: WorldState, a: string, b: string) => {
  ensureTensionPair(world, a, b);
  return world.tensions[a][b] ?? 0;
};

const setTensionPair = (world: WorldState, a: string, b: string, value: number) => {
  ensureTensionPair(world, a, b);
  const v = clamp(value, 0, 100);
  world.tensions[a][b] = v;
  world.tensions[b][a] = v;
};

const adjustTensionPair = (world: WorldState, a: string, b: string, delta: number) => {
  setTensionPair(world, a, b, getTension(world, a, b) + delta);
};

const choiceIdFor = (encounterId: string, resolution: EncounterResolutionKey) => `encounter:${encounterId}:${resolution}`;

export function parseEncounterResolutionChoiceId(choiceId: string): { encounterId: string; resolution: EncounterResolutionKey } | null {
  const prefix = 'encounter:';
  if (!choiceId.startsWith(prefix)) return null;

  const rest = choiceId.slice(prefix.length);
  const parts = rest.split(':');
  if (parts.length !== 2) return null;

  const [encounterId, resolutionRaw] = parts;
  const resolution = resolutionRaw as EncounterResolutionKey;

  const allowed: Set<string> = new Set([
    'embargo-lift',
    'embargo-extend',
    'embargo-compromise',
    'raid-patrol',
    'raid-retaliate',
    'raid-compensate',
    'skirmish-ceasefire',
    'skirmish-back-a',
    'skirmish-back-b',
    'summit-accord',
    'summit-slight-a',
    'summit-slight-b',
  ]);

  if (!allowed.has(resolution)) return null;

  return { encounterId, resolution };
}

function resolutionChoicesFor(
  kind: SecondaryEncounterKind,
  encounterId: string,
  choiceTexts?: [string, string, string],
): DialogueChoice[] {
  const mk = (resolution: EncounterResolutionKey, text: string): DialogueChoice => ({
    id: choiceIdFor(encounterId, resolution),
    text,
    effects: [],
    nextNodeId: null,
  });

  if (kind === 'embargo') {
    const texts = choiceTexts ?? [
      'Broker a swift lifting of the embargo.',
      'Negotiate a compromise charter and reopen trade.',
      'Stand firm; let the embargo bite until concessions are made.',
    ];

    return [mk('embargo-lift', texts[0]), mk('embargo-compromise', texts[1]), mk('embargo-extend', texts[2])];
  }

  if (kind === 'raid') {
    const texts = choiceTexts ?? [
      'Deploy patrols and restore safe passage immediately.',
      'Demand compensation and guarantee escorts for future caravans.',
      'Authorize reprisals; make an example of the raiders.',
    ];

    return [mk('raid-patrol', texts[0]), mk('raid-compensate', texts[1]), mk('raid-retaliate', texts[2])];
  }

  if (kind === 'skirmish') {
    const texts = choiceTexts ?? [
      'Call for a ceasefire and neutral observers.',
      'Endorse the first claimant and press their advantage.',
      'Endorse the second claimant and press their advantage.',
    ];

    return [mk('skirmish-ceasefire', texts[0]), mk('skirmish-back-a', texts[1]), mk('skirmish-back-b', texts[2])];
  }

  // summit
  const texts = choiceTexts ?? [
    'Draft a binding accord and have both sides sign.',
    'Publicly rebuke the first delegation.',
    'Publicly rebuke the second delegation.',
  ];

  return [mk('summit-accord', texts[0]), mk('summit-slight-a', texts[1]), mk('summit-slight-b', texts[2])];
}

export function buildEncounterDialogueNode(encounter: SecondaryEncounter): DialogueNode {
  const kind: SecondaryEncounterKind = encounter.kind ?? 'summit';
  const vignette = pickEncounterVignette(encounter);

  return {
    id: `encounter:${encounter.id}`,
    speaker: vignette.speaker,
    text: `${vignette.preface}\n\n${encounter.title}\n\n${encounter.description}\n\n${vignette.prompt}`,
    choices: resolutionChoicesFor(kind, encounter.id, vignette.choiceTexts),
  };
}

export function applyExpiredEncounterConsequence(args: {
  world: WorldState;
  encounter: SecondaryEncounter;
  turnNumber: number;
}): { world: WorldState; logEntries: string[] } {
  const nextWorld = cloneWorld(args.world);

  const kind: SecondaryEncounterKind = args.encounter.kind ?? 'summit';
  const a = args.encounter.relatedFactions[0] ?? 'unknown-a';
  const b = args.encounter.relatedFactions[1] ?? 'unknown-b';

  const routeId = args.encounter.routeId;
  const regionId = args.encounter.regionId;

  const logEntries: string[] = [];

  if ((kind === 'embargo' || kind === 'raid') && routeId && nextWorld.tradeRoutes[routeId]) {
    const route = nextWorld.tradeRoutes[routeId];
    const untilTurn = Math.max(route.untilTurn ?? -Infinity, args.turnNumber + 1);

    if (kind === 'embargo') {
      nextWorld.tradeRoutes[routeId] = {
        ...route,
        status: 'embargoed',
        embargoedBy: a,
        untilTurn,
      };
    } else {
      nextWorld.tradeRoutes[routeId] = {
        ...route,
        status: 'raided',
        embargoedBy: undefined,
        untilTurn,
      };
    }
  }

  if (kind === 'skirmish' && regionId && nextWorld.regions[regionId]) {
    const region = nextWorld.regions[regionId];
    nextWorld.regions[regionId] = { ...region, contested: true };
  }

  adjustTensionPair(nextWorld, a, b, 5);
  logEntries.push(`⏳ Encounter expired: ${args.encounter.title} (+5 tension)`);

  return { world: nextWorld, logEntries };
}

export function resolveEncounter(args: {
  world: WorldState;
  encounter: SecondaryEncounter;
  turnNumber: number;
  resolution: EncounterResolutionKey;
}): { world: WorldState; logEntries: string[] } {
  const nextWorld = cloneWorld(args.world);

  const kind: SecondaryEncounterKind = args.encounter.kind ?? 'summit';
  const a = args.encounter.relatedFactions[0] ?? 'unknown-a';
  const b = args.encounter.relatedFactions[1] ?? 'unknown-b';

  const routeId = args.encounter.routeId;
  const regionId = args.encounter.regionId;

  const logEntries: string[] = [];

  if (kind === 'embargo') {
    const routeName = routeId ? nextWorld.tradeRoutes[routeId]?.name ?? routeId : 'the trade routes';

    if (args.resolution === 'embargo-lift') {
      if (routeId && nextWorld.tradeRoutes[routeId]) {
        const route = nextWorld.tradeRoutes[routeId];
        nextWorld.tradeRoutes[routeId] = { ...route, status: 'open', embargoedBy: undefined, untilTurn: undefined };
      }
      adjustTensionPair(nextWorld, a, b, -12);
      logEntries.push(`⚔ Embargo lifted on ${routeName} (-12 tension).`);
    } else if (args.resolution === 'embargo-compromise') {
      if (routeId && nextWorld.tradeRoutes[routeId]) {
        const route = nextWorld.tradeRoutes[routeId];
        nextWorld.tradeRoutes[routeId] = { ...route, status: 'open', embargoedBy: undefined, untilTurn: undefined };
      }
      adjustTensionPair(nextWorld, a, b, -5);
      logEntries.push(`⚔ Compromise reached on ${routeName} (-5 tension).`);
    } else if (args.resolution === 'embargo-extend') {
      if (routeId && nextWorld.tradeRoutes[routeId]) {
        const route = nextWorld.tradeRoutes[routeId];
        nextWorld.tradeRoutes[routeId] = {
          ...route,
          status: 'embargoed',
          embargoedBy: a,
          untilTurn: args.turnNumber + 3,
        };
      }
      adjustTensionPair(nextWorld, a, b, 8);
      logEntries.push(`⚔ Embargo escalated on ${routeName} (+8 tension).`);
    }

    return { world: nextWorld, logEntries };
  }

  if (kind === 'raid') {
    const routeName = routeId ? nextWorld.tradeRoutes[routeId]?.name ?? routeId : 'the trade routes';

    if (args.resolution === 'raid-patrol') {
      if (routeId && nextWorld.tradeRoutes[routeId]) {
        const route = nextWorld.tradeRoutes[routeId];
        nextWorld.tradeRoutes[routeId] = { ...route, status: 'open', embargoedBy: undefined, untilTurn: undefined };
      }
      adjustTensionPair(nextWorld, a, b, -10);
      logEntries.push(`⚔ Patrols secure ${routeName}; commerce resumes (-10 tension).`);
    } else if (args.resolution === 'raid-compensate') {
      if (routeId && nextWorld.tradeRoutes[routeId]) {
        const route = nextWorld.tradeRoutes[routeId];
        nextWorld.tradeRoutes[routeId] = { ...route, status: 'open', embargoedBy: undefined, untilTurn: undefined };
      }
      adjustTensionPair(nextWorld, a, b, -4);
      logEntries.push(`⚔ Compensation pledged for losses on ${routeName} (-4 tension).`);
    } else if (args.resolution === 'raid-retaliate') {
      if (routeId && nextWorld.tradeRoutes[routeId]) {
        const route = nextWorld.tradeRoutes[routeId];
        nextWorld.tradeRoutes[routeId] = { ...route, status: 'raided', embargoedBy: undefined, untilTurn: args.turnNumber + 2 };
      }
      adjustTensionPair(nextWorld, a, b, 10);
      logEntries.push(`⚔ Reprisals ordered after raids on ${routeName} (+10 tension).`);
    }

    return { world: nextWorld, logEntries };
  }

  if (kind === 'skirmish') {
    const regionName = regionId ? nextWorld.regions[regionId]?.name ?? regionId : 'the borderlands';

    if (args.resolution === 'skirmish-ceasefire') {
      if (regionId && nextWorld.regions[regionId]) {
        const region = nextWorld.regions[regionId];
        nextWorld.regions[regionId] = { ...region, contested: false };
      }
      adjustTensionPair(nextWorld, a, b, -8);
      logEntries.push(`⚔ Ceasefire brokered in ${regionName} (-8 tension).`);
    } else if (args.resolution === 'skirmish-back-a') {
      if (regionId && nextWorld.regions[regionId]) {
        const region = nextWorld.regions[regionId];
        nextWorld.regions[regionId] = { ...region, control: a, contested: false };
      }
      adjustTensionPair(nextWorld, a, b, 6);
      logEntries.push(`⚔ Claim endorsed in ${regionName} (+6 tension).`);
    } else if (args.resolution === 'skirmish-back-b') {
      if (regionId && nextWorld.regions[regionId]) {
        const region = nextWorld.regions[regionId];
        nextWorld.regions[regionId] = { ...region, control: b, contested: false };
      }
      adjustTensionPair(nextWorld, a, b, 6);
      logEntries.push(`⚔ Claim endorsed in ${regionName} (+6 tension).`);
    }

    return { world: nextWorld, logEntries };
  }

  // summit
  if (args.resolution === 'summit-accord') {
    adjustTensionPair(nextWorld, a, b, -15);
    logEntries.push('⚔ Accord signed at the summit (-15 tension).');
  } else if (args.resolution === 'summit-slight-a') {
    adjustTensionPair(nextWorld, a, b, 10);
    logEntries.push('⚔ The summit ends in public rebuke (+10 tension).');
  } else if (args.resolution === 'summit-slight-b') {
    adjustTensionPair(nextWorld, a, b, 10);
    logEntries.push('⚔ The summit ends in public rebuke (+10 tension).');
  }

  return { world: nextWorld, logEntries };
}
