#!/usr/bin/env python3
"""
render_show.py — Pre-render a radio "show" as a single MP3.

Takes a list of music tracks and short DJ voice drops, crossfades the tracks
into one continuous bed, overlays the voice drops with sidechain ducking
(music dips under the DJ), and writes:
  - <out>.mp3        the finished show
  - <out>.cue.json   timestamp -> track title, for now-playing display

This removes all runtime audio machinery: no crossfade JS, no TTS API, no
serverless function. The browser just plays one file.

Usage (see build_shows.py for the real driver):
  python3 render_show.py
"""

import json
import subprocess
import sys
from pathlib import Path


def probe_duration(path: str) -> float:
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", path],
        text=True,
    )
    return float(out.strip())


SWEEPER = "public/audio/fx/sweeper.wav"


def render_show(tracks, drops, out_path, crossfade=6.0, intro_drop=None,
                voice_gain=2.2, sweeper=SWEEPER, loudness=-14.0):
    """
    tracks: list of music file paths (played in order, crossfaded).
    drops:  list of voice file paths — drops[i] plays over the transition
            INTO tracks[i+1] (so len(drops) <= len(tracks)-1). Use None to
            skip a transition.
    intro_drop: optional voice file played over the very start of track 0.
    sweeper:    short fx stinger played just before each DJ drop (set None to skip).
    loudness:   integrated LUFS target for per-track normalization (radio = ~-14).

    Radio-style processing:
      • each track loudness-normalized so volumes are even
      • a sweeper stinger fires right before each DJ station ID
      • music ducks hard under the DJ via sidechain compression
      • master "glue" compressor + limiter on the final mix
    """
    import os
    sweeper_path = sweeper if (sweeper and os.path.exists(sweeper)) else None
    tracks = [str(t) for t in tracks]
    if not tracks:
        raise ValueError("render_show: no tracks provided")
    durations = [probe_duration(t) for t in tracks]

    # --- compute where each track starts in the crossfaded bed --------------
    # acrossfade overlaps the two streams by `crossfade` seconds, so each
    # subsequent track's start time is shifted back by the crossfade duration.
    starts = [0.0]
    bedlen = durations[0]
    transition_times = []  # absolute time of each track->track join
    for i in range(1, len(tracks)):
        transition_times.append(bedlen - crossfade)  # crossfade begins here
        starts.append(bedlen - crossfade)
        bedlen = bedlen + durations[i] - crossfade
    total = bedlen

    # --- build ffmpeg inputs ------------------------------------------------
    cmd = ["ffmpeg", "-y"]
    for t in tracks:
        cmd += ["-i", t]

    voice_inputs = []  # (input_index, delay_ms, gain, kind)
    next_index = len(tracks)

    def add_input(path, at_seconds, gain, kind):
        nonlocal next_index
        cmd.extend(["-i", str(path)])
        voice_inputs.append(
            (next_index, max(0, int(at_seconds * 1000)), gain, kind)
        )
        next_index += 1

    dj_marks = []  # [start, end] seconds where the DJ is on air (for the UI)

    def add_drop(path, at_seconds):
        # fire the sweeper stinger just before the DJ voice, then the voice
        start = at_seconds - (0.9 if sweeper_path else 0.0)
        if sweeper_path:
            add_input(sweeper_path, at_seconds - 0.9, 0.85, "fx")
        add_input(path, at_seconds, voice_gain, "voice")
        dj_marks.append([round(max(0, start), 2), round(at_seconds + 2.6, 2)])

    if intro_drop:
        add_drop(intro_drop, 1.6)
    for i, drop in enumerate(drops):
        if drop:
            # talk up just as the next track comes in over the crossfade
            add_drop(drop, transition_times[i] + 0.4)

    # --- filtergraph: music bed (loudness-normalized, then crossfaded) ------
    fc = []
    for i in range(len(tracks)):
        # even out track-to-track loudness like a real station
        fc.append(
            f"[{i}:a]loudnorm=I={loudness}:TP=-1.5:LRA=11,"
            f"aformat=channel_layouts=stereo:sample_rates=48000[m{i}]"
        )
    prev = "[m0]"
    for i in range(1, len(tracks)):
        out_lbl = f"[bed{i}]" if i < len(tracks) - 1 else "[bed]"
        fc.append(
            f"{prev}[m{i}]acrossfade=d={crossfade}:c1=tri:c2=tri{out_lbl}"
        )
        prev = out_lbl
    if len(tracks) == 1:
        fc.append("[m0]anull[bed]")

    # Broadcast "radio DJ" voice chain: rumble cut, warmth + presence + air EQ,
    # de-ess, punchy compression, and a hint of room so it sits up front.
    DJ_CHAIN = (
        "highpass=f=90,"
        "equalizer=f=160:t=q:w=1.0:g=2,"      # chest warmth
        "equalizer=f=450:t=q:w=1.4:g=-2.5,"   # cut boxiness
        "equalizer=f=3200:t=q:w=1.0:g=3.5,"   # presence / intelligibility
        "equalizer=f=11000:t=h:w=1:g=2.5,"    # air
        "deesser=i=0.4,"
        "acompressor=threshold=-20dB:ratio=4:attack=5:release=120:makeup=4,"
        "aecho=0.85:0.9:55:0.12,"             # subtle broadcast room
        "alimiter=limit=-1.5dB"
    )

    # --- voice/fx: delay each into place, mix into one bus ------------------
    if voice_inputs:
        vlabels = []
        for n, (idx, delay_ms, gain, kind) in enumerate(voice_inputs):
            proc = (DJ_CHAIN + ",") if kind == "voice" else ""
            fc.append(
                f"[{idx}:a]aformat=channel_layouts=stereo:sample_rates=48000,"
                f"{proc}volume={gain},adelay={delay_ms}|{delay_ms}[vd{n}]"
            )
            vlabels.append(f"[vd{n}]")
        if len(vlabels) == 1:
            fc.append(f"{vlabels[0]}anull[vpre]")
        else:
            fc.append(
                "".join(vlabels)
                + f"amix=inputs={len(vlabels)}:normalize=0[vpre]"
            )

        # pad to full bed length so the short sidechain doesn't truncate music
        fc.append(f"[vpre]apad,atrim=0:{total:.3f}[voiceall]")

        # duck the music hard under the DJ, then mix the voice back on top
        fc.append("[voiceall]asplit=2[vkey][vmix]")
        fc.append(
            "[bed][vkey]sidechaincompress="
            "threshold=0.015:ratio=16:attack=6:release=420[ducked]"
        )
        fc.append(
            "[ducked][vmix]amix=inputs=2:normalize=0:duration=first[mixed]"
        )
        final = "[mixed]"
    else:
        final = "[bed]"

    # --- master "glue": gentle bus compression + brickwall limiter ----------
    fc.append(
        f"{final}acompressor=threshold=-16dB:ratio=2.5:attack=20:release=250,"
        f"alimiter=limit=-1dB,"
        f"afade=t=out:st={max(0, total - 4):.2f}:d=4[out]"
    )

    cmd += [
        "-filter_complex", ";".join(fc),
        "-map", "[out]",
        "-c:a", "libmp3lame", "-b:a", "160k",
        str(out_path),
    ]

    subprocess.run(cmd, check=True)

    # --- cue sheet ----------------------------------------------------------
    cue = {
        "duration": round(total, 2),
        "tracks": [
            {"start": round(starts[i], 2), "title": Path(tracks[i]).stem}
            for i in range(len(tracks))
        ],
        "djWindows": dj_marks,
    }
    Path(str(out_path).rsplit(".", 1)[0] + ".cue.json").write_text(
        json.dumps(cue, indent=2)
    )
    return cue


if __name__ == "__main__":
    print("This module is driven by build_shows.py", file=sys.stderr)
