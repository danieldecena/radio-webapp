#!/bin/bash
# ============================================================================
# 96.6 ROM — Make a share bundle for Pauline
# Double-click this. It packages the player + the finished broadcast into one
# folder on your Desktop and zips it, ready to AirDrop. The broadcast MP3 has
# the music + both DJs baked in, so it plays offline with no internet, no
# ElevenLabs, no server — just the file. She opens index.html and tunes in.
# ============================================================================

cd "$(dirname "$0")" || exit 1

if [ ! -f public/shows/broadcast.mp3 ]; then
  echo "No broadcast yet. Render one first:"
  echo "   python3 scripts/build_shows.py --broadcast --hours 3"
  read -r -p "Press Return to close…" _ ; exit 1
fi

NAME="96.6 ROM — for Pauline"
OUT="$HOME/Desktop/$NAME"
rm -rf "$OUT" "$OUT.zip"
mkdir -p "$OUT/shows"

cp public/player.html       "$OUT/index.html"          # opens by default
cp public/shows/broadcast.mp3      "$OUT/shows/"        # self-contained mix
cp public/shows/broadcast.data.js  "$OUT/shows/"        # inline cue (works from file://)
cp public/shows/data.js     "$OUT/shows/"   2>/dev/null # discrete shows, if any
cp public/manifest.json     "$OUT/"         2>/dev/null
cp public/sw.js             "$OUT/"         2>/dev/null
cp public/icon*.png         "$OUT/"         2>/dev/null
cp public/favicon.ico       "$OUT/"         2>/dev/null
cp public/gift/*.mp4        "$OUT/"         2>/dev/null   # birthday video, if present

cd "$HOME/Desktop" && zip -r -q "$NAME.zip" "$NAME"

echo "✅ Bundle ready on your Desktop:"
echo "   $OUT.zip"
du -h "$OUT.zip" 2>/dev/null
echo ""
echo "Send it to Pauline: AirDrop the .zip (or share via iCloud/Drive)."
echo "She unzips it, opens index.html, types her name, and the station plays —"
echo "offline, forever, no internet needed."
read -r -p "Press Return to close…" _
