// Stream Player - the page's link to the browser.
//
// The skin (player.js) talks to its host in "verb|arg" messages: on the PC
// that host was MusicPlayer.exe, in the Apple Music version a pair of bridge
// scripts. Here the skin runs in a page of the extension itself, which can use
// the browser's own powers directly, so this one file is the whole bridge:
//   compact|1|<w>|<h>   make the window's inside w x h (the compact player,
//                       when it is not floating in a window of its own)
//   compact|0           put the window back the way it was
//   focus|1             bring this window to the front
//   tap|1               the visualizer wants to hear the music (asked again and
//                       again while it does). background.js captures what this
//                       page plays and sends it back, see "Sound" in player.js.
//   theme|<dark>|<RRGGBB>|...   the window's title bar takes the chassis colour
//   title|<text>        what is playing, for the window's title
// and hands the skin what comes back:
//   pcm|<base64>        a stretch of the sound
//   tapstate|<state>    on | off | click | busy | failed|<why>
// Runs before player.js.
(function () {
  'use strict';
  if (window.__mpBridge) return;
  var listeners = [];
  var before = null;          // the window as it was before going compact
  var port = null;            // to background.js, for the sound
  var askAt = 0;

  function noop() {}
  function quiet(p) { if (p && typeof p.catch === 'function') p.catch(noop); }
  function toPage(text) {
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i]({ data: text }); } catch (x) {}
    }
  }
  function myWindow() { return chrome.windows.getCurrent(); }

  function link() {
    if (port) return port;
    try { port = chrome.runtime.connect({ name: 'mp-page' }); } catch (e) { port = null; return null; }
    port.onMessage.addListener(function (m) {
      if (!m) return;
      if (m.kind === 'pcm' && typeof m.b64 === 'string') toPage('pcm|' + m.b64);
      else if (m.kind === 'tapstate' && typeof m.s === 'string') toPage('tapstate|' + m.s);
    });
    port.onDisconnect.addListener(function () { port = null; });
    return port;
  }

  function onVerb(msg) {
    var p = String(msg).split('|');
    if (p[0] === 'compact') {
      if (p[1] === '1' && p.length >= 4) {
        var w = +p[2], h = +p[3];
        if (!(w > 0 && h > 0)) return;
        // the window's frame (title bar, edges) comes on top of the inside
        var fw = window.outerWidth - window.innerWidth, fh = window.outerHeight - window.innerHeight;
        myWindow().then(function (win) {
          if (!before) before = { left: win.left, top: win.top, width: win.width, height: win.height };
          return chrome.windows.update(win.id, { state: 'normal', width: Math.round(w + fw), height: Math.round(h + fh) });
        }).catch(noop);
      } else if (p[1] === '0' && before) {
        var b = before;
        before = null;
        myWindow().then(function (win) {
          return chrome.windows.update(win.id, { state: 'normal', left: b.left, top: b.top, width: b.width, height: b.height });
        }).catch(noop);
      }
    } else if (p[0] === 'tap') {
      if (p[1] !== '1') { askAt = 0; return; }
      var now = Date.now();
      if (now - askAt < 900) return;          // (the skin asks every 400 ms; once a second is plenty)
      askAt = now;
      var pt = link();
      if (pt) { try { pt.postMessage({ kind: 'tap', on: true }); } catch (x) { port = null; } }
    } else if (p[0] === 'focus') {
      myWindow().then(function (win) {
        var o = { focused: true };
        if (win.state === 'minimized') o.state = 'normal';
        return chrome.windows.update(win.id, o);
      }).catch(noop);
    } else if (p[0] === 'theme' && /^[0-9a-fA-F]{6}$/.test(p[2] || '')) {
      var meta = document.querySelector('meta[name="theme-color"]');
      if (!meta && document.head) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
      }
      if (meta) meta.content = '#' + p[2];
    } else if (p[0] === 'title') {
      var t = msg.slice(6);
      document.title = t ? t + '  -  Stream Player' : 'Stream Player';
    }
    // (log, ontop, ...: things only the PC's app does)
  }

  // Opened again by the Stream Player app in the Dock (player.html#mp-show,
  // see install.sh): if the player is open already, that one comes to the
  // front and this second one goes away again. boot.js waits for the answer.
  window.__mpSingle = new Promise(function (done) {
    if (location.hash !== '#mp-show') { done(true); return; }
    try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) {}
    if (!chrome.runtime.getContexts) { done(true); return; }
    Promise.all([chrome.runtime.getContexts({ contextTypes: ['TAB'] }), chrome.tabs.getCurrent()]).then(function (r) {
      var me = r[1], here = chrome.runtime.getURL('player.html');
      var other = (r[0] || []).filter(function (c) {
        return c.documentUrl && c.documentUrl.lastIndexOf(here, 0) === 0 && (!me || c.tabId !== me.id) && c.tabId >= 0;
      })[0];
      if (!other) { done(true); return; }
      done(false);
      chrome.windows.get(other.windowId).then(function (w) {
        var o = { focused: true };
        if (w && w.state === 'minimized') o.state = 'normal';
        return chrome.windows.update(other.windowId, o);
      }).catch(noop).then(function () {
        if (me) chrome.tabs.remove(me.id).catch(function () { window.close(); });
        else window.close();
      });
    }, function () { done(true); });
  });

  window.__mpBridge = {
    postMessage: function (msg) { try { onVerb(msg); } catch (e) {} },
    addEventListener: function (type, fn) {
      if (type === 'message' && typeof fn === 'function') listeners.push(fn);
    }
  };
  quiet(null);
})();
