// Netlify serverless function to securely proxy ElevenLabs TTS API
// This keeps your API key secret and server-side

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Get API key from environment variable
  const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
  // New specific voice ID from user
  const ELEVEN_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'KLoixBflzS2a9rg6nT8x';

  if (!ELEVEN_KEY) {
    console.error('ELEVENLABS_API_KEY not set');
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'API key not configured' })
    };
  }

  try {
    const { text } = JSON.parse(event.body);

    if (!text || text.length > 1000) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid text parameter' })
      };
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
      console.error('ElevenLabs API error:', response.status);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'TTS service unavailable' })
      };
    }

    // Get audio data as buffer
    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audio: audioBase64,
        contentType: 'audio/mpeg'
      })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
