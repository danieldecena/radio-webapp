# 🎵 Radio Flow Improvement Plan

## Current Problem

**Issue:** Songs skip/stop after DJ breaks, doesn't feel like real radio

**Current Flow:**
```
Music Playing → DJ Break Triggers → Pause Spotify → DJ Speaks → Break Ends → Music STOPS ❌
```

**Why it's wrong:**
- Spotify is paused but never resumed
- Each break causes awkward silence
- Breaks the flow and immersion

---

## Real Radio Station Behavior

Real FM radio stations use **"ducking"** - music stays playing but gets quieter:

```
Music Playing (100%)
    ↓
DJ Break Coming → Fade music down to 20-30% (2 seconds)
    ↓
DJ Speaks (music playing softly underneath at 20%)
    ↓
DJ Finishes → Fade music back up to 100% (2 seconds)
    ↓
Music continues from same position
```

**Benefits:**
- Smooth transitions
- Feels like live radio
- DJ can talk "over" music intro/outro
- No awkward pauses
- Natural flow

---

## Proposed Solution

### Option 1: Volume Ducking (Best for realism)

```javascript
async function triggerDJBreak() {
  // 1. Fade Spotify volume down to 20% (2 seconds)
  await duckSpotifyVolume(0.2, 2000);

  // 2. Play DJ break
  djBreakContent.textContent = text;
  showPanel('djbreak');
  await speakDJBreak(text);

  // 3. Fade Spotify volume back up to 100% (2 seconds)
  await duckSpotifyVolume(1.0, 2000);

  // 4. Resume normal display
  closeBreakPanel(); // No track skip!
}

function duckSpotifyVolume(targetVolume, duration) {
  return new Promise(resolve => {
    // Smooth volume transition over duration
    const steps = 20;
    const stepTime = duration / steps;
    const currentVol = spotifyVolume;
    const volDelta = (targetVolume - currentVol) / steps;

    let step = 0;
    const interval = setInterval(() => {
      spotifyVolume += volDelta;
      spotifyCtrl.setVolume(spotifyVolume);

      if (++step >= steps) {
        clearInterval(interval);
        resolve();
      }
    }, stepTime);
  });
}
```

**Result:** DJ talks over music, music continues = Real radio! ✅

---

### Option 2: Pause with Resume (Simpler but less realistic)

```javascript
function triggerDJBreak() {
  // 1. Pause Spotify
  if (spotifyCtrl) spotifyCtrl.pause();

  // 2. Play DJ break
  speakDJBreak(text);
}

function closeBreakPanel() {
  // 3. RESUME Spotify (this is currently missing!)
  if (spotifyCtrl) spotifyCtrl.resume();

  // 4. Restore display
  restoreLastHeard();
  showPanel('normal');
  startEQ();
  // NO track skip!
}
```

**Result:** Music pauses during DJ, resumes after = Basic radio ✓

---

## Implementation Priority

### Phase 1: Quick Fix (5 minutes)
Just add `spotifyCtrl.resume()` to `closeBreakPanel()`
- Fixes the main issue (music continues)
- Simple one-line change
- Immediately better experience

### Phase 2: Volume Ducking (30 minutes)
Implement full volume ducking system
- Most realistic radio experience
- DJ talks "over" music
- Professional sound
- Requires testing Spotify Embed API volume control

---

## Code Changes Needed

### File: `public/app.js`

**Change 1: Fix closeBreakPanel() - Line 376**
```javascript
// CURRENT (BROKEN):
function closeBreakPanel() {
  if (!isOn) return;
  restoreLastHeard();
  showPanel('normal');
  startEQ();

  // ❌ No Spotify resume!
  if (musicPlayer.playlist.length > 0) {
    musicPlayer.playNext(); // Wrong - this is for local files only
  }
}

// FIXED:
function closeBreakPanel() {
  if (!isOn) return;

  // ✅ Resume Spotify playback
  if (spotifyCtrl) {
    spotifyCtrl.resume();
  }

  restoreLastHeard();
  showPanel('normal');
  startEQ();
}
```

**Change 2: Improve triggerDJBreak() - Line 402**
```javascript
// CURRENT:
function triggerDJBreak() {
  const text = getRandomBreak();
  djBreakContent.textContent = text;
  showPanel('djbreak');
  onAirDot.classList.add('active');
  stopEQ();
  speakDJBreak(text);
}

// IMPROVED (with fade):
async function triggerDJBreak() {
  const text = getRandomBreak();

  // Fade Spotify volume down before speaking
  if (spotifyCtrl) {
    await fadeSpotifyVolume(0.2); // Duck to 20%
  }

  djBreakContent.textContent = text;
  showPanel('djbreak');
  onAirDot.classList.add('active');
  stopEQ();

  await speakDJBreak(text);

  // Fade volume back up after speaking
  if (spotifyCtrl) {
    await fadeSpotifyVolume(1.0); // Back to 100%
  }
}
```

**Change 3: Add volume control helper**
```javascript
// NEW FUNCTION:
function fadeSpotifyVolume(targetVolume) {
  return new Promise(async (resolve) => {
    if (!spotifyCtrl) return resolve();

    try {
      // Check if Spotify Embed API supports volume control
      if (typeof spotifyCtrl.setVolume === 'function') {
        // Smooth fade over 1.5 seconds
        const duration = 1500;
        const steps = 15;
        const stepTime = duration / steps;

        const currentVolume = await spotifyCtrl.getVolume() || 1.0;
        const volumeDelta = (targetVolume - currentVolume) / steps;

        for (let i = 0; i < steps; i++) {
          const newVolume = currentVolume + (volumeDelta * (i + 1));
          await spotifyCtrl.setVolume(newVolume);
          await sleep(stepTime);
        }
      }
      resolve();
    } catch (e) {
      console.warn('Volume control not supported, using pause/resume fallback');
      resolve();
    }
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## Testing Steps

1. **Test Quick Fix:**
   - Power on radio
   - Wait for DJ break
   - Verify music resumes after break (not skip to next song)

2. **Test Volume Ducking:**
   - Power on radio
   - Wait for DJ break
   - Listen: Music should get quieter but keep playing
   - DJ speaks
   - Music should get louder again
   - Verify smooth transitions

3. **Test Edge Cases:**
   - Multiple DJ breaks in a row
   - Power off during DJ break
   - Volume control during DJ break

---

## Spotify Embed API Limitations

**Note:** Spotify Embed API might not support volume control. If not:
- **Fallback:** Use pause/resume (Phase 1 fix)
- **Alternative:** Use Web Audio API to duck the iframe audio
- **Workaround:** Mix DJ audio at higher volume while music continues

---

## Real Radio Station Techniques

### 1. Soft Segue
DJ talks as song fades out, new song fades in underneath

### 2. Talk-Up
DJ talks over song intro, stops right when vocals start

### 3. Cold Open
DJ starts talking immediately, music underneath

### 4. Post
DJ talks as song ends, music continues at low volume

**Your radio can do #3 (Cold Open) with volume ducking!**

---

## Recommended Approach

**Start Simple → Add Polish**

1. ✅ Phase 1: Add `spotifyCtrl.resume()` (1 minute fix)
2. ✅ Test with real listening
3. ✅ Phase 2: Add volume ducking if supported
4. ✅ Fall back to pause/resume if volume not available

This gives you:
- Immediate improvement (music doesn't stop)
- Professional polish (volume ducking)
- Graceful degradation (fallback to pause)

---

**Want me to implement Phase 1 (quick fix) right now?**
