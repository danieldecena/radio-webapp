#!/usr/bin/env python3
"""
build_shows.py — Render the full music library into permanent "show" files.

These MP3s are pre-mixed (crossfades + DJ drops + broadcast voice processing
baked in), so the app just plays a finished file. No ElevenLabs, no serverless,
no quota — it plays forever, offline included.

Output:  public/shows/show_<n>.mp3  +  show_<n>.cue.json  +  manifest.json

Usage:
  python3 scripts/build_shows.py --plan            # split library, write manifest only
  python3 scripts/build_shows.py --show 0          # render one show (timeout-friendly)
  python3 scripts/build_shows.py --all             # render every show
"""

import argparse
import json
import random
from pathlib import Path

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from render_show import render_show  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
MUSIC_DIR = ROOT / "public" / "music"
SNIPPET_DIR = ROOT / "public" / "audio" / "snippets"
SHOWS_DIR = ROOT / "public" / "shows"
MANIFEST = SHOWS_DIR / "manifest.json"

TRACKS_PER_SHOW = 14   # ~40 min radio shows; render locally via --all
DROP_EVERY = 3         # a DJ drop roughly every N tracks
SEED = 966             # deterministic ordering (96.6!)


def music_tracks():
    return sorted(p for p in MUSIC_DIR.glob("*.mp3"))


BREAKS_DIR = ROOT / "public" / "audio" / "breaks"
BREAKS_MANIFEST = BREAKS_DIR / "breaks_manifest.json"


def snippets():
    """Drop pool for shows.

    Once the announcement-style breaks are voiced (generate_dj_breaks.js),
    prefer the talk-ups / station IDs / shorts from breaks_manifest.json so
    shows segue like a real DJ. Until then, fall back to the short station-ID
    clips already in audio/snippets/.
    """
    if BREAKS_MANIFEST.exists():
        try:
            data = json.loads(BREAKS_MANIFEST.read_text())
            cats = data.get("categories", {})
            pool = []
            for key in ("talkups", "stationids", "short"):
                for entry in cats.get(key, []):
                    f = ROOT / "public" / entry["file"]
                    if f.exists():
                        pool.append(f)
            if pool:
                return sorted(pool)
        except Exception:
            pass
    return sorted(p for p in SNIPPET_DIR.glob("*.mp3"))


def plan_shows():
    tracks = music_tracks()
    rnd = random.Random(SEED)
    rnd.shuffle(tracks)
    shows = [tracks[i:i + TRACKS_PER_SHOW]
             for i in range(0, len(tracks), TRACKS_PER_SHOW)]
    return shows


def build_drop_list(n_tracks, rnd, snips):
    """Return a list of length n_tracks-1; a snippet on some transitions, else None."""
    drops = []
    for i in range(n_tracks - 1):
        drops.append(rnd.choice(snips) if (i + 1) % DROP_EVERY == 0 else None)
    return drops


def render_one(index, shows, snips):
    SHOWS_DIR.mkdir(parents=True, exist_ok=True)
    tracks = shows[index]
    rnd = random.Random(SEED + index)
    intro = rnd.choice(snips)
    drops = build_drop_list(len(tracks), rnd, snips)
    out = SHOWS_DIR / f"show_{index}.mp3"
    cue = render_show([str(t) for t in tracks], [str(d) if d else None for d in drops],
                      str(out), crossfade=7.0, intro_drop=str(intro))
    return out, cue


def write_manifest(shows):
    SHOWS_DIR.mkdir(parents=True, exist_ok=True)
    entries = []
    for i, tracks in enumerate(shows):
        cue_path = SHOWS_DIR / f"show_{i}.cue.json"
        mp3_path = SHOWS_DIR / f"show_{i}.mp3"
        entries.append({
            "id": i,
            "title": f"96.6 ROM — Show {i + 1}",
            "file": f"shows/show_{i}.mp3",
            "cue": f"shows/show_{i}.cue.json",
            "tracks": len(tracks),
            "rendered": mp3_path.exists() and cue_path.exists(),
        })
    MANIFEST.write_text(json.dumps({"shows": entries}, indent=2))

    # Also emit an inlined data file so player.html works when opened directly
    # in a browser (file://) without a server — <script src> loads fine from
    # file://, unlike fetch(). Includes each rendered show's cue sheet.
    cues = {}
    for i, _ in enumerate(shows):
        cue_path = SHOWS_DIR / f"show_{i}.cue.json"
        if cue_path.exists():
            try:
                cues[str(i)] = json.loads(cue_path.read_text())
            except Exception:
                pass
    data = {"shows": entries, "cues": cues}
    (SHOWS_DIR / "data.js").write_text(
        "window.SHOWS_DATA = " + json.dumps(data, indent=2) + ";\n"
    )
    return entries


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--plan", action="store_true")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--show", type=int)
    args = ap.parse_args()

    shows = plan_shows()
    snips = snippets()
    if not shows:
        raise SystemExit("No music found in public/music/ — add .mp3 files first.")
    if not snips:
        raise SystemExit("No DJ drops found — add clips to public/audio/snippets/ or voice breaks first.")
    print(f"{len(music_tracks())} tracks -> {len(shows)} shows "
          f"(~{TRACKS_PER_SHOW} tracks each)")

    if args.plan:
        write_manifest(shows)
        print(f"Manifest written: {MANIFEST.relative_to(ROOT)}")
        return

    if args.show is not None:
        out, cue = render_one(args.show, shows, snips)
        write_manifest(shows)
        print(f"Rendered {out.name}: {cue['duration']/60:.1f} min, "
              f"{len(cue['tracks'])} tracks")
        return

    if args.all:
        for i in range(len(shows)):
            out, cue = render_one(i, shows, snips)
            print(f"  show_{i}.mp3: {cue['duration']/60:.1f} min")
        write_manifest(shows)
        print("All shows rendered.")
        return

    ap.print_help()


if __name__ == "__main__":
    main()
