// Smoke test: verify show pipeline filesystem <-> manifest consistency.
// Run with: node test/smoke.mjs
// Exit 0 = pass, exit 1 = fail.

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync } from 'fs';

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, '..');
const showsDir = resolve(root, 'public', 'shows');

let failed = false;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed = true;
}

// --- load manifest ---
const manifest = JSON.parse(readFileSync(resolve(showsDir, 'manifest.json'), 'utf8'));
const shows = manifest.shows;

// (a) Every rendered:true entry must have both .mp3 and .cue.json on disk.
for (const s of shows) {
  if (!s.rendered) continue;
  const mp3 = resolve(root, 'public', s.file);
  const cue = resolve(root, 'public', s.cue);
  if (!existsSync(mp3)) fail(`manifest rendered show ${s.id}: mp3 missing at ${s.file}`);
  if (!existsSync(cue)) fail(`manifest rendered show ${s.id}: cue missing at ${s.cue}`);
}

// (b) No stray show_*.mp3 on disk that lacks a matching show_*.cue.json.
const mp3s = readdirSync(showsDir).filter(f => /^show_\d+\.mp3$/.test(f));
for (const mp3File of mp3s) {
  const cueFile = mp3File.replace(/\.mp3$/, '.cue.json');
  if (!existsSync(resolve(showsDir, cueFile))) {
    fail(`stray mp3 with no cue sheet: public/shows/${mp3File} (no matching ${cueFile})`);
  }
}

// (c) data.js and manifest.json must list the same set of show ids.
const dataRaw = readFileSync(resolve(showsDir, 'data.js'), 'utf8');
const jsonStr = dataRaw
  .replace(/^window\.SHOWS_DATA\s*=\s*/, '')
  .replace(/;\s*$/, '');
const dataShows = JSON.parse(jsonStr).shows;
const manifestIds = new Set(shows.map(s => s.id));
const dataIds = new Set(dataShows.map(s => s.id));

for (const id of manifestIds) {
  if (!dataIds.has(id)) fail(`show id ${id} in manifest but missing from data.js`);
}
for (const id of dataIds) {
  if (!manifestIds.has(id)) fail(`show id ${id} in data.js but missing from manifest.json`);
}

if (failed) {
  process.exit(1);
}
console.log('PASS: all smoke assertions passed.');
