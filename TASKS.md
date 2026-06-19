# TASKS — 96.6 ROM Radio

> Working task board. Grounded in repo ground-truth as of 2026-06-19 (see STATUS.md for live state).
> Priority: **P0** blocks a usable demo · **P1** content/quality · **P2** ship · **P3** code health · **P4** infra.

## P0 — Done (branch `fix/show-pipeline-cleanup`)

- [x] **Make the picker honest.** `player.html` now filters to `rendered === true` shows (only `show_0` today). Durable — survives `build_shows.py` re-runs. *(Correction: unrendered shows never 404'd — the player already greyed them out as "not rendered". This was cosmetic, not a correctness bug.)*
- [x] **Resolve the `show_1` orphan.** Deleted the stray `show_1.mp3` (no cue sheet). A new `npm test` smoke test (`test/smoke.mjs`) now guards manifest↔disk consistency so orphans can't recur.

## P1 — Content & quality

- [ ] **Voice the DJ breaks.** `public/audio/breaks/` is empty, so every rendered show uses only the 46 short snippets — no long-form voiced breaks. Run `node scripts/generate_dj_breaks.js` (needs `ELEVENLABS_API_KEY`; `DRY_RUN=1` first to estimate cost).
- [ ] **Re-render shows after breaks are voiced** so `build_shows.py` folds the announcement drops in. Do this *after* the voicing task.
- [ ] **Listen-test a full show end-to-end** — crossfades, ducking, voice processing, auto-advance at the show boundary.

## P2 — Ship

- [ ] **Deploy to Netlify.** `netlify.toml` + `.github/workflows/claude.yml` are in place but Live URL is still unset. `npm run deploy` or push to `main`.
- [ ] **Verify PWA + offline** on the deployed site: service worker caches shows, installs on iOS and Android.

## P3 — Code health

- [x] ~~De-dupe cue-sheet logic / preview duplication~~ → **Resolved by archiving** `preview/rom-radio-preview.html` to `docs/archive/`. The "duplication" was ~12 trivial helper lines across two standalone files; de-duping into a shared module was rejected as premature abstraction.
- [x] ~~Split `MusicPlayer.stop()`~~ → **Dropped — not a real issue.** The method (app.js:1848–1863) is already single-responsibility (16 lines). The "orchestrates 4 modules" finding was a graphify misattribution across same-named `.stop()` methods; the real orchestrator is the top-level `powerOff()` (app.js:920).
- [ ] **Decide the fate of the legacy live engine** (`index.html` / `app.js` real-time TTS + Spotify embed). The project direction is pre-rendered shows; either keep the legacy path documented or archive it so it stops reading as a parallel architecture. *(Still open — out of scope this session.)*

## P4 — Infra

- [x] **Fix the test story.** Added `test/smoke.mjs` + `"test": "node test/smoke.mjs"` in `package.json` — plain Node, no framework. Guards manifest↔disk consistency.

---
← see `STATUS.md` for confirmed-working / known-broken state
