import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const srcC = path.join(root, 'third_party', 'uqm', 'minimal_wasm', 'uqm_min.c');
const srcWat = path.join(root, 'third_party', 'uqm', 'minimal_wasm', 'uqm_min.wat');
const outDir = path.join(root, 'public', 'wasm');
const outWasm = path.join(outDir, 'uqm_minimal.wasm');

function tryRun(cmd, args) {
  const res = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  return res.status === 0;
}

function commandExists(cmd) {
  const res = spawnSync(cmd, ['--version'], {
    cwd: root,
    stdio: 'ignore',
    env: process.env,
  });
  return res.status === 0;
}

function newestMtimeMs(files) {
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
}

function validateWasm(bytes) {
  // Basic sanity check: make sure it instantiates and exports expected symbols.
  // This catches cases where a toolchain "succeeds" but produces an unusable module.
  try {
    const mod = new WebAssembly.Module(bytes);
    const instance = new WebAssembly.Instance(mod, {});
    const exp = instance.exports;

    const memory = exp.memory ?? exp.wasmMemory ?? exp._memory;
    if (!(memory instanceof WebAssembly.Memory)) return false;

    const ok = (names) => names.some((n) => n in exp && typeof exp[n] === 'function');

    if (!ok(['uqm_alloc', '_uqm_alloc'])) return false;
    if (!ok(['uqm_version_ptr', 'uqm_version', '_uqm_version_ptr', '_uqm_version'])) return false;
    if (!ok(['uqm_version_len', '_uqm_version_len'])) return false;
    if (!ok(['uqm_line_fit_chars', '_uqm_line_fit_chars'])) return false;

    if (!ok(['uqm_conv_reset', '_uqm_conv_reset'])) return false;
    if (!ok(['uqm_conv_set_graph', '_uqm_conv_set_graph'])) return false;
    if (!ok(['uqm_conv_get_current_node', '_uqm_conv_get_current_node'])) return false;
    if (!ok(['uqm_conv_get_rep', '_uqm_conv_get_rep'])) return false;
    if (!ok(['uqm_conv_get_secrets', '_uqm_conv_get_secrets'])) return false;
    if (!ok(['uqm_conv_get_choice_count', '_uqm_conv_get_choice_count'])) return false;
    if (!ok(['uqm_conv_choice_is_locked', '_uqm_conv_choice_is_locked'])) return false;
    if (!ok(['uqm_conv_choose', '_uqm_conv_choose'])) return false;

    return true;
  } catch {
    return false;
  }
}

fs.mkdirSync(outDir, { recursive: true });

// Skip if output is newer than sources.
try {
  const outStat = fs.statSync(outWasm);
  const newestSrc = newestMtimeMs([srcC, srcWat, __filename]);
  if (outStat.mtimeMs >= newestSrc) {
    console.log(`[uqm-wasm] up-to-date: ${path.relative(root, outWasm)}`);
    process.exit(0);
  }
} catch {
  // continue
}

let built = false;

// Prefer native toolchains if present.
const clangCandidates = ['clang', 'clang-18', 'clang-17', 'clang-16'];
for (const clang of clangCandidates) {
  if (!commandExists(clang)) continue;

  console.log(`[uqm-wasm] trying toolchain: ${clang} (wasm32-unknown-unknown)`);
  built = tryRun(clang, [
    '--target=wasm32-unknown-unknown',
    '-O3',
    '-nostdlib',
    '-Wl,--no-entry',
    '-Wl,--export=uqm_alloc',
    '-Wl,--export=uqm_version_ptr',
    '-Wl,--export=uqm_version_len',
    '-Wl,--export=uqm_line_fit_chars',
    '-Wl,--export=uqm_conv_reset',
    '-Wl,--export=uqm_conv_set_graph',
    '-Wl,--export=uqm_conv_get_current_node',
    '-Wl,--export=uqm_conv_get_rep',
    '-Wl,--export=uqm_conv_get_secrets',
    '-Wl,--export=uqm_conv_get_choice_count',
    '-Wl,--export=uqm_conv_choice_is_locked',
    '-Wl,--export=uqm_conv_choose',
    '-Wl,--export-memory',
    '-Wl,--strip-all',
    '-o',
    outWasm,
    srcC,
  ]);

  if (built) {
    try {
      const bytes = fs.readFileSync(outWasm);
      built = validateWasm(bytes);
    } catch {
      built = false;
    }
  }

  if (built) break;
}

if (!built && commandExists('emcc')) {
  console.log('[uqm-wasm] clang wasm build failed; trying toolchain: emcc');

  built = tryRun('emcc', [
    srcC,
    '-O3',
    '-s',
    'STANDALONE_WASM=1',
    '-s',
    'ERROR_ON_UNDEFINED_SYMBOLS=1',
    '-s',
    'EXPORTED_FUNCTIONS=["_uqm_alloc","_uqm_version_ptr","_uqm_version_len","_uqm_line_fit_chars","_uqm_conv_reset","_uqm_conv_set_graph","_uqm_conv_get_current_node","_uqm_conv_get_rep","_uqm_conv_get_secrets","_uqm_conv_get_choice_count","_uqm_conv_choice_is_locked","_uqm_conv_choose"]',
    '-Wl,--export-memory',
    '-o',
    outWasm,
  ]);

  if (built) {
    try {
      const bytes = fs.readFileSync(outWasm);
      built = validateWasm(bytes);
    } catch {
      built = false;
    }
  }
}

// Guaranteed fallback: compile WAT via wabt (no system compiler required).
if (!built) {
  console.log('[uqm-wasm] no native toolchain available; compiling WAT via wabt');

  const wabtModule = await import('wabt');
  const wabtFactory = wabtModule.default ?? wabtModule;
  const wabt = await wabtFactory();

  const watSource = fs.readFileSync(srcWat, 'utf8');
  const parsed = wabt.parseWat(srcWat, watSource, { features: { mutable_globals: true } });
  const { buffer } = parsed.toBinary({ log: false, write_debug_names: false });

  const bytes = Buffer.from(buffer);
  if (!validateWasm(bytes)) {
    throw new Error('[uqm-wasm] WAT compilation produced an invalid wasm module');
  }

  fs.writeFileSync(outWasm, bytes);
  built = true;
}

console.log(`[uqm-wasm] wrote ${path.relative(root, outWasm)}`);
