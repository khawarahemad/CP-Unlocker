# CP Unlocker — Chrome Extension

A Chrome extension that **force-enables paste, copy, and right-click** on websites that block them — built specifically to work with competitive programming judges like **GeeksforGeeks**, **HackerRank**, **HackerEarth**, and similar platforms.

---

## Features

- **Paste anywhere** — Cmd+V / Ctrl+V works even when the site blocks it
- **Copy anywhere** — Cmd+C / Ctrl+C no longer gets intercepted
- **Right-click restored** — Context menu works on pages that disable it
- **Multi-line paste** — Full code blocks paste correctly into CodeMirror editors (GFG, etc.)
- **Toast removal** — "Pasting in this window is prohibited!" popups are auto-removed
- **Toggle on/off** — Popup switch to enable/disable per tab instantly

---

## How It Works

GFG and similar sites block paste at multiple levels:

| Blocking method | Our bypass |
|---|---|
| `addEventListener('paste', ...)` calling `preventDefault()` | We wrap `EventTarget.prototype.addEventListener` so paste listeners can never call `preventDefault` |
| `window` / `document` level paste block | Capture-phase listeners on both that neutralise the event first |
| Blocking `keydown` for Cmd+V | Capture-phase `keydown` fires before the page, calls `stopImmediatePropagation()`, reads clipboard via extension API, inserts via CodeMirror's own `replaceSelection()` |
| `contextmenu` disabled | Same capture-phase `stopImmediatePropagation()` trick |
| Toast popup ("prohibited!") | `MutationObserver` detects and removes the node immediately |

---

## File Structure

```
CP-Unlocker/
├── manifest.json      # Extension config (Manifest V3)
├── content.js         # Runs in extension context; bridges clipboard API to page
├── injected.js        # Runs in PAGE's JS context; overrides event handling
├── popup.html         # Toggle UI
├── popup.js           # Saves state & notifies active tab
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Installation (Developer Mode)

1. Clone or download this repo
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the `CP-Unlocker` folder
6. A permission prompt may appear — click **Allow** (for clipboard access)

---

## Usage

- The extension is **enabled by default** on all tabs
- Click the extension icon in the toolbar to toggle it on/off for the current tab
- Reload the page after toggling for full effect

---

## Supported Sites

Tested and working on:
- [GeeksforGeeks](https://geeksforgeeks.org) — including CodeMirror code editor
- Any site that uses `preventDefault()` on paste/copy/contextmenu events

---

## Permissions

| Permission | Reason |
|---|---|
| `clipboardRead` | Read clipboard text when Cmd+V is pressed in a blocked editor |
| `clipboardWrite` | Reserved for future cut support |
| `scripting` | Inject scripts into page context |
| `activeTab` | Communicate with the current tab |
| `storage` | Save enabled/disabled state |

---

## License

MIT License — free to use and modify.
