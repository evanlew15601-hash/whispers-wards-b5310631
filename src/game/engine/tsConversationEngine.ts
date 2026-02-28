import type { ConversationEngine } from './conversationEngine';
import type { DialogueChoice, GameState } from '../types';

import { dialogueTree, initialEvents, initialFactions } from '../data';
import { createInitialRngSeed, createInitialWorldState } from '../world';
import { applyExpiredEncounterConsequence, parseEncounterResolutionChoiceId, resolveEncounter } from '../encounters';
import { simulateWorldTurn } from '../simulation';
import { isChoiceLocked } from '../choiceLocks';
import { DEFAULT_PLAYER_PROFILE } from '../player';

const OPENING_LOG_LINE = 'You arrive at the Concord Hall as envoy to the fractured realm...';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const createInitialState = (): GameState => ({
  currentScene: 'title',
  player: { ...DEFAULT_PLAYER_PROFILE },
  factions: initialFactions.map(f => ({ ...f })),
  currentDialogue: null,
  events: initialEvents.map(e => ({ ...e })),
  knownSecrets: [],
  selectedChoiceIds: [],
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

const addChoiceId = (prevIds: string[], id: string) => (prevIds.includes(id) ? prevIds : [...prevIds, id]);

const applyChoice = (prev: GameState, choice: DialogueChoice): GameState => {
  if (isChoiceLocked(choice, prev.factions, prev.knownSecrets, prev.selectedChoiceIds)) {
    return prev;
  }

  const encounterPick = prev.pendingEncounter ? parseEncounterResolutionChoiceId(choice.id) : null;
  if (prev.pendingEncounter && encounterPick && encounterPick.encounterId === prev.pendingEncounter.id) {
    // Even though encounter choices are dynamically generated, we still want to apply
    // any standard choice side-effects (rep, secrets, event triggers).
    const newFactions = prev.factions.map(f => {
      const effect = choice.effects.find(e => e.factionId === f.id);
      if (!effect) return f;

      return {
        ...f,
        reputation: clamp(f.reputation + effect.reputationChange, -100, 100),
      };
    });

    const newSecrets = choice.revealsInfo ? [...prev.knownSecrets, choice.revealsInfo] : prev.knownSecrets;

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

    const resolved = resolveEncounter({
      world: prev.world,
      encounter: prev.pendingEncounter,
      turnNumber: prev.turnNumber,
      resolution: encounterPick.resolution,
    });

    return {
      ...prev,
      factions: newFactions,
      events: newEvents,
      knownSecrets: [...new Set(newSecrets)],
      selectedChoiceIds: addChoiceId(prev.selectedChoiceIds, choice.id),
      // Return to the main hall hub so the campaign continues.
      currentDialogue: dialogueTree['concord-hub'] ?? prev.currentDialogue,
      pendingEncounter: null,
      log: [
        ...prev.log,
        `> ${choice.text}`,
        ...triggeredEvents.map(e => `⚡ Event: ${e.title} — ${e.description}`),
        ...(choice.revealsInfo ? [`🔍 Secret learned: ${choice.revealsInfo}`] : []),
        ...resolved.logEntries,
      ],
      world: resolved.world,
    };
  }

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

  // `expiresOnTurn` is inclusive: the encounter expires only after turn N resolves
  // (i.e. it is still retained when `expiresOnTurn === nextTurnNumber`).
  const existingEncounter =
    prev.pendingEncounter && prev.pendingEncounter.expiresOnTurn >= nextTurnNumber ? prev.pendingEncounter : null;

  const expiredEncounter =
    prev.pendingEncounter && prev.pendingEncounter.expiresOnTurn < nextTurnNumber ? prev.pendingEncounter : null;

  // If an encounter just expired this turn, apply a deterministic consequence *before*
  // running the world's simulation so that the consequence can influence the sim.
  let worldBeforeSim = prev.world;
  let expiryLog: string[] = [];
  if (expiredEncounter) {
    const expired = applyExpiredEncounterConsequence({
      world: worldBeforeSim,
      encounter: expiredEncounter,
      turnNumber: nextTurnNumber,
    });
    worldBeforeSim = expired.world;
    expiryLog = expired.logEntries;
  }

  // Turn-based world simulation runs after each player choice.
  const sim = simulateWorldTurn({
    world: worldBeforeSim,
    factions: newFactions,
    turnNumber: nextTurnNumber,
    rngSeed: prev.rngSeed,
  });

  const worldLog = sim.logEntries.map(e => `🌍 ${e}`);
  const nextEncounter = existingEncounter ?? sim.pendingEncounter;

  return {
    ...prev,
    factions: newFactions,
    currentDialogue: nextDialogue,
    events: newEvents,
    knownSecrets: [...new Set(newSecrets)],
    selectedChoiceIds: addChoiceId(prev.selectedChoiceIds, choice.id),
    turnNumber: nextTurnNumber,
    log: [...newLog, ...worldLog, ...expiryLog],
    world: sim.world,
    rngSeed: sim.rngSeed,
    pendingEncounter: nextEncounter,
  };
};

export const tsConversationEngine: ConversationEngine = {
  createInitialState,
  startNewGame,
  applyChoice,
  getChoiceLockedFlags(state) {
    if (!state.currentDialogue) return null;
    return state.currentDialogue.choices.map(choice =>
      isChoiceLocked(choice, state.factions, state.knownSecrets, state.selectedChoiceIds)
    );
  },
  getChoiceUiHints(state) {
    if (!state.currentDialogue) return null;
    return state.currentDialogue.choices.map(choice => ({
      locked: isChoiceLocked(choice, state.factions, state.knownSecrets, state.selectedChoiceIds),
      requiredReputation: choice.requiredReputation ?? null,
      effects: choice.effects,
      revealsInfo: choice.revealsInfo ?? null,
    }));
  },
};

export const TS_OPENING_LOG_LINE = OPENING_LOG_LINE;
