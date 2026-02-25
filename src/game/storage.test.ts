import { beforeEach, describe, expect, it } from 'vitest';

import { tsConversationEngine } from './engine/tsConversationEngine';
import {
  STORAGE_KEY_V1,
  STORAGE_KEY_V2,
  SAVE_SLOT_COUNT,
  deleteSaveSlot,
  listSaveSlots,
  loadGameFromSlot,
  saveGameToSlot,
} from './storage';

describe('game storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('lists SAVE_SLOT_COUNT slots with stable ids', () => {
    const slots = listSaveSlots();
    expect(slots).toHaveLength(SAVE_SLOT_COUNT);
    expect(slots.map(s => s.id)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(slots.every(s => s.meta === null)).toBe(true);
  });

  it('saves, loads, and deletes a slot (v2)', () => {
    const state = tsConversationEngine.startNewGame();

    saveGameToSlot(1, state);

    const raw = localStorage.getItem(STORAGE_KEY_V2);
    expect(raw).toBeTruthy();

    const persisted = JSON.parse(raw as string) as {
      version: number;
      slots: Record<string, { state?: { currentDialogueId?: unknown } }>;
    };

    expect(persisted.version).toBe(2);
    expect(persisted.slots['1']?.state?.currentDialogueId).toBe(state.currentDialogue?.id ?? null);

    const slots = listSaveSlots();
    expect(slots[0].meta?.turnNumber).toBe(state.turnNumber);

    const loaded = loadGameFromSlot(1);
    expect(loaded?.currentScene).toBe('game');
    expect(loaded?.turnNumber).toBe(state.turnNumber);
    expect(loaded?.currentDialogue?.id).toBe(state.currentDialogue?.id);

    deleteSaveSlot(1);
    expect(loadGameFromSlot(1)).toBeNull();
    expect(listSaveSlots()[0].meta).toBeNull();
  });

  it('ignores invalid slot ids', () => {
    const state = tsConversationEngine.startNewGame();

    saveGameToSlot(0, state);
    saveGameToSlot(-1, state);
    saveGameToSlot(999, state);

    expect(listSaveSlots().every(s => s.meta === null)).toBe(true);

    expect(loadGameFromSlot(0)).toBeNull();
    expect(loadGameFromSlot(-1)).toBeNull();
    expect(loadGameFromSlot(999)).toBeNull();

    deleteSaveSlot(0);
    deleteSaveSlot(-1);
    deleteSaveSlot(999);

    expect(listSaveSlots().every(s => s.meta === null)).toBe(true);
  });

  it('handles corrupted JSON in STORAGE_KEY_V2 without throwing', () => {
    localStorage.setItem(STORAGE_KEY_V2, '{not json');

    const slots = listSaveSlots();
    expect(slots).toHaveLength(SAVE_SLOT_COUNT);
    expect(slots.every(s => s.meta === null)).toBe(true);
  });

  it('treats a schema-invalid slot as empty (v2)', () => {
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

  it('migrates legacy unversioned key (v1) to STORAGE_KEY_V2', () => {
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

    const migrated = localStorage.getItem(STORAGE_KEY_V2);
    expect(migrated).toBeTruthy();

    const parsed = JSON.parse(migrated as string) as {
      version: number;
      slots: Record<string, { state?: { currentDialogueId?: unknown } }>;
    };
    expect(parsed.version).toBe(2);
    expect(parsed.slots['1']?.state?.currentDialogueId).toBe(state.currentDialogue?.id ?? null);
  });

  it('migrates v1 key to v2 by extracting currentDialogue?.id', () => {
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

    const migrated = localStorage.getItem(STORAGE_KEY_V2);
    expect(migrated).toBeTruthy();

    const parsed = JSON.parse(migrated as string) as {
      version: number;
      slots: Record<string, { state?: { currentDialogueId?: unknown } }>;
    };
    expect(parsed.version).toBe(2);
    expect(parsed.slots['1']?.state?.currentDialogueId).toBe(state.currentDialogue?.id ?? null);
  });
});
