import { describe, expect, it } from 'vitest';

import { loadUqmMinimalWasmExports } from './uqmWasmTestUtils';

describe('UQM minimal wasm build artifact', () => {
  it(
    'exposes expected exports (including conversation core)',
    async () => {
      const exp = await loadUqmMinimalWasmExports();

      expect(exp.memory).toBeInstanceOf(WebAssembly.Memory);
      expect(typeof exp.uqm_alloc).toBe('function');
      expect(typeof exp.uqm_version_ptr).toBe('function');
      expect(typeof exp.uqm_version_len).toBe('function');
      expect(typeof exp.uqm_line_fit_chars).toBe('function');

      expect(typeof exp.uqm_conv_reset).toBe('function');
      expect(typeof exp.uqm_conv_reset64).toBe('function');
      expect(typeof exp.uqm_conv_set_graph).toBe('function');
      expect(typeof exp.uqm_conv_get_current_node).toBe('function');
      expect(typeof exp.uqm_conv_get_rep).toBe('function');
      expect(typeof exp.uqm_conv_get_secrets).toBe('function');
      expect(typeof exp.uqm_conv_get_secrets_lo).toBe('function');
      expect(typeof exp.uqm_conv_get_secrets_hi).toBe('function');
      expect(typeof exp.uqm_conv_get_choice_count).toBe('function');
      expect(typeof exp.uqm_conv_choice_is_locked).toBe('function');
      expect(typeof exp.uqm_conv_choose).toBe('function');
    },
    60_000,
  );

  it(
    'line-fit demo behaves reasonably',
    async () => {
      const exp = await loadUqmMinimalWasmExports();

      const mem = new Uint8Array(exp.memory.buffer);
      const enc = new TextEncoder();

      const ptr = exp.uqm_alloc(64);
      const bytes = enc.encode('Hello from UQM');
      mem.set(bytes, ptr);
      mem[ptr + bytes.length] = 0;

      // With maxWidth=8, should fit "Hello " (6 chars) but not "from".
      expect(exp.uqm_line_fit_chars(ptr, 8)).toBe(6);

      // With maxWidth=6, should fit "Hello" (5 chars).
      expect(exp.uqm_line_fit_chars(ptr, 6)).toBe(5);
    },
    60_000,
  );
});
