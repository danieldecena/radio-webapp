# OpenWolf

@.wolf/OPENWOLF.md

This project uses OpenWolf for context management. Read and follow .wolf/OPENWOLF.md every session. Check .wolf/cerebrum.md before generating code. Check .wolf/anatomy.md before reading files.


# 96.6 ROM Radio - Project Context

## Project Overview
Personal web radio station dedicated to Pauline. Plays a curated **local music
library** mixed with DJ breaks. The current direction is **pre-rendered shows**:
music + DJ drops baked into single MP3 files (crossfades, ducking, broadcast
voice processing) that play with no API and work offline. A retro car-radio UI.

**Live URL**: not yet deployed
**Repository**: https://github.com/danieldecena/radio-webapp

## Tech Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Audio**: local MP3s + pre-rendered show files (HTML5 `<audio>`); ffmpeg for rendering
- **TTS (offline, optional)**: ElevenLabs API to voice DJ breaks ahead of time
- **Hosting**: Netlify (static site; optional serverless TTS function)
- **PWA**: Service Worker for offline support

## Architecture
```
public/
├── player.html        # NEW show-picker player (plays pre-rendered shows)
├── index.html         # Legacy live-DJ UI (real-time TTS engine)
├── app.js             # Legacy radio controller (live engine)
├── breaks.js          # DJ break scripts (ES module: DJ_BREAKS, SPECIAL_DATES, ...)
├── music/             # Curated song library (.mp3) + playlist.json
├── audio/
│   ├── snippets/      # Short pre-rendered station-ID clips
│   ├── breaks/        # Voiced long-form DJ breaks (after generate_dj_breaks.js)
│   └── fx/sweeper.wav # Sweeper stinger used in shows
├── shows/             # Pre-rendered show_N.mp3 + show_N.cue.json + data.js + manifest.json
└── manifest.json      # PWA manifest

netlify/functions/
└── speak.js           # Optional serverless TTS proxy (origin allowlist + rate limit)

scripts/
├── render_show.py        # Mixing engine: crossfades, ducking, voice chain, master glue
├── build_shows.py        # Renders the library into public/shows/ (+ cues, data.js)
├── generate_dj_breaks.js # Voices ALL breaks.js lines via ElevenLabs (local, your key)
├── generate_breaks.js    # (older) voices only the `short` array
└── generate_playlist.js  # Build music/playlist.json from the MP3 folder
```

## Key Features
- **Dynamic DJ Breaks**: Time-based categories (shoutouts, weather, traffic, news, commercials)
- **Special Date Messages**: Custom messages for birthdays, Valentine's Day, anniversaries
- **Volume Ducking**: Music fades when DJ talks
- **Station Persistence**: Radio continues broadcasting when powered back on
- **Multi-tier TTS**: ElevenLabs → Web Speech API → Text-only fallbacks

## Development Workflow

See `README.md` for the full local-dev / render / voice / deploy commands (it's the
source of truth and stays current). Quick map: render shows with
`python3 scripts/build_shows.py --all` (needs ffmpeg) → serve with `npm run dev`
(http://localhost:3001/, serves player.html at root; use `npm run dev:netlify` on 8888
to exercise the TTS function) → deploy via `npm run deploy` or push to `main`.

Manual smoke check (no framework beyond `npm test`): player.html lists only rendered
shows, selecting one plays the pre-rendered file, now-playing + DJ-on-air track the
cue sheet, volume works, show auto-advances, and it installs as a PWA on mobile.

## Configuration

### Environment Variables (Netlify) — only for the optional live-TTS function
- `ELEVENLABS_API_KEY` - For the legacy real-time TTS function (not needed for pre-rendered shows)
- `ELEVENLABS_VOICE_ID` - Optional, defaults to `KLoixBflzS2a9rg6nT8x`
- `ALLOWED_ORIGINS` - Origin allowlist for the TTS function

### Customization Files
- `public/breaks.js` - Edit DJ content, special dates, station info
- `scripts/build_shows.py` - Tracks per show, crossfade length, drop frequency
- `scripts/render_show.py` - Voice chain, ducking, master glue
- `public/app.js` - Legacy live-engine behavior, timing, volume levels

## Important Files

### Core Files (Read First)
- `README.md` - Full setup and usage guide
- `public/player.html` - Show-picker player (current front-end)
- `scripts/build_shows.py` / `scripts/render_show.py` - Show rendering pipeline
- `public/breaks.js` - All DJ break content
- `netlify/functions/speak.js` - Optional TTS API handler (legacy live mode)

### Documentation
- `docs/MUSIC_SYSTEM_ARCHITECTURE.md` - Music playlist system design
- `docs/RADIO_FLOW_IMPROVEMENT.md` - Radio flow and UX improvements
- `docs/API_KEY_UPDATE_CHECKLIST.md` - Security checklist for API changes
- `docs/SECURITY.md` - Security policy
- `docs/DEPLOY.md` - Deployment checklist
- `docs/TESTING.md` - Testing guide
- `docs/CLEANUP_SUMMARY.md` - Historical cleanup log

### Archive
- `docs/archive/` - Old deployment guides (Vercel, manual setup)

## Code Style

### JavaScript
- Use ES6+ features (const, let, arrow functions, destructuring)
- Prefer functional patterns over classes
- Keep functions small and focused
- Use meaningful variable names (SCREAMING_SNAKE_CASE for constants)
- Add comments for complex audio timing logic

### Commit Messages
Follow existing style:
```
Add radio flow improvements, icons, and generator scripts
Fix syntax error: Add missing closing brackets for Spotify controller
Implement 'station keeps broadcasting' - radio continues when powered back on
```

## Known Issues & TODOs
- Check for any open issues in GitHub repo
- Monitor ElevenLabs API usage (free tier: 10k chars/month)
- Test PWA installation on iOS and Android

## Security Notes
- NEVER commit `.env` file (contains API key)
- API key is server-side only (Netlify function)
- Playlist JSON is public (pre-generated audio snippets)
- Repository is private

## Resources
- [ElevenLabs API Docs](https://elevenlabs.io/docs)
- [ffmpeg filters (acrossfade, sidechaincompress, loudnorm)](https://ffmpeg.org/ffmpeg-filters.html)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [PWA Guidelines](https://web.dev/progressive-web-apps/)

## Personal Context
This is a personal project for Pauline featuring:
- Station name: "96.6 ROM Radio"
- Tagline: "Victoria's station for love"
- Music: Curated local library, mixed into pre-rendered shows
- Special dates: Birthday, Valentine's, Anniversary messages

---
**Last Updated**: 2026-06-16

