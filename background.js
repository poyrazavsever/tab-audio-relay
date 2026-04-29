// Background Service Worker for Audio Bridge
let state = {
    bridgeActive: false,
    tabA: null,
    tabB: null,
    delayMs: 500
};

let playTimeout = null;
// Sonsuz döngüyü engellemek için, kullanıcının veya sistemin "çalmasına" niyetlendiği sekmeyi tutarız:
let intendedPlayingTabId = null;

// Yükleme fonksiyonu
async function loadState() {
    const data = await chrome.storage.local.get(['bridgeActive', 'tabA', 'tabB', 'delayMs']);
    state.bridgeActive = data.bridgeActive || false;
    state.tabA = data.tabA || null;
    state.tabB = data.tabB || null;
    state.delayMs = data.delayMs !== undefined ? data.delayMs : 500;
    console.log("Audio Bridge State updated (Symmetric):", state);
}

// Initial load
loadState();

// Popup'tan gelen bildirimleri dinle
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SETTINGS_CHANGED') {
        loadState();
    }
});

// Kısayol (Shortcut) dinleyici
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle_bridge') {
        state.bridgeActive = !state.bridgeActive;
        await chrome.storage.local.set({ bridgeActive: state.bridgeActive });
        console.log(`Bridge toggled via shortcut. Active: ${state.bridgeActive}`);
    }
});

// Sekme durum değişikliklerini dinle
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!state.bridgeActive || !state.tabA || !state.tabB) return;

    if (changeInfo.audible !== undefined) {
        // Dinlenen iki sekmeden biri mi?
        if (tabId === state.tabA || tabId === state.tabB) {
            console.log(`Tab [${tabId}] audible changed to: ${changeInfo.audible}`);
            const otherTabId = (tabId === state.tabA) ? state.tabB : state.tabA;

            if (changeInfo.audible === true) {
                // Bu sekme çalmaya başladı!
                intendedPlayingTabId = tabId;
                
                if (playTimeout) {
                    clearTimeout(playTimeout);
                    playTimeout = null;
                }
                
                // Diğer sekmeyi acilen sustur:
                console.log(`Pausing the other tab [${otherTabId}]`);
                controlMedia(otherTabId, 'PAUSE_MEDIA');

            } else if (changeInfo.audible === false) {
                // Bu sekme sustu!
                // Eğer susan sekme 'bizim veya kullanıcının bilerek çaldığı' sekme ise (kullanıcı bunu manuel durdurmuş demektir).
                // O yüzden diğerini çaldırmaya başlamalıyız.
                if (intendedPlayingTabId === tabId || intendedPlayingTabId === null) {
                    intendedPlayingTabId = otherTabId; // Artık diğerini çaldıracağız
                    
                    console.log(`Tab paused manually. Playing the other tab [${otherTabId}] after ${state.delayMs}ms`);
                    playTimeout = setTimeout(() => {
                        controlMedia(otherTabId, 'PLAY_MEDIA');
                    }, state.delayMs);
                }
                // Eğer susan sekme 'intendedPlayingTabId' değilse, bu sekme zaten BİZ 'PAUSE_MEDIA'
                // gönderdiğimiz için susmuştur. Bu durumda hiçbir şey yapmayız, sonsuz döngü kırılır.
            }
        }
    }
});

// Sekme kapatılırsa temizlik yap
chrome.tabs.onRemoved.addListener(async (tabId) => {
    if (tabId === state.tabA || tabId === state.tabB) {
        if (tabId === state.tabA) await chrome.storage.local.set({ tabA: null, bridgeActive: false });
        if (tabId === state.tabB) await chrome.storage.local.set({ tabB: null, bridgeActive: false });
        loadState();
    }
});

async function controlMedia(tabId, action) {
    try {
        // Öncelikle tab'ın hala var olup olmadığını kontrol et
        const tab = await chrome.tabs.get(tabId);
        if (!tab) {
            console.warn(`Tab ${tabId} no longer exists. Clearing from storage.`);
            clearTabIfInvalid(tabId);
            return;
        }

        // Chrome internal pages'e mesaj gönderilemez
        if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('about:'))) {
            console.warn(`Cannot control tab ${tabId}: internal page`);
            return;
        }

        // Mesajı gönder
        chrome.tabs.sendMessage(tabId, { action: action }, (response) => {
            if (chrome.runtime.lastError) {
                // Content script yoksa, enjekte et ve tekrar gönder
                console.log(`Content script not ready in tab ${tabId}, will inject...`);
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                }).then(() => {
                    console.log(`Content script injected to tab ${tabId}`);
                    // Enjeksiyon başarılı oldu, 200ms sonra mesaj gönder
                    setTimeout(() => {
                        chrome.tabs.sendMessage(tabId, { action: action }, (retryResponse) => {
                            if (chrome.runtime.lastError) {
                                console.warn(`Could not send ${action} to tab ${tabId} after injection`);
                                clearTabIfInvalid(tabId);
                            } else {
                                console.log(`${action} sent to tab ${tabId} after injection`);
                            }
                        });
                    }, 200);
                }).catch(err => {
                    console.warn(`Could not inject content script into tab ${tabId}:`, err.message);
                    clearTabIfInvalid(tabId);
                });
            } else {
                console.log(`${action} sent successfully to tab ${tabId}`);
            }
        });
    } catch (error) {
        console.warn(`Tab ${tabId} is no longer available:`, error.message);
        clearTabIfInvalid(tabId);
    }
}

// Eski veya geçersiz tab ID'lerini temizle
async function clearTabIfInvalid(tabId) {
    if (tabId === state.tabA) {
        await chrome.storage.local.set({ tabA: null, bridgeActive: false });
        state.tabA = null;
        state.bridgeActive = false;
    }
    
    if (tabId === state.tabB) {
        await chrome.storage.local.set({ tabB: null, bridgeActive: false });
        state.tabB = null;
        state.bridgeActive = false;
    }
}
