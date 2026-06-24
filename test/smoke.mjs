// Smoke test: verify show pipeline filesystem <-> manifest consistency.
// Run with: node test/smoke.mjs
// Exit 0 = pass, exit 1 = fail.

import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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

// (d) If a continuous broadcast exists, validate its enriched cue.
const bcCuePath = resolve(showsDir, 'broadcast.cue.json');
const bcMp3Path = resolve(showsDir, 'broadcast.mp3');
if (existsSync(bcCuePath)) {
  const bc = JSON.parse(readFileSync(bcCuePath, 'utf8'));
  if (!existsSync(bcMp3Path)) fail('broadcast.cue.json exists but broadcast.mp3 is missing');
  if (!(bc.duration > 0)) fail('broadcast cue: duration must be > 0');

  if (!Array.isArray(bc.entryMarkers) || !bc.entryMarkers.length) {
    fail('broadcast cue: entryMarkers missing or empty');
  } else {
    const sorted = bc.entryMarkers.every((v, i, a) => i === 0 || a[i - 1] <= v);
    if (!sorted) fail('broadcast cue: entryMarkers not sorted ascending');
    for (const m of bc.entryMarkers)
      if (m < 0 || m > bc.duration) fail(`broadcast cue: entryMarker ${m} out of [0, ${bc.duration}]`);
  }

  for (const d of (bc.djMeta || [])) {
    if (d.start < 0 || d.end > bc.duration + 1 || d.start > d.end)
      fail(`broadcast cue: djMeta window [${d.start}, ${d.end}] out of bounds / inverted`);
  }
  // every track start should coincide with an entry marker (clean tune-in points)
  const markerSet = new Set((bc.entryMarkers || []).map(Number));
  for (const t of (bc.tracks || []))
    if (!markerSet.has(Number(t.start)))
      fail(`broadcast cue: track start ${t.start} has no matching entry marker`);
}

if (failed) {
  process.exit(1);
}
console.log('PASS: all smoke assertions passed.');
