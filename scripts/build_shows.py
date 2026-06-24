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
import datetime
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


def dj_text_map():
    """Map each voiced break file (rel 'audio/breaks/..') -> its spoken text."""
    m = {}
    if BREAKS_MANIFEST.exists():
        try:
            data = json.loads(BREAKS_MANIFEST.read_text())
            for entries in data.get("categories", {}).values():
                for e in entries:
                    m[e["file"]] = e.get("text", "")
            for entries in data.get("special", {}).values():
                for e in entries:
                    m[e["file"]] = e.get("text", "")
            for e in data.get("banter", []):
                m[e["file"]] = e.get("text", "")
        except Exception:
            pass
    return m


def break_pools():
    """(talkups, stationids, banter) as rel file paths from the voiced manifest."""
    talkups, ids, banter = [], [], []
    if BREAKS_MANIFEST.exists():
        try:
            data = json.loads(BREAKS_MANIFEST.read_text())
            cats = data.get("categories", {})
            talkups = [e["file"] for e in cats.get("talkups", [])
                       if (ROOT / "public" / e["file"]).exists()]
            ids = [e["file"] for e in cats.get("stationids", [])
                   if (ROOT / "public" / e["file"]).exists()]
            banter = [e["file"] for e in data.get("banter", [])
                      if (ROOT / "public" / e["file"]).exists()]
        except Exception:
            pass
    if not talkups and not ids:  # fallback to legacy snippets
        ids = [str(p.relative_to(ROOT / "public")) for p in SNIPPET_DIR.glob("*.mp3")]
    return talkups, ids, banter


def special_pool(date_key):
    """Voiced special-date breaks (e.g. birthday '06-25') for a given MM-DD."""
    out = []
    if date_key and BREAKS_MANIFEST.exists():
        try:
            data = json.loads(BREAKS_MANIFEST.read_text())
            for e in data.get("special", {}).get(date_key, []):
                if (ROOT / "public" / e["file"]).exists():
                    out.append(e["file"])
        except Exception:
            pass
    return out


def render_broadcast(n_tracks=50, banter_every=8, crossfade=7.0, hours=None,
                     special_date=None):
    """Render ONE long continuous broadcast mix + an enriched cue.

    The cue adds two fields the broadcast-clock player needs:
      • entryMarkers — clean tune-in points (track downbeats) so a long-gap
        re-tune lands on a song start, not mid-word.
      • djMeta — per-break {start,end,kind,text} so the UI can show what the
        DJ is saying and which kind of break (talkup / stationid / banter).
    """
    SHOWS_DIR.mkdir(parents=True, exist_ok=True)
    all_tracks = music_tracks()
    if not all_tracks:
        raise SystemExit("No music in public/music/.")
    rnd = random.Random(SEED)
    rnd.shuffle(all_tracks)
    if hours:
        n_tracks = min(len(all_tracks), int(hours * 60 / 3.7) + 1)
    tracks = all_tracks[:min(n_tracks, len(all_tracks))]

    talkups, ids, banter = break_pools()
    tmap = dj_text_map()

    # Special date (birthday, Valentine's, anniversary…): auto-detect today's
    # MM-DD unless overridden, then fold those breaks in prominently.
    if special_date is None:
        special_date = datetime.date.today().strftime("%m-%d")
    special = special_pool(special_date)
    if special:
        print(f"Special date {special_date}: {len(special)} dedicated break(s) folded in.")

    # On a special day the very first thing you hear is the dedication.
    intro = special[0] if special else (
        rnd.choice(ids) if ids else (rnd.choice(talkups) if talkups else None))
    special_queue = list(special[1:])  # remaining specials, played early & often

    drops = []
    bcount = 0
    for i in range(len(tracks) - 1):
        if special_queue and i % 2 == 0:
            drops.append(special_queue.pop(0))
        elif banter and (i + 1) % banter_every == 0:
            drops.append(banter[bcount % len(banter)]); bcount += 1
        elif talkups and i % 2 == 0:
            drops.append(rnd.choice(talkups))
        elif ids and i % 4 == 0:
            drops.append(rnd.choice(ids))
        else:
            drops.append(None)

    out = SHOWS_DIR / "broadcast.mp3"
    abs_drops = [str(ROOT / "public" / d) if d else None for d in drops]
    abs_intro = str(ROOT / "public" / intro) if intro else None
    cue = render_show([str(t) for t in tracks], abs_drops, str(out),
                      crossfade=crossfade, intro_drop=abs_intro)

    # --- enrich the cue ---
    starts = [t["start"] for t in cue["tracks"]]
    cue["entryMarkers"] = sorted(set([0.0] + [round(s, 2) for s in starts]))
    ordered = ([intro] if intro else []) + [d for d in drops if d]
    djmeta = []
    for win, f in zip(cue.get("djWindows", []), ordered):
        kind = ("banter" if "banter_" in f
                else "special" if "special_" in f
                else "stationid" if "stationids_" in f
                else "talkup")
        djmeta.append({"start": win[0], "end": win[1], "kind": kind,
                       "text": tmap.get(f, "")})
    cue["djMeta"] = djmeta
    cue["loop"] = True

    (SHOWS_DIR / "broadcast.cue.json").write_text(json.dumps(cue, indent=2))
    (SHOWS_DIR / "broadcast.data.js").write_text(
        "window.BROADCAST_DATA = "
        + json.dumps({"file": "shows/broadcast.mp3", "cue": cue}, indent=2) + ";\n"
    )
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
    ap.add_argument("--broadcast", action="store_true",
                    help="render ONE long continuous mix (broadcast.mp3) for the broadcast clock")
    ap.add_argument("--hours", type=float, help="target length in hours for --broadcast (e.g. 3)")
    ap.add_argument("--tracks", type=int, default=50, help="track count for --broadcast")
    ap.add_argument("--banter-every", type=int, default=8, dest="banter_every")
    ap.add_argument("--date", help="force special-date breaks for MM-DD (e.g. 06-25 for the birthday); defaults to today")
    args = ap.parse_args()

    if args.broadcast:
        out, cue = render_broadcast(n_tracks=args.tracks, banter_every=args.banter_every,
                                    hours=args.hours, special_date=args.date)
        print(f"Rendered {out.name}: {cue['duration']/60:.1f} min, "
              f"{len(cue['tracks'])} tracks, {len(cue.get('djMeta', []))} DJ breaks, "
              f"{len(cue.get('entryMarkers', []))} entry markers")
        return

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
