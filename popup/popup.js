document.addEventListener("DOMContentLoaded", async () => {
  const bridgeToggle = document.getElementById("bridgeToggle");
  const bridgeStatus = document.getElementById("bridgeStatus");
  const tabASelect = document.getElementById("tabASelect");
  const tabBSelect = document.getElementById("tabBSelect");
  const tabAPlayPause = document.getElementById("tabAPlayPause");
  const tabBPlayPause = document.getElementById("tabBPlayPause");
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
    state.bridgeActive = isActive;  // ← State'i update et
    updateStatusText(isActive);
    await chrome.storage.local.set({ bridgeActive: isActive });
    notifyBackground();
    updateAllButtonStates();  // ← Button'ları enable/disable et
  });

  tabASelect.addEventListener("change", async (e) => {
    const value = e.target.value ? parseInt(e.target.value, 10) : null;
    
    invalidateTabSelectIfTabIdIsInvalid(value, tabASelect);
    state.tabA = value;
    await chrome.storage.local.set({ tabA: value });
    notifyBackground();
    updateAllButtonStates();
  });

  tabBSelect.addEventListener("change", async (e) => {
    const value = e.target.value ? parseInt(e.target.value, 10) : null;
    
    invalidateTabSelectIfTabIdIsInvalid(value, tabBSelect);
    state.tabB = value;
    await chrome.storage.local.set({ tabB: value });
    notifyBackground();
    updateAllButtonStates();
  });

  delayInput.addEventListener("change", async (e) => {
    const val = parseInt(e.target.value, 10) || 0;
    await chrome.storage.local.set({ delayMs: val });
    notifyBackground();
  });

  // Play/Pause Button Handlers
  tabAPlayPause.addEventListener("click", async () => {
    if (!state.bridgeActive) return;  // ← Bridge kapalıysa çıkış yap
    if (!state.tabA) return;
    
    // Optimistic update: Button UI'ını hemen toggle et (current display state'ine göre)
    const wasPlaying = tabAPlayPause.textContent === "⏸";
    updatePlayPauseButton(tabAPlayPause, !wasPlaying, false);
    
    // Backend'e gönder
    await toggleTabMedia(state.tabA, state.tabB, state.bridgeActive);
    
    // 200ms sonra gerçek durumu kontrol et (verification)
    setTimeout(updateAllButtonStates, 200);
  });

  tabBPlayPause.addEventListener("click", async () => {
    if (!state.bridgeActive) return;  // ← Bridge kapalıysa çıkış yap
    if (!state.tabB) return;
    
    // Optimistic update: Button UI'ını hemen toggle et (current display state'ine göre)
    const wasPlaying = tabBPlayPause.textContent === "⏸";
    updatePlayPauseButton(tabBPlayPause, !wasPlaying, false);
    
    // Backend'e gönder
    await toggleTabMedia(state.tabB, state.tabA, state.bridgeActive);
    
    // 200ms sonra gerçek durumu kontrol et (verification)
    setTimeout(updateAllButtonStates, 200);
  });

  // Polling interval: 300ms'ye düşür (genikten 500ms)
  let stateCheckInterval = setInterval(updateAllButtonStates, 300);

  async function getTabMediaState(tabId) {
    try {
      // Önce tab'ın hala var olup olmadığını kontrol et
      const tab = await chrome.tabs.get(tabId);
      if (!tab) {
        console.warn(`Tab ${tabId} no longer exists`);
        return { isPlaying: false, hasMedia: false };
      }

      // Chrome internal pages'e mesaj gönderilemiyor
      if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('about:'))) {
        console.warn(`Cannot access tab ${tabId}: internal page`);
        return { isPlaying: false, hasMedia: false };
      }

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn(`Timeout for tab ${tabId}, injecting content script...`);
          // Timeout olduysa, script enjekte et ve yeniden dene
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
          }).then(() => {
            console.log(`Content script injected to tab ${tabId}, retrying...`);
            setTimeout(() => {
              chrome.tabs.sendMessage(tabId, { action: "GET_MEDIA_STATE" }, (response) => {
                if (response) {
                  resolve(response);
                } else {
                  resolve({ isPlaying: false, hasMedia: false });
                }
              });
            }, 300);
          }).catch(err => {
            console.warn(`Cannot inject to tab ${tabId}:`, err.message);
            resolve({ isPlaying: false, hasMedia: false });
          });
        }, 1000);

        chrome.tabs.sendMessage(
          tabId,
          { action: "GET_MEDIA_STATE" },
          (response) => {
            if (timeout) clearTimeout(timeout);
            
            // Hata varsa fakat response varsa, response'i al
            if (response) {
              console.log(`Tab ${tabId} media state:`, response);
              resolve(response);
            } else if (chrome.runtime.lastError) {
              // Content script yüklü değil
              console.log(`Content script not ready for tab ${tabId}, will retry`);
              resolve({ isPlaying: false, hasMedia: false });
            } else {
              resolve({ isPlaying: false, hasMedia: false });
            }
          }
        );
      });
    } catch (err) {
      console.warn(`Cannot get state from tab ${tabId}:`, err.message);
      return { isPlaying: false, hasMedia: false };
    }
  }

  async function updateAllButtonStates() {
    if (state.tabA) {
      const mediaState = await getTabMediaState(state.tabA);
      console.log(`[updateAllButtonStates] Tab A (${state.tabA}):`, mediaState);
      updatePlayPauseButton(tabAPlayPause, mediaState.isPlaying, !state.bridgeActive || !mediaState.hasMedia);
    } else {
      console.log(`[updateAllButtonStates] Tab A not selected`);
      tabAPlayPause.disabled = true;
      tabAPlayPause.textContent = "▶";
      tabAPlayPause.classList.remove("playing");
    }

    if (state.tabB) {
      const mediaState = await getTabMediaState(state.tabB);
      console.log(`[updateAllButtonStates] Tab B (${state.tabB}):`, mediaState);
      updatePlayPauseButton(tabBPlayPause, mediaState.isPlaying, !state.bridgeActive || !mediaState.hasMedia);
    } else {
      console.log(`[updateAllButtonStates] Tab B not selected`);
      tabBPlayPause.disabled = true;
      tabBPlayPause.textContent = "▶";
      tabBPlayPause.classList.remove("playing");
    }
  }

  async function invalidateTabSelectIfTabIdIsInvalid(tabId, tabSelect) {
    // Tab ID geçerliyse, kontrol et
    if (tabId) {
      try {
        const tab = await chrome.tabs.get(tabId);
        if (!tab) {
          console.warn(`Tab ${tabId} no longer exists`);
          alert("This tab no longer exists. Please select another one.");
          tabSelect.value = "";
          return;
        }
      } catch (err) {
        console.warn(`Cannot access tab ${tabId}:`, err.message);
        alert("Cannot access this tab. Please select another one.");
        tabSelect.value = "";
        return;
      }
    }
  }

  function updatePlayPauseButton(button, isPlaying, disabled = false) {
    button.disabled = disabled;
    button.textContent = isPlaying ? "⏸" : "▶";
    
    if (isPlaying) {
      button.classList.add("playing");
    } else {
      button.classList.remove("playing");
    }
  }

  async function toggleTabMedia(tabId, otherTabId, bridgeActive) {
    try {
      // Hedef tab var mı kontrol et
      const targetTab = await chrome.tabs.get(tabId);
      if (!targetTab) {
        console.warn(`Target tab ${tabId} no longer exists`);
        return;
      }

      // Chrome internal pages kontrol
      if (targetTab.url && (targetTab.url.startsWith('chrome://') || targetTab.url.startsWith('about:'))) {
        console.warn(`Cannot control internal tab ${tabId}`);
        return;
      }

      const mediaState = await getTabMediaState(tabId);
      const action = mediaState.isPlaying ? "PAUSE_MEDIA" : "PLAY_MEDIA";

      // Hedef tab'a komut gönder
      chrome.tabs.sendMessage(tabId, { action }, (response) => {
        if (chrome.runtime.lastError) {
          // Content script enjekte et ve yeniden dene
          console.log(`Injecting content script to tab ${tabId}...`);
          chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['content.js']
          }).then(() => {
            setTimeout(() => {
              chrome.tabs.sendMessage(tabId, { action }, (retryResponse) => {
                if (chrome.runtime.lastError) {
                  console.warn(`Could not send ${action} to tab ${tabId}`);
                } else {
                  console.log(`${action} sent to tab ${tabId}`);
                }
              });
            }, 200);
          }).catch(err => console.warn(`Injection failed for tab ${tabId}:`, err.message));
        } else {
          console.log(`${action} sent successfully`);
        }
      });

      // Bridge aktifse, diğer tab'a zıt komut gönder
      if (bridgeActive && otherTabId && otherTabId !== tabId) {
        try {
          const otherTab = await chrome.tabs.get(otherTabId);
          if (otherTab && !(otherTab.url && (otherTab.url.startsWith('chrome://') || otherTab.url.startsWith('about://')))) {
            const otherAction = action === "PAUSE_MEDIA" ? "PLAY_MEDIA" : "PAUSE_MEDIA";
            
            chrome.tabs.sendMessage(otherTabId, { action: otherAction }, (response) => {
              if (chrome.runtime.lastError) {
                console.log(`Injecting content script to other tab ${otherTabId}...`);
                chrome.scripting.executeScript({
                  target: { tabId: otherTabId },
                  files: ['content.js']
                }).then(() => {
                  setTimeout(() => {
                    chrome.tabs.sendMessage(otherTabId, { action: otherAction }, (retryResponse) => {
                      if (chrome.runtime.lastError) {
                        console.warn(`Could not send ${otherAction} to tab ${otherTabId}`);
                      }
                    });
                  }, 200);
                }).catch(err => console.warn(`Injection failed for other tab:`, err.message));
              }
            });
          }
        } catch (err) {
          console.warn(`Other tab ${otherTabId} not available`);
        }
      }
    } catch (err) {
      console.warn("Toggle media error:", err.message);
    }
  }

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
