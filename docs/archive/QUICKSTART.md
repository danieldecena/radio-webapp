---
related:
  - "[[Projects/Hold/Radio/docs/archive/DEPLOY]]"
---
# ⚡ Quick Start

## Test Locally First (Recommended)

```bash
cd ~/Development/93.4-rom-radio

# Install Netlify CLI if you haven't
npm install -g netlify-cli

# Your .env file is already set up with your API key!
# Start local dev server
netlify dev
```

Open **http://localhost:8888** and test:
- Power button → Radio starts
- Wait ~13 minutes for DJ break
- DJ should speak with AI voice

## Deploy to Production

Once local testing works:

### 1️⃣ Push to GitHub

```bash
git init
git add .
git commit -m "93.4 ROM Radio - Ready to deploy"
gh repo create 93.4-rom-radio --private --source=. --remote=origin --push
```

### 2️⃣ Deploy on Netlify

1. [app.netlify.com](https://app.netlify.com) → **Add new site**
2. Import your GitHub repo `93.4-rom-radio`
3. Click **Deploy**

### 3️⃣ Add API Key to Netlify

**⚠️ IMPORTANT: Don't skip this!**

1. Netlify dashboard → **Site settings** → **Environment variables**
2. Add variable:
   - Name: `ELEVENLABS_API_KEY`
   - Value: (paste your ElevenLabs API key here)
3. **Trigger redeploy** (Deploys tab → Trigger deploy)

### 4️⃣ Done! 🎉

Your radio is now live at `https://your-site-name.netlify.app`

## Customize

**DJ Content**: Edit `public/breaks.js`
- Station name, taglines
- Special date messages (birthdays, anniversaries)
- All DJ break content

**Spotify Playlist**: Edit `public/index.html` (line 61)
```javascript
uri: 'spotify:playlist:YOUR_PLAYLIST_ID',
```

**DJ Voice**: Change voice in Netlify environment variables
- Add `ELEVENLABS_VOICE_ID` with new voice from [elevenlabs.io/voice-library](https://elevenlabs.io/voice-library)

## Files Overview

```
📁 93.4-rom-radio/
├── 📄 README.md              ← Full documentation
├── 📄 DEPLOY.md              ← Step-by-step deployment checklist
├── 📄 QUICKSTART.md          ← This file
├── 📄 .env                   ← Your API key (local dev only, NOT committed)
├── 📄 .env.example           ← Template for others
├── 📄 netlify.toml           ← Netlify configuration
├── 📄 package.json           ← Project metadata
│
├── 📁 public/                ← Your web app
│   ├── index.html           ← Main page
│   ├── app.js               ← Radio logic (SECURE - no API key!)
│   ├── breaks.js            ← DJ content (customize here!)
│   ├── style.css            ← Styling
│   ├── manifest.json        ← PWA config
│   └── icon.png/favicon.ico ← Icons
│
└── 📁 netlify/functions/     ← Serverless backend
    └── speak.js             ← Secure TTS proxy (hides API key)
```

## Security

✅ **Before**: API key exposed in browser → Anyone can steal it
✅ **Now**: API key hidden on server → Secure!

The `speak.js` serverless function handles TTS securely server-side.

## Need Help?

- **Full docs**: [README.md](Daily/README.md)
- **Deployment guide**: [DEPLOY.md]([[DEPLOY]].md)
- **Local testing issues**: Check browser console (F12)
- **Netlify issues**: Check deploy logs in dashboard

---

**🎵 93.4 ROM - Playing the hits, dedicated to you**

## Related
- [[IMPLEMENTATION_SUMMARY]]
- [[PROJECT_SUMMARY]]
- [[SETUP_COMPLETE]]
- [[STATUS]]
- [[VISUAL_OVERVIEW]]
