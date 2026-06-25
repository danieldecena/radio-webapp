#!/bin/bash
# ============================================================================
# 96.6 ROM — Build the macOS .app + send-off zip
# Double-click this. It packages the player + finished broadcast into a native
# "96.6 ROM.app" on your Desktop (double-clickable, opens the station offline),
# then wraps it with OPEN ME FIRST.txt into the ready-to-AirDrop zip.
# Re-run any time you change the player or re-render the broadcast.
# ============================================================================

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f public/shows/broadcast.mp3 ]; then
  echo "No broadcast yet. Render one first:"
  echo "   python3 scripts/build_shows.py --broadcast --hours 3"
  [ -t 0 ] && read -r -p "Press Return to close…" _ ; exit 1
fi

APP_NAME="96.6 ROM"
DESKTOP="$HOME/Desktop"
APP="$DESKTOP/$APP_NAME.app"
SITE="$APP/Contents/Resources/site"

echo "📦 Building $APP_NAME.app …"
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS" "$SITE/shows"

# --- web bundle: site/ from public/ -----------------------------------------
cp public/player.html               "$SITE/index.html"          # opens by default
cp public/shows/broadcast.mp3       "$SITE/shows/"              # self-contained mix
cp public/shows/broadcast.data.js   "$SITE/shows/"             # inline cue (file://)
cp public/shows/data.js             "$SITE/shows/" 2>/dev/null || true  # discrete shows, if any
cp public/manifest.json             "$SITE/"       2>/dev/null || true
cp public/sw.js                     "$SITE/"       2>/dev/null || true
cp public/icon*.png                 "$SITE/"       2>/dev/null || true
cp public/favicon.ico               "$SITE/"       2>/dev/null || true

# wide inline banner (HyperFrames render) the page autoplays above the radio
[ -f public/banner.mp4 ] && cp public/banner.mp4 "$SITE/banner.mp4"
# full birthday message played fullscreen when the banner is tapped (prefer the gift mp4)
MP4="$(ls public/gift/*.mp4 2>/dev/null | head -1)"
[ -z "$MP4" ] && MP4="public/birthday.mp4"
[ -f "$MP4" ] && cp "$MP4" "$SITE/birthday.mp4"

# --- launcher + Info.plist --------------------------------------------------
cat > "$APP/Contents/MacOS/run" <<'RUN'
#!/bin/bash
DIR="$(cd "$(dirname "$0")/../Resources/site" && pwd)"
open "$DIR/index.html"
RUN
chmod +x "$APP/Contents/MacOS/run"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleName</key><string>96.6 ROM</string>
<key>CFBundleDisplayName</key><string>96.6 ROM</string>
<key>CFBundleExecutable</key><string>run</string>
<key>CFBundleIdentifier</key><string>com.daniel.romradio</string>
<key>CFBundleIconFile</key><string>AppIcon</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>1.0</string>
<key>LSMinimumSystemVersion</key><string>10.13</string>
</dict></plist>
PLIST

# --- app icon: gift/app-icon-1024.png → AppIcon.icns ------------------------
ICON_SRC="public/gift/app-icon-1024.png"
if [ -f "$ICON_SRC" ] && command -v iconutil >/dev/null 2>&1; then
  ISET="$(mktemp -d)/AppIcon.iconset"; mkdir -p "$ISET"
  gen() { sips -z "$2" "$2" "$ICON_SRC" --out "$ISET/$1" >/dev/null 2>&1; }
  gen icon_16x16.png 16;       gen icon_16x16@2x.png 32
  gen icon_32x32.png 32;       gen icon_32x32@2x.png 64
  gen icon_128x128.png 128;    gen icon_128x128@2x.png 256
  gen icon_256x256.png 256;    gen icon_256x256@2x.png 512
  gen icon_512x512.png 512;    gen icon_512x512@2x.png 1024
  iconutil -c icns "$ISET" -o "$APP/Contents/Resources/AppIcon.icns" 2>/dev/null || true
fi

# --- ad-hoc re-sign (editing bundle contents invalidates any old signature;
#     an invalid signature reads as "damaged", worse than plain "unverified").
#     Strip xattrs first — copied files carry Finder/quarantine detritus that
#     codesign rejects ("resource fork … not allowed").
xattr -cr "$APP" 2>/dev/null || true
codesign --force --deep --sign - "$APP" 2>/dev/null || echo "  (note: codesign skipped/failed — app ships unsigned; OPEN ME FIRST covers it)"

# --- send-off zip: folder( OPEN ME FIRST.txt + the .app ) -------------------
BUNDLE_NAME="96.6 ROM for Pauline (app)"
STAGE="$DESKTOP/$BUNDLE_NAME"
ZIP="$DESKTOP/$BUNDLE_NAME.zip"
rm -rf "$STAGE" "$ZIP"
mkdir -p "$STAGE"
cp public/gift/"OPEN ME FIRST.txt" "$STAGE/" 2>/dev/null || true
cp -R "$APP" "$STAGE/"
# strip Finder/quarantine detritus from the copy so the shipped app stays
# strict-verifiable even if Spotlight re-tagged files on the Desktop
xattr -cr "$STAGE" 2>/dev/null || true

( cd "$DESKTOP" && zip -r -X -q "$ZIP" "$BUNDLE_NAME" -x "*.DS_Store" )
rm -rf "$STAGE"

echo "✅ Built:"
echo "   $APP"
echo "   $ZIP"
du -h "$ZIP" 2>/dev/null
echo ""
echo "Send it to Pauline: AirDrop the .zip. She unzips, reads OPEN ME FIRST,"
echo "right-clicks the app → Open, and the station plays offline forever."
[ -t 0 ] && read -r -p "Press Return to close…" _
