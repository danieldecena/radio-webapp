const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const PORT = 3001;
const PUBLIC_DIR = path.join(__dirname, 'public');

http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url === '/') url = '/index.html';

  // Safely decode the URL (the MP3s have spaces and special characters)
  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent(url);
  } catch (e) {
    decodedUrl = url;
  }

  const filePath = path.join(PUBLIC_DIR, decodedUrl);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      console.log(`404: ${decodedUrl}`);
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    console.log(`200: ${decodedUrl}`);
    const ext = path.extname(filePath);
    // Add CORS just in case
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`📻 Dev server running at http://localhost:${PORT}`);
  console.log(`Serving directory: ${PUBLIC_DIR}`);
});
