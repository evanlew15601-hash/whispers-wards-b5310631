import type { ConversationEngine, ChoiceUiHint } from './conversationEngine';
import type { DialogueChoice, GameState } from '../types';

import { dialogueTree } from '../data';
import { applyExpiredEncounterConsequence } from '../encounters';
import { simulateWorldTurn } from '../simulation';
import { tsConversationEngine } from './tsConversationEngine';
import type { UqmWasmRuntime } from './uqmWasmRuntime';
import { isChoiceLocked } from '../choiceLocks';

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function factionIndex(factionId: string): number {
  if (factionId === 'iron-pact') return 0;
  if (factionId === 'verdant-court') return 1;
  if (factionId === 'ember-throne') return 2;
  return -1;
}

function factionIdFromIndex(idx: number): string | null {
  if (idx === 0) return 'iron-pact';
  if (idx === 1) return 'verdant-court';
  if (idx === 2) return 'ember-throne';
  return null;
}

type CompiledGraph = {
  nodeIds: string[];
  nodeIdToIndex: Map<string, number>;
  secretToBit: Map<string, number>;
  bitToSecret: (string | null)[];
  secretBitCapacity: number;
  choiceStrideBytes: number;
};

function compileGraph(secretBitCapacity: number, choiceStrideBytes: number): CompiledGraph {
  const nodeIds = Object.keys(dialogueTree).sort();
  const nodeIdToIndex = new Map<string, number>(nodeIds.map((id, idx) => [id, idx]));

  const secrets = new Set<string>();
  for (const nodeId of nodeIds) {
    for (const c of dialogueTree[nodeId].choices) {
      if (c.revealsInfo) secrets.add(c.revealsInfo);
      if (c.requiresAllSecrets) for (const s of c.requiresAllSecrets) secrets.add(s);
      if (c.requiresAnySecrets) for (const s of c.requiresAnySecrets) secrets.add(s);
    }
  }

  const secretsSorted = [...secrets].sort();
  const secretsForWasm = secretsSorted.slice(0, secretBitCapacity);
  const secretToBit = new Map<string, number>(secretsForWasm.map((s, i) => [s, i]));

  const bitToSecret = new Array<string | null>(secretBitCapacity).fill(null);
  for (let i = 0; i < secretsForWasm.length; i++) bitToSecret[i] = secretsForWasm[i];

  return { nodeIds, nodeIdToIndex, secretToBit, bitToSecret, secretBitCapacity, choiceStrideBytes };
}

function writeGraphToWasm(uqm: UqmWasmRuntime, graph: CompiledGraph) {
  const { exports } = uqm;

  const nodeCount = graph.nodeIds.length;
  const nodesSize = 8 + nodeCount * 8;

  let totalChoices = 0;
  for (const id of graph.nodeIds) totalChoices += dialogueTree[id].choices.length;
  const choicesSize = totalChoices * graph.choiceStrideBytes;

  // Keep the graph as a single packed blob in wasm memory:
  // [nodes header + node metas][choice metas]
  const blobPtr = exports.uqm_alloc(nodesSize + choicesSize);
  const nodesPtr = blobPtr;
  const choicesPtr = blobPtr + nodesSize;

  const mem = new DataView(exports.memory.buffer);

  mem.setUint32(nodesPtr + 0, nodeCount, true);
  mem.setUint32(nodesPtr + 4, totalChoices, true);

  let choiceCursor = 0;

  for (let nodeIdx = 0; nodeIdx < graph.nodeIds.length; nodeIdx++) {
    const node = dialogueTree[graph.nodeIds[nodeIdx]];

    // NodeMeta { u32 firstChoice; u32 choiceCount }
    mem.setUint32(nodesPtr + 8 + nodeIdx * 8 + 0, choiceCursor, true);
    mem.setUint32(nodesPtr + 8 + nodeIdx * 8 + 4, node.choices.length, true);

    for (const choice of node.choices) {
      const base = choicesPtr + choiceCursor * graph.choiceStrideBytes;

      const nextIdx = choice.nextNodeId ? (graph.nodeIdToIndex.get(choice.nextNodeId) ?? -1) : -1;
      mem.setInt32(base + 0, nextIdx, true);

      // Match TS engine semantics: apply at most one effect per faction (first match).
      const d0 = choice.effects.find(e => e.factionId === 'iron-pact')?.reputationChange ?? 0;
      const d1 = choice.effects.find(e => e.factionId === 'verdant-court')?.reputationChange ?? 0;
      const d2 = choice.effects.find(e => e.factionId === 'ember-throne')?.reputationChange ?? 0;

      const d0s = clamp(d0, -32768, 32767);
      const d1s = clamp(d1, -32768, 32767);
      const d2s = clamp(d2, -32768, 32767);

      mem.setInt16(base + 4, d0s, true);
      mem.setInt16(base + 6, d1s, true);
      mem.setInt16(base + 8, d2s, true);

      const req = choice.requiredReputation;
      let reqFaction = -1;
      let reqMin = 0;
      if (req) {
        reqFaction = factionIndex(req.factionId);
        if (reqFaction < 0) reqFaction = 3; // unknown => always locked
        reqMin = req.min;
      }

      mem.setInt16(base + 10, reqFaction, true);
      mem.setInt16(base + 12, reqMin, true);

      let revealLo = 0;
      let revealHi = 0;
      if (choice.revealsInfo) {
        const bit = graph.secretToBit.get(choice.revealsInfo);
        if (bit !== undefined) {
          if (bit < 32) revealLo = 1 << bit;
          else revealHi = 1 << (bit - 32);
        }
      }
      mem.setUint32(base + 14, revealLo >>> 0, true);
      if (graph.choiceStrideBytes >= 22) {
        mem.setUint32(base + 18, revealHi >>> 0, true);
      }

      const allMask = secretsMask64FromStrings(choice.requiresAllSecrets, graph.secretToBit);
      const anyMask = secretsMask64FromStrings(choice.requiresAnySecrets, graph.secretToBit);

      if (graph.choiceStrideBytes >= 38) {
        mem.setUint32(base + 22, allMask.lo, true);
        mem.setUint32(base + 26, allMask.hi, true);
        mem.setUint32(base + 30, anyMask.lo, true);
        mem.setUint32(base + 34, anyMask.hi, true);
      }

      choiceCursor++;
    }
  }

  if (exports.uqm_conv_set_graph_blob) {
    exports.uqm_conv_set_graph_blob(blobPtr);
  } else {
    exports.uqm_conv_set_graph(nodesPtr, choicesPtr);
  }
}

function secretsMask64FromStrings(secrets: readonly string[] | undefined, secretToBit: Map<string, number>): { lo: number; hi: number } {
  let lo = 0;
  let hi = 0;

  if (!secrets) return { lo: 0, hi: 0 };

  for (const s of secrets) {
    const bit = secretToBit.get(s);
    if (bit === undefined) continue;

    if (bit < 32) lo |= 1 << bit;
    else hi |= 1 << (bit - 32);
  }

  return { lo: lo >>> 0, hi: hi >>> 0 };
}

function secretsMask64FromKnown(knownSecrets: string[], secretToBit: Map<string, number>): { lo: number; hi: number } {
  return secretsMask64FromStrings(knownSecrets, secretToBit);
}

function secretsFromMask(graph: CompiledGraph, lo: number, hi: number): Set<string> {
  const out = new Set<string>();

  for (let bit = 0; bit < graph.secretBitCapacity; bit++) {
    const isSet = bit < 32 ? ((lo >>> bit) & 1) === 1 : ((hi >>> (bit - 32)) & 1) === 1;
    if (!isSet) continue;

    const s = graph.bitToSecret[bit];
    if (s) out.add(s);
  }

  return out;
}

function applyChoiceUsingWasm(
  prev: GameState,
  choice: DialogueChoice,
  uqm: UqmWasmRuntime,
  graph: CompiledGraph,
): GameState | null {
  if (!prev.currentDialogue) return null;

  if (isChoiceLocked(choice, prev.factions, prev.knownSecrets, prev.selectedChoiceIds)) {
    return prev;
  }

  const nodeIdx = graph.nodeIdToIndex.get(prev.currentDialogue.id);
  if (nodeIdx === undefined) return null;

  const localIdx = prev.currentDialogue.choices.findIndex(c => c.id === choice.id);
  if (localIdx < 0) return null;

  const overrideLocked = prev.knownSecrets.includes('override');

  const rep0 = prev.factions.find(f => f.id === 'iron-pact')?.reputation ?? 0;
  const rep1 = prev.factions.find(f => f.id === 'verdant-court')?.reputation ?? 0;
  const rep2 = prev.factions.find(f => f.id === 'ember-throne')?.reputation ?? 0;

  const secretsMask = secretsMask64FromKnown(prev.knownSecrets, graph.secretToBit);

  const exp = uqm.exports;
  if (graph.secretBitCapacity > 32 && exp.uqm_conv_reset64) {
    exp.uqm_conv_reset64(nodeIdx, rep0, rep1, rep2, secretsMask.lo, secretsMask.hi);
  } else {
    exp.uqm_conv_reset(nodeIdx, rep0, rep1, rep2, secretsMask.lo);
  }

  const locked = exp.uqm_conv_choice_is_locked(localIdx) === 1;
  if (locked && !overrideLocked) {
    // Enforce locks at the engine level too.
    return prev;
  }

  if (locked && overrideLocked && !exp.uqm_conv_choose_force) {
    // If the runtime doesn't support bypassing locks in WASM, fall back to TS.
    return null;
  }

  const nextNodeIdx = locked && overrideLocked ? exp.uqm_conv_choose_force!(localIdx) : exp.uqm_conv_choose(localIdx);

  // `-1` can mean either "end conversation" or "invalid". Disambiguate using the
  // TS node id on the choice; if the choice expects a next node but wasm returned
  // an invalid index, fall back.
  let nextDialogueId: string | null = null;
  if (nextNodeIdx >= 0 && nextNodeIdx < graph.nodeIds.length) {
    nextDialogueId = graph.nodeIds[nextNodeIdx];
  } else if (choice.nextNodeId != null) {
    return null;
  }

  const newRep0 = clamp(exp.uqm_conv_get_rep(0), -100, 100);
  const newRep1 = clamp(exp.uqm_conv_get_rep(1), -100, 100);
  const newRep2 = clamp(exp.uqm_conv_get_rep(2), -100, 100);

  const nextDialogue = nextDialogueId ? dialogueTree[nextDialogueId] ?? null : null;

  const newFactions = prev.factions.map(f => {
    if (f.id === 'iron-pact') return { ...f, reputation: newRep0 };
    if (f.id === 'verdant-court') return { ...f, reputation: newRep1 };
    if (f.id === 'ember-throne') return { ...f, reputation: newRep2 };
    return f;
  });

  const prevExpected = secretsFromMask(graph, secretsMask.lo >>> 0, secretsMask.hi >>> 0);

  const secretsLo = exp.uqm_conv_get_secrets_lo ? exp.uqm_conv_get_secrets_lo() : exp.uqm_conv_get_secrets();
  const secretsHi = exp.uqm_conv_get_secrets_hi ? exp.uqm_conv_get_secrets_hi() : 0;

  const expected = secretsFromMask(graph, secretsLo >>> 0, secretsHi >>> 0);

  const newlyLearned: string[] = [];
  for (const s of expected) {
    if (!prevExpected.has(s)) newlyLearned.push(s);
  }

  // Keep external secrets (e.g. "override") and keep order stable for secrets represented
  // in the wasm mask.
  const ordered: string[] = prev.knownSecrets.filter(s => {
    if (!graph.secretToBit.has(s)) return true;
    return expected.has(s);
  });

  // Ensure we didn't drop any secrets represented in the mask.
  for (let bit = 0; bit < graph.secretBitCapacity; bit++) {
    const s = graph.bitToSecret[bit];
    if (!s) continue;
    if (expected.has(s) && !ordered.includes(s)) ordered.push(s);
  }

  const newSecrets = [...new Set(ordered)];

  // Check events (same logic as TS engine)
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
    ...newlyLearned.map(s => `🔍 Secret learned: ${s}`),
  ];

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
    selectedChoiceIds: prev.selectedChoiceIds.includes(choice.id) ? prev.selectedChoiceIds : [...prev.selectedChoiceIds, choice.id],
    turnNumber: nextTurnNumber,
    log: [...newLog, ...worldLog, ...expiryLog],
    world: sim.world,
    rngSeed: sim.rngSeed,
    pendingEncounter: nextEncounter,
  };
}

/**
 * Create a ConversationEngine backed by the minimal UQM-derived WASM conversation core.
 *
 * This keeps the broader game-state transition logic identical to `tsConversationEngine`
 * (events, logging, world simulation), but delegates *conversation graph transitions*
 * (next node, reputation deltas, choice locks) to WASM.
 */
export function createUqmWasmConversationEngine(uqm: UqmWasmRuntime): ConversationEngine {
  const supports64 =
    typeof uqm.exports.uqm_conv_reset64 === 'function' &&
    typeof uqm.exports.uqm_conv_get_secrets_lo === 'function' &&
    typeof uqm.exports.uqm_conv_get_secrets_hi === 'function';

  const secretBitCapacity = supports64 ? 64 : 32;
  const choiceStrideBytes = 38;

  const graph = compileGraph(secretBitCapacity, choiceStrideBytes);
  writeGraphToWasm(uqm, graph);

  return {
    createInitialState: tsConversationEngine.createInitialState,
    startNewGame: tsConversationEngine.startNewGame,
    applyChoice(prev, choice) {
      const next = applyChoiceUsingWasm(prev, choice, uqm, graph);
      if (next) return next;
      // Safe fallback (should be rare)
      return tsConversationEngine.applyChoice(prev, choice);
    },
    getChoiceLockedFlags(state) {
      if (!state.currentDialogue) return null;
      if (state.knownSecrets.includes('override')) return state.currentDialogue.choices.map(() => false);

      const nodeIdx = graph.nodeIdToIndex.get(state.currentDialogue.id);
      if (nodeIdx === undefined) return null;

      const rep0 = state.factions.find(f => f.id === 'iron-pact')?.reputation ?? 0;
      const rep1 = state.factions.find(f => f.id === 'verdant-court')?.reputation ?? 0;
      const rep2 = state.factions.find(f => f.id === 'ember-throne')?.reputation ?? 0;

      const secretsMask = secretsMask64FromKnown(state.knownSecrets, graph.secretToBit);

      const exp = uqm.exports;
      if (graph.secretBitCapacity > 32 && exp.uqm_conv_reset64) {
        exp.uqm_conv_reset64(nodeIdx, rep0, rep1, rep2, secretsMask.lo, secretsMask.hi);
      } else {
        exp.uqm_conv_reset(nodeIdx, rep0, rep1, rep2, secretsMask.lo);
      }

      const count = state.currentDialogue.choices.length;

      if (exp.uqm_conv_get_locked_choices_lo && exp.uqm_conv_get_locked_choices_hi) {
        const lo = exp.uqm_conv_get_locked_choices_lo() >>> 0;
        const hi = exp.uqm_conv_get_locked_choices_hi() >>> 0;

        return state.currentDialogue.choices.map((choice, i) => {
          const wasmLocked =
            i < 32
              ? ((lo >>> i) & 1) === 1
              : i < 64
              ? ((hi >>> (i - 32)) & 1) === 1
              : exp.uqm_conv_choice_is_locked(i) === 1;

          return wasmLocked || isChoiceLocked(choice, state.factions, state.knownSecrets, state.selectedChoiceIds);
        });
      }

      const lockedFlags: boolean[] = new Array(count);
      for (let i = 0; i < count; i++) lockedFlags[i] = exp.uqm_conv_choice_is_locked(i) === 1;

      return state.currentDialogue.choices.map((choice, i) =>
        (lockedFlags[i] ?? false) || isChoiceLocked(choice, state.factions, state.knownSecrets, state.selectedChoiceIds)
      );
    },
    getChoiceUiHints(state): ChoiceUiHint[] | null {
      if (!state.currentDialogue) return null;

      const nodeIdx = graph.nodeIdToIndex.get(state.currentDialogue.id);
      if (nodeIdx === undefined) return null;

      const rep0 = state.factions.find(f => f.id === 'iron-pact')?.reputation ?? 0;
      const rep1 = state.factions.find(f => f.id === 'verdant-court')?.reputation ?? 0;
      const rep2 = state.factions.find(f => f.id === 'ember-throne')?.reputation ?? 0;

      const secretsMask = secretsMask64FromKnown(state.knownSecrets, graph.secretToBit);

      const exp = uqm.exports;
      if (graph.secretBitCapacity > 32 && exp.uqm_conv_reset64) {
        exp.uqm_conv_reset64(nodeIdx, rep0, rep1, rep2, secretsMask.lo, secretsMask.hi);
      } else {
        exp.uqm_conv_reset(nodeIdx, rep0, rep1, rep2, secretsMask.lo);
      }

      let lockedFlags: boolean[];
      if (state.knownSecrets.includes('override')) {
        lockedFlags = state.currentDialogue.choices.map(() => false);
      } else if (exp.uqm_conv_get_locked_choices_lo && exp.uqm_conv_get_locked_choices_hi) {
        const lo = exp.uqm_conv_get_locked_choices_lo() >>> 0;
        const hi = exp.uqm_conv_get_locked_choices_hi() >>> 0;
        lockedFlags = state.currentDialogue.choices.map((_, i) => {
          if (i < 32) return ((lo >>> i) & 1) === 1;
          if (i < 64) return ((hi >>> (i - 32)) & 1) === 1;
          return exp.uqm_conv_choice_is_locked(i) === 1;
        });
      } else {
        lockedFlags = state.currentDialogue.choices.map((_, i) => exp.uqm_conv_choice_is_locked(i) === 1);
      }

      const canReadMeta =
        typeof exp.uqm_conv_choice_get_req_faction === 'function' &&
        typeof exp.uqm_conv_choice_get_req_min === 'function' &&
        typeof exp.uqm_conv_choice_get_d0 === 'function' &&
        typeof exp.uqm_conv_choice_get_d1 === 'function' &&
        typeof exp.uqm_conv_choice_get_d2 === 'function' &&
        typeof exp.uqm_conv_choice_get_reveal_lo === 'function' &&
        typeof exp.uqm_conv_choice_get_reveal_hi === 'function';

      return state.currentDialogue.choices.map((choice, i) => {
        const locked = (lockedFlags[i] ?? false) || isChoiceLocked(choice, state.factions, state.knownSecrets, state.selectedChoiceIds);

        if (!canReadMeta) {
          return {
            locked,
            requiredReputation: choice.requiredReputation ?? null,
            effects: choice.effects,
            revealsInfo: choice.revealsInfo ?? null,
          };
        }

        const reqFaction = exp.uqm_conv_choice_get_req_faction!(i);
        const reqMin = exp.uqm_conv_choice_get_req_min!(i);
        const reqFactionId = reqFaction >= 0 ? factionIdFromIndex(reqFaction) : null;

        const effects: ChoiceUiHint['effects'] = [];
        const d0 = exp.uqm_conv_choice_get_d0!(i);
        const d1 = exp.uqm_conv_choice_get_d1!(i);
        const d2 = exp.uqm_conv_choice_get_d2!(i);
        if (d0) effects.push({ factionId: 'iron-pact', reputationChange: d0 });
        if (d1) effects.push({ factionId: 'verdant-court', reputationChange: d1 });
        if (d2) effects.push({ factionId: 'ember-throne', reputationChange: d2 });

        const revealLo = exp.uqm_conv_choice_get_reveal_lo!(i) >>> 0;
        const revealHi = exp.uqm_conv_choice_get_reveal_hi!(i) >>> 0;

        let revealInfo: string | null = null;
        if (revealLo !== 0 || revealHi !== 0) {
          for (let bit = 0; bit < graph.secretBitCapacity; bit++) {
            const isSet = bit < 32 ? ((revealLo >>> bit) & 1) === 1 : ((revealHi >>> (bit - 32)) & 1) === 1;
            if (!isSet) continue;
            revealInfo = graph.bitToSecret[bit] ?? null;
            break;
          }
        }

        return {
          locked,
          requiredReputation: reqFactionId ? { factionId: reqFactionId, min: reqMin } : null,
          effects,
          revealsInfo: revealInfo,
        };
      });
    },
  };
}
