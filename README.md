# CP Unlocker — Chrome Extension

A Chrome extension that **force-enables paste, copy, and right-click** on websites that block them — built for competitive programmers using platforms like **GeeksforGeeks**, **LeetCode**, **HackerRank**, **HackerEarth**, **CodeChef**, and more.

---

## Features

| Feature | Details |
|---|---|
| **Paste anywhere** | Cmd+V / Ctrl+V works even when the site blocks it |
| **Copy anywhere** | Cmd+C / Ctrl+C no longer gets intercepted |
| **Right-click restored** | Context menu works on pages that disable it |
| **Multi-line paste** | Full code blocks paste correctly — no single-line truncation |
| **Multi-editor support** | CodeMirror 5/6, Monaco, ACE, plain textarea, contenteditable |
| **Toast removal** | "Pasting is prohibited!" popups are auto-removed |
| **Per-domain toggle** | Enable/disable per site — state saved across restarts |
| **Keyboard shortcut** | `Alt+Shift+P` toggles on/off from any tab |
| **Disabled sites list** | Popup shows all disabled domains with one-click re-enable |

---

## Supported Editors

| Editor | Sites |
|---|---|
| **CodeMirror 5** | GeeksforGeeks, HackerEarth, CodeChef |
| **CodeMirror 6** | Newer CP platforms |
| **Monaco Editor** | LeetCode, Azure, VS Code Web |
| **ACE Editor** | HackerRank, CodePen, JSFiddle |
| **Plain Textarea** | Any site with `<input>` or `<textarea>` |
| **Contenteditable** | Rich text editors, Gmail, Notion, etc. |

---

## How It Works

GFG and similar sites block paste at multiple levels. CP Unlocker defeats them all:

| Blocking method | Bypass |
|---|---|
| `addEventListener('paste', ...)` calling `preventDefault()` | We override `EventTarget.prototype.addEventListener` — paste listeners can never call `preventDefault` |
| `window/document` level paste block | Capture-phase listeners that neutralise the event before page code runs |
| Blocking `keydown` for Cmd+V | Capture-phase `keydown` fires first, stops GFG's handler, reads clipboard via extension API, inserts via editor's native API |
| `contextmenu` disabled | Same capture-phase `stopImmediatePropagation()` |
| Toast popups ("prohibited!") | `MutationObserver` removes nodes containing "prohibited" instantly |

---

## File Structure

```
CP-Unlocker/
├── manifest.json      # Extension config (Manifest V3)
├── background.js      # Service worker — handles keyboard shortcut
├── content.js         # Runs in extension context; bridges clipboard + domain state
├── injected.js        # Runs in PAGE's JS context; overrides event handling
├── popup.html         # Per-domain toggle UI + disabled sites list
├── popup.js           # Popup logic with domain state management
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Installation (Developer Mode)

1. Clone or download this repo
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the `CP-Unlocker` folder
6. Grant clipboard access when prompted

---

## Usage

- **Paste**: Press `Cmd+V` (Mac) or `Ctrl+V` (Windows/Linux) in any editor
- **Toggle shortcut**: `Alt+Shift+P` — works without opening the popup
- **Per-site control**: Click the extension icon to enable/disable for the current site
- **Re-enable a site**: Open the popup → click `×` next to a disabled domain

---

## Permissions

| Permission | Reason |
|---|---|
| `clipboardRead` | Read clipboard when Cmd+V is intercepted |
| `clipboardWrite` | Reserved for future cut/paste operations |
| `scripting` | Inject scripts into page context |
| `activeTab` | Communicate with the current tab |
| `storage` | Persist per-domain enabled/disabled state |

---

## License

MIT License — free to use and modify.


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
