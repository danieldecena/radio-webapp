// ==============================================
// 96.6 ROM — APP
// ==============================================

import {
  STATION_CONFIG,
  DJ_BREAKS,
  STATION_TAGLINES,
  SPECIAL_DATES,
  getRandomBreak,
  getWeightedCategory,
} from "./breaks.js";

// --- Configuration ---
// Change this to the exact name of your Apple Personal Voice (or leave "Personal" to match any personal voice)
const APPLE_PERSONAL_VOICE_NAME = "Daniel";

// --- Serverless TTS Config ---
// API key is now secure on the server side
// Works with both Netlify and Vercel
const TTS_ENDPOINT = window.location.hostname.includes("netlify")
  ? "/.netlify/functions/speak"
  : "/api/speak";

// --- Elements (Global Scope) ---
let powerBtn, volBtn, loadBtn, shuffleBtn, clockEl, djBooth, volumeSlider, volumeContainer, volValue;
let presetBtns, tunerBar, onAirDot, onAirEl, freqDisplay, signalBars;
let songTitle, songArtist, liveDot, liveText, displayClock, eqBars;
let displayNormal, displayScanning, displayDJBreak, tunerNeedle, scanningText;
let djBreakContent, trackProgress, trackProgressBar;

function initElements() {
  powerBtn = document.getElementById("powerBtn");
  volBtn = document.getElementById("volBtn");
  loadBtn = document.getElementById("loadBtn");
  shuffleBtn = document.getElementById("shuffleBtn");
  clockEl = document.getElementById("clock");
  djBooth = document.getElementById("djBooth");
  volumeSlider = document.getElementById("volumeSlider");
  volumeContainer = document.getElementById("volumeContainer");
  volValue = document.getElementById("volValue");
  presetBtns = document.querySelectorAll(".preset-btn");
  tunerBar = document.querySelector(".tuner-bar");
  onAirDot = document.getElementById("onAirDot");
  onAirEl = document.getElementById("onAirEl");
  freqDisplay = document.getElementById("freqDisplay");
  signalBars = document.getElementById("signalBars");
  songTitle = document.getElementById("songTitle");
  songArtist = document.getElementById("songArtist");
  liveDot = document.getElementById("liveDot");
  liveText = document.getElementById("liveText");
  displayClock = document.getElementById("displayClock");
  eqBars = document.querySelectorAll(".eq-bar");
  displayNormal = document.getElementById("displayNormal");
  displayScanning = document.getElementById("displayScanning");
  displayDJBreak = document.getElementById("displayDJBreak");
  tunerNeedle = document.getElementById("tunerNeedle");
  scanningText = document.getElementById("scanningText");
  djBreakContent = document.getElementById("djBreakContent");
  trackProgress = document.getElementById("trackProgress");
  trackProgressBar = document.getElementById("trackProgressBar");
  console.log("🛠️ UI Elements Bound.");
}

// --- State ---
let isOn = false;
let isScanning = false;
let volVisible = false;
let eqInterval = null;
let clockInterval = null;
let breakInterval = null;
let breakTimeout = null;
let progressInterval = null;
let audioCtx = null;
let currentSource = null;
let taglineTimer = null;
let taglineIdx = 0;
let lastSong = { title: "", artist: "" };

// Station continuity - simulate station keeps broadcasting when powered off
let lastPowerOffTime = null;
let lastSongIndex = -1;
let lastSongPosition = 0;

// --- FM Radio Effects Chain ---
let fmFilter = null;
let fmCompressor = null;
let fmWaveshaper = null;
let fmOutputGain = null;
let fmAnalyser = null;
let eqDataArray = null;
let djFilter = null; // Voice of God EQ

// --- Initialize FM Radio Effects ---
function initFMEffects() {
  if (!audioCtx)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();

  // 1. Bandpass Filter (80Hz - 12kHz) - Classic FM radio frequency response
  const lowpass = audioCtx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 12000; // Cut harsh highs
  lowpass.Q.value = 0.7;

  const highpass = audioCtx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 80; // Cut muddy bass
  highpass.Q.value = 0.7;

  // 2. Compressor - Radio "loudness"
  fmCompressor = audioCtx.createDynamicsCompressor();
  fmCompressor.threshold.value = -24; // Start compressing at -24dB
  fmCompressor.knee.value = 10; // Smooth compression curve
  fmCompressor.ratio.value = 4; // 4:1 compression ratio
  fmCompressor.attack.value = 0.003; // Fast attack (3ms)
  fmCompressor.release.value = 0.25; // Quick release (250ms)

  // 3. Waveshaper - Subtle warmth/saturation
  fmWaveshaper = audioCtx.createWaveShaper();
  fmWaveshaper.curve = makeWarmthCurve(200); // Subtle tape-like saturation
  fmWaveshaper.oversample = "2x";

  // 4. Output gain for overall volume control
  fmOutputGain = audioCtx.createGain();
  fmOutputGain.gain.value = 1.0;

  // 5. Analyser for dynamic EQ visualizer
  fmAnalyser = audioCtx.createAnalyser();
  fmAnalyser.fftSize = 64; // Yields 32 frequency bins
  fmAnalyser.smoothingTimeConstant = 0.8; // Smooth bar falls
  eqDataArray = new Uint8Array(fmAnalyser.frequencyBinCount);

  // Connect the chain: highpass → lowpass → compressor → waveshaper → output gain → analyser → destination
  highpass.connect(lowpass);
  lowpass.connect(fmCompressor);
  fmCompressor.connect(fmWaveshaper);
  fmWaveshaper.connect(fmOutputGain);
  fmOutputGain.connect(fmAnalyser);
  fmAnalyser.connect(audioCtx.destination);

  // Store the filter for later use
  fmFilter = highpass;

  // --- Initialize DJ Voice of God Effects ---
  const djLowShelf = audioCtx.createBiquadFilter();
  djLowShelf.type = "lowshelf";
  djLowShelf.frequency.value = 150; // Boost deep announcer bass
  djLowShelf.gain.value = 4.0; // +4dB

  const djHighShelf = audioCtx.createBiquadFilter();
  djHighShelf.type = "highshelf";
  djHighShelf.frequency.value = 4000; // Crisp highs
  djHighShelf.gain.value = 2.0; // +2dB

  const djCompressor = audioCtx.createDynamicsCompressor();
  djCompressor.threshold.value = -30;
  djCompressor.knee.value = 5;
  djCompressor.ratio.value = 6;
  djCompressor.attack.value = 0.005;
  djCompressor.release.value = 0.1;

  djLowShelf.connect(djHighShelf);
  djHighShelf.connect(djCompressor);
  djCompressor.connect(fmFilter); // Pass into FM effects after DJ EQ

  djFilter = djLowShelf;
}

// Create subtle warmth curve for analog tape-like saturation
function makeWarmthCurve(amount) {
  const samples = 44100;
  const curve = new Float32Array(samples);
  const deg = Math.PI / 180;
  const intensity = amount / 100;

  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    // Soft clipping with subtle harmonic distortion
    curve[i] = (Math.tanh(x * intensity) / Math.tanh(intensity)) * 0.95;
  }
  return curve;
}

// --- Clock ---
function updateClock() {
  const now = new Date();
  const h = now.getHours() % 12 || 12;
  const m = String(now.getMinutes()).padStart(2, "0");
  const ampm = now.getHours() >= 12 ? "PM" : "AM";
  displayClock.textContent = `${h}:${m} ${ampm}`;
}

// --- EQ Visualizer ---
let eqAnimFrame = null;

function animateEQFrame() {
  if (fmAnalyser && eqDataArray) {
    fmAnalyser.getByteFrequencyData(eqDataArray);

    eqBars.forEach((bar, i) => {
      // Map the 20 UI bars to the 32 frequency bins available
      const binIndex = Math.floor(i * 1.5);
      const value = eqDataArray[binIndex] || 0;

      // Map 0-255 scale to percentage (min 5%, max 100%)
      const heightPercent = Math.max(5, (value / 255) * 100);

      bar.style.height = heightPercent + "%";
      bar.style.opacity = value > 40 ? "0.9" : "0.4";
    });
  } else {
    // Fallback if audio context isn't fully ready
    eqBars.forEach((bar) => {
      bar.style.height = "5%";
      bar.style.opacity = "0.3";
    });
  }
  eqAnimFrame = requestAnimationFrame(animateEQFrame);
}

function startEQ() {
  stopEQ();
  animateEQFrame();
}

function stopEQ() {
  if (eqAnimFrame) cancelAnimationFrame(eqAnimFrame);
  eqBars.forEach((bar) => {
    bar.style.height = "4px";
    bar.style.opacity = "0.2";
  });
}

// --- Track Progress Bar ---
function startProgressUpdates() {
  stopProgressUpdates();
  trackProgress.classList.add("visible");

  function updateProgress() {
    if (musicPlayer.audio && !musicPlayer.audio.paused && musicPlayer.audio.duration) {
      const progress = (musicPlayer.audio.currentTime / musicPlayer.audio.duration) * 100;
      trackProgressBar.style.width = `${progress}%`;
    }
  }

  updateProgress(); // Update immediately
  progressInterval = setInterval(updateProgress, 1000); // Then every second
}

function stopProgressUpdates() {
  clearInterval(progressInterval);
  trackProgress.classList.remove("visible");
  trackProgressBar.style.width = "0%";
}

// --- Display Panels ---
function showPanel(panel) {
  displayNormal.style.display = panel === "normal" ? "block" : "none";
  displayScanning.style.display = panel === "scanning" ? "block" : "none";
  displayDJBreak.style.display = panel === "djbreak" ? "block" : "none";
}

// --- Rotating Taglines ---
function startTaglineRotation() {
  stopTaglineRotation();
  taglineIdx = 0;
  songTitle.textContent = "96.6 ROM";
  songArtist.textContent = STATION_TAGLINES[0];
  taglineTimer = setInterval(() => {
    if (lastSong.title) {
      stopTaglineRotation();
      return;
    }
    taglineIdx = (taglineIdx + 1) % STATION_TAGLINES.length;
    songArtist.textContent = STATION_TAGLINES[taglineIdx];
  }, 4000);
}

function stopTaglineRotation() {
  clearInterval(taglineTimer);
  taglineTimer = null;
}

// --- Last Heard restore ---
function restoreLastHeard() {
  if (lastSong.title) {
    songTitle.textContent = lastSong.title;
    songArtist.textContent = lastSong.artist;
  } else {
    startTaglineRotation();
  }
}

// --- ElevenLabs TTS with fallbacks ---
// --- Snippet Manifest (Local Audio) ---
let snippetManifest = {};

async function loadSnippetManifest() {
  try {
    const res = await fetch("audio/snippets/manifest.json");
    if (res.ok) {
      snippetManifest = await res.json();
      console.log(
        "Loaded snippet manifest:",
        Object.keys(snippetManifest).length,
        "items",
      );
    }
  } catch (e) {
    console.warn("Could not load snippet manifest (using API only)");
  }
}
loadSnippetManifest();

// --- Auto-load local music playlist ---
async function loadLocalPlaylist() {
  // Disable power button while loading
  powerBtn.disabled = true;
  powerBtn.style.opacity = "0.5";
  powerBtn.style.cursor = "not-allowed";

  // Show loading state
  songTitle.textContent = "LOADING PLAYLIST...";
  songArtist.textContent = "PLEASE WAIT";

  try {
    const res = await fetch("music/playlist.json");

    if (!res.ok) {
      throw new Error(`Playlist not found (HTTP ${res.status})`);
    }

    const data = await res.json();

    if (!data.tracks || data.tracks.length === 0) {
      throw new Error("Playlist is empty");
    }

    // Build URL-based playlist entries
    const tracks = data.tracks.map((t) => ({
      url: t.file.startsWith("http")
        ? t.file
        : "music/" + encodeURIComponent(t.file),
      title: t.title,
      artist: t.artist,
    }));

    musicPlayer.loadURLTracks(tracks);
    console.log(
      `📻 Auto-loaded ${tracks.length} local tracks from playlist.json`,
    );

    // Enable power button and show ready state
    powerBtn.disabled = false;
    powerBtn.style.opacity = "";
    powerBtn.style.cursor = "";
    songTitle.textContent = "96.6 ROM";
    songArtist.textContent = "PLAYING THE HITS, DEDICATED TO YOU";
  } catch (e) {
    console.error("Failed to load playlist:", e);

    // Show error state
    songTitle.textContent = "PLAYLIST ERROR";
    songArtist.textContent = "USE LOAD MUSIC BUTTON BELOW";

    // Keep power button disabled but allow manual music loading
    powerBtn.disabled = true;
    powerBtn.style.opacity = "0.3";
  }
}

// --- ElevenLabs TTS with fallbacks ---
async function speakDJBreak(text) {
  if (djBooth) djBooth.classList.add("active");
  
  // Tier 0: Pre-generated Local Audio (Zero Cost)
  if (snippetManifest[text]) {
    try {
      console.log("Playing local snippet:", text);
      const audio = new Audio(snippetManifest[text]);

      const source = audioCtx.createMediaElementSource(audio);
      const gain = audioCtx.createGain();

      // Connect to FM chain with Voice of God EQ
      source.connect(gain);
      if (djFilter) {
        gain.connect(djFilter);
      } else if (fmFilter) {
        gain.connect(fmFilter);
      } else {
        gain.connect(audioCtx.destination);
      }

      audio.onended = () => {
        closeBreakPanel();
      };
      audio.play();
      return;
    } catch (e) {
      console.warn("Local snippet failed, falling back to API", e);
    }
  }

  // Voice Mixing Logic: 50% chance to skip ElevenLabs and use Apple Personal Voice (Web Speech API)
  const useAppleVoice = Math.random() < 0.5;

  if (!useAppleVoice) {
    // Tier 1: ElevenLabs via secure serverless function
    try {
      const response = await fetch(TTS_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const data = await response.json();

      // Convert base64 audio to ArrayBuffer
      const binaryString = atob(data.audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      if (!audioCtx)
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") await audioCtx.resume();

      // FM effects are already initialized in powerOn(), but safety check:
      if (!fmFilter) initFMEffects();

      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const duration = audioBuffer.duration;

      if (currentSource) {
        try {
          currentSource.stop();
        } catch (e) {}
        currentSource = null;
      }

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      // Create DJ voice gain node
      const gain = audioCtx.createGain();

      // DJ Voice Envelope
      // Use very fast fade-in/out to prevent clipping the actual spoken words
      const fadeInDuration = 0.1;
      const fadeOutDuration = 0.4;

      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(
        1.0,
        audioCtx.currentTime + fadeInDuration,
      );

      if (duration > fadeInDuration + fadeOutDuration) {
        gain.gain.setValueAtTime(
          1.0,
          audioCtx.currentTime + duration - fadeOutDuration,
        );
        gain.gain.linearRampToValueAtTime(
          0.01,
          audioCtx.currentTime + duration,
        );
      }
      // Route through DJ Voice of God effects, then FM radio
      source.connect(gain);
      gain.connect(djFilter ? djFilter : fmFilter);
      source.start(0);
      currentSource = source;
      source.onended = () => {
        currentSource = null;
        closeBreakPanel();
      };
      return;
    }

    console.warn("ElevenLabs unavailable:", response.status);
  } catch (err) {
    console.warn("ElevenLabs failed:", err);
  }
  } // end if (!useAppleVoice)

  // Tier 2: Web Speech API (free, unlimited, built-in)
  if ("speechSynthesis" in window) {
    try {
      console.log("🎙️ Using Web Speech API for:", text);
      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.95;
      utter.pitch = 1.0;
      utter.volume = 1.0;

      // Get voices (might need to wait for them to load)
      let voices = window.speechSynthesis.getVoices();

      // If no voices yet, wait for them
      if (voices.length === 0) {
        console.log("⏳ Waiting for voices to load...");
        await new Promise((resolve) => {
          window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
            resolve();
          };
          // Timeout after 1 second
          setTimeout(resolve, 1000);
        });
      }

      const preferred = voices.find(
        (v) =>
          v.name.includes(APPLE_PERSONAL_VOICE_NAME) ||
          v.name.includes("Samantha") ||
          v.name.includes("Google US English") ||
          v.lang === "en-US",
      );
      if (preferred) {
        utter.voice = preferred;
        console.log("✅ Using voice:", preferred.name);
      } else {
        console.log("⚠️ Using default voice");
      }

      utter.onstart = () => console.log("🎙️ Speech started");
      utter.onend = () => {
        console.log("✅ Speech finished");
        closeBreakPanel();
      };
      utter.onerror = (e) => {
        console.error("❌ Speech error:", e.error);
        fallbackTextOnly();
      };

      window.speechSynthesis.speak(utter);
      console.log("📻 Speech queued");
      return;
    } catch (err) {
      console.warn("Web Speech failed:", err);
    }
  }

  // Tier 3: Text only — show for 9 seconds
  fallbackTextOnly();
}

function fallbackTextOnly() {
  setTimeout(() => closeBreakPanel(), 9000);
}

// --- Music Player Volume Ducking (for DJ breaks) ---
async function fadeMusicPlayerVolume(targetVolume, duration = 2500) {
  if (musicPlayer.playlist.length === 0 || musicPlayer.audio.paused) return;

  // Apple Music Style: Ultra-smooth, long exponential ducking (side-chaining effect)
  if (musicPlayer.gainNode && audioCtx) {
    try {
      const currentTime = audioCtx.currentTime;
      const durationSec = duration / 1000;

      musicPlayer.gainNode.gain.cancelScheduledValues(currentTime);
      const currentGain = musicPlayer.gainNode.gain.value;

      musicPlayer.gainNode.gain.setValueAtTime(currentGain, currentTime);

      const safeTarget = Math.max(0.02, targetVolume); // Don't go completely silent

      // Slower, more musical fade (Cosine/SCurve approximation via exponential)
      musicPlayer.gainNode.gain.exponentialRampToValueAtTime(
        safeTarget,
        currentTime + durationSec,
      );

      await sleep(duration);
    } catch (e) {
      console.warn("Gain node fade failed:", e);
    }
  }
}

async function restoreMusicPlayerVolume(duration = 3000) {
  if (musicPlayer.playlist.length === 0 || musicPlayer.audio.paused) return;

  if (musicPlayer.gainNode && audioCtx) {
    try {
      const currentTime = audioCtx.currentTime;
      const durationSec = duration / 1000;

      musicPlayer.gainNode.gain.cancelScheduledValues(currentTime);
      const currentGain = musicPlayer.gainNode.gain.value;

      musicPlayer.gainNode.gain.setValueAtTime(currentGain, currentTime);

      // Long, graceful fade back up to full volume
      musicPlayer.gainNode.gain.exponentialRampToValueAtTime(
        1.0,
        currentTime + durationSec,
      );
    } catch (e) {
      console.warn("Restore fade failed:", e);
    }
  }
}

async function closeBreakPanel() {
  if (!isOn) return;

  // If a song is currently ducked (e.g., Quick ID or Startup), bring its volume back up gracefully
  // 6 seconds for an incredibly epic Apple Music volume swell
  if (musicPlayer.gainNode && musicPlayer.gainNode.gain.value < 0.9) {
    restoreMusicPlayerVolume(6000);
  } else if (musicPlayer.playlist.length > 0 && musicPlayer.audio.paused) {
    // If stopped for a full break, start the next song with the Apple DJ Intro style
    musicPlayer.playNextWithDJIntro();
  }

  restoreLastHeard();
  showPanel("normal");
  onAirDot.classList.remove("active");
  onAirEl.classList.remove("active");
  if (djBooth) djBooth.classList.remove("active");
  startEQ();
}

// --- Quick Station ID (10-20 sec) ---
async function triggerQuickID() {
  const stationIDs = DJ_BREAKS.stationids;
  const text = stationIDs[Math.floor(Math.random() * stationIDs.length)];

  // Apple Style: Incredibly slow, subtle duck to ~35% volume.
  // We don't want to completely squash the song during a quick ID.
  await fadeMusicPlayerVolume(0.35, 2500);

  djBreakContent.textContent = text;
  showPanel("djbreak");
  onAirDot.classList.add("active");
  onAirEl.classList.add("active");
  stopEQ(); // Stop visually, but keep audio playing
  speakDJBreak(text);
}

// --- Full DJ Breaks (30-60 sec) ---
async function triggerDJBreak() {
  // Check special date first (70% chance when available)
  const now = new Date();
  const dateKey =
    String(now.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(now.getDate()).padStart(2, "0");
  let text;

  // Optional Context injection (The "Apple DJ" Up Next)
  let upcomingTrackContext = "";
  if (musicPlayer.playlist.length > 0) {
    const nextIdx =
      (musicPlayer.currentIndex + 1) % musicPlayer.playlist.length;
    const nextTrack = musicPlayer.playlist[nextIdx];
    upcomingTrackContext = ` Coming up next, we have ${nextTrack.title} by ${nextTrack.artist}.`;
  }

  if (SPECIAL_DATES[dateKey] && Math.random() < 0.7) {
    const pool = SPECIAL_DATES[dateKey];
    text = pool[Math.floor(Math.random() * pool.length)] + upcomingTrackContext;
  } else {
    // This preserves all the 200+ Pauline shoutouts/news/commercials
    const category = getWeightedCategory();
    text = getRandomBreak(category) + upcomingTrackContext;
  }

  // Apple Music Style Outro Fade:
  // Fade out music down to 15% (Music Bed) over 2.5 seconds before speaking
  await fadeMusicPlayerVolume(0.15, 2500);

  djBreakContent.textContent = text;
  showPanel("djbreak");
  onAirDot.classList.add("active");
  onAirEl.classList.add("active");
  if (djBooth) djBooth.classList.add("active");
  stopEQ();

  speakDJBreak(text);
}

// Store intervals for both types
let quickIDInterval = null;
let quickIDTimeout = null;

function scheduleDJBreaks() {
  clearInterval(breakInterval);
  clearTimeout(breakTimeout);
  clearInterval(quickIDInterval);
  clearTimeout(quickIDTimeout);

  const now = new Date();
  const secsIntoHour = now.getMinutes() * 60 + now.getSeconds();

  // Full DJ breaks every 7 minutes (420 seconds)
  const fullBreakCycle = 7 * 60;
  const secsUntilFullBreak = fullBreakCycle - (secsIntoHour % fullBreakCycle);

  breakTimeout = setTimeout(() => {
    if (isOn) triggerDJBreak();
    breakInterval = setInterval(() => {
      if (isOn) triggerDJBreak();
    }, fullBreakCycle * 1000);
  }, secsUntilFullBreak * 1000);

  // Quick station IDs every 2.5 minutes (150 seconds)
  // Offset by 90 seconds so they don't overlap with full breaks
  const quickIDCycle = 2.5 * 60;
  const offset = 90; // Start 90 seconds after full break
  let secsUntilQuickID = quickIDCycle - (secsIntoHour % quickIDCycle) + offset;

  // Make sure first quick ID doesn't conflict with upcoming full break
  if (secsUntilQuickID > secsUntilFullBreak - 30) {
    secsUntilQuickID += quickIDCycle;
  }

  quickIDTimeout = setTimeout(() => {
    if (isOn) triggerQuickID();
    quickIDInterval = setInterval(() => {
      if (isOn) triggerQuickID();
    }, quickIDCycle * 1000);
  }, secsUntilQuickID * 1000);
}

// --- Check if we're "tuning in" during a live DJ break ---
function checkLiveDJBreak() {
  const now = new Date();
  const secsIntoHour = now.getMinutes() * 60 + now.getSeconds();

  // Full breaks every 7 minutes (420 seconds)
  const fullBreakCycle = 7 * 60;
  const secsIntoFullCycle = secsIntoHour % fullBreakCycle;

  // Quick IDs every 2.5 minutes (150 seconds), offset by 90 seconds
  const quickIDCycle = 2.5 * 60;
  const quickIDOffset = 90;
  const secsIntoQuickCycle = (secsIntoHour - quickIDOffset) % quickIDCycle;

  // If within first 45 seconds of full break cycle
  if (secsIntoFullCycle < 45) {
    return { type: "full", secsInto: secsIntoFullCycle };
  }

  // If within first 20 seconds of quick ID cycle (shorter duration)
  if (secsIntoQuickCycle >= 0 && secsIntoQuickCycle < 20) {
    return { type: "quick", secsInto: secsIntoQuickCycle };
  }

  return false;
}

// Helper function to resume broadcast from saved state or start fresh
function resumeBroadcast() {
  // Check if we have saved state from previous power-off
  if (
    lastPowerOffTime &&
    lastSongIndex >= 0 &&
    musicPlayer.playlist.length > 0
  ) {
    // Calculate elapsed time (how long the station kept broadcasting while "off")
    const elapsedMs = Date.now() - lastPowerOffTime;
    const elapsedSec = elapsedMs / 1000;

    // Advance playback position as if station kept broadcasting
    let newPosition = lastSongPosition + elapsedSec;
    let songIndex = lastSongIndex;

    // Skip through songs if elapsed time exceeds current song duration
    // (Assume average song length of 4 minutes for calculations)
    const avgSongLength = 240; // 4 minutes in seconds

    while (newPosition > avgSongLength && musicPlayer.playlist.length > 0) {
      newPosition -= avgSongLength;
      songIndex = (songIndex + 1) % musicPlayer.playlist.length;
    }

    console.log(
      `📻 Station kept broadcasting: ${Math.floor(elapsedSec)}s elapsed, resuming at song ${songIndex + 1}`,
    );

    // Resume playback from calculated position
    musicPlayer.continueFromPosition(songIndex, newPosition);

    // Reset saved state
    lastPowerOffTime = null;
    lastSongIndex = -1;
    lastSongPosition = 0;
  } else {
    // No saved state - fresh tune-in
    // Launch an epic, contextual Apple Music style radio intro
    musicPlayer.playNextWithStartupIntro();
  }
}

// --- Power On ---
async function powerOn() {
  if (isScanning) return;

  // iOS AUDIO UNLOCK: Must happen synchronously on user interaction
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    await audioCtx.resume();
  }
  // Initialize effects chain immediately if not ready
  if (!fmFilter) initFMEffects();

  // Initialize noise buffer
  if (!noiseBuffer) createNoiseBuffer();

  isScanning = true;
  powerBtn.classList.add("on");
  powerBtn.setAttribute("aria-pressed", "true");

  // 50% chance to do instant-on (simulate tuning into live broadcast)
  const instantOn = Math.random() < 0.5;

  if (instantOn) {
    // INSTANT-ON MODE: Skip scanning, go straight to broadcast
    showPanel("normal");
    signalBars.classList.add("active");
    onAirDot.classList.add("active");
    onAirEl.classList.add("active");
    liveDot.classList.add("active");
    liveText.textContent = "LIVE";

    // Set needle to 96.6 instantly
    function freqToPercent(f) {
      return ((f - 87.5) / (108 - 87.5)) * 100;
    }
    tunerNeedle.style.left = freqToPercent(96.6) + "%";
    freqDisplay.textContent = "96.6 FM";

    isOn = true;
    isScanning = false;

    startTaglineRotation();
    startEQ();
    updateClock();
    clockInterval = setInterval(updateClock, 10000);

    // Resume broadcast (continues from last position or starts fresh)
    resumeBroadcast();

    scheduleDJBreaks();
    return;
  }

  // NORMAL MODE: Full scanning animation
  showPanel("scanning");
  scanningText.textContent = "Searching...";

  function freqToPercent(f) {
    return ((f - 87.5) / (108 - 87.5)) * 100;
  }

  const stations = [88.1, 91.3, 96.6];
  for (let i = 0; i < stations.length; i++) {
    await animateNeedle(
      tunerNeedle,
      freqToPercent(stations[i]),
      i === stations.length - 1 ? 700 : 350,
    );
    freqDisplay.textContent = stations[i].toFixed(1) + " FM";
    if (i < stations.length - 1) await sleep(150);
  }

  scanningText.textContent = "FOUND -- 96.6 ROM";

  await sleep(500);

  for (let f = 0; f < 4; f++) {
    freqDisplay.style.opacity = "0.2";
    await sleep(70);
    freqDisplay.style.opacity = "1";
    await sleep(70);
  }

  await sleep(300);

  showPanel("normal");
  signalBars.classList.add("active");
  onAirDot.classList.add("active");
  onAirEl.classList.add("active");
  liveDot.classList.add("active");
  liveText.textContent = "LIVE";

  isOn = true;
  isScanning = false;

  startTaglineRotation();
  startEQ();
  updateClock();
  clockInterval = setInterval(updateClock, 10000);

  // === LIVE BROADCAST SIMULATION ===

  // Resume broadcast (continues from last position or starts fresh)
  resumeBroadcast();
  scheduleDJBreaks();
}

// --- Power Off ---
async function powerOff() {
  isOn = false;
  stopEQ(); // Uses cancelAnimationFrame now
  clearInterval(clockInterval);
  clearInterval(breakInterval);
  clearTimeout(breakTimeout);
  clearInterval(quickIDInterval);
  clearTimeout(quickIDTimeout);
  stopTaglineRotation();

  // Record current state so station can "continue broadcasting" when powered back on
  lastPowerOffTime = Date.now();

  // Save current playback state from local music player
  if (musicPlayer.playlist.length > 0) {
    lastSongIndex = musicPlayer.currentIndex;
    lastSongPosition = musicPlayer.audio.currentTime || 0;
    const track = musicPlayer.playlist[lastSongIndex];
    console.log(
      `📻 Power OFF - Station at ${Math.floor(lastSongPosition)}s in "${track?.title || "Unknown"}"`,
    );
    musicPlayer.stop();
  }

  // Persist station state to localStorage
  try {
    localStorage.setItem(
      "romRadioState",
      JSON.stringify({
        timestamp: lastPowerOffTime,
        songIndex: lastSongIndex,
        position: lastSongPosition,
        volume: volumeSlider.value,
      }),
    );
  } catch (e) {
    console.warn("Could not save radio state:", e);
  }

  if (currentSource) {
    try {
      currentSource.stop();
    } catch (e) {}
    currentSource = null;
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();

  powerBtn.classList.remove("on");
  powerBtn.setAttribute("aria-pressed", "false");
  signalBars.classList.remove("active");
  onAirDot.classList.remove("active");
  onAirEl.classList.remove("active");
  liveDot.classList.remove("active");
  liveText.textContent = "OFF AIR";
  freqDisplay.textContent = "96.6 FM";
  displayClock.textContent = "--:--";
  songTitle.textContent = "96.6 ROM";
  songArtist.textContent = "PLAYING THE HITS, DEDICATED TO YOU";

  showPanel("normal");
  stopEQ();
  if (volVisible) toggleVolume();
}

// --- Volume ---
function toggleVolume() {
  volVisible = !volVisible;
  volumeContainer.style.display = volVisible ? "block" : "none";
  volBtn.classList.toggle("active", volVisible);
  volBtn.setAttribute("aria-expanded", volVisible ? "true" : "false");
}

// --- Helpers ---
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Haptic feedback for mobile devices
function hapticFeedback(pattern = 10) {
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

function animateNeedle(needle, targetPercent, duration) {
  return new Promise((resolve) => {
    const start = parseFloat(needle.style.left) || 0;
    const dist = targetPercent - start;
    const t0 = performance.now();
    function step(now) {
      const p = Math.min((now - t0) / duration, 1);
      const e = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      needle.style.left = start + dist * e + "%";
      if (p < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

// Logic functions (startTuning, tuneTo, etc.) remain in global scope
function startTuning(e) {
  if (!isOn && !isScanning) return;
  isDraggingNeedle = true;
  doTuning(e);
}

function doTuning(e) {
  if (!isDraggingNeedle) return;
  const rect = tunerBar.getBoundingClientRect();
  const x = (e.clientX || e.pageX) - rect.left;
  let percent = (x / rect.width) * 100;
  percent = Math.max(0, Math.min(100, percent));
  tunerNeedle.style.left = percent + "%";
  const freq = 87.5 + (percent / 100) * (108 - 87.5);
  freqDisplay.textContent = freq.toFixed(1) + " FM";
  checkFrequencyLock(freq);
}

function stopTuning() {
  isDraggingNeedle = false;
}

let lastLockedFreq = null;

function checkFrequencyLock(freq) {
  const targetFreq = 96.6;
  const tolerance = 0.3;
  if (Math.abs(freq - targetFreq) < tolerance) {
    if (lastLockedFreq !== targetFreq) lockStation(targetFreq);
  } else {
    if (lastLockedFreq !== null) unlockStation();
  }
}

function lockStation(freq) {
  lastLockedFreq = freq;
  scanningText.textContent = `FOUND -- ${freq.toFixed(1)} ROM`;
  freqDisplay.textContent = freq.toFixed(1) + " FM";
  if (isOn) {
    showPanel("normal");
    if (musicPlayer.audio.paused) musicPlayer.playNext();
  }
}

function unlockStation() {
  lastLockedFreq = null;
  scanningText.textContent = "Searching...";
  if (isOn) showPanel("scanning");
}

const presets = { 1: 96.6, 2: 88.1, 3: 104.5 };

async function tuneTo(freq) {
  if (!isOn && !isScanning) return;
  const targetPercent = ((freq - 87.5) / (108 - 87.5)) * 100;
  await animateNeedle(tunerNeedle, targetPercent, 500);
  freqDisplay.textContent = freq.toFixed(1) + " FM";
  checkFrequencyLock(freq);
}

// --- Noise Generator (Static & Hiss) ---
let noiseBuffer = null;

function createNoiseBuffer() {
  if (!audioCtx) return;
  const bufferSize = audioCtx.sampleRate * 2; // 2 seconds of noise
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    // White noise: random values between -1.0 and 1.0
    data[i] = Math.random() * 2 - 1;
  }
  noiseBuffer = buffer;
}

class NoiseGenerator {
  constructor() {
    this.hissSource = null;
    this.hissGain = null;
  }

  startHiss() {
    return; // Completely disabled per user request
    if (!audioCtx || !noiseBuffer) return;
    this.stopHiss();

    const source = audioCtx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const gain = audioCtx.createGain();
    // Very subtle background hiss (-50dB)
    gain.gain.value = 0.000;

    source.connect(gain);
    // Connect to FM effects for "radio" sound, or direct
    if (fmFilter) {
      gain.connect(fmFilter);
    } else {
      gain.connect(audioCtx.destination);
    }

    source.start();
    this.hissSource = source;
    this.hissGain = gain;
  }

  stopHiss() {
    if (this.hissSource) {
      try {
        this.hissSource.stop();
      } catch (e) {}
      this.hissSource = null;
    }
  }

  playBurst(duration = 0.2) {
    return; // Completely disabled per user request
    if (!audioCtx || !noiseBuffer) return;

    const source = audioCtx.createBufferSource();
    source.buffer = noiseBuffer;

    const gain = audioCtx.createGain();
    // Louder burst for tuning (-12dB)
    gain.gain.value = 0.000;

    // Envelope for burst (fade in/out fast)
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.000, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.000, now + duration);

    source.connect(gain);
    gain.connect(audioCtx.destination);

    source.start();
    source.stop(now + duration + 0.1);
  }
}

const noiseGen = new NoiseGenerator();

// --- Music Player (Local Files) ---
class MusicPlayer {
  constructor() {
    this.playlist = [];
    this.currentIndex = -1;
    this.audio = new Audio();
    this.audio.crossOrigin = "anonymous";
    this.fadeOutTimer = null;
    this.isFading = false;

    // For crossfading - we need two audio elements
    this.nextAudio = new Audio();
    this.nextAudio.crossOrigin = "anonymous";

    // Gain nodes for smooth crossfading
    this.gainNode = null;
    this.nextGainNode = null;

    // Connect to AudioContext for visualizer
    this.nextAudioSource = null;
    this.isShuffle = true; // Default to shuffle on

    this.audio.addEventListener("ended", () => this.handleSongEnd());
    this.audio.addEventListener("timeupdate", () => this.checkForCrossfade());

    // Auto-advance if not fading
    this.audio.addEventListener("error", (e) => {
      console.warn("Audio error:", e);
      this.playNext();
    });
  }

  loadFiles(files) {
    const fileTracks = Array.from(files)
      .filter((f) => f.type.startsWith("audio/"))
      .map((f) => ({
        url: URL.createObjectURL(f),
        title: this.parseFilename(f.name).title,
        artist: this.parseFilename(f.name).artist,
      }))
      .sort(() => Math.random() - 0.5); // Shuffle

    this.loadURLTracks(fileTracks);
  }

  loadURLTracks(tracks) {
    // Fisher-Yates shuffle
    const shuffled = [...tracks];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    this.playlist = shuffled;
    this.currentIndex = -1;

    if (this.playlist.length > 0) {
      console.log(`📻 Playlist ready: ${this.playlist.length} tracks`);

      // Enable power button now that music is loaded
      powerBtn.disabled = false;
      powerBtn.style.opacity = "";
      powerBtn.style.cursor = "";

      // Update UI to show ready state
      if (!isOn) {
        songTitle.textContent = "96.6 ROM";
        songArtist.textContent = "PLAYING THE HITS, DEDICATED TO YOU";
      }

      // If radio is already on, start playing immediately
      if (isOn) this.playNext();
    }
  }

  connectToVisualizer() {
    if (!audioCtx) return;
    if (this.audioSource) return;

    try {
      // Create gain node for smooth volume control
      this.gainNode = audioCtx.createGain();
      this.gainNode.gain.value = 1.0;

      this.audioSource = audioCtx.createMediaElementSource(this.audio);

      // Chain: audio -> gainNode -> FM effects -> destination
      this.audioSource.connect(this.gainNode);
      if (fmFilter) {
        this.gainNode.connect(fmFilter);
      } else {
        this.gainNode.connect(audioCtx.destination);
      }
    } catch (e) {
      console.warn("Visualizer connection failed:", e);
    }
  }

  connectNextAudioToVisualizer() {
    if (!audioCtx) return;
    if (this.nextAudioSource) return;

    try {
      // Create gain node for next audio (starts at 0)
      this.nextGainNode = audioCtx.createGain();
      this.nextGainNode.gain.value = 0;

      this.nextAudioSource = audioCtx.createMediaElementSource(this.nextAudio);

      // Chain: nextAudio -> nextGainNode -> FM effects -> destination
      this.nextAudioSource.connect(this.nextGainNode);
      if (fmFilter) {
        this.nextGainNode.connect(fmFilter);
      } else {
        this.nextGainNode.connect(audioCtx.destination);
      }
    } catch (e) {
      console.warn("Next audio connection failed:", e);
    }
  }

  playNext() {
    if (this.playlist.length === 0) return;

    if (this.isShuffle) {
      // Pick a random track that isn't the current one if possible
      let nextIndex;
      do {
        nextIndex = Math.floor(Math.random() * this.playlist.length);
      } while (nextIndex === this.currentIndex && this.playlist.length > 1);
      this.currentIndex = nextIndex;
    } else {
      // Linear playback
      this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    }

    this._playTrackAtIndex(this.currentIndex);
  }

  playNextWithStartupIntro() {
    if (this.playlist.length === 0) return;

    this.currentIndex = Math.floor(Math.random() * this.playlist.length);
    const track = this.playlist[this.currentIndex];
    if (!track) return;

    this.audio.src = track.url;
    this.audio.volume = 1.0;

    // Start music very low (5%)
    if (this.gainNode && audioCtx) {
      this.gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    }

    this.audio
      .play()
      .then(() => {
        // Start progress bar updates
        startProgressUpdates();

        console.log(`📻 Startup Epic Intro: ${track.title}`);

        // Craft a long, dynamic, contextual greeting
        const now = new Date();
        const hour = now.getHours();
        let greeting = "Good morning";
        if (hour >= 12 && hour < 18) greeting = "Good afternoon";
        if (hour >= 18) greeting = "Good evening";

        const stationIDs = DJ_BREAKS.stationids;
        const idText =
          stationIDs[Math.floor(Math.random() * stationIDs.length)];

        const text = `${greeting}, Victoria. ${idText} We are kicking off the broadcast right now with a massive track. This is ${track.title} by ${track.artist} on 96.6 ROM!`;

        // Update UI for DJ break
        djBreakContent.textContent = text;
        showPanel("djbreak");
        onAirDot.classList.add("active");
        onAirEl.classList.add("active");
        stopEQ();

        // Speak! (When finished, closeBreakPanel() will swell the music up over 6 seconds)
        speakDJBreak(text);
      })
      .catch((e) => console.error("Play with startup intro failed:", e));

    // Update UI Elements
    lastSong.title = track.title;
    lastSong.artist = track.artist.toUpperCase();
    songTitle.textContent = lastSong.title;
    songArtist.textContent = lastSong.artist;
    stopTaglineRotation();

    this.connectToVisualizer();
    this.isFading = false;
  }

  playNextWithDJIntro() {
    // Start next song with DJ talking over a long, slow music intro build
    if (this.playlist.length === 0) return;

    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    const track = this.playlist[this.currentIndex];
    if (!track) return;

    this.audio.src = track.url;
    this.audio.volume = 1.0;

    // Fast-seek to intro if needed, but start music very low (5%)
    if (this.gainNode && audioCtx) {
      this.gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    }

    this.audio
      .play()
      .then(() => {
        // Start progress bar updates
        startProgressUpdates();

        console.log(`📻 Apple Music Style Intro: ${track.title}`);

        // SLOW, dramatic 6-second fade up from the 5% intro floor back to 100%
        setTimeout(() => {
          if (this.gainNode && audioCtx) {
            this.gainNode.gain.exponentialRampToValueAtTime(
              1.0,
              audioCtx.currentTime + 6.0, // Very slow rise
            );
          }

          restoreLastHeard();
          showPanel("normal");
          startEQ();
        }, 1000); // 1 second after DJ strictly finishes speaking
      })
      .catch((e) => console.error("Play with DJ intro failed:", e));

    // Update UI
    lastSong.title = track.title;
    lastSong.artist = track.artist.toUpperCase();
    songTitle.textContent = lastSong.title;
    songArtist.textContent = lastSong.artist;
    stopTaglineRotation();

    // Ensure visualizer is connected
    this.connectToVisualizer();
    this.isFading = false;
  }

  playRandomTrack() {
    if (this.playlist.length === 0) return;

    this.currentIndex = Math.floor(Math.random() * this.playlist.length);
    this._playTrackAtIndex(this.currentIndex, true); // true = seek mid-song
  }

  continueFromPosition(index, position) {
    // Resume playback from a specific track and position (for station continuity)
    if (this.playlist.length === 0) return;

    this.currentIndex = index % this.playlist.length; // Ensure valid index
    const track = this.playlist[this.currentIndex];
    if (!track) return;

    this.audio.src = track.url;
    this.audio.volume = 1.0;

    // Add slight fade-in
    if (this.gainNode && audioCtx) {
      this.gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      this.gainNode.gain.exponentialRampToValueAtTime(
        1.0,
        audioCtx.currentTime + 1.5,
      );
    }

    this.audio
      .play()
      .then(() => {
        // Start progress bar updates
        startProgressUpdates();

        // Seek to the specified position once metadata is loaded
        if (this.audio.duration && isFinite(this.audio.duration)) {
          // Clamp position to valid range
          const seekPos = Math.min(position, this.audio.duration - 1);
          this.audio.currentTime = seekPos;
          const progress = Math.floor((seekPos / this.audio.duration) * 100);
          console.log(
            `📻 Station continued at ${Math.floor(seekPos)}s / ${Math.floor(this.audio.duration)}s (${progress}%)`,
          );
        }
      })
      .catch((e) => console.error("Continue playback failed:", e));

    // Fallback for when duration isn't immediately available
    this.audio.addEventListener(
      "loadedmetadata",
      () => {
        if (
          this.audio.duration &&
          isFinite(this.audio.duration) &&
          this.audio.currentTime === 0
        ) {
          const seekPos = Math.min(position, this.audio.duration - 1);
          this.audio.currentTime = seekPos;
        }
      },
      { once: true },
    );

    // Update UI
    lastSong.title = track.title;
    lastSong.artist = track.artist.toUpperCase();
    songTitle.textContent = lastSong.title;
    songArtist.textContent = lastSong.artist;
    stopTaglineRotation();

    // Ensure visualizer is connected
    this.connectToVisualizer();
    this.isFading = false;
  }

  _playTrackAtIndex(index, midSong = false) {
    const track = this.playlist[index];
    if (!track) return;

    this.audio.src = track.url;
    this.audio.volume = 1.0;

    // Add slight fade-in for smoother feel (especially for mid-song tuning)
    if (midSong && this.gainNode && audioCtx) {
      this.gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      this.gainNode.gain.exponentialRampToValueAtTime(
        1.0,
        audioCtx.currentTime + 1.5,
      );
    }

    this.audio
      .play()
      .then(() => {
        // Start progress bar updates
        startProgressUpdates();

        // Enhanced mid-song tuning logic
        if (midSong && this.audio.duration && isFinite(this.audio.duration)) {
          // More varied positioning:
          // 40% chance: early in song (15-40%)
          // 40% chance: middle of song (40-70%)
          // 20% chance: late in song (70-85%)
          const rand = Math.random();
          let pos;
          if (rand < 0.4) {
            pos = this.audio.duration * (0.15 + Math.random() * 0.25);
          } else if (rand < 0.8) {
            pos = this.audio.duration * (0.4 + Math.random() * 0.3);
          } else {
            pos = this.audio.duration * (0.7 + Math.random() * 0.15);
          }

          this.audio.currentTime = pos;
          const progress = Math.floor((pos / this.audio.duration) * 100);
          console.log(
            `📻 Tuned in at ${Math.floor(pos)}s / ${Math.floor(this.audio.duration)}s (${progress}%)`,
          );
        }
      })
      .catch((e) => console.error("Play failed:", e));

    // Attempt mid-song seek after metadata loads (duration may not be ready immediately)
    if (midSong) {
      this.audio.addEventListener(
        "loadedmetadata",
        () => {
          if (this.audio.duration && isFinite(this.audio.duration)) {
            // Same enhanced positioning logic
            const rand = Math.random();
            let pos;
            if (rand < 0.4) {
              pos = this.audio.duration * (0.15 + Math.random() * 0.25);
            } else if (rand < 0.8) {
              pos = this.audio.duration * (0.4 + Math.random() * 0.3);
            } else {
              pos = this.audio.duration * (0.7 + Math.random() * 0.15);
            }
            this.audio.currentTime = pos;
          }
        },
        { once: true },
      );
    }

    // Update UI
    lastSong.title = track.title;
    lastSong.artist = track.artist.toUpperCase();
    songTitle.textContent = lastSong.title;
    songArtist.textContent = lastSong.artist;
    
    // Marquee check:
    songTitle.classList.remove("scroll");
    setTimeout(() => {
      if (songTitle.offsetWidth > songTitle.parentElement.offsetWidth) {
        songTitle.classList.add("scroll");
      }
    }, 100);

    stopTaglineRotation();

    // Ensure visualizer is connected
    this.connectToVisualizer();
    this.isFading = false;
  }

  parseFilename(name) {
    // Basic "Artist - Title.mp3" parser
    const nameWithoutExt = name.replace(/\.[^/.]+$/, "");
    if (nameWithoutExt.includes(" - ")) {
      const parts = nameWithoutExt.split(" - ");
      return { artist: parts[0].toUpperCase(), title: parts[1] };
    }
    return { artist: "LOCAL LIBRARY", title: nameWithoutExt };
  }

  checkForCrossfade() {
    if (this.isFading || this.audio.paused) return;

    const timeLeft = this.audio.duration - this.audio.currentTime;
    // Start crossfade 6 seconds before end
    if (timeLeft > 0 && timeLeft <= 6) {
      this.startCrossfade();
    }
  }

  startCrossfade() {
    this.isFading = true;
    console.log("Starting smooth crossfade...");

    // 60% chance of DJ break, 40% direct crossfade to next song
    if (Math.random() < 0.6) {
      // DJ talks over the outro (REAL RADIO STYLE)
      this.djTalkOverOutro();
    } else {
      // Smooth crossfade to next song
      this.crossfadeToNext();
    }
  }

  djTalkOverOutro() {
    // REAL RADIO: DJ talks over the song outro while music plays underneath
    console.log("📻 DJ talking over outro...");

    // Apple Style: Extremely slow fade down to 2% over 4 seconds
    if (this.gainNode && audioCtx) {
      this.gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
      this.gainNode.gain.setValueAtTime(
        this.gainNode.gain.value,
        audioCtx.currentTime,
      );
      this.gainNode.gain.exponentialRampToValueAtTime(
        0.02,
        audioCtx.currentTime + 4.0,
      );
    }

    // Trigger DJ break after 2 seconds (when music is partially ducked)
    setTimeout(() => {
      this.triggerBreakOrNext();

      // After 5 more seconds, fade current song out completely and swap
      setTimeout(() => {
        if (this.gainNode && audioCtx) {
          this.gainNode.gain.exponentialRampToValueAtTime(
            0.001,
            audioCtx.currentTime + 3,
          );
        }

        // Song ends naturally and next one starts via closeBreakPanel()
        setTimeout(() => {
          this.audio.pause();
          this.audio.currentTime = 0;
          if (this.gainNode) this.gainNode.gain.value = 1.0;
          this.isFading = false;
        }, 3000);
      }, 5000);
    }, 2000);
  }

  fadeOutForBreak() {
    if (!this.gainNode || !audioCtx) {
      // Fallback to volume-based fade
      this.fadeOutVolumeForBreak();
      return;
    }

    // Smooth exponential fade out over 3 seconds
    const fadeDuration = 3;
    this.gainNode.gain.exponentialRampToValueAtTime(
      0.01, // Can't go to 0 with exponential
      audioCtx.currentTime + fadeDuration,
    );

    // After fade completes, pause and trigger break
    setTimeout(() => {
      this.audio.pause();
      this.audio.currentTime = 0;
      if (this.gainNode) this.gainNode.gain.value = 1.0; // Reset for next song
      this.triggerBreakOrNext();
    }, fadeDuration * 1000);
  }

  fadeOutVolumeForBreak() {
    // Fallback using volume property
    const fadeDuration = 3000;
    const steps = 60;
    const stepTime = fadeDuration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      this.audio.volume = Math.max(0, 1 - progress);

      if (step >= steps) {
        clearInterval(timer);
        this.audio.pause();
        this.audio.currentTime = 0;
        this.audio.volume = 1.0;
        this.triggerBreakOrNext();
      }
    }, stepTime);
  }

  crossfadeToNext() {
    if (this.playlist.length === 0) {
      this.fadeOutForBreak();
      return;
    }

    // Prepare next track
    const nextIndex = (this.currentIndex + 1) % this.playlist.length;
    const nextTrack = this.playlist[nextIndex];

    if (!nextTrack) {
      this.fadeOutForBreak();
      return;
    }

    // Set up next audio element
    this.nextAudio.src = nextTrack.url;
    this.nextAudio.volume = 1.0;

    // Connect to audio context if not already
    this.connectNextAudioToVisualizer();

    // Start playing next track (will fade in)
    this.nextAudio
      .play()
      .then(() => {
        console.log(`📻 Apple Style Direct Crossfade to: ${nextTrack.title}`);

        // Update UI
        lastSong.title = nextTrack.title;
        lastSong.artist = nextTrack.artist.toUpperCase();
        songTitle.textContent = lastSong.title;
        songArtist.textContent = lastSong.artist;
        stopTaglineRotation();

        if (this.gainNode && this.nextGainNode && audioCtx) {
          // Smooth crossfade using gain nodes
          const crossfadeDuration = 6.0; // 6 seconds overlap for buttery flow

          // Slow, elegant fade out of current track
          this.gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
          this.gainNode.gain.setValueAtTime(
            this.gainNode.gain.value,
            audioCtx.currentTime,
          );
          this.gainNode.gain.exponentialRampToValueAtTime(
            0.01,
            audioCtx.currentTime + crossfadeDuration,
          );

          // Slow, elegant fade in of next track
          this.nextGainNode.gain.cancelScheduledValues(audioCtx.currentTime);
          this.nextGainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
          this.nextGainNode.gain.exponentialRampToValueAtTime(
            1.0,
            audioCtx.currentTime + crossfadeDuration,
          );

          // After crossfade, swap audio elements
          setTimeout(() => {
            this.audio.pause();
            this.audio.currentTime = 0;

            // Swap audio elements and sources
            [this.audio, this.nextAudio] = [this.nextAudio, this.audio];
            [this.audioSource, this.nextAudioSource] = [
              this.nextAudioSource,
              this.audioSource,
            ];
            [this.gainNode, this.nextGainNode] = [
              this.nextGainNode,
              this.gainNode,
            ];

            // Reset gain for next crossfade
            if (this.gainNode) this.gainNode.gain.value = 1.0;
            if (this.nextGainNode) this.nextGainNode.gain.value = 0;

            this.currentIndex = nextIndex;
            this.isFading = false;
          }, crossfadeDuration * 1000);
        } else {
          // Fallback without Web Audio API gain nodes
          this.crossfadeWithVolume(nextIndex);
        }
      })
      .catch((e) => {
        console.error("Crossfade play failed:", e);
        this.fadeOutForBreak();
      });
  }

  crossfadeWithVolume(nextIndex) {
    // Fallback crossfade using volume property
    const crossfadeDuration = 4000;
    const steps = 80;
    const stepTime = crossfadeDuration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;

      this.audio.volume = Math.max(0, 1 - progress);
      this.nextAudio.volume = Math.min(1, progress);

      if (step >= steps) {
        clearInterval(timer);
        this.audio.pause();
        this.audio.currentTime = 0;

        // Swap audio elements
        [this.audio, this.nextAudio] = [this.nextAudio, this.audio];
        this.audio.volume = 1.0;
        this.nextAudio.volume = 0;

        this.currentIndex = nextIndex;
        this.isFading = false;
      }
    }, stepTime);
  }

  triggerBreakOrNext() {
    // DECISION: 90% Short Snippet (Cheap), 10% Full Break (Expensive)
    if (Math.random() < 0.9) {
      this.triggerShortSnippet();
    } else {
      triggerDJBreak();
    }
  }

  triggerShortSnippet() {
    const snippets = DJ_BREAKS.short;
    const text = snippets[Math.floor(Math.random() * snippets.length)];

    // Update UI minimally
    djBreakContent.textContent = text;
    // Don't show full panel, just flash message or keep normal view
    // but maybe pulse the On Air light?
    // For now, let's just use the panel but it will be quick.
    showPanel("djbreak");

    speakDJBreak(text);
  }

  handleSongEnd() {
    if (!this.isFading) this.playNext();
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.nextAudio.pause();
    this.nextAudio.currentTime = 0;

    // Reset gain nodes
    if (this.gainNode) this.gainNode.gain.value = 1.0;
    if (this.nextGainNode) this.nextGainNode.gain.value = 0;

    this.isFading = false;
    if (this.fadeOutTimer) {
      clearTimeout(this.fadeOutTimer);
      this.fadeOutTimer = null;
    }
  }

  resume() {
    if (this.playlist.length > 0 && this.audio.paused) {
      this.audio.play();
    } else if (this.playlist.length > 0) {
      // already playing
    } else {
      // no music
    }
  }
}

const musicPlayer = new MusicPlayer();

// --- Restore persisted state from localStorage ---
function restoreRadioState() {
  try {
    const saved = localStorage.getItem("romRadioState");
    if (!saved) return;

    const state = JSON.parse(saved);

    // Restore last power-off time and playback position
    if (state.timestamp) {
      lastPowerOffTime = state.timestamp;
      lastSongIndex = state.songIndex || -1;
      lastSongPosition = state.position || 0;

      const elapsed = Math.floor((Date.now() - state.timestamp) / 1000);
      console.log(
        `📻 Restored state: Station was off for ${elapsed}s, last at song ${lastSongIndex + 1}, position ${Math.floor(lastSongPosition)}s`,
      );
    }

    // Restore volume setting
    if (state.volume !== undefined) {
      volumeSlider.value = state.volume;
      volValue.textContent = state.volume;

      // Apply volume to FM output gain when audio context is ready
      if (fmOutputGain && audioCtx) {
        const volumeGain = state.volume / 100;
        fmOutputGain.gain.setValueAtTime(volumeGain, audioCtx.currentTime);
      }
    }
  } catch (e) {
    console.warn("Could not restore radio state:", e);
  }
}

// --- Main Bootstrapping ---
window.addEventListener("DOMContentLoaded", () => {
  initElements();
  
  // 1. Power & Core Controls
  if (powerBtn) {
    powerBtn.addEventListener("click", () => {
      hapticFeedback(20);
      if (!isOn && !isScanning) powerOn();
      else if (isOn) powerOff();
    });
  }
  
  if (volBtn) {
    volBtn.addEventListener("click", () => {
      hapticFeedback(10);
      toggleVolume();
    });
  }

  if (shuffleBtn) {
    shuffleBtn.addEventListener("click", () => {
      musicPlayer.isShuffle = !musicPlayer.isShuffle;
      shuffleBtn.classList.toggle("active", musicPlayer.isShuffle);
    });
    shuffleBtn.classList.toggle("active", musicPlayer.isShuffle);
  }

  if (loadBtn) {
    loadBtn.addEventListener("click", () => {
      hapticFeedback(10);
      const folderInput = document.getElementById("musicFolder");
      if (folderInput) folderInput.click();
    });
  }

  // 2. Volume & Audio Chain
  if (volumeSlider) {
    volumeSlider.addEventListener("input", (e) => {
      const volumePercent = e.target.value;
      const volumeGain = volumePercent / 100;
      if (volValue) volValue.textContent = volumePercent;
      musicPlayer.setVolume(volumeGain);
      e.target.setAttribute("aria-valuenow", volumePercent);
    });
  }

  // 3. Manual Tuning
  if (tunerBar) {
    tunerBar.addEventListener("mousedown", startTuning);
    tunerBar.addEventListener("mousemove", doTuning);
    window.addEventListener("mouseup", stopTuning);
    
    // Touch support
    tunerBar.addEventListener("touchstart", (e) => {
      e.preventDefault();
      startTuning(e.touches[0]);
    }, { passive: false });
    tunerBar.addEventListener("touchmove", (e) => {
      e.preventDefault();
      doTuning(e.touches[0]);
    }, { passive: false });
    window.addEventListener("touchend", stopTuning);
  }

  // 4. Presets
  presetBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const p = btn.dataset.preset;
      const freq = presets[p];
      if (freq) {
        tuneTo(freq);
        presetBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        hapticFeedback(10);
      }
    });
  });

  // 5. Keyboard Shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    switch (e.key) {
      case " ": 
        e.preventDefault();
        if (!isOn && !isScanning && !powerBtn?.disabled) powerOn();
        else if (isOn) powerOff();
        break;
      case "ArrowUp":
        e.preventDefault();
        if (volumeSlider) {
          volumeSlider.value = Math.min(100, parseInt(volumeSlider.value) + 5);
          volumeSlider.dispatchEvent(new Event("input"));
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (volumeSlider) {
          volumeSlider.value = Math.max(0, parseInt(volumeSlider.value) - 5);
          volumeSlider.dispatchEvent(new Event("input"));
        }
        break;
      case "m":
      case "M":
        e.preventDefault();
        toggleVolume();
        break;
    }
  });

  // 6. Init UI & State
  if (songTitle) songTitle.textContent = STATION_CONFIG.stationName;
  restoreRadioState();
  loadLocalPlaylist();

  console.log("📻 96.6 ROM Radio Engine Ready!");
});

// --- Expose for testing ---
window.triggerDJBreak = triggerDJBreak;
window.triggerQuickID = triggerQuickID;
