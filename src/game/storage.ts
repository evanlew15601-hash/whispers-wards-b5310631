import { GameState } from './types';

export const SAVE_SLOT_COUNT = 6;

const STORAGE_KEY_PREFIX = 'crown-concord:save-slots';
export const STORAGE_VERSION = 1;
export const STORAGE_KEY_V1 = `${STORAGE_KEY_PREFIX}:v${STORAGE_VERSION}`;

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

interface PersistedSlotV1 {
  meta: SaveSlotMeta;
  state: GameState;
}

interface PersistedStoreV1 {
  version: 1;
  slots: Record<string, PersistedSlotV1 | undefined>;
}

const isLocalStorageAvailable = () => {
  try {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  } catch {
    return false;
  }
};

const createEmptyStoreV1 = (): PersistedStoreV1 => ({
  version: 1,
  slots: {},
});

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

  // Accept either an explicit version (v1) or a legacy object that only had `slots`.
  if (typeof obj.version === 'undefined') {
    return { version: 1, slots: slots as PersistedStoreV1['slots'] };
  }

  if (obj.version !== 1) return null;

  return parsed as PersistedStoreV1;
};

const readStoreV1 = (): PersistedStoreV1 => {
  if (!isLocalStorageAvailable()) return createEmptyStoreV1();

  const existing = window.localStorage.getItem(STORAGE_KEY_V1);
  if (existing) {
    const store = parseStoreV1(existing);
    if (store) return store;
  }

  // Backward-compat: migrate unversioned key if it matches our schema.
  const legacy = window.localStorage.getItem(STORAGE_KEY_PREFIX);
  if (legacy) {
    const migrated = parseStoreV1(legacy);
    if (migrated) {
      window.localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(migrated));
      return migrated;
    }
  }

  return createEmptyStoreV1();
};

const writeStoreV1 = (store: PersistedStoreV1) => {
  if (!isLocalStorageAvailable()) return;
  window.localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(store));
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
  const store = readStoreV1();

  return Array.from({ length: SAVE_SLOT_COUNT }, (_, i) => {
    const id = i + 1;
    const slot = store.slots[String(id)];

    return {
      id,
      meta: slot?.meta ?? null,
    };
  });
};

export const saveGameToSlot = (slotId: number, state: GameState): void => {
  const id = normalizeSlotId(slotId);
  if (!id) return;

  const store = readStoreV1();
  store.slots[String(id)] = {
    meta: createMeta(state),
    state,
  };
  writeStoreV1(store);
};

export const loadGameFromSlot = (slotId: number): GameState | null => {
  const id = normalizeSlotId(slotId);
  if (!id) return null;

  const store = readStoreV1();
  const slot = store.slots[String(id)];
  return slot?.state ?? null;
};

export const deleteSaveSlot = (slotId: number): void => {
  const id = normalizeSlotId(slotId);
  if (!id) return;

  const store = readStoreV1();
  delete store.slots[String(id)];
  writeStoreV1(store);
};
