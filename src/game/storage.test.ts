import { beforeEach, describe, expect, it, vi } from 'vitest';

import { tsConversationEngine } from './engine/tsConversationEngine';

describe('game storage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.resetModules();
  });

  const importStorage = () => import('./storage');

  it('lists SAVE_SLOT_COUNT slots with stable ids', async () => {
    const { listSaveSlots, SAVE_SLOT_COUNT } = await importStorage();

    const slots = listSaveSlots();
    expect(slots).toHaveLength(SAVE_SLOT_COUNT);
    expect(slots.map(s => s.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(slots.every(s => s.meta === null)).toBe(true);
  });

  it('saves, loads, and deletes a slot (v2)', async () => {
    const { STORAGE_KEY_V2, deleteSaveSlot, listSaveSlots, loadGameFromSlot, saveGameToSlot } =
      await importStorage();

    const state = tsConversationEngine.startNewGame();

    expect(saveGameToSlot(1, state)).toBe(true);

    const raw = localStorage.getItem(STORAGE_KEY_V2);
    expect(raw).toBeTruthy();

    const persisted = JSON.parse(raw as string) as {
      version: number;
      slots: Record<string, { state?: { currentDialogueId?: unknown; player?: unknown; encounterReturnDialogueId?: unknown } }>;
    };

    expect(persisted.version).toBe(2);
    expect(persisted.slots['1']?.state?.currentDialogueId).toBe(state.currentDialogue?.id ?? null);
    expect(persisted.slots['1']?.state?.player).toEqual(state.player);
    expect(persisted.slots['1']?.state?.encounterReturnDialogueId).toBeNull();

    const slots = listSaveSlots();
    expect(slots[0].meta?.turnNumber).toBe(state.turnNumber);

    const loaded = loadGameFromSlot(1);
    expect(loaded?.currentScene).toBe('game');
    expect(loaded?.turnNumber).toBe(state.turnNumber);
    expect(loaded?.currentDialogue?.id).toBe(state.currentDialogue?.id);
    expect(loaded?.player).toEqual(state.player);
    expect((loaded as any)?.encounterReturnDialogueId).toBeNull();

    expect(deleteSaveSlot(1)).toBe(true);
    expect(loadGameFromSlot(1)).toBeNull();
    expect(listSaveSlots()[0].meta).toBeNull();
  });

  it('ignores invalid slot ids', async () => {
    const { deleteSaveSlot, listSaveSlots, loadGameFromSlot, saveGameToSlot } = await importStorage();

    const state = tsConversationEngine.startNewGame();

    expect(saveGameToSlot(0, state)).toBe(false);
    expect(saveGameToSlot(-1, state)).toBe(false);
    expect(saveGameToSlot(999, state)).toBe(false);

    expect(listSaveSlots().every(s => s.meta === null)).toBe(true);

    expect(loadGameFromSlot(0)).toBeNull();
    expect(loadGameFromSlot(-1)).toBeNull();
    expect(loadGameFromSlot(999)).toBeNull();

    expect(deleteSaveSlot(0)).toBe(false);
    expect(deleteSaveSlot(-1)).toBe(false);
    expect(deleteSaveSlot(999)).toBe(false);

    expect(listSaveSlots().every(s => s.meta === null)).toBe(true);
  });

  it('handles corrupted JSON in STORAGE_KEY_V2 without throwing', async () => {
    const { STORAGE_KEY_V2, listSaveSlots, SAVE_SLOT_COUNT } = await importStorage();

    localStorage.setItem(STORAGE_KEY_V2, '{not json');

    const slots = listSaveSlots();
    expect(slots).toHaveLength(SAVE_SLOT_COUNT);
    expect(slots.every(s => s.meta === null)).toBe(true);
  });

  it('treats a schema-invalid slot as empty (v2)', async () => {
    const { STORAGE_KEY_V2, listSaveSlots } = await importStorage();

    localStorage.setItem(
      STORAGE_KEY_V2,
      JSON.stringify({
        version: 2,
        slots: {
          '1': {
            meta: 'not meta',
            state: { currentDialogueId: null },
          },
        },
      }),
    );

    const slots = listSaveSlots();
    expect(slots[0].meta).toBeNull();
  });

  it('accepts a v2 slot with a partial player profile object', async () => {
    const { STORAGE_KEY_V2, listSaveSlots, loadGameFromSlot } = await importStorage();

    const state = tsConversationEngine.startNewGame();

    localStorage.setItem(
      STORAGE_KEY_V2,
      JSON.stringify({
        version: 2,
        slots: {
          '1': {
            meta: {
              savedAt: new Date('2020-01-01T00:00:00.000Z').toISOString(),
              turnNumber: state.turnNumber,
              factions: state.factions.map(f => ({ id: f.id, name: f.name, reputation: f.reputation })),
            },
            state: {
              currentDialogueId: state.currentDialogue?.id ?? null,
              player: { name: 'Test Envoy' },
            },
          },
        },
      }),
    );

    const slots = listSaveSlots();
    expect(slots[0].meta?.turnNumber).toBe(state.turnNumber);

    const loaded = loadGameFromSlot(1);
    expect((loaded as any)?.player).toEqual({ name: 'Test Envoy' });
  });

  it('migrates legacy unversioned key (v1) to STORAGE_KEY_V2', async () => {
    const { STORAGE_KEY_V2, listSaveSlots, loadGameFromSlot } = await importStorage();

    const state = tsConversationEngine.startNewGame();

    // Create a legacy store: { slots: { ... } } (no version field, full state).
    localStorage.setItem(
      'crown-concord:save-slots',
      JSON.stringify({
        slots: {
          '1': {
            meta: {
              savedAt: new Date('2020-01-01T00:00:00.000Z').toISOString(),
              turnNumber: state.turnNumber,
              factions: state.factions.map(f => ({ id: f.id, name: f.name, reputation: f.reputation })),
            },
            state,
          },
        },
      }),
    );

    const slots = listSaveSlots();
    expect(slots[0].meta?.turnNumber).toBe(state.turnNumber);

    const loaded = loadGameFromSlot(1);
    expect(loaded?.player).toEqual(state.player);

    const migrated = localStorage.getItem(STORAGE_KEY_V2);
    expect(migrated).toBeTruthy();

    const parsed = JSON.parse(migrated as string) as {
      version: number;
      slots: Record<string, { state?: { currentDialogueId?: unknown } }>;
    };
    expect(parsed.version).toBe(2);
    expect(parsed.slots['1']?.state?.currentDialogueId).toBe(state.currentDialogue?.id ?? null);
  });

  it('migrates v1 key to v2 by extracting currentDialogue?.id', async () => {
    const { STORAGE_KEY_V1, STORAGE_KEY_V2, loadGameFromSlot } = await importStorage();

    const state = tsConversationEngine.startNewGame();

    localStorage.setItem(
      STORAGE_KEY_V1,
      JSON.stringify({
        version: 1,
        slots: {
          '1': {
            meta: {
              savedAt: new Date('2020-01-01T00:00:00.000Z').toISOString(),
              turnNumber: state.turnNumber,
              factions: state.factions.map(f => ({ id: f.id, name: f.name, reputation: f.reputation })),
            },
            state,
          },
        },
      }),
    );

    expect(localStorage.getItem(STORAGE_KEY_V2)).toBeNull();

    const loaded = loadGameFromSlot(1);
    expect(loaded?.currentDialogue?.id).toBe(state.currentDialogue?.id);
    expect(loaded?.player).toEqual(state.player);

    const migrated = localStorage.getItem(STORAGE_KEY_V2);
    expect(migrated).toBeTruthy();

    const parsed = JSON.parse(migrated as string) as {
      version: number;
      slots: Record<string, { state?: { currentDialogueId?: unknown } }>;
    };
    expect(parsed.version).toBe(2);
    expect(parsed.slots['1']?.state?.currentDialogueId).toBe(state.currentDialogue?.id ?? null);
  });

  it('returns false when localStorage.setItem throws during save', async () => {
    const { loadGameFromSlot, saveGameToSlot } = await importStorage();

    const state = tsConversationEngine.startNewGame();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err =
        typeof DOMException !== 'undefined'
          ? new DOMException('Quota exceeded', 'QuotaExceededError')
          : Object.assign(new Error('Quota exceeded'), { name: 'QuotaExceededError' });
      throw err;
    });

    expect(saveGameToSlot(1, state)).toBe(false);
    expect(loadGameFromSlot(1)).toBeNull();
  });

  it('returns false when localStorage.setItem throws during delete', async () => {
    const { deleteSaveSlot, loadGameFromSlot, saveGameToSlot } = await importStorage();

    const state = tsConversationEngine.startNewGame();
    expect(saveGameToSlot(1, state)).toBe(true);

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err =
        typeof DOMException !== 'undefined'
          ? new DOMException('Quota exceeded', 'QuotaExceededError')
          : Object.assign(new Error('Quota exceeded'), { name: 'QuotaExceededError' });
      throw err;
    });

    expect(deleteSaveSlot(1)).toBe(false);
    expect(loadGameFromSlot(1)).not.toBeNull();
  });
});
