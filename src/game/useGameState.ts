import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { GameState, DialogueChoice, PlayerProfile } from './types';
import { dialogueTree } from './data';
import { normalizePlayerProfile } from './player';
import {
  SaveSlotInfo,
  listSaveSlots,
  saveGameToSlot,
  loadGameFromSlot,
  deleteSaveSlot,
} from './storage';
import { tsConversationEngine } from './engine/tsConversationEngine';
import { loadUqmWasmRuntime } from './engine/uqmWasmRuntime';
import { createUqmWasmConversationEngine } from './engine/uqmWasmConversationEngine';
import { buildEncounterDialogueNode } from './encounters';

export function useGameState() {
  const engineRef = useRef(tsConversationEngine);

  const [engineLabel, setEngineLabel] = useState<'TS' | 'UQM WASM'>('TS');

  const [state, setState] = useState<GameState>(() => engineRef.current.createInitialState());
  const [saveSlots, setSaveSlots] = useState<SaveSlotInfo[]>(() => listSaveSlots());

  useEffect(() => {
    let cancelled = false;

    void loadUqmWasmRuntime()
      .then(uqm => {
        if (cancelled) return;
        engineRef.current = createUqmWasmConversationEngine(uqm);
        setEngineLabel('UQM WASM');
      })
      .catch(() => {
        // Ignore; we simply stay on the TS engine.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshSlots = useCallback(() => {
    setSaveSlots(listSaveSlots());
  }, []);

  const startGame = useCallback(() => {
    // Route new games through the character creator.
    const base = engineRef.current.createInitialState();
    setState({
      ...base,
      currentScene: 'create',
    });
  }, []);

  const confirmNewGame = useCallback((player: PlayerProfile) => {
    const started = engineRef.current.startNewGame();
    setState({
      ...started,
      player: normalizePlayerProfile(player),
      currentScene: 'game',
    });
  }, []);

  const openLoadScreen = useCallback(() => {
    refreshSlots();
    setState(prev => ({
      ...prev,
      currentScene: 'load',
    }));
  }, [refreshSlots]);

  const backToTitle = useCallback(() => {
    refreshSlots();
    setState(prev => ({
      ...prev,
      currentScene: 'title',
    }));
  }, [refreshSlots]);

  const saveToSlot = useCallback((slotId: number) => {
    const ok = saveGameToSlot(slotId, state);
    refreshSlots();

    if (ok) {
      toast.success(`Saved to Slot ${slotId}`);
    } else {
      toast.error(`Failed to save Slot ${slotId}`);
    }
  }, [state, refreshSlots]);

  const loadFromSlot = useCallback((slotId: number) => {
    const loaded = loadGameFromSlot(slotId);
    if (!loaded) {
      toast.error(`Slot ${slotId} is empty.`);
      return;
    }

    // Back/forward compatibility: hydrate missing fields and refresh dialogue from the current tree when possible.
    const base = engineRef.current.createInitialState();
    const loadedAny = loaded as unknown as Partial<GameState> & {
      currentDialogue?: { id?: string } | null;
      currentDialogueId?: string | null;
    };

    const pendingEncounter = loadedAny.pendingEncounter ?? null;

    const loadedDialogueId =
      typeof loadedAny.currentDialogueId === 'string'
        ? loadedAny.currentDialogueId
        : loadedAny.currentDialogue && typeof loadedAny.currentDialogue === 'object'
          ? (loadedAny.currentDialogue as { id?: string }).id ?? null
          : null;

    const hydrated: GameState = {
      ...base,
      ...loadedAny,
      player: normalizePlayerProfile(loadedAny.player ?? base.player),
      factions: loadedAny.factions ?? base.factions,
      events: loadedAny.events ?? base.events,
      knownSecrets: loadedAny.knownSecrets ?? base.knownSecrets,
      selectedChoiceIds: (loadedAny as any).selectedChoiceIds ?? base.selectedChoiceIds,
      log: loadedAny.log ?? base.log,
      turnNumber: typeof loadedAny.turnNumber === 'number' ? loadedAny.turnNumber : base.turnNumber,
      rngSeed: typeof loadedAny.rngSeed === 'number' ? loadedAny.rngSeed : base.rngSeed,
      world: loadedAny.world ?? base.world,
      pendingEncounter,
      currentDialogue: loadedDialogueId
        ? loadedDialogueId.startsWith('encounter:') && pendingEncounter
          ? buildEncounterDialogueNode(pendingEncounter)
          : dialogueTree[loadedDialogueId] ?? (loadedAny.currentDialogue as GameState['currentDialogue'])
        : (loadedAny.currentDialogue as GameState['currentDialogue']) ?? null,
      // Always resume gameplay after loading a save.
      currentScene: 'game',
    };

    setState(hydrated);
    refreshSlots();
    toast.success(`Loaded Slot ${slotId}`);
  }, [refreshSlots]);

  const deleteSlot = useCallback((slotId: number) => {
    const ok = deleteSaveSlot(slotId);
    refreshSlots();

    if (ok) {
      toast.success(`Deleted Slot ${slotId}`);
    } else {
      toast.error(`Failed to delete Slot ${slotId}`);
    }
  }, [refreshSlots]);

  const listSlots = useCallback(() => saveSlots, [saveSlots]);

  const makeChoice = useCallback((choice: DialogueChoice) => {
    setState(prev => engineRef.current.applyChoice(prev, choice));
  }, []);

  const resetGame = useCallback(() => {
    setState(engineRef.current.createInitialState());
  }, []);

  const enterPendingEncounter = useCallback(() => {
    setState(prev => {
      if (!prev.pendingEncounter) return prev;
      return {
        ...prev,
        currentDialogue: buildEncounterDialogueNode(prev.pendingEncounter),
      };
    });
  }, []);

  const choiceLockedFlags = engineRef.current.getChoiceLockedFlags?.(state) ?? null;
  const choiceUiHints = engineRef.current.getChoiceUiHints?.(state) ?? null;

  return {
    state,
    engineLabel,
    choiceLockedFlags,
    choiceUiHints,
    startGame,
    confirmNewGame,
    openLoadScreen,
    backToTitle,
    saveToSlot,
    loadFromSlot,
    deleteSlot,
    listSlots,
    makeChoice,
    resetGame,
    enterPendingEncounter,
  };
}
