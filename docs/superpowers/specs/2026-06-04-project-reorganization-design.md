# Design: Radio Project Reorganization

**Date:** 2026-06-04  
**Status:** Approved

---

## Goal

Clean up the project folder by moving loose doc files into `docs/`, fixing a dead link in `docs/README.md`, and updating stale vault MOC links that still point to the old `Projects/Hold/Radio/` path.

## Scope

- Move 7 root-level `.md` docs into `docs/`
- Fix `docs/README.md` dead link
- Fix 2 vault files with stale paths
- Update `CLAUDE.md` structure section to reflect new doc locations
- No source code changes, no content rewrites

---

## File Moves

Use `git mv` to preserve history.

| From | To |
|---|---|
| `DEPLOY.md` | `docs/DEPLOY.md` |
| `SECURITY.md` | `docs/SECURITY.md` |
| `TESTING.md` | `docs/TESTING.md` |
| `MUSIC_SYSTEM_ARCHITECTURE.md` | `docs/MUSIC_SYSTEM_ARCHITECTURE.md` |
| `RADIO_FLOW_IMPROVEMENT.md` | `docs/RADIO_FLOW_IMPROVEMENT.md` |
| `CLEANUP_SUMMARY.md` | `docs/CLEANUP_SUMMARY.md` |
| `API_KEY_UPDATE_CHECKLIST.md` | `docs/API_KEY_UPDATE_CHECKLIST.md` |

**Stays at root:** `README.md`, `CLAUDE.md`, `netlify.toml`, `package.json`, `dev-server.js`

---

## `docs/README.md` Fix

Current link: `Projects/Hold/Radio/README.md` (dead)  
Fixed link: `../README.md`

---

## `docs/archive/` Note

`docs/archive/DEPLOY.md` is an older version of the deploy guide — intentionally historical. Leave it. The moved `docs/DEPLOY.md` is the current version.

---

## Vault Link Fixes (outside project folder)

Both files replace every instance of `Projects/Hold/Radio/` with `Projects/radio/`:

- `Resources/MOC/MOC_Radio.md`
- `Resources/MOC/tags/claude-radio.md`

---

## `CLAUDE.md` Update

The "Structure" section lists root-level doc files. Update it to reflect their new location under `docs/`.

---

## What Does Not Change

- All source code (`public/`, `scripts/`, `netlify/`, `node_modules/`)
- Git history (preserved via `git mv`)
- File content (no rewrites)
- `docs/archive/` contents
