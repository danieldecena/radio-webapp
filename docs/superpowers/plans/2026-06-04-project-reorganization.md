# Radio Project Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move 7 loose root-level docs into `docs/`, fix a dead link in `docs/README.md`, correct two stale vault MOC files, and update `CLAUDE.md` to reflect the new layout.

**Architecture:** Pure file reorganization — no code changes. All 7 docs are currently untracked in git, so we move with `mv` and stage at the new path. Vault files live outside the git repo and are edited in-place.

**Tech Stack:** Bash (mv), git, text editor

---

## File Map

| File | Action |
|---|---|
| `API_KEY_UPDATE_CHECKLIST.md` | Move → `docs/API_KEY_UPDATE_CHECKLIST.md` |
| `CLEANUP_SUMMARY.md` | Move → `docs/CLEANUP_SUMMARY.md` |
| `DEPLOY.md` | Move → `docs/DEPLOY.md` |
| `MUSIC_SYSTEM_ARCHITECTURE.md` | Move → `docs/MUSIC_SYSTEM_ARCHITECTURE.md` |
| `RADIO_FLOW_IMPROVEMENT.md` | Move → `docs/RADIO_FLOW_IMPROVEMENT.md` |
| `SECURITY.md` | Move → `docs/SECURITY.md` |
| `TESTING.md` | Move → `docs/TESTING.md` |
| `docs/README.md` | Edit — fix dead link on line 7 |
| `CLAUDE.md` | Edit — add `docs/` section to Structure block |
| `Resources/MOC/MOC_Radio.md` | Edit — fix stale paths + station name |
| `Resources/MOC/tags/claude-radio.md` | Edit — fix stale paths |

---

### Task 0: Commit the plan file

**Files:**
- Stage: `docs/superpowers/plans/2026-06-04-project-reorganization.md`

- [ ] **Step 1: Stage and commit**

```bash
git add docs/superpowers/plans/2026-06-04-project-reorganization.md
git commit -m "docs: add reorganization implementation plan

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 1: Move 7 root docs into `docs/`

**Files:**
- Move: `API_KEY_UPDATE_CHECKLIST.md`, `CLEANUP_SUMMARY.md`, `DEPLOY.md`, `MUSIC_SYSTEM_ARCHITECTURE.md`, `RADIO_FLOW_IMPROVEMENT.md`, `SECURITY.md`, `TESTING.md`
- Destination: `docs/`

- [ ] **Step 1: Verify files exist at root**

```bash
ls API_KEY_UPDATE_CHECKLIST.md CLEANUP_SUMMARY.md DEPLOY.md \
   MUSIC_SYSTEM_ARCHITECTURE.md RADIO_FLOW_IMPROVEMENT.md \
   SECURITY.md TESTING.md
```

Expected: all 7 listed, no "No such file" errors.

- [ ] **Step 2: Move the files**

```bash
mv API_KEY_UPDATE_CHECKLIST.md docs/
mv CLEANUP_SUMMARY.md docs/
mv DEPLOY.md docs/
mv MUSIC_SYSTEM_ARCHITECTURE.md docs/
mv RADIO_FLOW_IMPROVEMENT.md docs/
mv SECURITY.md docs/
mv TESTING.md docs/
```

- [ ] **Step 3: Verify files are at new location**

```bash
ls docs/API_KEY_UPDATE_CHECKLIST.md docs/CLEANUP_SUMMARY.md \
   docs/DEPLOY.md docs/MUSIC_SYSTEM_ARCHITECTURE.md \
   docs/RADIO_FLOW_IMPROVEMENT.md docs/SECURITY.md docs/TESTING.md
```

Expected: all 7 listed. Also confirm they're gone from root:

```bash
ls *.md
```

Expected output (only these remain at root):
```
CLAUDE.md  README.md
```

- [ ] **Step 4: Stage and commit**

```bash
git add docs/API_KEY_UPDATE_CHECKLIST.md docs/CLEANUP_SUMMARY.md \
        docs/DEPLOY.md docs/MUSIC_SYSTEM_ARCHITECTURE.md \
        docs/RADIO_FLOW_IMPROVEMENT.md docs/SECURITY.md docs/TESTING.md
git commit -m "chore: move root-level docs into docs/

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Fix `docs/README.md` dead link

**Files:**
- Modify: `docs/README.md` line 7

- [ ] **Step 1: Confirm the dead link**

```bash
grep "Hold/Radio" docs/README.md
```

Expected:
```
**👉 See [../README.md](Projects/Hold/Radio/README.md) for the comprehensive guide**
```

- [ ] **Step 2: Fix the link**

In `docs/README.md`, replace line 7:

```
**👉 See [../README.md](Projects/Hold/Radio/README.md) for the comprehensive guide**
```

with:

```
**👉 See [../README.md](../README.md) for the comprehensive guide**
```

- [ ] **Step 3: Verify fix**

```bash
grep "README" docs/README.md
```

Expected: no `Hold/Radio` anywhere in the output.

- [ ] **Step 4: Stage and commit**

```bash
git add docs/README.md
git commit -m "fix: correct dead link in docs/README.md

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Fix `MOC_Radio.md` stale paths and station name

**Files:**
- Modify: `/Users/home/Obsidian/Resources/MOC/MOC_Radio.md`

The file has:
- Title/description says "93.4 ROM Radio" — should be "96.6 ROM Radio"
- 3 wikilinks pointing to `Projects/Hold/Radio/` — should be `Projects/radio/`
- After Task 1, DEPLOY/SECURITY/TESTING moved to `docs/` — links need to reflect that

- [ ] **Step 1: Confirm stale content**

```bash
grep "Hold/Radio\|93\.4" /Users/home/Obsidian/Resources/MOC/MOC_Radio.md
```

Expected: several lines with `Hold/Radio` and `93.4`.

- [ ] **Step 2: Replace the full file content**

Edit `/Users/home/Obsidian/Resources/MOC/MOC_Radio.md` to:

```markdown
---
tags:
  - nav/moc
  - project/radio
  - type/index
  - status/active
  - domain/typescript
type: index
related: []
---

# 📻 96.6 ROM Radio MOC

**Project:** 96.6 ROM Radio streaming app  
**Claude instructions:** [[Projects/radio/CLAUDE|CLAUDE.md]]

---

## 🚀 Start Here
- [[Projects/radio/CLAUDE|CLAUDE.md]] — AI instructions
- [[Projects/radio/README]] — Project README
- [[Projects/radio/docs/README]] — Docs index

## 📋 Ops Docs
- [[Projects/radio/docs/DEPLOY]] — Deployment guide
- [[Projects/radio/docs/SECURITY]] — Security notes
- [[Projects/radio/docs/TESTING]] — Testing guide
- [[Projects/radio/docs/API_KEY_UPDATE_CHECKLIST]] — API key rotation
- [[Projects/radio/docs/RADIO_FLOW_IMPROVEMENT]] — Flow improvement notes
- [[Projects/radio/docs/CLEANUP_SUMMARY]] — Cleanup summary

## 🎵 Architecture
- [[Projects/radio/docs/MUSIC_SYSTEM_ARCHITECTURE]] — Music system design
```

- [ ] **Step 3: Verify no stale paths remain**

```bash
grep "Hold/Radio\|93\.4" /Users/home/Obsidian/Resources/MOC/MOC_Radio.md
```

Expected: no output (empty).

---

### Task 4: Fix `claude-radio.md` stale paths

**Files:**
- Modify: `/Users/home/Obsidian/Resources/MOC/tags/claude-radio.md`

The file references `Projects/93.4-rom-radio/CLAUDE.md` and `Projects/Hold/Radio/CLAUDE` — both dead.

- [ ] **Step 1: Confirm stale content**

```bash
grep "Hold/Radio\|93\.4" /Users/home/Obsidian/Resources/MOC/tags/claude-radio.md
```

Expected: 2 lines with stale paths.

- [ ] **Step 2: Replace the full file content**

Edit `/Users/home/Obsidian/Resources/MOC/tags/claude-radio.md` to:

```markdown
---
tags:
  - type/claude-instructions
  - project/radio
  - status/active
  - domain/typescript
nav: "[[_nav/MOC_Radio]]"
related: []
---

# CLAUDE.md pointer — 96.6 ROM Radio

> **The actual instructions are in:** `Projects/radio/CLAUDE.md`

[[Projects/radio/CLAUDE|→ Open CLAUDE.md]]  
[[_nav/MOC_Radio|→ Radio MOC]]
```

- [ ] **Step 3: Verify no stale paths remain**

```bash
grep "Hold/Radio\|93\.4" /Users/home/Obsidian/Resources/MOC/tags/claude-radio.md
```

Expected: no output (empty).

---

### Task 5: Update `CLAUDE.md` structure section

**Files:**
- Modify: `CLAUDE.md` — Structure block (lines 29–39)

The current Structure block omits `docs/` entirely. Add it.

- [ ] **Step 1: View current structure block**

```bash
grep -n "Structure\|docs\|public\|scripts\|netlify" CLAUDE.md
```

- [ ] **Step 2: Replace the Structure block**

In `CLAUDE.md`, replace the existing `## Structure` section:

```
## Structure

```
public/
  index.html, app.js, breaks.js
  music/playlist.json          # pre-generated audio snippets
netlify/functions/tts.js       # serverless ElevenLabs handler
scripts/
  generate_breaks.js           # pre-generate DJ audio as MP3s
  generate_playlist.js         # convert breaks.js → playlist.json
```
```

with:

```
## Structure

```
public/
  index.html, app.js, breaks.js
  music/playlist.json          # pre-generated audio snippets
netlify/functions/tts.js       # serverless ElevenLabs handler
scripts/
  generate_breaks.js           # pre-generate DJ audio as MP3s
  generate_playlist.js         # convert breaks.js → playlist.json
docs/
  DEPLOY.md                    # deployment checklist
  SECURITY.md                  # security notes
  TESTING.md                   # testing guide
  MUSIC_SYSTEM_ARCHITECTURE.md # audio flow design
  RADIO_FLOW_IMPROVEMENT.md    # DJ break flow notes
  API_KEY_UPDATE_CHECKLIST.md  # key rotation steps
  CLEANUP_SUMMARY.md           # historical cleanup log
  archive/                     # old deploy guides (reference only)
```
```

- [ ] **Step 3: Verify structure block looks right**

```bash
grep -A 20 "## Structure" CLAUDE.md
```

Expected: shows both `public/`, `netlify/`, `scripts/`, and the new `docs/` block.

- [ ] **Step 4: Stage and commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md structure section to reflect docs/ layout

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
