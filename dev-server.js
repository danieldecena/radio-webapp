const http = require("http");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

const PORT = 3001;
const PUBLIC_DIR = path.join(__dirname, "public");

http
  .createServer((req, res) => {
    let url = req.url.split("?")[0];

    // Securely proxy the ElevenLabs TTS request locally
    if (url === "/api/speak" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => (body += chunk.toString()));
      req.on("end", async () => {
        try {
          const { text } = JSON.parse(body);
          const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
          const ELEVEN_VOICE_ID =
            process.env.ELEVENLABS_VOICE_ID || "KLoixBflzS2a9rg6nT8x";

          if (!ELEVEN_KEY)
            throw new Error("Missing ElevenLabs API Key in .env");

          const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`,
            {
              method: "POST",
              headers: {
                "xi-api-key": ELEVEN_KEY,
                "Content-Type": "application/json",
                Accept: "audio/mpeg",
              },
              body: JSON.stringify({
                text,
                model_id: "eleven_turbo_v2",
                voice_settings: {
                  stability: 0.50,
                  similarity_boost: 0.8,
                  style: 0.45,
                  use_speaker_boost: true,
                },
              }),
            },
          );

          if (!response.ok) {
            throw new Error("ElevenLabs API error: " + response.status);
          }

          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const audioBase64 = buffer.toString("base64");

          res.writeHead(200, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({ audio: audioBase64 }));
        } catch (err) {
          console.error("API /speak error:", err.message);
          res.writeHead(500, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // Serve the pre-rendered player at root, matching the Netlify redirect.
    if (url === "/") url = "/player.html";

    // Safely decode the URL (the MP3s have spaces and special characters)
    let decodedUrl;
    try {
      decodedUrl = decodeURIComponent(url);
    } catch (e) {
      decodedUrl = url;
    }

    const filePath = path.join(PUBLIC_DIR, decodedUrl);

    // Prevent path traversal outside PUBLIC_DIR (e.g. /..%2f.env)
    if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + path.sep)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        console.log(`404: ${decodedUrl}`);
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      console.log(`200: ${decodedUrl}`);
      const ext = path.extname(filePath);
      // Add CORS just in case
      res.writeHead(200, {
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
      });
      res.end(data);
    });
  })
  .listen(PORT, () => {
    console.log(`📻 Dev server running at http://localhost:${PORT}`);
    console.log(`Serving directory: ${PUBLIC_DIR}`);
  });
