#!/usr/bin/env node

/**
 * Generate playlist.json from MP3 files in public/music/
 * Run: node scripts/generate_playlist.js
 */

const fs = require('fs');
const path = require('path');

const MUSIC_DIR = path.join(__dirname, '../public/music');
const OUTPUT_FILE = path.join(MUSIC_DIR, 'playlist.json');

function parseFilename(filename) {
  // Remove APLMate.com prefix and extension
  let name = filename.replace(/^APLMate\.com\s*-\s*/, '').replace(/\.[^/.]+$/, '');

  // Handle patterns like "Artist _Title_ - Artist2"
  // Example: "Danielle _smile on my face_ - Fred again.."
  const match = name.match(/^(.+?)\s*_(.+?)_\s*-\s*(.+)$/);
  if (match) {
    const [, trackName, subtitle, artist] = match;
    return {
      title: `${trackName} (${subtitle})`,
      artist: artist.trim()
    };
  }

  // Fallback: try "Title - Artist" pattern
  if (name.includes(' - ')) {
    const parts = name.split(' - ');
    return {
      title: parts[0].trim(),
      artist: parts.slice(1).join(' - ').trim()
    };
  }

  // Last resort
  return {
    title: name,
    artist: 'Unknown Artist'
  };
}

try {
  // Read all files in music directory
  const files = fs.readdirSync(MUSIC_DIR)
    .filter(f => f.endsWith('.mp3'))
    .sort();

  if (files.length === 0) {
    console.log('⚠️  No MP3 files found in public/music/');
    process.exit(1);
  }

  // Generate playlist entries
  const tracks = files.map(file => {
    const parsed = parseFilename(file);
    return {
      file: file,
      title: parsed.title,
      artist: parsed.artist
    };
  });

  // Create playlist object
  const playlist = {
    tracks: tracks
  };

  // Write to file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(playlist, null, 2), 'utf8');

  console.log(`✅ Generated playlist.json with ${tracks.length} tracks:`);
  tracks.forEach((t, i) => {
    console.log(`   ${i+1}. ${t.artist} - ${t.title}`);
  });

} catch (error) {
  console.error('❌ Error generating playlist:', error.message);
  process.exit(1);
}
