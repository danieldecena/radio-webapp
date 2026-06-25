# Spec — Continuous Mix + Broadcast Clock

**Status:** Draft for review · **Owner:** Daniel · **Date:** 2026-06-24

A design for rendering 96.6 ROM as a single ~3-hour ElevenLabs-voiced mix and
playing it through a "broadcast clock" so the station always feels live — tune
in mid-song, power off and back on and the show has moved on without you.

---

## 1. Goal & the illusion

Today's player loads a discrete show file and starts it from `0:00`. Continuity
is faked in `app.js` with `avgSongLength = 240` guesswork. We replace that with a
single long mix anchored to real time, so:

- Powering on **seeks to where the broadcast "is" right now**, not the start.
- Powering off, waiting, powering on → you land **further along**, mid-song or
  mid-DJ-break. Nothing rewinds.
- The same moment plays on every device — it behaves like a real station feed.
- The file **loops** seamlessly, so the station never goes dead.

This is the single highest-leverage change: it makes every other feature
(now-playing, DJ talk-ups, special dates) sit on top of a believable timeline.

## 2. Core architecture — the broadcast clock

One constant and one formula drive everything:

```js
const BROADCAST_EPOCH = 1735689600000;   // fixed origin (e.g. 2025-01-01 00:00 local)
const mixDuration = SHOW.duration;        // seconds, from cue.json

function broadcastPosition() {
  const elapsed = (Date.now() - BROADCAST_EPOCH) / 1000;
  return elapsed % mixDuration;            // seconds into the loop, right now
}
```

On power-on the position comes from the wall clock, but *how* we land depends on
how long you were gone — see the resume policy in §2a. We store only a single
**last-off timestamp** (to measure the gap), not playback position. This still
deletes the fragile `lastSongIndex / lastSongPosition` math and the
`romRadioState` blob in `app.js`.

**Drift:** `<audio>` can drift from the formula over long sessions. Once per
~30 s, if `|audio.currentTime - broadcastPosition()| > 1.5 s`, hard-resync by
seeking. Keep the threshold above ~1 s so we don't audibly stutter.

**Loop seam:** when the audio element ends (or nears `mixDuration`), seek back to
`broadcastPosition()` (will be a small number) and continue. Render a short
crossfade-friendly head/tail (see §4) so the wrap is inaudible.

## 2a. Resume policy — pause tiers

The clock advances by however long you were away, but a clean re-entry shouldn't
drop you mid-syllable after a long absence. On power-on we measure
`gap = Date.now() - lastOffTime` and pick a behavior:

| Tier | Gap | Behavior | Feel |
| --- | --- | --- | --- |
| **Tape resume** | `< 20 s` | Resume at the *exact* spot you left (no jump). | "I barely paused it." |
| **Live drift** | `20 s – ~45 min` | Seek to `broadcastPosition()` — advance by real elapsed, land wherever the timeline is (mid-song OK). | "The station kept going while I stepped away." |
| **Fresh re-tune** | `≥ ~45 min` (tunable; e.g. ≥ 1 loop) | Take `broadcastPosition()`, then **snap to the nearest clean entry marker** (station-ID / DJ intro / track top). Optional "welcome back" ID bed. | "I'm tuning into a fresh part of the show." |

```js
function resumeTarget(gapSec) {
  if (gapSec < 20)        return { at: lastOffPosition, snap: false };   // tape resume
  const live = broadcastPosition();
  if (gapSec < 45 * 60)   return { at: live, snap: false };              // live drift
  return { at: snapToMarker(live), snap: true };                         // fresh re-tune
}
```

`snapToMarker(t)` picks the nearest `entryMarkers` entry at or after `t` (wrapping
if needed). Thresholds (20 s, 45 min) are constants to tune by ear. For a **very**
long gap (e.g. ≥ one full loop), optionally route to a designated cold-open marker
or the current daypart's top (§7) so re-entry feels deliberately fresh rather than
arbitrary.

**Entry markers (new cue field).** The renderer knows exactly where every clean
seam is, so it emits them:

```json
"entryMarkers": [0.0, 212.4, 503.1, ...]   // good tune-in points: after each ID / at track tops
```

This is the one piece that makes "fresh re-tune" land on a downbeat or a DJ
"you're listening to 96.6 ROM" instead of the middle of a word — the payoff of
baking the mix offline: we *know* where the good seams are.

## 3. Cue sheet (drives the UI)

Reuse the existing shape from `render_show.py`, just longer:

```json
{
  "duration": 10800.0,
  "tracks":  [ { "start": 0.0, "title": "..." }, ... ],
  "djWindows": [ [start, end], ... ],
  "djMeta":  [ { "start": 8.0, "end": 22.0, "kind": "talkup", "text": "..." } ]
}
```

- `tracks` → now-playing: pick the last track whose `start <= broadcastPosition()`.
- `djWindows` → "DJ ON AIR" indicator: true when `broadcastPosition()` falls in a
  window (you already compute these in `render_show.py`).
- `djMeta` (new, optional) → lets the panel show the actual line being spoken and
  its category, for the on-screen DJ-break text.

## 4. Render pipeline (extend, don't replace)

`scripts/render_show.py` already does crossfades, loudnorm, sidechain ducking,
the broadcast voice chain, sweeper, and master glue. Changes:

1. **Long-form driver.** `build_shows.py` gains a mode that selects ~45–55 tracks
   (3 hrs) instead of `TRACKS_PER_SHOW`, with no repeats, and renders one file
   `public/shows/broadcast_<daypart>.mp3` + `.cue.json`.
2. **Memory/runtime.** A 3-hr filtergraph in one ffmpeg pass is heavy. Render in
   **segments** (e.g. 6×30-min) then concatenate with a crossfade at the joins,
   or stream with `-f segment`. Avoids giant filtergraphs and lets a failed
   segment re-render cheaply.
3. **Loop-safe ends.** Apply the master fade only conceptually — for a looping
   file we instead want the **tail to crossfade into the head**. Render a short
   "wrap" by crossfading the last track's outro with the first track's intro so
   the seam (§2) is seamless.
4. **DJ drops at known timestamps.** Because breaks are baked in, every voice line
   lands at a fixed offset → write it to `djMeta` so the player can display it.

Output target: 3 hr @ 160 kbps ≈ **~210 MB**.

## 5. DJ breaks — improvements (ElevenLabs-voiced)

Voiced once, offline, via `scripts/generate_dj_breaks.js` + your key, then baked
in by the renderer. Content upgrades over the current pool:

- **Back- and forward-announce.** "That was *X*… and coming up, *Y* here on
  96.6 ROM." The renderer knows both neighbors at each transition, so generate
  these per-join instead of generic talk-ups.
- **Time checks that match the clock.** Since position maps to wall-clock via the
  broadcast epoch, a break at offset *t* corresponds to a known time-of-day band;
  voice "just after nine here in Victoria" in the right segments.
- **Special-date drops** (`SPECIAL_DATES` in `breaks.js`) folded in at a couple of
  fixed points per loop — birthday, Valentine's, anniversary dedications to
  Pauline.
- **Station-ID beds.** Short IDs over a music bed + your sweeper sting between
  segments so any tune-in point sounds intentional.
- **Quota planning.** 3 hrs implies many lines; run `DRY_RUN=1` first to estimate
  characters and stay within tier. Voice the high-value lines (announces,
  dedications) first; fall back to existing snippets for filler.

## 6. Player changes (`public/player.html`)

- Add the broadcast-clock module (§2): seek-on-power-on, drift resync, loop wrap.
- Now-playing + DJ-on-air read from cue (§3) on a 1 s tick.
- **Tune-in flavor:** brief static burst → clear on first lock, reinforcing
  "caught an existing broadcast." (You already have a noise generator in `app.js`
  to port.)
- Keep `data.js` inlining so `file://` opening still works (Safari blocks
  `fetch` from disk).
- Remove the legacy resume/localStorage path once the clock lands.

## 7. Dayparting (optional, phase 2)

Same clock, different file by real time-of-day:

```
06–11  broadcast_morning.mp3     (upbeat drive)
11–18  broadcast_day.mp3         (the hits)
18–23  broadcast_evening.mp3
23–06  broadcast_latenight.mp3   (quiet-storm love songs for Pauline)
```

Pick the file on power-on from `new Date().getHours()`; each has its own cue and
its own broadcast epoch. Start with **one** 3-hr file; add dayparts later.

## 8. Edge cases & risks

- **PWA offline caching of ~210 MB.** Do **not** pre-cache the mix in the service
  worker — it'll blow mobile storage budgets and fail installs. Serve it via HTTP
  range requests (Netlify supports them), cache-on-demand with a size cap, and
  keep `sw.js` pre-caching only the shell (HTML/CSS/JS/icons). Document that full
  offline = one deliberate "download this show" action, not automatic.
- **Seek requires range support.** Seeking a long MP3 to an arbitrary offset needs
  `Accept-Ranges`. Fine on Netlify; verify `dev-server.js` (it currently reads the
  whole file — add `Range` handling for realistic local testing).
- **iOS audio unlock.** Keep the existing synchronous `AudioContext.resume()` on
  the power tap; the seek happens right after unlock.
- **VBR vs CBR seeking.** Use CBR (`-b:a 160k`, already set) so `currentTime`
  seeks land accurately; VBR makes offset seeks imprecise.
- **Clock skew / timezones.** Broadcast epoch is a fixed UTC ms value; everyone
  maps consistently. Device clock being wrong shifts where they tune in — accept
  it (it's a personal station), or fetch server time if it ever matters.
- **Render cost/iteration.** Segmented rendering (§4.2) keeps re-renders cheap
  when you tweak one part.

## 9. Rollout phases

1. **Broadcast clock on existing shows.** Wire §2 into `player.html` against a
   current 40-min show. Feel the illusion before rendering anything new. *(small,
   reversible, no render)*
2. **Long-mix renderer.** Add the 3-hr segmented mode to `build_shows.py`; render
   one `broadcast_day.mp3` with existing snippets. Validate cue↔file with the
   smoke test (extend it for the new file).
3. **Voiced breaks.** Generate ElevenLabs announces/dedications, add `djMeta`,
   re-render. Human listen-test.
4. **Range-aware serving + SW guard.** Range in `dev-server.js`, confirm Netlify,
   ensure SW doesn't cache the big file.
5. **Dayparting.** Add morning/late-night files.

## 10. Open decisions

- **Broadcast epoch:** anchor to a date meaningful to you/Pauline (anniversary?)
  so "time since" has sentiment, or just `2025-01-01`.
- **Loop length vs variety:** 3 hr with ~50 tracks — happy with one loop, or want
  a 2-file rotation to double variety before repeats?
- **How "live" should DJ time-checks be?** Generic ("evening, Victoria") is safe
  across the whole loop; specific ("9:40") only works if a break's offset is
  pinned to a time-of-day, which dayparting makes exact.
- **Bitrate:** 160 kbps (~210 MB) vs 128 kbps (~170 MB) for lighter mobile load.
```
