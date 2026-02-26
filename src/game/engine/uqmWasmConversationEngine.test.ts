import { describe, expect, it, beforeAll } from 'vitest';

import { createUqmWasmConversationEngine } from './uqmWasmConversationEngine';
import { tsConversationEngine } from './tsConversationEngine';
import type { UqmWasmRuntime } from './uqmWasmRuntime';
import { loadUqmMinimalWasmExports } from '@/test/uqmWasmTestUtils';
import { dialogueTree } from '../data';

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
});
