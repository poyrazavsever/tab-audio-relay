// Background Service Worker for Audio Bridge
console.log("Audio Bridge Background Script Loaded");

// Dinleme modülü (Observer) - Faz 1 ve Faz 2 için
// Sekmelerin ses (audible) ve oynatma (playing) durumlarını takip edecek

// Extension kurulduğunda çalışacak listener
chrome.runtime.onInstalled.addListener(() => {
  console.log("Audio Bridge extension installed.");
});
