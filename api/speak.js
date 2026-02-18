// Vercel serverless function to securely proxy ElevenLabs TTS API
// This keeps your API key secret and server-side

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get API key from environment variable
  const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
  // Use custom voice ID
  const ELEVEN_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'CeNX9CMwmxDxUF5Q2Inm';

  console.log('API Key present:', !!ELEVEN_KEY, 'Key length:', ELEVEN_KEY?.length);
  console.log('Voice ID:', ELEVEN_VOICE_ID);

  if (!ELEVEN_KEY) {
    console.error('ELEVENLABS_API_KEY not set');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { text } = req.body;

    if (!text || text.length > 1000) {
      return res.status(400).json({ error: 'Invalid text parameter' });
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
            stability: 0.45,
            similarity_boost: 0.80,
            style: 0.2,
            use_speaker_boost: true
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'TTS service unavailable',
        details: `Status: ${response.status}`,
        debug: errorText.substring(0, 200)
      });
    }

    // Get audio data as buffer
    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    return res.status(200).json({
      audio: audioBase64,
      contentType: 'audio/mpeg'
    });

  } catch (error) {
    console.error('Function error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
