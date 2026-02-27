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
  uqm_conv_reset64: (startNode: number, rep0: number, rep1: number, rep2: number, secretsLo: number, secretsHi: number) => void;
  uqm_conv_set_graph: (nodesPtr: number, choicesPtr: number) => void;
  uqm_conv_set_graph_blob: (blobPtr: number) => void;
  uqm_conv_get_current_node: () => number;
  uqm_conv_get_rep: (idx: number) => number;
  uqm_conv_get_secrets: () => number;
  uqm_conv_get_secrets_lo: () => number;
  uqm_conv_get_secrets_hi: () => number;
  uqm_conv_get_choice_count: () => number;
  uqm_conv_choice_is_locked: (localIdx: number) => number;
  uqm_conv_get_locked_choices_lo: () => number;
  uqm_conv_get_locked_choices_hi: () => number;
  uqm_conv_choose: (localIdx: number) => number;
  uqm_conv_choose_force: (localIdx: number) => number;

  uqm_conv_choice_get_req_faction: (localIdx: number) => number;
  uqm_conv_choice_get_req_min: (localIdx: number) => number;
  uqm_conv_choice_get_d0: (localIdx: number) => number;
  uqm_conv_choice_get_d1: (localIdx: number) => number;
  uqm_conv_choice_get_d2: (localIdx: number) => number;
  uqm_conv_choice_get_reveal_lo: (localIdx: number) => number;
  uqm_conv_choice_get_reveal_hi: (localIdx: number) => number;
};

const BUILT_KEY = '__uqm_minimal_wasm_built__';

function sleepSync(ms: number) {
  // Atomics.wait is the simplest portable sync sleep in Node.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function waitForFileReady(filePath: string, timeoutMs = 5000): boolean {
  const start = Date.now();
  let lastSize: number | null = null;

  while (Date.now() - start < timeoutMs) {
    try {
      const stat = fs.statSync(filePath);
      if (stat.size > 0 && lastSize != null && stat.size === lastSize) return true;
      lastSize = stat.size;
    } catch {
      // ignore
    }
    sleepSync(25);
  }

  return fs.existsSync(filePath);
}

export function ensureUqmMinimalWasmBuilt(): void {
  const g = globalThis as unknown as Record<string, unknown>;
  if (g[BUILT_KEY]) return;

  const wasmPath = path.join(process.cwd(), 'public', 'wasm', 'uqm_minimal.wasm');
  const lockPath = `${wasmPath}.lock`;

  const srcC = path.join(process.cwd(), 'third_party', 'uqm', 'minimal_wasm', 'uqm_min.c');
  const srcWat = path.join(process.cwd(), 'third_party', 'uqm', 'minimal_wasm', 'uqm_min.wat');

  const newestMtimeMs = (files: string[]) => {
    let newest = 0;
    for (const f of files) {
      try {
        const s = fs.statSync(f);
        newest = Math.max(newest, s.mtimeMs);
      } catch {
        // ignore
      }
    }
    return newest;
  };

  const hasExpectedExports = (bytes: Buffer | ArrayBuffer) => {
    try {
      const mod = new WebAssembly.Module(new Uint8Array(bytes as ArrayBuffer));
      const instance = new WebAssembly.Instance(mod, {});
      const exp = instance.exports as unknown as Record<string, unknown>;

      const ok = (names: string[]) => names.some(n => typeof exp[n] === 'function');

      return (
        ok(['uqm_alloc', '_uqm_alloc']) &&
        ok(['uqm_line_fit_chars', '_uqm_line_fit_chars']) &&
        ok(['uqm_conv_reset', '_uqm_conv_reset']) &&
        ok(['uqm_conv_reset64', '_uqm_conv_reset64']) &&
        ok(['uqm_conv_set_graph', '_uqm_conv_set_graph']) &&
        ok(['uqm_conv_set_graph_blob', '_uqm_conv_set_graph_blob']) &&
        ok(['uqm_conv_get_choice_count', '_uqm_conv_get_choice_count']) &&
        ok(['uqm_conv_choice_is_locked', '_uqm_conv_choice_is_locked']) &&
        ok(['uqm_conv_get_locked_choices_lo', '_uqm_conv_get_locked_choices_lo']) &&
        ok(['uqm_conv_get_locked_choices_hi', '_uqm_conv_get_locked_choices_hi']) &&
        ok(['uqm_conv_choose', '_uqm_conv_choose']) &&
        ok(['uqm_conv_choose_force', '_uqm_conv_choose_force']) &&
        ok(['uqm_conv_choice_get_req_faction', '_uqm_conv_choice_get_req_faction']) &&
        ok(['uqm_conv_choice_get_req_min', '_uqm_conv_choice_get_req_min']) &&
        ok(['uqm_conv_choice_get_d0', '_uqm_conv_choice_get_d0']) &&
        ok(['uqm_conv_choice_get_d1', '_uqm_conv_choice_get_d1']) &&
        ok(['uqm_conv_choice_get_d2', '_uqm_conv_choice_get_d2']) &&
        ok(['uqm_conv_choice_get_reveal_lo', '_uqm_conv_choice_get_reveal_lo']) &&
        ok(['uqm_conv_choice_get_reveal_hi', '_uqm_conv_choice_get_reveal_hi'])
      );
    } catch {
      return false;
    }
  };

  // If a previous step (e.g. `pretest`) already built the artifact, skip spawning
  // as long as it's newer than the sources and exports the expected ABI.
  if (fs.existsSync(wasmPath)) {
    waitForFileReady(wasmPath);
    try {
      const outStat = fs.statSync(wasmPath);
      const newestSrc = newestMtimeMs([srcC, srcWat]);
      if (outStat.mtimeMs >= newestSrc) {
        const bytes = fs.readFileSync(wasmPath);
        if (hasExpectedExports(bytes)) {
          g[BUILT_KEY] = true;
          return;
        }
      }
    } catch {
      // continue and rebuild
    }
  }

  let lockFd: number | null = null;
  try {
    lockFd = fs.openSync(lockPath, 'wx');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;

    // Another worker/process is building. Wait for the artifact to appear.
    // 60s max to avoid flakiness on slow CI.
    for (let i = 0; i < 2400; i++) {
      if (fs.existsSync(wasmPath) && waitForFileReady(wasmPath)) {
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

    waitForFileReady(wasmPath);
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
    uqm_conv_reset64: getFunction(raw, ['uqm_conv_reset64', '_uqm_conv_reset64']),
    uqm_conv_set_graph: getFunction(raw, ['uqm_conv_set_graph', '_uqm_conv_set_graph']),
    uqm_conv_set_graph_blob: getFunction(raw, ['uqm_conv_set_graph_blob', '_uqm_conv_set_graph_blob']),
    uqm_conv_get_current_node: getFunction(raw, ['uqm_conv_get_current_node', '_uqm_conv_get_current_node']),
    uqm_conv_get_rep: getFunction(raw, ['uqm_conv_get_rep', '_uqm_conv_get_rep']),
    uqm_conv_get_secrets: getFunction(raw, ['uqm_conv_get_secrets', '_uqm_conv_get_secrets']),
    uqm_conv_get_secrets_lo: getFunction(raw, ['uqm_conv_get_secrets_lo', '_uqm_conv_get_secrets_lo']),
    uqm_conv_get_secrets_hi: getFunction(raw, ['uqm_conv_get_secrets_hi', '_uqm_conv_get_secrets_hi']),
    uqm_conv_get_choice_count: getFunction(raw, ['uqm_conv_get_choice_count', '_uqm_conv_get_choice_count']),
    uqm_conv_choice_is_locked: getFunction(raw, ['uqm_conv_choice_is_locked', '_uqm_conv_choice_is_locked']),
    uqm_conv_get_locked_choices_lo: getFunction(raw, ['uqm_conv_get_locked_choices_lo', '_uqm_conv_get_locked_choices_lo']),
    uqm_conv_get_locked_choices_hi: getFunction(raw, ['uqm_conv_get_locked_choices_hi', '_uqm_conv_get_locked_choices_hi']),
    uqm_conv_choose: getFunction(raw, ['uqm_conv_choose', '_uqm_conv_choose']),
    uqm_conv_choose_force: getFunction(raw, ['uqm_conv_choose_force', '_uqm_conv_choose_force']),

    uqm_conv_choice_get_req_faction: getFunction(raw, ['uqm_conv_choice_get_req_faction', '_uqm_conv_choice_get_req_faction']),
    uqm_conv_choice_get_req_min: getFunction(raw, ['uqm_conv_choice_get_req_min', '_uqm_conv_choice_get_req_min']),
    uqm_conv_choice_get_d0: getFunction(raw, ['uqm_conv_choice_get_d0', '_uqm_conv_choice_get_d0']),
    uqm_conv_choice_get_d1: getFunction(raw, ['uqm_conv_choice_get_d1', '_uqm_conv_choice_get_d1']),
    uqm_conv_choice_get_d2: getFunction(raw, ['uqm_conv_choice_get_d2', '_uqm_conv_choice_get_d2']),
    uqm_conv_choice_get_reveal_lo: getFunction(raw, ['uqm_conv_choice_get_reveal_lo', '_uqm_conv_choice_get_reveal_lo']),
    uqm_conv_choice_get_reveal_hi: getFunction(raw, ['uqm_conv_choice_get_reveal_hi', '_uqm_conv_choice_get_reveal_hi']),
  };
}
