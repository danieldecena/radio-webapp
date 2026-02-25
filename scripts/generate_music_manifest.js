#!/usr/bin/env node
// ==============================================
// Generate music manifest from MP3 files
// ==============================================
// Usage: node scripts/generate_music_manifest.js
//
// Place your MP3 files in public/audio/music/ using the format:
//   "Artist - Song Title.mp3"
//
// Then run this script to update the manifest.

const fs = require('fs');
const path = require('path');

const musicDir = path.join(__dirname, '..', 'public', 'audio', 'music');
const manifestPath = path.join(musicDir, 'manifest.json');

const audioExtensions = ['.mp3', '.m4a', '.ogg', '.wav', '.aac'];

const files = fs.readdirSync(musicDir)
  .filter(f => {
    const ext = path.extname(f).toLowerCase();
    return audioExtensions.includes(ext) && f !== 'manifest.json';
  })
  .sort();

const manifest = {
  songs: files.map(f => `audio/music/${f}`)
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`Generated manifest with ${files.length} songs:`);
files.forEach(f => console.log(`  - ${f}`));

if (files.length === 0) {
  console.log('\nNo audio files found. Add MP3s to public/audio/music/ and run again.');
  console.log('Name format: "Artist - Song Title.mp3"');
}
