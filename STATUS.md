# STATUS — radio

> Ground-truth state. Read this BEFORE reading code. Auto-refreshed by the Stop hook; hand-edit the "Confirmed working" / "Known broken" sections.
> Last refresh: 2026-06-24 22:34

## Git
- Branch: `fix/show-pipeline-cleanup`
- Last commit: `70c5058 Add continuous broadcast clock + two-DJ voicing + birthday show + UI polish (6 hours ago)`
- Uncommitted: **1** — 1 uncommitted

## Tests
- Run by hand: `npm test`

## Confirmed working
- **Full library rendered: all 7 shows** (`show_0`–`show_6`) — mp3 + cue.json each, 14/14/14/14/14/14/12 tracks, ~40–48 min apiece
- Cue integrity verified: every show's cue `duration` matches its mp3 to ±0.0s, track start times monotonic (ffprobe check, 2026-06-19)
- `npm test` (`test/smoke.mjs`) **PASSES** — manifest↔disk consistent, no orphans, manifest/data.js ids match
- 96 music tracks in `public/music/` + playlist.json; 46 station-ID snippets voiced (used as DJ drops)
- player.html lists only `rendered:true` shows; now-playing + DJ-on-air track the cue sheet
- `netlify.toml` + `.github/workflows/claude.yml` deploy config present

## Known broken / blocked
- **Deploy blocked**: Netlify CLI not installed/authenticated. `public/shows/` + `public/music/*.mp3` are gitignored, so a `git push` deploys NO audio — must `npm run deploy` (netlify CLI, uploads local `public/`). Needs your `netlify login` + linked site. Live URL still unset.
- **DJ breaks unvoiced** (optional): `audio/breaks/` empty — shows use short station-ID snippets, not long-form voiced breaks. Blocked on `ELEVENLABS_API_KEY`. Shows play fine without; re-render with `build_shows.py --all` after voicing to fold them in.
- Human listen-test still pending (structural verification done; needs ears).

> PR #1 (`fix/show-pipeline-cleanup`) is **OPEN and mergeable** (state CLEAN) — earlier STATUS note claiming it was merged to `main` was wrong. It carries: honest picker (filters to rendered), `npm test` smoke test, archived legacy preview, login gate.

## Next Up / Blocked
- Merge PR #1 (your call). Then **deploy** (`npm run deploy` after `netlify login`). Optionally voice DJ breaks (needs key) → re-render → human listen-test.

## Key paths
scripts/, public/, netlify/, package.json
