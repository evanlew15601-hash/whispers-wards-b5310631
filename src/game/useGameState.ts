import { useState, useCallback } from 'react';
import { GameState, DialogueChoice } from './types';
import { initialFactions, dialogueTree, initialEvents } from './data';
import { createInitialWorldState, createInitialRngSeed } from './world';
import { simulateWorldTurn } from './simulation';
import {
  SaveSlotInfo,
  listSaveSlots,
  saveGameToSlot,
  loadGameFromSlot,
  deleteSaveSlot,
} from './storage';

const createInitialState = (): GameState => ({
  currentScene: 'title',
  factions: initialFactions.map(f => ({ ...f })),
  currentDialogue: null,
  events: initialEvents.map(e => ({ ...e })),
  knownSecrets: [],
  turnNumber: 1,
  log: [],
  rngSeed: createInitialRngSeed(),
  world: createInitialWorldState(initialFactions),
  pendingEncounter: null,
});

export function useGameState() {
  const [state, setState] = useState<GameState>(createInitialState);
  const [saveSlots, setSaveSlots] = useState<SaveSlotInfo[]>(() => listSaveSlots());

  const refreshSlots = useCallback(() => {
    setSaveSlots(listSaveSlots());
  }, []);

  const startGame = useCallback(() => {
    const base = createInitialState();
    setState({
      ...base,
      currentScene: 'game',
      currentDialogue: dialogueTree['opening'],
      log: ['You arrive at the Concord Hall as envoy to the fractured realm...'],
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
    saveGameToSlot(slotId, state);
    refreshSlots();
  }, [state, refreshSlots]);

  const loadFromSlot = useCallback((slotId: number) => {
    const loaded = loadGameFromSlot(slotId);
    if (!loaded) return;

    // Back/forward compatibility: hydrate missing fields and refresh dialogue from the current tree when possible.
    const base = createInitialState();
    const loadedAny = loaded as unknown as Partial<GameState> & { currentDialogue?: { id?: string } | null };

    const hydrated: GameState = {
      ...base,
      ...loadedAny,
      factions: loadedAny.factions ?? base.factions,
      events: loadedAny.events ?? base.events,
      knownSecrets: loadedAny.knownSecrets ?? base.knownSecrets,
      log: loadedAny.log ?? base.log,
      turnNumber: typeof loadedAny.turnNumber === 'number' ? loadedAny.turnNumber : base.turnNumber,
      rngSeed: typeof loadedAny.rngSeed === 'number' ? loadedAny.rngSeed : base.rngSeed,
      world: loadedAny.world ?? base.world,
      pendingEncounter: loadedAny.pendingEncounter ?? null,
      currentDialogue:
        loadedAny.currentDialogue && typeof loadedAny.currentDialogue === 'object' && loadedAny.currentDialogue.id
          ? dialogueTree[loadedAny.currentDialogue.id] ?? (loadedAny.currentDialogue as GameState['currentDialogue'])
          : (loadedAny.currentDialogue as GameState['currentDialogue']) ?? null,
      // Always resume gameplay after loading a save.
      currentScene: 'game',
    };

    setState(hydrated);
    refreshSlots();
  }, [refreshSlots]);

  const deleteSlot = useCallback((slotId: number) => {
    deleteSaveSlot(slotId);
    refreshSlots();
  }, [refreshSlots]);

  const listSlots = useCallback(() => saveSlots, [saveSlots]);

  const makeChoice = useCallback((choice: DialogueChoice) => {
    setState(prev => {
      const newFactions = prev.factions.map(f => {
        const effect = choice.effects.find(e => e.factionId === f.id);
        if (effect) {
          return {
            ...f,
            reputation: Math.max(-100, Math.min(100, f.reputation + effect.reputationChange)),
          };
        }
        return f;
      });

      const newSecrets = choice.revealsInfo
        ? [...prev.knownSecrets, choice.revealsInfo]
        : prev.knownSecrets;

      // Check events
      const newEvents = prev.events.map(event => {
        if (event.triggered || !event.triggerCondition) return event;
        const faction = newFactions.find(f => f.id === event.triggerCondition!.factionId);
        if (!faction) return event;
        const met = event.triggerCondition.direction === 'above'
          ? faction.reputation >= event.triggerCondition.reputationThreshold
          : faction.reputation <= event.triggerCondition.reputationThreshold;
        return met ? { ...event, triggered: true } : event;
      });

      const triggeredEvents = newEvents.filter(
        (e, i) => e.triggered && !prev.events[i].triggered
      );

      const newLog = [
        ...prev.log,
        `> ${choice.text}`,
        ...triggeredEvents.map(e => `⚡ Event: ${e.title} — ${e.description}`),
        ...(choice.revealsInfo ? [`🔍 Secret learned: ${choice.revealsInfo}`] : []),
      ];

      const nextDialogue = choice.nextNodeId ? dialogueTree[choice.nextNodeId] || null : null;

      const nextTurnNumber = prev.turnNumber + 1;

      // Turn-based world simulation runs after each player choice.
      const sim = simulateWorldTurn({
        world: prev.world,
        factions: newFactions,
        turnNumber: nextTurnNumber,
        rngSeed: prev.rngSeed,
      });

      const existingEncounter =
        prev.pendingEncounter && prev.pendingEncounter.expiresOnTurn > nextTurnNumber
          ? prev.pendingEncounter
          : null;

      const nextEncounter = existingEncounter ?? sim.pendingEncounter;

      const worldLog = sim.logEntries.map(e => `🌍 ${e}`);

      return {
        ...prev,
        factions: newFactions,
        currentDialogue: nextDialogue,
        events: newEvents,
        knownSecrets: [...new Set(newSecrets)],
        turnNumber: nextTurnNumber,
        log: [...newLog, ...worldLog],
        world: sim.world,
        rngSeed: sim.rngSeed,
        pendingEncounter: nextEncounter,
      };
    });
  }, []);

  const resetGame = useCallback(() => {
    setState(createInitialState());
  }, []);

  return {
    state,
    startGame,
    openLoadScreen,
    backToTitle,
    saveToSlot,
    loadFromSlot,
    deleteSlot,
    listSlots,
    makeChoice,
    resetGame,
  };
}
