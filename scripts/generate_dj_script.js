// ============================================================================
// generate_dj_script.js
// ----------------------------------------------------------------------------
// Voices ONLY the curated DJ script (see docs/DJ_SCRIPT.md) with ElevenLabs —
// a small subset (~30 short lines) that stays well inside the free tier.
//
// Your API key never leaves your machine; it is read from your local env/.env.
//
//   export ELEVENLABS_API_KEY="sk_xxx"          # or put it in ~/radio/.env
//   DRY_RUN=1 node scripts/generate_dj_script.js   # estimate cost only
//   node scripts/generate_dj_script.js             # generate the audio
//
// Output: public/audio/breaks/<category>_<n>.mp3  +  breaks_manifest.json
// (same format build_shows.py consumes, so `build_shows.py --all` folds them in)
// Re-running skips files that already exist.
// ============================================================================

const fs = require("fs");
const path = require("path");
const https = require("https");
require("dotenv").config();

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "KLoixBflzS2a9rg6nT8x";
const MODEL_ID = "eleven_turbo_v2";
const DRY_RUN = !!process.env.DRY_RUN;

const ROOT = path.join(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "public/audio/breaks");
const MANIFEST_FILE = path.join(OUTPUT_DIR, "breaks_manifest.json");

const VOICE_SETTINGS = { stability: 0.5, similarity_boost: 0.8, style: 0.45, use_speaker_boost: true };

// --- Curated script (mirrors docs/DJ_SCRIPT.md). Categories map to the show
//     builder's drop pool: stationids, talkups, short. ----------------------
const SCRIPT = {
  stationids: [
    "Ninety-six-six, ROM. Victoria's station for love — every song picked for you, Pauline.",
    "You're locked in to 96.6 ROM. The only frequency that plays nothing but your favorites.",
    "This is ROM Radio, 96.6 FM — broadcasting out of Victoria, straight to one very special listener.",
    "96.6 ROM. More music, more Pauline, less of everything else.",
    "Stay tuned to 96.6 — ROM Radio, where the whole playlist is a love letter.",
  ],
  talkups: [
    "Coming up, a little something I know you love. Stay with me.",
    "That one was for you — and believe me, there's plenty more where it came from.",
    "Turn it up. This next one's a keeper.",
    "Keeping the good ones coming, here on 96.6 ROM.",
    "Right back into the music — don't touch that dial.",
  ],
  short: [
    "Quick shoutout to Pauline in Victoria — the heart of this whole station. This one's for you.",
    "Pauline, if you're listening — and I hope you are — this set is dedicated to you.",
    "From Daniel's heart to your speakers, Pauline. This is 96.6 ROM.",
    "Good day, Victoria — you're listening to 96.6 ROM, the station for love. Pauline, this one's for you.",
    "That's the show for now on 96.6 ROM. Same frequency, same heart — anytime you want it. Take care.",
  ],
};

const SPECIAL = {
  "06-25": ["Happy birthday, Pauline. The whole station is yours today — though between us, it always was."],
  "02-14": ["Happy Valentine's Day from 96.6 ROM. Every love song today has your name on it."],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function tts(text, outPath) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({ text, model_id: MODEL_ID, voice_settings: VOICE_SETTINGS });
    const req = https.request({
      hostname: "api.elevenlabs.io", port: 443,
      path: `/v1/text-to-speech/${VOICE_ID}`, method: "POST",
      headers: {
        Accept: "audio/mpeg", "Content-Type": "application/json",
        "xi-api-key": API_KEY, "Content-Length": Buffer.byteLength(postData),
      },
    }, (res) => {
      if (res.statusCode !== 200) {
        console.error(`  x ${res.statusCode} for: "${text.slice(0, 50)}..."`);
        if (res.statusCode === 401) console.error("    -> Check your API key.");
        res.resume(); return resolve(false);
      }
      const out = fs.createWriteStream(outPath);
      res.pipe(out);
      out.on("finish", () => out.close(() => resolve(true)));
    });
    req.on("error", (e) => { console.error(`  x ${e.message}`); resolve(false); });
    req.write(postData); req.end();
  });
}

async function main() {
  const jobs = [];
  for (const [category, lines] of Object.entries(SCRIPT))
    lines.forEach((text, i) => jobs.push({ category, text, file: `${category}_${i}.mp3` }));
  for (const [date, lines] of Object.entries(SPECIAL))
    lines.forEach((text, i) => jobs.push({ category: "special", date, text, file: `special_${date}_${i}.mp3` }));

  const totalChars = jobs.reduce((n, j) => n + j.text.length, 0);
  console.log(`Lines to voice: ${jobs.length}`);
  console.log(`Total characters: ${totalChars.toLocaleString()} (free tier = 10,000/month)`);

  if (DRY_RUN) {
    const byCat = {};
    for (const j of jobs) byCat[j.category] = (byCat[j.category] || 0) + 1;
    console.log("Breakdown:", byCat, "\nDRY_RUN — no audio generated, no quota used.");
    return;
  }
  if (!API_KEY) { console.error("ELEVENLABS_API_KEY is not set. Aborting."); process.exit(1); }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const manifest = { categories: {}, special: {} };
  let made = 0, skipped = 0, failed = 0;
  for (const job of jobs) {
    const full = path.join(OUTPUT_DIR, job.file);
    const entry = { text: job.text, file: `audio/breaks/${job.file}` };
    if (job.category === "special") (manifest.special[job.date] ||= []).push(entry);
    else (manifest.categories[job.category] ||= []).push(entry);
    if (fs.existsSync(full)) { skipped++; continue; }
    process.stdout.write(`[${job.category}] ${job.text.slice(0, 44)}... `);
    const ok = await tts(job.text, full);
    if (ok) { made++; console.log("ok"); } else { failed++; }
    await sleep(400);
  }
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log(`\nDone. generated=${made} skipped=${skipped} failed=${failed}`);
  console.log(`Manifest: ${path.relative(ROOT, MANIFEST_FILE)}`);
}

main();
