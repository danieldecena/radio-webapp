// Netlify serverless function to securely proxy ElevenLabs TTS API
// This keeps your API key secret and server-side.
//
// Abuse protection:
//   1. Origin allowlist  — only requests from your own site are served.
//   2. Rate limiting     — best-effort per-IP cap to protect the ElevenLabs quota.
//   3. Length cap        — text is limited to 1000 characters.
//
// Configure the allowlist with the ALLOWED_ORIGINS env var (comma-separated).
// If unset, the function falls back to Netlify's own deploy URLs plus localhost.

// --- Origin allowlist -------------------------------------------------------
const ENV_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const DEFAULT_ORIGINS = [
  process.env.URL,              // Netlify production URL
  process.env.DEPLOY_PRIME_URL, // Netlify branch/deploy preview URL
  'http://localhost:8888',     // netlify dev
  'http://localhost:3001',     // node dev-server.js
].filter(Boolean);

const ALLOWED_ORIGINS = ENV_ORIGINS.length ? ENV_ORIGINS : DEFAULT_ORIGINS;

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

// --- Rate limiting (best-effort, per warm container) ------------------------
// Serverless containers are ephemeral, so this is not a hard guarantee — but it
// blunts rapid-fire abuse from a single client while a container stays warm.
const RATE_LIMIT_MAX = Number(process.env.TTS_RATE_LIMIT_MAX || 30); // requests
const RATE_LIMIT_WINDOW_MS = Number(process.env.TTS_RATE_LIMIT_WINDOW_MS || 60_000); // per window
const hits = new Map(); // ip -> { count, resetAt }

function isRateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin || '';

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // Reject requests that don't come from an allowed origin
  if (!isAllowedOrigin(origin)) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden origin' }) };
  }

  // Per-IP rate limit
  const clientIp =
    event.headers['x-nf-client-connection-ip'] ||
    (event.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    'unknown';
  if (isRateLimited(clientIp)) {
    return {
      statusCode: 429,
      headers: { 'Retry-After': String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)) },
      body: JSON.stringify({ error: 'Too many requests' }),
    };
  }

  // Get API key from environment variable
  const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
  const ELEVEN_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'KLoixBflzS2a9rg6nT8x';

  if (!ELEVEN_KEY) {
    console.error('ELEVENLABS_API_KEY not set');
    return { statusCode: 500, body: JSON.stringify({ error: 'API key not configured' }) };
  }

  try {
    const { text } = JSON.parse(event.body);

    if (!text || typeof text !== 'string' || text.length > 1000) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid text parameter' }) };
    }

    // Call ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVEN_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2',
          voice_settings: {
            stability: 0.50,
            similarity_boost: 0.80,
            style: 0.45,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('ElevenLabs API error:', response.status);
      return { statusCode: response.status, body: JSON.stringify({ error: 'TTS service unavailable' }) };
    }

    // Get audio data as buffer
    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio: audioBase64, contentType: 'audio/mpeg' }),
    };
  } catch (error) {
    console.error('Function error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
