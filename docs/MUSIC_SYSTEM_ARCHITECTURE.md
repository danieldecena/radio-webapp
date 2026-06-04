# 🎵 Music System Architecture - 96.6 ROM Radio

## Overview

Your radio uses a **hybrid music system** that combines Spotify streaming with AI-powered DJ breaks, all processed through FM radio effects to sound authentic.

---

## 🎼 Audio Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER PRESSES POWER                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SCANNING ANIMATION (2-3 sec)                   │
│  • Shows tuning needle sweeping across FM dial                  │
│  • Plays static noise effect                                    │
│  • Simulates finding the station                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              CHECK: Are we tuning in mid-DJ-break?              │
└────────┬────────────────────────────────────────┬───────────────┘
         │                                        │
    YES (Live)                                NO (Start Music)
         │                                        │
         ▼                                        ▼
┌────────────────────┐                  ┌────────────────────┐
│  INSTANT DJ BREAK  │                  │  START SPOTIFY     │
│  Play appropriate  │                  │  • Random track    │
│  portion of break  │                  │  • Mid-song (20-80%)
└────────────────────┘                  │  • Shuffle mode    │
                                        └──────────┬─────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                          MUSIC PLAYING                           │
│                                                                  │
│  ┌──────────────┐      ┌────────────────┐     ┌─────────────┐  │
│  │   SPOTIFY    │ ───▶ │   FM RADIO     │ ──▶ │   SPEAKERS  │  │
│  │  Embed API   │      │    EFFECTS     │     │   OUTPUT    │  │
│  └──────────────┘      └────────────────┘     └─────────────┘  │
│                                                                  │
│  FM Effects Chain:                                              │
│  1. High-pass filter (80Hz) - Remove muddy bass                │
│  2. Low-pass filter (12kHz) - Remove harsh highs               │
│  3. Compressor (4:1 ratio) - "Radio loudness"                  │
│  4. Waveshaper - Subtle analog warmth                          │
│                                                                  │
│  Display: Song title & artist (from Spotify metadata)          │
│  Visual: EQ bars animated (120ms refresh)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Time passes...
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DJ BREAK TRIGGER (Scheduled)                  │
│                                                                  │
│  Quick IDs:  Every 2.5 minutes (10-20 sec)                     │
│  Full Breaks: Every 7 minutes (30-60 sec)                      │
│                                                                  │
│  Categories (weighted random):                                  │
│  • Shoutouts (40%) - "Hey Pauline!"                            │
│  • Weather (15%) - "Sunny day in Victoria"                     │
│  • Traffic (15%) - "Traffic's smooth"                          │
│  • News (10%) - "Local news"                                   │
│  • Commercials (20%) - Funny fake ads                          │
│  • Special Dates (70% on birthdays/anniversaries)              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PAUSE SPOTIFY PLAYBACK                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DJ VOICE SYNTHESIS (3 tiers)                  │
│                                                                  │
│  Tier 0: LOCAL PRE-GENERATED AUDIO (Zero Cost) ✨               │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ 1. Check manifest.json for pre-generated snippet     │       │
│  │ 2. Load MP3 from /audio/snippets/                   │       │
│  │ 3. Play through FM effects chain                     │       │
│  │ Cost: $0 (already generated)                         │       │
│  └──────────────────────────────────────────────────────┘       │
│                         ⬇ (If not found)                         │
│                                                                  │
│  Tier 1: ELEVENLABS API (Premium Quality) 🎙️                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ 1. Send text to serverless function                  │       │
│  │    /.netlify/functions/speak OR /api/speak          │       │
│  │ 2. Function calls ElevenLabs with API key (secure)   │       │
│  │ 3. Returns base64-encoded MP3                        │       │
│  │ 4. Decode and play through FM effects                │       │
│  │ Cost: ~150 characters per break                      │       │
│  └──────────────────────────────────────────────────────┘       │
│                         ⬇ (If API fails)                         │
│                                                                  │
│  Tier 2: WEB SPEECH API (Browser Built-in) 🤖                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ 1. Use browser's speechSynthesis API                 │       │
│  │ 2. Select best voice (Samantha, Google US English)   │       │
│  │ 3. Speak at 0.95x rate for radio feel               │       │
│  │ Cost: Free, unlimited, but robotic voice             │       │
│  └──────────────────────────────────────────────────────┘       │
│                         ⬇ (If speech fails)                      │
│                                                                  │
│  Tier 3: TEXT ONLY (Fallback) 📝                                │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ 1. Display text on screen for 9 seconds              │       │
│  │ 2. No audio, just visual                             │       │
│  │ Cost: Free, always works                             │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
│  DJ Voice Processing:                                           │
│  • Fade in: 0.6 seconds                                         │
│  • Fade out: 1.4 seconds (or 15% of duration)                   │
│  • Routed through same FM effects as music                      │
│  • Display: "DJ BREAK" panel with text                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DJ BREAK FINISHES                          │
│  • Restore song title/artist display                            │
│  • Switch back to normal panel                                  │
│  • Resume EQ animation                                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RESUME SPOTIFY PLAYBACK                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Loop continues...
                             │
                             └──────────┐
                                        │
                             Back to "MUSIC PLAYING"
```

---

## 🔧 Technical Components

### 1. **Spotify Integration** (`public/index.html:36-58`)

```javascript
// Embedded Spotify player (hidden iframe)
<iframe id="spotifyEmbed" src="" allow="autoplay..." />

// Spotify Embed API loaded
window.onSpotifyIframeApiReady = (IFrameAPI) => {
  const options = {
    uri: 'spotify:playlist:45dvmYti7Kn9EDRzc31hS4',
    height: 1  // Hidden, audio only
  };
  IFrameAPI.createController(el, options, callback);
}
```

**Features:**
- Playlist: Your personal Spotify playlist
- Shuffle: Fisher-Yates algorithm simulates random play
- Mid-song start: Seeks to 20-80% of song (radio feel)
- Metadata: Displays current song title & artist

---

### 2. **FM Radio Effects Chain** (`app.js:66-107`)

```
Audio Input → High Pass (80Hz) → Low Pass (12kHz) → Compressor → Waveshaper → Output
              ↓                   ↓                  ↓             ↓
              Remove muddy        Remove harsh       Radio         Analog
              bass                highs              loudness      warmth
```

**Parameters:**
- **High-pass filter**: 80Hz cutoff, Q=0.7
- **Low-pass filter**: 12kHz cutoff, Q=0.7
- **Compressor**: -24dB threshold, 4:1 ratio, 3ms attack, 250ms release
- **Waveshaper**: Subtle tape saturation (tanh curve)

**Result:** Music and DJ breaks sound like they're coming from an FM radio station!

---

### 3. **DJ Break Scheduler** (`app.js:428-461`)

```javascript
// Full DJ breaks every 7 minutes (420 seconds)
const fullBreakCycle = 7 * 60;
breakTimeout = setTimeout(() => {
  triggerDJBreak();
  breakInterval = setInterval(triggerDJBreak, fullBreakCycle * 1000);
}, secsUntilFullBreak * 1000);

// Quick station IDs every 2.5 minutes (150 seconds)
const quickIDCycle = 2.5 * 60;
const offset = 90; // Offset to avoid overlap with full breaks
quickIDTimeout = setTimeout(() => {
  triggerQuickID();
  quickIDInterval = setInterval(triggerQuickID, quickIDCycle * 1000);
}, secsUntilQuickID * 1000);
```

**Timing:**
- **Quick IDs**: Every 2.5 min, 10-20 sec long ("96.6 ROM, playing hits for Pauline")
- **Full Breaks**: Every 7 min, 30-60 sec long (shoutouts, weather, commercials)
- **Offset**: 90 seconds between quick IDs and full breaks (no overlap)

---

### 4. **Live Broadcast Feel** (`app.js:464-488`)

When you power on the radio, it checks the current time to see if you're "tuning in" during a live DJ break:

```javascript
function checkLiveDJBreak() {
  const secsIntoHour = now.getMinutes() * 60 + now.getSeconds();

  // Check if within first 45 seconds of 7-minute cycle (full break)
  if (secsIntoFullCycle < 45) {
    return { type: 'full', secsInto: secsIntoFullCycle };
  }

  // Check if within first 20 seconds of 2.5-minute cycle (quick ID)
  if (secsIntoQuickCycle < 20) {
    return { type: 'quick', secsInto: secsIntoQuickCycle };
  }
}
```

**Result:** Sometimes you power on and catch a DJ break in progress, just like real radio!

---

### 5. **Three-Tier TTS System** (`app.js:254-370`)

#### **Tier 0: Pre-generated Audio (Fastest, Zero Cost)** ✨

```javascript
// Load manifest of pre-generated snippets
snippetManifest = {
  "Hey Pauline!": "audio/snippets/hey_pauline_.mp3",
  "96.6 ROM, playing hits for you": "audio/snippets/96.6_rom__yours_.mp3",
  // ... 37 total snippets
}

// Play local audio if available
if (snippetManifest[text]) {
  const audio = new Audio(snippetManifest[text]);
  audio.play(); // Through FM effects
}
```

**Advantages:**
- Instant playback (no API call)
- Zero cost per play
- Consistent voice quality
- Works offline

**Current State:** You have **37 pre-generated snippets** (744KB total)

---

#### **Tier 1: ElevenLabs API (Premium Quality)** 🎙️

```javascript
// Send text to secure serverless function
const response = await fetch('/.netlify/functions/speak', {
  method: 'POST',
  body: JSON.stringify({ text })
});

// Serverless function calls ElevenLabs
exports.handler = async (event) => {
  const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY; // Secure!
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    headers: { 'xi-api-key': ELEVEN_KEY }
  });
  return { audio: audioBase64 };
};
```

**Advantages:**
- Natural, human-like voice
- Secure (API key never exposed to browser)
- High quality

**Cost:** ~150 characters per break, 10k free/month

---

#### **Tier 2: Web Speech API (Browser Fallback)** 🤖

```javascript
const utter = new SpeechSynthesisUtterance(text);
utter.rate = 0.95;
utter.voice = voices.find(v => v.name.includes('Samantha'));
window.speechSynthesis.speak(utter);
```

**Advantages:**
- Free and unlimited
- Built into browser
- Always available

**Disadvantages:**
- Robotic voice
- Less natural

---

#### **Tier 3: Text Only (Last Resort)** 📝

```javascript
// Just show text on screen for 9 seconds
setTimeout(() => closeBreakPanel(), 9000);
```

---

## 📊 Data Flow Summary

```
USER ACTION
    ↓
POWER BUTTON
    ↓
┌─────────────────────┐
│  AUDIO CONTEXT      │  ← Initialize Web Audio API
│  (iOS unlock)       │
└──────────┬──────────┘
           │
           ├─────────────────────────────┐
           ↓                             ↓
┌──────────────────┐          ┌──────────────────┐
│ FM EFFECTS CHAIN │          │ SPOTIFY IFRAME   │
│ - Filters        │          │ - Load playlist  │
│ - Compressor     │          │ - Shuffle tracks │
│ - Waveshaper     │          │ - Random seek    │
└──────────────────┘          └──────────────────┘
           │                             │
           │                             ↓
           │                   ┌──────────────────┐
           │                   │ MUSIC METADATA   │
           │                   │ - Song title     │
           │                   │ - Artist name    │
           │                   └──────────────────┘
           │
           ├──────────────┐
           ↓              ↓
┌─────────────────┐   ┌─────────────────┐
│ SPOTIFY AUDIO   │   │ DJ BREAK AUDIO  │
│ (every 3-5 min) │   │ (every 2.5-7min)│
└─────────────────┘   └─────────────────┘
           │              │
           └──────┬───────┘
                  ↓
          ┌─────────────┐
          │   SPEAKERS  │
          └─────────────┘
```

---

## 🎯 Key Features

### **1. Authentic Radio Feel**
- FM effects make it sound like real radio
- Mid-song starts (tuning in randomly)
- Live DJ break timing simulation
- Scheduled interruptions

### **2. Smart TTS Fallback**
- Pre-generated audio first (instant, free)
- ElevenLabs API second (premium quality)
- Web Speech third (always works)
- Text display last resort (never fails)

### **3. Efficient API Usage**
- 37 most common phrases pre-generated
- Dynamic content uses API
- Estimated usage: ~2,000 chars/day with casual listening
- Well within 10k free tier

### **4. Progressive Web App**
- Install on phone home screen
- Works offline (cached assets)
- Background audio support
- Native app feel

---

## 🔊 Audio Processing Details

### **Spotify Audio Path:**
```
Spotify Embed → Volume Control → FM Effects → Output
```

### **DJ Break Audio Path (Local):**
```
MP3 File → MediaElement → AudioContext → FM Effects → Output
```

### **DJ Break Audio Path (API):**
```
Text → Serverless Function → ElevenLabs → Base64 MP3 →
AudioBuffer → BufferSource → Gain (fade) → FM Effects → Output
```

### **Fade Envelope:**
```
Volume
  1.0 |     ____________
      |    /            \
      |   /              \
      |  /                \___
  0.0 |_/
      0  0.6s         -1.4s  Duration
         ↑                ↑
      Fade In         Fade Out
```

---

## 💾 File Structure

```
96.6-rom-radio/
├── public/
│   ├── index.html          # Spotify embed, UI structure
│   ├── app.js              # Main audio engine (this file!)
│   ├── breaks.js           # DJ break content & categories
│   ├── style.css           # Retro radio styling
│   ├── sw.js               # Service worker (PWA)
│   └── audio/
│       └── snippets/       # Pre-generated MP3s
│           ├── manifest.json           # File mapping
│           ├── hey_pauline_.mp3
│           ├── 96.6_rom__yours_.mp3
│           └── ... (37 total)
│
├── netlify/functions/
│   └── speak.js            # Secure TTS proxy (Netlify)
│
└── api/
    └── speak.js            # Secure TTS proxy (Vercel)
```

---

## 🎨 Visual Components

### **Display Modes:**

1. **Normal Mode** (Music Playing)
   - Song title & artist
   - Live indicator (pulsing dot)
   - Clock (updates every second)
   - EQ visualizer (20 bars, 120ms refresh)

2. **Scanning Mode** (Power On)
   - "SCANNING" label
   - Tuner needle animation (88-104 FM)
   - "Searching for signal..." text
   - 2-3 second duration

3. **DJ Break Mode**
   - "DJ BREAK" label
   - DJ message text (centered)
   - ON AIR indicator (red dot)
   - EQ stops, fades to static bars

---

## 🚀 Performance Optimizations

1. **Pre-generated Audio**: 37 snippets eliminate most API calls
2. **Lazy Loading**: Spotify embed loads on interaction
3. **Efficient Scheduling**: Single timer for all breaks
4. **Audio Context Reuse**: One context for all audio
5. **Smart Caching**: Service worker caches all assets

---

## 📈 Usage Estimates

**Casual Listening (2 hours/day):**
- Pre-generated snippets: 80% of breaks = $0
- API calls: 20% of breaks = ~500 chars/day
- Monthly: ~15,000 chars = Within free tier ✅

**Heavy Listening (8 hours/day):**
- Pre-generated snippets: 80% of breaks = $0
- API calls: 20% of breaks = ~2,000 chars/day
- Monthly: ~60,000 chars = $5/month (paid tier needed)

---

## 🎯 Summary

Your radio is a sophisticated audio system that:
- ✅ Streams Spotify playlists seamlessly
- ✅ Processes all audio through authentic FM effects
- ✅ Interrupts with AI-powered DJ breaks (3-tier fallback)
- ✅ Uses pre-generated audio to minimize costs
- ✅ Simulates live radio timing and feel
- ✅ Works offline as a PWA

**It's not just a music player - it's a personalized radio station!** 📻💜
