# TASKS — 96.6 ROM Radio

> Working task board. Grounded in repo ground-truth as of 2026-06-19 (see STATUS.md for live state).
> Priority: **P1** content/quality · **P2** ship · **P3** code health · **P4** infra.
> **Now:** P1 is the real top — the picker is fixed, but there's only **one** rendered show and the DJ breaks aren't voiced. That's what actually holds back a good demo.
> **Landed:** the completed items below are merged to `main` (was PR #1, `fix/show-pipeline-cleanup`).

## P1 — Content & quality (the real blocker)

- [ ] **Render more shows.** "Trim to rendered" left exactly one playable show (`show_0`). A station for Pauline needs variety — render at least a few more (`python3 scripts/build_shows.py --all`, needs ffmpeg). *(Do after voicing if you want voiced breaks baked in — see below — else render now for a fuller library and re-render later.)*
- [ ] **Voice the DJ breaks.** `public/audio/breaks/` is empty, so every rendered show uses only the 46 short snippets — no long-form voiced breaks. Run `node scripts/generate_dj_breaks.js` (needs `ELEVENLABS_API_KEY`; `DRY_RUN=1` first to estimate cost).
- [ ] **Re-render shows after breaks are voiced** so `build_shows.py` folds the announcement drops in. Do this *after* the voicing task.
- [ ] **Listen-test a full show end-to-end** — crossfades, ducking, voice processing, auto-advance at the show boundary.

## P2 — Ship

- [ ] **Deploy to Netlify.** `netlify.toml` is in place but Live URL is still unset. `npm run deploy`, or push to `main` (triggers the `.github/workflows/claude.yml` auto-deploy).
- [ ] **Verify PWA + offline** on the deployed site: service worker caches shows, installs on iOS and Android.

## P3 — Code health

- [ ] **Decide the fate of the legacy live engine** (`index.html` / `app.js` real-time TTS + Spotify embed). The project direction is pre-rendered shows; either keep the legacy path documented or archive it so it stops reading as a parallel architecture.
- [ ] **Minor: drop dead branch in `renderList`** (`public/player.html`). Now that the list is pre-filtered to rendered shows, the `disabled` / "not rendered" branch is unreachable. Harmless, but worth removing for clarity.

## P4 — Infra

_All clear._

---

## Done — merged to `main` (was PR #1, `fix/show-pipeline-cleanup`)

- [x] **Make the picker honest.** `player.html` filters to `rendered === true` shows. Durable — survives `build_shows.py` re-runs. *(Correction: unrendered shows never 404'd — the player already greyed them out. Cosmetic, not a crash fix.)*
- [x] **Resolve the `show_1` orphan.** Deleted the stray `show_1.mp3`; `npm test` smoke test (`test/smoke.mjs`) now guards manifest↔disk consistency so orphans can't recur.
- [x] **Fix the test story.** Added `test/smoke.mjs` + `"test": "node test/smoke.mjs"` (plain Node, no framework).
- [x] ~~De-dupe cue-sheet logic~~ → **Resolved by archiving** `preview/rom-radio-preview.html` to `docs/archive/`. The "duplication" was ~12 trivial lines across standalone files; a shared module was rejected as premature abstraction.
- [x] ~~Split `MusicPlayer.stop()`~~ → **Dropped — not a real issue.** The method (`app.js:1848–1863`) is already single-responsibility; the "orchestrates 4 modules" finding was a graphify misattribution across same-named `.stop()` methods (real orchestrator is `powerOff()`, `app.js:920`).

---
← see `STATUS.md` for confirmed-working / known-broken state
