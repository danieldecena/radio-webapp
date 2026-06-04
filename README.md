# 96.6 ROM Radio 📻

A personal web radio station dedicated to Pauline, featuring:

- 🎵 Spotify playlist integration
- 🎙️ AI-powered DJ breaks with ElevenLabs TTS
- 📱 Progressive Web App (PWA) support
- 🎨 Beautiful retro car radio UI
- 🔒 Secure serverless architecture

## Features

- **Dynamic DJ Breaks**: Time-based categories (shoutouts, weather, traffic, news, commercials)
- **Special Date Messages**: Custom messages for birthdays, Valentine's Day, anniversaries
- **Rotating Taglines**: Station identity that cycles before songs load
- **Spotify Integration**: Embedded playlist with song metadata
- **Multi-tier TTS**: ElevenLabs → Web Speech API → Text-only fallbacks
- **Mobile Optimized**: Touch-friendly controls, PWA installable

## 🚀 Deployment Instructions

### Prerequisites

1. **ElevenLabs API Key** (Free tier: 10k characters/month)
   - Sign up at [elevenlabs.io](https://elevenlabs.io)
   - Get your API key from [Settings → API Keys](https://elevenlabs.io/app/settings/api-keys)

2. **GitHub Account** (free)
3. **Netlify Account** (free) - [Sign up here](https://app.netlify.com/signup)

### Step 1: Set Up Repository

```bash
# Initialize git repository
cd ~/Development/96.6-rom-radio
git init
git add .
git commit -m "Initial commit: 96.6 ROM Radio"

# Create GitHub repository (using gh CLI)
gh repo create 96.6-rom-radio --private --source=. --remote=origin --push
```

**Or manually:**

1. Go to [GitHub](https://github.com/new)
2. Create a new **private** repository named `96.6-rom-radio`
3. Push your code:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/96.6-rom-radio.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Netlify

#### Option A: Using Netlify UI (Easiest)

1. Go to [Netlify](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** and select your `96.6-rom-radio` repository
4. Configuration (should auto-detect):
   - **Build command**: (leave empty)
   - **Publish directory**: `public`
5. Click **"Deploy site"**

#### Option B: Using Netlify CLI

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize and deploy
netlify init
netlify deploy --prod
```

### Step 3: Add Environment Variables

**Critical: Add your API key to Netlify**

1. In Netlify dashboard, go to your site
2. Navigate to **Site settings** → **Environment variables**
3. Click **"Add a variable"**
4. Add:
   - **Key**: `ELEVENLABS_API_KEY`
   - **Value**: `your_api_key_here` (paste your actual key)
5. Click **"Save"**

6. **Trigger a redeploy**:
   - Go to **Deploys** tab
   - Click **"Trigger deploy"** → **"Clear cache and deploy site"**

### Step 4: Test Your Site

Once deployed, your site will be live at `https://your-site-name.netlify.app`

**Test checklist:**

- ✅ Power button turns on the radio
- ✅ Spotify playlist starts playing
- ✅ DJ breaks play with AI voice (wait ~13 minutes for first break)
- ✅ Volume controls work
- ✅ Display shows song information
- ✅ Mobile responsive and installable as PWA

## 🔧 Customization

### Update DJ Breaks Content

Edit `public/breaks.js`:

- `STATION_CONFIG` - Station name, tagline, city
- `STATION_TAGLINES` - Rotating taglines
- `SPECIAL_DATES` - Birthday, anniversary messages
- `DJ_BREAKS` - Shoutouts, commercials, weather, traffic, news

### Change Spotify Playlist

Edit `public/index.html` line 61:

```javascript
uri: 'spotify:playlist:YOUR_PLAYLIST_ID',
```

Get playlist ID from Spotify URL:
`https://open.spotify.com/playlist/45dvmYti7Kn9EDRzc31hS4`
→ ID is `45dvmYti7Kn9EDRzc31hS4`

### Change DJ Voice

1. Go to [ElevenLabs Voice Library](https://elevenlabs.io/voice-library)
2. Choose a voice and copy its Voice ID
3. Add to Netlify environment variables:
   - **Key**: `ELEVENLABS_VOICE_ID`
   - **Value**: `your_voice_id_here`

## 📊 Usage Limits & Costs

### ElevenLabs Free Tier

- **10,000 characters/month** free
- Each DJ break ≈ 150 characters
- At 13-minute intervals = ~67 breaks per day
- **~10,000 characters/day of listening**

**Recommendation**: With casual listening (1-2 hours/day), you'll stay within free tier easily.

### Netlify Free Tier

- **100 GB bandwidth/month**
- **300 build minutes/month**
- Unlimited sites
- This app will use ~0 build minutes (static site)

## 🛠️ Local Development

```bash
# Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# Create .env file with your API key
cp .env.example .env
# Edit .env and add your ELEVENLABS_API_KEY

# Run local dev server with functions
netlify dev

# Open http://localhost:8888
```

## 🎯 Architecture

```
User Browser
    ↓
[Static HTML/CSS/JS]
    ↓
[Netlify Serverless Function] ← Environment Variable (API Key)
    ↓
[ElevenLabs API]
```

**Security**: API key never exposed to browser, stays server-side

## 📱 PWA Installation

On mobile devices (iOS/Android):

1. Open site in browser
2. Tap **"Add to Home Screen"**
3. App installs with icon
4. Works offline (cached assets)

## 🐛 Troubleshooting

### DJ breaks not speaking

- Check Netlify environment variable is set correctly
- Check ElevenLabs API key is valid and has credits
- Check browser console for errors
- Fallback: Web Speech API will play instead (robotic voice)

### Spotify not playing

- Check Spotify playlist is **public**
- Try refreshing the page
- Check browser console for Spotify embed errors

### Site not deploying

```bash
# Check build logs in Netlify dashboard
# Redeploy with clear cache:
netlify deploy --prod --build
```

## 📝 License

Personal project - All rights reserved

---

**Made with ❤️ for Pauline**
**96.6 ROM - Victoria's station for love**

## 🎧 Generating Audio Snippets (Zero Cost Mode)

To save ElevenLabs credits, you can pre-generate the ~40 static DJ snippets as MP3s.

1. **Set your API Key**:

   ```bash
   export ELEVENLABS_API_KEY="your_api_key"
   ```

2. **Run the Generator Script**:

   ```bash
   # Make sure you are in the project folder
   cd ~/Development/96.6-rom-radio

   # Run the script
   node scripts/generate_breaks.js
   ```

3. **Deploy**:
   ```bash
   npm run deploy
   ```

## Related
- [[Vault Health Report]]
