# TASKS — 96.6 ROM Radio

> Working task board. Grounded in repo ground-truth as of 2026-06-19 (see STATUS.md for live state).
> Priority: **P0** blocks a usable demo · **P1** content/quality · **P2** ship · **P3** code health · **P4** infra.

## P0 — Blocking a playable demo

- [ ] **Reconcile show manifest with reality.** `public/shows/manifest.json` + `data.js` advertise 7 shows (id 0–6); only `show_0` is rendered. Either render the rest (`python3 scripts/build_shows.py --all`) or trim the manifest so the player only lists what exists. Today the picker offers 6 shows that will 404 on play.
- [ ] **Resolve the `show_1` orphan.** `show_1.mp3` exists on disk but has no `show_1.cue.json` and is `rendered:false`. Either finish rendering it (gets a cue) or delete the stray mp3 and drop it from the manifest — current state is inconsistent.

## P1 — Content & quality

- [ ] **Voice the DJ breaks.** `public/audio/breaks/` is empty, so every rendered show uses only the 46 short snippets — no long-form voiced breaks. Run `node scripts/generate_dj_breaks.js` (needs `ELEVENLABS_API_KEY`; `DRY_RUN=1` first to estimate cost).
- [ ] **Re-render shows after breaks are voiced** so `build_shows.py` folds the announcement drops in. Do this *after* the voicing task.
- [ ] **Listen-test a full show end-to-end** — crossfades, ducking, voice processing, auto-advance at the show boundary.

## P2 — Ship

- [ ] **Deploy to Netlify.** `netlify.toml` + `.github/workflows/claude.yml` are in place but Live URL is still unset. `npm run deploy` or push to `main`.
- [ ] **Verify PWA + offline** on the deployed site: service worker caches shows, installs on iOS and Android.

## P3 — Code health (from graphify graph)

- [ ] **Split `MusicPlayer.stop()`.** It calls into 4 separate modules (DJ break, power lifecycle, hiss, static burst) — too much orchestration for a "stop" method. Highest-betweenness path in the graph.
- [ ] **De-dupe cue-sheet logic** between `public/player.html` and `preview/rom-radio-preview.html` — the graph flagged them as near-duplicate now-playing/cue implementations.
- [ ] **Decide the fate of the legacy live engine** (`index.html` / `app.js` real-time TTS + Spotify embed). The project direction is pre-rendered shows; either keep the legacy path documented or move it to an archive folder so it stops showing up as a parallel architecture.

## P4 — Infra

- [ ] **Fix the test story.** STATUS.md says `npm test` but `package.json` has no `test` script and `docs/TESTING.md` is a manual checklist. Add a minimal smoke test (manifest ↔ disk consistency is the obvious first one) or update the reference to reflect manual-only testing.

---
← see `STATUS.md` for confirmed-working / known-broken state
