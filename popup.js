const sourceLangEl = document.getElementById("sourceLang");
const targetLangEl = document.getElementById("targetLang");
const providerEl = document.getElementById("provider");
const backendUrlEl = document.getElementById("backendUrl");
const libreUrlEl = document.getElementById("libreUrl");
const libreApiKeyEl = document.getElementById("libreApiKey");
const statusEl = document.getElementById("status");

const STORAGE_KEY = "translatorSettings";

function setStatus(text, isError = false) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#fecaca" : "#bbf7d0";
}

function readSettingsFromForm() {
  return {
    sourceLang: sourceLangEl.value,
    targetLang: targetLangEl.value.trim() || "en",
    provider: providerEl.value,
    backendUrl: backendUrlEl.value.trim() || "http://127.0.0.1:5000/transcribe",
    libreUrl: libreUrlEl.value.trim() || "https://libretranslate.com/translate",
    libreApiKey: libreApiKeyEl.value.trim()
  };
}

function fillForm(settings) {
  sourceLangEl.value = settings.sourceLang || "ja-JP";
  targetLangEl.value = settings.targetLang || "en";
  providerEl.value = settings.provider || "mymemory";
  backendUrlEl.value = settings.backendUrl || "http://127.0.0.1:5000/transcribe";
  libreUrlEl.value = settings.libreUrl || "https://libretranslate.com/translate";
  libreApiKeyEl.value = settings.libreApiKey || "";
}

async function saveSettings() {
  const settings = readSettingsFromForm();
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
  return settings;
}

async function loadSettings() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const settings = result[STORAGE_KEY] || {
    sourceLang: "ja-JP",
    targetLang: "en",
    provider: "mymemory",
    libreUrl: "https://libretranslate.com/translate",
    libreApiKey: ""
  };
  fillForm(settings);
}

async function getActiveTabId() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs.length || typeof tabs[0].id !== "number") {
    throw new Error("No active tab found");
  }
  return tabs[0].id;
}

async function start() {
  setStatus("Starting...");

  try {
    const settings = await saveSettings();
    const tabId = await getActiveTabId();

    const response = await chrome.runtime.sendMessage({
      type: "POPUP_START",
      payload: { tabId, settings }
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Failed to start");
    }

    setStatus("Running on active tab");
  } catch (error) {
    setStatus(error.message || "Start failed", true);
  }
}

async function stop() {
  setStatus("Stopping...");

  try {
    const response = await chrome.runtime.sendMessage({ type: "POPUP_STOP" });
    if (!response?.ok) {
      throw new Error(response?.error || "Failed to stop");
    }
    setStatus("Stopped");
  } catch (error) {
    setStatus(error.message || "Stop failed", true);
  }
}

async function loadState() {
  try {
    const response = await chrome.runtime.sendMessage({ type: "POPUP_GET_STATE" });
    if (response?.running) {
      setStatus("Already running");
    }
  } catch (error) {
    console.warn("State load failed on popup startup:", error);
  }
}

document.getElementById("start").addEventListener("click", start);
document.getElementById("stop").addEventListener("click", stop);

providerEl.addEventListener("change", () => {
  const isLibre = providerEl.value === "libre";
  libreUrlEl.disabled = !isLibre;
  libreApiKeyEl.disabled = !isLibre;
});

sourceLangEl.addEventListener("change", saveSettings);
targetLangEl.addEventListener("change", saveSettings);
providerEl.addEventListener("change", saveSettings);
backendUrlEl.addEventListener("change", saveSettings);
libreUrlEl.addEventListener("change", saveSettings);
libreApiKeyEl.addEventListener("change", saveSettings);

await loadSettings();
providerEl.dispatchEvent(new Event("change"));
await loadState();
