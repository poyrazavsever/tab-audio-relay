// Background Service Worker for Audio Bridge
let state = {
    bridgeActive: false,
    sourceTabId: null,
    targetTabId: null,
    delayMs: 500
};

let playTimeout = null;

// Yükleme fonksiyonu
async function loadState() {
    const data = await chrome.storage.local.get(['bridgeActive', 'sourceTabId', 'targetTabId', 'delayMs']);
    state.bridgeActive = data.bridgeActive || false;
    state.sourceTabId = data.sourceTabId || null;
    state.targetTabId = data.targetTabId || null;
    state.delayMs = data.delayMs !== undefined ? data.delayMs : 500;
    console.log("Audio Bridge State updated:", state);
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
    if (!state.bridgeActive || !state.sourceTabId || !state.targetTabId) return;

    if (tabId === state.sourceTabId && changeInfo.audible !== undefined) {
        console.log(`Source tab [${tabId}] audible changed to: ${changeInfo.audible}`);
        
        if (playTimeout) {
            clearTimeout(playTimeout);
            playTimeout = null;
        }

        if (changeInfo.audible === true) {
            console.log("Source playing. Pausing target tab.");
            controlMedia(state.targetTabId, 'PAUSE_MEDIA');
        } else if (changeInfo.audible === false) {
            console.log("Source paused. Playing target tab with delay:", state.delayMs);
            playTimeout = setTimeout(() => {
                controlMedia(state.targetTabId, 'PLAY_MEDIA');
            }, state.delayMs);
        }
    }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
    if (tabId === state.sourceTabId) {
        await chrome.storage.local.set({ sourceTabId: null, bridgeActive: false });
        loadState();
    } else if (tabId === state.targetTabId) {
        await chrome.storage.local.set({ targetTabId: null, bridgeActive: false });
        loadState();
    }
});

function controlMedia(tabId, action) {
    chrome.tabs.sendMessage(tabId, { action: action }, (response) => {
        if (chrome.runtime.lastError) {
            console.log("Injecting fallback script...");
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            }).then(() => {
                chrome.tabs.sendMessage(tabId, { action: action });
            }).catch(err => console.error("Script injection failed:", err));
        } else {
            console.log(`Command ${action} sent successfully.`);
        }
    });
}
