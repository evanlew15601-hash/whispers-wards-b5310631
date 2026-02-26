# The Ur-Quan Masters (UQM) - vendored engine code (no content)

This directory vendors a small subset of The Ur-Quan Masters (UQM) engine **source code** from:

- https://github.com/juj/sc2-uqm
  - Snapshot: `ff2444088d42e80612fd28f79d368783e244a606` (master)

## Manifest (what is committed vs fetched)

See `third_party/uqm/VENDORED_MANIFEST.json` for the authoritative list of:

- `vendored_files`: verbatim upstream files committed under `third_party/uqm/`
- `derived_files`: locally-maintained files (currently the `minimal_wasm/` demo)

A minimal set of upstream files under `sc2/src/uqm/` is committed to this repo (verbatim, retaining original headers).
To avoid bloating the repository, the full upstream snapshot is fetched on-demand into `third_party/uqm/upstream/` (not committed).

## Licensing

- The UQM **engine code** is licensed under **GPL-2.0-or-later**.
- The original UQM **game content** (voiceovers, dialogue, graphics, sounds, music, etc.) is licensed under **CC BY-NC-SA 2.5** (see upstream `COPYING`).

This repository intentionally vendors **engine code only**.

## Explicitly not included

We do **not** vendor or ship any UQM content/dialogue assets (including race scripts, strings, voice, images, sounds, music, or other packaged content).

## Fetching the full upstream source snapshot (engine-only)

If you need to browse or diff against the full upstream source tree, you can download and extract the pinned revision into:

- `third_party/uqm/upstream/`

The fetch step intentionally excludes content assets. The installed snapshot is identified by:

- `third_party/uqm/upstream/.pinned-revision` (contains the exact commit SHA)

Commands:

```sh
node scripts/fetch-uqm-upstream.mjs
# or (idempotent)
node scripts/ensure-uqm-upstream.mjs
```

## Upstream license text

See `third_party/uqm/COPYING` for the upstream UQM licensing text as distributed with the project.
