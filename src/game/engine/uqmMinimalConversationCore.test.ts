import { describe, expect, it, beforeAll } from 'vitest';

import type { UqmMinimalNormalizedExports } from '@/test/uqmWasmTestUtils';
import { loadUqmMinimalWasmExports } from '@/test/uqmWasmTestUtils';

function writeGraph(exports: UqmMinimalNormalizedExports) {
  const nodeCount = 2;
  const totalChoices = 2;

  const nodesSize = 8 + nodeCount * 8;
  const choicesSize = totalChoices * 38;

  const blobPtr = exports.uqm_alloc(nodesSize + choicesSize);
  const nodesPtr = blobPtr;
  const choicesPtr = blobPtr + nodesSize;

  const mem = new DataView(exports.memory.buffer);

  // nodes header
  mem.setUint32(nodesPtr + 0, nodeCount, true);
  mem.setUint32(nodesPtr + 4, totalChoices, true);

  // node 0 meta: { firstChoice=0, choiceCount=1 }
  mem.setUint32(nodesPtr + 8 + 0, 0, true);
  mem.setUint32(nodesPtr + 8 + 4, 1, true);

  // node 1 meta: { firstChoice=1, choiceCount=1 }
  mem.setUint32(nodesPtr + 8 + 8 + 0, 1, true);
  mem.setUint32(nodesPtr + 8 + 8 + 4, 1, true);

  // choice 0 (node 0 -> node 1)
  // Layout (packed 38 bytes):
  // i32 nextNode @0
  // i16 d0,d1,d2 @4,@6,@8
  // i16 reqFaction @10
  // i16 reqMin @12
  // u32 revealMaskLo @14
  // u32 revealMaskHi @18
  // u32 requiresAllLo @22
  // u32 requiresAllHi @26
  // u32 requiresAnyLo @30
  // u32 requiresAnyHi @34
  let base = choicesPtr + 0 * 38;
  mem.setInt32(base + 0, 1, true);
  mem.setInt16(base + 4, 5, true);
  mem.setInt16(base + 6, -3, true);
  mem.setInt16(base + 8, 0, true);
  mem.setInt16(base + 10, -1, true);
  mem.setInt16(base + 12, 0, true);
  mem.setUint32(base + 14, 0x1, true);
  mem.setUint32(base + 18, 0x1, true);
  mem.setUint32(base + 22, 0x0, true);
  mem.setUint32(base + 26, 0x0, true);
  mem.setUint32(base + 30, 0x0, true);
  mem.setUint32(base + 34, 0x0, true);

  // choice 1 (node 1 -> end), gated on rep0 >= 10 and requires any secret 0x4
  base = choicesPtr + 1 * 38;
  mem.setInt32(base + 0, -1, true);
  mem.setInt16(base + 4, 0, true);
  mem.setInt16(base + 6, 0, true);
  mem.setInt16(base + 8, 0, true);
  mem.setInt16(base + 10, 0, true);
  mem.setInt16(base + 12, 10, true);
  mem.setUint32(base + 14, 0x2, true);
  mem.setUint32(base + 18, 0x0, true);
  mem.setUint32(base + 22, 0x0, true);
  mem.setUint32(base + 26, 0x0, true);
  mem.setUint32(base + 30, 0x4, true);
  mem.setUint32(base + 34, 0x0, true);

  exports.uqm_conv_set_graph_blob(blobPtr);
}

describe('uqm minimal wasm conversation core', () => {
  let exp: UqmMinimalNormalizedExports;

  beforeAll(async () => {
    exp = await loadUqmMinimalWasmExports();
  }, 60_000);

  it('uses the expected packed ChoiceMeta (38 bytes) with little-endian loads', () => {
    writeGraph(exp);

    exp.uqm_conv_reset(0, 0, 0, 0, 0);

    expect(exp.uqm_conv_get_choice_count()).toBe(1);
    expect(exp.uqm_conv_choice_is_locked(0)).toBe(0);

    expect(exp.uqm_conv_choice_get_req_faction(0)).toBe(-1);
    expect(exp.uqm_conv_choice_get_req_min(0)).toBe(0);
    expect(exp.uqm_conv_choice_get_d0(0)).toBe(5);
    expect(exp.uqm_conv_choice_get_d1(0)).toBe(-3);
    expect(exp.uqm_conv_choice_get_d2(0)).toBe(0);
    expect(exp.uqm_conv_choice_get_reveal_lo(0)).toBe(0x1);
    expect(exp.uqm_conv_choice_get_reveal_hi(0)).toBe(0x1);

    const next = exp.uqm_conv_choose(0);
    expect(next).toBe(1);

    // If endianness or offsets are wrong, these values will be wildly off.
    expect(exp.uqm_conv_get_rep(0)).toBe(5);
    expect(exp.uqm_conv_get_rep(1)).toBe(-3);
    expect(exp.uqm_conv_get_rep(2)).toBe(0);
    expect(exp.uqm_conv_get_secrets_lo()).toBe(0x1);
    expect(exp.uqm_conv_get_secrets_hi()).toBe(0x1);
    expect(exp.uqm_conv_get_current_node()).toBe(1);

    // The second node should exist (would not if nextNode were read with wrong endianness).
    expect(exp.uqm_conv_get_choice_count()).toBe(1);
  });

  it('enforces reputation-gated locks and does not advance on locked choices', () => {
    writeGraph(exp);

    exp.uqm_conv_reset64(1, 5, 0, 0, 0x1, 0x1);

    expect(exp.uqm_conv_get_choice_count()).toBe(1);
    expect(exp.uqm_conv_choice_is_locked(0)).toBe(1);
    expect(exp.uqm_conv_get_locked_choices_lo()).toBe(0x1);
    expect(exp.uqm_conv_get_locked_choices_hi()).toBe(0x0);

    const prevNode = exp.uqm_conv_get_current_node();
    const prevSecretsLo = exp.uqm_conv_get_secrets_lo();
    const prevSecretsHi = exp.uqm_conv_get_secrets_hi();
    const prevRep0 = exp.uqm_conv_get_rep(0);

    expect(exp.uqm_conv_choose(0)).toBe(-1);

    expect(exp.uqm_conv_get_current_node()).toBe(prevNode);
    expect(exp.uqm_conv_get_secrets_lo()).toBe(prevSecretsLo);
    expect(exp.uqm_conv_get_secrets_hi()).toBe(prevSecretsHi);
    expect(exp.uqm_conv_get_rep(0)).toBe(prevRep0);

    // Lock bypass should still advance state when explicitly requested.
    expect(exp.uqm_conv_choose_force(0)).toBe(-1);
    expect(exp.uqm_conv_get_current_node()).toBe(-1);
    expect(exp.uqm_conv_get_secrets_lo()).toBe(0x3);
    expect(exp.uqm_conv_get_secrets_hi()).toBe(0x1);

    // Now unlock and choose.
    // Choice 1 requires rep0 >= 10 and any-of secret mask 0x4.
    exp.uqm_conv_reset64(1, 10, 0, 0, 0x5, 0x1);
    expect(exp.uqm_conv_choice_is_locked(0)).toBe(0);
    expect(exp.uqm_conv_get_locked_choices_lo()).toBe(0x0);
    expect(exp.uqm_conv_get_locked_choices_hi()).toBe(0x0);

    expect(exp.uqm_conv_choose(0)).toBe(-1);
    expect(exp.uqm_conv_get_current_node()).toBe(-1);
    expect(exp.uqm_conv_get_secrets_lo()).toBe(0x7);
    expect(exp.uqm_conv_get_secrets_hi()).toBe(0x1);
  });

  it('handles out-of-range node/choice indices safely', () => {
    writeGraph(exp);

    exp.uqm_conv_reset64(999, 0, 0, 0, 0, 0);
    expect(exp.uqm_conv_get_choice_count()).toBe(0);
    expect(exp.uqm_conv_choice_is_locked(0)).toBe(1);
    expect(exp.uqm_conv_choose(0)).toBe(-1);

    exp.uqm_conv_reset64(0, 0, 0, 0, 0, 0);
    expect(exp.uqm_conv_choice_is_locked(99)).toBe(1);
    expect(exp.uqm_conv_choose(99)).toBe(-1);
  });
});
