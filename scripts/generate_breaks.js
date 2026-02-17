const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();

// --- Configuration ---
const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = 'KLoixBflzS2a9rg6nT8x'; // New Voice ID
const OUTPUT_DIR = path.join(__dirname, '../public/audio/snippets');
const BREAKS_FILE = path.join(__dirname, '../public/breaks.js');
const MANIFEST_FILE = path.join(__dirname, '../public/audio/snippets/manifest.json');

// --- Helper: Read snippets from file (Classic Regex Parsing) ---
function getSnippets() {
  const content = fs.readFileSync(BREAKS_FILE, 'utf8');
  // Regex to find the 'short' array content
  const match = content.match(/short:\s*\[([\s\S]*?)\]/);
  if (!match) {
    console.error('Could not find "short" array in breaks.js');
    process.exit(1);
  }
  
  // Clean up the array string to simple list of strings
  const rawArray = match[1];
  const snippets = rawArray
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('"') || line.startsWith("'"))
    .map(line => line.replace(/^['"]|['"],?$/g, '')); // Remove quotes and commas
    
  return snippets.filter(s => s.length > 0);
}

// --- Helper: Generate Audio ---
function generateAudio(text, filename) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      text: text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      }
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      port: 443,
      path: `/v1/text-to-speech/${VOICE_ID}`,
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': API_KEY,
        'Content-Length': postData.length
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        console.error(`Failed to generate "${text}": Status ${res.statusCode}`);
        if (res.statusCode === 401) console.error("Check your API Key!");
        return resolve(false);
      }

      const fileStream = fs.createWriteStream(filename);
      res.pipe(fileStream);
      
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Saved: ${path.basename(filename)}`);
        resolve(true);
      });
    });

    req.on('error', (e) => {
      console.error(`Error generating "${text}":`, e);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

// --- Main ---
async function main() {
  if (!API_KEY) {
    console.error('Error: ELEVENLABS_API_KEY environment variable is missing.');
    process.exit(1);
  }

  // Ensure output dir exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const snippets = getSnippets();
  console.log(`Found ${snippets.length} snippets to bundle.`);
  
  const manifest = {};
  
  for (const text of snippets) {
    // Create safe filename
    const safeName = text.replace(/[^a-z0-9]/gi, '_').toLowerCase().slice(0, 30);
    const filename = `${safeName}.mp3`;
    const fullPath = path.join(OUTPUT_DIR, filename);
    
    // Add to manifest
    manifest[text] = `audio/snippets/${filename}`;

    // Check if file already exists
    if (fs.existsSync(fullPath)) {
      console.log(`Skipping (exists): ${text}`);
      continue;
    }

    console.log(`Generating: "${text}"...`);
    await generateAudio(text, fullPath);
  }

  // Save Manifest
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log('Manifest saved!');
  console.log('Done.');
}

main();
