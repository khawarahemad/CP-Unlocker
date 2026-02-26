// content.js - extension isolated world (document_start)
(function () {
  var domain = location.hostname;
  var STORAGE_KEY = 'pu_disabled_domains';

  // Inject injected.js into the PAGE's JS context
  var script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  (document.head || document.documentElement).appendChild(script);
  script.remove();

  // Apply per-domain saved state on load
  chrome.storage.local.get([STORAGE_KEY], function(result) {
    var disabled = result[STORAGE_KEY] || [];
    var isEnabled = disabled.indexOf(domain) === -1;
    if (!isEnabled) {
      window.dispatchEvent(
        new CustomEvent('PasteUnlocker_toggle', { detail: { enabled: false } })
      );
    }
    // Notify popup of current state
    chrome.runtime.sendMessage({ type: 'STATE_UPDATE', enabled: isEnabled, domain: domain });
  });

  // Bridge: page asks for clipboard → read it here (extension has permission) → send back
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.type !== 'PU_GET_CLIPBOARD') return;
    navigator.clipboard.readText().then(function(text) {
      window.postMessage({ type: 'PU_CLIPBOARD_TEXT', text: text }, '*');
    }).catch(function() {});
  });

  // Messages from popup
  chrome.runtime.onMessage.addListener(function(msg) {
    if (msg.type === 'TOGGLE_PASTE') {
      window.dispatchEvent(
        new CustomEvent('PasteUnlocker_toggle', { detail: { enabled: msg.enabled } })
      );
      // Persist per-domain state
      chrome.storage.local.get([STORAGE_KEY], function(result) {
        var disabled = result[STORAGE_KEY] || [];
        if (!msg.enabled) {
          if (disabled.indexOf(domain) === -1) disabled.push(domain);
        } else {
          disabled = disabled.filter(function(d) { return d !== domain; });
        }
        chrome.storage.local.set({ [STORAGE_KEY]: disabled });
      });
    }
    if (msg.type === 'GET_STATE') {
      chrome.storage.local.get([STORAGE_KEY], function(result) {
        var disabled = result[STORAGE_KEY] || [];
        chrome.runtime.sendMessage({
          type: 'STATE_UPDATE',
          enabled: disabled.indexOf(domain) === -1,
          domain: domain
        });
      });
    }
  });
})();
