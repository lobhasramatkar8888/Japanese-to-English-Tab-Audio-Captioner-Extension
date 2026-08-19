let currentStream = null;
let currentTrack = null;
let playbackContext = null;
let running = false;
let settings = {
  sourceLang: "ja-JP",
  targetLang: "en",
  provider: "mymemory",
  backendUrl: "http://127.0.0.1:5000/transcribe",
  libreUrl: "https://libretranslate.com/translate",
  libreApiKey: ""
};

let lastProcessedAt = 0;
let lastTranscript = "";
let loopTimer = null;

function sourceLangCode(lang) {
  return String(lang || "ja-JP").split("-")[0].toLowerCase();
}

async function translateText(text) {
  const source = sourceLangCode(settings.sourceLang);
  const target = String(settings.targetLang || "en").toLowerCase();

  if (settings.provider === "libre") {
    const response = await fetch(settings.libreUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source,
        target,
        format: "text",
        api_key: settings.libreApiKey || undefined
      })
    });

    if (!response.ok) {
      throw new Error("LibreTranslate request failed");
    }

    const data = await response.json();
    return data.translatedText || "";
  }

  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", `${source}|${target}`);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("MyMemory request failed");
  }

  const data = await response.json();
  return data?.responseData?.translatedText || "";
}

function emitStatus(message, runningState = running) {
  chrome.runtime.sendMessage({
    type: "OFFSCREEN_STATUS",
    payload: {
      running: runningState,
      message
    }
  });
}

function emitSubtitle(original, translated, isFinal) {
  chrome.runtime.sendMessage({
    type: "OFFSCREEN_SUBTITLE",
    payload: {
      original,
      translated,
      isFinal,
      ts: Date.now()
    }
  });
}

function teardownStream() {
  if (playbackContext) {
    try {
      playbackContext.close();
    } catch (e) {}
    playbackContext = null;
  }
  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop());
    currentStream = null;
  }
  currentTrack = null;
}

function clearLoop() {
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
}

async function sendAudioToTranscription() {
  if (!currentStream || !running) {
    return;
  }

  try {
    const chunks = [];
    // Record directly from currentStream without interrupting playback
    const recorder = new MediaRecorder(currentStream, { mimeType: "audio/webm;codecs=opus" });

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = async () => {
      if (!chunks.length) {
        return;
      }

      const blob = new Blob(chunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "clip.webm");
      formData.append("source_lang", sourceLangCode(settings.sourceLang));
      formData.append("target_lang", String(settings.targetLang || "en").toLowerCase());

      try {
        const response = await fetch(settings.backendUrl || "http://127.0.0.1:5000/transcribe", {
          method: "POST",
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Backend transcribe failed: ${response.status}`);
        }

        const data = await response.json();
        const text = String(data?.text || "").trim();
        const translated = String(data?.translated || "").trim();

        if (text) {
          const now = Date.now();
          if (text !== lastTranscript || now - lastProcessedAt > 2000) {
            lastTranscript = text;
            lastProcessedAt = now;
            const finalTranslated = translated || await translateText(text);
            emitSubtitle(text, finalTranslated || text, true);
          }
        }
      } catch (error) {
        console.warn("Transcription backend request failed:", error);
        emitStatus("Transcription backend unavailable or not running.", running);
      }
    };

    recorder.start();
    setTimeout(() => {
      try {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
      } catch (error) {}
    }, 2000);
  } catch (error) {
    emitStatus("Audio capture could not be prepared: " + error.message, false);
  }
}

async function startFromStreamId(streamId, incomingSettings) {
  await stopAll();
  settings = { ...settings };
  if (incomingSettings) {
    settings = { ...settings, ...incomingSettings };
  }

  currentStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: "tab",
        chromeMediaSourceId: streamId
      }
    },
    video: false
  });

  // --- AUDIO PASSTHROUGH TO SPEAKERS ---
  playbackContext = new AudioContext();
  const source = playbackContext.createMediaStreamSource(currentStream);
  source.connect(playbackContext.destination);

  currentTrack = currentStream.getAudioTracks()[0] || null;
  running = true;
  lastTranscript = "";
  lastProcessedAt = 0;

  emitStatus("Listening for Japanese audio...", true);

  clearLoop();
  loopTimer = setInterval(() => {
    if (running) {
      sendAudioToTranscription();
    }
  }, 4000);

  await sendAudioToTranscription();
}

async function stopAll() {
  running = false;
  clearLoop();
  teardownStream();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === "OFFSCREEN_START") {
      try {
        await startFromStreamId(message.payload.streamId, message.payload.settings);
        sendResponse({ ok: true });
      } catch (error) {
        await stopAll();
        chrome.runtime.sendMessage({
          type: "OFFSCREEN_ERROR",
          payload: { message: error.message || "Failed to start offscreen processing" }
        });
        sendResponse({ ok: false, error: error.message || "Failed to start" });
      }
      return;
    }

    if (message?.type === "OFFSCREEN_STOP") {
      await stopAll();
      emitStatus("Stopped", false);
      sendResponse({ ok: true });
    }
  })();

  return true;
});