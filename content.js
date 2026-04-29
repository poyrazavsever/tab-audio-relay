// Content Script for Audio Bridge
let isBridgePaused = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'PAUSE_MEDIA') {
        pauseMedia();
        sendResponse({ status: "Media paused" });
    } else if (request.action === 'PLAY_MEDIA') {
        playMedia();
        sendResponse({ status: "Media played" });
    } else if (request.action === 'TOGGLE_MEDIA') {
        toggleMedia();
        sendResponse({ status: "Media toggled" });
    } else if (request.action === 'GET_MEDIA_STATE') {
        const state = getMediaState();
        sendResponse(state);
    }
    return true;
});

function getMediaElements() {
    return document.querySelectorAll('video, audio');
}

function getMediaState() {
    // Spotify check (hızlı)
    const spotifyBtn = document.querySelector('[data-testid="control-button-playpause"]');
    if (spotifyBtn) {
        const ariaLabel = spotifyBtn.getAttribute('aria-label');
        const isPlaying = ariaLabel === 'Pause' || ariaLabel === 'Duraklat';
        return { isPlaying, hasMedia: true };
    }

    // HTML5 video/audio check (hızlı)
    const medias = getMediaElements();
    if (medias.length === 0) {
        return { isPlaying: false, hasMedia: false };
    }

    // Herhangi biri playing mi?
    for (let media of medias) {
        if (!media.paused && media.currentTime > 0) {
            return { isPlaying: true, hasMedia: true };
        }
    }

    return { isPlaying: false, hasMedia: true };
}

function toggleMedia() {
    const state = getMediaState();

    if (!state.hasMedia) return;

    if (state.isPlaying) {
        pauseMedia();
    } else {
        playMedia();
    }
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
