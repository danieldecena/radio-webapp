// ============================================================================
// generate_dj_breaks.js
// ----------------------------------------------------------------------------
// Voices EVERY scripted DJ line in public/breaks.js with ElevenLabs, so the
// pre-rendered shows can use full DJ segments (shoutouts, weather, traffic,
// news, commercials) — not just the short station IDs.
//
// Your API key NEVER goes through anyone else: it is read from your local
// environment. Run it yourself:
//
//   export ELEVENLABS_API_KEY="sk_xxx"      # or put it in .env
//   node scripts/generate_dj_breaks.js               # generate all audio
//   DRY_RUN=1 node scripts/generate_dj_breaks.js     # just estimate the cost
//
// Output: public/audio/breaks/<category>_<n>.mp3  +  breaks_manifest.json
// Re-running skips files that already exist, so it's safe and incremental.
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
const BREAKS_FILE = path.join(ROOT, "public/breaks.js");
const OUTPUT_DIR = path.join(ROOT, "public/audio/breaks");
const MANIFEST_FILE = path.join(OUTPUT_DIR, "breaks_manifest.json");

const VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.8,
  style: 0.45,
  use_speaker_boost: true,
};

// --- Load the exported data from breaks.js (no fragile line-by-line regex) --
function loadBreaksData() {
  let src = fs.readFileSync(BREAKS_FILE, "utf8");
  // strip the ES-module export so we can evaluate it as a plain script
  src = src.replace(/export\s*\{[\s\S]*?\};?/g, "");
  src += "\n;return { DJ_BREAKS, SPECIAL_DATES, STATION_CONFIG };";
  // eslint-disable-next-line no-new-func
  return new Function(src)();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function tts(text, outPath) {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: VOICE_SETTINGS,
    });
    const req = https.request(
      {
        hostname: "api.elevenlabs.io",
        port: 443,
        path: `/v1/text-to-speech/${VOICE_ID}`,
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": API_KEY,
          "Content-Length": Buffer.byteLength(postData),
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          console.error(`  ✗ ${res.statusCode} for: "${text.slice(0, 50)}…"`);
          if (res.statusCode === 401) console.error("    → Check your API key.");
          res.resume();
          return resolve(false);
        }
        const out = fs.createWriteStream(outPath);
        res.pipe(out);
        out.on("finish", () => out.close(() => resolve(true)));
      },
    );
    req.on("error", (e) => {
      console.error(`  ✗ ${e.message}`);
      resolve(false);
    });
    req.write(postData);
    req.end();
  });
}

async function main() {
  const { DJ_BREAKS, SPECIAL_DATES } = loadBreaksData();

  // Build the full job list: [{ key, text, file }]
  const jobs = [];
  for (const [category, lines] of Object.entries(DJ_BREAKS)) {
    lines.forEach((text, i) =>
      jobs.push({ category, text, file: `${category}_${i}.mp3` }),
    );
  }
  for (const [date, lines] of Object.entries(SPECIAL_DATES || {})) {
    lines.forEach((text, i) =>
      jobs.push({
        category: "special",
        date,
        text,
        file: `special_${date}_${i}.mp3`,
      }),
    );
  }

  const totalChars = jobs.reduce((n, j) => n + j.text.length, 0);
  console.log(`Lines to voice: ${jobs.length}`);
  console.log(`Total characters: ${totalChars.toLocaleString()} ` +
    `(ElevenLabs free tier = 10,000/month)`);

  if (DRY_RUN) {
    const byCat = {};
    for (const j of jobs) byCat[j.category] = (byCat[j.category] || 0) + 1;
    console.log("Breakdown:", byCat);
    console.log("DRY_RUN set — no audio generated, no quota used.");
    return;
  }

  if (!API_KEY) {
    console.error("ELEVENLABS_API_KEY is not set. Aborting.");
    process.exit(1);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const manifest = { categories: {}, special: {} };
  let made = 0, skipped = 0, failed = 0;

  for (const job of jobs) {
    const full = path.join(OUTPUT_DIR, job.file);
    const rel = `audio/breaks/${job.file}`;
    const entry = { text: job.text, file: rel };

    if (job.category === "special") {
      (manifest.special[job.date] ||= []).push(entry);
    } else {
      (manifest.categories[job.category] ||= []).push(entry);
    }

    if (fs.existsSync(full)) { skipped++; continue; }

    process.stdout.write(`[${job.category}] ${job.text.slice(0, 48)}… `);
    const ok = await tts(job.text, full);
    if (ok) { made++; console.log("✓"); } else { failed++; }
    await sleep(400); // be gentle on the API
  }

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log(`\nDone. generated=${made} skipped=${skipped} failed=${failed}`);
  console.log(`Manifest: ${path.relative(ROOT, MANIFEST_FILE)}`);
}

main();
