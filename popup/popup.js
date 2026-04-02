document.addEventListener("DOMContentLoaded", async () => {
  const bridgeToggle = document.getElementById("bridgeToggle");
  const bridgeStatus = document.getElementById("bridgeStatus");
  const tabASelect = document.getElementById("tabASelect");
  const tabBSelect = document.getElementById("tabBSelect");
  const delayInput = document.getElementById("delayInput");
  const titleText = document.getElementById("titleText");
  const subtitleText = document.getElementById("subtitleText");
  const tabALabel = document.getElementById("tabALabel");
  const tabBLabel = document.getElementById("tabBLabel");
  const delayLabel = document.getElementById("delayLabel");

  const translations = {
    en: {
      extensionTitle: "Audio Bridge",
      subtitle: "Seamless tab audio sync",
      statusOn: "Bridge On",
      statusOff: "Bridge Off",
      tabALabel: "1st Tab (e.g. Video, Learning)",
      tabBLabel: "2nd Tab (e.g. Music, Spotify)",
      delayLabel: "Transition Delay (ms)",
      selectPlaceholder: "Select...",
    },
    tr: {
      extensionTitle: "Audio Bridge",
      subtitle: "Sekmeler arası ses senkronu",
      statusOn: "Köprü Açık",
      statusOff: "Köprü Kapalı",
      tabALabel: "1. Sekme (Örn: Video, Eğitim)",
      tabBLabel: "2. Sekme (Örn: Müzik, Spotify)",
      delayLabel: "Geçiş Gecikmesi (ms)",
      selectPlaceholder: "Seçiniz...",
    },
  };

  const locale = detectLocale();
  const t = translations[locale] || translations.en;
  applyLocalization();

  // Restore state from storage (yeni tabA ve tabB anahtarlarıyla)
  const state = await chrome.storage.local.get([
    "bridgeActive",
    "tabA",
    "tabB",
    "delayMs",
  ]);

  bridgeToggle.checked = state.bridgeActive || false;
  updateStatusText(bridgeToggle.checked);
  delayInput.value = state.delayMs !== undefined ? state.delayMs : 500;

  // Populate tabs
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });

  populateSelect(tabASelect, tabs, state.tabA);
  populateSelect(tabBSelect, tabs, state.tabB);

  // Event Listeners
  bridgeToggle.addEventListener("change", async (e) => {
    const isActive = e.target.checked;
    updateStatusText(isActive);
    await chrome.storage.local.set({ bridgeActive: isActive });
    notifyBackground();
  });

  tabASelect.addEventListener("change", async (e) => {
    const value = e.target.value ? parseInt(e.target.value, 10) : null;
    await chrome.storage.local.set({ tabA: value });
    notifyBackground();
  });

  tabBSelect.addEventListener("change", async (e) => {
    const value = e.target.value ? parseInt(e.target.value, 10) : null;
    await chrome.storage.local.set({ tabB: value });
    notifyBackground();
  });

  delayInput.addEventListener("change", async (e) => {
    const val = parseInt(e.target.value, 10) || 0;
    await chrome.storage.local.set({ delayMs: val });
    notifyBackground();
  });

  function updateStatusText(isActive) {
    bridgeStatus.textContent = isActive ? t.statusOn : t.statusOff;
    bridgeStatus.style.color = isActive ? "#10b981" : "#6b7280";
  }

  function populateSelect(selectElement, tabs, selectedId) {
    selectElement.innerHTML = `<option value="">${t.selectPlaceholder}</option>`;
    tabs.forEach((tab) => {
      const option = document.createElement("option");
      option.value = tab.id;
      const title =
        tab.title.length > 40 ? tab.title.substring(0, 40) + "..." : tab.title;
      option.textContent = title;

      if (selectedId && tab.id === selectedId) {
        option.selected = true;
      }
      selectElement.appendChild(option);
    });
  }

  function notifyBackground() {
    chrome.runtime.sendMessage({ type: "SETTINGS_CHANGED" });
  }

  function detectLocale() {
    const uiLanguage = (
      chrome.i18n?.getUILanguage?.() ||
      navigator.language ||
      "en"
    ).toLowerCase();
    if (uiLanguage.startsWith("tr")) return "tr";
    if (uiLanguage.startsWith("en")) return "en";
    return "en";
  }

  function applyLocalization() {
    document.documentElement.lang = locale;
    document.title = t.extensionTitle;
    titleText.textContent = t.extensionTitle;
    subtitleText.textContent = t.subtitle;
    tabALabel.textContent = t.tabALabel;
    tabBLabel.textContent = t.tabBLabel;
    delayLabel.textContent = t.delayLabel;
  }
});
