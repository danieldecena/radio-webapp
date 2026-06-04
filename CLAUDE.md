# 96.6 ROM Radio

Personal web radio station for Pauline — Spotify integration, AI DJ breaks, retro car radio UI.

**Repo**: https://github.com/danieldecena/96.6-rom-radio (private)

## Stack

- Vanilla JS, HTML5, CSS3
- Spotify Web Playback SDK + Web Audio API
- ElevenLabs TTS (primary), Web Speech API (fallback)
- Netlify (static site + serverless functions)
- PWA with Service Worker

## Run locally

```bash
npm install
cp .env.example .env          # add ELEVENLABS_API_KEY
netlify dev                    # → http://localhost:8888
```

## Deploy

```bash
npm run deploy                 # or: git push origin main (auto-deploy)
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

## Env vars (Netlify)

- `ELEVENLABS_API_KEY` — required for real-time TTS
- `ELEVENLABS_VOICE_ID` — optional, defaults to current voice

## Gotchas

- ElevenLabs free tier is 10k chars/month — monitor at elevenlabs.io/app/usage
- Spotify SDK requires HTTPS; `netlify dev` handles this via localhost
- `breaks.js → playlist.json`: run `node scripts/generate_playlist.js` after editing break content
- Pre-generated audio in `music/playlist.json` takes priority over real-time TTS when present
- If `netlify dev` fails, check `netlify.toml` exists and `netlify-cli` is installed globally

## Personal context

- Station: **96.6 ROM Radio** — "Victoria's station for love"
- Special date messages: birthday, Valentine's, anniversary
