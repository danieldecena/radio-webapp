#!/bin/bash
# ============================================================================
# 96.6 ROM — Voice the DJ
# Double-click this file. It will:
#   1. Ask for your ElevenLabs API key (hidden as you paste it)
#   2. Show the estimated credit cost (no charge yet)
#   3. Generate all DJ audio into public/audio/breaks/  (one time)
# Your key is used only for this run and is never saved to disk or committed.
# ============================================================================

cd "$(dirname "$0")" || exit 1

echo "🎙  96.6 ROM — DJ voicing"
echo "------------------------------------------------"

# Use the key from .env if present; otherwise ask for it (hidden input).
if [ -z "$ELEVENLABS_API_KEY" ] && [ ! -f .env ]; then
  read -r -s -p "Paste your ElevenLabs API key, then press Return: " ELEVENLABS_API_KEY
  export ELEVENLABS_API_KEY
  echo
fi

echo
echo "Step 1 of 2 — estimating cost (no credits used)…"
echo "------------------------------------------------"
DRY_RUN=1 node scripts/generate_dj_breaks.js
echo "------------------------------------------------"
echo
read -r -p "Press Return to GENERATE the DJ audio for real (or close this window to cancel)… " _

echo
echo "Step 2 of 2 — generating audio (this takes a few minutes)…"
echo "------------------------------------------------"
node scripts/generate_dj_breaks.js

echo "------------------------------------------------"
echo "✅ Done. The DJ audio is in public/audio/breaks/"
echo "Tell Claude it's finished and it will re-render the demo."
read -r -p "Press Return to close this window… " _
