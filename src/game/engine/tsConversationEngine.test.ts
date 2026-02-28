import { describe, expect, it } from 'vitest';
import { tsConversationEngine, TS_OPENING_LOG_LINE } from './tsConversationEngine';
import { dialogueTree } from '../data';
import { makeChoiceKey } from '../choiceUsage';

describe('tsConversationEngine', () => {
  it('startNewGame sets initial scene/dialogue/log', () => {
    const state = tsConversationEngine.startNewGame();

    expect(state.currentScene).toBe('game');
    expect(state.currentDialogue?.id).toBe('opening');
    expect(state.turnNumber).toBe(1);
    expect(state.log[0]).toBe(TS_OPENING_LOG_LINE);
  });

  it('applyChoice advances dialogue and increments turn', () => {
    const initial = tsConversationEngine.startNewGame();

    // Make deterministic for simulation output.
    const seeded = { ...initial, rngSeed: 123456789 };

    const choice = seeded.currentDialogue!.choices[0];
    const next = tsConversationEngine.applyChoice(seeded, choice);

    expect(next.turnNumber).toBe(seeded.turnNumber + 1);
    expect(next.currentDialogue?.id).toBe('aldric-diplomatic');
    expect(next.log.some(l => l.startsWith('> '))).toBe(true);
  });

  it('applyChoice triggers threshold events and logs secrets/world sim output', () => {
    const initial = tsConversationEngine.startNewGame();

    const seeded = { ...initial, rngSeed: 123456789 };

    const choice = {
      id: 'qa-boost',
      text: 'Test choice for QA',
      effects: [{ factionId: 'iron-pact', reputationChange: 35 }],
      nextNodeId: null,
      revealsInfo: 'qa-secret',
    };

    const next = tsConversationEngine.applyChoice(seeded, choice);

    const ironAlliance = next.events.find(e => e.id === 'iron-pact-alliance');
    expect(ironAlliance?.triggered).toBe(true);

    expect(next.log.some(l => l.startsWith('⚡ Event: '))).toBe(true);
    expect(next.log.some(l => l.startsWith('🔍 Secret learned: '))).toBe(true);
    expect(next.log.some(l => l.startsWith('🌍 '))).toBe(true);
  });

  it('dedupes knownSecrets while preserving insertion order', () => {
    const initial = tsConversationEngine.startNewGame();

    const seeded = { ...initial, knownSecrets: ['dup'], rngSeed: 123456789 };

    const choice = {
      id: 'qa-dup',
      text: 'Duplicate secret',
      effects: [],
      nextNodeId: null,
      revealsInfo: 'dup',
    };

    const next = tsConversationEngine.applyChoice(seeded, choice);
    expect(next.knownSecrets).toEqual(['dup']);
  });

  it('locks proof-gated summit actions until evidence is discovered', () => {
    const initial = tsConversationEngine.startNewGame();

    const atSummit = {
      ...initial,
      currentDialogue: dialogueTree['summit-start'],
      rngSeed: 123456789,
      factions: initial.factions.map(f => (f.id === 'iron-pact' ? { ...f, reputation: 5 } : f)),
      knownSecrets: [],
    };

    const exposeIdx = atSummit.currentDialogue!.choices.findIndex(c => c.id === 'summit-expose');
    expect(exposeIdx).toBeGreaterThanOrEqual(0);

    const exposeChoice = atSummit.currentDialogue!.choices[exposeIdx];

    const lockedFlags = tsConversationEngine.getChoiceLockedFlags(atSummit);
    expect(lockedFlags?.[exposeIdx]).toBe(true);

    const nextLocked = tsConversationEngine.applyChoice(atSummit, exposeChoice);
    expect(nextLocked).toBe(atSummit);

    const withProof = {
      ...atSummit,
      knownSecrets: ['Renzo\'s ledger pages show coded payments tied to the border killings.'],
    };

    const unlockedFlags = tsConversationEngine.getChoiceLockedFlags(withProof);
    expect(unlockedFlags?.[exposeIdx]).toBe(false);

    const next = tsConversationEngine.applyChoice(withProof, exposeChoice);
    expect(next).not.toBe(withProof);
    expect(next.currentDialogue?.id).toBe('ending-embers-fall');
  });

  it('does not re-apply reputation deltas when revisiting the same choice', () => {
    const initial = tsConversationEngine.startNewGame();

    const atFollowup = {
      ...initial,
      currentDialogue: dialogueTree['thessaly-followup'],
      rngSeed: 123456789,
    };

    const passChoice = atFollowup.currentDialogue!.choices.find(c => c.id === 'followup-pass');
    if (!passChoice) throw new Error('Expected followup-pass choice');

    const next = tsConversationEngine.applyChoice(atFollowup, passChoice);
    const verdantAfter = next.factions.find(f => f.id === 'verdant-court')?.reputation ?? 0;

    // Simulate returning to the same node later.
    const back = {
      ...next,
      currentDialogue: dialogueTree['thessaly-followup'],
    };

    const nextAgain = tsConversationEngine.applyChoice(back, passChoice);
    const verdantAfterAgain = nextAgain.factions.find(f => f.id === 'verdant-court')?.reputation ?? 0;

    expect(verdantAfterAgain).toBe(verdantAfter);

    const hints = tsConversationEngine.getChoiceUiHints(back);
    const idx = back.currentDialogue!.choices.findIndex(c => c.id === 'followup-pass');
    expect(hints?.[idx]?.effects).toEqual([]);
  });

  it('enforces idempotent reputation effects across the dialogue graph', () => {
    const initial = tsConversationEngine.startNewGame();

    const repMap = (factions: { id: string; reputation: number }[]) =>
      Object.fromEntries(factions.map(f => [f.id, f.reputation] as const));

    for (const node of Object.values(dialogueTree)) {
      for (const choice of node.choices) {
        const hasRepEffect = choice.effects.some(e => e.reputationChange !== 0);
        if (!hasRepEffect) continue;

        const requiredSecrets = [
          ...(choice.requiresAllSecrets ?? []),
          ...(choice.requiresAnySecrets?.[0] ? [choice.requiresAnySecrets[0]] : []),
        ].filter(s => s !== 'override');

        const factions = initial.factions.map(f => {
          if (choice.requiredReputation?.factionId !== f.id) return { ...f };
          return { ...f, reputation: Math.max(f.reputation, choice.requiredReputation.min) };
        });

        const seeded = {
          ...initial,
          currentDialogue: node,
          rngSeed: 123456789,
          knownSecrets: requiredSecrets,
          factions,
        };

        const idx = node.choices.findIndex(c => c.id === choice.id);
        expect(idx).toBeGreaterThanOrEqual(0);

        const lockedFlags = tsConversationEngine.getChoiceLockedFlags(seeded);
        expect(lockedFlags?.[idx]).toBe(false);

        if (choice.revealsInfo === 'override') continue;

        const choiceKey = makeChoiceKey(node.id, choice.id);

        const next = tsConversationEngine.applyChoice(seeded, choice);
        expect(next.usedChoiceKeys.includes(choiceKey)).toBe(true);

        const back = {
          ...next,
          currentDialogue: node,
        };

        const nextAgain = tsConversationEngine.applyChoice(back, choice);

        expect(repMap(nextAgain.factions)).toEqual(repMap(next.factions));
      }
    }
  }, 30_000);

  it('locks one-time action choices (revealsInfo "You ...") after they are taken once', () => {
    const initial = tsConversationEngine.startNewGame();

    const atLedger = {
      ...initial,
      currentDialogue: dialogueTree['renzo-ledger-request'],
      rngSeed: 123456789,
    };

    const stealChoice = atLedger.currentDialogue!.choices.find(c => c.id === 'ledger-steal');
    if (!stealChoice) throw new Error('Expected ledger-steal choice');

    const after = tsConversationEngine.applyChoice(atLedger, stealChoice);

    // Simulate returning to the ledger request node.
    const back = {
      ...after,
      currentDialogue: dialogueTree['renzo-ledger-request'],
    };

    const hints = tsConversationEngine.getChoiceUiHints(back);
    const idx = back.currentDialogue!.choices.findIndex(c => c.id === 'ledger-steal');

    expect(hints?.[idx]?.locked).toBe(true);

    const blocked = tsConversationEngine.applyChoice(back, back.currentDialogue!.choices[idx]);
    expect(blocked).toBe(back);
  });
});
