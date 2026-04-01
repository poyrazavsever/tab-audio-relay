// Background Service Worker for Audio Bridge
let state = {
    bridgeActive: false,
    sourceTabId: null,
    targetTabId: null
};

// Yükleme fonksiyonu
async function loadState() {
    const data = await chrome.storage.local.get(['bridgeActive', 'sourceTabId', 'targetTabId']);
    state.bridgeActive = data.bridgeActive || false;
    state.sourceTabId = data.sourceTabId || null;
    state.targetTabId = data.targetTabId || null;
    console.log("Audio Bridge State updated:", state);
}

// Extension başlatıldığında storage'dan verileri al
loadState();

// Popup'tan gelen bildirimleri dinle
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SETTINGS_CHANGED') {
        loadState();
    }
});

// Sekme durum değişikliklerini dinle (Audible eventi izleme)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!state.bridgeActive || !state.sourceTabId || !state.targetTabId) return;

    // Sadece kaynak sekmedeki "audible" (ses çıkarma) özelliğinin değişimini izle
    if (tabId === state.sourceTabId && changeInfo.audible !== undefined) {
        console.log(`Source tab [${tabId}] audible changed to: ${changeInfo.audible}`);
        
        if (changeInfo.audible === true) {
            // Kaynak sekme ses çıkarmaya başladı -> Hedef sekmeyi durdur
            console.log("Source started playing audio. Pausing target tab.");
            controlMedia(state.targetTabId, 'PAUSE_MEDIA');
        } else if (changeInfo.audible === false) {
            // Kaynak sekme sustu -> Hedef sekmeyi oynat
            console.log("Source stopped playing audio. Playing target tab.");
            // Kücük bir gecikme ekleyerek daha akıcı geçiş sağlayabiliriz (Faz 3 Delay özelliği altyapısı)
            setTimeout(() => {
                controlMedia(state.targetTabId, 'PLAY_MEDIA');
            }, 500); 
        }
    }
});

// Kapalı sekmeleri izle, eğer izlenen sekmelerden biri kapanırsa storage'ı temizle
chrome.tabs.onRemoved.addListener(async (tabId) => {
    if (tabId === state.sourceTabId) {
        await chrome.storage.local.set({ sourceTabId: null, bridgeActive: false });
        loadState();
    } else if (tabId === state.targetTabId) {
        await chrome.storage.local.set({ targetTabId: null, bridgeActive: false });
        loadState();
    }
});

// İçerik betiğine (content script) medya durdur/oynat komutu gönder
function controlMedia(tabId, action) {
    chrome.tabs.sendMessage(tabId, { action: action }, (response) => {
        if (chrome.runtime.lastError) {
            // Eğer sayfa yeni yenilendiyse veya content script henüz yoksa inject edip tekrar deneyelim
            console.log("Content script not active, injecting fallback script...");
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            }).then(() => {
                chrome.tabs.sendMessage(tabId, { action: action });
            }).catch(err => console.error("Script injection failed:", err));
        } else {
            console.log(`Command ${action} sent successfully to tab ${tabId}.`);
        }
    });
}
