document.addEventListener('DOMContentLoaded', async () => {
    const bridgeToggle = document.getElementById('bridgeToggle');
    const bridgeStatus = document.getElementById('bridgeStatus');
    const sourceTabSelect = document.getElementById('sourceTab');
    const targetTabSelect = document.getElementById('targetTab');

    // Restore state from storage
    const state = await chrome.storage.local.get(['bridgeActive', 'sourceTabId', 'targetTabId']);
    
    bridgeToggle.checked = state.bridgeActive || false;
    updateStatusText(bridgeToggle.checked);

    // Populate tabs
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    
    populateSelect(sourceTabSelect, tabs, state.sourceTabId);
    populateSelect(targetTabSelect, tabs, state.targetTabId);

    // Event Listeners
    bridgeToggle.addEventListener('change', async (e) => {
        const isActive = e.target.checked;
        updateStatusText(isActive);
        await chrome.storage.local.set({ bridgeActive: isActive });
        notifyBackground();
    });

    sourceTabSelect.addEventListener('change', async (e) => {
        const value = e.target.value ? parseInt(e.target.value, 10) : null;
        await chrome.storage.local.set({ sourceTabId: value });
        notifyBackground();
    });

    targetTabSelect.addEventListener('change', async (e) => {
        const value = e.target.value ? parseInt(e.target.value, 10) : null;
        await chrome.storage.local.set({ targetTabId: value });
        notifyBackground();
    });

    function updateStatusText(isActive) {
        bridgeStatus.textContent = isActive ? 'Köprü Açık' : 'Köprü Kapalı';
        bridgeStatus.style.color = isActive ? '#10b981' : '#6b7280';
    }

    function populateSelect(selectElement, tabs, selectedId) {
        selectElement.innerHTML = '<option value="">Seçiniz...</option>';
        tabs.forEach(tab => {
            const option = document.createElement('option');
            option.value = tab.id;
            // Shorten title if too long
            const title = tab.title.length > 40 ? tab.title.substring(0, 40) + '...' : tab.title;
            option.textContent = title;
            
            if (selectedId && tab.id === selectedId) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        });
    }

    function notifyBackground() {
        chrome.runtime.sendMessage({ type: 'SETTINGS_CHANGED' });
    }
});
