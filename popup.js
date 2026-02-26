// popup.js
var toggle       = document.getElementById('toggle');
var dot          = document.getElementById('dot');
var domainText   = document.getElementById('domain-text');
var domainList   = document.getElementById('domain-list');
var emptyMsg     = document.getElementById('empty-msg');
var blockedCount = document.getElementById('blocked-count');

var STORAGE_KEY = 'pu_disabled_domains';
var currentDomain = '';

// ── Load current tab's domain + state ────────────────────────────────────────
chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
  if (!tabs[0]) return;
  try {
    currentDomain = new URL(tabs[0].url).hostname;
  } catch(_) {
    currentDomain = tabs[0].url;
  }
  domainText.textContent = currentDomain || 'this page';
  loadState();
});

function loadState() {
  chrome.storage.local.get([STORAGE_KEY], function(result) {
    var disabled = result[STORAGE_KEY] || [];
    var isEnabled = disabled.indexOf(currentDomain) === -1;
    setUI(isEnabled);
    renderDisabledList(disabled);
  });
}

function setUI(enabled) {
  toggle.checked = enabled;
  dot.className  = 'domain-dot' + (enabled ? '' : ' off');
}

// ── Toggle ────────────────────────────────────────────────────────────────────
toggle.addEventListener('change', function() {
  var enabled = toggle.checked;
  setUI(enabled);

  chrome.storage.local.get([STORAGE_KEY], function(result) {
    var disabled = result[STORAGE_KEY] || [];
    if (!enabled) {
      if (disabled.indexOf(currentDomain) === -1) disabled.push(currentDomain);
    } else {
      disabled = disabled.filter(function(d) { return d !== currentDomain; });
    }
    chrome.storage.local.set({ [STORAGE_KEY]: disabled }, function() {
      renderDisabledList(disabled);
      // Notify the active tab
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_PASTE', enabled: enabled });
        }
      });
    });
  });
});

// ── Render blocked domains list ───────────────────────────────────────────────
function renderDisabledList(disabled) {
  blockedCount.textContent = disabled.length + ' site' + (disabled.length !== 1 ? 's' : '');

  // Clear existing items (keep emptyMsg in DOM)
  Array.from(domainList.querySelectorAll('.domain-item')).forEach(function(el) {
    el.remove();
  });

  if (disabled.length === 0) {
    emptyMsg.style.display = '';
    return;
  }
  emptyMsg.style.display = 'none';

  disabled.forEach(function(domain) {
    var item = document.createElement('div');
    item.className = 'domain-item';

    var label = document.createElement('span');
    label.textContent = domain;

    var btn = document.createElement('button');
    btn.textContent = '×';
    btn.title = 'Re-enable on ' + domain;
    btn.addEventListener('click', function() {
      chrome.storage.local.get([STORAGE_KEY], function(result) {
        var list = (result[STORAGE_KEY] || []).filter(function(d) { return d !== domain; });
        chrome.storage.local.set({ [STORAGE_KEY]: list }, function() {
          // If we just re-enabled the current domain, update the toggle
          if (domain === currentDomain) {
            setUI(true);
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
              if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_PASTE', enabled: true });
              }
            });
          }
          renderDisabledList(list);
        });
      });
    });

    item.appendChild(label);
    item.appendChild(btn);
    domainList.appendChild(item);
  });
}

