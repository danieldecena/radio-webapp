# TASKS — 96.6 ROM Radio

> Working task board. Grounded in repo ground-truth as of 2026-06-19 (see STATUS.md for live state).
> Priority: **P1** content/quality · **P2** ship · **P3** code health · **P4** infra.
> **Now:** All 7 shows are rendered and `npm test` passes. The only thing between here and a live demo is **deploy** (blocked on Netlify auth). DJ-break voicing is an optional polish pass.
> **Open:** PR #1 (`fix/show-pipeline-cleanup`) is still **open and mergeable** — not yet merged to `main`.

## Active
- [ ] Ask clarifying questions #claude 📅 2026-06-19
- [ ] Propose 2-3 approaches #claude 📅 2026-06-19
- [ ] Present design sections #claude 📅 2026-06-19
- [ ] Write design doc + commit #claude 📅 2026-06-19
- [ ] Spec self-review #claude 📅 2026-06-19
- [ ] User reviews written spec #claude 📅 2026-06-19
- [ ] Transition to writing-plans #claude 📅 2026-06-19
- [ ] Decide PR #1 + clean up untracked logo.html #claude 📅 2026-06-19
- [ ] Voice the DJ breaks #claude 📅 2026-06-19
- [ ] Re-render shows after breaks are voiced #claude 📅 2026-06-19
- [ ] Listen-test a full show end-to-end #claude 📅 2026-06-19
- [ ] Deploy to Netlify #claude 📅 2026-06-19
- [ ] Merge PR #1 (open, mergeable) + decide fate of untracked `logo.html` #claude 📅 2026-06-19
- [ ] Deploy to Netlify — needs `netlify login` + linked site (`npm run deploy`) #claude 📅 2026-06-19
- [ ] (optional) Voice the DJ breaks → re-render → human listen-test #claude 📅 2026-06-19
- [ ] Decide fate of legacy live-DJ engine #claude 📅 2026-06-19
_Curated work is tracked by priority below — **P2 (ship) is now the live top.** Incomplete session tasks auto-land here._

## P2 — Ship (the real top now)

- [ ] **Deploy to Netlify.** ⚠️ `git push` alone deploys NO audio — `public/shows/` and `public/music/*.mp3` are gitignored. Must `npm run deploy` (netlify CLI uploads local `public/`). Blocked on: install netlify CLI, `netlify login`, link the site. Live URL still unset.
- [ ] **Verify PWA + offline** on the deployed site: service worker caches shows, installs on iOS and Android.

## P1 — Optional polish (shows already play without this)

- [ ] **Voice the DJ breaks.** `public/audio/breaks/` is empty, so shows use only the 46 short station-ID snippets — no long-form voiced breaks. Run `node scripts/generate_dj_breaks.js` (needs `ELEVENLABS_API_KEY`; `DRY_RUN=1` first to estimate cost).
- [ ] **Re-render shows after breaks are voiced** (`build_shows.py --all`) so the announcement drops fold in. Do this *after* voicing.
- [ ] **Human listen-test a full show** — crossfades, ducking, voice processing, auto-advance at the show boundary. *(Structural check done: all 7 cues match mp3 duration to ±0.0s, monotonic track starts.)*

## P3 — Code health

- [ ] **Decide the fate of the legacy live engine** (`index.html` / `app.js` real-time TTS + Spotify embed). The project direction is pre-rendered shows; either keep the legacy path documented or archive it so it stops reading as a parallel architecture.
- [ ] **Minor: drop dead branch in `renderList`** (`public/player.html`). Now that the list is pre-filtered to rendered shows, the `disabled` / "not rendered" branch is unreachable. Harmless, but worth removing for clarity.

## P4 — Infra

_All clear._

---

## Done

- [x] **Render the full show library.** All 7 shows (`show_0`–`show_6`) rendered locally via `build_shows.py --show N`; 14/14/14/14/14/14/12 tracks, ~40–48 min each. Manifest all `rendered:true`, `npm test` passes, cue/mp3 durations match to ±0.0s. *(2026-06-19. Shows are gitignored build artifacts — re-render locally to reproduce.)*

## Done — on branch `fix/show-pipeline-cleanup` (PR #1, open & mergeable)

- [x] **Make the picker honest.** `player.html` filters to `rendered === true` shows. Durable — survives `build_shows.py` re-runs. *(Correction: unrendered shows never 404'd — the player already greyed them out. Cosmetic, not a crash fix.)*
- [x] **Resolve the `show_1` orphan.** Deleted the stray `show_1.mp3`; `npm test` smoke test (`test/smoke.mjs`) now guards manifest↔disk consistency so orphans can't recur.
- [x] **Fix the test story.** Added `test/smoke.mjs` + `"test": "node test/smoke.mjs"` (plain Node, no framework).
- [x] ~~De-dupe cue-sheet logic~~ → **Resolved by archiving** `preview/rom-radio-preview.html` to `docs/archive/`. The "duplication" was ~12 trivial lines across standalone files; a shared module was rejected as premature abstraction.
- [x] ~~Split `MusicPlayer.stop()`~~ → **Dropped — not a real issue.** The method (`app.js:1848–1863`) is already single-responsibility; the "orchestrates 4 modules" finding was a graphify misattribution across same-named `.stop()` methods (real orchestrator is `powerOff()`, `app.js:920`).

---
← see `STATUS.md` for confirmed-working / known-broken state
