# 🌐 Tab Live Translator (Japanese → English)

A real-time Chromium/Brave extension (Manifest V3) and Python backend pipeline that captures audio directly from browser tabs, performs local speech-to-text inference on spoken Japanese, and renders translated English subtitles over HTML5 video players[cite: 3, 9, 11].

---

## 🛠️ Architecture & How It Works

```text
[ Active Tab Video ] 
       │ (tabCapture API)
       ▼
[ background.js ] ──> [ offscreen.html / offscreen.js ]
                             │  ├──> [ Speakers (AudioContext Passthrough) ]
                             │  └──> [ Periodic WebM Clip Recording ]
                             ▼
                    [ POST /transcribe (Flask Server) ]
                             │
                      Whisper STT (Japanese)
                             │
                      GoogleTranslator (English)
                             │
                             ▼
[ contentScript.js ] <─── [ background.js ] <─── [ Translated Text ]
       │ 
[ Dynamic Floating Subtitle Overlay ]
```

---

## 📋 Prerequisites

* **Python 3.9 – 3.12**
* **FFmpeg** installed and added to your system `PATH` (required by OpenAI Whisper).
* **Chromium-based Browser** (Brave, Google Chrome, Edge).

---

## 🚀 Getting Started

### 1. Start the Local Backend Server

Navigate to the project root and install backend dependencies[cite: 11]:

```bash
pip install -r requirements.txt
```

Launch the Flask transcription server[cite: 9, 11]:

```bash
python backend/server.py
```

*The server will start locally at `http://127.0.0.1:5000`[cite: 9]. Keep this terminal running while using the extension[cite: 11].*

---

### 2. Load the Extension into Brave / Chrome

1. Open your browser and navigate to `brave://extensions` (or `chrome://extensions`)[cite: 11].
2. Enable **Developer mode** in the top-right corner[cite: 11].
3. Click **Load unpacked**[cite: 11].
4. Select the project root folder (`tab-translator`)[cite: 11].
5. Pin the **Tab Live Translator** extension to your toolbar.

---

## 🎯 Usage

1. Open any webpage playing Japanese audio (e.g., YouTube, Twitch, or video streams)[cite: 11].
2. Click the **Tab Live Translator** extension icon in the toolbar[cite: 11].
3. Click **Start**[cite: 6, 11].
4. The floating subtitle box will automatically lock over the active video player and display real-time translations[cite: 2, 11].
5. Click **Stop** when finished[cite: 6, 11].

> **Note on Local Files (`file:///`):** To translate local video files opened directly in the browser, go to `brave://extensions` → **Details** on Tab Live Translator → toggle **Allow access to file URLs**[cite: 11].

---

## ⚙️ Translation Providers

* **MyMemory (Default):** Free translation backend, no API key required[cite: 5, 6, 11].
* **LibreTranslate (Optional):** Supports custom endpoints and self-hosted instances with API keys[cite: 5, 6, 11].

---

## 📁 Repository Structure

* `manifest.json` — Manifest V3 permissions, service worker, and content script bindings[cite: 3].
* `background.js` — Coordinates session lifecycle and routes subtitle payloads between tabs[cite: 1, 11].
* `offscreen.html` / `offscreen.js` — Manages background tab audio capture and live speaker passthrough[cite: 4, 5, 11].
* `contentScript.js` — Dynamically anchors the draggable subtitle overlay over the primary `<video>` element[cite: 2, 11].
* `popup.html` / `popup.js` — Extension user settings and trigger interface[cite: 6, 7, 11].
* `backend/server.py` — Flask server running Whisper STT and translation pipelines[cite: 9, 11].
* `requirements.txt` — Python dependencies for the transcription backend[cite: 10].