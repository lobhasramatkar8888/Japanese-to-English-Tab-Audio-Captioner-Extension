let overlay = null;
let statusBadge = null;
let hideTimer = null;

function ensureOverlay() {
  if (overlay) {
    return overlay;
  }

  overlay = document.createElement("div");
  overlay.id = "tab-live-translator-overlay";
  overlay.style.position = "fixed";
  overlay.style.left = "50%";
  overlay.style.bottom = "12%";
  overlay.style.transform = "translateX(-50%)";
  overlay.style.maxWidth = "78vw";
  overlay.style.padding = "10px 14px";
  overlay.style.borderRadius = "12px";
  overlay.style.background = "rgba(0, 0, 0, 0.72)";
  overlay.style.color = "#f4f4f4";
  overlay.style.fontFamily = "Verdana, Geneva, sans-serif";
  overlay.style.fontSize = "20px";
  overlay.style.fontWeight = "700";
  overlay.style.lineHeight = "1.35";
  overlay.style.textAlign = "center";
  overlay.style.textShadow = "0 2px 6px rgba(0,0,0,0.5)";
  overlay.style.zIndex = "2147483647";
  overlay.style.pointerEvents = "none";
  overlay.style.display = "none";
  overlay.style.backdropFilter = "blur(4px)";

  statusBadge = document.createElement("div");
  statusBadge.style.position = "fixed";
  statusBadge.style.left = "16px";
  statusBadge.style.top = "16px";
  statusBadge.style.padding = "8px 10px";
  statusBadge.style.background = "rgba(0,0,0,0.6)";
  statusBadge.style.color = "#e5e5e5";
  statusBadge.style.fontFamily = "Verdana, Geneva, sans-serif";
  statusBadge.style.fontSize = "12px";
  statusBadge.style.borderRadius = "8px";
  statusBadge.style.zIndex = "2147483647";
  statusBadge.style.pointerEvents = "none";
  statusBadge.style.display = "none";

  document.documentElement.appendChild(overlay);
  document.documentElement.appendChild(statusBadge);

  return overlay;
}

function getLargestVisibleVideoRect() {
  const videos = Array.from(document.querySelectorAll("video"));
  let bestRect = null;
  let bestArea = 0;

  for (const video of videos) {
    const rect = video.getBoundingClientRect();
    const visibleWidth = Math.max(0, Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0));
    const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
    const area = visibleWidth * visibleHeight;

    if (area > bestArea && visibleWidth > 160 && visibleHeight > 90) {
      bestArea = area;
      bestRect = rect;
    }
  }

  return bestRect;
}

function positionOverlay() {
  if (!overlay || overlay.style.display === "none") {
    return;
  }

  const rect = getLargestVisibleVideoRect();
  if (!rect) {
    overlay.style.left = "50%";
    overlay.style.bottom = "12%";
    overlay.style.transform = "translateX(-50%)";
    return;
  }

  overlay.style.left = `${rect.left + rect.width / 2}px`;
  overlay.style.bottom = `${Math.max(window.innerHeight - rect.bottom + 24, 24)}px`;
  overlay.style.transform = "translateX(-50%)";
  overlay.style.maxWidth = `${Math.max(rect.width - 32, 260)}px`;
}

function showSubtitle(text, original, isFinal) {
  const container = ensureOverlay();
  const finalText = String(text || "").trim();
  const originalText = String(original || "").trim();

  if (!finalText) {
    return;
  }

  container.innerHTML = "";

  const englishLine = document.createElement("div");
  englishLine.textContent = finalText;
  englishLine.style.opacity = isFinal ? "1" : "0.92";
  container.appendChild(englishLine);

  if (originalText && originalText !== finalText) {
    const originalLine = document.createElement("div");
    originalLine.textContent = originalText;
    originalLine.style.marginTop = "4px";
    originalLine.style.fontSize = "13px";
    originalLine.style.fontWeight = "500";
    originalLine.style.opacity = "0.78";
    container.appendChild(originalLine);
  }

  container.style.display = "block";
  positionOverlay();

  clearTimeout(hideTimer);
  if (isFinal) {
    hideTimer = setTimeout(() => {
      if (overlay) {
        overlay.style.display = "none";
      }
    }, 3800);
  }
}

function clearSubtitle() {
  if (overlay) {
    overlay.style.display = "none";
  }
}

function setStatus(message, running) {
  ensureOverlay();
  statusBadge.textContent = message || "";
  statusBadge.style.display = message ? "block" : "none";
  statusBadge.style.background = running ? "rgba(0,90,50,0.7)" : "rgba(0,0,0,0.6)";
}

window.addEventListener("resize", () => {
  positionOverlay();
});

window.addEventListener("scroll", () => {
  positionOverlay();
}, { passive: true });

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "SUBTITLE_UPDATE") {
    const payload = message.payload || {};
    showSubtitle(payload.translated, payload.original, payload.isFinal);
    return;
  }

  if (message?.type === "SUBTITLE_CLEAR") {
    clearSubtitle();
    setStatus("", false);
    return;
  }

  if (message?.type === "SUBTITLE_STATUS") {
    const payload = message.payload || {};
    setStatus(payload.message || "", Boolean(payload.running));
  }
});
