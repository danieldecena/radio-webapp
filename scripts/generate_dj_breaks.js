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
// --- ONE DJ VOICE FOR THE WHOLE STATION -------------------------------------
// Every line in breaks.js is voiced by THIS single voice, so the station has
// one consistent DJ across station IDs, talk-ups, weather, traffic, news, and
// commercials. To change the DJ, set ELEVENLABS_VOICE_ID in your .env to any
// voice ID from your ElevenLabs Voice Library (Voices → ⋯ → Copy voice ID).
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "KLoixBflzS2a9rg6nT8x";

// Two DJs: A = the main voice above (solo for everything), B = female co-host
// used ONLY for the two-DJ banter segments (DJ_BANTER in breaks.js).
const DJ_A_VOICE_ID = VOICE_ID;
const DJ_B_VOICE_ID = process.env.ELEVENLABS_VOICE_ID_B || "b5RPB35vTODb3BEmR3Fc";

// Turbo v2 = 0.5 ElevenLabs credits per character (half the multilingual cost).
const MODEL_ID = "eleven_turbo_v2";
const DRY_RUN = !!process.env.DRY_RUN;
const { execFileSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const BREAKS_FILE = path.join(ROOT, "public/breaks.js");
const OUTPUT_DIR = path.join(ROOT, "public/audio/breaks");
const MANIFEST_FILE = path.join(OUTPUT_DIR, "breaks_manifest.json");

// Broadcast read: steady enough to sound like the SAME DJ across 300+ lines,
// with enough style for radio energy. Tune by ear after a small test batch.
const VOICE_SETTINGS = {
  stability: 0.55,        // higher = steadier, less line-to-line drift
  similarity_boost: 0.85, // stay close to the chosen voice
  style: 0.4,             // some performance, not flat
  use_speaker_boost: true,
};

// --- Load the exported data from breaks.js (no fragile line-by-line regex) --
function loadBreaksData() {
  let src = fs.readFileSync(BREAKS_FILE, "utf8");
  // strip the ES-module export so we can evaluate it as a plain script
  src = src.replace(/export\s*\{[\s\S]*?\};?/g, "");
  src += "\n;return { DJ_BREAKS, SPECIAL_DATES, STATION_CONFIG," +
    " DJ_BANTER: (typeof DJ_BANTER !== 'undefined' ? DJ_BANTER : []) };";
  // eslint-disable-next-line no-new-func
  return new Function(src)();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Stitch per-turn banter clips into one segment with short gaps between turns,
// so a two-DJ conversation becomes a single drop the renderer can use as-is.
function stitchBanter(turnFiles, outFile) {
  const silence = path.join(OUTPUT_DIR, "_silence.mp3");
  if (!fs.existsSync(silence)) {
    execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i",
      "anullsrc=channel_layout=mono:sample_rate=44100", "-t", "0.45",
      "-c:a", "libmp3lame", "-q:a", "9", silence]);
  }
  const listPath = path.join(OUTPUT_DIR, "_banter_list.txt");
  const lines = [];
  turnFiles.forEach((f, i) => {
    lines.push(`file '${f}'`);
    if (i < turnFiles.length - 1) lines.push(`file '${silence}'`);
  });
  fs.writeFileSync(listPath, lines.join("\n"));
  execFileSync("ffmpeg", ["-y", "-v", "error", "-f", "concat", "-safe", "0",
    "-i", listPath, "-c:a", "libmp3lame", "-q:a", "4", outFile]);
  fs.unlinkSync(listPath);
}

async function generateBanter(DJ_BANTER, manifest) {
  if (!Array.isArray(DJ_BANTER) || DJ_BANTER.length === 0) return;
  manifest.banter = [];
  for (let c = 0; c < DJ_BANTER.length; c++) {
    const convo = DJ_BANTER[c];
    const finalFile = path.join(OUTPUT_DIR, `banter_${c}.mp3`);
    const rel = `audio/breaks/banter_${c}.mp3`;
    const transcript = convo.map((t) => `${t.dj}: ${t.text}`).join("  ");
    manifest.banter.push({ text: transcript, file: rel, turns: convo.length });

    if (fs.existsSync(finalFile)) { console.log(`[banter ${c}] exists ✓`); continue; }

    const turnFiles = [];
    let ok = true;
    for (let t = 0; t < convo.length; t++) {
      const voice = convo[t].dj === "B" ? DJ_B_VOICE_ID : DJ_A_VOICE_ID;
      const turnPath = path.join(OUTPUT_DIR, `banter_${c}_${t}.mp3`);
      if (!fs.existsSync(turnPath)) {
        process.stdout.write(`[banter ${c}.${t} ${convo[t].dj}] `);
        if (!(await tts(convo[t].text, turnPath, voice))) { ok = false; break; }
        console.log("✓");
        await sleep(400);
      }
      turnFiles.push(turnPath);
    }
    if (ok) {
      stitchBanter(turnFiles, finalFile);
      console.log(`[banter ${c}] stitched ${convo.length} turns → ${rel}`);
    }
  }
}

function tts(text, outPath, voiceId = VOICE_ID) {
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
        path: `/v1/text-to-speech/${voiceId}`,
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
  const { DJ_BREAKS, SPECIAL_DATES, DJ_BANTER } = loadBreaksData();

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

  // Banter turns are voiced separately (two voices) but count toward cost.
  const banterTurns = (DJ_BANTER || []).reduce((n, c) => n + c.length, 0);
  const banterChars = (DJ_BANTER || [])
    .reduce((n, c) => n + c.reduce((m, t) => m + t.text.length, 0), 0);

  const totalChars = jobs.reduce((n, j) => n + j.text.length, 0) + banterChars;
  const credits = Math.round(totalChars * 0.5); // Turbo = 0.5 credits/char
  console.log(`Lines to voice: ${jobs.length} solo + ${banterTurns} banter turns`);
  console.log(`Total characters: ${totalChars.toLocaleString()}`);
  console.log(`Est. cost (Turbo 0.5/char): ~${credits.toLocaleString()} credits ` +
    `(Starter = 30,000/mo · Creator = 121,000/mo)`);

  if (DRY_RUN) {
    const byCat = {};
    for (const j of jobs) byCat[j.category] = (byCat[j.category] || 0) + 1;
    byCat.banter = `${(DJ_BANTER || []).length} convos / ${banterTurns} turns`;
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

  await generateBanter(DJ_BANTER, manifest);

  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log(`\nDone. generated=${made} skipped=${skipped} failed=${failed}`);
  console.log(`Manifest: ${path.relative(ROOT, MANIFEST_FILE)}`);
}

main();
