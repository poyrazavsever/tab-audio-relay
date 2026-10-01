// Content Script for Audio Bridge
let isBridgePaused = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // acted: komut sayfada gerçekten bir medyayı duraklattı/oynattı mı (odak sayacı için)
    if (request.action === 'PAUSE_MEDIA') {
        const acted = pauseMedia();
        sendResponse({status: "Media paused", acted});
    } else if (request.action === 'PLAY_MEDIA') {
        const acted = playMedia();
        sendResponse({status: "Media played", acted});
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
            return true;
        }
    }

    // 2. Genel Media Element Kontrolü (YouTube vb.)
    const medias = getMediaElements();
    let paused = false;
    medias.forEach(media => {
        if (!media.paused) {
            media.pause();
            media.dataset.bridgePaused = 'true';
            isBridgePaused = true;
            paused = true;
        }
    });
    return paused;
}

function playMedia() {
    if (!isBridgePaused) return false;

    // 1. Spotify Özel Kontrolü
    const spotifyBtn = document.querySelector('[data-testid="control-button-playpause"]');
    if (spotifyBtn) {
        const ariaLabel = spotifyBtn.getAttribute('aria-label');
        if (ariaLabel === 'Play' || ariaLabel === 'Oynat') {
            spotifyBtn.click();
            isBridgePaused = false;
            return true;
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
        played = true;
    }
    
    isBridgePaused = false;
    return played;
}
