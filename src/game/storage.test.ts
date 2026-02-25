import { beforeEach, describe, expect, it } from 'vitest';

import { tsConversationEngine } from './engine/tsConversationEngine';
import {
  STORAGE_KEY_V1,
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

  it('saves, loads, and deletes a slot', () => {
    const state = tsConversationEngine.startNewGame();

    saveGameToSlot(1, state);

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

  it('handles corrupted JSON in STORAGE_KEY_V1 without throwing', () => {
    localStorage.setItem(STORAGE_KEY_V1, '{not json');

    const slots = listSaveSlots();
    expect(slots).toHaveLength(SAVE_SLOT_COUNT);
    expect(slots.every(s => s.meta === null)).toBe(true);
  });

  it('migrates legacy unversioned key to STORAGE_KEY_V1', () => {
    const state = tsConversationEngine.startNewGame();
    saveGameToSlot(1, state);

    const v1Raw = localStorage.getItem(STORAGE_KEY_V1);
    expect(v1Raw).toBeTruthy();

    const parsed = JSON.parse(v1Raw as string) as Record<string, unknown>;
    // Simulate a legacy store: { slots: { ... } } (no version field).
    delete (parsed as { version?: unknown }).version;

    localStorage.removeItem(STORAGE_KEY_V1);
    localStorage.setItem('crown-concord:save-slots', JSON.stringify(parsed));

    const slots = listSaveSlots();
    expect(slots[0].meta?.turnNumber).toBe(state.turnNumber);

    const migrated = localStorage.getItem(STORAGE_KEY_V1);
    expect(migrated).toBeTruthy();
  });
});
