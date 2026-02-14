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
    // Enable shuffle to play through the entire playlist
    ctrl.setShuffle(true);
    ctrl.addListener('playback_update', (e) => {
      if (!isOn) return;
      if (e.data && e.data.title) {
        lastSong.title  = e.data.title;
        lastSong.artist = (e.data.artist || '').toUpperCase();
        stopTaglineRotation();
        songTitle.textContent  = lastSong.title;
        songArtist.textContent = lastSong.artist;
      }
      // Auto-advance to next track when current song ends
      if (e.data && e.data.isPaused && e.data.position >= e.data.duration - 1) {
        ctrl.skipToNext();
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

// --- DJ Breaks ---
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

function scheduleDJBreaks() {
  clearInterval(breakInterval);
  clearTimeout(breakTimeout);
  const now          = new Date();
  const secsIntoHour = now.getMinutes() * 60 + now.getSeconds();
  const cycleLen     = 13 * 60;
  const secsUntil    = cycleLen - (secsIntoHour % cycleLen);

  breakTimeout = setTimeout(() => {
    if (isOn) triggerDJBreak();
    breakInterval = setInterval(() => { if (isOn) triggerDJBreak(); }, cycleLen * 1000);
  }, secsUntil * 1000);
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

  if (spotifyCtrl) {
    try { spotifyCtrl.play(); } catch(e) { console.warn('Spotify play:', e); }
  }

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

  // Fire break if right at a cycle boundary
  const now2 = new Date();
  const secs  = now2.getMinutes() * 60 + now2.getSeconds();
  if (secs % (13 * 60) < 30) { await sleep(1500); if (isOn) triggerDJBreak(); }

  scheduleDJBreaks();
}

// --- Power Off ---
function powerOff() {
  isOn = false;
  clearInterval(eqInterval);
  clearInterval(clockInterval);
  clearInterval(breakInterval);
  clearTimeout(breakTimeout);
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

// --- Init ---
songTitle.textContent  = STATION_CONFIG.stationName;
songArtist.textContent = 'PLAYING THE HITS, DEDICATED TO YOU';
