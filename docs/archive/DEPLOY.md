# 🚀 Quick Deployment Checklist

Follow these steps in order:

## ☑️ Before You Start

- [ ] Get ElevenLabs API key from [elevenlabs.io](https://elevenlabs.io/app/settings/api-keys)
- [ ] Sign up for [Netlify](https://app.netlify.com/signup) (free)
- [ ] Have GitHub account ready

## ☑️ Step 1: Push to GitHub

```bash
cd ~/Development/93.4-rom-radio

# Initialize git (if not done)
git init
git add .
git commit -m "Initial commit"

# Create private GitHub repo
gh repo create 93.4-rom-radio --private --source=. --remote=origin --push
```

**Or create manually at [github.com/new](https://github.com/new)**

## ☑️ Step 2: Deploy on Netlify

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Select **GitHub**
4. Choose `93.4-rom-radio` repository
5. Settings should be:
   - Build command: (empty)
   - Publish directory: `public`
6. Click **"Deploy site"**

## ☑️ Step 3: Add API Key (CRITICAL!)

1. In Netlify, go to **Site settings** → **Environment variables**
2. Click **"Add a variable"**
3. Enter:
   - Key: `ELEVENLABS_API_KEY`
   - Value: (paste your ElevenLabs API key)
4. Click **"Save"**
5. Go to **Deploys** tab → **"Trigger deploy"** → **"Clear cache and deploy site"**

## ☑️ Step 4: Test It!

Your site is now live at: `https://your-site-name.netlify.app`

**Test:**
- [ ] Power button turns on radio
- [ ] Spotify plays
- [ ] DJ break speaks after ~13 minutes
- [ ] Works on mobile
- [ ] Can install as PWA

## 🎉 You're Done!

**Next steps:**
- Customize content in `public/breaks.js`
- Change Spotify playlist in `public/index.html`
- Set up custom domain (optional)

**Optional: Custom Domain**
1. In Netlify: **Domain settings** → **Add custom domain**
2. Follow DNS setup instructions
3. Free HTTPS included!

---

**Need help?** Check the full [README.md](Daily/README.md) for detailed instructions.
