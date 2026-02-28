// injected.js - PAGE context. Bypasses paste/copy/right-click blocking.
// Supports: CodeMirror (GFG), Monaco (LeetCode), ACE (HackerRank), plain inputs.
// Also: unblocks text selection and bypasses tab-switch warning modals.
(function () {
  var enabled = true;

  // ── 0. Force text selection to be always allowed ─────────────────────────
  (function injectSelectionCSS() {
    var style = document.createElement('style');
    style.id = '__pu_selection__';
    style.textContent = [
      '*, *::before, *::after {',
      '  -webkit-user-select: text !important;',
      '  -moz-user-select: text !important;',
      '  -ms-user-select: text !important;',
      '  user-select: text !important;',
      '}'
    ].join('\n');
    (document.head || document.documentElement).appendChild(style);
  })();

  // ── 0b. Spoof every tab-switch detection API ─────────────────────────────

  // 1) Page Visibility API
  try {
    Object.defineProperty(document, 'hidden', {
      get: function() { return false; }, configurable: true
    });
    Object.defineProperty(document, 'visibilityState', {
      get: function() { return 'visible'; }, configurable: true
    });
    Object.defineProperty(document, 'webkitVisibilityState', {
      get: function() { return 'visible'; }, configurable: true
    });
    Object.defineProperty(document, 'webkitHidden', {
      get: function() { return false; }, configurable: true
    });
  } catch(x) {}

  // 2) document.hasFocus() — many proctoring tools poll this
  try {
    document.hasFocus = function() { return true; };
  } catch(x) {}

  // 3) Block inline on* property assignments for tab-switch events
  try {
    var _silenced = ['onvisibilitychange', 'onblur', 'onpagehide', 'onmouseout', 'onmouseleave'];
    _silenced.forEach(function(prop) {
      [document, window].forEach(function(target) {
        Object.defineProperty(target, prop, {
          get: function() { return null; },
          set: function() { /* silently discard */ },
          configurable: true
        });
      });
    });
  } catch(x) {}

  // ── 1. Re-enable right-click ──────────────────────────────────────────────
  document.addEventListener('contextmenu', function(e) {
    if (enabled) e.stopImmediatePropagation();
  }, true);

  // ── 2. Wrap event listeners so they cannot block copy/paste/selection/tab-switch ──
  var _addEL = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, fn, opts) {
    var pasteBlocked = ['paste','copy','cut','contextmenu','selectstart','dragstart'];

    // a) Paste/copy/selection: neutralise preventDefault so actions still work
    if (enabled && pasteBlocked.indexOf(type) !== -1 && typeof fn === 'function') {
      var wrapped = function(e) {
        e.preventDefault = function(){};
        e.stopPropagation = function(){};
        e.stopImmediatePropagation = function(){};
        try { fn.call(this, e); } catch(x){}
      };
      wrapped._orig = fn;
      return _addEL.call(this, type, wrapped, opts);
    }

    // b) Tab-switch / window-blur detection: suppress on document & window
    if (enabled && typeof fn === 'function') {
      var isDocWin = (this === document || this === window);
      var tabDetect = [
        'visibilitychange', 'webkitvisibilitychange',
        'blur', 'pagehide',
        'mouseout', 'mouseleave'  // cursor-leave-browser detection
      ];
      if (isDocWin && tabDetect.indexOf(type) !== -1) {
        var noop = function() {};
        noop._orig = fn;
        return _addEL.call(this, type, noop, opts); // dead handler
      }
      // Suppress focus-loss counter tricks (some proctoring tools count focus events)
      if (this === window && type === 'focus') {
        var noopFocus = function() {};
        noopFocus._orig = fn;
        return _addEL.call(this, type, noopFocus, opts);
      }
    }

    return _addEL.call(this, type, fn, opts);
  };

  // ── 3. Earliest capture: neutralise paste/copy/cut/selectstart on document and window ──
  ['paste','copy','cut','selectstart','dragstart'].forEach(function(ev) {
    [document, window].forEach(function(target) {
      target.addEventListener(ev, function(e) {
        if (!enabled) return;
        e.preventDefault = function(){};
        e.stopPropagation = function(){};
        e.stopImmediatePropagation = function(){};
      }, true);
    });
  });

  // ── 3b. Capture-phase swallow: stop all tab-switch events before page sees them ──
  var _tabEvents = [
    'visibilitychange', 'webkitvisibilitychange',
    'blur', 'pagehide',
    'mouseout', 'mouseleave'
  ];
  _tabEvents.forEach(function(ev) {
    // Register via raw _addEL so our own wrapper doesn't neutralise these
    _addEL.call(document, ev, function(e) {
      if (!enabled) return;
      e.stopImmediatePropagation();
    }, true);
    _addEL.call(window, ev, function(e) {
      if (!enabled) return;
      e.stopImmediatePropagation();
    }, true);
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

    // ── CodeMirror 6 (newer sites) — improved EditorView detection ───────────
    var cm6El = document.querySelector('.cm-editor');
    if (cm6El) {
      var cm6View = null;
      // Strategy 1: cmView.view on the root element
      if (cm6El.cmView && cm6El.cmView.view) cm6View = cm6El.cmView.view;
      // Strategy 2: cmEditor property (some bundlers expose it here)
      if (!cm6View && cm6El.cmEditor) cm6View = cm6El.cmEditor;
      // Strategy 3: walk into .cm-content child (EditorView attaches there too)
      if (!cm6View) {
        var cm6Content = cm6El.querySelector('.cm-content');
        if (cm6Content) {
          if (cm6Content.cmView && cm6Content.cmView.view) cm6View = cm6Content.cmView.view;
          else if (cm6Content.cmView && cm6Content.cmView.docView && cm6Content.cmView.docView.view)
            cm6View = cm6Content.cmView.docView.view;
        }
      }
      // Strategy 4: global EditorView registry (CodeMirror 6 keeps live views in a WeakMap;
      //             some sites expose them on window for dev tooling)
      if (!cm6View && window._cm6EditorView) cm6View = window._cm6EditorView;
      if (cm6View) {
        try {
          var sel = cm6View.state.selection.main;
          cm6View.dispatch(cm6View.state.update({
            changes: { from: sel.from, to: sel.to, insert: normalised },
            selection: { anchor: sel.from + normalised.length }
          }));
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

    // ── ProseMirror (Notion, Atlassian, newer contest platforms) ─────────────
    var pmEl = document.querySelector('.ProseMirror');
    if (pmEl && pmEl.isContentEditable) {
      pmEl.focus();
      // Try ProseMirror's own view API first (view is stored as a property of the DOM node)
      var pmView = null;
      if (pmEl.pmViewDesc && pmEl.pmViewDesc.view) pmView = pmEl.pmViewDesc.view;
      if (!pmView && pmEl._pmViewDesc && pmEl._pmViewDesc.view) pmView = pmEl._pmViewDesc.view;
      if (pmView && pmView.dispatch && pmView.state) {
        try {
          var pmSel = pmView.state.selection;
          var pmTr  = pmView.state.tr.insertText(normalised, pmSel.from, pmSel.to);
          pmView.dispatch(pmTr);
          pmView.focus();
          return;
        } catch(x) {}
      }
      // Fallback: Selection API + execCommand (works because element is contenteditable)
      document.execCommand('insertText', false, normalised);
      return;
    }

    // ── Quill Editor (some LMS and contest platforms) ─────────────────────────
    var qlEditorEl = document.querySelector('.ql-editor');
    if (qlEditorEl) {
      var quillInst = null;
      // Quill 1.x exposes Quill.find() globally
      if (window.Quill && typeof window.Quill.find === 'function') {
        var qlContainer = qlEditorEl.closest('.ql-container');
        if (qlContainer) quillInst = window.Quill.find(qlContainer);
      }
      // Some sites attach the instance directly on the container node
      if (!quillInst) {
        var qlCont2 = qlEditorEl.closest('.ql-container');
        if (qlCont2 && qlCont2.__quill) quillInst = qlCont2.__quill;
      }
      if (quillInst) {
        var qRange = quillInst.getSelection(true);
        var qIdx   = qRange ? qRange.index : quillInst.getLength() - 1;
        var qLen   = qRange ? qRange.length : 0;
        if (qLen) quillInst.deleteText(qIdx, qLen);
        quillInst.insertText(qIdx, normalised, 'user');
        quillInst.setSelection(qIdx + normalised.length, 0, 'silent');
        return;
      }
      // Fallback: contenteditable insert
      qlEditorEl.focus();
      document.execCommand('insertText', false, normalised);
      return;
    }

    // ── TinyMCE (some e-learning and assessment platforms) ───────────────────
    if (window.tinymce) {
      var tinyEd = window.tinymce.activeEditor || (window.tinymce.editors && window.tinymce.editors[0]);
      if (tinyEd) {
        // insertContent expects HTML; escape any angle brackets so code pastes safely
        var escaped = normalised
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        tinyEd.execCommand('mceInsertContent', false, escaped);
        return;
      }
    }

    // ── CKEditor 4 ────────────────────────────────────────────────────────────
    if (window.CKEDITOR && window.CKEDITOR.instances) {
      var ck4Keys = Object.keys(window.CKEDITOR.instances);
      if (ck4Keys.length) {
        var ck4Ed = window.CKEDITOR.instances[ck4Keys[0]];
        if (ck4Ed) { ck4Ed.insertText(normalised); return; }
      }
    }

    // ── CKEditor 5 ────────────────────────────────────────────────────────────
    var ck5El = document.querySelector('.ck-editor__editable');
    if (ck5El) {
      var ck5Ed = ck5El.ckeditorInstance;
      if (ck5Ed && ck5Ed.model) {
        try {
          ck5Ed.model.change(function(writer) {
            var insertPos = ck5Ed.model.document.selection.getFirstPosition();
            writer.insertText(normalised, insertPos);
          });
          return;
        } catch(x) {}
      }
      // Fallback for CKEditor 5 running in contenteditable mode
      if (ck5El.isContentEditable) {
        ck5El.focus();
        document.execCommand('insertText', false, normalised);
        return;
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

    // ── Contenteditable (generic fallback) ────────────────────────────────────
    if (active && active.isContentEditable) {
      document.execCommand('insertText', false, normalised);
      return;
    }
  });

  // ── 6. Remove GFG "prohibited" toast popups + auto-dismiss tab-switch warning modals ──
  var WARNING_PHRASES = [
    'prohibited',
    'malicious activity',
    'switch tabs',
    'switch windows',
    'suspicious behaviour',
    'test termination',
    'being monitored'
  ];

  function containsWarning(text) {
    var lower = (text || '').toLowerCase();
    return WARNING_PHRASES.some(function(p) { return lower.indexOf(p) !== -1; });
  }

  function dismissWarningNode(node) {
    if (node.nodeType !== 1) return;
    if (!containsWarning(node.textContent)) return;

    // Try clicking a dismiss / resume button first
    var btns = node.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"], a');
    var dismissed = false;
    btns.forEach(function(btn) {
      var t = (btn.textContent || btn.value || '').toLowerCase();
      if (t.indexOf('resume') !== -1 || t.indexOf('ok') !== -1 ||
          t.indexOf('continue') !== -1 || t.indexOf('close') !== -1 ||
          t.indexOf('dismiss') !== -1) {
        btn.click();
        dismissed = true;
      }
    });
    if (!dismissed) {
      // Just hide the overlay
      node.style.display = 'none';
    }
  }

  new MutationObserver(function(mutations) {
    if (!enabled) return;
    mutations.forEach(function(m) {
      m.addedNodes.forEach(function(node) {
        dismissWarningNode(node);
      });
      // Also handle attribute changes that reveal hidden overlays
      if (m.type === 'attributes' && m.target && m.target.nodeType === 1) {
        dismissWarningNode(m.target);
      }
    });
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class','style','hidden'] });

  // 7. Toggle from popup
  window.addEventListener('PasteUnlocker_toggle', function(e) {
    enabled = e.detail.enabled;
  });
})();
