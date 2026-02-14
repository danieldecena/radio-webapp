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
window.onSpotifyIframeApiReady = (IFrameAPI) => {
  const el = document.getElementById('spotifyEmbed');
  const options = {
    uri: 'spotify:playlist:45dvmYti7Kn9EDRzc31hS4',
    height: 1,
  };
  IFrameAPI.createController(el, options, (ctrl) => {
    spotifyCtrl = ctrl;
    ctrl.addListener('playback_update', (e) => {
      if (!isOn) return;
      if (e.data && e.data.title) {
        lastSong.title  = e.data.title;
        lastSong.artist = (e.data.artist || '').toUpperCase();
        stopTaglineRotation();
        songTitle.textContent  = lastSong.title;
        songArtist.textContent = lastSong.artist;
      }
    });
  });
};

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
async function speakDJBreak(text) {

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

      // Initialize FM radio effects if not already set up
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
  restoreLastHeard();
  showPanel('normal');
  startEQ();
}

// --- Quick Station ID (10-20 sec) ---
function triggerQuickID() {
  const stationIDs = DJ_BREAKS.stationids;
  const text = stationIDs[Math.floor(Math.random() * stationIDs.length)];

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
      await spotifyCtrl.play();
      console.log('Spotify playing!');

      // Wait a moment for playback to start, then seek to random position
      setTimeout(async () => {
        try {
          const state = await spotifyCtrl.getPlaybackState();
          if (state && state.duration) {
            // Seek to random position between 10% and 70% of song
            const randomPosition = Math.floor(state.duration * (0.1 + Math.random() * 0.6));
            await spotifyCtrl.seek(randomPosition);
            console.log(`Tuned in mid-song at ${Math.floor(randomPosition/1000)}s`);
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
  isScanning = true;
  powerBtn.classList.add('on');

  showPanel('scanning');
  scanningText.textContent = 'Searching...';

  function freqToPercent(f) { return ((f - 87.5) / (108 - 87.5)) * 100; }

  const stations = [88.1, 91.3, 93.4];
  for (let i = 0; i < stations.length; i++) {
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

// --- Global click handler to overcome autoplay restrictions ---
let hasTriedManualPlay = false;
document.addEventListener('click', () => {
  if (isOn && spotifyCtrl && !hasTriedManualPlay) {
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
