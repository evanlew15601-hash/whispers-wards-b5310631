import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export type UqmMinimalNormalizedExports = {
  memory: WebAssembly.Memory;
  uqm_alloc: (size: number) => number;
  uqm_version_ptr: () => number;
  uqm_version_len: () => number;
  uqm_line_fit_chars: (strPtr: number, maxWidth: number) => number;

  uqm_conv_reset: (startNode: number, rep0: number, rep1: number, rep2: number, secrets: number) => void;
  uqm_conv_set_graph: (nodesPtr: number, choicesPtr: number) => void;
  uqm_conv_get_current_node: () => number;
  uqm_conv_get_rep: (idx: number) => number;
  uqm_conv_get_secrets: () => number;
  uqm_conv_get_choice_count: () => number;
  uqm_conv_choice_is_locked: (localIdx: number) => number;
  uqm_conv_choose: (localIdx: number) => number;
};

const BUILT_KEY = '__uqm_minimal_wasm_built__';

function sleepSync(ms: number) {
  // Atomics.wait is the simplest portable sync sleep in Node.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function ensureUqmMinimalWasmBuilt(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  if (g[BUILT_KEY]) return;

  const wasmPath = path.join(process.cwd(), 'public', 'wasm', 'uqm_minimal.wasm');
  const lockPath = `${wasmPath}.lock`;

  // If a previous step (e.g. `pretest`) already built the artifact, skip spawning.
  if (fs.existsSync(wasmPath)) {
    g[BUILT_KEY] = true;
    return;
  }

  let lockFd: number | null = null;
  try {
    lockFd = fs.openSync(lockPath, 'wx');
  } catch {
    // Another worker/process is building. Wait for the artifact to appear.
    // 60s max to avoid flakiness on slow CI.
    for (let i = 0; i < 2400; i++) {
      if (fs.existsSync(wasmPath)) {
        g[BUILT_KEY] = true;
        return;
      }
      sleepSync(25);
    }
    // Fall through and attempt to build anyway (lock holder may have crashed).
  }

  try {
    const res = spawnSync(process.execPath, ['scripts/build-uqm-minimal-wasm.mjs'], {
      cwd: process.cwd(),
      stdio: 'pipe',
      encoding: 'utf8',
      env: process.env,
    });

    if (res.status !== 0) {
      const out = [res.stdout, res.stderr].filter(Boolean).join('\n');
      throw new Error(`Failed to build UQM minimal wasm (exit ${res.status}). Output:\n${out}`);
    }

    g[BUILT_KEY] = true;
  } finally {
    if (lockFd != null) {
      try {
        fs.closeSync(lockFd);
      } catch {
        // ignore
      }
      try {
        fs.unlinkSync(lockPath);
      } catch {
        // ignore
      }
    }
  }
}

function getFunction<T extends Function>(raw: Record<string, unknown>, names: string[]): T {
  for (const name of names) {
    const v = raw[name];
    if (typeof v === 'function') return v as unknown as T;
  }
  throw new Error(`Missing wasm export function (tried: ${names.join(', ')})`);
}

export async function loadUqmMinimalWasmExports(): Promise<UqmMinimalNormalizedExports> {
  ensureUqmMinimalWasmBuilt();

  const wasmPath = path.join(process.cwd(), 'public', 'wasm', 'uqm_minimal.wasm');
  const bytes = fs.readFileSync(wasmPath);

  const { instance } = await WebAssembly.instantiate(bytes, {});
  const raw = instance.exports as unknown as Record<string, unknown>;

  const memory = (raw.memory ?? raw.wasmMemory ?? raw._memory) as WebAssembly.Memory | undefined;
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new Error('Missing wasm memory export (expected `memory`/`wasmMemory`/`_memory`)');
  }

  return {
    memory,
    uqm_alloc: getFunction(raw, ['uqm_alloc', '_uqm_alloc']),
    uqm_version_ptr: getFunction(raw, ['uqm_version_ptr', 'uqm_version', '_uqm_version_ptr', '_uqm_version']),
    uqm_version_len: getFunction(raw, ['uqm_version_len', '_uqm_version_len']),
    uqm_line_fit_chars: getFunction(raw, ['uqm_line_fit_chars', '_uqm_line_fit_chars']),

    uqm_conv_reset: getFunction(raw, ['uqm_conv_reset', '_uqm_conv_reset']),
    uqm_conv_set_graph: getFunction(raw, ['uqm_conv_set_graph', '_uqm_conv_set_graph']),
    uqm_conv_get_current_node: getFunction(raw, ['uqm_conv_get_current_node', '_uqm_conv_get_current_node']),
    uqm_conv_get_rep: getFunction(raw, ['uqm_conv_get_rep', '_uqm_conv_get_rep']),
    uqm_conv_get_secrets: getFunction(raw, ['uqm_conv_get_secrets', '_uqm_conv_get_secrets']),
    uqm_conv_get_choice_count: getFunction(raw, ['uqm_conv_get_choice_count', '_uqm_conv_get_choice_count']),
    uqm_conv_choice_is_locked: getFunction(raw, ['uqm_conv_choice_is_locked', '_uqm_conv_choice_is_locked']),
    uqm_conv_choose: getFunction(raw, ['uqm_conv_choose', '_uqm_conv_choose']),
  };
}
