// Content Script for Audio Bridge
let isBridgePaused = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PAUSE_MEDIA') {
        pauseMedia();
        sendResponse({status: "Media paused"});
    } else if (request.action === 'PLAY_MEDIA') {
        playMedia();
        sendResponse({status: "Media played"});
    }
    return true;
});

function getMediaElements() {
    return document.querySelectorAll('video, audio');
}

function pauseMedia() {
    // 1. Spotify Özel Kontrolü (SPA Butonu)
    // Spotify web player play/pause butonunu arıyoruz
    const spotifyBtn = document.querySelector('[data-testid="control-button-playpause"]');
    if (spotifyBtn) {
        const ariaLabel = spotifyBtn.getAttribute('aria-label');
        if (ariaLabel === 'Pause' || ariaLabel === 'Duraklat') {
            spotifyBtn.click();
            isBridgePaused = true;
            return;
        }
    }

    // 2. Genel Media Element Kontrolü (YouTube vb.)
    const medias = getMediaElements();
    medias.forEach(media => {
        if (!media.paused) {
            media.pause();
            media.dataset.bridgePaused = 'true';
            isBridgePaused = true;
        }
    });
}

function playMedia() {
    if (!isBridgePaused) return;

    // 1. Spotify Özel Kontrolü
    const spotifyBtn = document.querySelector('[data-testid="control-button-playpause"]');
    if (spotifyBtn) {
        const ariaLabel = spotifyBtn.getAttribute('aria-label');
        if (ariaLabel === 'Play' || ariaLabel === 'Oynat') {
            spotifyBtn.click();
            isBridgePaused = false;
            return;
        }
    }

    // 2. Genel Media Element Kontrolü
    const medias = getMediaElements();
    let played = false;
    
    medias.forEach(media => {
        if (media.dataset.bridgePaused === 'true') {
            media.play().catch(e => console.log('Auto-play prevented:', e));
            media.dataset.bridgePaused = 'false';
            played = true;
        }
    });

    if (!played && medias.length > 0) {
        medias[0].play().catch(e => console.log('Auto-play prevented:', e));
    }
    
    isBridgePaused = false;
}
