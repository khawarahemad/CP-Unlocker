// injected.js - PAGE context. Bypasses GFG paste/copy/right-click blocking.
(function () {
  var enabled = true;

  // 1. Re-enable right-click
  document.addEventListener('contextmenu', function(e) {
    if (enabled) e.stopImmediatePropagation();
  }, true);

  // 2. Wrap paste/copy/cut/contextmenu listeners so they cannot block
  var _addEL = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, fn, opts) {
    var blocked = ['paste','copy','cut','contextmenu'];
    if (enabled && blocked.indexOf(type) !== -1 && typeof fn === 'function') {
      var wrapped = function(e) {
        e.preventDefault = function(){};
        e.stopPropagation = function(){};
        e.stopImmediatePropagation = function(){};
        try { fn.call(this, e); } catch(x){}
      };
      wrapped._orig = fn;
      return _addEL.call(this, type, wrapped, opts);
    }
    return _addEL.call(this, type, fn, opts);
  };

  // 3. Earliest capture: neutralise paste/copy/cut on document and window
  ['paste','copy','cut'].forEach(function(ev) {
    [document, window].forEach(function(target) {
      target.addEventListener(ev, function(e) {
        if (!enabled) return;
        e.preventDefault = function(){};
        e.stopPropagation = function(){};
        e.stopImmediatePropagation = function(){};
      }, true);
    });
  });

  // 4. Intercept Cmd+V / Ctrl+V at keydown level
  document.addEventListener('keydown', function(e) {
    if (!enabled) return;
    var metaOrCtrl = e.ctrlKey || e.metaKey;
    var isPaste = metaOrCtrl && e.key === 'v';
    var isCopy  = metaOrCtrl && e.key === 'c';
    var isCut   = metaOrCtrl && e.key === 'x';
    if (isCopy || isCut) {
      e.stopImmediatePropagation();
      return;
    }
    if (!isPaste) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    // Ask content.js (extension context) to read the clipboard
    window.postMessage({ type: 'PU_GET_CLIPBOARD' }, '*');
  }, true);

  // 5. Receive clipboard text and insert into the editor
  window.addEventListener('message', function(evt) {
    if (!evt.data || evt.data.type !== 'PU_CLIPBOARD_TEXT') return;
    var text = evt.data.text;
    if (!text) return;

    var active = document.activeElement;

    // ── CodeMirror FIRST (GFG's code editor) ─────────────────────────────────
    // The hidden <textarea> inside CodeMirror must NOT be treated as a plain
    // textarea — we must use CodeMirror's own API so multi-line text works.
    var cmEl = document.querySelector('.CodeMirror');
    if (cmEl && cmEl.CodeMirror) {
      var cm = cmEl.CodeMirror;
      // Normalise line endings so each \n becomes a real new line in the editor
      var lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      cm.replaceSelection(lines, 'end');
      cm.focus();
      return;
    }

    // ── Also check if the active element itself IS inside a CodeMirror wrap ──
    if (active) {
      var parent = active.closest && active.closest('.CodeMirror');
      if (!parent) {
        // Walk up manually for older browsers
        var node = active.parentElement;
        while (node) {
          if (node.classList && node.classList.contains('CodeMirror')) {
            parent = node; break;
          }
          node = node.parentElement;
        }
      }
      if (parent && parent.CodeMirror) {
        var cm2 = parent.CodeMirror;
        cm2.replaceSelection(text.replace(/\r\n/g, '\n').replace(/\r/g, '\n'), 'end');
        cm2.focus();
        return;
      }
    }

    // ── Standard input / textarea (NOT inside CodeMirror) ────────────────────
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      var s = active.selectionStart || 0;
      var end = active.selectionEnd || 0;
      active.value = active.value.slice(0, s) + text + active.value.slice(end);
      active.selectionStart = active.selectionEnd = s + text.length;
      active.dispatchEvent(new Event('input',  { bubbles: true }));
      active.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    // ── contenteditable ───────────────────────────────────────────────────────
    if (active && active.isContentEditable) {
      document.execCommand('insertText', false, text);
      return;
    }
  });

  // 6. Remove GFG "prohibited" toast popups
  new MutationObserver(function(mutations) {
    if (!enabled) return;
    mutations.forEach(function(m) {
      m.addedNodes.forEach(function(node) {
        if (node.nodeType !== 1) return;
        if ((node.textContent || '').indexOf('prohibited') !== -1) {
          node.remove();
        }
      });
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

  // 7. Toggle from popup
  window.addEventListener('PasteUnlocker_toggle', function(e) {
    enabled = e.detail.enabled;
  });
})();
