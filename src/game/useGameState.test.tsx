import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { STORAGE_KEY_V1 } from './storage';
import { dialogueTree, initialEvents, initialFactions } from './data';

vi.mock('./engine/uqmWasmRuntime', () => ({
  loadUqmWasmRuntime: () => Promise.reject(new Error('no wasm')),
}));

vi.mock('sonner', () => ({
  toast: {
    success: () => {},
    error: () => {},
  },
}));

describe('useGameState', () => {
  beforeEach(() => {
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

    await act(async () => {
      result.current.enterPendingEncounter();
    });

    expect(result.current.state.currentDialogue?.id).toBe('encounter:enc-test');
    expect(result.current.state.currentDialogue?.choices.length).toBeGreaterThan(0);
  });
});
