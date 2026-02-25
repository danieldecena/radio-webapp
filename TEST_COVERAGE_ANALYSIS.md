# Test Coverage Analysis — 93.4 ROM Radio

## Current State

**Zero tests exist.** There are no test files, no test framework, and no CI pipeline configured.
Every line of production code ships without any automated safety net.

---

## Proposed Areas for Improvement (Priority Order)

### 1. Serverless Function Input Validation — `netlify/functions/speak.js` & `api/speak.js`

**Why first:** These are pure Node.js modules (no browser APIs), have clear request/response
contracts, and protect a paid third-party API from misuse. A regression here could expose
the ElevenLabs API key or cause unexpected billing.

**What to test:**

| Scenario | Expected behaviour |
|---|---|
| `GET` request | `405 Method Not Allowed` |
| Missing `ELEVENLABS_API_KEY` env var | `500` with `{ error: 'API key not configured' }` |
| Empty `text` body | `400` with `{ error: 'Invalid text parameter' }` |
| `text` longer than 1000 characters | `400` with `{ error: 'Invalid text parameter' }` |
| ElevenLabs responds with an error status | Forward that status code |
| ElevenLabs responds with audio | `200` with `{ audio: <base64string>, contentType: 'audio/mpeg' }` |
| Malformed JSON body | `500` Internal server error (caught by try/catch) |

Both the Netlify and Vercel functions share almost identical logic but have slightly different
interfaces (`event.body` vs `req.body`, `exports.handler` vs `export default`). Both should
be tested independently. A shared test-fixture helper would avoid duplication.

**Suggested tooling:** Jest (or Vitest) with `node-fetch-mock` / `jest.spyOn(global, 'fetch')`.

---

### 2. `breaks.js` Pure Helper Functions

**Why second:** These functions have no DOM or browser dependencies — they are plain JS and
can be tested in Node without any mocking of browser globals. They are called on every DJ break
and every weighted category pick, so bugs here produce silent incorrect behaviour (wrong break
frequency, invalid category names, etc.).

#### `getWeightedCategory()` — `breaks.js:41`

```js
function getWeightedCategory() { /* uses new Date().getHours() */ }
```

By mocking `Date` (e.g. `jest.useFakeTimers`) test all four time windows:

| Time window | Expected categories in pool |
|---|---|
| 06:00–11:59 (morning) | shoutouts ×3, weather ×3, traffic ×3, commercials ×1, news ×1 |
| 12:00–17:59 (afternoon) | all categories weight 2 |
| 18:00–22:59 (evening) | shoutouts ×3, commercials ×2, weather ×1, traffic ×1, news ×3 |
| 23:00–05:59 (latenight) | shoutouts ×2, news ×4, commercials ×2, weather ×1, traffic ×1 |

Also assert the return value is always one of the five known category keys.

#### `getRandomBreak(category)` — `breaks.js:409`

- Returns a string that exists in `DJ_BREAKS[category]`.
- Throws/returns `undefined` gracefully when given an invalid category (currently untested).
- With `Math.random` mocked to `0` and `0.9999`, verify boundary picks (first and last items).

#### `getAnyRandomBreak()` — `breaks.js:414`

- Always returns a non-empty string.
- The selected category is one of the keys of `DJ_BREAKS`.

#### Data-integrity assertions (static validation)

These are not "unit tests" in the traditional sense but are extremely valuable as snapshot
guards against accidental edits:

```js
// All categories must be non-empty arrays of non-empty strings
Object.entries(DJ_BREAKS).forEach(([cat, items]) => {
  expect(items.length).toBeGreaterThan(0);
  items.forEach(item => expect(typeof item).toBe('string'));
  items.forEach(item => expect(item.trim().length).toBeGreaterThan(0));
});

// SPECIAL_DATES keys must match MM-DD format
Object.keys(SPECIAL_DATES).forEach(key => {
  expect(key).toMatch(/^\d{2}-\d{2}$/);
});

// STATION_CONFIG required fields
expect(STATION_CONFIG.stationName).toBeTruthy();
expect(STATION_CONFIG.partnerName).toBeTruthy();
```

---

### 3. `checkIfDJBreakOccurred(startTime, endTime)` — `app.js:600`

**Why high priority:** This function contains non-trivial modular-arithmetic boundary logic
used to simulate "the station kept broadcasting while you were away." A bug here could mean
returning the wrong break type or incorrectly claiming no break occurred. The function is
pure (takes two timestamps, returns `'full'`, `'quick'`, or `false`) and has no DOM or
browser-API dependency, making it straightforward to unit test.

**Key scenarios:**

| Scenario | Expected return |
|---|---|
| Off for 0 seconds | `false` |
| Off for 59 seconds, not crossing a 7-min boundary | `false` |
| Off for exactly one 7-min (420 s) full cycle | `'full'` |
| Off for more than 420 s | `'full'` |
| Off for > 150 s but < 420 s, crossing a 2.5-min (150 s) quick-ID boundary | `'quick'` |
| Off for exactly 300 s (5 min), no cycle crossed | `false` or whichever applies |
| Edge: `endTime === startTime` | `false` |

The function has an existing edge-case risk: it uses `new Date(startTime).getMinutes()` but
`startTime` is passed as `Date.now()` (a number). The modular arithmetic with `quickIDOffset`
can produce negative values when `startSecs < 90`, which may produce unexpected results from
the `%` operator in JS (which preserves sign). This is worth an explicit test.

---

### 4. `MusicPlayer.parseFilename(name)` — `app.js:1093`

**Why:** Purely string-processing, zero side effects. This determines what track title and
artist are shown in the UI for local music files.

```js
parseFilename(name) {
  const nameWithoutExt = name.replace(/\.[^/.]+$/, "");
  if (nameWithoutExt.includes(' - ')) {
    const parts = nameWithoutExt.split(' - ');
    return { artist: parts[0].toUpperCase(), title: parts[1] };
  }
  return { artist: 'LOCAL LIBRARY', title: nameWithoutExt };
}
```

| Input | Expected output |
|---|---|
| `"The Beatles - Hey Jude.mp3"` | `{ artist: 'THE BEATLES', title: 'Hey Jude' }` |
| `"HeyJude.mp3"` | `{ artist: 'LOCAL LIBRARY', title: 'HeyJude' }` |
| `"Artist - Title - Extra.mp3"` | `{ artist: 'ARTIST', title: 'Title - Extra' }` (only first split) |
| `".mp3"` (no name) | `{ artist: 'LOCAL LIBRARY', title: '' }` |
| `"Artist - .mp3"` | `{ artist: 'ARTIST', title: '' }` |
| `"noextension"` | `{ artist: 'LOCAL LIBRARY', title: 'noextension' }` |

Note: The current implementation uses `parts[1]` only (not `parts.slice(1).join(' - ')`), so
`"A - B - C.mp3"` returns `title: 'B'`, dropping `C`. Whether that is intentional is worth
documenting via a test.

---

### 5. `makeWarmthCurve(amount)` — `app.js:116`

**Why:** Used in the FM audio effects chain. An incorrect curve silently degrades audio quality
with no visible error.

```js
function makeWarmthCurve(amount) { /* returns Float32Array of length 44100 */ }
```

| Assertion | Rationale |
|---|---|
| Returns `Float32Array` of length `44100` | Correct type for `WaveShaper.curve` |
| All values in `[-1, 1]` range | WaveShaper range requirement |
| `curve[22050]` ≈ `0` (midpoint / zero-crossing) | Soft-clipping symmetry |
| `amount = 0` produces identity-like curve | No distortion at zero |
| `amount = 200` produces clipped curve | Maximum saturation shape |

These can run in Node by passing a mock that provides `Float32Array` (which is a global in
modern Node anyway).

---

### 6. `updateClock()` — `app.js:179`

**Why:** Drives the on-screen clock display. The 12-hour conversion logic (`getHours() % 12 || 12`)
has a classic off-by-one risk at midnight and noon.

```js
function updateClock() {
  const h = now.getHours() % 12 || 12;
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
  displayClock.textContent = `${h}:${m} ${ampm}`;
}
```

| Input time | Expected display |
|---|---|
| 00:05 | `12:05 AM` |
| 12:00 | `12:00 PM` |
| 13:30 | `1:30 PM` |
| 23:59 | `11:59 PM` |
| 09:07 | `9:07 AM` |

These require a minimal DOM mock (e.g. jsdom or a simple stub for `displayClock`).

---

### 7. Scheduling Logic — `scheduleDJBreaks()` & `checkLiveDJBreak()` — `app.js:479, 515`

**Why:** Incorrect scheduling means DJ breaks fire at wrong times or not at all. The timing
math interacts with real wall-clock time, making it important to isolate with fake timers.

**Key assertions using `jest.useFakeTimers()`:**

- `scheduleDJBreaks()` sets exactly one `setTimeout` for the next full break and one for the
  next quick ID.
- After the full-break timeout fires, a `setInterval` with a 420-second period is created.
- Calling `scheduleDJBreaks()` a second time clears the previous timers before setting new ones
  (no double-firing).
- `checkLiveDJBreak()` returns `{ type: 'full', secsInto: N }` when the current time is within
  the first 45 seconds of a 7-minute cycle.
- `checkLiveDJBreak()` returns `{ type: 'quick', secsInto: N }` within the first 20 seconds of
  a quick-ID cycle.
- `checkLiveDJBreak()` returns `false` when between scheduled breaks.

---

### 8. `speakDJBreak(text)` Fallback Chain — `app.js:263`

**Why:** There are four fallback tiers (local snippet → ElevenLabs API → Web Speech → text-only).
Ensuring each tier correctly hands off to the next when it fails is critical for the app's
reliability.

This requires more setup (mocking `fetch`, `AudioContext`, `speechSynthesis`) but can be done
with a jsdom + jest environment. Each tier should be tested in isolation:

| Test | Setup | Expected outcome |
|---|---|---|
| Local snippet exists in manifest | Mock `fetch('/audio/snippets/manifest.json')` to return entry | `new Audio(path)` is created, `closeBreakPanel` called on `onended` |
| Local snippet fails, API succeeds | Manifest hit but `Audio.play()` throws; `fetch(TTS_ENDPOINT)` returns valid base64 | `AudioContext.decodeAudioData` called, source started |
| API returns non-ok status, Web Speech available | Mock `fetch` → 503; `window.speechSynthesis` exists | `speechSynthesis.speak(utterance)` called |
| Both API and Web Speech unavailable | Mock both failing | `fallbackTextOnly()` calls `setTimeout(closeBreakPanel, 9000)` |

---

## Recommended Test Setup

### Install testing dependencies

```bash
npm install --save-dev jest jest-environment-jsdom
```

### Suggested folder structure

```
tests/
  unit/
    breaks.test.js          # getWeightedCategory, getRandomBreak, data validation
    parseFilename.test.js   # MusicPlayer.parseFilename
    makeWarmthCurve.test.js # Audio DSP math
    checkDJBreak.test.js    # checkIfDJBreakOccurred, checkLiveDJBreak
    updateClock.test.js     # Clock formatting
  serverless/
    netlify-speak.test.js   # netlify/functions/speak.js
    vercel-speak.test.js    # api/speak.js
  integration/
    djBreakFallback.test.js # speakDJBreak fallback chain (jsdom)
    scheduling.test.js      # scheduleDJBreaks (fake timers)
```

### `package.json` additions

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/tests/**/*.test.js"]
  }
}
```

Use `testEnvironment: "jsdom"` (or override per-file with `@jest-environment jsdom`) only for
the files that test DOM-dependent code.

---

## Impact Summary

| Area | Difficulty | Risk if untested | Lines covered |
|---|---|---|---|
| Serverless function validation | Low | High (billing, security) | ~166 |
| `breaks.js` pure functions + data | Low | Medium (wrong content) | ~429 |
| `checkIfDJBreakOccurred` | Low | Medium (bad continuity logic) | ~26 |
| `MusicPlayer.parseFilename` | Low | Low (cosmetic UI) | ~9 |
| `makeWarmthCurve` | Low | Low (audio quality) | ~13 |
| `updateClock` | Medium (DOM mock) | Low (cosmetic) | ~7 |
| Scheduling logic | Medium (fake timers) | Medium (break frequency) | ~35 |
| `speakDJBreak` fallback chain | High (many mocks) | High (core feature) | ~116 |

Starting with the first four rows gives the highest confidence gain for the lowest setup cost.
