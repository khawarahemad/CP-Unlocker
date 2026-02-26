// injected.js - PAGE context. Bypasses paste/copy/right-click blocking.
// Supports: CodeMirror (GFG), Monaco (LeetCode), ACE (HackerRank), plain inputs.
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
    var normalised = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    var active = document.activeElement;

    // ── Monaco Editor (LeetCode, Azure, VS Code Web) ──────────────────────────
    if (window.monaco && window.monaco.editor) {
      var monacoEditors = window.monaco.editor.getEditors();
      if (monacoEditors && monacoEditors.length > 0) {
        var ed = monacoEditors[0];
        ed.focus();
        ed.trigger('keyboard', 'type', { text: normalised });
        return;
      }
    }

    // ── ACE Editor (HackerRank, CodePen, JSFiddle) ────────────────────────────
    var aceEl = document.querySelector('.ace_editor');
    if (aceEl && window.ace) {
      try {
        var aceEditor = window.ace.edit(aceEl);
        aceEditor.insert(normalised);
        aceEditor.focus();
        return;
      } catch(x) {}
    }

    // ── CodeMirror 5 (GFG, HackerEarth, CodeChef) ────────────────────────────
    var cmEl = document.querySelector('.CodeMirror');
    if (cmEl && cmEl.CodeMirror) {
      cmEl.CodeMirror.replaceSelection(normalised, 'end');
      cmEl.CodeMirror.focus();
      return;
    }

    // ── CodeMirror 6 (newer sites) ────────────────────────────────────────────
    var cm6El = document.querySelector('.cm-editor');
    if (cm6El) {
      var cm6View = cm6El.cmView && cm6El.cmView.view;
      if (cm6View) {
        try {
          var tr = cm6View.state.update({
            changes: {
              from: cm6View.state.selection.main.from,
              to:   cm6View.state.selection.main.to,
              insert: normalised
            }
          });
          cm6View.dispatch(tr);
          cm6View.focus();
          return;
        } catch(x) {}
      }
    }

    // ── Walk up from active element: catches any wrapped CodeMirror ───────────
    if (active) {
      var node = active;
      while (node) {
        if (node.CodeMirror) {
          node.CodeMirror.replaceSelection(normalised, 'end');
          node.CodeMirror.focus();
          return;
        }
        node = node.parentElement;
      }
    }

    // ── Standard INPUT / TEXTAREA ─────────────────────────────────────────────
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
      var s = active.selectionStart || 0;
      var end = active.selectionEnd || 0;
      active.value = active.value.slice(0, s) + normalised + active.value.slice(end);
      active.selectionStart = active.selectionEnd = s + normalised.length;
      active.dispatchEvent(new Event('input',  { bubbles: true }));
      active.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    // ── Contenteditable ───────────────────────────────────────────────────────
    if (active && active.isContentEditable) {
      document.execCommand('insertText', false, normalised);
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
