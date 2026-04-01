<div align="center">
  <img src="assets/logoPng.png" alt="Audio Bridge Logo" width="150" />
</div>

# Audio Bridge

A minimalist browser extension designed to instantly synchronize audio playback between two distinct tabs. Built to eliminate the friction of manually pausing and playing background media during focused work.

## How It Works

Audio Bridge establishes a bidirectional link between any two tabs (e.g., an educational video and a music player).

- When **Tab A** plays audio, **Tab B** is automatically paused.
- When **Tab A** is manually paused, **Tab B** automatically resumes.
- The background state engine intelligently handles transitions to prevent infinite playback loops.

## Architecture Highlights

- **Observer:** Listens to passive audio state changes natively via the browser API, eliminating the need to poll the DOM.
- **Controller:** A Service Worker mechanism that maintains an intentional state memory to manage race conditions and delay configurations safely.
- **Executor:** A lightweight content script capable of controlling standard HTML5 media and complex single-page applications (like Spotify Web).

## Usage

1. Open the extension popup.
2. Select your two media tabs from the dropdown menus.
3. Toggle the bridge switch to **On**.
4. **Shortcut:** Use `Ctrl+Shift+Y` (or `Cmd+Shift+Y` on Mac) to toggle the bridge on the fly.

## Installation

Supports both Google Chrome and Mozilla Firefox (Manifest V3).

- **Chrome:** Navigate to `chrome://extensions/` > Enable **Developer mode** > Click **Load unpacked** > Select the project directory.
- **Firefox:** Navigate to `about:debugging#/runtime/this-firefox` > Click **Load Temporary Add-on...** > Select `manifest.json`.
