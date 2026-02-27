import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'public', 'audio', 'ambience');

const force = process.argv.includes('--force');

const assets = [
  {
    id: 'title_regal',
    url: 'https://opengameart.org/sites/default/files/Of%20Far%20Different%20Nature%20-%20Throne%20Room%20%28CC-BY%29_0.mp3',
    outFile: 'title_regal.mp3',
    credit: '"Throne Room" by Of Far Different Nature (CC-BY 4.0) https://opengameart.org/content/throne-room',
  },
  {
    id: 'game_intrigue',
    url: 'https://opengameart.org/sites/default/files/Harp_0.mp3',
    outFile: 'game_intrigue.mp3',
    credit: '"Soft Mysterious Harp Loop" by VWolfdog / Jordy Hake (CC-BY 3.0) https://opengameart.org/content/soft-mysterious-harp-loop',
  },
  {
    id: 'game_intrigue',
    url: 'https://opengameart.org/sites/default/files/Harp.ogg',
    outFile: 'game_intrigue.ogg',
    credit: '"Soft Mysterious Harp Loop" by VWolfdog / Jordy Hake (CC-BY 3.0) https://opengameart.org/content/soft-mysterious-harp-loop',
  },
];

const download = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
};

await fs.mkdir(OUT_DIR, { recursive: true });

for (const a of assets) {
  const outPath = path.join(OUT_DIR, a.outFile);

  if (!force) {
    try {
      await fs.access(outPath);
      // eslint-disable-next-line no-console
      console.log(`[skip] ${a.outFile} already exists (use --force to overwrite)`);
      continue;
    } catch {
      // continue
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[download] ${a.url}`);
  const buf = await download(a.url);
  await fs.writeFile(outPath, buf);
  // eslint-disable-next-line no-console
  console.log(`[write] ${path.relative(ROOT, outPath)} (${buf.length} bytes)`);
}

const noticePath = path.join(ROOT, 'NOTICE');

const ensureNoticeLines = async () => {
  let notice = '';
  try {
    notice = await fs.readFile(noticePath, 'utf8');
  } catch {
    return;
  }

  const linesToAdd = [...new Set(assets.map(a => `- ${a.credit}`))];
  const missing = linesToAdd.filter(l => !notice.includes(l));
  if (!missing.length) return;

  const suffix = `\n\n# Audio assets (downloaded via scripts/fetch-ambience-assets.mjs)\n${missing.join('\n')}\n`;
  await fs.writeFile(noticePath, `${notice.replace(/\s*$/,'')}${suffix}`, 'utf8');

  // eslint-disable-next-line no-console
  console.log(`\n[notice] updated NOTICE with ${missing.length} attribution line(s)`);
};

await ensureNoticeLines();
