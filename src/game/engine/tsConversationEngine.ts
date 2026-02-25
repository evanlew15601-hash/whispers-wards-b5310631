import type { ConversationEngine } from './conversationEngine';
import type { DialogueChoice, GameState } from '../types';

import { dialogueTree, initialEvents, initialFactions } from '../data';
import { createInitialRngSeed, createInitialWorldState } from '../world';
import { simulateWorldTurn } from '../simulation';

const OPENING_LOG_LINE = 'You arrive at the Concord Hall as envoy to the fractured realm...';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

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

const startNewGame = (): GameState => {
  const base = createInitialState();
  return {
    ...base,
    currentScene: 'game',
    currentDialogue: dialogueTree['opening'],
    log: [OPENING_LOG_LINE],
  };
};

const applyChoice = (prev: GameState, choice: DialogueChoice): GameState => {
  const newFactions = prev.factions.map(f => {
    const effect = choice.effects.find(e => e.factionId === f.id);
    if (!effect) return f;

    return {
      ...f,
      reputation: clamp(f.reputation + effect.reputationChange, -100, 100),
    };
  });

  const newSecrets = choice.revealsInfo ? [...prev.knownSecrets, choice.revealsInfo] : prev.knownSecrets;

  // Check events
  const newEvents = prev.events.map(event => {
    if (event.triggered || !event.triggerCondition) return event;

    const faction = newFactions.find(f => f.id === event.triggerCondition!.factionId);
    if (!faction) return event;

    const met =
      event.triggerCondition.direction === 'above'
        ? faction.reputation >= event.triggerCondition.reputationThreshold
        : faction.reputation <= event.triggerCondition.reputationThreshold;

    return met ? { ...event, triggered: true } : event;
  });

  const triggeredEvents = newEvents.filter((e, i) => e.triggered && !prev.events[i].triggered);

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
    prev.pendingEncounter && prev.pendingEncounter.expiresOnTurn >= nextTurnNumber ? prev.pendingEncounter : null;

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
};

export const tsConversationEngine: ConversationEngine = {
  createInitialState,
  startNewGame,
  applyChoice,
};

export const TS_OPENING_LOG_LINE = OPENING_LOG_LINE;
