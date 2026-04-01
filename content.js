// Content Script for Audio Bridge
// Medya oynatma komutlarını çalıştırır

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
    const medias = getMediaElements();
    medias.forEach(media => {
        if (!media.paused) {
            media.pause();
            // Bu elementin bizim tarafımızdan durdurulduğunu işaretleyelim
            // Böylece playMedia çağrıldığında sadece onu devam ettiririz.
            media.dataset.bridgePaused = 'true';
        }
    });
}

function playMedia() {
    const medias = getMediaElements();
    let played = false;
    
    // Önce bizim tarafımızdan durdurulanları oynatmayı dene
    medias.forEach(media => {
        if (media.dataset.bridgePaused === 'true') {
            media.play().catch(e => console.log('Auto-play prevented:', e));
            media.dataset.bridgePaused = 'false';
            played = true;
        }
    });

    // Eğer bizim durdurduğumuz yoksa sayfadaki ilk videoyu/sesi oynat (Örn: sayfa yeni açılmışsa)
    if (!played && medias.length > 0) {
        medias[0].play().catch(e => console.log('Auto-play prevented:', e));
    }
}
