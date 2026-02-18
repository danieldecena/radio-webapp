# 🚀 Deploy to Vercel - Quick Guide

## Prerequisites
- GitHub account
- Your ElevenLabs API key (get from [elevenlabs.io/app/settings/api-keys](https://elevenlabs.io/app/settings/api-keys))

## 📦 Step 1: Push to GitHub

```bash
cd ~/Development/93.4-rom-radio

# Initialize git if not done
git init
git add .
git commit -m "93.4 ROM Radio - Ready for Vercel"

# Create private GitHub repo
gh repo create 93.4-rom-radio --private --source=. --remote=origin --push
```

**Or manually:**
1. Go to [github.com/new](https://github.com/new)
2. Create private repo `93.4-rom-radio`
3. Push:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/93.4-rom-radio.git
   git branch -M main
   git push -u origin main
   ```

## 🌐 Step 2: Deploy on Vercel

### Option A: Using Vercel Dashboard (Easiest)

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **"Add New..."** → **"Project"**
3. **Import Git Repository** → Select your `93.4-rom-radio` repo
4. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: `./`
   - **Build Command**: (leave empty)
   - **Output Directory**: `public`
5. Click **"Deploy"** (Don't worry, we'll add the API key next)

### Option B: Using Vercel CLI

```bash
# Install and login to Vercel
npx vercel login

# Deploy
cd ~/Development/93.4-rom-radio
npx vercel --prod
```

## 🔑 Step 3: Add Environment Variable (CRITICAL!)

### Via Vercel Dashboard:
1. Go to your project on [vercel.com](https://vercel.com/dashboard)
2. Click **Settings** → **Environment Variables**
3. Add variable:
   - **Name**: `ELEVENLABS_API_KEY`
   - **Value**: (paste your ElevenLabs API key here)
   - **Environment**: All (Production, Preview, Development)
4. Click **"Save"**
5. **Redeploy**: Go to **Deployments** → Click the three dots → **Redeploy**

### Via Vercel CLI:
```bash
npx vercel env add ELEVENLABS_API_KEY
# Paste your API key when prompted
# Select: Production, Preview, Development (use spacebar to select all)

# Redeploy
npx vercel --prod
```

## ✅ Step 4: Test Your Radio!

Your site is now live at: `https://your-project-name.vercel.app`

**Test checklist:**
- [ ] Power button turns on radio
- [ ] Spotify plays and shuffles songs
- [ ] Open browser console (F12) and type: `triggerDJBreak()`
- [ ] DJ voice should speak with FM radio effects
- [ ] Works on mobile
- [ ] Can install as PWA

## 🎯 Vercel Free Tier

- **100 GB bandwidth/month** (more than enough)
- **Unlimited serverless function invocations**
- **Unlimited deployments**
- **Automatic HTTPS**
- **Custom domain** (optional, free)

## 🔧 Custom Domain (Optional)

1. In Vercel dashboard: **Settings** → **Domains**
2. Add your domain
3. Update DNS records (Vercel provides instructions)
4. HTTPS is automatic!

## 🐛 Troubleshooting

### DJ breaks not speaking
```bash
# Check Vercel deployment logs
npx vercel logs

# Verify environment variable is set
npx vercel env ls
```

### Function errors
- Check **Functions** tab in Vercel dashboard
- Look for error logs
- Verify API key is correct

### Redeploy after changes
```bash
git add .
git commit -m "Update radio"
git push

# Vercel auto-deploys on push!
# Or manually: npx vercel --prod
```

## 📝 What Changed for Vercel

- ✅ Created `/api/speak.js` (Vercel serverless function)
- ✅ Created `vercel.json` (Vercel configuration)
- ✅ Updated `app.js` to detect Netlify vs Vercel
- ✅ Everything else stays the same!

## 🎉 You're Done!

Your radio is now live with:
- ✅ Secure API key (server-side)
- ✅ FM radio audio effects
- ✅ Spotify integration
- ✅ AI DJ breaks every 13 minutes
- ✅ PWA support

---

**🎵 93.4 ROM - Victoria's station for love**

**Need help?** Check the main [README.md](README.md) for customization options.
