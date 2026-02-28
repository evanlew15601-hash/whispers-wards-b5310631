import type { ConversationEngine } from './conversationEngine';
import type { DialogueChoice, GameState } from '../types';

import { dialogueTree, initialEvents, initialFactions } from '../data';
import { createInitialRngSeed, createInitialWorldState } from '../world';
import { applyExpiredEncounterConsequence, parseEncounterResolutionChoiceId, resolveEncounter } from '../encounters';
import { simulateWorldTurn } from '../simulation';
import { isChoiceLocked } from '../choiceLocks';
import { isChoiceUsed, makeChoiceKey, shouldConsumeReputationEffects, shouldBlockRepeat, shouldRecordChoiceUse } from '../choiceUsage';
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
  usedChoiceKeys: [],
  turnNumber: 1,
  log: [],
  rngSeed: createInitialRngSeed(),
  world: createInitialWorldState(initialFactions),
  pendingEncounter: null,
  encounterReturnDialogueId: null,
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
  if (!prev.currentDialogue) return prev;

  if (isChoiceLocked(choice, prev.factions, prev.knownSecrets)) {
    return prev;
  }

  const nodeId = prev.currentDialogue.id;
  const overrideLocked = prev.knownSecrets.includes('override');

  if (!overrideLocked && shouldBlockRepeat(choice, prev.usedChoiceKeys, nodeId, prev.knownSecrets)) {
    return prev;
  }

  const choiceKey = makeChoiceKey(nodeId, choice.id);
  const alreadyUsed = isChoiceUsed(prev.usedChoiceKeys, nodeId, choice.id);

  const consumeRepEffects = !overrideLocked && shouldConsumeReputationEffects(choice, prev.usedChoiceKeys, nodeId);

  const shouldApplyRepEffects = !consumeRepEffects;

  const isNewSecret =
    typeof choice.revealsInfo === 'string' && !prev.knownSecrets.includes(choice.revealsInfo);

  const newSecrets = isNewSecret ? [...prev.knownSecrets, choice.revealsInfo!] : prev.knownSecrets;

  const shouldRecord = !overrideLocked && shouldRecordChoiceUse(choice);
  const nextUsedChoiceKeys =
    shouldRecord && !alreadyUsed ? [...prev.usedChoiceKeys, choiceKey] : prev.usedChoiceKeys;

  const encounterPick = prev.pendingEncounter ? parseEncounterResolutionChoiceId(choice.id) : null;
  if (prev.pendingEncounter && encounterPick && encounterPick.encounterId === prev.pendingEncounter.id) {
    // Even though encounter choices are dynamically generated, we still want to apply
    // any standard choice side-effects (rep, secrets, event triggers).
    const newFactions = shouldApplyRepEffects
      ? prev.factions.map(f => {
          const effect = choice.effects.find(e => e.factionId === f.id);
          if (!effect) return f;

          return {
            ...f,
            reputation: clamp(f.reputation + effect.reputationChange, -100, 100),
          };
        })
      : prev.factions;

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

    const returnId = prev.encounterReturnDialogueId;
    const returnDialogue =
      returnId && !returnId.startsWith('encounter:') ? (dialogueTree[returnId] ?? null) : null;

    return {
      ...prev,
      factions: newFactions,
      events: newEvents,
      knownSecrets: [...new Set(newSecrets)],
      usedChoiceKeys: [...new Set(nextUsedChoiceKeys)],
      currentDialogue: returnDialogue ?? dialogueTree['concord-hub'] ?? prev.currentDialogue,
      pendingEncounter: null,
      encounterReturnDialogueId: null,
      log: [
        ...prev.log,
        `> ${choice.text}`,
        ...triggeredEvents.map(e => `⚡ Event: ${e.title} — ${e.description}`),
        ...(isNewSecret ? [`🔍 Secret learned: ${choice.revealsInfo}`] : []),
        ...resolved.logEntries,
      ],
      world: resolved.world,
    };
  }

  const newFactions = shouldApplyRepEffects
    ? prev.factions.map(f => {
        const effect = choice.effects.find(e => e.factionId === f.id);
        if (!effect) return f;

        return {
          ...f,
          reputation: clamp(f.reputation + effect.reputationChange, -100, 100),
        };
      })
    : prev.factions;

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
    ...(isNewSecret ? [`🔍 Secret learned: ${choice.revealsInfo}`] : []),
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
    usedChoiceKeys: [...new Set(nextUsedChoiceKeys)],
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

    const nodeId = state.currentDialogue.id;
    const overrideLocked = state.knownSecrets.includes('override');

    return state.currentDialogue.choices.map(choice => {
      const repeatLocked = !overrideLocked && shouldBlockRepeat(choice, state.usedChoiceKeys, nodeId, state.knownSecrets);
      return repeatLocked || isChoiceLocked(choice, state.factions, state.knownSecrets);
    });
  },
  getChoiceUiHints(state) {
    if (!state.currentDialogue) return null;

    const nodeId = state.currentDialogue.id;
    const overrideLocked = state.knownSecrets.includes('override');

    return state.currentDialogue.choices.map(choice => {
      const repeatLocked = !overrideLocked && shouldBlockRepeat(choice, state.usedChoiceKeys, nodeId, state.knownSecrets);
      const locked = repeatLocked || isChoiceLocked(choice, state.factions, state.knownSecrets);

      const consumed = !overrideLocked && shouldConsumeReputationEffects(choice, state.usedChoiceKeys, nodeId);

      return {
        locked,
        requiredReputation: choice.requiredReputation ?? null,
        effects: consumed ? [] : choice.effects,
        revealsInfo: choice.revealsInfo ?? null,
      };
    });
  },
};

export const TS_OPENING_LOG_LINE = OPENING_LOG_LINE;
