import { describe, expect, it, beforeAll } from 'vitest';

import { createUqmWasmConversationEngine } from './uqmWasmConversationEngine';
import { tsConversationEngine } from './tsConversationEngine';
import type { UqmWasmRuntime } from './uqmWasmRuntime';
import { loadUqmMinimalWasmExports } from '@/test/uqmWasmTestUtils';
import { dialogueTree } from '../data';
import { isChoiceLocked } from '../choiceLocks';

function makeRuntime(exports: Awaited<ReturnType<typeof loadUqmMinimalWasmExports>>): UqmWasmRuntime {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return {
    exports,
    getVersionString() {
      const ptr = exports.uqm_version_ptr();
      const len = exports.uqm_version_len();
      return decoder.decode(new Uint8Array(exports.memory.buffer, ptr, len));
    },
    lineFitChars(text, maxWidth) {
      const bytes = encoder.encode(text);
      const ptr = exports.uqm_alloc(bytes.length + 1);
      const mem = new Uint8Array(exports.memory.buffer, ptr, bytes.length + 1);
      mem.set(bytes);
      mem[bytes.length] = 0;
      return exports.uqm_line_fit_chars(ptr, maxWidth);
    },
  };
}

describe('uqmWasmConversationEngine', () => {
  let uqmRuntime: UqmWasmRuntime;

  beforeAll(async () => {
    const exports = await loadUqmMinimalWasmExports();
    uqmRuntime = makeRuntime(exports);
  }, 60_000);

  it('produces same state transitions as tsConversationEngine for basic choices', () => {
    const wasmEngine = createUqmWasmConversationEngine(uqmRuntime);

    const start = tsConversationEngine.startNewGame();
    const seeded = { ...start, rngSeed: 123456789 };

    const choice0 = seeded.currentDialogue!.choices[0];

    const nextTs = tsConversationEngine.applyChoice(seeded, choice0);
    const nextWasm = wasmEngine.applyChoice(seeded, choice0);

    expect(nextWasm.currentDialogue?.id).toBe(nextTs.currentDialogue?.id);
    expect(nextWasm.turnNumber).toBe(nextTs.turnNumber);
    expect(nextWasm.rngSeed).toBe(nextTs.rngSeed);
    expect(nextWasm.world).toEqual(nextTs.world);

    // Compare reputations.
    const repTs = Object.fromEntries(nextTs.factions.map(f => [f.id, f.reputation] as const));
    const repWasm = Object.fromEntries(nextWasm.factions.map(f => [f.id, f.reputation] as const));
    expect(repWasm).toEqual(repTs);

    expect(nextWasm.knownSecrets).toEqual(nextTs.knownSecrets);

    // Do another step to ensure graph indices stay consistent.
    const followChoice = nextTs.currentDialogue?.choices?.[0];
    if (!followChoice) throw new Error('Expected a follow-up choice');

    const nextTs2 = tsConversationEngine.applyChoice(nextTs, followChoice);
    const nextWasm2 = wasmEngine.applyChoice(nextWasm, followChoice);

    expect(nextWasm2.currentDialogue?.id).toBe(nextTs2.currentDialogue?.id);
    expect(nextWasm2.turnNumber).toBe(nextTs2.turnNumber);

    const repTs2 = Object.fromEntries(nextTs2.factions.map(f => [f.id, f.reputation] as const));
    const repWasm2 = Object.fromEntries(nextWasm2.factions.map(f => [f.id, f.reputation] as const));
    expect(repWasm2).toEqual(repTs2);

    expect(nextWasm2.knownSecrets).toEqual(nextTs2.knownSecrets);
    expect(nextWasm2.world).toEqual(nextTs2.world);
    expect(nextWasm2.rngSeed).toBe(nextTs2.rngSeed);
  });

  it('matches tsConversationEngine lock bypass when knownSecrets includes override', () => {
    const wasmEngine = createUqmWasmConversationEngine(uqmRuntime);

    const start = tsConversationEngine.startNewGame();
    const seeded = {
      ...start,
      currentDialogue: dialogueTree['summit-start'],
      rngSeed: 123456789,
    };

    const lockedChoice = seeded.currentDialogue!.choices.find(c => c.id === 'summit-iron');
    if (!lockedChoice) throw new Error('Expected summit-iron choice');

    const nextTsLocked = tsConversationEngine.applyChoice(seeded, lockedChoice);
    const nextWasmLocked = wasmEngine.applyChoice(seeded, lockedChoice);

    expect(nextTsLocked).toBe(seeded);
    expect(nextWasmLocked).toBe(seeded);

    const withOverride = { ...seeded, knownSecrets: ['override'] };

    const nextTsOverride = tsConversationEngine.applyChoice(withOverride, lockedChoice);
    const nextWasmOverride = wasmEngine.applyChoice(withOverride, lockedChoice);

    expect(nextTsOverride.currentDialogue?.id).toBe('ending-iron-march');
    expect(nextWasmOverride.currentDialogue?.id).toBe('ending-iron-march');

    expect(nextWasmOverride.turnNumber).toBe(nextTsOverride.turnNumber);
    expect(nextWasmOverride.rngSeed).toBe(nextTsOverride.rngSeed);
    expect(nextWasmOverride.world).toEqual(nextTsOverride.world);

    const repTs = Object.fromEntries(nextTsOverride.factions.map(f => [f.id, f.reputation] as const));
    const repWasm = Object.fromEntries(nextWasmOverride.factions.map(f => [f.id, f.reputation] as const));
    expect(repWasm).toEqual(repTs);

    expect(nextWasmOverride.knownSecrets).toEqual(nextTsOverride.knownSecrets);
  });

  it('matches tsConversationEngine transitions through new investigative nodes', () => {
    const wasmEngine = createUqmWasmConversationEngine(uqmRuntime);

    const start = tsConversationEngine.startNewGame();
    const seeded = { ...start, rngSeed: 123456789 };

    // Jump to a node where we added a new investigative option.
    const atFollowup = {
      ...seeded,
      currentDialogue: dialogueTree['aldric-followup'],
    };

    const auditChoice = atFollowup.currentDialogue!.choices.find(c => c.id === 'aldric-dispatches');
    if (!auditChoice) throw new Error('Expected aldric-dispatches choice');

    const nextTs = tsConversationEngine.applyChoice(atFollowup, auditChoice);
    const nextWasm = wasmEngine.applyChoice(atFollowup, auditChoice);

    expect(nextWasm.currentDialogue?.id).toBe(nextTs.currentDialogue?.id);
    expect(nextWasm.turnNumber).toBe(nextTs.turnNumber);
    expect(nextWasm.rngSeed).toBe(nextTs.rngSeed);
    expect(nextWasm.world).toEqual(nextTs.world);

    const repTs = Object.fromEntries(nextTs.factions.map(f => [f.id, f.reputation] as const));
    const repWasm = Object.fromEntries(nextWasm.factions.map(f => [f.id, f.reputation] as const));
    expect(repWasm).toEqual(repTs);

    expect(nextWasm.knownSecrets).toEqual(nextTs.knownSecrets);

    const backChoice = nextTs.currentDialogue?.choices?.find(c => c.id === 'dispatch-back');
    if (!backChoice) throw new Error('Expected dispatch-back choice');

    const nextTs2 = tsConversationEngine.applyChoice(nextTs, backChoice);
    const nextWasm2 = wasmEngine.applyChoice(nextWasm, backChoice);

    expect(nextWasm2.currentDialogue?.id).toBe(nextTs2.currentDialogue?.id);
    expect(nextWasm2.turnNumber).toBe(nextTs2.turnNumber);
    expect(nextWasm2.rngSeed).toBe(nextTs2.rngSeed);
    expect(nextWasm2.world).toEqual(nextTs2.world);

    const repTs2 = Object.fromEntries(nextTs2.factions.map(f => [f.id, f.reputation] as const));
    const repWasm2 = Object.fromEntries(nextWasm2.factions.map(f => [f.id, f.reputation] as const));
    expect(repWasm2).toEqual(repTs2);

    expect(nextWasm2.knownSecrets).toEqual(nextTs2.knownSecrets);

    // Secret learning is now derived from the WASM secrets mask; ensure the log reflects that too.
    const learnedInTs = nextTs.log.filter(l => l.startsWith('🔍 Secret learned: '));
    const learnedInWasm = nextWasm.log.filter(l => l.startsWith('🔍 Secret learned: '));
    expect(learnedInWasm).toEqual(learnedInTs);
  });

  it('locks proof-gated summit actions until evidence is discovered', () => {
    const wasmEngine = createUqmWasmConversationEngine(uqmRuntime);

    const start = tsConversationEngine.startNewGame();

    const atSummit = {
      ...start,
      currentDialogue: dialogueTree['summit-start'],
      rngSeed: 123456789,
      factions: start.factions.map(f => (f.id === 'iron-pact' ? { ...f, reputation: 5 } : f)),
      knownSecrets: [],
    };

    const exposeIdx = atSummit.currentDialogue!.choices.findIndex(c => c.id === 'summit-expose');
    expect(exposeIdx).toBeGreaterThanOrEqual(0);

    const exposeChoice = atSummit.currentDialogue!.choices[exposeIdx];

    const lockedFlags = wasmEngine.getChoiceLockedFlags?.(atSummit);
    expect(lockedFlags?.[exposeIdx]).toBe(true);

    const nextLocked = wasmEngine.applyChoice(atSummit, exposeChoice);
    expect(nextLocked).toBe(atSummit);

    const withProof = {
      ...atSummit,
      knownSecrets: ['Renzo\'s ledger pages show coded payments tied to the border killings.'],
    };

    const unlockedFlags = wasmEngine.getChoiceLockedFlags?.(withProof);
    expect(unlockedFlags?.[exposeIdx]).toBe(false);

    const next = wasmEngine.applyChoice(withProof, exposeChoice);
    expect(next).not.toBe(withProof);
    expect(next.currentDialogue?.id).toBe('ending-embers-fall');
  });

  it('keeps lock behavior aligned (UI/TS helper vs engine execution) for summit choices', () => {
    const wasmEngine = createUqmWasmConversationEngine(uqmRuntime);

    const start = tsConversationEngine.startNewGame();
    const base = {
      ...start,
      currentDialogue: dialogueTree['summit-start'],
      rngSeed: 123456789,
      factions: start.factions.map(f => ({ ...f, reputation: 0 })),
    };

    expect(wasmEngine.getChoiceLockedFlags?.(base)).toEqual(tsConversationEngine.getChoiceLockedFlags?.(base));
    expect(wasmEngine.getChoiceUiHints?.(base)).toEqual(tsConversationEngine.getChoiceUiHints?.(base));

    for (const choice of base.currentDialogue!.choices) {
      const helperLocked = isChoiceLocked(choice, base.factions, base.knownSecrets, base.selectedChoiceIds);
      const nextTs = tsConversationEngine.applyChoice(base, choice);
      const nextWasm = wasmEngine.applyChoice(base, choice);

      if (helperLocked) {
        expect(nextTs).toBe(base);
        expect(nextWasm).toBe(base);
      } else {
        expect(nextTs).not.toBe(base);
        expect(nextWasm).not.toBe(base);
      }
    }

    const withOverride = { ...base, knownSecrets: ['override'] };
    const lockedChoice = withOverride.currentDialogue!.choices.find(c => c.requiredReputation);
    if (!lockedChoice) throw new Error('Expected a reputation-locked choice');

    expect(isChoiceLocked(lockedChoice, withOverride.factions, withOverride.knownSecrets, withOverride.selectedChoiceIds)).toBe(false);
    expect(wasmEngine.getChoiceLockedFlags?.(withOverride)).toEqual(withOverride.currentDialogue!.choices.map(() => false));

    const nextTs = tsConversationEngine.applyChoice(withOverride, lockedChoice);
    const nextWasm = wasmEngine.applyChoice(withOverride, lockedChoice);

    expect(nextTs).not.toBe(withOverride);
    expect(nextWasm).not.toBe(withOverride);
    expect(nextWasm.currentDialogue?.id).toBe(nextTs.currentDialogue?.id);
  });
});
