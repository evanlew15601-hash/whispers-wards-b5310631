import { z } from 'zod';

import { GameState } from './types';

export const SAVE_SLOT_COUNT = 6;

const STORAGE_KEY_PREFIX = 'crown-concord:save-slots';

/**
 * Storage format compatibility story:
 * - v1 (and legacy unversioned key) stored a full GameState, including a full DialogueNode.
 * - v2 stores only `currentDialogueId` (and other state fields) and hydrates the actual dialogue
 *   node from the current dialogueTree at load time.
 *
 * We read v2 first. If missing, we attempt a best-effort migration from v1/unversioned into v2.
 * Any schema validation failures are treated as an empty store/slot (never throw).
 */
export const STORAGE_VERSION = 2;
export const STORAGE_KEY_V2 = `${STORAGE_KEY_PREFIX}:v${STORAGE_VERSION}`;
export const STORAGE_KEY_V1 = `${STORAGE_KEY_PREFIX}:v1`;

export interface SaveSlotMeta {
  savedAt: string; // ISO timestamp
  turnNumber: number;
  factions: Array<{
    id: string;
    name: string;
    reputation: number;
  }>;
}

export interface SaveSlotInfo {
  id: number;
  meta: SaveSlotMeta | null;
}

export type LoadableGameState = Partial<GameState> & { currentDialogue?: { id: string } | null };

const saveSlotMetaSchema = z.object({
  savedAt: z.string(),
  turnNumber: z.number(),
  factions: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      reputation: z.number(),
    }),
  ),
});

const factionSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    motto: z.string(),
    color: z.enum(['iron', 'verdant', 'ember']),
    reputation: z.number(),
    traits: z.array(z.string()),
  })
  .passthrough();

const gameEventSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    triggered: z.boolean(),
    triggerCondition: z
      .object({
        factionId: z.string(),
        reputationThreshold: z.number(),
        direction: z.enum(['above', 'below']),
      })
      .optional(),
  })
  .passthrough();

const regionStateSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    control: z.union([z.string(), z.literal('neutral')]),
    contested: z.boolean().optional(),
  })
  .passthrough();

const tradeRouteStateSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    status: z.enum(['open', 'embargoed', 'raided']),
    affectedFactions: z.array(z.string()),
    fromRegionId: z.string().optional(),
    toRegionId: z.string().optional(),
    embargoedBy: z.string().optional(),
    untilTurn: z.number().optional(),
  })
  .passthrough();

const worldStateSchema = z
  .object({
    regions: z.record(regionStateSchema),
    tradeRoutes: z.record(tradeRouteStateSchema),
    tensions: z.record(z.record(z.number())),
    aiMemory: z.object({
      lastOfferTurn: z.record(z.number()),
      lastEmbargoTurn: z.record(z.number()),
    }),
  })
  .passthrough();

const secondaryEncounterSchema = z
  .object({
    id: z.string(),
    kind: z.enum(['embargo', 'raid', 'skirmish', 'summit']).optional(),
    routeId: z.string().optional(),
    regionId: z.string().optional(),
    title: z.string(),
    description: z.string(),
    relatedFactions: z.array(z.string()),
    expiresOnTurn: z.number(),
  })
  .passthrough();

export const persistedStateV2Schema = z
  .object({
    // Player is normalized at load time; we keep storage validation permissive so
    // a malformed `player` field doesn't invalidate an otherwise valid save.
    player: z.unknown().optional(),
    factions: z.array(factionSchema).optional(),
    events: z.array(gameEventSchema).optional(),
    knownSecrets: z.array(z.string()).optional(),
    selectedChoiceIds: z.array(z.string()).optional(),
    turnNumber: z.number().optional(),
    log: z.array(z.string()).optional(),
    rngSeed: z.number().optional(),
    world: worldStateSchema.optional(),
    pendingEncounter: secondaryEncounterSchema.nullable().optional(),
    currentScene: z.enum(['title', 'load', 'create', 'game']).optional(),
    currentDialogueId: z.string().nullable(),
  })
  .passthrough();

export const persistedSlotV2Schema = z.object({
  meta: saveSlotMetaSchema,
  state: persistedStateV2Schema,
});

export const persistedStoreV2Schema = z.object({
  version: z.literal(2),
  slots: z.record(z.unknown()),
});

type PersistedSlotV2 = z.infer<typeof persistedSlotV2Schema>;
interface PersistedStoreV2 {
  version: 2;
  slots: Record<string, PersistedSlotV2 | undefined>;
}

interface PersistedSlotV1 {
  meta: unknown;
  state: unknown;
}

interface PersistedStoreV1 {
  version: 1;
  slots: Record<string, PersistedSlotV1 | undefined>;
}

let localStorageProbeResult: boolean | null = null;

const getLocalStorage = (): Storage | null => {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
};

const isQuotaExceededError = (err: unknown) => {
  return (
    typeof DOMException !== 'undefined' &&
    err instanceof DOMException &&
    err.name === 'QuotaExceededError'
  );
};

const probeLocalStorage = (): boolean => {
  if (localStorageProbeResult !== null) return localStorageProbeResult;

  const storage = getLocalStorage();
  if (!storage) {
    localStorageProbeResult = false;
    return false;
  }

  try {
    const probeKey = `${STORAGE_KEY_PREFIX}:probe`;
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    localStorageProbeResult = true;
  } catch (err) {
    // If the quota is exceeded, storage is still accessible; individual writes may fail.
    localStorageProbeResult = isQuotaExceededError(err);
  }

  return localStorageProbeResult;
};

const safeGetItem = (key: string): string | null => {
  const storage = getLocalStorage();
  if (!storage) return null;

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

const safeSetItem = (key: string, value: string): boolean => {
  const storage = getLocalStorage();
  if (!storage) return false;

  // Cached probe guards against environments where localStorage exists but is blocked.
  if (!probeLocalStorage()) return false;

  try {
    storage.setItem(key, value);
    return true;
  } catch (err) {
    if (!isQuotaExceededError(err)) localStorageProbeResult = false;
    return false;
  }
};

const createEmptyStoreV2 = (): PersistedStoreV2 => ({
  version: 2,
  slots: {},
});

const parseStoreV2 = (raw: string): PersistedStoreV2 | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const storeParsed = persistedStoreV2Schema.safeParse(parsed);
  if (!storeParsed.success) return null;

  const slots: PersistedStoreV2['slots'] = {};
  for (const [key, value] of Object.entries(storeParsed.data.slots)) {
    const slotParsed = persistedSlotV2Schema.safeParse(value);
    if (slotParsed.success) slots[key] = slotParsed.data;
  }

  return { version: 2, slots };
};

const parseStoreV1 = (raw: string): PersistedStoreV1 | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') return null;

  const obj = parsed as { version?: unknown; slots?: unknown };
  const slots = obj.slots;

  if (!slots || typeof slots !== 'object') return null;

  // v1 also existed as a legacy object that only had `slots`.
  if (typeof obj.version === 'undefined') {
    return { version: 1, slots: slots as PersistedStoreV1['slots'] };
  }

  if (obj.version !== 1) return null;

  return parsed as PersistedStoreV1;
};

const migrateSlotV1ToV2 = (slot: PersistedSlotV1 | undefined): PersistedSlotV2 | null => {
  if (!slot || typeof slot !== 'object') return null;

  const metaParsed = saveSlotMetaSchema.safeParse((slot as PersistedSlotV1).meta);
  if (!metaParsed.success) return null;

  const s = (slot as PersistedSlotV1).state as Record<string, unknown> | null;
  const stateCandidate = {
    factions: s?.factions,
    events: s?.events,
    knownSecrets: s?.knownSecrets,
    turnNumber: s?.turnNumber,
    log: s?.log,
    rngSeed: s?.rngSeed,
    world: s?.world,
    pendingEncounter: (s?.pendingEncounter as unknown) ?? null,
    currentScene: s?.currentScene,
    currentDialogueId:
      s && typeof s.currentDialogue === 'object' && s.currentDialogue && 'id' in s.currentDialogue
        ? (s.currentDialogue as { id?: unknown }).id ?? null
        : null,
  };

  const stateParsed = persistedStateV2Schema.safeParse(stateCandidate);
  if (!stateParsed.success) return null;

  return { meta: metaParsed.data, state: stateParsed.data };
};

const migrateStoreV1ToV2 = (store: PersistedStoreV1): PersistedStoreV2 => {
  const migrated: PersistedStoreV2 = createEmptyStoreV2();

  for (const [key, slot] of Object.entries(store.slots)) {
    const migratedSlot = migrateSlotV1ToV2(slot);
    if (migratedSlot) migrated.slots[key] = migratedSlot;
  }

  return migrated;
};

const readStoreV2 = (): PersistedStoreV2 => {
  const existingV2 = safeGetItem(STORAGE_KEY_V2);
  if (existingV2) {
    const store = parseStoreV2(existingV2);
    if (store) return store;
  }

  // v2 missing/invalid: attempt best-effort migration from v1/unversioned.
  const existingV1 = safeGetItem(STORAGE_KEY_V1);
  if (existingV1) {
    const storeV1 = parseStoreV1(existingV1);
    if (storeV1) {
      const migrated = migrateStoreV1ToV2(storeV1);
      writeStoreV2(migrated);
      return migrated;
    }
  }

  const legacy = safeGetItem(STORAGE_KEY_PREFIX);
  if (legacy) {
    const storeV1 = parseStoreV1(legacy);
    if (storeV1) {
      const migrated = migrateStoreV1ToV2(storeV1);
      writeStoreV2(migrated);
      return migrated;
    }
  }

  return createEmptyStoreV2();
};

const writeStoreV2 = (store: PersistedStoreV2): boolean => {
  return safeSetItem(STORAGE_KEY_V2, JSON.stringify(store));
};

const createMeta = (state: GameState): SaveSlotMeta => ({
  savedAt: new Date().toISOString(),
  turnNumber: state.turnNumber,
  factions: state.factions.map(f => ({
    id: f.id,
    name: f.name,
    reputation: f.reputation,
  })),
});

const normalizeSlotId = (slotId: number) => {
  const id = Math.floor(slotId);
  if (id < 1 || id > SAVE_SLOT_COUNT) return null;
  return id;
};

export const listSaveSlots = (): SaveSlotInfo[] => {
  const store = readStoreV2();

  return Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => {
    const id = i + 1;
    const slot = store.slots[String(id)];

    return {
      id,
      meta: slot?.meta ? (slot.meta as SaveSlotMeta) : null,
    };
  });
};

export const saveGameToSlot = (slotId: number, state: GameState): boolean => {
  const id = normalizeSlotId(slotId);
  if (!id) return false;

  // If storage is blocked entirely, report failure rather than silently dropping saves.
  if (!probeLocalStorage()) return false;

  const store = readStoreV2();
  store.slots[String(id)] = {
    meta: createMeta(state),
    state: {
      player: state.player as any,
      factions: state.factions as any,
      events: state.events as any,
      knownSecrets: state.knownSecrets,
      selectedChoiceIds: state.selectedChoiceIds,
      turnNumber: state.turnNumber,
      log: state.log,
      rngSeed: state.rngSeed,
      world: state.world as any,
      pendingEncounter: state.pendingEncounter as any,
      currentScene: state.currentScene,
      currentDialogueId: state.currentDialogue?.id ?? null,
    },
  };

  return writeStoreV2(store);
};

export const loadGameFromSlot = (slotId: number): LoadableGameState | null => {
  const id = normalizeSlotId(slotId);
  if (!id) return null;

  const store = readStoreV2();
  const slot = store.slots[String(id)];
  if (!slot) return null;

  const { currentDialogueId, ...state } = slot.state;

  return {
    ...(state as any),
    currentDialogue: currentDialogueId ? ({ id: currentDialogueId } as LoadableGameState['currentDialogue']) : null,
  } as LoadableGameState;
};

export const deleteSaveSlot = (slotId: number): boolean => {
  const id = normalizeSlotId(slotId);
  if (!id) return false;

  if (!probeLocalStorage()) return false;

  const store = readStoreV2();
  if (!store.slots[String(id)]) return true;

  delete store.slots[String(id)];
  return writeStoreV2(store);
};
