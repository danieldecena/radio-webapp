# STATUS — radio

> Ground-truth state. Read this BEFORE reading code. Auto-refreshed by the Stop hook; hand-edit the "Confirmed working" / "Known broken" sections.
> Last refresh: 2026-06-19 01:02

## Git
- Branch: `fix/show-pipeline-cleanup`
- Last commit: `3243ef4 Auto-commit session changes (2026-06-19 01:02) (12 seconds ago)`
- Uncommitted: **0** — clean tree

## Tests
- Run by hand: `npm test`

## Confirmed working
- Show pipeline renders: `show_0.mp3` + `show_0.cue.json` play in player.html with now-playing + DJ-on-air tracking
- 96 music tracks in `public/music/` + playlist.json; 46 station-ID snippets voiced
- player.html degrades gracefully when a cue is missing (no crash)
- `netlify.toml` + `.github/workflows/claude.yml` deploy config present

## Known broken
- Manifest advertises 7 shows but only `show_0` is rendered — shows 1–6 will 404 on play
- `show_1.mp3` is an orphan: no cue sheet, marked `rendered:false`
- `audio/breaks/` empty — rendered shows have no long-form voiced DJ breaks (snippets only)
- No `npm test` script despite the reference above; testing is manual (`docs/TESTING.md`)

## Next Up / Blocked
- See `TASKS.md`. Next: reconcile manifest with rendered shows (P0) → voice DJ breaks (P1) → deploy (P2)

## Key paths
scripts/, public/, netlify/, package.json
