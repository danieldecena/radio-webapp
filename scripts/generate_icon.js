#!/usr/bin/env node
/**
 * Generate heart-shaped icon with "Radio" text
 * Creates 192x192 and 512x512 PNG files
 */

const fs = require('fs');
const path = require('path');

// First, let's create an SVG version
const createSVG = (size) => {
  const padding = size * 0.1;
  const heartSize = size * 0.8;
  const centerX = size / 2;
  const centerY = size / 2;

  // Heart shape path (centered)
  const heartPath = `
    M ${centerX} ${centerY - heartSize * 0.15}
    C ${centerX} ${centerY - heartSize * 0.35},
      ${centerX - heartSize * 0.25} ${centerY - heartSize * 0.45},
      ${centerX - heartSize * 0.25} ${centerY - heartSize * 0.25}
    C ${centerX - heartSize * 0.25} ${centerY - heartSize * 0.1},
      ${centerX} ${centerY + heartSize * 0.05},
      ${centerX} ${centerY + heartSize * 0.3}
    C ${centerX} ${centerY + heartSize * 0.05},
      ${centerX + heartSize * 0.25} ${centerY - heartSize * 0.1},
      ${centerX + heartSize * 0.25} ${centerY - heartSize * 0.25}
    C ${centerX + heartSize * 0.25} ${centerY - heartSize * 0.45},
      ${centerX} ${centerY - heartSize * 0.35},
      ${centerX} ${centerY - heartSize * 0.15}
    Z
  `;

  const fontSize = size * 0.16;
  const textY = centerY + fontSize * 0.3;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="heartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ff3366;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#cc0044;stop-opacity:1" />
    </linearGradient>
  </defs>

  <!-- Background circle -->
  <circle cx="${centerX}" cy="${centerY}" r="${size / 2}" fill="#080808"/>

  <!-- Heart shape -->
  <path d="${heartPath}" fill="url(#heartGradient)" stroke="#ff0044" stroke-width="${size * 0.01}"/>

  <!-- "Radio" text -->
  <text
    x="${centerX}"
    y="${textY}"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${fontSize}"
    font-weight="bold"
    fill="#ffffff"
    text-anchor="middle"
    dominant-baseline="middle"
    style="text-transform: uppercase; letter-spacing: ${size * 0.008}px;">
    RADIO
  </text>
</svg>`;
};

// Create output directory if it doesn't exist
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate SVG files
const svg192 = createSVG(192);
const svg512 = createSVG(512);

fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), svg192);
fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), svg512);

console.log('✅ SVG icons generated!');
console.log('   - public/icon-192.svg');
console.log('   - public/icon-512.svg');
console.log('');
console.log('To convert SVG to PNG, you can:');
console.log('1. Use an online converter like cloudconvert.com');
console.log('2. Install ImageMagick: brew install imagemagick');
console.log('   Then run: convert icon-192.svg icon.png');
console.log('3. Or use the browser method below...');
console.log('');
console.log('Opening SVG in browser for manual conversion...');
