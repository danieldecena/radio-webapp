# 93.4 ROM Radio - Testing Guide

## Testing Session: 2026-02-26

### New Features to Test

#### ✅ High-Priority Fixes
1. Volume slider controls actual audio
2. Loading states for playlist
3. localStorage persistence (station state survives refresh)
4. Dead code removed (cleaner, faster)

#### ✅ Medium-Priority Features
5. ARIA labels for screen readers
6. Keyboard shortcuts
7. Track progress indicator
8. Mobile haptic feedback

---

## Desktop Testing (Chrome/Firefox/Safari)

### 1. Volume Control
- [ ] Click power button → radio turns on
- [ ] Click volume button → slider appears
- [ ] Drag slider → audio volume changes in real-time
- [ ] Set to 50% → music should be half volume
- [ ] Set to 0% → music should be nearly silent (not muted completely due to safety limit)

### 2. Keyboard Shortcuts
- [ ] Press **Spacebar** → Radio turns on/off
- [ ] Press **↑** → Volume increases by 5%
- [ ] Press **↓** → Volume decreases by 5%
- [ ] Press **M** → Volume panel toggles
- [ ] Click in an input field → keyboard shortcuts disabled (type normally)

### 3. Progress Bar
- [ ] Power on radio → wait for song to start
- [ ] Look below the clock → blue progress bar should appear
- [ ] Bar should smoothly fill from left to right as song plays
- [ ] During DJ break → progress bar should hide
- [ ] After DJ break → progress bar reappears with next song

### 4. Loading States
- [ ] Refresh page → see "LOADING PLAYLIST..."
- [ ] Power button should be disabled (grayed out)
- [ ] After ~1-2 seconds → see "93.4 ROM" and "PLAYING THE HITS, DEDICATED TO YOU"
- [ ] Power button should become enabled

### 5. State Persistence
- [ ] Power on radio → let song play for ~30 seconds
- [ ] Note the current song and approximate position
- [ ] Power off radio
- [ ] Refresh page (F5 or Cmd+R)
- [ ] Power on radio → should continue from where it left off (station kept broadcasting)
- [ ] Change volume to 30%
- [ ] Refresh page → volume should still be at 30%

---

## Mobile Testing (iOS Safari / Android Chrome)

### 6. Touch Targets
- [ ] All buttons should be easily tappable (no mis-taps)
- [ ] Volume slider should be smooth to drag
- [ ] Power button should be large enough for thumb

### 7. Haptic Feedback (iOS/Android)
- [ ] Tap power button → feel light vibration (stronger, 20ms)
- [ ] Tap volume button → feel light vibration (10ms)
- [ ] Tap load music button → feel light vibration (10ms)
- [ ] If no vibration, device may not support it (OK - graceful degradation)

### 8. PWA Installation
- [ ] iOS Safari: Share button → "Add to Home Screen"
- [ ] Android Chrome: Menu → "Install app" or "Add to Home Screen"
- [ ] Open from home screen → should look like native app (no browser chrome)
- [ ] Icons should display correctly
- [ ] Splash screen should show station logo

### 9. Mobile UX
- [ ] Progress bar should be visible and readable on small screen
- [ ] Clock display should be clear
- [ ] Song titles should not overflow
- [ ] Volume slider should be usable with thumb

---

## Accessibility Testing

### 10. Screen Reader (VoiceOver / NVDA / JAWS)
- [ ] Power button announces "Power, button, not pressed" when off
- [ ] Power button announces "Power, button, pressed" when on
- [ ] Volume button announces "expanded" or "collapsed" state
- [ ] Volume slider announces current value (e.g., "Volume level, 75")
- [ ] "LIVE" text changes are announced automatically
- [ ] Song titles are announced when they change

### 11. Keyboard Navigation
- [ ] Tab through all controls → focus indicators visible
- [ ] Tab to power button → press Enter or Space to activate
- [ ] Tab to volume button → press Enter or Space to open/close
- [ ] Tab to volume slider → use Arrow keys to adjust

---

## Edge Cases & Error Handling

### 12. Error States
**Test playlist load failure:**
- [ ] Rename `music/playlist.json` to `music/playlist.json.bak`
- [ ] Refresh page
- [ ] Should see "PLAYLIST ERROR" and "USE LOAD MUSIC BUTTON BELOW"
- [ ] Power button should be disabled
- [ ] Click "Load Music" → select folder → power button enables
- [ ] Restore `playlist.json.bak` to `playlist.json`

**Test corrupted localStorage:**
- [ ] Open DevTools → Console
- [ ] Run: `localStorage.setItem('romRadioState', '{invalid json')`
- [ ] Refresh page
- [ ] Should not crash (should see console warning)
- [ ] Radio should still work normally

### 13. Long Session Testing
- [ ] Let radio play for 30+ minutes
- [ ] DJ breaks should occur every 7 minutes (full breaks)
- [ ] Quick station IDs should occur every 2.5 minutes
- [ ] Crossfades between songs should be smooth
- [ ] Progress bar should reset for each new song
- [ ] No memory leaks (check DevTools → Performance → Memory)

---

## Browser Compatibility

### 14. Cross-Browser Testing
- [ ] **Chrome** (latest) - All features work
- [ ] **Firefox** (latest) - All features work
- [ ] **Safari** (latest) - All features work (especially Web Audio API)
- [ ] **Edge** (latest) - All features work
- [ ] **Mobile Safari** (iOS 14+) - All features work
- [ ] **Mobile Chrome** (Android 10+) - All features work

---

## Performance Testing

### 15. Performance Checks
- [ ] Open DevTools → Performance tab
- [ ] Record for 60 seconds while radio is playing
- [ ] Check CPU usage: Should be low (~5-10% on modern hardware)
- [ ] Check FPS: Should be steady 60fps (or 30fps on lower-end devices)
- [ ] Check memory usage: Should not continuously increase (no leaks)
- [ ] EQ visualizer bars should animate smoothly

---

## Known Issues / Expected Behavior

### Things That Are Normal:
- **First power-on after page load**: May take 1-2 seconds for audio context to initialize
- **Web Speech API DJ voice**: May sound robotic (fallback when ElevenLabs is unavailable)
- **Volume at 0%**: Audio doesn't completely mute (0.02 minimum for safety)
- **Instant-on mode**: 50% chance to skip scanning animation (simulates live broadcast)
- **Mid-song tune-in**: Song starts at random position (realistic radio behavior)

### Things to Fix (If You Find Them):
- [ ] Audio doesn't play at all
- [ ] Volume slider doesn't affect audio
- [ ] Progress bar doesn't move
- [ ] Keyboard shortcuts don't work
- [ ] Haptics cause app to crash
- [ ] Screen reader announces incorrect information
- [ ] Power button stays disabled forever
- [ ] Station state doesn't persist across refresh

---

## Testing Complete? ✅

Once you've tested everything above:

1. **Mark any issues found** (create GitHub issues if needed)
2. **Deploy to Netlify**: `npm run deploy` or push to main branch
3. **Test live deployment** on real devices
4. **Share with Pauline** 🎉

---

## Deployment Command

```bash
# Deploy to Netlify
npm run deploy

# Or if using git auto-deploy:
git push origin main
```

Then visit your Netlify URL and test everything again on the live site!
