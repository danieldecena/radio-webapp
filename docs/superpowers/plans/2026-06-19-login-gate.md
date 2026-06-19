# Login Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-screen name-entry gate to `player.html` that Pauline unlocks once by typing her name; subsequent visits skip straight to the player.

**Architecture:** A `#gate` div overlay sits on top of the existing player markup. On page load, JS checks `localStorage.rom_unlocked`; if set, the gate is removed immediately. Otherwise the gate is shown, name is validated client-side, a welcome animation plays, then the overlay fades out and localStorage is set.

**Tech Stack:** Vanilla HTML/CSS/JS, `localStorage` API, CSS transitions + keyframe animations.

## Global Constraints

- No external dependencies or frameworks — vanilla JS only
- Input font-size must be ≥ 16px to prevent iOS Safari zoom on focus
- Unlock word is `"pauline"` compared case-insensitively after `.trim()` — exact string from spec
- localStorage key is `rom_unlocked`, value `"1"`
- `npm test` (runs `test/smoke.mjs`) must pass after every commit

---

### Task 1: Gate HTML + CSS

**Files:**
- Modify: `public/player.html:65` (insert `#gate` div after `<body>`)
- Modify: `public/style.css:831` (append gate rules at end of file)

**Interfaces:**
- Produces: `#gate`, `#gate-inner`, `#gate-form`, `#gate-input`, `#gate-btn`, `#gate-welcome` DOM elements; `.shake` class; `#gate.fade-out` transition state — all consumed by Task 2 JS

- [ ] **Step 1: Insert `#gate` HTML block into `player.html`**

Open `public/player.html`. After line 65 (`<body>`), insert the following block (so it becomes lines 66–82, pushing existing content down):

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

- [ ] **Step 2: Append gate CSS rules to `style.css`**

Open `public/style.css`. Append after the final `}` on the last line (after the `@supports` block, currently line 831):

```css

/* ── Gate overlay ─────────────────────────────────── */
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
  font-size: 1.6rem;
  letter-spacing: 0.15em;
  color: #f0a500;
  margin: 0 0 0.25rem;
}
.gate-sub,
.gate-tagline {
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
  font-size: 1rem;
  padding: 0.6rem 1rem;
  text-align: center;
  width: 200px;
  outline: none;
  letter-spacing: 0.08em;
}
#gate-input:focus {
  border-color: #ffc940;
  box-shadow: 0 0 8px rgba(240, 165, 0, 0.3);
}

#gate-btn {
  background: transparent;
  border: 1px solid #f0a500;
  color: #f0a500;
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  padding: 0.5rem 1.5rem;
  cursor: pointer;
}
#gate-btn:hover { background: rgba(240, 165, 0, 0.1); }

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

- [ ] **Step 3: Verify `npm test` passes**

```bash
cd /Users/home/radio
npm test
```

Expected: all tests pass. The smoke suite checks manifest/disk consistency — no audio files changed, so it must pass.

- [ ] **Step 4: Manual visual check**

Serve locally:
```bash
npm run dev
```
Open `http://localhost:8888/player.html`. Expected:
- Full-screen dark overlay covers the player
- "96.6 ROM RADIO" title in amber
- "Victoria's station for love" subtitle in grey
- Input field with amber border
- "▶ TUNE IN" button below input

- [ ] **Step 5: Commit**

```bash
git add public/player.html public/style.css
git commit -m "Add gate overlay HTML and CSS to player.html"
```

---

### Task 2: Gate JavaScript logic

**Files:**
- Modify: `public/player.html:214` (insert new `<script>` block before `</body>`)

**Interfaces:**
- Consumes: `#gate`, `#gate-form`, `#gate-input`, `#gate-btn`, `#gate-welcome`, `.shake`, `#gate.fade-out` from Task 1
- Produces: none (this is the terminal task)

- [ ] **Step 1: Insert gate JS block into `player.html`**

Open `public/player.html`. Find the line `</body>` (currently the last line, now shifted by the Task 1 insertion). Insert the following block immediately before `</body>`:

```html
<script>
(function () {
  var gate = document.getElementById('gate');
  if (!gate) return;

  // Return visitor — skip gate entirely
  if (localStorage.getItem('rom_unlocked') === '1') {
    gate.remove();
    return;
  }

  var input = document.getElementById('gate-input');
  var btn = document.getElementById('gate-btn');
  var form = document.getElementById('gate-form');
  var welcome = document.getElementById('gate-welcome');

  function tryUnlock() {
    if (input.value.trim().toLowerCase() !== 'pauline') {
      input.classList.remove('shake');
      void input.offsetWidth; // force reflow so animation re-triggers
      input.classList.add('shake');
      input.value = '';
      input.addEventListener('animationend', function () {
        input.classList.remove('shake');
      }, { once: true });
      return;
    }
    form.hidden = true;
    welcome.hidden = false;
    setTimeout(function () {
      gate.classList.add('fade-out');
      gate.addEventListener('transitionend', function () {
        gate.remove();
        localStorage.setItem('rom_unlocked', '1');
      }, { once: true });
    }, 2000);
  }

  btn.addEventListener('click', tryUnlock);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') tryUnlock();
  });
  input.focus();
})();
</script>
```

Note: `var` used deliberately to avoid any ES6 scoping issues in the IIFE on older Safari; the rest of the codebase uses `const`/`let` so this is a deliberate isolation choice.

- [ ] **Step 2: Verify `npm test` passes**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Manual smoke test — fresh visit**

Clear localStorage first:
```js
// In browser DevTools console:
localStorage.removeItem('rom_unlocked')
```

Reload `http://localhost:8888/player.html`. Expected sequence:
1. Gate overlay appears (player hidden behind it)
2. Input is auto-focused
3. Type "wrong" → press Enter → input shakes, clears, re-focuses
4. Type "PAULINE" (uppercase) → press Enter → form disappears, "Welcome, Pauline ♥" fades in
5. After ~2 seconds → overlay fades out → player is revealed

- [ ] **Step 4: Manual smoke test — return visit**

Without clearing localStorage, reload the page. Expected:
- Gate does NOT appear
- Player loads normally, no overlay flicker

- [ ] **Step 5: iPhone Safari check**

Open `http://<your-local-ip>:8888/player.html` on iPhone Safari (same Wi-Fi network). Expected:
- Gate covers full screen
- Tapping the input does NOT zoom the page (font-size is 1rem = 16px)
- Keyboard opens without breaking layout
- Unlock flow works identically

- [ ] **Step 6: Commit**

```bash
git add public/player.html
git commit -m "Add gate JavaScript: unlock on 'Pauline', localStorage persistence"
```
