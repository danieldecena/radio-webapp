# STATUS — radio

> Ground-truth state. Read this BEFORE reading code. Auto-refreshed by the Stop hook; hand-edit the "Confirmed working" / "Known broken" sections.
> Last refresh: 2026-06-19 01:15

## Git
- Branch: `fix/show-pipeline-cleanup`
- Last commit: `0bdf9a9 Auto-commit session changes (2026-06-19 01:14) (44 seconds ago)`
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

> Fixed on **PR #1** (`fix/show-pipeline-cleanup`, pending merge to `main`): manifest over-advertising (player now filters to rendered), `show_1.mp3` orphan (removed), missing `npm test` (added). On `main` these are still open until merge.

## Next Up / Blocked
- See `TASKS.md`. Next (P1): render more shows ↔ voice DJ breaks (needs `ELEVENLABS_API_KEY`) → re-render → listen-test. Then deploy (P2). Merge PR #1 to land the completed cleanup.

## Key paths
scripts/, public/, netlify/, package.json
