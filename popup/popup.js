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
  const statsLabel = document.getElementById("statsLabel");
  const statsCount = document.getElementById("statsCount");

  const translations = {
    en: {
      extensionTitle: "Audio Bridge",
      subtitle: "Seamless tab audio sync",
      statusOn: "Bridge On",
      statusOff: "Bridge Off",
      tabALabel: "1st Tab (e.g. Video, Learning)",
      tabBLabel: "2nd Tab (e.g. Music, Spotify)",
      delayLabel: "Transition Delay (ms)",
      statsLabel: "Focus switches today",
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
      statsLabel: "Bugünkü odak geçişleri",
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
    "statsDate",
    "switchesToday",
  ]);

  bridgeToggle.checked = state.bridgeActive || false;
  updateStatusText(bridgeToggle.checked);
  delayInput.value = state.delayMs !== undefined ? state.delayMs : 500;
  updateStats(state.statsDate, state.switchesToday);

  // Populate tabs
  const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });

  populateSelect(tabASelect, tabs, state.tabA);
  populateSelect(tabBSelect, tabs, state.tabB);
  syncDisabledOptions();

  // Event Listeners
  bridgeToggle.addEventListener("change", async (e) => {
    const isActive = e.target.checked;
    updateStatusText(isActive);
    await chrome.storage.local.set({ bridgeActive: isActive });
  });

  tabASelect.addEventListener("change", async (e) => {
    const value = e.target.value ? parseInt(e.target.value, 10) : null;
    await chrome.storage.local.set({ tabA: value });
    syncDisabledOptions();
  });

  tabBSelect.addEventListener("change", async (e) => {
    const value = e.target.value ? parseInt(e.target.value, 10) : null;
    await chrome.storage.local.set({ tabB: value });
    syncDisabledOptions();
  });

  delayInput.addEventListener("change", async (e) => {
    const val = Math.min(Math.max(parseInt(e.target.value, 10) || 0, 0), 5000);
    e.target.value = val;
    await chrome.storage.local.set({ delayMs: val });
  });

  // Kısayol veya sekme kapanması gibi popup dışı değişiklikleri yansıt
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    if ("bridgeActive" in changes) {
      bridgeToggle.checked = changes.bridgeActive.newValue || false;
      updateStatusText(bridgeToggle.checked);
    }
    // Background sayacı her zaman bugünün tarihiyle yazar
    if ("switchesToday" in changes) {
      statsCount.textContent = String(changes.switchesToday.newValue || 0);
    }
    if ("tabA" in changes && changes.tabA.newValue == null) {
      tabASelect.value = "";
      syncDisabledOptions();
    }
    if ("tabB" in changes && changes.tabB.newValue == null) {
      tabBSelect.value = "";
      syncDisabledOptions();
    }
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

  // Sayaç başka bir güne aitse bugün için 0 göster
  function updateStats(statsDate, switchesToday) {
    statsCount.textContent =
      statsDate === localDateKey() ? String(switchesToday || 0) : "0";
  }

  function localDateKey(date = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  // Aynı sekmenin iki tarafta birden seçilmesini engelle
  function syncDisabledOptions() {
    [
      [tabASelect, tabBSelect],
      [tabBSelect, tabASelect],
    ].forEach(([select, other]) => {
      Array.from(select.options).forEach((option) => {
        option.disabled = option.value !== "" && option.value === other.value;
      });
    });
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
    statsLabel.textContent = t.statsLabel;
  }
});
