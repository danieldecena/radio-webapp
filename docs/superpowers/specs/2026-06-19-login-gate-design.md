# Design: Login Gate for 96.6 ROM Radio

**Date:** 2026-06-19  
**Status:** Approved  
**Feature:** Secret entry screen for Pauline

---

## Overview

A full-screen gate overlay is added to `player.html`. First-time visitors see a name entry screen; returning visitors (same device) skip it entirely. The unlock keyword is "Pauline" (case-insensitive). On success, a brief welcome message is shown before the overlay dissolves into the player.

This is a UX experience feature — no server-side auth, no real security. localStorage persistence is intentional; private browsing simply shows the gate every visit, which is acceptable.

---

## Flow

1. `DOMContentLoaded` fires → check `localStorage.getItem('rom_unlocked')`
2. **Already unlocked:** remove `#gate` from DOM immediately → player loads normally
3. **Not unlocked:** gate overlay is visible (rendered in HTML, not injected)
4. User types name → presses Enter or "▶ TUNE IN" button
5. **Wrong name:** `.shake` CSS animation on input, clear value, focus input
6. **Correct name ("pauline", case-insensitive trim):**
   - Hide `#gate-form`
   - Show `#gate-welcome` ("Welcome, Pauline ♥" + tagline)
   - After 2000ms: add `.fade-out` class to `#gate`
   - On `transitionend`: remove `#gate` from DOM; `localStorage.setItem('rom_unlocked', '1')`

The user's Enter/button gesture on step 4 also serves as the browser's required user gesture for audio unlock on iOS Safari.

---

## HTML Changes — `public/player.html`

Insert before the existing player markup (inside `<body>`):

```html
<div id="gate">
  <div id="gate-inner">
    <h1 class="gate-title">96.6 ROM RADIO</h1>
    <p class="gate-sub">Victoria's station for love</p>
    <div id="gate-form">
      <input id="gate-input" type="text" placeholder="your name…" autocomplete="off" spellcheck="false">
      <button id="gate-btn">▶ TUNE IN</button>
    </div>
    <p id="gate-welcome" hidden>
      Welcome, Pauline ♥<br>
      <span class="gate-tagline">Victoria's station for love</span>
    </p>
  </div>
</div>
```

---

## CSS Changes — `public/style.css`

New rules (do not modify existing rules):

```css
/* Gate overlay */
#gate {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #0a0a0a;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.5s ease;
}
#gate.fade-out { opacity: 0; }

#gate-inner {
  text-align: center;
  padding: 2rem;
  max-width: 340px;
  width: 100%;
}

.gate-title {
  /* Match player.html's existing station-name style */
  font-size: 1.6rem;
  letter-spacing: 0.15em;
  color: #f0a500; /* amber accent */
  margin-bottom: 0.25rem;
}
.gate-sub, .gate-tagline {
  color: #888;
  font-size: 0.8rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

#gate-form {
  margin-top: 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
}

#gate-input {
  background: transparent;
  border: 1px solid #f0a500;
  color: #f0a500;
  font-size: 1rem;        /* >= 16px prevents iOS zoom */
  padding: 0.6rem 1rem;
  text-align: center;
  width: 200px;
  outline: none;
  letter-spacing: 0.08em;
}
#gate-input:focus { border-color: #ffc940; box-shadow: 0 0 8px rgba(240,165,0,0.3); }

#gate-btn {
  background: transparent;
  border: 1px solid #f0a500;
  color: #f0a500;
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  padding: 0.5rem 1.5rem;
  cursor: pointer;
}
#gate-btn:hover { background: rgba(240,165,0,0.1); }

#gate-welcome {
  margin-top: 2rem;
  color: #f0a500;
  font-size: 1.4rem;
  line-height: 1.8;
  letter-spacing: 0.06em;
}

@keyframes gate-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-8px); }
  40%, 80% { transform: translateX(8px); }
}
.shake { animation: gate-shake 0.4s ease; }
```

---

## JS Changes — `public/player.html` inline script

Add after existing player script (or as a dedicated `<script>` block at bottom of body):

```js
(function () {
  const gate = document.getElementById('gate');
  if (!gate) return;

  // Return visitor — skip gate entirely
  if (localStorage.getItem('rom_unlocked') === '1') {
    gate.remove();
    return;
  }

  const input = document.getElementById('gate-input');
  const btn = document.getElementById('gate-btn');
  const form = document.getElementById('gate-form');
  const welcome = document.getElementById('gate-welcome');

  function tryUnlock() {
    const val = input.value.trim().toLowerCase();
    if (val !== 'pauline') {
      input.classList.remove('shake');
      // Force reflow so animation re-triggers if already present
      void input.offsetWidth;
      input.classList.add('shake');
      input.value = '';
      input.addEventListener('animationend', () => input.classList.remove('shake'), { once: true });
      return;
    }
    // Correct — show welcome
    form.hidden = true;
    welcome.hidden = false;
    setTimeout(() => {
      gate.classList.add('fade-out');
      gate.addEventListener('transitionend', () => {
        gate.remove();
        localStorage.setItem('rom_unlocked', '1');
      }, { once: true });
    }, 2000);
  }

  btn.addEventListener('click', tryUnlock);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });
  input.focus();
})();
```

---

## Files Changed

| File | Change |
|---|---|
| `public/player.html` | Add `#gate` HTML block + gate JS script block |
| `public/style.css` | Append gate CSS rules |

No other files change. `npm test` smoke suite unaffected (no manifest or audio file changes).

---

## Testing

**Manual smoke test:**
1. Open `player.html` in a fresh private window (localStorage empty)
2. Gate appears → type wrong name → shake animation, input clears
3. Type "pauline" (lowercase) → welcome message → overlay fades → player loads
4. Reload page → gate does NOT appear
5. Repeat on iPhone Safari — verify no zoom on input tap, gate covers full screen, keyboard doesn't break layout

**Cross-browser:** Chrome, Safari (Mac + iOS), Firefox. No polyfills needed.

**Regression:** `npm test` must still pass after changes.

---

## Out of Scope

- No server-side auth — `localStorage` only
- No password reset / change flow
- No admin gate (separate feature if ever needed)
- No animation on first arrival before the gate appears (gate is visible immediately)
