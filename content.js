// content.js - extension isolated world (document_start)
(function () {
  // Inject injected.js into the PAGE's JS context
  var script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  (document.head || document.documentElement).appendChild(script);
  script.remove();

  // Bridge: page asks for clipboard → content script reads it (has extension perms) → sends back
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.type !== 'PU_GET_CLIPBOARD') return;
    navigator.clipboard.readText().then(function(text) {
      window.postMessage({ type: 'PU_CLIPBOARD_TEXT', text: text }, '*');
    }).catch(function() {
      // silent fail if clipboard permission denied
    });
  });

  // Toggle messages from popup
  chrome.runtime.onMessage.addListener(function(msg) {
    if (msg.type === 'TOGGLE_PASTE') {
      window.dispatchEvent(
        new CustomEvent('PasteUnlocker_toggle', { detail: { enabled: msg.enabled } })
      );
    }
  });
})();
