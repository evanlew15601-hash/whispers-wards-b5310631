import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { STORAGE_KEY_V1 } from './storage';
import { dialogueTree, initialEvents, initialFactions } from './data';

vi.mock('./engine/uqmWasmRuntime', () => ({
  loadUqmWasmRuntime: () => Promise.reject(new Error('no wasm')),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useGameState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.resetModules();
  });

  it('loadFromSlot hydrates missing fields and restores dialogue by id', async () => {
    const factions = initialFactions.map(f => ({ ...f }));
    const events = initialEvents.map(e => ({ ...e }));

    const partialState = {
      currentScene: 'load',
      factions,
      currentDialogue: { id: 'opening' },
      events,
      knownSecrets: ['qa-secret'],
      turnNumber: 7,
      log: ['qa log'],
      // intentionally partial player data (should be normalized)
      player: { name: '  ', pronouns: 'they/them' },
      // rngSeed/world/pendingEncounter intentionally omitted
    };

    const meta = {
      savedAt: new Date('2020-01-01T00:00:00.000Z').toISOString(),
      turnNumber: partialState.turnNumber,
      factions: factions.map(f => ({ id: f.id, name: f.name, reputation: f.reputation })),
    };

    const store = {
      version: 1 as const,
      slots: {
        '1': {
          meta,
          state: partialState,
        },
      },
    };

    localStorage.setItem(STORAGE_KEY_V1, JSON.stringify(store));

    const { useGameState } = await import('./useGameState');

    const { result } = renderHook(() => useGameState());

    await act(async () => {
      result.current.loadFromSlot(1);
    });

    expect(result.current.state.currentScene).toBe('game');
    expect(result.current.state.player).toBeTruthy();
    expect(typeof result.current.state.player.name).toBe('string');
    expect(result.current.state.player.name.length).toBeGreaterThan(0);
    expect(result.current.state.player.name).toBe('Envoy');
    expect(['they/them', 'she/her', 'he/him']).toContain(result.current.state.player.pronouns);
    expect(typeof result.current.state.player.portraitId).toBe('string');
    expect(result.current.state.player.portraitId.length).toBeGreaterThan(0);
    expect(typeof result.current.state.rngSeed).toBe('number');
    expect(result.current.state.world).toBeTruthy();
    expect(Object.keys(result.current.state.world.regions).length).toBeGreaterThan(0);
    expect(Object.keys(result.current.state.world.tradeRoutes).length).toBeGreaterThan(0);

    expect(result.current.state.currentDialogue?.id).toBe('opening');
    expect(dialogueTree[result.current.state.currentDialogue?.id ?? '']).toBeTruthy();
  });

  it('openLoadScreen/backToTitle transition scenes', async () => {
    const { useGameState } = await import('./useGameState');
    const { result } = renderHook(() => useGameState());

    await act(async () => {
      result.current.openLoadScreen();
    });
    expect(result.current.state.currentScene).toBe('load');

    await act(async () => {
      result.current.backToTitle();
    });
    expect(result.current.state.currentScene).toBe('title');
  });

  it('enterPendingEncounter swaps dialogue to a generated encounter node when pendingEncounter exists', async () => {
    const partialState = {
      currentScene: 'game',
      factions: initialFactions.map(f => ({ ...f })),
      currentDialogue: { id: 'concord-hub' },
      events: initialEvents.map(e => ({ ...e })),
      knownSecrets: [],
      turnNumber: 10,
      log: [],
      pendingEncounter: {
        id: 'enc-test',
        kind: 'embargo',
        routeId: 'ashroad',
        title: 'Embargo crisis on Ash Road',
        description: 'Test encounter.',
        relatedFactions: ['ember-throne', 'iron-pact'],
        expiresOnTurn: 12,
      },
      // rngSeed/world intentionally omitted to exercise hydration.
    };

    const meta = {
      savedAt: new Date('2020-01-01T00:00:00.000Z').toISOString(),
      turnNumber: partialState.turnNumber,
      factions: partialState.factions.map((f: { id: string; name: string; reputation: number }) => ({
        id: f.id,
        name: f.name,
        reputation: f.reputation,
      })),
    };

    localStorage.setItem(
      STORAGE_KEY_V1,
      JSON.stringify({
        version: 1,
        slots: {
          '1': { meta, state: partialState },
        },
      }),
    );

    const { useGameState } = await import('./useGameState');
    const { result } = renderHook(() => useGameState());

    await act(async () => {
      result.current.loadFromSlot(1);
    });

    expect(result.current.state.pendingEncounter?.id).toBe('enc-test');
    expect(result.current.state.currentDialogue?.id).toBe('concord-hub');
    expect(result.current.state.encounterReturnDialogueId).toBeNull();

    await act(async () => {
      result.current.enterPendingEncounter();
    });

    expect(result.current.state.currentDialogue?.id).toBe('encounter:enc-test');
    expect(result.current.state.currentDialogue?.choices.length).toBeGreaterThan(0);
    expect(result.current.state.encounterReturnDialogueId).toBe('concord-hub');
  });

  it('saveToSlot reports failure when persistence fails', async () => {
    const { toast } = await import('sonner');

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err =
        typeof DOMException !== 'undefined'
          ? new DOMException('Quota exceeded', 'QuotaExceededError')
          : Object.assign(new Error('Quota exceeded'), { name: 'QuotaExceededError' });
      throw err;
    });

    const { useGameState } = await import('./useGameState');
    const { result } = renderHook(() => useGameState());

    await act(async () => {
      result.current.startGame();
      result.current.confirmNewGame({
        name: 'Envoy',
        pronouns: 'they/them',
        portraitId: 'envoy-default',
      });
    });

    await act(async () => {
      result.current.saveToSlot(1);
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to save Slot 1');
  });

  it('deleteSlot reports failure when persistence fails', async () => {
    const { toast } = await import('sonner');

    const { useGameState } = await import('./useGameState');
    const { result } = renderHook(() => useGameState());

    await act(async () => {
      result.current.startGame();
      result.current.confirmNewGame({
        name: 'Envoy',
        pronouns: 'they/them',
        portraitId: 'envoy-default',
      });
    });

    await act(async () => {
      result.current.saveToSlot(1);
    });

    vi.mocked(toast.success).mockClear();
    vi.mocked(toast.error).mockClear();

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      const err =
        typeof DOMException !== 'undefined'
          ? new DOMException('Quota exceeded', 'QuotaExceededError')
          : Object.assign(new Error('Quota exceeded'), { name: 'QuotaExceededError' });
      throw err;
    });

    await act(async () => {
      result.current.deleteSlot(1);
    });

    expect(toast.error).toHaveBeenCalledWith('Failed to delete Slot 1');
  });
});
