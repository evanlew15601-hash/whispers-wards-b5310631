export type UqmWasmExports = {
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

export type UqmWasmRuntime = {
  /** Raw wasm exports (memory + functions). */
  exports: UqmWasmExports;

  getVersionString: () => string;
  lineFitChars: (text: string, maxWidth: number) => number;
};

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
  const uqm_conv_set_graph = (raw.uqm_conv_set_graph ?? raw._uqm_conv_set_graph) as
    | ((nodesPtr: number, choicesPtr: number) => void)
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
  const uqm_conv_get_choice_count = (raw.uqm_conv_get_choice_count ?? raw._uqm_conv_get_choice_count) as
    | (() => number)
    | undefined;
  const uqm_conv_choice_is_locked = (raw.uqm_conv_choice_is_locked ?? raw._uqm_conv_choice_is_locked) as
    | ((localIdx: number) => number)
    | undefined;
  const uqm_conv_choose = (raw.uqm_conv_choose ?? raw._uqm_conv_choose) as
    | ((localIdx: number) => number)
    | undefined;

  if (
    !memory ||
    !uqm_alloc ||
    !uqm_version_ptr ||
    !uqm_version_len ||
    !uqm_line_fit_chars ||
    !uqm_conv_reset ||
    !uqm_conv_set_graph ||
    !uqm_conv_get_current_node ||
    !uqm_conv_get_rep ||
    !uqm_conv_get_secrets ||
    !uqm_conv_get_choice_count ||
    !uqm_conv_choice_is_locked ||
    !uqm_conv_choose
  ) {
    throw new Error('UQM wasm module exports missing expected symbols');
  }

  return {
    memory,
    uqm_alloc,
    uqm_version_ptr,
    uqm_version_len,
    uqm_line_fit_chars,

    uqm_conv_reset,
    uqm_conv_set_graph,
    uqm_conv_get_current_node,
    uqm_conv_get_rep,
    uqm_conv_get_secrets,
    uqm_conv_get_choice_count,
    uqm_conv_choice_is_locked,
    uqm_conv_choose,
  };
}

async function instantiateUqmWasm(): Promise<UqmWasmRuntime> {
  const wasmUrl = `${import.meta.env.BASE_URL}wasm/uqm_minimal.wasm`;

  const response = await fetch(wasmUrl);
  if (!response.ok) {
    throw new Error(`Failed to load UQM wasm: ${response.status} ${response.statusText}`);
  }

  let instance: WebAssembly.Instance;
  if ('instantiateStreaming' in WebAssembly) {
    try {
      const res = await WebAssembly.instantiateStreaming(response, {});
      instance = res.instance;
    } catch {
      const bytes = await (await fetch(wasmUrl)).arrayBuffer();
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
}

export function loadUqmWasmRuntime(): Promise<UqmWasmRuntime> {
  if (!cached) cached = instantiateUqmWasm();
  return cached;
}
