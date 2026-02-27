export type UqmWasmExports = {
  memory: WebAssembly.Memory;
  uqm_alloc: (size: number) => number;
  uqm_version_ptr: () => number;
  uqm_version_len: () => number;
  uqm_line_fit_chars: (strPtr: number, maxWidth: number) => number;

  uqm_conv_reset: (startNode: number, rep0: number, rep1: number, rep2: number, secrets: number) => void;
  uqm_conv_reset64?: (startNode: number, rep0: number, rep1: number, rep2: number, secretsLo: number, secretsHi: number) => void;
  uqm_conv_set_graph: (nodesPtr: number, choicesPtr: number) => void;
  uqm_conv_set_graph_blob?: (blobPtr: number) => void;
  uqm_conv_get_current_node: () => number;
  uqm_conv_get_rep: (idx: number) => number;
  uqm_conv_get_secrets: () => number;
  uqm_conv_get_secrets_lo?: () => number;
  uqm_conv_get_secrets_hi?: () => number;
  uqm_conv_get_choice_count: () => number;
  uqm_conv_choice_is_locked: (localIdx: number) => number;
  uqm_conv_get_locked_choices_lo?: () => number;
  uqm_conv_get_locked_choices_hi?: () => number;
  uqm_conv_choose: (localIdx: number) => number;
  uqm_conv_choose_force?: (localIdx: number) => number;

  uqm_conv_choice_get_req_faction?: (localIdx: number) => number;
  uqm_conv_choice_get_req_min?: (localIdx: number) => number;
  uqm_conv_choice_get_d0?: (localIdx: number) => number;
  uqm_conv_choice_get_d1?: (localIdx: number) => number;
  uqm_conv_choice_get_d2?: (localIdx: number) => number;
  uqm_conv_choice_get_reveal_lo?: (localIdx: number) => number;
  uqm_conv_choice_get_reveal_hi?: (localIdx: number) => number;
};

export type UqmWasmRuntime = {
  /** Raw wasm exports (memory + functions). */
  exports: UqmWasmExports;

  getVersionString: () => string;
  lineFitChars: (text: string, maxWidth: number) => number;
};

const DEFAULT_LOAD_TIMEOUT_MS = 15_000;

let cached: Promise<UqmWasmRuntime> | null = null;

function getExports(instance: WebAssembly.Instance): UqmWasmExports {
  const raw = instance.exports as unknown as Record<string, unknown>;

  const memory = (raw.memory ?? raw.wasmMemory ?? raw._memory) as WebAssembly.Memory | undefined;
  const uqm_alloc = (raw.uqm_alloc ?? raw._uqm_alloc) as
    | ((size: number) => number)
    | undefined;
  const uqm_version_ptr = (raw.uqm_version_ptr ?? raw.uqm_version ?? raw._uqm_version_ptr ?? raw._uqm_version) as
    | (() => number)
    | undefined;
  const uqm_version_len = (raw.uqm_version_len ?? raw._uqm_version_len) as
    | (() => number)
    | undefined;
  const uqm_line_fit_chars = (raw.uqm_line_fit_chars ?? raw._uqm_line_fit_chars) as
    | ((strPtr: number, maxWidth: number) => number)
    | undefined;

  const uqm_conv_reset = (raw.uqm_conv_reset ?? raw._uqm_conv_reset) as
    | ((startNode: number, rep0: number, rep1: number, rep2: number, secrets: number) => void)
    | undefined;
  const uqm_conv_reset64 = (raw.uqm_conv_reset64 ?? raw._uqm_conv_reset64) as
    | ((startNode: number, rep0: number, rep1: number, rep2: number, secretsLo: number, secretsHi: number) => void)
    | undefined;
  const uqm_conv_set_graph = (raw.uqm_conv_set_graph ?? raw._uqm_conv_set_graph) as
    | ((nodesPtr: number, choicesPtr: number) => void)
    | undefined;
  const uqm_conv_set_graph_blob = (raw.uqm_conv_set_graph_blob ?? raw._uqm_conv_set_graph_blob) as
    | ((blobPtr: number) => void)
    | undefined;
  const uqm_conv_get_current_node = (raw.uqm_conv_get_current_node ?? raw._uqm_conv_get_current_node) as
    | (() => number)
    | undefined;
  const uqm_conv_get_rep = (raw.uqm_conv_get_rep ?? raw._uqm_conv_get_rep) as
    | ((idx: number) => number)
    | undefined;
  const uqm_conv_get_secrets = (raw.uqm_conv_get_secrets ?? raw._uqm_conv_get_secrets) as
    | (() => number)
    | undefined;
  const uqm_conv_get_secrets_lo = (raw.uqm_conv_get_secrets_lo ?? raw._uqm_conv_get_secrets_lo) as
    | (() => number)
    | undefined;
  const uqm_conv_get_secrets_hi = (raw.uqm_conv_get_secrets_hi ?? raw._uqm_conv_get_secrets_hi) as
    | (() => number)
    | undefined;
  const uqm_conv_get_choice_count = (raw.uqm_conv_get_choice_count ?? raw._uqm_conv_get_choice_count) as
    | (() => number)
    | undefined;
  const uqm_conv_choice_is_locked = (raw.uqm_conv_choice_is_locked ?? raw._uqm_conv_choice_is_locked) as
    | ((localIdx: number) => number)
    | undefined;
  const uqm_conv_get_locked_choices_lo = (raw.uqm_conv_get_locked_choices_lo ?? raw._uqm_conv_get_locked_choices_lo) as
    | (() => number)
    | undefined;
  const uqm_conv_get_locked_choices_hi = (raw.uqm_conv_get_locked_choices_hi ?? raw._uqm_conv_get_locked_choices_hi) as
    | (() => number)
    | undefined;
  const uqm_conv_choose = (raw.uqm_conv_choose ?? raw._uqm_conv_choose) as
    | ((localIdx: number) => number)
    | undefined;
  const uqm_conv_choose_force = (raw.uqm_conv_choose_force ?? raw._uqm_conv_choose_force) as
    | ((localIdx: number) => number)
    | undefined;

  const uqm_conv_choice_get_req_faction = (raw.uqm_conv_choice_get_req_faction ?? raw._uqm_conv_choice_get_req_faction) as
    | ((localIdx: number) => number)
    | undefined;
  const uqm_conv_choice_get_req_min = (raw.uqm_conv_choice_get_req_min ?? raw._uqm_conv_choice_get_req_min) as
    | ((localIdx: number) => number)
    | undefined;
  const uqm_conv_choice_get_d0 = (raw.uqm_conv_choice_get_d0 ?? raw._uqm_conv_choice_get_d0) as
    | ((localIdx: number) => number)
    | undefined;
  const uqm_conv_choice_get_d1 = (raw.uqm_conv_choice_get_d1 ?? raw._uqm_conv_choice_get_d1) as
    | ((localIdx: number) => number)
    | undefined;
  const uqm_conv_choice_get_d2 = (raw.uqm_conv_choice_get_d2 ?? raw._uqm_conv_choice_get_d2) as
    | ((localIdx: number) => number)
    | undefined;
  const uqm_conv_choice_get_reveal_lo = (raw.uqm_conv_choice_get_reveal_lo ?? raw._uqm_conv_choice_get_reveal_lo) as
    | ((localIdx: number) => number)
    | undefined;
  const uqm_conv_choice_get_reveal_hi = (raw.uqm_conv_choice_get_reveal_hi ?? raw._uqm_conv_choice_get_reveal_hi) as
    | ((localIdx: number) => number)
    | undefined;

  if (
    !memory ||
    !uqm_alloc ||
    !uqm_version_ptr ||
    !uqm_version_len ||
    !uqm_line_fit_chars ||
    !uqm_conv_reset ||
    !uqm_conv_reset64 ||
    !uqm_conv_set_graph ||
    !uqm_conv_set_graph_blob ||
    !uqm_conv_get_current_node ||
    !uqm_conv_get_rep ||
    !uqm_conv_get_secrets ||
    !uqm_conv_get_secrets_lo ||
    !uqm_conv_get_secrets_hi ||
    !uqm_conv_get_choice_count ||
    !uqm_conv_choice_is_locked ||
    !uqm_conv_get_locked_choices_lo ||
    !uqm_conv_get_locked_choices_hi ||
    !uqm_conv_choose ||
    !uqm_conv_choose_force ||
    !uqm_conv_choice_get_req_faction ||
    !uqm_conv_choice_get_req_min ||
    !uqm_conv_choice_get_d0 ||
    !uqm_conv_choice_get_d1 ||
    !uqm_conv_choice_get_d2 ||
    !uqm_conv_choice_get_reveal_lo ||
    !uqm_conv_choice_get_reveal_hi
  ) {
    throw new Error('UQM wasm module missing required exports');
  }

  return {
    memory,
    uqm_alloc,
    uqm_version_ptr,
    uqm_version_len,
    uqm_line_fit_chars,

    uqm_conv_reset,
    uqm_conv_reset64,
    uqm_conv_set_graph,
    uqm_conv_set_graph_blob,
    uqm_conv_get_current_node,
    uqm_conv_get_rep,
    uqm_conv_get_secrets,
    uqm_conv_get_secrets_lo,
    uqm_conv_get_secrets_hi,
    uqm_conv_get_choice_count,
    uqm_conv_choice_is_locked,
    uqm_conv_get_locked_choices_lo,
    uqm_conv_get_locked_choices_hi,
    uqm_conv_choose,
    uqm_conv_choose_force,

    uqm_conv_choice_get_req_faction,
    uqm_conv_choice_get_req_min,
    uqm_conv_choice_get_d0,
    uqm_conv_choice_get_d1,
    uqm_conv_choice_get_d2,
    uqm_conv_choice_get_reveal_lo,
    uqm_conv_choice_get_reveal_hi,
  };
}

async function instantiateUqmWasm(): Promise<UqmWasmRuntime> {
  const wasmUrl = `${import.meta.env.BASE_URL}wasm/uqm_minimal.wasm`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_LOAD_TIMEOUT_MS);

  try {
    const response = await fetch(wasmUrl, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Failed to load UQM wasm: ${response.status} ${response.statusText}`);
    }

    let instance: WebAssembly.Instance;
    if (typeof WebAssembly.instantiateStreaming === 'function') {
      try {
        const res = await WebAssembly.instantiateStreaming(response, {});
        instance = res.instance;
      } catch {
        if (controller.signal.aborted) {
          throw new Error('Timed out loading UQM wasm');
        }

        const bytes = await (await fetch(wasmUrl, { signal: controller.signal })).arrayBuffer();
        const res = await WebAssembly.instantiate(bytes, {});
        instance = res.instance;
      }
    } else {
      const bytes = await response.arrayBuffer();
      const res = await WebAssembly.instantiate(bytes, {});
      instance = res.instance;
    }

    const exports = getExports(instance);
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
  } catch (err) {
    if (controller.signal.aborted) {
      throw new Error('Timed out loading UQM wasm');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function loadUqmWasmRuntime(): Promise<UqmWasmRuntime> {
  if (!cached) {
    cached = instantiateUqmWasm().catch(err => {
      cached = null;
      throw err;
    });
  }

  return cached;
}
