document.addEventListener('DOMContentLoaded', () => {
    const bridgeToggle = document.getElementById('bridgeToggle');
    const bridgeStatus = document.getElementById('bridgeStatus');
    const sourceTabSelect = document.getElementById('sourceTab');
    const targetTabSelect = document.getElementById('targetTab');

    // Durumu güncelle
    bridgeToggle.addEventListener('change', (e) => {
        const isActive = e.target.checked;
        bridgeStatus.textContent = isActive ? 'Açık' : 'Kapalı';
        bridgeStatus.style.color = isActive ? '#2196F3' : '#333';
        
        // TODO: Arka plana durumu bildir
    });

    // TODO: Açık sekmeleri listele
});
