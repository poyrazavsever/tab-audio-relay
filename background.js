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
    updateBadge();
}

// Toolbar rozeti: köprü açıkken ikonda yeşil "ON" göster
function updateBadge() {
    chrome.action.setBadgeText({ text: state.bridgeActive ? 'ON' : '' });
    chrome.action.setBadgeBackgroundColor({ color: '#10b981' });
    chrome.action.setBadgeTextColor?.({ color: '#ffffff' });
}

// Initial load: olay dinleyicileri state yüklenmeden çalışmasın diye bu promise beklenir
const stateReady = loadState();

// Tarayıcı açılışında/kurulumda worker'ı uyandırıp rozeti geri yükle (rozet oturumlar arasında saklanmaz)
chrome.runtime.onStartup.addListener(loadState);
chrome.runtime.onInstalled.addListener(loadState);

// Popup, kısayol veya sekme kapanması storage'ı değiştirdiğinde state'i tazele
chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (['bridgeActive', 'tabA', 'tabB', 'delayMs'].some(key => key in changes)) {
        // Köprü kapandıysa veya sekmeler değiştiyse bekleyen geçişi iptal et ve takibi sıfırla
        if ('bridgeActive' in changes || 'tabA' in changes || 'tabB' in changes) {
            resetTransition();
        }
        loadState();
    }
});

// Kısayol (Shortcut) dinleyici
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'toggle_bridge') {
        await stateReady;
        state.bridgeActive = !state.bridgeActive;
        await chrome.storage.local.set({ bridgeActive: state.bridgeActive });
        console.log(`Bridge toggled via shortcut. Active: ${state.bridgeActive}`);
    }
});

// Sekme durum değişikliklerini dinle
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.audible === undefined) return;
    await stateReady;
    if (!state.bridgeActive || !state.tabA || !state.tabB || state.tabA === state.tabB) return;

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
    await stateReady;
    if (tabId === state.tabA || tabId === state.tabB) {
        if (tabId === state.tabA) await chrome.storage.local.set({ tabA: null, bridgeActive: false });
        if (tabId === state.tabB) await chrome.storage.local.set({ tabB: null, bridgeActive: false });
    }
});

function resetTransition() {
    if (playTimeout) {
        clearTimeout(playTimeout);
        playTimeout = null;
    }
    intendedPlayingTabId = null;
}

function controlMedia(tabId, action) {
    chrome.tabs.sendMessage(tabId, { action: action }, (response) => {
        if (chrome.runtime.lastError) {
            console.log(`Injecting fallback script into tab ${tabId}...`);
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
