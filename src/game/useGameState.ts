import { useState, useCallback } from 'react';
import { GameState, DialogueChoice } from './types';
import { initialFactions, dialogueTree, initialEvents } from './data';

const createInitialState = (): GameState => ({
  currentScene: 'title',
  factions: initialFactions.map(f => ({ ...f })),
  currentDialogue: null,
  events: initialEvents.map(e => ({ ...e })),
  knownSecrets: [],
  turnNumber: 1,
  log: [],
});

export function useGameState() {
  const [state, setState] = useState<GameState>(createInitialState);

  const startGame = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentScene: 'game',
      currentDialogue: dialogueTree['opening'],
      log: ['You arrive at the Concord Hall as envoy to the fractured realm...'],
    }));
  }, []);

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

      return {
        ...prev,
        factions: newFactions,
        currentDialogue: nextDialogue,
        events: newEvents,
        knownSecrets: [...new Set(newSecrets)],
        turnNumber: prev.turnNumber + 1,
        log: newLog,
      };
    });
  }, []);

  const resetGame = useCallback(() => {
    setState(createInitialState());
  }, []);

  return { state, startGame, makeChoice, resetGame };
}
