# Cleanup Runbook

Steps to scrub leaked API keys from git history, shrink the repo, and separate
the productivity/agent layer from the app. Commands you run yourself are marked
**[YOU RUN]** — they rewrite history and/or touch files outside the repo.

> Prereqs: `pip install git-filter-repo` (or `brew install git-filter-repo`).
> Always work on a fresh clone or a backup — history rewrites are destructive.

---

## 0. Backup first **[YOU RUN]**

```bash
cd ~
cp -R radio radio-backup-$(date +%Y%m%d)   # full safety copy
```

---

## 1. Rotate the key **[YOU RUN]**

The new key `sk_3676…8403` is in published history — treat it as burned.

1. Generate a fresh key at https://elevenlabs.io/app/settings/api-keys
2. Delete the old keys (`sk_3676…8403` and `sk_956d…e791`).
3. Set the new one only as an env var:
   ```bash
   netlify env:set ELEVENLABS_API_KEY <NEW_KEY>
   # local: put it in .env (already gitignored)
   ```

The working-tree docs have already been placeholdered (this session). Commit that:

```bash
git add docs/
git commit -m "Redact API keys from docs (placeholders only)"
```

## 2. Scrub keys from ALL history **[YOU RUN]**

Placeholdering the working tree does NOT remove keys from old commits. Rewrite
them out. This auto-finds every leaked `sk_…` key in your history and redacts it
— so no real key is ever typed into (or stored in) this file:

```bash
cd ~/radio
# 1. Collect every ElevenLabs-style key that appears anywhere in history:
git log --all -p | grep -ohE 'sk_[A-Za-z0-9]{20,}' | sort -u > /tmp/found-keys.txt
cat /tmp/found-keys.txt   # sanity check: these are the keys that will be scrubbed
# 2. Turn each into a redaction rule and rewrite history:
sed 's/$/==>REDACTED_API_KEY/' /tmp/found-keys.txt > /tmp/key-replacements.txt
git filter-repo --replace-text /tmp/key-replacements.txt
rm -f /tmp/found-keys.txt /tmp/key-replacements.txt
```

Verify (should print 0):

```bash
git log --all -p | grep -cE 'sk_[A-Za-z0-9]{20,}'
```

## 3. Strip large binaries from history (332 MB pack)

Music MP3s are gitignored now but earlier commits still carry them. Drop those paths:

```bash
git filter-repo --invert-paths \
  --path-glob 'public/music/*.mp3' \
  --path-glob 'public/shows/*.mp3' \
  --path-glob 'docs/archive/preview_show.mp3' \
  --path-glob 'rom-radio-deploy.zip'

git count-objects -vH | grep size-pack   # should drop sharply
```

## 4. Re-link the remote and force-push **[YOU RUN]**

`filter-repo` removes `origin` on purpose. Re-add and overwrite:

```bash
git remote add origin https://github.com/danieldecena/radio-webapp.git
git push origin --force --all
git push origin --force --tags
```

> Anyone with an existing clone keeps the old history. Tell collaborators to
> re-clone, and assume the leaked key is compromised until rotated (step 1).

---

## 5. Separate productivity layer from the app **[YOU RUN]**

These directories are personal agent/workspace state, not the radio app. Move
them out so the repo is just the web app:

```bash
mkdir -p ~/workspace/radio
cd ~/radio
mv .wolf .superpowers graphify-out memory dashboard.html \
   STATUS.md TASKS.md ~/workspace/radio/ 2>/dev/null

# CLAUDE.md: keep the app's project notes; the OpenWolf header can move with .wolf
```

Then trim `.gitignore` — once those files are gone, the lines that hid them
(`dashboard.html`, `memory/`, `graphify-out/`, the `.wolf/*` block) are dead
weight and can be removed.

Resulting layout:

```
~/radio/            ← the web app only (public, scripts, netlify, docs, README, package.json)
~/workspace/radio/  ← OpenWolf brain, memory/, dashboard, TASKS/STATUS
```

## 6. Optional: archive the legacy live engine

`public/index.html` + `public/app.js` (2,035 lines) are the superseded real-time
engine. Once you confirm `player.html` is the only thing you ship, move them so
`public/` contains only shipped assets:

```bash
mkdir -p legacy
git mv public/index.html public/app.js legacy/
# update public/_redirects / netlify.toml if they referenced index.html
```

## 7. Housekeeping

```bash
rm -f rom-radio-deploy.zip          # rebuild on demand per README
# Fix license mismatch: package.json says "MIT" but README says "all rights
# reserved". For a personal project, set package.json "license": "UNLICENSED".
git add docs/DJ_SCRIPT.md scripts/generate_dj_script.js   # currently untracked
```
