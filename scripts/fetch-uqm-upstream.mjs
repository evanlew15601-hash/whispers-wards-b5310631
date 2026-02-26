import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import tar from 'tar';

import {
  PINNED_REVISION,
  UPSTREAM_REPO,
  UPSTREAM_TARBALL_URL,
} from './uqm-upstream-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const uqmDir = path.join(root, 'third_party', 'uqm');
const upstreamDir = path.join(uqmDir, 'upstream');
const markerPath = path.join(upstreamDir, '.pinned-revision');

function readPinnedRevision() {
  try {
    return fs.readFileSync(markerPath, 'utf8').trim();
  } catch {
    return null;
  }
}

function normalizeTarPath(p) {
  const posix = p.replace(/\\/g, '/');
  if (posix.startsWith('sc2/')) return posix;
  const idx = posix.indexOf('/');
  if (idx === -1) return '';
  return posix.slice(idx + 1);
}

const excludedPrefixes = [
  'sc2/content/',
  'sc2/packages/',
  'sc2/uqm/content/',
];

const excludedExtensions = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.tga',
  '.webp',
  '.ico',
  '.wav',
  '.ogg',
  '.mp3',
  '.flac',
  '.mod',
  '.xm',
  '.it',
  '.s3m',
  '.mid',
  '.midi',
  '.ttf',
  '.otf',
  '.fnt',
  '.pdf',
  '.psd',
  '.blend',
  '.zip',
  '.7z',
  '.rar',
  '.uqm',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.a',
  '.lib',
  '.o',
  '.obj',
]);

function shouldExtract(entryPath) {
  const rel = normalizeTarPath(entryPath);
  if (!rel) return false;

  // This repo only needs the engine source tree.
  if (!rel.startsWith('sc2/')) return false;

  // Always keep the full engine source directory.
  if (rel.startsWith('sc2/src/')) return true;

  for (const prefix of excludedPrefixes) {
    if (rel.startsWith(prefix)) return false;
  }

  const ext = path.posix.extname(rel).toLowerCase();
  if (excludedExtensions.has(ext)) return false;

  return true;
}

function downloadToFile(url, outPath, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error(`[uqm-upstream] too many redirects while fetching ${url}`));
      return;
    }

    const req = https.get(
      url,
      {
        headers: {
          'User-Agent': 'uqm-upstream-fetch',
          Accept: 'application/octet-stream',
        },
      },
      (res) => {
        const status = res.statusCode ?? 0;

        if (status >= 300 && status < 400 && res.headers.location) {
          res.resume();
          const nextUrl = new URL(res.headers.location, url).toString();
          downloadToFile(nextUrl, outPath, redirectCount + 1).then(resolve, reject);
          return;
        }

        if (status !== 200) {
          res.resume();
          reject(new Error(`[uqm-upstream] failed to download tarball (${status}) from ${url}`));
          return;
        }

        const file = fs.createWriteStream(outPath);
        res.pipe(file);

        file.on('finish', () => file.close(resolve));
        file.on('error', reject);
      },
    );

    req.on('error', reject);
  });
}

const alreadyPinned = readPinnedRevision();
const upstreamRequiredDir = path.join(upstreamDir, 'sc2', 'src');
if (alreadyPinned === PINNED_REVISION && fs.existsSync(upstreamRequiredDir)) {
  console.log(`[uqm-upstream] already installed: ${PINNED_REVISION}`);
  process.exit(0);
}

fs.mkdirSync(uqmDir, { recursive: true });

const tmpRoot = fs.mkdtempSync(path.join(uqmDir, '.upstream-tmp-'));
const tmpOut = path.join(tmpRoot, 'upstream');
const tmpTarball = path.join(tmpRoot, 'uqm.tar.gz');

fs.mkdirSync(tmpOut, { recursive: true });

try {
  console.log(`[uqm-upstream] downloading ${UPSTREAM_REPO}@${PINNED_REVISION.slice(0, 7)}…`);
  await downloadToFile(UPSTREAM_TARBALL_URL, tmpTarball);

  console.log('[uqm-upstream] extracting (excluding content assets)…');
  await tar.x({
    file: tmpTarball,
    cwd: tmpOut,
    strip: 1,
    filter: shouldExtract,
  });

  fs.writeFileSync(path.join(tmpOut, '.pinned-revision'), `${PINNED_REVISION}\n`);

  const extractedRequiredDir = path.join(tmpOut, 'sc2', 'src');
  if (!fs.existsSync(extractedRequiredDir)) {
    throw new Error(
      `[uqm-upstream] extracted snapshot is missing sc2/src (got: ${extractedRequiredDir})`,
    );
  }

  fs.rmSync(upstreamDir, { recursive: true, force: true });
  fs.renameSync(tmpOut, upstreamDir);

  console.log(`[uqm-upstream] installed into ${path.relative(root, upstreamDir)}`);
} finally {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
}
