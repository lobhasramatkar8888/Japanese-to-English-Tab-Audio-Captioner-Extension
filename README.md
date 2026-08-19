# Tab Live Translator (Japanese -> English)

A Chrome extension prototype that:
- Captures audio from the current browser tab
- Tries to transcribe Japanese speech in near real-time
- Translates the transcript to English
- Draws the translated subtitle as an overlay over the playing video

## Important Note

Chrome does not reliably allow the built-in Web Speech API to transcribe tab-captured audio streams. This is the reason you were seeing the status message `Speech recognition error: not-allowed`.

This version fixes that by using a supported flow:
- Capture the tab audio stream in the extension
- Send short audio clips to a local transcription backend
- Transcribe with a real STT engine
- Translate the transcript to English and display it on video

This is the browser-safe approach for live tab translation.

## Run the local transcription backend

1. Open a terminal in this project root
2. Install Python dependencies:
   `pip install flask openai-whisper deep-translator`
3. Start the backend:
   `python backend/server.py`
4. Keep that terminal open while using the extension

## Files

- `manifest.json`: Extension configuration (Manifest V3)
- `background.js`: Session control and message routing
- `offscreen.html` + `offscreen.js`: Tab audio processing and translation
- `contentScript.js`: Video subtitle overlay on webpages
- `popup.html` + `popup.js`: User controls and settings

## Load extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this folder: `tab-translator`

## Use it

1. Start the backend server with `python backend/server.py`
2. Open a tab with Japanese audio (YouTube or a browser-played video)
3. Click the extension icon
4. Click **Start**
5. Watch translated subtitles appear over the video area
6. Click **Stop** when done

## Local files (file:// videos)

If you play local videos in the browser, open this extension details page in `chrome://extensions` and enable:
- **Allow access to file URLs**

## Translation provider notes

- Default provider: **MyMemory** (free, rate-limited)
- Optional provider: **LibreTranslate**
  - Set your endpoint in popup settings
  - Add API key if your instance requires it


