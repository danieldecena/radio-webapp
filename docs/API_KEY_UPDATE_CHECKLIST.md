# ✅ API Key Update Checklist

**Date**: 2026-02-17
**Status**: New API key generated and configured

---

## 🎉 Completed

- ✅ Old API key deleted from ElevenLabs
- ✅ New API key generated: `<YOUR_ELEVENLABS_API_KEY>`
- ✅ Local `.env` file updated
- ✅ API key tested and verified working

---

## 🚀 Deployment Checklist

### Step 1: Update Deployment Platform

Choose the platform you're using:

#### **Option A: Netlify** (Recommended if already deployed there)

**Via Dashboard (Easier):**

1. [ ] Go to https://app.netlify.com
2. [ ] Select your `93.4-rom-radio` site
3. [ ] Click **Site settings** → **Environment variables**
4. [ ] Find `ELEVENLABS_API_KEY`
5. [ ] Click **Options** → **Edit**
6. [ ] Replace value with: `<YOUR_ELEVENLABS_API_KEY>`
7. [ ] Click **Save**
8. [ ] Go to **Deploys** tab
9. [ ] Click **Trigger deploy** → **Clear cache and deploy site**
10. [ ] Wait for deploy to complete (~1-2 minutes)

**Via CLI (Alternative):**

```bash
npm install -g netlify-cli  # If not installed
netlify login
netlify env:set ELEVENLABS_API_KEY <YOUR_ELEVENLABS_API_KEY>
netlify deploy --prod
```

---

#### **Option B: Vercel**

**Via Dashboard:**

1. [ ] Go to https://vercel.com/dashboard
2. [ ] Select your `93.4-rom-radio` project
3. [ ] Click **Settings** → **Environment Variables**
4. [ ] Find `ELEVENLABS_API_KEY`
5. [ ] Click **Edit** (pencil icon)
6. [ ] Replace value with: `<YOUR_ELEVENLABS_API_KEY>`
7. [ ] Make sure all environments are selected:
   - ☑️ Production
   - ☑️ Preview
   - ☑️ Development
8. [ ] Click **Save**
9. [ ] Go to **Deployments** tab
10. [ ] Click the **...** menu on latest deployment
11. [ ] Click **Redeploy**
12. [ ] Wait for deploy to complete

**Via CLI (Alternative):**

```bash
# Remove old key
npx vercel env rm ELEVENLABS_API_KEY production

# Add new key
npx vercel env add ELEVENLABS_API_KEY
# When prompted, paste: <YOUR_ELEVENLABS_API_KEY>
# Select all environments (Production, Preview, Development)

# Deploy
npx vercel --prod
```

---

### Step 2: Test Your Live Site

Once deployed, test your radio:

1. [ ] Open your live site:
   - Netlify: `https://your-site-name.netlify.app`
   - Vercel: `https://your-project-name.vercel.app`

2. [ ] Click the **Power button** to turn on radio
3. [ ] Verify Spotify plays
4. [ ] Wait ~13 minutes for DJ break OR open browser console (F12) and type:
   ```javascript
   triggerDJBreak();
   ```
5. [ ] Verify DJ voice speaks with AI (not robotic Web Speech API)
6. [ ] Test on mobile device
7. [ ] Try installing as PWA

---

### Step 3: Push Code to GitHub

Your local changes are committed, now push them:

```bash
git push origin main
```

This pushes:

- ✅ Security fixes (removed exposed API key)
- ✅ Documentation cleanup
- ✅ New organized structure

---

## 🧪 Optional: Test Locally First

If you want to test before deploying to production:

```bash
# Install Netlify CLI (if not installed)
npm install -g netlify-cli

# Start local dev server
netlify dev

# Open http://localhost:8888
# Test the radio with your new API key
```

---

## ✅ Success Indicators

Your update is successful if:

- ✅ DJ breaks play with AI voice (smooth, natural)
- ✅ No console errors about API key
- ✅ Radio works on mobile
- ✅ PWA can be installed
- ✅ No "TTS service unavailable" errors

---

## 🐛 Troubleshooting

### DJ breaks not speaking

**Check browser console (F12):**

- Look for errors mentioning "API" or "TTS"
- Try manually triggering: `triggerDJBreak()`

**Verify environment variable:**

- Netlify: Check Site settings → Environment variables
- Vercel: Check Settings → Environment Variables
- Make sure it matches: `<YOUR_ELEVENLABS_API_KEY>`

**Check deployment logs:**

- Netlify: Deploys tab → Click latest deploy → View logs
- Vercel: Deployments tab → Click deployment → View function logs

### Still using old key

If you see 401 errors:

1. Double-check environment variable was saved
2. Make sure you triggered a redeploy
3. Clear browser cache and reload
4. Check function logs for API errors

---

## 📊 API Usage (Free Tier)

Your new key has the same limits:

- **10,000 characters/month** free
- Each DJ break ≈ 150 characters
- With pre-generated snippets, you use almost no API calls
- Monitor usage: https://elevenlabs.io/app/settings/billing

---

## 🔒 Security Notes

- ✅ New API key is fresh and secure
- ✅ Never commit `.env` file to git (already in `.gitignore`)
- ✅ Only set keys via environment variables on platforms
- ✅ Git history cleanup (optional) - see SECURITY.md

---

## 📝 Files Updated

- ✅ `.env` - New API key stored locally
- ✅ `SECURITY.md` - Incident documented
- ✅ `CLEANUP_SUMMARY.md` - Changes documented
- ✅ Documentation structure cleaned up

---

**Last Updated**: 2026-02-17
**New API Key**: `<YOUR_ELEVENLABS_API_KEY>` (last 4: 8403)

---

💜 **93.4 ROM - Victoria's station for love**

Once you complete the deployment checklist above, your radio will be fully secured and ready to play! 🎵
