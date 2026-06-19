# STATUS — radio

> Ground-truth state. Read this BEFORE reading code. Auto-refreshed by the Stop hook; hand-edit the "Confirmed working" / "Known broken" sections.
> Last refresh: 2026-06-19 02:06

## Git
- Branch: `fix/show-pipeline-cleanup`
- Last commit: `8779ee5 Auto-commit session changes (2026-06-19 01:48) (18 minutes ago)`
- Uncommitted: **0** — clean tree

## Tests
- Run by hand: `npm test`

## Confirmed working
- Show pipeline renders: `show_0.mp3` + `show_0.cue.json` play in player.html with now-playing + DJ-on-air tracking
- 96 music tracks in `public/music/` + playlist.json; 46 station-ID snippets voiced
- player.html lists only `rendered:true` shows (filtered) and degrades gracefully when a cue is missing
- `npm test` runs `test/smoke.mjs` — guards manifest↔disk consistency (catches orphan/missing show files)
- `netlify.toml` + `.github/workflows/claude.yml` deploy config present

## Known broken
- `audio/breaks/` empty — rendered shows have no long-form voiced DJ breaks (snippets only)
- Thin library: only `show_0` is rendered (one playable show)
- Not deployed: Live URL still unset

> Fixed and **merged to `main`** (was PR #1, `fix/show-pipeline-cleanup`): manifest over-advertising (player now filters to rendered), `show_1.mp3` orphan (removed), missing `npm test` (added).

## Next Up / Blocked
- See `TASKS.md`. Next (P1): render more shows ↔ voice DJ breaks (needs `ELEVENLABS_API_KEY`) → re-render → listen-test. Then deploy (P2).

## Key paths
scripts/, public/, netlify/, package.json
