// popup.js
const toggle = document.getElementById("toggle");
const badge = document.getElementById("badge");

const STORAGE_KEY = "pasteUnlocker_enabled";

// Load saved state
chrome.storage.local.get([STORAGE_KEY], (result) => {
  const enabled = result[STORAGE_KEY] !== false; // default true
  toggle.checked = enabled;
  updateBadge(enabled);
});

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;

  // Persist state
  chrome.storage.local.set({ [STORAGE_KEY]: enabled });

  // Notify the active tab's content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "TOGGLE_PASTE", enabled });
    }
  });

  updateBadge(enabled);
});

function updateBadge(enabled) {
  badge.textContent = enabled ? "Active" : "Disabled";
  badge.className = "status-badge" + (enabled ? " on" : "");
}
