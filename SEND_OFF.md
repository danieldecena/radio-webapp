# 96.6 ROM — Send-off

The station is finished and self-contained. Everything below plays offline with
no internet, no ElevenLabs, no server — the DJ is baked into the audio file.

## What's done
- **DJ voiced** once and saved to `public/audio/breaks/` (two voices: main DJ +
  Serein for banter). No further API/token use.
- **Continuous broadcast**: `public/shows/broadcast.mp3` — 3 hours, music + DJ +
  two-DJ banter, with the **June 25 birthday dedications baked in** (opens with
  "Happy Birthday Pauline").
- **Player** (`public/player.html`): broadcast clock (pause/resume illusion),
  LIVE-only UI, tune-in static, "♥ Happy Birthday, Pauline ♥" dedication banner,
  finalized per design critique (no seek bar in live mode, readable labels,
  pulsing power button).
- **Smoke test** (`npm test`) passes.

## How to send it to Pauline
1. Double-click `share-with-pauline.command` (or use the ready-made
   `~/Desktop/96.6 ROM — for Pauline.zip`).
2. **AirDrop the .zip to Pauline** (or share via iCloud/Drive).
3. She unzips, opens `index.html`, types her name → the station opens with the
   birthday banner and the DJ wishing her happy birthday, then 3 hours of her
   music, looping all day, fully offline.

## The one remaining to-do (yours, not urgent)
Rotate the ElevenLabs API key and scrub it from git history before the repo is
ever public — three commands in `docs/CLEANUP_RUNBOOK.md`. Does not affect the
gift.

## Re-render later (optional)
- Different length / refresh dedication: `python3 scripts/build_shows.py --broadcast --hours 3 --date 06-25`
- Add a new special date: edit `SPECIAL_DATES` in `public/breaks.js`, voice it
  (`node scripts/generate_dj_breaks.js`), then re-render.
