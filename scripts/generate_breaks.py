import os
import re
import json
from elevenlabs.client import ElevenLabs

# --- Configuration ---
API_KEY = os.environ.get("ELEVENLABS_API_KEY")
VOICE_ID = "KLoixBflzS2a9rg6nT8x"
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "audio", "snippets")
BREAKS_FILE = os.path.join(PROJECT_ROOT, "public", "breaks.js")
MANIFEST_FILE = os.path.join(OUTPUT_DIR, "manifest.json")

def get_snippets():
    """Extract snippets from the JS file using regex"""
    with open(BREAKS_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Find the content inside short: [ ... ]
    match = re.search(r"short:\s*\[([\s\S]*?)\]", content)
    if not match:
        print("Error: Could not find 'short' array in breaks.js")
        exit(1)
        
    raw_content = match.group(1)
    
    # Extract strings inside quotes
    snippets = []
    for line in raw_content.splitlines():
        line = line.strip()
        # Match "text", or 'text',
        str_match = re.match(r"['\"](.*?)['\"],?", line)
        if str_match:
            snippets.append(str_match.group(1))
            
    return [s for s in snippets if s]

def generate_audio_sdk(client, text, filename):
    try:
        # Generate using official SDK - returns audio generator
        audio_generator = client.text_to_speech.convert(
            text=text,
            voice_id=VOICE_ID,
            model_id="eleven_monolingual_v1",
            voice_settings={
                "stability": 0.5,
                "similarity_boost": 0.75
            }
        )
        
        # Collect audio bytes
        audio_data = b""
        for chunk in audio_generator:
            audio_data += chunk
        
        # Save to file
        with open(filename, "wb") as f:
            f.write(audio_data)
            
        print(f"Saved: {os.path.basename(filename)}")
        return True
        
    except Exception as e:
        print(f"Error generating '{text}': {e}")
        return False

def main():
    if not API_KEY:
        print("Error: ELEVENLABS_API_KEY environment variable is missing.")
        print("Run: export ELEVENLABS_API_KEY='your_key'")
        exit(1)
        
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
        
    # Initialize Client
    client = ElevenLabs(api_key=API_KEY)
        
    snippets = get_snippets()
    print(f"Found {len(snippets)} snippets.")
    
    manifest = {}
    
    for text in snippets:
        safe_name = re.sub(r"[^a-z0-9]", "_", text.lower())[:30]
        filename = f"{safe_name}.mp3"
        full_path = os.path.join(OUTPUT_DIR, filename)
        
        manifest[text] = f"audio/snippets/{filename}"
        
        if os.path.exists(full_path):
            print(f"Skipping (exists): {text}")
            continue
            
        print(f"Generating: '{text}'...")
        success = generate_audio_sdk(client, text, full_path)
        if not success:
            print("Stopping due to error.")
            break
            
    # Save manifest
    with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print("Manifest saved!")

if __name__ == "__main__":
    main()
