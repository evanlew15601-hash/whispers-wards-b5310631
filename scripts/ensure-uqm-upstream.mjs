import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { PINNED_REVISION } from './uqm-upstream-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const upstreamDir = path.join(root, 'third_party', 'uqm', 'upstream');
const markerPath = path.join(upstreamDir, '.pinned-revision');

function readPinnedRevision() {
  try {
    return fs.readFileSync(markerPath, 'utf8').trim();
  } catch {
    return null;
  }
}

const installed = readPinnedRevision();
const requiredDir = path.join(upstreamDir, 'sc2', 'src');
if (installed === PINNED_REVISION && fs.existsSync(requiredDir)) {
  process.exit(0);
}

const res = spawnSync(process.execPath, ['scripts/fetch-uqm-upstream.mjs'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});

process.exit(res.status ?? 1);
