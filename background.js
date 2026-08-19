const OFFSCREEN_DOCUMENT_PATH = "offscreen.html";

let activeSession = null;

async function hasOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl]
  });
  return contexts.length > 0;
}

async function ensureOffscreenDocument() {
  if (await hasOffscreenDocument()) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: OFFSCREEN_DOCUMENT_PATH,
    reasons: ["USER_MEDIA", "AUDIO_PLAYBACK"],
    justification: "Process tab audio for live speech transcription and translation"
  });
}

async function sendMessageToTab(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    // Content script may not be injected yet for restricted pages.
  }
}

async function startSession(tabId, settings) {
  if (activeSession && activeSession.tabId !== tabId) {
    await stopSession();
  }

  await ensureOffscreenDocument();

  const streamId = await chrome.tabCapture.getMediaStreamId({
    targetTabId: tabId
  });

  activeSession = {
    tabId,
    settings
  };

  await chrome.runtime.sendMessage({
    type: "OFFSCREEN_START",
    payload: {
      tabId,
      streamId,
      settings
    }
  });

  await sendMessageToTab(tabId, {
    type: "SUBTITLE_STATUS",
    payload: {
      running: true,
      message: "Listening for Japanese audio..."
    }
  });
}

async function stopSession() {
  if (!activeSession) {
    return;
  }

  await chrome.runtime.sendMessage({ type: "OFFSCREEN_STOP" });
  await sendMessageToTab(activeSession.tabId, { type: "SUBTITLE_CLEAR" });
  activeSession = null;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message?.type === "POPUP_GET_STATE") {
      sendResponse({
        ok: true,
        running: Boolean(activeSession),
        activeTabId: activeSession?.tabId ?? null
      });
      return;
    }

    if (message?.type === "POPUP_START") {
      try {
        await startSession(message.payload.tabId, message.payload.settings);
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({ ok: false, error: error.message || "Failed to start" });
      }
      return;
    }

    if (message?.type === "POPUP_STOP") {
      try {
        await stopSession();
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({ ok: false, error: error.message || "Failed to stop" });
      }
      return;
    }

    if (message?.type === "OFFSCREEN_SUBTITLE") {
      if (!activeSession) {
        return;
      }

      await sendMessageToTab(activeSession.tabId, {
        type: "SUBTITLE_UPDATE",
        payload: message.payload
      });
      return;
    }

    if (message?.type === "OFFSCREEN_STATUS") {
      if (!activeSession) {
        return;
      }

      await sendMessageToTab(activeSession.tabId, {
        type: "SUBTITLE_STATUS",
        payload: message.payload
      });
      return;
    }

    if (message?.type === "OFFSCREEN_ERROR") {
      if (!activeSession) {
        return;
      }

      await sendMessageToTab(activeSession.tabId, {
        type: "SUBTITLE_STATUS",
        payload: {
          running: false,
          message: message.payload?.message || "Translation stopped"
        }
      });
      await stopSession();
    }
  })();

  return true;
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (activeSession?.tabId === tabId) {
    await stopSession();
  }
});
