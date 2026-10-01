<div align="center">
  <img src="assets/logo.png" alt="Audio Bridge Logo" width="150" />
</div>

https://github.com/user-attachments/assets/7b1014dc-61f7-4d28-90cf-3039b2bed7d8

# Audio Bridge

Audio Bridge is a lightweight browser extension that synchronizes playback behavior between two selected tabs to keep your focus flow uninterrupted.

Language docs:

- English (this file)
- Turkish: [README.tr.md](README.tr.md)

## Preview (EN)

<p align="center">
  <img src="assets/screen-en.png" alt="Audio Bridge popup in English" width="360" />
</p>

## How It Works

Audio Bridge creates a smart bridge between two tabs (for example, a course video and a music player):

- If **Tab A** becomes audible, **Tab B** is paused.
- If **Tab A** stops (manual pause / no longer audible), **Tab B** is resumed after a configurable delay.
- Internal state handling is used to prevent pause/play loops.

## Features

- **Toolbar badge:** A green `ON` badge on the extension icon shows at a glance that the bridge is active, including when you toggle it with the keyboard shortcut.
- **Focus switches counter:** The popup shows how many times the bridge switched playback for you today. Only switches that actually paused or resumed media are counted, and the counter resets every day.

## Architecture Highlights

- **Observer:** Tracks tab audible updates using browser tab events.
- **Controller:** Service worker applies bridge rules and timing.
- **Executor:** Content script sends media play/pause actions to page players.

## Usage

1. Open the extension popup.
2. Pick **Tab A** and **Tab B** from dropdowns.
3. Set transition delay in milliseconds (optional).
4. Turn the bridge **On**.
5. Shortcut: `Ctrl+Shift+Y` (Windows/Linux) or `Cmd+Shift+Y` (macOS). The toolbar badge shows `ON` while the bridge is active.

## Localization

The popup UI and the extension's store name/description (via `_locales`) support:

- Turkish (`tr`)
- English (`en`)

If the browser language is neither Turkish nor English, the UI defaults to English.

## Installation

Supports both Google Chrome and Mozilla Firefox (Manifest V3).

- **Chrome:** Navigate to `chrome://extensions/` > Enable **Developer mode** > Click **Load unpacked** > Select the project directory.
- **Firefox:** Navigate to `about:debugging#/runtime/this-firefox` > Click **Load Temporary Add-on...** > Select `manifest.json`.
