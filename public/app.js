// ==============================================
// 93.4 ROM — APP
// ==============================================

import {
  STATION_CONFIG,
  DJ_BREAKS,
  STATION_TAGLINES,
  SPECIAL_DATES,
  getRandomBreak,
  getWeightedCategory,
} from './breaks.js';

// --- Serverless TTS Config ---
// API key is now secure on the server side
// Works with both Netlify and Vercel
const TTS_ENDPOINT = window.location.hostname.includes('netlify')
  ? '/.netlify/functions/speak'
  : '/api/speak';

// --- Elements ---
const powerBtn        = document.getElementById('powerBtn');
const volBtn          = document.getElementById('volBtn');
const volumeSlider    = document.getElementById('volumeSlider');
const volumeContainer = document.getElementById('volumeContainer');
const volValue        = document.getElementById('volValue');
const onAirDot        = document.getElementById('onAirDot');
const onAirEl         = document.getElementById('onAirEl');
const freqDisplay     = document.getElementById('freqDisplay');
const signalBars      = document.getElementById('signalBars');
const songTitle       = document.getElementById('songTitle');
const songArtist      = document.getElementById('songArtist');
const liveDot         = document.getElementById('liveDot');
const liveText        = document.getElementById('liveText');
const displayClock    = document.getElementById('displayClock');
const eqBars          = document.querySelectorAll('.eq-bar');
const displayNormal   = document.getElementById('displayNormal');
const displayScanning = document.getElementById('displayScanning');
const displayDJBreak  = document.getElementById('displayDJBreak');
const tunerNeedle     = document.getElementById('tunerNeedle');
const scanningText    = document.getElementById('scanningText');
const djBreakContent  = document.getElementById('djBreakContent');

// --- State ---
let isOn          = false;
let isScanning    = false;
let volVisible    = false;
let eqInterval    = null;
let clockInterval = null;
let breakInterval = null;
let breakTimeout  = null;
let spotifyCtrl   = null;
let audioCtx      = null;
let currentSource = null;
let taglineTimer  = null;
let taglineIdx    = 0;
let lastSong      = { title: '', artist: '' };

// --- FM Radio Effects Chain ---
let fmFilter      = null;
let fmCompressor  = null;
let fmWaveshaper  = null;
let fmOutputGain  = null;

// --- Initialize FM Radio Effects ---
function initFMEffects() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();

  // 1. Bandpass Filter (80Hz - 12kHz) - Classic FM radio frequency response
  const lowpass = audioCtx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 12000; // Cut harsh highs
  lowpass.Q.value = 0.7;

  const highpass = audioCtx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 80; // Cut muddy bass
  highpass.Q.value = 0.7;

  // 2. Compressor - Radio "loudness"
  fmCompressor = audioCtx.createDynamicsCompressor();
  fmCompressor.threshold.value = -24;  // Start compressing at -24dB
  fmCompressor.knee.value = 10;        // Smooth compression curve
  fmCompressor.ratio.value = 4;        // 4:1 compression ratio
  fmCompressor.attack.value = 0.003;   // Fast attack (3ms)
  fmCompressor.release.value = 0.25;   // Quick release (250ms)

  // 3. Waveshaper - Subtle warmth/saturation
  fmWaveshaper = audioCtx.createWaveShaper();
  fmWaveshaper.curve = makeWarmthCurve(200); // Subtle tape-like saturation
  fmWaveshaper.oversample = '2x';

  // 4. Output gain for overall volume control
  fmOutputGain = audioCtx.createGain();
  fmOutputGain.gain.value = 1.0;

  // Connect the chain: highpass → lowpass → compressor → waveshaper → output gain
  highpass.connect(lowpass);
  lowpass.connect(fmCompressor);
  fmCompressor.connect(fmWaveshaper);
  fmWaveshaper.connect(fmOutputGain);
  fmOutputGain.connect(audioCtx.destination);

  // Store the filter for later use
  fmFilter = highpass;
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

// --- Spotify Embed API ---
let shuffledTrackIndices = [];
let currentTrackIndex = 0;

window.onSpotifyIframeApiReady = (IFrameAPI) => {
  const el = document.getElementById('spotifyEmbed');
  const options = {
    uri: 'spotify:playlist:45dvmYti7Kn9EDRzc31hS4',
    height: 1,
  };
  IFrameAPI.createController(el, options, (ctrl) => {
    spotifyCtrl = ctrl;
    
    // Initialize shuffle on load
    ctrl.addListener('ready', async () => {
      try {
        // Get playlist info to know how many tracks
        const state = await ctrl.getPlaybackState();
        if (state && state.context && state.context.metadata) {
          // Create shuffled indices (simulating shuffle)
          const trackCount = 50; // Approximate playlist size
          shuffledTrackIndices = Array.from({length: trackCount}, (_, i) => i);
          // Fisher-Yates shuffle
          for (let i = shuffledTrackIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffledTrackIndices[i], shuffledTrackIndices[j]] = [shuffledTrackIndices[j], shuffledTrackIndices[i]];
          }
          currentTrackIndex = Math.floor(Math.random() * shuffledTrackIndices.length);
          console.log('Shuffle initialized, starting at track', currentTrackIndex);
        }
      } catch (e) {
        console.warn('Could not initialize shuffle:', e);
      }
    });
    
    ctrl.addListener('playback_update', (e) => {
      if (!isOn) return;
      if (e.data && e.data.title) {
        lastSong.title  = e.data.title;
        lastSong.artist = (e.data.artist || '').toUpperCase();
        stopTaglineRotation();
        songTitle.textContent  = lastSong.title;
        songArtist.textContent = lastSong.artist;
      }
}

// --- Clock ---
function updateClock() {
  const now  = new Date();
  const h    = now.getHours() % 12 || 12;
  const m    = String(now.getMinutes()).padStart(2, '0');
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
  displayClock.textContent = `${h}:${m} ${ampm}`;
}

// --- EQ Visualizer ---
const EQ_HEIGHTS = [15,30,20,40,25,50,20,35,15,45,30,20,55,25,15,40,20,30,15,35];

function animateEQ() {
  eqBars.forEach((bar, i) => {
    const base = EQ_HEIGHTS[i];
    const h    = base + Math.random() * (100 - base) * 0.6;
    bar.style.height  = h + '%';
    bar.style.opacity = '0.75';
  });
}

function startEQ() {
  stopEQ();
  animateEQ();
  eqInterval = setInterval(animateEQ, 120);
}

function stopEQ() {
  clearInterval(eqInterval);
  eqBars.forEach(bar => { bar.style.height = '4px'; bar.style.opacity = '0.2'; });
}

// --- Display Panels ---
function showPanel(panel) {
  displayNormal.style.display   = panel === 'normal'   ? 'block' : 'none';
  displayScanning.style.display = panel === 'scanning' ? 'block' : 'none';
  displayDJBreak.style.display  = panel === 'djbreak'  ? 'block' : 'none';
}

// --- Rotating Taglines ---
function startTaglineRotation() {
  stopTaglineRotation();
  taglineIdx = 0;
  songTitle.textContent  = '93.4 ROM';
  songArtist.textContent = STATION_TAGLINES[0];
  taglineTimer = setInterval(() => {
    if (lastSong.title) { stopTaglineRotation(); return; }
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
    songTitle.textContent  = lastSong.title;
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
    const res = await fetch('audio/snippets/manifest.json');
    if (res.ok) {
      snippetManifest = await res.json();
      console.log('Loaded snippet manifest:', Object.keys(snippetManifest).length, 'items');
    }
  } catch (e) {
    console.warn('Could not load snippet manifest (using API only)');
  }
}
loadSnippetManifest();

// --- ElevenLabs TTS with fallbacks ---
async function speakDJBreak(text) {
  
  // Tier 0: Pre-generated Local Audio (Zero Cost)
  if (snippetManifest[text]) {
    try {
      console.log('Playing local snippet:', text);
      const audio = new Audio(snippetManifest[text]);
      
      const source = audioCtx.createMediaElementSource(audio);
      const gain = audioCtx.createGain();
      
      // Connect to FM chain
      source.connect(gain);
      if (fmFilter) {
        gain.connect(fmFilter);
      } else {
        gain.connect(audioCtx.destination);
      }
      
      audio.onended = () => { closeBreakPanel(); };
      audio.play();
      return;
    } catch (e) {
      console.warn('Local snippet failed, falling back to API', e);
    }
  }

  // Tier 1: ElevenLabs via secure serverless function
  try {
    const response = await fetch(TTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') await audioCtx.resume();

      // FM effects are already initialized in powerOn(), but safety check:
      if (!fmFilter) initFMEffects();

      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const duration    = audioBuffer.duration;

      if (currentSource) { try { currentSource.stop(); } catch(e) {} currentSource = null; }

      const source  = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      const gain    = audioCtx.createGain();
      const fadeIn  = 0.6;
      const fadeOut = Math.min(1.4, duration * 0.15);

      gain.gain.setValueAtTime(0, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(1.0, audioCtx.currentTime + fadeIn);
      if (duration > fadeIn + fadeOut + 1) {
        gain.gain.setValueAtTime(1.0, audioCtx.currentTime + duration - fadeOut);
        gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
      }

      // Route through FM radio effects chain for authentic sound
      source.connect(gain);
      gain.connect(fmFilter); // Connect to FM effects instead of direct output
      source.start(0);
      currentSource = source;
      source.onended = () => { currentSource = null; closeBreakPanel(); };
      return;
    }

    console.warn('ElevenLabs unavailable:', response.status);

  } catch (err) {
    console.warn('ElevenLabs failed:', err);
  }

  // Tier 2: Web Speech API (free, unlimited, built-in)
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utter  = new SpeechSynthesisUtterance(text);
      utter.rate   = 0.95;
      utter.pitch  = 1.0;
      utter.volume = 1.0;

      const voices    = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.name.includes('Samantha') ||
        v.name.includes('Google US English') ||
        v.lang === 'en-US'
      );
      if (preferred) utter.voice = preferred;

      utter.onend   = () => closeBreakPanel();
      utter.onerror = () => fallbackTextOnly();
      window.speechSynthesis.speak(utter);
      return;
    } catch (err) {
      console.warn('Web Speech failed:', err);
    }
  }

  // Tier 3: Text only — show for 9 seconds
  fallbackTextOnly();
}

function fallbackTextOnly() {
  setTimeout(() => closeBreakPanel(), 9000);
}

function closeBreakPanel() {
  if (!isOn) return;

  // Resume Spotify playback (continue from same position - no track skip!)
  if (spotifyCtrl) {
    spotifyCtrl.resume();
  }

  restoreLastHeard();
  showPanel('normal');
  startEQ();
}

// --- Quick Station ID (10-20 sec) ---
function triggerQuickID() {
  const stationIDs = DJ_BREAKS.stationids;
  const text = stationIDs[Math.floor(Math.random() * stationIDs.length)];

  // Pause Spotify during DJ break
  if (spotifyCtrl) spotifyCtrl.pause();

  djBreakContent.textContent = text;
  showPanel('djbreak');
  onAirDot.classList.add('active');
  onAirEl.classList.add('active');
  stopEQ();
  speakDJBreak(text);
}

// --- Full DJ Breaks (30-60 sec) ---
function triggerDJBreak() {
  // Check special date first (70% chance when available)
  const now     = new Date();
  const dateKey = String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  let text;

  if (SPECIAL_DATES[dateKey] && Math.random() < 0.70) {
    const pool = SPECIAL_DATES[dateKey];
    text = pool[Math.floor(Math.random() * pool.length)];
  } else {
    const category = getWeightedCategory();
    text = getRandomBreak(category);
  }

  // Pause Spotify during DJ break
  if (spotifyCtrl) spotifyCtrl.pause();

  djBreakContent.textContent = text;
  showPanel('djbreak');
  onAirDot.classList.add('active');
  onAirEl.classList.add('active');
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
    breakInterval = setInterval(() => { if (isOn) triggerDJBreak(); }, fullBreakCycle * 1000);
  }, secsUntilFullBreak * 1000);

  // Quick station IDs every 2.5 minutes (150 seconds)
  // Offset by 90 seconds so they don't overlap with full breaks
  const quickIDCycle = 2.5 * 60;
  const offset = 90; // Start 90 seconds after full break
  let secsUntilQuickID = (quickIDCycle - (secsIntoHour % quickIDCycle)) + offset;

  // Make sure first quick ID doesn't conflict with upcoming full break
  if (secsUntilQuickID > secsUntilFullBreak - 30) {
    secsUntilQuickID += quickIDCycle;
  }

  quickIDTimeout = setTimeout(() => {
    if (isOn) triggerQuickID();
    quickIDInterval = setInterval(() => { if (isOn) triggerQuickID(); }, quickIDCycle * 1000);
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
    return { type: 'full', secsInto: secsIntoFullCycle };
  }

  // If within first 20 seconds of quick ID cycle (shorter duration)
  if (secsIntoQuickCycle >= 0 && secsIntoQuickCycle < 20) {
    return { type: 'quick', secsInto: secsIntoQuickCycle };
  }

  return false;
}

// --- Start Spotify at random position (simulate catching mid-song) ---
async function startSpotifyLive() {
  if (!spotifyCtrl) return;

  const attemptPlay = async () => {
    try {
      // Skip to a random track first (simulate tuning into random song)
      const randomSkips = Math.floor(Math.random() * 10);
      for (let i = 0; i < randomSkips; i++) {
        await spotifyCtrl.skipToNext();
        await sleep(50);
      }
      
      await spotifyCtrl.play();
      console.log('Spotify playing!');

      // Wait a moment for playback to start, then seek to random position
      setTimeout(async () => {
        try {
          // Check if getPlaybackState exists (API compatibility)
          if (typeof spotifyCtrl.getPlaybackState === 'function') {
            const state = await spotifyCtrl.getPlaybackState();
            if (state && state.duration) {
              // Seek to random position between 20% and 80% of song (more mid-song feel)
              const randomPosition = Math.floor(state.duration * (0.2 + Math.random() * 0.6));
              await spotifyCtrl.seek(randomPosition);
              console.log(`Tuned in mid-song at ${Math.floor(randomPosition/1000)}s`);
            }
          } else {
            console.warn('getPlaybackState not available in this Spotify API version');
          }
        } catch (e) {
          console.warn('Could not seek to random position:', e);
        }
      }, 1500);

    } catch(e) {
      console.warn('Spotify play attempt failed:', e);
      setTimeout(attemptPlay, 1000);
    }
  };
  attemptPlay();
}

// --- Power On ---
async function powerOn() {
  if (isScanning) return;

  // iOS AUDIO UNLOCK: Must happen synchronously on user interaction
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }
  // Initialize effects chain immediately if not ready
  if (!fmFilter) initFMEffects();

  // Initialize noise buffer
  if (!noiseBuffer) createNoiseBuffer();

  isScanning = true;
  powerBtn.classList.add('on');

  // Start background hiss
  noiseGen.startHiss();

  // 50% chance to do instant-on (simulate tuning into live broadcast)
  const instantOn = Math.random() < 0.5;

  if (instantOn) {
    // INSTANT-ON MODE: Skip scanning, go straight to broadcast
    showPanel('normal');
    signalBars.classList.add('active');
    onAirDot.classList.add('active');
    onAirEl.classList.add('active');
    liveDot.classList.add('active');
    liveText.textContent = 'LIVE';
    
    // Set needle to 93.4 instantly
    function freqToPercent(f) { return ((f - 87.5) / (108 - 87.5)) * 100; }
    tunerNeedle.style.left = freqToPercent(93.4) + '%';
    freqDisplay.textContent = '93.4 FM';

    isOn = true;
    isScanning = false;

    startTaglineRotation();
    startEQ();
    updateClock();
    clockInterval = setInterval(updateClock, 10000);

    // 50% chance to start mid-DJ break, 50% mid-song
    if (Math.random() < 0.5) {
      // Start mid-DJ break
      const randomBreak = breaks[Math.floor(Math.random() * breaks.length)];
      speakDJBreak(randomBreak);
    } else {
      // Start mid-song (Spotify or local music)
      if (musicPlayer.playlist.length > 0) {
        musicPlayer.playRandomTrack();
      } else {
        startSpotifyLive();
      }
    }

    scheduleDJBreaks();
    return;
  }

  // NORMAL MODE: Full scanning animation
  showPanel('scanning');
  scanningText.textContent = 'Searching...';

  function freqToPercent(f) { return ((f - 87.5) / (108 - 87.5)) * 100; }

  const stations = [88.1, 91.3, 93.4];
  for (let i = 0; i < stations.length; i++) {
    // Play static burst with each needle move
    noiseGen.playBurst(0.4);
    await animateNeedle(tunerNeedle, freqToPercent(stations[i]), i === stations.length - 1 ? 700 : 350);
    freqDisplay.textContent = stations[i].toFixed(1) + ' FM';
    if (i < stations.length - 1) await sleep(150);
  }

  scanningText.textContent = 'FOUND -- 93.4 ROM';
  await sleep(500);

  for (let f = 0; f < 4; f++) {
    freqDisplay.style.opacity = '0.2';
    await sleep(70);
    freqDisplay.style.opacity = '1';
    await sleep(70);
  }

  await sleep(300);

  showPanel('normal');
  signalBars.classList.add('active');
  onAirDot.classList.add('active');
  onAirEl.classList.add('active');
  liveDot.classList.add('active');
  liveText.textContent = 'LIVE';

  isOn       = true;
  isScanning = false;

  startTaglineRotation();
  startEQ();
  updateClock();
  clockInterval = setInterval(updateClock, 10000);

  // === LIVE BROADCAST SIMULATION ===
  
  // If we have local music loaded, prioritize that
  if (musicPlayer.playlist.length > 0) {
    musicPlayer.playNext();
    scheduleDJBreaks(); // Still schedule random breaks
    return;
  }

  // Check if we're "tuning in" during a DJ break window
  const liveBreakCheck = checkLiveDJBreak();

  if (liveBreakCheck) {
    // We caught the station during a DJ break or quick ID!
    if (liveBreakCheck.type === 'full') {
      console.log(`📻 LIVE: Caught full DJ break in progress (${liveBreakCheck.secsInto}s in)`);
      await sleep(800);
      if (isOn) triggerDJBreak();
    } else if (liveBreakCheck.type === 'quick') {
      console.log(`📻 LIVE: Caught quick station ID in progress (${liveBreakCheck.secsInto}s in)`);
      await sleep(800);
      if (isOn) triggerQuickID();
    }
  } else {
    // We're between breaks - start music at random position (mid-song)
    const now = new Date();
    const secsIntoHour = now.getMinutes() * 60 + now.getSeconds();
    const fullCycle = 7 * 60;
    const quickCycle = 2.5 * 60;
    const secsUntilFull = fullCycle - (secsIntoHour % fullCycle);
    const minsUntilFull = Math.floor(secsUntilFull / 60);
    const secsUntilQuick = quickCycle - (secsIntoHour % quickCycle);
    const minsUntilQuick = Math.floor(secsUntilQuick / 60);

    console.log(`📻 LIVE: Tuned in mid-song (Next ID in ~${minsUntilQuick}m, Full break in ~${minsUntilFull}m)`);
    startSpotifyLive();
  }

  // Schedule future DJ breaks and quick IDs
  scheduleDJBreaks();
}

// --- Power Off ---
function powerOff() {
  isOn = false;
  clearInterval(eqInterval);
  clearInterval(clockInterval);
  clearInterval(breakInterval);
  clearTimeout(breakTimeout);
  clearInterval(quickIDInterval);
  clearTimeout(quickIDTimeout);
  stopTaglineRotation();

  if (spotifyCtrl) spotifyCtrl.pause();
  if (currentSource) { try { currentSource.stop(); } catch(e) {} currentSource = null; }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  
  // Stop Radio Static
  noiseGen.stopHiss();

  powerBtn.classList.remove('on');
  signalBars.classList.remove('active');
  onAirDot.classList.remove('active');
  onAirEl.classList.remove('active');
  liveDot.classList.remove('active');
  liveText.textContent     = 'OFF AIR';
  freqDisplay.textContent  = '93.4 FM';
  displayClock.textContent = '--:--';
  songTitle.textContent    = '93.4 ROM';
  songArtist.textContent   = 'PLAYING THE HITS, DEDICATED TO YOU';

  showPanel('normal');
  stopEQ();
  if (volVisible) toggleVolume();
}

// --- Volume ---
function toggleVolume() {
  volVisible = !volVisible;
  volumeContainer.style.display = volVisible ? 'block' : 'none';
  volBtn.classList.toggle('active', volVisible);
}

// --- Helpers ---
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function animateNeedle(needle, targetPercent, duration) {
  return new Promise(resolve => {
    const start = parseFloat(needle.style.left) || 0;
    const dist  = targetPercent - start;
    const t0    = performance.now();
    function step(now) {
      const p = Math.min((now - t0) / duration, 1);
      const e = p < 0.5 ? 2*p*p : -1+(4-2*p)*p;
      needle.style.left = (start + dist * e) + '%';
      if (p < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

// --- Events ---
powerBtn.addEventListener('click', () => {
  if (!isOn && !isScanning) powerOn();
  else if (isOn) powerOff();
});

volBtn.addEventListener('click', toggleVolume);

volumeSlider.addEventListener('input', (e) => {
  if (volValue) volValue.textContent = e.target.value;
});

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
    if (!audioCtx || !noiseBuffer) return;
    this.stopHiss();

    const source = audioCtx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const gain = audioCtx.createGain();
    // Very subtle background hiss (-50dB)
    gain.gain.value = 0.001; // Reduced from 0.005 - subtle background hiss

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
      try { this.hissSource.stop(); } catch(e) {}
      this.hissSource = null;
    }
  }

  playBurst(duration = 0.2) {
    if (!audioCtx || !noiseBuffer) return;

    const source = audioCtx.createBufferSource();
    source.buffer = noiseBuffer;
    
    const gain = audioCtx.createGain();
    // Louder burst for tuning (-12dB)
    gain.gain.value = 0.05; // Reduced from 0.15 - quieter scanning bursts
    
    // Envelope for burst (fade in/out fast)
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

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
    this.audio.crossOrigin = 'anonymous';
    this.fadeOutTimer = null;
    this.isFading = false;
    
    // Connect to AudioContext for visualizer
    this.audioSource = null;
    
    this.audio.addEventListener('ended', () => this.handleSongEnd());
    this.audio.addEventListener('timeupdate', () => this.checkForCrossfade());
    
    // Auto-advance if not fading
    this.audio.addEventListener('error', (e) => {
      console.warn('Audio error:', e);
      this.playNext();
    });
  }

  loadFiles(files) {
    this.playlist = Array.from(files)
      .filter(f => f.type.startsWith('audio/'))
      .sort(() => Math.random() - 0.5); // Shuffle
      
    if (this.playlist.length > 0) {
      console.log(`Loaded ${this.playlist.length} songs.`);
      this.currentIndex = -1;
      // If radio is on, start playing
      if (isOn) this.playNext();
    }
  }

  connectToVisualizer() {
    if (!audioCtx) return;
    if (this.audioSource) return;

    try {
      this.audioSource = audioCtx.createMediaElementSource(this.audio);
      // Connect to FM effects chain if available, otherwise destination
      if (fmFilter) {
        this.audioSource.connect(fmFilter);
      } else {
        this.audioSource.connect(audioCtx.destination);
      }
    } catch (e) {
      console.warn('Visualizer connection failed:', e);
    }
  }

  playNext() {
    if (this.playlist.length === 0) return;
    
    this.currentIndex = (this.currentIndex + 1) % this.playlist.length;
    const file = this.playlist[this.currentIndex];
    
    const url = URL.createObjectURL(file);
    this.audio.src = url;
    this.audio.volume = 1.0;
    this.audio.play().catch(e => console.error('Play failed:', e));
    
    // Update UI
    const metadata = this.parseFilename(file.name);
    lastSong.title = metadata.title;
    lastSong.artist = metadata.artist;
    
    songTitle.textContent = lastSong.title;
    songArtist.textContent = lastSong.artist;
    stopTaglineRotation();
    
    // Ensure visualizer is connected
    this.connectToVisualizer();
    this.isFading = false;
  }

  parseFilename(name) {
    // Basic "Artist - Title.mp3" parser
    const nameWithoutExt = name.replace(/\.[^/.]+$/, "");
    if (nameWithoutExt.includes(' - ')) {
      const parts = nameWithoutExt.split(' - ');
      return { artist: parts[0].toUpperCase(), title: parts[1] };
    }
    return { artist: 'LOCAL LIBRARY', title: nameWithoutExt };
  }

  checkForCrossfade() {
    if (this.isFading || this.audio.paused) return;
    
    const timeLeft = this.audio.duration - this.audio.currentTime;
    // Start crossfade 8 seconds before end
    if (timeLeft > 0 && timeLeft <= 8) {
      this.startCrossfade();
    }
  }

  startCrossfade() {
    this.isFading = true;
    console.log('Starting crossfade/DJ break...');
    
    // Fade out over 4 seconds
    const fadeDuration = 4000;
    const step = 0.05;
    const interval = fadeDuration * step;
    
    let vol = 1.0;
    const timer = setInterval(() => {
      vol -= step;
      if (vol <= 0) {
        vol = 0;
        clearInterval(timer);
        this.audio.pause();
        this.triggerBreakOrNext();
      }
      this.audio.volume = vol;
    }, interval);
  }

  triggerBreakOrNext() {
    // 60% chance of ANY break transition
    if (Math.random() < 0.6) {
        // DECISION: 90% Short Snippet (Cheap), 10% Full Break (Expensive)
        if (Math.random() < 0.9) {
            this.triggerShortSnippet();
        } else {
            triggerDJBreak();
        }
    } else {
        // Just play next song (Gapless-ish)
        this.playNext();
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
    showPanel('djbreak');
    
    speakDJBreak(text);
  }
  
  handleSongEnd() {
    if (!this.isFading) this.playNext();
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
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

// Hook up events
document.getElementById('musicFolder').addEventListener('change', (e) => {
  musicPlayer.loadFiles(e.target.files);
});

document.getElementById('loadBtn').addEventListener('click', () => {
  document.getElementById('musicFolder').click();
});

// Update powerOn to use local music if available
// (Modified logic in powerOn function below)


// --- Global click handler to overcome autoplay restrictions ---
let hasTriedManualPlay = false;
document.addEventListener('click', () => {
  if (isOn && !musicPlayer.playlist.length && spotifyCtrl && !hasTriedManualPlay) {
    hasTriedManualPlay = true;
    spotifyCtrl.play().then(() => {
      console.log('Spotify playing after user click!');
    }).catch(e => {
      console.warn('Manual play also failed:', e);
    });
  }
});

// --- Init ---
songTitle.textContent  = STATION_CONFIG.stationName;
songArtist.textContent = 'PLAYING THE HITS, DEDICATED TO YOU';

// --- Expose for testing ---
window.triggerDJBreak = triggerDJBreak;
window.triggerQuickID = triggerQuickID;
