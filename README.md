# 96.6 ROM Radio 📻

A personal web radio station dedicated to Pauline, featuring:

- 🎵 Curated local music library
- 🎙️ DJ breaks (station IDs, talk-ups, weather, traffic, news, commercials)
- 📼 Pre-rendered "shows" — music + DJ drops mixed into single files with baked-in crossfades, ducking, and broadcast voice processing
- 📱 Progressive Web App (PWA) support
- 🎨 Retro car-radio UI
- 🔒 No API needed at playback time

## How it works

The station plays **pre-rendered show files**. A build script mixes your music
library and DJ voice drops into continuous show MP3s (with crossfades, ducking,
a sweeper stinger, and a "radio" master chain baked in). The player just loads a
finished file and plays it — no Spotify, no live API calls, no quota, works
offline.

```
public/music/*.mp3          ← your songs
public/audio/snippets/*.mp3 ← short DJ station-ID clips
        │
        ▼  scripts/build_shows.py  (uses scripts/render_show.py + ffmpeg)
        │
public/shows/show_N.mp3     ← finished shows
public/shows/show_N.cue.json← per-show track + DJ-drop timings (now-playing)
public/shows/data.js        ← inlined data so player.html works from file://
        │
        ▼
public/player.html          ← show picker + retro player
```

Voicing the longer DJ scripts (weather, traffic, news, etc.) with ElevenLabs is
**optional** and done once, offline (see "Voicing DJ breaks"). It is not required
to play the station.

## Quick start (local)

```bash
cd ~/radio

# Render the shows into public/shows/ (needs ffmpeg: brew install ffmpeg)
python3 scripts/build_shows.py --all

# Then either double-click public/player.html in Safari,
# or serve it:
npm run dev          # http://localhost:8888/player.html
```

`build_shows.py` also writes `public/shows/data.js`, which lets `player.html`
run when opened directly from disk (Safari blocks `fetch` from `file://`, but a
`<script>` include works).

## Voicing DJ breaks (optional, one-time, uses your key)

The scripted DJ lines live in `public/breaks.js`. To turn them into audio:

```bash
export ELEVENLABS_API_KEY="your_api_key"     # stays local; never commit it
DRY_RUN=1 node scripts/generate_dj_breaks.js  # estimate character cost first
node scripts/generate_dj_breaks.js            # generate into public/audio/breaks/
```

Output goes to `public/audio/breaks/` with a `breaks_manifest.json`. Once present,
`build_shows.py` automatically uses these announcement-style drops (talk-ups,
station IDs) instead of just the short clips. Re-running skips files already made.

> ElevenLabs free tier is 10,000 characters/month; the full script set is larger,
> so use a paid tier or generate selected categories.

## Deployment (Netlify)

The site is static; the only server-side piece is an **optional** TTS function
(`netlify/functions/speak.js`) used by the legacy live-DJ mode.

1. Push to GitHub, then in Netlify: **Add new site → Import an existing project**.
2. Build command: empty. Publish directory: `public`.
3. (Optional, for live TTS) add environment variables:
   - `ELEVENLABS_API_KEY`
   - `ELEVENLABS_VOICE_ID` (optional; defaults to `KLoixBflzS2a9rg6nT8x`)
   - `ALLOWED_ORIGINS` (your site URL, for the TTS function's origin allowlist)
4. Deploy.

**Live URL:** _not yet deployed_

## Customization

- `public/breaks.js` — `STATION_CONFIG`, `STATION_TAGLINES`, `SPECIAL_DATES`, and
  the `DJ_BREAKS` categories (stationids, talkups, shoutouts, commercials,
  weather, traffic, news, short).
- `scripts/build_shows.py` — `TRACKS_PER_SHOW`, crossfade length, drop frequency.
- `scripts/render_show.py` — the broadcast voice chain, ducking, master glue.

## PWA installation

On mobile: open the site, tap **Add to Home Screen**. Core assets are cached by
the service worker for offline use (`public/sw.js`, network-first for HTML,
stale-while-revalidate for assets).

## Scripts

| Script | Purpose |
| --- | --- |
| `scripts/build_shows.py` | Render the library into pre-mixed show files + cues |
| `scripts/render_show.py` | The mixing engine (crossfades, ducking, voice chain) |
| `scripts/generate_dj_breaks.js` | Voice all `breaks.js` lines via ElevenLabs |
| `scripts/generate_playlist.js` | Build `music/playlist.json` from the MP3 folder |

## Legacy live-DJ mode

`public/index.html` + `public/app.js` are the original real-time engine
(per-break ElevenLabs TTS via `netlify/functions/speak.js`, with a Web Speech API
fallback). It still works but is being superseded by the pre-rendered player.

## License

Personal project — all rights reserved.

---

**Made with ❤️ for Pauline**
**96.6 ROM — Victoria's station for love**
