# Deployment Guide

## Pre-Deployment Checklist

- [ ] All features tested locally
- [ ] No console errors in DevTools
- [ ] Volume slider works
- [ ] Progress bar displays correctly
- [ ] Keyboard shortcuts functional
- [ ] localStorage persistence works
- [ ] Playlist loads successfully

## Deploy to Netlify

### Option 1: Auto-Deploy via Git (Recommended)

```bash
# Commit any remaining changes
git add .
git commit -m "Ready for deployment"

# Push to main branch
git push origin main
```

Netlify will automatically deploy from your main branch.

### Option 2: Manual Deploy

```bash
# Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy to production
netlify deploy --prod
```

Follow the prompts:
- **Publish directory:** `public`
- **Site name:** (your site name or auto-generated)

### Environment Variables on Netlify

1. Go to your Netlify dashboard
2. Site settings → Environment variables
3. Add:
   - `ELEVENLABS_API_KEY` = your API key
   - `ELEVENLABS_VOICE_ID` = your voice ID (optional)

### Netlify Function Setup

The serverless function for TTS is located at:
```
netlify/functions/speak.js
```

Netlify will automatically deploy this function.

## Post-Deployment Testing

1. **Visit your live URL** (e.g., `https://your-site.netlify.app`)
2. **Test on mobile devices:**
   - iOS Safari
   - Android Chrome
3. **Test PWA installation:**
   - iOS: Share → Add to Home Screen
   - Android: Menu → Install app
4. **Test keyboard shortcuts**
5. **Test haptic feedback on mobile**
6. **Test state persistence** (close/reopen browser)

## Troubleshooting

### DJ Voice Not Working
- Check Netlify function logs
- Verify `ELEVENLABS_API_KEY` is set
- Check ElevenLabs API usage at https://elevenlabs.io/app/usage
- Falls back to Web Speech API (expected behavior)

### Music Not Playing
- Check browser console for errors
- Verify `music/playlist.json` exists
- Check file paths in playlist.json

### Progress Bar Not Showing
- Check browser console for JavaScript errors
- Verify CSS loaded correctly
- Try hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

### Keyboard Shortcuts Not Working
- Check if focus is in an input field (shortcuts disabled)
- Try clicking the page background first
- Check browser console for errors

## Share with Pauline! 🎉

Once deployed and tested:
1. Share the Netlify URL
2. Guide her to install as PWA on her phone
3. Show her the keyboard shortcuts (if using desktop)
4. Enjoy the personal radio station! 📻

---

**Live URL:** (Add after deployment)
**Last Updated:** 2026-02-26

## Related
- [[Projects/Hold/Radio/docs/archive/QUICKSTART]]
