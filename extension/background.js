// ── CONFIG ──────────────────────────────────────────────────────────────────
// URL de Atlas al que se manda la vacante. Para desarrollo local: http://localhost:3000
const ATLAS_URL = "https://atlas-web-ten-liard.vercel.app";
// ────────────────────────────────────────────────────────────────────────────

importScripts("extract.js");

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;

  let text = "";
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: atlasExtractVacancy,
    });
    text = (res && res.result) || "";
  } catch (e) {
    text = "";
  }

  if (!text || text.trim().length < 40) {
    // Página sin texto útil (o restringida). Abre Atlas vacío para pegar a mano.
    chrome.tabs.create({ url: `${ATLAS_URL}/adaptar` });
    return;
  }

  chrome.tabs.create({ url: `${ATLAS_URL}/adaptar#raw=${encodeURIComponent(text)}` });
});
