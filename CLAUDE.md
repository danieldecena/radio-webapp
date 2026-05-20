# 96.6 ROM Radio - Project Context

## Project Overview
Personal web radio station dedicated to Pauline featuring Spotify integration, AI-powered DJ breaks, and a retro car radio UI.

**Live URL**: (Add when deployed to Netlify)
**Repository**: https://github.com/danieldecena/96.6-rom-radio

## Tech Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Audio**: Spotify Web Playback SDK, Web Audio API
- **TTS**: ElevenLabs API (primary), Web Speech API (fallback)
- **Hosting**: Netlify (static site + serverless functions)
- **PWA**: Service Worker for offline support

## Architecture
```
public/
├── index.html          # Main radio UI
├── app.js             # Radio controller, Spotify integration
├── breaks.js          # DJ break content and scheduling
├── music/
│   └── playlist.json  # Pre-generated audio snippets
├── icons/             # PWA icons
└── manifest.json      # PWA manifest

netlify/functions/
└── tts.js            # Serverless function for ElevenLabs API

scripts/
├── generate_breaks.js    # Pre-generate DJ audio snippets
└── generate_playlist.js  # Convert breaks.js to playlist.json
```

## Key Features
- **Dynamic DJ Breaks**: Time-based categories (shoutouts, weather, traffic, news, commercials)
- **Special Date Messages**: Custom messages for birthdays, Valentine's Day, anniversaries
- **Volume Ducking**: Music fades when DJ talks
- **Station Persistence**: Radio continues broadcasting when powered back on
- **Multi-tier TTS**: ElevenLabs → Web Speech API → Text-only fallbacks

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Create .env file (not committed)
cp .env.example .env
# Add ELEVENLABS_API_KEY=your_key_here

# Run local dev server with Netlify functions
netlify dev
# Opens at http://localhost:8888
```

### Testing
```bash
# Manual testing checklist:
# - Power button turns radio on/off
# - Spotify playlist plays
# - DJ breaks play after ~13 minutes
# - Volume ducking works during DJ breaks
# - Station state persists across power cycles
# - Mobile responsive and installable as PWA
```

### Pre-generating Audio Snippets (Optional)
```bash
# Export API key
export ELEVENLABS_API_KEY="your_key_here"

# Generate all DJ breaks as MP3s
node scripts/generate_breaks.js

# Deploy with pre-generated audio
npm run deploy
```

### Deployment
```bash
# Deploy to Netlify
npm run deploy

# Or auto-deploy via git push to main
git push origin main
```

## Configuration

### Environment Variables (Netlify)
- `ELEVENLABS_API_KEY` - Required for real-time TTS
- `ELEVENLABS_VOICE_ID` - Optional, defaults to current voice

### Customization Files
- `public/breaks.js` - Edit DJ content, special dates, station info
- `public/index.html:61` - Change Spotify playlist URI
- `public/app.js` - Modify radio behavior, timing, volume levels

## Important Files

### Core Files (Read First)
- `README.md` - Full deployment and usage guide
- `public/app.js` - Radio controller logic
- `public/breaks.js` - All DJ break content
- `netlify/functions/tts.js` - TTS API handler

### Documentation
- `MUSIC_SYSTEM_ARCHITECTURE.md` - Music playlist system design
- `RADIO_FLOW_IMPROVEMENT.md` - Radio flow and UX improvements
- `API_KEY_UPDATE_CHECKLIST.md` - Security checklist for API changes
- `SECURITY.md` - Security policy

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

## Useful Commands
```bash
# Check git status
git status

# View recent commits
git log --oneline -5

# Test Netlify function locally
curl http://localhost:8888/.netlify/functions/tts \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello from ROM Radio"}'

# Check ElevenLabs API usage
# Visit: https://elevenlabs.io/app/usage
```

## Resources
- [ElevenLabs API Docs](https://elevenlabs.io/docs)
- [Spotify Web Playback SDK](https://developer.spotify.com/documentation/web-playback-sdk/)
- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [PWA Guidelines](https://web.dev/progressive-web-apps/)

## Personal Context
This is a personal project for Pauline featuring:
- Station name: "96.6 ROM Radio"
- Tagline: "Victoria's station for love"
- Music: Curated Spotify playlist
- Special dates: Birthday, Valentine's, Anniversary messages

---
**Last Updated**: 2026-02-25

---

## Task System

Paste this into any agent's CLAUDE.md to give it task read/write access.

---

## Task System

You have access to a shared task manager. Tasks are stored in JSON and synced
directly to the Obsidian vault at `http://127.0.0.1:27123`.

### Reading tasks

```bash
cd ~/Obsidian\ Cloud/Developer/Projects/agent-system
python3 -c "from tasks import list_tasks; import json; print(json.dumps(list_tasks(), indent=2))"
```

### Creating a task

```bash
python3 -c "
from tasks import create_task
task = create_task('Your task title', 'Description here', agent='claude')
print(task['id'])
"
```

### Updating a task

```bash
python3 -c "
from tasks import update_task, TaskStatus
update_task('TASK-001', status=TaskStatus.DONE, notes='Completed successfully')
"
```

### Writing a note directly to the vault

```bash
curl -X PUT http://127.0.0.1:27123/vault/Tasks/TASK-001.md \
  -H "Authorization: Bearer f1f3ea9887a7e492326c5d897246b173c45464a1a73a266ff3b1a42aa22a2c98" \
  -H "Content-Type: text/markdown" \
  -d "# TASK-001: Your Task
status: done
"
```

### Task statuses
- `pending` — not started
- `in_progress` — actively being worked on
- `done` — completed
- `blocked` — waiting on something

### Rules
- Always create a task before starting non-trivial work
- Update status to `in_progress` when you begin
- Add notes when you hit blockers or finish
- Mark `done` when complete — this updates the vault note automatically

---
