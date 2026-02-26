// background.js — service worker
// Handles the Alt+Shift+P keyboard shortcut to toggle the extension.

chrome.commands.onCommand.addListener(function(command) {
  if (command !== 'toggle-unlocker') return;
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    if (!tabs[0]) return;
    var tabId = tabs[0].id;
    var domain = new URL(tabs[0].url).hostname;
    var STORAGE_KEY = 'pu_disabled_domains';

    chrome.storage.local.get([STORAGE_KEY], function(result) {
      var disabled = result[STORAGE_KEY] || [];
      var isCurrentlyEnabled = disabled.indexOf(domain) === -1;
      var newEnabled = !isCurrentlyEnabled;

      if (!newEnabled) {
        if (disabled.indexOf(domain) === -1) disabled.push(domain);
      } else {
        disabled = disabled.filter(function(d) { return d !== domain; });
      }
      chrome.storage.local.set({ [STORAGE_KEY]: disabled }, function() {
        chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_PASTE', enabled: newEnabled });
      });
    });
  });
});
