// Stream Player - the extension's own side.
//
// The player is a page of this extension (player.html), so it does most
// things itself (see host.js). What it cannot do, this does for it: let the
// visualizer hear the music. The page cannot: Spotify's songs are
// copy-protected and play in Spotify's own frame, out of the page's reach. But
// an extension may capture what a tab plays (chrome.tabCapture) - here without
// a click on its toolbar button, because the Stream Player app starts the
// browser allowing this extension to (--allowlisted-extension-id, install.sh).
// Capturing takes the sound away from the window, so offscreen.html plays it
// on to the speakers, unchanged, and measures it; the measurements go to the
// page in "pcm|..." messages (see "Sound" in player.js).
//
// With the page (host.js), over a port named "mp-page":
//   page -> here   {kind:'tap', on:true}     the visualizer wants sound (about once a second)
//   here -> page   {kind:'pcm', b64}         a stretch of sound
//                  {kind:'tapstate', s}      on | off | click | busy | failed|<why>
// and one-off messages from it: {kind:'resize', left, top, width, height}, {kind:'focus'}.
// With offscreen.html: here -> there by runtime.sendMessage({target:'mp-offscreen', ...}),
// there -> here over a port named "mp-offscreen".
//
// And for the Stream Player app in the Dock (install.sh): when it is clicked
// and the player's window is not on screen, it asks the browser for the player
// page again, marked #mp-show. If a player is open already, that one comes back
// (out of the Dock, if it was minimized) and the new window goes away again.
// The toolbar button (in an ordinary browser window) opens the player.
'use strict';

var MUSIC = chrome.runtime.getURL('player.html');
var TITLE_OFF = 'Stream Player';
var TITLE_ON = 'Stream Player: the visualizer is hearing the music';

var pages = {};                 // tab id -> port to the player in that tab
var cap = {
  tab: -1,                      // the tab being listened to (-1: none)
  state: 'off',                 // off | starting | on
  tok: Date.now(),              // counts starts (from the clock: still unique after this worker restarts)
  failTab: -1, failAt: 0,       // the last refusal: not asked again for a moment
  closeTimer: 0
};

function noop() {}
function quiet(p) { if (p && typeof p.catch === 'function') p.catch(noop); }
function isMusic(url) { return typeof url === 'string' && url.lastIndexOf(MUSIC, 0) === 0; }

// ---- one-off messages from the page ----
chrome.runtime.onMessage.addListener(function (msg, sender) {
  if (!msg || !sender || !sender.tab || sender.tab.windowId === undefined) return;
  if (msg.kind === 'resize') {
    var o = { state: 'normal' };
    ['left', 'top', 'width', 'height'].forEach(function (k) {
      if (typeof msg[k] === 'number' && isFinite(msg[k])) o[k] = Math.round(msg[k]);
    });
    quiet(chrome.windows.update(sender.tab.windowId, o));
  } else if (msg.kind === 'focus') {
    quiet(chrome.tabs.update(sender.tab.id, { active: true }));
    quiet(chrome.windows.update(sender.tab.windowId, { focused: true }));
  }
});

// ---- the ports ----
chrome.runtime.onConnect.addListener(function (port) {
  if (port.name === 'mp-page') {
    var s = port.sender || {}, tab = s.tab;
    if (!tab || typeof tab.id !== 'number' || s.frameId) { port.disconnect(); return; }
    var id = tab.id;
    if (pages[id] && pages[id] !== port) { try { pages[id].disconnect(); } catch (e) {} }
    pages[id] = port;
    port.onMessage.addListener(function (m) { onPage(id, m); });
    port.onDisconnect.addListener(function () {
      if (pages[id] !== port) return;
      delete pages[id];
      if (cap.tab === id) stopCapture();      // the tab closed, or loaded another page
    });
    if (cap.tab === id && cap.state === 'on') tell(id, 'on');
  } else if (port.name === 'mp-offscreen') {
    port.onMessage.addListener(onOffscreen);
  }
});

chrome.tabs.onRemoved.addListener(function (id) { if (cap.tab === id) stopCapture(); });

// ---- where the player is open ----
// (the extension's own pages are found without needing to see every tab)
function playerTabs() {
  if (!chrome.runtime.getContexts) return Promise.resolve([]);
  return chrome.runtime.getContexts({ contextTypes: ['TAB'] }).then(function (list) {
    return (list || []).filter(function (c) { return isMusic(c.documentUrl) && c.tabId >= 0; });
  }, function () { return []; });
}
function showWindow(windowId) {
  chrome.windows.get(windowId).then(function (w) {
    var o = { focused: true };
    if (w && w.state === 'minimized') o.state = 'normal';
    quiet(chrome.windows.update(windowId, o));
  }, noop);
}

function onPage(id, m) {
  if (!m || m.kind !== 'tap' || !m.on) return;
  if (cap.tab === id && cap.state !== 'off') { toOffscreen({ kind: 'want' }); return; }
  if (cap.tab !== -1) { tell(id, 'busy'); return; }                       // listening to another tab
  if (cap.failTab === id && Date.now() - cap.failAt < 5000) return;       // refused a moment ago
  startCapture(id);
}

// ---- the toolbar button: "let the visualizer hear the music in this tab" ----
chrome.action.onClicked.addListener(function (tab) {
  if (!tab || typeof tab.id !== 'number') return;
  if (pages[tab.id] || isMusic(tab.url)) {
    cap.failTab = -1;
    if (cap.tab === tab.id && cap.state !== 'off') { if (cap.state === 'on') tell(tab.id, 'on'); return; }
    startCapture(tab.id);
    return;
  }
  // somewhere else: go to the player, or open it in a window of its own
  playerTabs().then(function (list) {
    var t = list[0];
    if (t) {
      quiet(chrome.tabs.update(t.tabId, { active: true }));
      showWindow(t.windowId);
    } else quiet(chrome.windows.create({ url: MUSIC, type: 'popup', width: 1280, height: 860 }));
  });
});

// ---- listening ----
function startCapture(id) {
  var tok = ++cap.tok;
  cap.tab = id;
  cap.state = 'starting';
  clearTimeout(cap.closeTimer);
  // whatever offscreen.html may still be listening to goes first (a tab can
  // only be captured once at a time)
  return toOffscreen({ kind: 'stop' }).then(function () {
    if (tok !== cap.tok) return null;
    return chrome.tabCapture.getMediaStreamId({ targetTabId: id });
  }).then(function (streamId) {
    if (tok !== cap.tok || !streamId) return null;
    return makeOffscreen().then(function () {
      if (tok !== cap.tok) return null;
      return toOffscreen({ kind: 'start', streamId: streamId, tab: id, run: tok });
    });
  }).catch(function (e) {
    if (tok !== cap.tok) return;
    var why = String((e && e.message) || e || 'unknown error');
    cap.tab = -1;
    cap.state = 'off';
    cap.failTab = id;
    cap.failAt = Date.now();
    // "Extension has not been invoked for the current page (see activeTab permission). ..."
    tell(id, /invoked|activeTab/i.test(why) ? 'click' : 'failed|' + why.slice(0, 90));
    badge(id, false);
    closeOffscreenSoon();
  });
}

function stopCapture() {
  var tab = cap.tab;
  cap.tok++;                    // whatever is under way is out of date now
  cap.tab = -1;
  cap.state = 'off';
  badge(tab, false);
  return toOffscreen({ kind: 'stop' }).then(closeOffscreenSoon);
}

function onOffscreen(m) {
  if (!m) return;
  if (m.kind === 'pcm') {
    var p = m.run === cap.tok && pages[m.tab];
    if (p) { try { p.postMessage({ kind: 'pcm', b64: m.b64 }); } catch (e) {} }
  } else if (m.kind === 'hello') {
    // this worker was restarted while offscreen.html went on listening
    if (cap.tab === -1 && typeof m.tab === 'number' && m.tab >= 0) {
      cap.tab = m.tab; cap.state = 'on'; cap.tok = m.run;
      badge(m.tab, true);
    }
  } else if (m.kind === 'state') {
    if (m.run !== cap.tok) return;
    if (m.s === 'on') {
      cap.state = 'on';
      tell(m.tab, 'on');
      badge(m.tab, true);
    } else {
      var tab = cap.tab;
      cap.tab = -1;
      cap.state = 'off';
      if (m.s === 'failed') { cap.failTab = tab; cap.failAt = Date.now(); }
      tell(tab, m.s === 'failed' ? 'failed|' + String(m.why || '').slice(0, 90) : 'off');
      badge(tab, false);
      closeOffscreenSoon();
    }
  }
  // (m.kind 'ping': offscreen.html keeping this worker awake while it listens)
}

function tell(id, s) {
  var p = pages[id];
  if (p) { try { p.postMessage({ kind: 'tapstate', s: s }); } catch (e) {} }
}

function badge(id, on) {
  if (typeof id !== 'number' || id < 0) return;
  try {
    quiet(chrome.action.setBadgeText({ tabId: id, text: on ? 'ON' : '' }));
    if (on) quiet(chrome.action.setBadgeBackgroundColor({ tabId: id, color: '#1f9d55' }));
    quiet(chrome.action.setTitle({ tabId: id, title: on ? TITLE_ON : TITLE_OFF }));
  } catch (e) {}
}

// ---- offscreen.html ----
function toOffscreen(m) {
  m.target = 'mp-offscreen';
  var p;
  try { p = chrome.runtime.sendMessage(m); } catch (e) { return Promise.resolve(); }
  return Promise.resolve(p).catch(noop);         // (no offscreen page open: nothing to tell)
}

var making = null;
function hasOffscreen() {
  if (chrome.runtime.getContexts) {
    return chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] }).then(function (c) { return c.length > 0; });
  }
  return chrome.offscreen.hasDocument ? chrome.offscreen.hasDocument() : Promise.resolve(false);
}
function makeOffscreen() {
  clearTimeout(cap.closeTimer);
  if (!making) {
    making = hasOffscreen().then(function (yes) {
      if (yes) return;
      return chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['USER_MEDIA'],
        justification: 'Plays the captured music on to the speakers and measures it for the visualizer.'
      });
    }).then(function () { making = null; }, function (e) { making = null; throw e; });
  }
  return making;
}
// once nothing is being listened to, the offscreen page closes after a while
function closeOffscreenSoon() {
  clearTimeout(cap.closeTimer);
  cap.closeTimer = setTimeout(function () {
    if (cap.state !== 'off') return;
    hasOffscreen().then(function (yes) { if (yes && cap.state === 'off') return chrome.offscreen.closeDocument(); }).catch(noop);
  }, 20000);
}
