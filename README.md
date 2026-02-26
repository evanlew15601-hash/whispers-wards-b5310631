# Crown & Concord

A small, dialogue-driven browser game about high-fantasy diplomacy, built with Vite + React + TypeScript.

## License

- **This repository** is licensed under **GPL-2.0-or-later** (see `LICENSE`).
- **Vendored upstream code**: `third_party/uqm` contains a small subset of The Ur-Quan Masters (UQM) **engine source code**. It remains under its upstream **GPL-2.0-or-later** licensing; see `third_party/uqm/COPYING`.
- **No UQM content**: this repo does **not** include any UQM lore/dialogue or other game assets/content.

## Development

```sh
npm install
npm run dev
npm run test
npm run build
```

### UQM WASM demo

This repo includes a tiny **UQM-derived** WebAssembly module (derived from `third_party/uqm/sc2/src/uqm/comm.c`) used as a runtime proof that we can execute UQM-originating code in-browser.

- The `.wasm` file is generated into `public/wasm/uqm_minimal.wasm`.
- It is built automatically on `npm run dev` / `npm run build` via `scripts/build-uqm-minimal-wasm.mjs`.
- No system C toolchain is required: if `clang`/`emcc` aren’t available, the build falls back to compiling `third_party/uqm/minimal_wasm/uqm_min.wat` using the `wabt` npm package.
