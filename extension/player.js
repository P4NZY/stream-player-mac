// Stream Player - the player (see the notes below). boot.js loads it after the
// services, with the styles and the icon ready.
(function () {
'use strict';
var __MP_CSS = window.__MP_CSS || '';
var __MP_ICON = window.__MP_ICON || '';

// ============================================================================
// Stream Player - the player
// The Music Player skin, made to play Spotify and SoundCloud. It runs in a
// page of its own (player.html, part of the browser extension), opened by the
// Stream Player app in a window of its own. boot.js hands it:
//                        __MP_CSS  (player.css as text)
//                        __MP_ICON (the app icon's address)
//
// The app has two faces (data-mp-mode on <html>):
//   full     the player: deck across the top, library on the left, a browser
//            for playlists / songs / albums / artists / search in the middle,
//            and a column of panels on the right
//   compact  the small player: deck + the same panels stacked under it
// The panels can each be switched on and off (keys VIS / LYR / PL on the deck):
//   visualizer  effects drawn with WebGL that move with the music
//   lyrics      the current song's lyrics (from LRCLIB), following along
//   queue       what plays next
//
// The switch at the top flips between the two services. Each one (services/)
// brings its own player, of the shape this file was written for (Apple's
// MusicKit: see services/engine.js), and its own library; this file draws the
// interface and tells the service the switch is set to what to do.
//
// The page cannot hear Spotify's sound itself (it is copy-protected and played
// in Spotify's own frame), so the browser extension listens to what this
// window plays and passes it in: see "Sound" below, host.js, background.js.
// ============================================================================

if (window.__mpLoaded) return;
window.__mpLoaded = true;

// ---------------------------------------------------------------- themes ----
// shellA / shellB : chassis colour, top and bottom of its gradient
// shellText       : labels printed on the chassis
// lit             : lamps, lit buttons, slider fill
// lcdBg / lcdFg   : display background and ink
var THEMES = [
  { id: 'midnight',  name: 'Midnight',  jp: '真夜中',     shellA: '#263145', shellB: '#141a27', shellText: '#cfdaec', lit: '#5aa9ff', lcdBg: '#050a12', lcdFg: '#7cc4ff' },
  { id: 'classic',   name: 'Classic',   jp: 'クラシック', shellA: '#4b5066', shellB: '#2a2d3d', shellText: '#dde1ee', lit: '#f5b301', lcdBg: '#020403', lcdFg: '#27e06f' },
  { id: 'graphite',  name: 'Graphite',  jp: '黒鉛',       shellA: '#3c3c40', shellB: '#222224', shellText: '#dcdcde', lit: '#ededf0', lcdBg: '#0a0a0a', lcdFg: '#e9e9ea' },
  { id: 'indigo',    name: 'Indigo',    jp: '藍',         shellA: '#2b4a7a', shellB: '#172c4d', shellText: '#e3ecf9', lit: '#ffd27a', lcdBg: '#060d1a', lcdFg: '#9cc3ff' },
  { id: 'synthwave', name: 'Synthwave', jp: 'シンセ',     shellA: '#3d2c7c', shellB: '#1f1547', shellText: '#e6deff', lit: '#ff4fd8', lcdBg: '#0a0420', lcdFg: '#35f2ff' },
  { id: 'sunset',    name: 'Sunset',    jp: '夕焼け',     shellA: '#4d2c48', shellB: '#2a1730', shellText: '#f3dbe8', lit: '#ff7a59', lcdBg: '#12060f', lcdFg: '#ffb38a' },
  { id: 'forest',    name: 'Forest',    jp: '森',         shellA: '#2d4337', shellB: '#18261e', shellText: '#d5e8dc', lit: '#5ddc8b', lcdBg: '#040b07', lcdFg: '#86f0a8' },
  { id: 'matcha',    name: 'Matcha',    jp: '抹茶',       shellA: '#7f9c5c', shellB: '#566f3c', shellText: '#f6f9ea', lit: '#fff3b0', lcdBg: '#111a0b', lcdFg: '#cfe89a' },
  { id: 'crimson',   name: 'Crimson',   jp: '紅',         shellA: '#5c212c', shellB: '#2e1016', shellText: '#f5d9dd', lit: '#ff5263', lcdBg: '#0d0304', lcdFg: '#ff8d97' },
  { id: 'tomato',    name: 'Tomato',    jp: 'トマト',     shellA: '#f25a35', shellB: '#c93414', shellText: '#fff4ea', lit: '#ffe08a', lcdBg: '#3a0d05', lcdFg: '#ffd66b' },
  { id: 'paper',     name: 'Paper',     jp: '和紙',       shellA: '#ebe7dd', shellB: '#cfc9bb', shellText: '#2b2b2b', lit: '#2f5bd8', lcdBg: '#1b2230', lcdFg: '#a9c6ff' },
  { id: 'sakura',    name: 'Sakura',    jp: '桜',         shellA: '#ffc4d6', shellB: '#f29bb6', shellText: '#5a1930', lit: '#b3124d', lcdBg: '#3a1020', lcdFg: '#ffc4d6' },
  // after singers: teal hair and a pink tie / red drills on grey / Ado's blue with a red rose
  { id: 'miku',      name: 'Miku',      jp: 'ミク',       shellA: '#237a75', shellB: '#134f4c', shellText: '#e9fcfa', lit: '#ff4fa3', lcdBg: '#03151a', lcdFg: '#5fe8dc' },
  { id: 'teto',      name: 'Teto',      jp: 'テト',       shellA: '#c42a46', shellB: '#86132c', shellText: '#fff0f2', lit: '#ffe1e7', lcdBg: '#1b0508', lcdFg: '#ff8fa3' },
  { id: 'ado',       name: 'Ado',       jp: 'アド',       shellA: '#24327f', shellB: '#0d1238', shellText: '#e4e9ff', lit: '#ff3f6c', lcdBg: '#050822', lcdFg: '#7aa2ff' },
  { id: 'neon',      name: 'Neon Tokyo', jp: 'ネオン',    shellA: '#22222d', shellB: '#0c0c12', shellText: '#e8e8f6', lit: '#ff2bd6', lcdBg: '#05030c', lcdFg: '#2cf6ff' },
  { id: 'fuji',      name: 'Wisteria',  jp: '藤',         shellA: '#7a6aae', shellB: '#4f4282', shellText: '#f7f3ff', lit: '#fff0a8', lcdBg: '#120c24', lcdFg: '#cdb8ff' },
  { id: 'kin',       name: 'Gold',      jp: '金',         shellA: '#5d4c22', shellB: '#2e2410', shellText: '#f6e8c3', lit: '#ffcf4a', lcdBg: '#0d0a03', lcdFg: '#ffd772' }
];

// Status words on the deck's display.
var JP_STATE = { play: '再生中', pause: '一時停止', stop: '停止', load: '読込中' };

// Compact window size in CSS pixels (the app scales it for the display).
var COMPACT_W = 500;
var COMPACT_H = 680;     // with the queue as the only panel
var CP_VIZ = 230, CP_LYR = 210, CP_PL = 250;   // panel heights when more than one is open
var ROW_H = 34;          // browser row height, must match .mpr in player.css
var QUEUE_CHUNK = 200;   // most songs handed to the player at once from a long list

// --------------------------------------------------------------- helpers ----
// What the page talks to: host.js, the bridge to the browser (on the PC this
// was MusicPlayer.exe). It takes "verb|arg" messages; what it cannot do, it
// ignores.
var host = (window.chrome && window.chrome.webview) ? window.chrome.webview : (window.__mpBridge || null);
var HOST_KIND = (window.chrome && window.chrome.webview) ? 'windows' : window.__mpBridge ? 'mac' : 'none';
function send(msg) { try { if (host) host.postMessage(msg); } catch (e) {} }

// The app keeps a small log of what happened (player.log beside its settings):
// starts, failures, what the player and the sound feed were doing. It is what
// gets read when something "sometimes does not work". No more than a few
// lines a second, and it stops for the session after 3000 lines.
var LOG = { n: 0, burst: 0, at: 0 };
function dlog(text) {
  var now = Date.now();
  if (now - LOG.at > 1000) { LOG.at = now; LOG.burst = 0; }
  if (++LOG.burst > 8 || ++LOG.n > 3000) return;
  send('log|' + String(text).replace(/[\r\n]+/g, ' ').slice(0, 380));
}

var store = {
  get: function (k, d) {
    try { var v = localStorage.getItem('mp.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
  },
  set: function (k, v) { try { localStorage.setItem('mp.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del: function (k) { try { localStorage.removeItem('mp.' + k); } catch (e) {} }
};

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function fmt(sec) {                       // 3:07 / 1:02:09
  sec = Math.max(0, Math.round(sec || 0));
  var hrs = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return hrs ? hrs + ':' + pad2(m) + ':' + pad2(s) : m + ':' + pad2(s);
}
function clock(sec) {                     // 03:07 for the big display
  sec = Math.max(0, Math.floor(sec || 0));
  return pad2(Math.floor(sec / 60)) + ':' + pad2(sec % 60);
}
function hexToRgb(hex) {
  var n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {                   // t = share of colour a
  var x = hexToRgb(a), y = hexToRgb(b);
  return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(x[i] * t + y[i] * (1 - t)); }).join(',') + ')';
}
function isDark(hex) {
  var c = hexToRgb(hex);
  return (c[0] * 299 + c[1] * 587 + c[2] * 114) / 1000 < 140;
}
function errText(e) {
  if (!e) return 'unknown error';
  return String(e.description || e.message || e.errorCode || e).slice(0, 120);
}

// Elements are built node by node (no innerHTML), so nothing from a song title
// or the page can ever be parsed as markup.
function h(tag, attrs) {
  var el = document.createElement(tag), k, i;
  if (attrs) {
    for (k in attrs) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  for (i = 2; i < arguments.length; i++) if (arguments[i]) el.appendChild(arguments[i]);
  return el;
}
function jp(text, cls) { return h('span', { class: 'mp-jp' + (cls ? ' ' + cls : ''), lang: 'ja', text: text }); }

var SVG_NS = 'http://www.w3.org/2000/svg';
function svg(d, cls) {
  var s = document.createElementNS(SVG_NS, 'svg');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('aria-hidden', 'true');
  if (cls) s.setAttribute('class', cls);
  var p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', d);
  p.setAttribute('fill-rule', 'evenodd');
  s.appendChild(p);
  return s;
}
var I = {
  prev:    'M5 5h2.5v14H5zM20 5v14L9 12z',
  play:    'M7 4.5v15l13-7.5z',
  pause:   'M6 5h4.5v14H6zM13.5 5H18v14h-4.5z',
  stop:    'M6 6h12v12H6z',
  next:    'M16.5 5H19v14h-2.5zM4 5v14l11-7z',
  theme:   'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zm0 2a7 7 0 0 1 0 14z',
  pin:     'M9 3h6v2l-1 1v5l3 3v2h-4.2v5h-1.6v-5H7v-2l3-3V6L9 5z',
  mini:    'M3 5h18v14H3zm2 2v10h14V7zm6 5h6v3.5h-6z',
  full:    'M3 4h18v16H3zm2 2v3h14V6zm0 5v7h4v-7zm6 0v7h8v-7z',
  speaker: 'M4 9v6h4l5 4V5L8 9zM15.5 8.5a4.5 4.5 0 0 1 0 7z',
  chevron: 'M5.5 8.6L12 15.1l6.5-6.5 1.4 1.4-7.9 7.9-7.9-7.9z',
  close:   'M6.4 5L12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z',
  back:    'M14.6 5.4L8 12l6.6 6.6 1.5-1.5L11 12l5.1-5.1z',
  go:      'M9.4 5.4L16 12l-6.6 6.6-1.5-1.5L13 12 7.9 6.9z',
  search:  'M10.5 4a6.5 6.5 0 1 0 4 11.6l4.4 4.4 1.5-1.5-4.4-4.4A6.5 6.5 0 0 0 10.5 4zm0 2.2a4.3 4.3 0 1 1 0 8.6a4.3 4.3 0 0 1 0-8.6z',
  note:    'M9 4v10.6A3.5 3.5 0 1 0 11 18V8h7V4z',
  disc:    'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zm0 6.2a2.8 2.8 0 1 1 0 5.6a2.8 2.8 0 0 1 0-5.6z',
  person:  'M12 4a4 4 0 1 1 0 8a4 4 0 0 1 0-8zM4 20c0-3.6 3.6-6 8-6s8 2.4 8 6z',
  recent:  'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zm-1 4h2v4.6l3.4 2-1 1.7L11 12.7z',
  list:    'M4 6h16v2H4zM4 11h16v2H4zM4 16h10v2H4z',
  shuffle: 'M3 7h4l8 10h3v-2l3.5 3-3.5 3v-2h-4L6 9H3zM18 7h-3l-1.6 2-1.3-1.6L14 5h4V3l3.5 3L18 9zM3 17h3l1.6-2 1.3 1.6L7 19H3z',
  expand:  'M4 4h6v2H6v4H4zM14 4h6v6h-2V6h-4zM4 14h2v4h4v2H4zM18 14h2v6h-6v-2h4z',
  grid:    'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  plus:    'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z',
  check:   'M9.6 16.3L5.2 11.9 3.8 13.3l5.8 5.8L20.4 8.3 19 6.9z',
  more:    'M5 10.4a1.6 1.6 0 1 0 0 3.2a1.6 1.6 0 0 0 0-3.2zm7 0a1.6 1.6 0 1 0 0 3.2a1.6 1.6 0 0 0 0-3.2zm7 0a1.6 1.6 0 1 0 0 3.2a1.6 1.6 0 0 0 0-3.2z'
};

// ----------------------------------------------------------------- state ----
var S = {
  theme: store.get('theme', 'midnight'),
  autoCompact: store.get('autoCompact', false),  // go compact when music starts
  // compact player stays above every other window (on unless switched off;
  // a new name for the setting, so it starts on also where the old one was off)
  onTop: store.get('compactOnTop', true),
  showPl: store.get('showPl', true),             // panel: queue
  showViz: store.get('showViz', true),           // panel: visualizer
  showLyr: store.get('showLyr', true),           // panel: lyrics
  vizBig: false,                                 // visualizer fills the whole window
  remaining: store.get('remaining', false),      // clock shows time remaining
  meter: store.get('meter', 'led'),              // the small display under the clock: led | classic | scope
  // while something else is in front (Windows app; see "Now playing, for the app")
  popup: store.get('popup', true),               // a small card when the song changes
  popupPos: store.get('popupPos', 'tr'),         // which corner: tl | tr | bl | br
  discord: store.get('discord', false),          // show the song on the listener's Discord profile
  discordId: store.get('discordId', ''),         // the Discord application ID it is shown under
  mode: 'full',         // full | compact
  panelOpen: false,
  music: null,          // the player of the service the switch is set to
  state: 'stop',        // play | pause | stop | load   (what the display shows)
  stable: 'idle',       // playing | paused | idle      (ignores loading blips)
  pendingAuto: false,
  seen: true,                    // false while the window is minimised or covered (the app says so)
  startTok: 0,                   // counts requests to start playing; the newest one waiting wins
  starting: Promise.resolve(),   // the start being carried out (they run one after another)
  haltAt: 0,                     // when Stop or Pause was last pressed
  shuffleHeld: false,            // shuffle is on for the listener but switched off for a moment (see startNow)
  queueChangedAt: -1e9,
  dragSeek: null,       // 0..1 while the seek knob is being dragged
  marquee: null,
  notice: 0             // timer for a temporary message on the song line
};
var ui = {};
var sheet = null;

// Themes of your own (see "Themes of your own" below): the saved ones, their
// photos once read from storage, and the one being edited.
// (edArea: which part of the player the editor's picture controls are for;
// draftKeysWas: the pictures the theme being edited had when it was opened.)
var USER = { list: [], photos: {}, fonts: {}, dbP: null, draft: null, draftKeysWas: [], draftFontWas: '', edArea: 'app', measuring: {}, armTimer: 0, msgTimer: 0 };

// The "Album cover" theme: its colours are worked out from the cover of the
// song that is playing, and glide from one song's to the next (see "The cover").
var COVER = {
  t: { id: 'cover', name: 'Album cover', jp: 'ジャケット', live: true },
  key: null,            // the artwork it was last worked out from
  pal: null,            // the six colours from that cover (null: none, the last built-in theme stands in)
  jpeg: '',             // a small copy of the cover, for the app's "now playing" card
  big: '',              // address of the copy shown, blurred, behind the player
  from: null, to: null, t0: 0, raf: 0, tok: 0, n: 0
};

function themeNow() {
  var i;
  if (USER.draft) return USER.draft;                   // the editor is open: what it shows is the theme
  if (S.theme === 'cover') return COVER.t;
  for (i = 0; i < THEMES.length; i++) if (THEMES[i].id === S.theme) return THEMES[i];
  for (i = 0; i < USER.list.length; i++) if (USER.list[i].id === S.theme) return USER.list[i];
  return THEMES[0];
}
function deckShown() { return S.mode !== 'apple'; }

// ---------------------------------------------------------------- styles ----
function themeCss() {
  return THEMES.map(function (t) {
    return 'html[data-mp-theme="' + t.id + '"]{' +
      '--mp-shell-a:' + t.shellA + ';--mp-shell-b:' + t.shellB + ';--mp-shell-text:' + t.shellText + ';' +
      '--mp-lit:' + t.lit + ';' +
      '--mp-lcd-bg:' + t.lcdBg + ';--mp-lcd-bg-rgb:' + hexToRgb(t.lcdBg).join(',') + ';' +
      '--mp-lcd-fg:' + t.lcdFg + ';--mp-lcd-fg-rgb:' + hexToRgb(t.lcdFg).join(',') + ';}';
  }).join('\n');
}

// all of the skin's styles: the themes, player.css, and the Mac's own extras
function skinCss() { return themeCss() + '\n' + __MP_CSS + '\n' + MAC_CSS; }

function installCss() {
  var css = skinCss();
  try {
    if (!sheet) { sheet = new CSSStyleSheet(); sheet.replaceSync(css); }
    if (document.adoptedStyleSheets.indexOf(sheet) < 0)
      document.adoptedStyleSheets = document.adoptedStyleSheets.concat([sheet]);
    return;
  } catch (e) {}
  if (!document.getElementById('mp-style')) {
    var st = document.createElement('style');
    st.id = 'mp-style';
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);
  }
}

// A built-in theme is a rule in the style sheet (themeCss). A theme of your
// own has none: its colours are set on the element itself, which is also what
// lets the editor show every change the moment it is made.
// (The last two are the lettering: '' leaves the skin's own fonts in place.)
var OWN_VARS = ['--mp-shell-a', '--mp-shell-b', '--mp-shell-text', '--mp-lit', '--mp-lcd-bg', '--mp-lcd-bg-rgb', '--mp-lcd-fg', '--mp-lcd-fg-rgb', '--mp-f-mono', '--mp-f-ui'];
function ownVars(t) {
  return [t.shellA, t.shellB, t.shellText, t.lit, t.lcdBg, hexToRgb(t.lcdBg).join(','), t.lcdFg, hexToRgb(t.lcdFg).join(','),
    fontStack(t, 'lcd'), fontStack(t, 'ui')];
}

function applyTheme() {
  var t = themeNow(), pin = floatOk() ? '1' : '0', own = (t.user || t.live) ? ownVars(t) : null, sig = own ? own.join('|') : '';
  // the page's <html>, and the floating compact player's (Mac) when it is open
  [document.documentElement, FLOAT.win && FLOAT.win.document.documentElement].forEach(function (root) {
    if (!root) return;
    if (root.getAttribute('data-mp-theme') !== t.id) root.setAttribute('data-mp-theme', t.id);
    if (root.getAttribute('data-mp-mode') !== S.mode) root.setAttribute('data-mp-mode', S.mode);
    if (root.getAttribute('data-mp-host') !== HOST_KIND) root.setAttribute('data-mp-host', HOST_KIND);
    if (root.getAttribute('data-mp-pin') !== pin) root.setAttribute('data-mp-pin', pin);
    if (root.__mpOwn !== sig || (sig && !root.style.getPropertyValue('--mp-shell-a'))) {
      OWN_VARS.forEach(function (name, i) { if (own && own[i]) root.style.setProperty(name, own[i]); else root.style.removeProperty(name); });
      root.__mpOwn = sig;
      if (root === document.documentElement) setTimeout(fitClock, 0);      // other lettering can be wider
    }
  });
  // the page shows a plate saying where the player went while it floats
  var root = document.documentElement, fl = FLOAT.win || FLOAT.opening ? '1' : '0';
  if (root && root.getAttribute('data-mp-float') !== fl) root.setAttribute('data-mp-float', fl);
  applyPhoto(t);
  applyAreas(t);
}

// Tell the app window how to paint its title bar. The displays are dark in
// every theme, so the page always runs in dark mode; the title bar takes the
// chassis colour.
//   theme|<page dark 0/1>|<caption RRGGBB>|<caption text RRGGBB>|<caption is dark 0/1>
function notifyHost() {
  var t = themeNow();
  var msg = 'theme|1|' + t.shellA.slice(1) + '|' + t.shellText.slice(1) + '|' + (isDark(t.shellA) ? 1 : 0);
  if (msg === notifyHost.last) return;
  notifyHost.last = msg;
  send(msg);
}

function setTheme(id) {
  var was = themeNow();
  if (id === 'cover' && S.theme !== 'cover') {
    // starts from the colours showing now and glides to the cover's
    COLOURS.forEach(function (c) { COVER.t[c[0]] = was[c[0]]; });
  }
  S.theme = id;
  store.set('theme', id);
  // the built-in one to fall back on: when a theme of your own is deleted, and
  // for "Album cover" while nothing with a cover is playing
  if (!userTheme(id) && id !== 'cover') store.set('themeBase', id);
  retheme();
  if (id === 'cover') coverAim();
  syncPanel();
}

// The look changed: repaint everything that takes its colours from the theme.
function retheme() {
  applyTheme();
  notifyHost();
  vizColors();
  vzColors();
  kickViz();
  npSync();
}

// ============================================================================
// Themes of your own
// The same six colours as a built-in theme, a name, and optionally
//   - lettering: one of a few fonts every computer has, or a font file
//   - something behind the player - a photo, a moving picture (GIF) or a
//     video - with how it is laid out (fit, size, place, how much of the body
//     colour lies over it, blur, how see-through the displays are)
//
//   the list      the page's storage, mp.userThemes (small: colours, settings
//                 and a thumbnail of the picture)
//   the files     a little database of their own, IndexedDB "mp-skins": the
//                 pictures, videos and fonts (too big for the other storage)
//   on the move   one .mpskin file per theme: plain JSON with the picture and
//                 the font inside it - the way a Winamp .wsz carries its
//                 pictures and colour files in one piece. Made on Windows it
//                 opens on the Mac version, and the other way round.
//
// Everything read from storage or from a file goes through cleanTheme /
// cleanPhoto / cleanFont first: colours must be #rrggbb, numbers are kept
// within range, lettering must be one of the names in FONTS, a picture or a
// video must really decode, a font file must really load as a font. Nothing
// from a file is ever used as markup or as a style rule.
// ============================================================================
var COLOURS = [
  ['shellA', 'Body, top'], ['shellB', 'Body, bottom'], ['shellText', 'Lettering'],
  ['lit', 'Lamps and lit keys'], ['lcdBg', 'Displays'], ['lcdFg', 'Display ink']
];
var HEX = /^#[0-9a-f]{6}$/i;
var FITS = [['cover', 'FILL'], ['contain', 'FIT'], ['stretch', 'STRETCH'], ['tile', 'TILE']];
// the photo's sliders: key, label, from, to, step, unit, where it starts
var PHOTO_KNOBS = [
  ['size', 'Size', 40, 300, 5, '%', 100],
  ['x', 'Left - right', 0, 100, 1, '%', 50],
  ['y', 'Up - down', 0, 100, 1, '%', 50],
  ['tint', 'Body colour over it', 0, 95, 1, '%', 35],
  ['blur', 'Blur', 0, 24, 1, 'px', 0],
  ['glass', 'See-through displays', 0, 90, 1, '%', 25],
  ['bright', 'Brightness', 30, 170, 5, '%', 100],
  ['sat', 'Colour strength', 0, 200, 5, '%', 100]
];
// The parts of the player that can have a picture of their own (each a
// photo, a moving GIF or a video, laid out with the knobs above):
//   app    behind the whole player (a theme's "photo", as it always was)
//   mini   behind the compact player, instead of the whole player's
//   top    the strip and the deck across the top
//   nav    the library down the left (full player)
//   list   the big list in the middle (full player)
//   lyr    the lyrics display
//   queue  the queue display
// tint: what is laid over the picture - the body colour, or (on a display)
// the display colour; glass: it has the "see-through displays" knob, for the
// displays that sit on it. (The visualizer draws over all of its panel, so it
// has none.)
var AREAS = [
  { k: 'app', en: 'WHOLE PLAYER', jp: '全体', tint: 'body', glass: true, say: 'Behind everything, in the full player and the compact one.' },
  { k: 'mini', en: 'COMPACT', jp: 'コンパクト', tint: 'body', glass: true, say: 'Behind the compact player only, instead of the whole player\'s picture. Ctrl+M shows it.' },
  { k: 'top', en: 'TOP', jp: '上部', tint: 'body', glass: true, say: 'The strip and the deck across the top: the clock, the song, the keys.' },
  { k: 'nav', en: 'LIBRARY', jp: 'ライブラリ', tint: 'body', say: 'The library down the left. Full player only.' },
  { k: 'list', en: 'LIST', jp: 'リスト', tint: 'lcd', say: 'The big list in the middle. Full player only.' },
  { k: 'lyr', en: 'LYRICS', jp: '歌詞', tint: 'lcd', say: 'The lyrics display (LYR on the deck).' },
  { k: 'queue', en: 'QUEUE', jp: '再生リスト', tint: 'lcd', say: 'The queue display (PL on the deck).' }
];
var SKIN_FORMAT = 'music-player-skin';
var PHOTO_MAX = 2560;             // longest side kept, in pixels (a large screen's worth)
// What goes behind the player can also move: a GIF (or animated WebP / PNG)
// and a video are kept just as they are, up to these sizes.
var ANIM_MAX = 30 * 1024 * 1024, VIDEO_MAX = 50 * 1024 * 1024;
var FONT_MAX = 12 * 1024 * 1024;  // a font file inside a theme
var SKIN_MAX = 150 * 1024 * 1024; // a skin file (what is inside it grows by a third on the way)
// Lettering a theme can pick. The named ones are fonts that Windows and macOS
// both have, so a theme looks the same on the other computer; 'own' is the
// font file kept inside the theme. Japanese falls through to the usual fonts.
var JP_FALLBACK = ', "Yu Gothic UI", "Meiryo UI", "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif';
var FONTS = [
  ['', 'Standard', ''],
  ['courier', 'Typewriter', '"Courier New", Courier'],
  ['arial', 'Plain', 'Arial, Helvetica'],
  ['verdana', 'Wide', 'Verdana, Geneva'],
  ['trebuchet', 'Friendly', '"Trebuchet MS", "Lucida Grande"'],
  ['georgia', 'Book', 'Georgia, "Times New Roman"'],
  ['times', 'Newspaper', '"Times New Roman", Times'],
  ['impact', 'Poster', 'Impact, "Arial Narrow"'],
  ['comic', 'Comic', '"Comic Sans MS", "Chalkboard SE"']
];
// which lettering: [key in the theme, label in the editor]
var FONT_ROLES = [['lcd', 'Displays'], ['ui', 'Labels and keys']];

function newId(prefix) {
  var s = '', i;
  for (i = 0; i < 10; i++) s += 'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(Math.random() * 36));
  return prefix + s;
}
function limit(v, lo, hi, d) { v = +v; return isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; }
function cleanName(s, d) {
  s = String(s === undefined || s === null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
  return s || d || 'My theme';
}
// (area: which part of the player it is for, for where the knobs start)
function cleanPhoto(p, key, area) {
  // kind: still (a photo) | anim (a moving picture) | video
  var out = { key: key, kind: p.kind === 'anim' || p.kind === 'video' ? p.kind : 'still', fit: 'cover', thumb: '' }, i, k;
  for (i = 0; i < FITS.length; i++) if (FITS[i][0] === p.fit) out.fit = p.fit;
  if (out.kind === 'video' && out.fit === 'tile') out.fit = 'cover';      // (a video cannot be tiled)
  for (i = 0; i < PHOTO_KNOBS.length; i++) {
    k = PHOTO_KNOBS[i];
    out[k[0]] = limit(p[k[0]], k[2], k[3],
      k[0] === 'tint' && areaInfo(area).tint === 'lcd' ? 55 :      // (a display wants more of its colour, for its lettering)
      k[0] === 'glass' && area === 'mini' ? 45 :                    // (the compact player is mostly displays: let more of its picture through)
      k[6]);
  }
  out.flip = p.flip === true;                              // mirrored, left to right
  out.ratio = p.ratio > 0 ? limit(p.ratio, 0.05, 20, 0) : 0;      // width / height of the picture (0: not known yet)
  if (typeof p.thumb === 'string' && p.thumb.length < 60000 && /^data:image\/(jpeg|webp|png);base64,[A-Za-z0-9+\/=]+$/.test(p.thumb)) out.thumb = p.thumb;
  return out;
}
function areaInfo(k) {
  for (var i = 0; i < AREAS.length; i++) if (AREAS[i].k === k) return AREAS[i];
  return AREAS[0];
}
// The picture a theme has for one part of the player (or null). The whole
// player's is the theme's "photo", where it always was; the others are kept
// under "areas".
function areaPhoto(t, k) {
  if (!t) return null;
  return k === 'app' ? (t.photo || null) : (t.areas && t.areas[k]) || null;
}
function setAreaPhoto(t, k, p) {
  if (k === 'app') { if (p) t.photo = p; else delete t.photo; return; }
  if (p) { if (!t.areas) t.areas = {}; t.areas[k] = p; }
  else if (t.areas) { delete t.areas[k]; if (!Object.keys(t.areas).length) delete t.areas; }
}
// every picture a theme keeps, as [part, picture]
function themePhotos(t) {
  var out = [];
  AREAS.forEach(function (a) { var p = areaPhoto(t, a.k); if (p) out.push([a.k, p]); });
  return out;
}
// The lettering of a theme: { lcd, ui, own: { key, name } } - or null for the skin's own.
function cleanFont(f) {
  if (!f || typeof f !== 'object') return null;
  var out = { lcd: '', ui: '' };
  function known(id) { return id === 'own' || FONTS.some(function (x) { return x[0] === id; }) ? id : ''; }
  out.lcd = known(f.lcd);
  out.ui = known(f.ui);
  if (f.own && typeof f.own === 'object' && /^f-[a-z0-9]{6,16}$/.test(f.own.key)) out.own = { key: f.own.key, name: cleanName(f.own.name, 'Font') };
  if (!out.own) { if (out.lcd === 'own') out.lcd = ''; if (out.ui === 'own') out.ui = ''; }
  return out.lcd || out.ui || out.own ? out : null;
}
// The font-family a theme wants for its displays ('lcd') or its labels ('ui');
// '' means the skin's own.
function fontStack(t, which) {
  var f = t.font, id = f ? f[which] : '', rec, i;
  if (!id) return '';
  if (id === 'own') {
    if (!f.own) return '';
    rec = USER.fonts[f.own.key];
    if (!rec) fontLoad(f.own.key);                       // not read yet: it arrives in a moment
    return rec && rec.ready ? '"' + rec.family + '"' + JP_FALLBACK : '';
  }
  for (i = 1; i < FONTS.length; i++) if (FONTS[i][0] === id) return FONTS[i][2] + JP_FALLBACK;
  return '';
}
// A theme as stored, or as read from a file -> one this app can trust (or null).
function cleanTheme(raw, keepId) {
  if (!raw || typeof raw !== 'object') return null;
  var t = { id: keepId && /^u-[a-z0-9]{6,16}$/.test(raw.id) ? raw.id : newId('u-'), name: cleanName(raw.name), jp: '', user: true }, i, k;
  for (i = 0; i < COLOURS.length; i++) {
    k = COLOURS[i][0];
    if (typeof raw[k] !== 'string' || !HEX.test(raw[k])) return null;
    t[k] = raw[k].toLowerCase();
  }
  if (raw.photo && typeof raw.photo === 'object' && /^p-[a-z0-9]{6,16}$/.test(raw.photo.key)) t.photo = cleanPhoto(raw.photo, raw.photo.key, 'app');
  // the other parts' pictures: only the parts there are, each picture once
  var used = {};
  if (t.photo) used[t.photo.key] = true;
  if (raw.areas && typeof raw.areas === 'object') AREAS.forEach(function (a) {
    var p = a.k === 'app' ? null : raw.areas[a.k];
    if (!p || typeof p !== 'object' || typeof p.key !== 'string' || !/^p-[a-z0-9]{6,16}$/.test(p.key) || used[p.key]) return;
    used[p.key] = true;
    setAreaPhoto(t, a.k, cleanPhoto(p, p.key, a.k));
  });
  var f = cleanFont(raw.font);
  if (f) t.font = f;
  return t;
}
function userTheme(id) {
  for (var i = 0; i < USER.list.length; i++) if (USER.list[i].id === id) return USER.list[i];
  return null;
}
// "Sunset", then "Sunset 2", "Sunset 3"...
function freeName(name) {
  var n = 1, out = name;
  while (USER.list.some(function (x) { return x.name === out; })) out = name.slice(0, 36) + ' ' + (++n);
  return out;
}
function saveUserThemes() {
  return store.set('userThemes', USER.list.map(function (t) {
    var o = { id: t.id, name: t.name };
    COLOURS.forEach(function (c) { o[c[0]] = t[c[0]]; });
    if (t.photo) o.photo = t.photo;
    if (t.areas) o.areas = t.areas;
    if (t.font) o.font = t.font;
    return o;
  }));
}
(function () {
  var saved = store.get('userThemes', []), i, t;
  if (!Array.isArray(saved)) return;
  for (i = 0; i < saved.length && USER.list.length < 80; i++) { t = cleanTheme(saved[i], true); if (t) USER.list.push(t); }
})();

// ---- the photos: kept in IndexedDB, shown through a blob: address ----
function skinDb() {
  if (!USER.dbP) USER.dbP = new Promise(function (ok, no) {
    var o;
    try { o = indexedDB.open('mp-skins', 1); } catch (e) { no(e); return; }
    o.onupgradeneeded = function () { o.result.createObjectStore('photos'); };
    o.onsuccess = function () { ok(o.result); };
    o.onerror = o.onblocked = function () { no(o.error || new Error('the photo storage is not available')); };
  });
  return USER.dbP;
}
function dbDo(mode, fn) {
  return skinDb().then(function (db) {
    return new Promise(function (ok, no) {
      var tx = db.transaction('photos', mode), rq = fn(tx.objectStore('photos'));
      tx.oncomplete = function () { ok(rq ? rq.result : undefined); };
      tx.onerror = tx.onabort = function () { no(tx.error || new Error('the photo storage refused')); };
    });
  });
}
function photoPut(key, blob) { return dbDo('readwrite', function (s) { return s.put(blob, key); }); }
function photoGet(key) { return dbDo('readonly', function (s) { return s.get(key); }); }
function photoDel(key) { return dbDo('readwrite', function (s) { return s.delete(key); }); }

// Read a theme's photo from storage (once); it shows as soon as it is there.
function loadPhoto(key) {
  if (USER.photos[key]) return;
  USER.photos[key] = { url: '', blob: null, saved: true };
  photoGet(key).then(function (blob) {
    if (!blob) { dlog('theme photo ' + key + ' is not in the storage'); return; }
    USER.photos[key] = { url: URL.createObjectURL(blob), blob: blob, saved: true };
    applyTheme();
    if (USER.draft) editFrame();
  }, function (e) { dlog('theme photos cannot be read: ' + errText(e)); });
}
function dropPhoto(key) {
  var rec = USER.photos[key];
  if (rec && rec.url) { try { URL.revokeObjectURL(rec.url); } catch (e) {} }
  delete USER.photos[key];
  photoDel(key).then(null, function () {});
}

// ---- a font file of your own: kept beside the photos, used under a name of its own ----
// Make the bytes usable as the font "mpf-<key>". Fails when they are not a font.
function fontUse(key, blob, saved) {
  return blob.arrayBuffer().then(function (buf) {
    var family = 'mpf-' + key, ff = new FontFace(family, buf);
    return ff.load().then(function () {
      document.fonts.add(ff);
      USER.fonts[key] = { family: family, ready: true, blob: blob, buf: buf, saved: !!saved, face: ff };
      if (FLOAT.win) fontsInto(FLOAT.win);
      applyTheme();
    });
  });
}
// (Mac) the floating compact player is a document of its own: it needs them too
function fontsInto(win) {
  Object.keys(USER.fonts).forEach(function (key) {
    var rec = USER.fonts[key];
    if (!rec.ready || !rec.buf) return;
    try { win.document.fonts.add(new win.FontFace(rec.family, rec.buf)); } catch (e) {}
  });
}
function fontLoad(key) {
  if (USER.fonts[key]) return;
  USER.fonts[key] = { family: 'mpf-' + key, ready: false, blob: null, saved: true };
  photoGet(key).then(function (blob) {
    if (!blob) { dlog('theme font ' + key + ' is not in the storage'); return null; }
    return fontUse(key, blob, true);
  }).then(null, function (e) { dlog('a theme font cannot be used: ' + errText(e)); });
}
function fontBlob(key) {
  var rec = USER.fonts[key];
  return rec && rec.blob ? Promise.resolve(rec.blob) : photoGet(key);
}
function fontForget(key) {                                 // out of this session (the storage is another matter)
  var rec = USER.fonts[key];
  if (rec && rec.face) { try { document.fonts.delete(rec.face); } catch (e) {} }
  delete USER.fonts[key];
}
function dropFont(key) {
  fontForget(key);
  photoDel(key).then(null, function () {});
}

// What is behind the player: a layer of #mp-app (player.css, "a photo
// behind the player"), steered with these variables on the element itself -
// so it goes along when the player moves to the Mac's floating window. A
// video cannot be a CSS background, so that one is an element of its own
// (ui.bgv), laid out by the same variables.
var PHOTO_VARS = ['--mp-photo', '--mp-photo-x', '--mp-photo-y', '--mp-photo-k', '--mp-photo-tint', '--mp-photo-blur', '--mp-glass', '--mp-photo-fx', '--mp-photo-flip'];
// the colour knobs of a picture, as a CSS filter
function photoFilter(p) {
  return 'brightness(' + ((p.bright || 100) / 100).toFixed(2) + ') saturate(' + ((p.sat === 0 ? 0 : p.sat || 100) / 100).toFixed(2) + ')';
}
function applyPhoto(t) {
  var app = ui.app;
  if (!app) return;
  // the compact player can have a picture of its own
  var p = (t.user || t.live) ? ((S.mode === 'compact' && areaPhoto(t, 'mini')) || t.photo) : null, rec = p ? USER.photos[p.key] : null;
  if (p && !rec) loadPhoto(p.key);                       // not read yet: it arrives in a moment
  var on = !!(p && rec && rec.url), video = on && p.kind === 'video';
  // mirrored: about the middle of the player, so the same part of the picture shows
  var vals = on ? [video ? 'none' : 'url("' + rec.url + '")', p.x + '%', p.y + '%', (p.size / 100).toFixed(2), p.tint + '%', p.blur + 'px', (1 - p.glass / 100).toFixed(2),
    photoFilter(p), p.flip ? (p.fit === 'tile' ? 'scaleX(-1)' : 'translateX(' + (100 - 2 * p.x) + '%) scaleX(-1)') : 'scaleX(1)'] : null;
  var sig = on ? p.fit + '|' + p.kind + '|' + rec.url + '|' + vals.join('|') : '';
  if (app.__mpPhoto === sig) { bgvSync(); return; }
  app.__mpPhoto = sig;
  PHOTO_VARS.forEach(function (name, i) { if (vals) app.style.setProperty(name, vals[i]); else app.style.removeProperty(name); });
  if (on) {
    app.setAttribute('data-photo', p.fit);
    app.setAttribute('data-photo-kind', t.live ? 'live' : p.kind);
  } else {
    app.removeAttribute('data-photo');
    app.removeAttribute('data-photo-kind');
  }
  bgVideo(video ? rec.url : '');
}

// The pictures for parts of the player: a layer in each part (built with the
// player, ui.ar), under what the part shows - see player.css, "pictures for
// parts of the player". #mp-app carries data-ar-<part> for each part that has
// one, so the part's own colours can step aside.
var AR_VARS = ['--ar-pic', '--ar-x', '--ar-y', '--ar-k', '--ar-tint', '--ar-b', '--ar-fx'];
function applyAreas(t) {
  if (!ui.app || !ui.ar) return;
  var own = !!(t.user || t.live), glass = '';
  Object.keys(ui.ar).forEach(function (k) {
    var layer = ui.ar[k], p = own ? areaPhoto(t, k) : null, rec = p ? USER.photos[p.key] : null, on, video, vals, sig;
    if (p && !rec) loadPhoto(p.key);
    on = !!(p && rec && rec.url);
    video = on && p.kind === 'video';
    vals = on ? [video ? 'none' : 'url("' + rec.url + '")', p.x + '%', p.y + '%', (p.size / 100).toFixed(2), p.tint + '%', p.blur + 'px', photoFilter(p)] : null;
    if (on && k === 'top') glass = (1 - p.glass / 100).toFixed(2);
    sig = on ? [p.fit, p.kind, p.flip ? 1 : 0, rec.url].concat(vals).join('|') : '';
    if (layer.__mpSig === sig) return;
    layer.__mpSig = sig;
    AR_VARS.forEach(function (name, i) { if (vals) layer.style.setProperty(name, vals[i]); else layer.style.removeProperty(name); });
    layer.setAttribute('data-on', on ? '1' : '0');
    layer.setAttribute('data-fit', on ? p.fit : '');
    layer.setAttribute('data-kind', on ? p.kind : '');
    layer.setAttribute('data-flip', on && p.flip ? '1' : '0');
    if (on) ui.app.setAttribute('data-ar-' + k, p.kind); else ui.app.removeAttribute('data-ar-' + k);
    arVideo(layer, video ? rec.url : '');
  });
  if (ui.app.style.getPropertyValue('--mp-glass-top') !== glass) {
    if (glass) ui.app.style.setProperty('--mp-glass-top', glass); else ui.app.style.removeProperty('--mp-glass-top');
  }
  bgvSync();
}
// a part's picture is a <div> with it as its background, or a <video>
function arVideo(layer, url) {
  var pic = layer.firstElementChild, v;
  if (!url) {
    if (pic && pic.tagName === 'VIDEO') {
      try { pic.pause(); pic.removeAttribute('src'); pic.load(); } catch (e) {}
      layer.replaceChild(h('div', { class: 'mp-ar-pic' }), pic);
    }
    return;
  }
  if (!pic || pic.tagName !== 'VIDEO') {
    v = h('video', { class: 'mp-ar-pic', 'aria-hidden': 'true', tabindex: '-1', muted: true, loop: true, playsinline: true, disablepictureinpicture: true, preload: 'auto' });
    v.muted = true;                                      // never any sound
    v.loop = true;
    if (pic) layer.replaceChild(v, pic); else layer.appendChild(v);
    pic = v;
  }
  if (pic.getAttribute('src') !== url) pic.setAttribute('src', url);
}
function bgVideo(url) {
  var v = ui.bgv;
  if (!url) {
    if (!v) return;
    try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {}
    v.remove();
    ui.bgv = null;
    return;
  }
  if (!v) {
    v = ui.bgv = h('video', { class: 'mp-bgv', 'aria-hidden': 'true', tabindex: '-1', muted: true, loop: true, playsinline: true, disablepictureinpicture: true, preload: 'auto' });
    v.muted = true;                                      // never any sound: the music is the player's
    v.loop = true;
  }
  if (v.parentNode !== ui.app) ui.app.insertBefore(v, ui.app.firstChild);
  if (v.getAttribute('src') !== url) v.setAttribute('src', url);
  bgvSync();
}
// A video plays only while the player is in sight - and, in a part of the
// player, while that part is there at all (a panel can be switched off, the
// library and the list are not in the compact player).
function bgvSync() {
  var all = [], pr;
  if (ui.bgv) all.push(ui.bgv);
  if (ui.ar) Object.keys(ui.ar).forEach(function (k) {
    var pic = ui.ar[k].firstElementChild;
    if (pic && pic.tagName === 'VIDEO') all.push(pic);
  });
  all.forEach(function (v) {
    if (S.seen && deckShown() && v.getClientRects().length) {
      if (v.paused) { try { pr = v.play(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) {} }
    } else if (!v.paused) { try { v.pause(); } catch (e) {} }
  });
}

// A picture file -> what a theme keeps: the picture no bigger than a large
// screen needs (as WebP), and a tiny one for the list of themes. With `keep`
// (a photo out of a skin file) the bytes are kept as they are when they are
// already small enough, so nothing is lost on the way between computers.
function readPhoto(file, keep) {
  if (!file || (file.type && file.type.indexOf('image/') !== 0)) return Promise.reject(new Error('That file is not a picture'));
  if (file.size > 60 * 1024 * 1024) return Promise.reject(new Error('That picture is too big (over 60 MB)'));
  return createImageBitmap(file).then(function (bmp) {
    var k = Math.min(1, PHOTO_MAX / Math.max(bmp.width, bmp.height));
    var thumb = thumbOf(bmp, bmp.width, bmp.height), ratio = bmp.width / bmp.height;
    if (keep && k === 1 && file.type === 'image/webp') { if (bmp.close) bmp.close(); return { blob: file, thumb: thumb, ratio: ratio }; }
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * k));
    c.height = Math.max(1, Math.round(bmp.height * k));
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    if (bmp.close) bmp.close();
    return new Promise(function (ok, no) {
      c.toBlob(function (blob) {
        if (blob) ok({ blob: blob, thumb: thumb, ratio: ratio }); else no(new Error('That picture could not be prepared'));
      }, 'image/webp', 0.9);
    });
  }, function () { throw new Error('That picture could not be read (try a JPEG or a PNG)'); });
}
// The tiny picture shown in the list of themes and in the editor: all of the
// picture, no more than 200 x 120.
function thumbOf(src, w, h0) {
  var th = document.createElement('canvas'), tk = Math.min(200 / w, 120 / h0);
  th.width = Math.max(1, Math.round(w * tk));
  th.height = Math.max(1, Math.round(h0 * tk));
  th.getContext('2d').drawImage(src, 0, 0, th.width, th.height);
  return th.toDataURL('image/jpeg', 0.72);
}

// Any file for behind the player -> { blob, thumb, kind }. A photo is scaled
// as above; a moving picture and a video are kept exactly as they are, once
// the browser has shown that it can really play them.
function readBackground(file, keep) {
  var type = (file && file.type) || '';
  if (!file) return Promise.reject(new Error('No file was chosen'));
  if (type.indexOf('video/') === 0) return readVideo(file);
  if (type && type.indexOf('image/') !== 0) return Promise.reject(new Error('That file is not a picture or a video'));
  return isMoving(file).then(function (moving) {
    if (!moving) return readPhoto(file, keep).then(function (r) { r.kind = 'still'; return r; });
    if (file.size > ANIM_MAX) throw new Error('That moving picture is too big (over 30 MB)');
    return createImageBitmap(file).then(function (bmp) {
      var thumb = thumbOf(bmp, bmp.width, bmp.height), ratio = bmp.width / bmp.height;
      if (bmp.close) bmp.close();
      return { blob: file, thumb: thumb, kind: 'anim', ratio: ratio };
    }, function () { throw new Error('That picture could not be read'); });
  });
}
// does this picture move? (a GIF, an animated WebP or PNG)
function isMoving(file) {
  var type = file.type || '';
  if (!/^image\/(gif|webp|png|apng|avif)$/.test(type) || typeof window.ImageDecoder !== 'function') return Promise.resolve(type === 'image/gif');
  return file.arrayBuffer().then(function (buf) {
    var dec = new window.ImageDecoder({ data: buf, type: type });
    return dec.tracks.ready.then(function () {
      var tr = dec.tracks.selectedTrack, yes = !!(tr && tr.animated);
      try { dec.close(); } catch (e) {}
      return yes;
    });
  }).then(null, function () { return false; });
}
function readVideo(file) {
  if (file.size > VIDEO_MAX) return Promise.reject(new Error('That video is too big (over 50 MB) - a short loop works best'));
  return new Promise(function (ok, no) {
    var v = document.createElement('video'), url = URL.createObjectURL(file), done = false, timer;
    function end(thumb) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      var ratio = v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 0;
      try { v.removeAttribute('src'); v.load(); } catch (e) {}
      try { URL.revokeObjectURL(url); } catch (e) {}
      if (thumb) ok({ blob: file, thumb: thumb, kind: 'video', ratio: ratio });
      else no(new Error('That video cannot be played here (an MP4 or a WebM works best)'));
    }
    function snap() {
      if (!v.videoWidth) { end(''); return; }              // (sound only)
      try { end(thumbOf(v, v.videoWidth, v.videoHeight)); } catch (e) { end(''); }
    }
    v.muted = true;
    v.preload = 'auto';
    v.playsInline = true;
    v.onloadeddata = function () {
      // a little way in: many clips open on a black frame
      var at = Math.min(1, (isFinite(v.duration) ? v.duration : 0) / 10);
      if (at > 0.05) { v.onseeked = snap; try { v.currentTime = at; } catch (e) { snap(); } }
      else snap();
    };
    v.onerror = function () { end(''); };
    timer = setTimeout(function () { end(''); }, 15000);
    v.src = url;
  });
}

// ---- a theme as a file ----
function blobToBase64(blob) {
  return new Promise(function (ok, no) {
    var fr = new FileReader();
    fr.onload = function () { var s = String(fr.result); ok(s.slice(s.indexOf(',') + 1)); };
    fr.onerror = function () { no(fr.error || new Error('the photo could not be read')); };
    fr.readAsDataURL(blob);
  });
}
function photoBlob(key) {
  var rec = USER.photos[key];
  return rec && rec.blob ? Promise.resolve(rec.blob) : photoGet(key);
}
// The .mpskin file for a theme: its name, colours and pictures in one piece.
// version 1: colours and a photo. version 2: also a moving picture or a video
// behind the player, and lettering. version 3: also pictures for parts of the
// player ("areas"). A theme is written with the lowest version it needs, so a
// plain one still opens in a Music Player that has not been updated.
function skinFile(t) {
  var out = { format: SKIN_FORMAT, version: 1, name: t.name, colors: {} }, ready = Promise.resolve(), big = [], bytes = 0;
  // the big pieces (a video can be tens of megabytes) are put into the text
  // afterwards, at a marker, instead of being copied through JSON.stringify
  function later(b64) {
    var mark = 'MPSKIN-PART-' + newId('') + '-' + big.length;
    big.push({ mark: mark, b64: b64 });
    return mark;
  }
  COLOURS.forEach(function (c) { out.colors[c[0]] = t[c[0]]; });
  themePhotos(t).forEach(function (x) {
    var k = x[0], ph = x[1];
    ready = ready.then(function () { return photoBlob(ph.key); }).then(function (blob) {
      if (!blob) return null;                              // (its picture is gone: the rest still travels)
      bytes += blob.size;
      if (bytes * 4 / 3 > SKIN_MAX - 1024 * 1024)
        throw new Error('its pictures are too big to go into one file (over ' + Math.round((SKIN_MAX * 3 / 4) / 1048576) + ' MB together) - use smaller ones');
      return blobToBase64(blob).then(function (b64) {
        var p = { type: blob.type || 'image/webp', kind: ph.kind || 'still', fit: ph.fit, flip: !!ph.flip };
        PHOTO_KNOBS.forEach(function (n) { p[n[0]] = ph[n[0]]; });
        if (ph.ratio) p.ratio = Math.round(ph.ratio * 10000) / 10000;
        p.data = later(b64);
        if (k === 'app') {
          out.photo = p;
          if (p.kind !== 'still') out.version = Math.max(out.version, 2);
        } else {
          if (!out.areas) out.areas = {};
          out.areas[k] = p;
          out.version = 3;
        }
      });
    });
  });
  if (t.font) {
    ready = ready.then(function () {
      var f = { lcd: t.font.lcd, ui: t.font.ui };
      out.font = f;
      out.version = Math.max(out.version, 2);
      if (!t.font.own) return null;
      return fontBlob(t.font.own.key).then(function (blob) {
        if (!blob) { if (f.lcd === 'own') f.lcd = ''; if (f.ui === 'own') f.ui = ''; return null; }
        bytes += blob.size;
        return blobToBase64(blob).then(function (b64) { f.own = { name: t.font.own.name, type: blob.type || 'font/ttf', data: later(b64) }; });
      });
    });
  }
  return ready.then(function () {
    var txt = JSON.stringify(out), bits = [], at = 0;
    big.forEach(function (x) { x.at = txt.indexOf(x.mark); });
    big.sort(function (a, b) { return a.at - b.at; });
    big.forEach(function (x) {
      if (x.at < 0) return;
      bits.push(txt.slice(at, x.at), x.b64);
      at = x.at + x.mark.length;
    });
    bits.push(txt.slice(at));
    return new Blob(bits, { type: 'application/json' });
  });
}
function fileNameFor(t) {
  return (t.name.replace(/[\\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim() || 'My theme') + '.mpskin';
}
function download(blob, name) {
  var doc = drawDoc(), url = URL.createObjectURL(blob), a = doc.createElement('a');
  a.href = url;
  a.download = name;
  a.style.display = 'none';
  doc.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 60000);
}
// EXPORT: ask where to save (the window must be asked straight away, while
// the click still counts), then write the file. Where the browser has no
// "save as" of its own, it is an ordinary download.
function exportTheme(id) {
  var t = userTheme(id), w = drawWin(), name, pick = null;
  if (!t) return;
  name = fileNameFor(t);
  if (w.showSaveFilePicker) {
    try {
      pick = w.showSaveFilePicker({ suggestedName: name, types: [{ description: 'Music Player skin', accept: { 'application/json': ['.mpskin'] } }] });
    } catch (e) { pick = null; }
  }
  (pick ? pick.then(null, function (e) { if (e && e.name === 'AbortError') throw e; return null; }) : Promise.resolve(null)).then(function (fh) {
    return skinFile(t).then(function (blob) {
      if (!fh) { download(blob, name); return name + ' - IN YOUR DOWNLOADS FOLDER'; }
      return fh.createWritable().then(function (wr) {
        return wr.write(blob).then(function () { return wr.close(); });
      }).then(function () { return fh.name; });
    });
  }).then(function (where) { userSay('EXPORTED: ' + where, true); }, function (e) {
    if (!e || e.name !== 'AbortError') userSay('COULD NOT EXPORT: ' + errText(e), false);
  });
}
// IMPORT: a .mpskin file -> a new theme in the list (it never replaces one).
function b64ToBlob(data, type) {
  var bin = atob(data), bytes = new Uint8Array(bin.length), i;
  for (i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: type });
}
function importSkin(file) {
  if (!file) return Promise.reject(new Error('No file was chosen'));
  if (file.size > SKIN_MAX) return Promise.reject(new Error('That file is too big to be a skin'));
  return file.text().then(function (txt) {
    var d = null, raw, t, fo, fblob = null, fkey = '', trouble = [], bg, ft, blobs = {};
    try { d = JSON.parse(txt); } catch (e) {}
    txt = '';
    if (!d || typeof d !== 'object' || d.format !== SKIN_FORMAT || !d.colors || typeof d.colors !== 'object')
      throw new Error('That is not a Music Player skin file');
    if (+d.version > 3) throw new Error('That skin was made with a newer Music Player - update this one first');
    raw = { name: d.name };
    COLOURS.forEach(function (c) { raw[c[0]] = d.colors[c[0]]; });
    fo = d.font && typeof d.font === 'object' ? d.font : null;
    if (fo) {
      raw.font = { lcd: fo.lcd, ui: fo.ui };
      if (fo.own && typeof fo.own === 'object' && typeof fo.own.data === 'string') { fkey = newId('f-'); raw.font.own = { key: fkey, name: fo.own.name }; }
    }
    t = cleanTheme(raw, false);
    if (!t) throw new Error('That skin file is damaged (its colours cannot be read)');
    t.name = freeName(t.name);

    // the pictures - behind the player, and for parts of it: through the same
    // door as a file chosen here, so each must really be a picture or a video
    // this browser can show. One after another (they can be big).
    bg = Promise.resolve();
    AREAS.forEach(function (a) {
      var ph = a.k === 'app' ? d.photo : (d.areas && typeof d.areas === 'object' ? d.areas[a.k] : null), blob = null;
      if (!ph || typeof ph !== 'object') return;
      if (typeof ph.data !== 'string' || !/^(image\/(webp|jpeg|png|gif|apng|avif)|video\/[a-z0-9.+-]{2,30})$/.test(ph.type)) {
        trouble.push(a.k === 'app' ? 'ITS PICTURE COULD NOT BE READ' : 'ITS PICTURE FOR THE ' + a.en + ' COULD NOT BE READ');
        return;
      }
      bg = bg.then(function () {
        try { blob = b64ToBlob(ph.data, ph.type); } catch (e) { blob = null; }
        ph.data = '';
        return blob ? readBackground(blob, true) : Promise.reject(new Error('no picture'));
      }).then(function (r) {
        var p = cleanPhoto(ph, newId('p-'), a.k);
        p.kind = r.kind;                                   // (what it turned out to be, not what the file says)
        if (r.kind === 'video' && p.fit === 'tile') p.fit = 'cover';
        p.thumb = r.thumb;
        if (r.ratio) p.ratio = limit(r.ratio, 0.05, 20, 0);
        setAreaPhoto(t, a.k, p);
        blobs[a.k] = r.blob;
      }, function () {
        trouble.push(a.k === 'app' ? 'ITS PICTURE COULD NOT BE READ' : 'ITS PICTURE FOR THE ' + a.en + ' COULD NOT BE READ');
      });
    });

    // its own font: it must load as a font
    ft = Promise.resolve(null);
    if (fkey && t.font && t.font.own) {
      try { fblob = fo.own.data.length < FONT_MAX * 1.4 ? b64ToBlob(fo.own.data, /^(font|application)\/[a-z0-9.+-]{2,30}$/.test(fo.own.type) ? fo.own.type : 'font/ttf') : null; } catch (e) { fblob = null; }
      fo.own.data = '';
      ft = (fblob ? fontUse(fkey, fblob, false) : Promise.reject(new Error('no font'))).then(function () { return fblob; }, function () {
        delete t.font.own;
        t.font = cleanFont(t.font);
        if (!t.font) delete t.font;
        trouble.push('ITS FONT COULD NOT BE READ');
        return null;
      });
    }
    return bg.then(function () {
      return ft.then(function (fb) { return addTheme(t, blobs, trouble.join(', '), fb); });
    });
  });
}
// A new theme in the list, with its pictures ({ part: blob }) and font file.
function addTheme(t, blobs, trouble, fblob) {
  var done = Promise.resolve(), fkey = t.font && t.font.own ? t.font.own.key : '';
  themePhotos(t).forEach(function (x) {
    var k = x[0], key = x[1].key, blob = blobs && blobs[k];
    if (!blob) { setAreaPhoto(t, k, null); return; }
    USER.photos[key] = { url: URL.createObjectURL(blob), blob: blob, saved: false };
    done = done.then(function () {
      return photoPut(key, blob).then(function () { USER.photos[key].saved = true; },
        function (e) { trouble = 'ITS PICTURES WILL BE GONE WHEN THE APP CLOSES (' + errText(e) + ')'; });
    });
  });
  if (fkey && fblob) {
    done = done.then(function () {
      return photoPut(fkey, fblob).then(function () { if (USER.fonts[fkey]) USER.fonts[fkey].saved = true; },
        function (e) { trouble = 'ITS FONT WILL BE GONE WHEN THE APP CLOSES (' + errText(e) + ')'; });
    });
  }
  return done.then(function () {
    USER.list.push(t);
    if (!saveUserThemes()) trouble = 'IT COULD NOT BE KEPT: THE STORAGE IS FULL';
    renderUserThemes();
    setTheme(t.id);
    return { theme: t, trouble: trouble };
  });
}
function deleteTheme(id) {
  var t = userTheme(id);
  if (!t) return;
  USER.list = USER.list.filter(function (x) { return x.id !== id; });
  saveUserThemes();
  themePhotos(t).forEach(function (x) { dropPhoto(x[1].key); });
  if (t.font && t.font.own) dropFont(t.font.own.key);
  renderUserThemes();
  if (S.theme === id) setTheme(store.get('themeBase', 'midnight')); else syncPanel();
}

// ---- the editor: a drawer down the right-hand side; the player beside it
//      is the preview (it shows every change as it is made) ----
function editOpen(id) {
  var src = id ? userTheme(id) : null, now = themeNow(), d;
  if (USER.draft || !ui.editor) return;
  if (src) d = cleanTheme(src, true);                      // a copy: nothing is kept until SAVE
  else {
    d = { id: newId('u-'), name: freeName('My theme'), jp: '', user: true };
    COLOURS.forEach(function (c) { d[c[0]] = now[c[0]]; });   // starts from the colours showing now
  }
  if (!d) return;
  USER.draft = d;
  USER.draftKeysWas = src ? themePhotos(src).map(function (x) { return x[1].key; }) : [];
  USER.draftFontWas = src && src.font && src.font.own ? src.font.own.key : '';
  // the picture controls start on the whole player - or, when only parts of
  // it have pictures, on the first of those
  USER.edArea = src && !src.photo && themePhotos(src).length ? themePhotos(src)[0][0] : 'app';
  closePanel();
  editSay('');
  editFill();
  ui.editor.setAttribute('data-open', '1');
  document.documentElement.setAttribute('data-mp-edit', '1');
  retheme();
  requestCompactSize();                // (the compact window makes room for the editor beside it)
  setTimeout(function () { relayout(); editFrame(); }, 60);
}
function editHide() {
  if (ui.editor) ui.editor.setAttribute('data-open', '0');
  document.documentElement.removeAttribute('data-mp-edit');
  requestCompactSize();
  setTimeout(relayout, 60);
}
function editing() { return !!ui.editor && ui.editor.getAttribute('data-open') === '1'; }
var EDIT_W = 332;                      // the editor's width (player.css: #mp-editor)
// what the editor's controls show, from the theme being edited
function editFill() {
  var d = USER.draft, ed = ui.editor, els, i, k, p;
  if (!d || !ed) return;
  ui.edName.value = d.name;
  els = ed.querySelectorAll('[data-c]');
  for (i = 0; i < els.length; i++) els[i].value = d[els[i].getAttribute('data-c')];
  els = ed.querySelectorAll('[data-hx]');
  for (i = 0; i < els.length; i++) { els[i].value = d[els[i].getAttribute('data-hx')]; els[i].removeAttribute('data-bad'); }
  editFonts();
  editAreas();
  p = edPhoto();
  k = areaInfo(USER.edArea);
  ui.edAreaSay.textContent = k.en + ': ' + k.say;
  ui.edNoPhoto.hidden = !p;
  ui.edOpts.hidden = !p;
  editFrame();
  if (!p) return;
  els = ed.querySelectorAll('[data-fit]');
  for (i = 0; i < els.length; i++) {
    els[i].setAttribute('aria-pressed', els[i].getAttribute('data-fit') === p.fit ? 'true' : 'false');
    els[i].disabled = p.kind === 'video' && els[i].getAttribute('data-fit') === 'tile';     // (a video cannot be tiled)
  }
  ui.edFlip.setAttribute('aria-pressed', p.flip ? 'true' : 'false');
  // the knobs this part has, and what is laid over its picture
  els = ed.querySelectorAll('[data-row]');
  for (i = 0; i < els.length; i++) {
    if (els[i].getAttribute('data-row') === 'glass') els[i].hidden = !k.glass;
    if (els[i].getAttribute('data-row') === 'tint') {
      els[i].querySelector('.mpe-label').textContent = k.tint === 'lcd' ? 'Display colour' : 'Body colour';
      els[i].title = 'How much of the ' + (k.tint === 'lcd' ? 'display' : 'body') + ' colour lies over the picture (more: the lettering reads better)';
    }
  }
  editKnobs(true);
}
// the picture of the part being edited (or null)
function edPhoto() { return USER.draft ? areaPhoto(USER.draft, USER.edArea) : null; }
// the sliders and the framer, from the picture (quiet: the player is not repainted)
function editKnobs(quiet) {
  var p = edPhoto(), els, i;
  if (!p || !ui.editor) return;
  els = ui.editor.querySelectorAll('[data-p]');
  for (i = 0; i < els.length; i++) els[i].value = p[els[i].getAttribute('data-p')];
  editVals();
  editFrame();
  if (!quiet) applyTheme();
}
// the numbers beside the sliders
function editVals() {
  var p = edPhoto(), els = ui.editor.querySelectorAll('[data-v]'), i, j, k;
  for (i = 0; i < els.length; i++) {
    k = els[i].getAttribute('data-v');
    for (j = 0; j < PHOTO_KNOBS.length; j++) if (PHOTO_KNOBS[j][0] === k) els[i].textContent = p ? p[k] + PHOTO_KNOBS[j][5] : '';
  }
}
// The parts of the player, on the keys and on the little map: which one is
// being edited, which have a picture (a lamp, and the picture itself).
function editAreas() {
  var d = USER.draft, els, i, k, p, whole;
  if (!d || !ui.editor) return;
  els = ui.editor.querySelectorAll('[data-area]');
  for (i = 0; i < els.length; i++) {
    k = els[i].getAttribute('data-area');
    p = areaPhoto(d, k);
    els[i].setAttribute('aria-pressed', k === USER.edArea ? 'true' : 'false');
    els[i].setAttribute('data-has', p ? '1' : '0');
    if (els[i].classList.contains('mpe-reg')) els[i].style.backgroundImage = p && p.thumb ? 'url("' + p.thumb + '")' : '';
  }
  whole = areaPhoto(d, 'app');
  ui.edMap.style.backgroundImage = whole && whole.thumb ? 'url("' + whole.thumb + '")' : '';
}

// ---- the framer: all of the picture, with the point it is placed by (x, y)
//      and - when it fills its part - a frame around what shows of it there.
//      Drag on it to move that point, scroll on it to zoom. ----
function editFrame() {
  var fr = ui.edFrame, p = edPhoto(), rec, src, w, hh, img, box, vf;
  if (!fr) return;
  fr.setAttribute('data-has', p ? '1' : '0');
  fr.setAttribute('data-kind', p ? p.kind : '');
  ui.edAim.hidden = ui.edView.hidden = true;
  if (!p) { fr.style.backgroundImage = ''; return; }
  rec = USER.photos[p.key];
  src = p.kind !== 'video' && rec && rec.url ? rec.url : p.thumb;      // (a moving picture moves here too)
  fr.style.backgroundImage = src ? 'url("' + src + '")' : '';
  if (!p.ratio) frameRatio(p, rec);
  w = fr.clientWidth;
  hh = fr.clientHeight;
  if (!w || !hh) return;
  img = frameImage(p, w, hh);
  ui.edAim.style.left = (img.x + img.w * p.x / 100).toFixed(1) + 'px';
  ui.edAim.style.top = (img.y + img.h * p.y / 100).toFixed(1) + 'px';
  ui.edAim.hidden = false;
  box = p.fit === 'cover' && p.ratio ? areaBox(USER.edArea) : null;
  vf = box ? viewOf(p, box[0], box[1]) : null;
  if (!vf) return;
  ui.edView.style.left = (img.x + vf.x * img.w).toFixed(1) + 'px';
  ui.edView.style.top = (img.y + vf.y * img.h).toFixed(1) + 'px';
  ui.edView.style.width = (vf.w * img.w).toFixed(1) + 'px';
  ui.edView.style.height = (vf.h * img.h).toFixed(1) + 'px';
  ui.edView.hidden = false;
}
// where the picture sits in the framer (shown whole, in the middle)
function frameImage(p, w, hh) {
  var r = p.ratio || w / hh, iw, ih;
  if (w / hh > r) { ih = hh; iw = hh * r; } else { iw = w; ih = w / r; }
  return { x: (w - iw) / 2, y: (hh - ih) / 2, w: iw, h: ih };
}
// The part of a picture (as fractions of it) that shows in a part of the
// player W x H, when it fills it (FILL): drawn as big as it takes to cover the
// part (and the blur's margin round it), then zoomed by its size about the
// point (x, y) - as player.css does it.
function viewOf(p, W, H) {
  var r = p.ratio, k = p.size / 100, m = 2.5 * p.blur, LW = W + 2 * m, LH = H + 2 * m, c = Math.max(LW / r, LH), fx = p.x / 100, fy = p.y / 100;
  var x0 = fx + (m - fx * LW) / (k * r * c), x1 = fx + (m + W - fx * LW) / (k * r * c);
  var y0 = fy + (m - fy * LH) / (k * c), y1 = fy + (m + H - fy * LH) / (k * c);
  x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(1, x1); y1 = Math.min(1, y1);
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}
// How big a part of the player is (CSS pixels) - as it is when the editor is
// closed - or null when it is not on screen now.
function areaBox(k) {
  var W = window.innerWidth, H = window.innerHeight, compact = S.mode === 'compact', ed = editing() && W >= (compact ? 780 : 900) ? EDIT_W : 0, el;
  if (k === 'app') return [compact ? W - ed : W, H];
  if (k === 'mini') return compact ? [W - ed, H] : compactSize();
  if (k === 'top') return ui.strip && ui.deck ? [compact ? W - ed : W, ui.strip.offsetHeight + ui.deck.offsetHeight] : null;
  el = k === 'nav' ? ui.nav : k === 'list' ? ui.browser : k === 'lyr' ? (ui.lyBody && ui.lyBody.parentNode) : k === 'queue' ? ui.list : null;
  if (!el || !el.clientWidth || !el.clientHeight) return null;
  return [el.clientWidth + (k === 'list' && !compact ? ed : 0), el.clientHeight];
}
// width / height of a picture that came without it (saved before this was kept)
function frameRatio(p, rec) {
  var v, im;
  if (!rec || !rec.url || USER.measuring[p.key]) return;
  USER.measuring[p.key] = true;
  function got(w, hh) {
    if (w && hh) { p.ratio = limit(w / hh, 0.05, 20, 0); editFrame(); }
  }
  if (p.kind === 'video') {
    v = document.createElement('video');
    v.muted = true;
    v.preload = 'metadata';
    v.onloadedmetadata = function () { got(v.videoWidth, v.videoHeight); try { v.removeAttribute('src'); v.load(); } catch (e) {} };
    v.src = rec.url;
  } else {
    im = new Image();
    im.onload = function () { got(im.naturalWidth, im.naturalHeight); };
    im.src = rec.url;
  }
}
// a point in the framer -> the point the picture is placed by
var FRAMER = { drag: false, raf: 0, ev: null };
function frameAt(e) {
  var p = edPhoto(), fr = ui.edFrame, rc, img;
  if (!p) return;
  rc = fr.getBoundingClientRect();
  img = frameImage(p, fr.clientWidth, fr.clientHeight);
  p.x = Math.round(limit((e.clientX - rc.left - fr.clientLeft - img.x) / img.w * 100, 0, 100, 50));
  p.y = Math.round(limit((e.clientY - rc.top - fr.clientTop - img.y) / img.h * 100, 0, 100, 50));
  editKnobs();
}
function frameMove(e) {
  FRAMER.ev = { clientX: e.clientX, clientY: e.clientY };
  if (FRAMER.raf) return;
  FRAMER.raf = requestAnimationFrame(function () {
    FRAMER.raf = 0;
    if (FRAMER.ev) frameAt(FRAMER.ev);
  });
}
function frameZoom(by) {
  var p = edPhoto();
  if (!p) return;
  p.size = limit(p.size + by, 40, 300, 100);
  editKnobs();
}
function bindFramer(fr) {
  fr.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return;
    if (!edPhoto()) { ACT.editphoto(); return; }          // nothing here yet: choose a file
    e.preventDefault();
    FRAMER.drag = true;
    try { fr.setPointerCapture(e.pointerId); } catch (x) {}
    try { fr.focus({ preventScroll: true }); } catch (x) {}
    frameMove(e);
  });
  fr.addEventListener('pointermove', function (e) { if (FRAMER.drag) frameMove(e); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) {
    fr.addEventListener(ev, function () { FRAMER.drag = false; });
  });
  fr.addEventListener('wheel', function (e) {
    if (!edPhoto() || !e.deltaY) return;
    e.preventDefault();
    frameZoom(e.deltaY < 0 ? 5 : -5);
  }, { passive: false });
  // the keyboard: arrows move the point (with Shift, in bigger steps), + and - zoom
  fr.addEventListener('keydown', function (e) {
    var p = edPhoto(), step = e.shiftKey ? 5 : 1;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (!p) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); ACT.editphoto(); } return; }
    if (e.key === 'ArrowLeft') p.x = limit(p.x - step, 0, 100, 50);
    else if (e.key === 'ArrowRight') p.x = limit(p.x + step, 0, 100, 50);
    else if (e.key === 'ArrowUp') p.y = limit(p.y - step, 0, 100, 50);
    else if (e.key === 'ArrowDown') p.y = limit(p.y + step, 0, 100, 50);
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); e.stopPropagation(); frameZoom(5); return; }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); e.stopPropagation(); frameZoom(-5); return; }
    else return;
    e.preventDefault();
    e.stopPropagation();                                   // (not for Apple's page either)
    editKnobs();
  });
}
// the lettering: what the two lists offer and show, and the font file's name
function editFonts() {
  var d = USER.draft, f = d && d.font, own = f && f.own, els = ui.editor.querySelectorAll('[data-font]'), i, sel, want;
  for (i = 0; i < els.length; i++) {
    sel = els[i];
    want = (f && f[sel.getAttribute('data-font')]) || '';
    sel.replaceChildren();
    FONTS.forEach(function (x) { sel.appendChild(h('option', { value: x[0], text: x[1] })); });
    if (own) sel.appendChild(h('option', { value: 'own', text: 'Yours: ' + own.name }));
    sel.value = want;
  }
  ui.edFontName.textContent = own ? own.name : 'None. A font file of your own (TTF, OTF, WOFF) travels inside the theme.';
  ui.edNoFont.hidden = !own;
}
function editSay(text) {
  if (!ui.edMsg) return;
  ui.edMsg.textContent = text;
  ui.edMsg.hidden = !text;
}
function onEditInput(e) {
  var d = USER.draft, t = e.target, k, v, pair, j;
  if (!d || !t || !t.getAttribute) return;
  if (t === ui.edName) { d.name = t.value; return; }
  if ((k = t.getAttribute('data-font'))) {                 // lettering, from one of the two lists
    if (!d.font) d.font = { lcd: '', ui: '' };
    d.font[k] = t.value;
    d.font = cleanFont(d.font);
    if (!d.font) delete d.font;
    applyTheme();
    return;
  }
  if ((k = t.getAttribute('data-c'))) {                    // a colour, from the picker
    if (!HEX.test(t.value)) return;
    d[k] = t.value.toLowerCase();
    pair = ui.editor.querySelector('[data-hx="' + k + '"]');
    if (pair) { pair.value = d[k]; pair.removeAttribute('data-bad'); }
    retheme();
    return;
  }
  if ((k = t.getAttribute('data-hx'))) {                   // a colour, typed as a code: #1a2b3c, 1a2b3c or #abc
    v = t.value.trim();
    if (v.charAt(0) !== '#') v = '#' + v;
    if (/^#[0-9a-f]{3}$/i.test(v)) v = '#' + v.charAt(1) + v.charAt(1) + v.charAt(2) + v.charAt(2) + v.charAt(3) + v.charAt(3);
    if (!HEX.test(v)) { t.setAttribute('data-bad', '1'); return; }
    t.removeAttribute('data-bad');
    d[k] = v.toLowerCase();
    pair = ui.editor.querySelector('[data-c="' + k + '"]');
    if (pair) pair.value = d[k];
    retheme();
    return;
  }
  if ((k = t.getAttribute('data-p')) && (pair = edPhoto())) {     // one of the picture's sliders
    for (j = 0; j < PHOTO_KNOBS.length; j++)
      if (PHOTO_KNOBS[j][0] === k) pair[k] = limit(t.value, PHOTO_KNOBS[j][2], PHOTO_KNOBS[j][3], PHOTO_KNOBS[j][6]);
    editVals();
    editFrame();
    applyTheme();
  }
}
// a picture that was picked in the editor (for this part) but never saved goes again
function editDropPhoto(area) {
  var p = areaPhoto(USER.draft, area), rec = p ? USER.photos[p.key] : null;
  if (!rec || rec.saved) return;
  if (rec.url) { try { URL.revokeObjectURL(rec.url); } catch (e) {} }
  delete USER.photos[p.key];
}
function editPhotoPicked(file) {
  var area = USER.edArea;                                  // (the part it was chosen for, whatever is picked meanwhile)
  editSay('READING THE FILE...');
  return readBackground(file, false).then(function (r) {
    var d = USER.draft, key = newId('p-'), was, p;
    if (!d) return;
    was = areaPhoto(d, area) || {};
    editDropPhoto(area);
    USER.photos[key] = { url: URL.createObjectURL(r.blob), blob: r.blob, saved: false };
    // a new picture keeps the settings of the one before
    p = cleanPhoto({ kind: r.kind, fit: was.fit, size: was.size, x: was.x, y: was.y, tint: was.tint, blur: was.blur, glass: was.glass,
      bright: was.bright, sat: was.sat, flip: was.flip, ratio: r.ratio }, key, area);
    p.thumb = r.thumb;
    setAreaPhoto(d, area, p);
    editSay('');
    editFill();
    applyTheme();
  }, function (e) { editSay(errText(e)); });
}
// a font file that was picked in the editor but never saved goes again
function editDropFont() {
  var d = USER.draft, key = d && d.font && d.font.own ? d.font.own.key : '', rec = key ? USER.fonts[key] : null;
  if (rec && !rec.saved) fontForget(key);
}
function editFontPicked(file) {
  var key = newId('f-');
  if (!file) return Promise.resolve();
  if (file.size > FONT_MAX) { editSay('That font file is too big (over 12 MB)'); return Promise.resolve(); }
  editSay('READING THE FONT...');
  return fontUse(key, file, false).then(function () {
    var d = USER.draft, f;
    if (!d) { fontForget(key); return; }
    editDropFont();
    f = d.font || { lcd: '', ui: '' };
    f.own = { key: key, name: cleanName(String(file.name || '').replace(/\.[a-z0-9]{2,5}$/i, ''), 'Font') };
    if (f.lcd !== 'own' && f.ui !== 'own') f.lcd = 'own';     // straight onto the displays, where it shows most
    d.font = f;
    editSay('');
    editFonts();
    applyTheme();
  }, function () { editSay('That file is not a font this app can use (try a TTF, OTF or WOFF file)'); });
}
function editNoFont() {
  var d = USER.draft;
  if (!d || !d.font || !d.font.own) return;
  editDropFont();
  delete d.font.own;
  d.font = cleanFont(d.font);
  if (!d.font) delete d.font;
  editFonts();
  applyTheme();
}
function editNoPhoto() {
  var d = USER.draft, area = USER.edArea;
  if (!d || !areaPhoto(d, area)) return;
  editDropPhoto(area);
  setAreaPhoto(d, area, null);
  editFill();
  applyTheme();
}
function editSave() {
  var d = USER.draft, put = Promise.resolve(), trouble = '';
  if (!d) return put;
  d.name = cleanName(d.name);
  // the pictures picked since the editor was opened go into the storage
  themePhotos(d).forEach(function (x) {
    var key = x[1].key, rec = USER.photos[key];
    if (!rec || rec.saved || !rec.blob) return;
    put = put.then(function () {
      return photoPut(key, rec.blob).then(function () { rec.saved = true; },
        function (e) { trouble = 'ITS PICTURES WILL BE GONE WHEN THE APP CLOSES (' + errText(e) + ')'; });
    });
  });
  put = put.then(function () {
    var fr = d.font && d.font.own ? USER.fonts[d.font.own.key] : null;
    if (!fr || fr.saved || !fr.blob) return null;
    return photoPut(d.font.own.key, fr.blob).then(function () { fr.saved = true; },
      function (e) { trouble = 'ITS FONT WILL BE GONE WHEN THE APP CLOSES (' + errText(e) + ')'; });
  });
  return put.then(function () {
    var at = -1, i, used = {}, oldFont = USER.draftFontWas;
    if (USER.draft !== d) return;
    for (i = 0; i < USER.list.length; i++) if (USER.list[i].id === d.id) at = i;
    if (at >= 0) USER.list[at] = d; else USER.list.push(d);
    if (!saveUserThemes()) trouble = 'IT COULD NOT BE KEPT: THE STORAGE IS FULL';
    // the pictures it had before and no longer uses
    themePhotos(d).forEach(function (x) { used[x[1].key] = true; });
    USER.draftKeysWas.forEach(function (key) { if (!used[key]) dropPhoto(key); });
    if (oldFont && (!d.font || !d.font.own || d.font.own.key !== oldFont)) dropFont(oldFont);
    USER.draft = null;
    editHide();
    renderUserThemes();
    setTheme(d.id);
    openPanel();
    userSay(trouble ? 'SAVED "' + d.name + '", BUT ' + trouble : 'SAVED: ' + d.name, !trouble);
  });
}
function editCancel() {
  if (!USER.draft) return;
  AREAS.forEach(function (a) { editDropPhoto(a.k); });
  editDropFont();
  USER.draft = null;
  editHide();
  retheme();
  openPanel();
}
// the player changed size without the window doing so (the editor came or went)
function relayout() {
  placeControls();
  if (deckShown()) { setMarquee(S.marquee, true); kickViz(); vzKick(); }
  if (S.mode === 'full' && B.vlist) B.vlist.update(false);
  if (USER.draft) editFrame();                            // (what shows of a picture depends on its part's size)
}

// ---- the list in the themes panel ----
// miniature of a theme: body (with its photo), lamp, display with bars
function swatchFor(t) {
  var prev = h('div', { class: 'mp-swatch-prev' });
  var dot = h('div', { class: 'mp-swatch-dot' }), lcd = h('div', { class: 'mp-swatch-lcd' });
  var body = 'linear-gradient(180deg,' + t.shellA + ',' + t.shellB + ')', a;
  // the picture behind the whole player - or, when only parts have one, the first of those
  var ph = (t.user || t.live) ? themePhotos(t).filter(function (x) { return x[1].thumb; })[0] : null;
  if (ph) {
    a = (ph[1].tint / 100).toFixed(2);
    body = 'linear-gradient(180deg,rgba(' + hexToRgb(t.shellA).join(',') + ',' + a + '),rgba(' + hexToRgb(t.shellB).join(',') + ',' + a + ')),' +
      'url("' + ph[1].thumb + '") center/cover';
  }
  prev.style.background = body;
  dot.style.background = t.lit;
  dot.style.boxShadow = '0 0 5px ' + t.lit;
  lcd.style.background = t.lcdBg;
  [0.5, 0.9, 0.65, 1, 0.4, 0.75, 0.55, 0.3, 0.6, 0.35].forEach(function (v) {
    var bar = h('i');
    bar.style.background = t.lcdFg;
    bar.style.height = Math.round(v * 100) + '%';
    lcd.appendChild(bar);
  });
  prev.appendChild(dot);
  prev.appendChild(lcd);
  return h('button', { class: 'mp-swatch', 'data-theme': t.id, type: 'button', 'aria-pressed': 'false', title: t.name },
    prev, h('div', { class: 'mp-swatch-name' }, h('span', { class: 'mp-swatch-en', text: t.name }), t.jp ? jp(t.jp, 'mp-swatch-jp') : null));
}
function renderUserThemes() {
  if (!ui.userGrid) return;
  var frag = document.createDocumentFragment();
  USER.list.forEach(function (t) { frag.appendChild(swatchFor(t)); });
  ui.userGrid.replaceChildren(frag);
  ui.userEmpty.hidden = USER.list.length > 0;
  syncPanel();
}
// a line in the panel (and on the player) about what just happened
function userSay(text, good) {
  if (ui.userMsg) {
    ui.userMsg.textContent = text;
    ui.userMsg.setAttribute('data-kind', good ? 'ok' : 'warn');
    ui.userMsg.hidden = false;
    clearTimeout(USER.msgTimer);
    USER.msgTimer = setTimeout(function () { ui.userMsg.hidden = true; }, 10000);
    if (S.panelOpen && ui.userMsg.scrollIntoView) ui.userMsg.scrollIntoView({ block: 'nearest' });   // (the list is at the foot of a long panel)
  }
  notice(text, good);
}
function disarmDelete() {
  clearTimeout(USER.armTimer);
  if (!ui.userDelete) return;
  ui.userDelete.removeAttribute('data-arm');
  ui.userDelete.querySelector('span').textContent = 'DELETE';
}

// The clock is sized for the skin's own digits. Other lettering can be wider,
// so it is made smaller until "-88:88" fits its display.
function fitClock() {
  var el = ui.time, cs, room, w, c;
  if (!el || !el.parentNode || !deckShown()) return;
  el.style.fontSize = '';
  try {
    cs = getComputedStyle(el);
    room = el.parentNode.clientWidth - 18 - 18 - 6 - 3;       // padding, the state sign, the gap
    c = fitClock.c || (fitClock.c = document.createElement('canvas').getContext('2d'));
    c.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    w = c.measureText('-88:88').width;
    if (room > 40 && w > room) el.style.fontSize = Math.max(14, Math.floor(parseFloat(cs.fontSize) * room / w)) + 'px';
  } catch (e) {}
}

// ============================================================================
// The cover
// The picture of the song that is playing is read once per song. From it come
//   - six colours for the "Album cover" theme, which glides from one song's
//     colours to the next, with the cover itself, blurred, behind the player
//   - a small copy for the Windows app's "now playing" card
// Apple's picture server allows other pages to read the pixels; where a
// picture cannot be read (some uploaded songs), the theme keeps the colours of
// the last built-in theme and the card shows no picture.
// ============================================================================
function baseTheme() {
  var id = store.get('themeBase', 'midnight'), i;
  for (i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i];
  return THEMES[0];
}
(function () { var b = baseTheme(); COLOURS.forEach(function (c) { COVER.t[c[0]] = b[c[0]]; }); })();

function hexOf(r, g, b) { return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1); }
function mixHex(a, b, t) {                // t = share of colour a
  var x = hexToRgb(a), y = hexToRgb(b);
  return hexOf(Math.round(x[0] * t + y[0] * (1 - t)), Math.round(x[1] * t + y[1] * (1 - t)), Math.round(x[2] * t + y[2] * (1 - t)));
}
function rgbToHsl(r, g, b) {              // -> [hue 0..360, saturation 0..1, lightness 0..1]
  r /= 255; g /= 255; b /= 255;
  var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, hh = 0, s = 0;
  if (d > 1e-6) {
    s = d / (1 - Math.abs(2 * l - 1));
    hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hh *= 60;
    if (hh < 0) hh += 360;
  }
  return [hh, Math.min(1, s), l];
}
function hslHex(hh, s, l) {
  var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((hh / 60) % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0;
  if (hh < 60) { r = c; g = x; } else if (hh < 120) { r = x; g = c; } else if (hh < 180) { g = c; b = x; }
  else if (hh < 240) { g = x; b = c; } else if (hh < 300) { r = x; b = c; } else { r = c; b = x; }
  return hexOf(Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255));
}

// A cover's pixels (RGBA) -> the six colours of a theme. The body takes the
// colour there is most of (colourful ones count for more than black, white and
// grey), the lamps a strong colour away from it; lightness is always set here,
// so the lettering stays readable whatever the cover.
function coverPalette(px) {
  var bins = {}, keys, i, k, o, n = 0, body = null, acc = null, best = -1;
  for (i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 128) continue;
    k = ((px[i] >> 5) << 6) | ((px[i + 1] >> 5) << 3) | (px[i + 2] >> 5);
    o = bins[k] || (bins[k] = { n: 0, r: 0, g: 0, b: 0 });
    o.n++; o.r += px[i]; o.g += px[i + 1]; o.b += px[i + 2];
    n++;
  }
  if (!n) return null;
  keys = Object.keys(bins);
  keys.forEach(function (key) {
    var q = bins[key], sc;
    q.hsl = rgbToHsl(q.r / q.n, q.g / q.n, q.b / q.n);
    sc = q.n * (0.22 + q.hsl[1]) * (q.hsl[2] > 0.1 && q.hsl[2] < 0.88 ? 1 : 0.3);
    if (sc > best) { best = sc; body = q; }
  });
  best = 0;
  keys.forEach(function (key) {
    var q = bins[key], s = q.hsl[1], l = q.hsl[2], d, sc;
    if (q === body || q.n < 2 || s < 0.28 || l < 0.2 || l > 0.88) return;
    d = Math.abs(q.hsl[0] - body.hsl[0]);
    if (d > 180) d = 360 - d;
    sc = Math.sqrt(q.n) * s * (body.hsl[1] < 0.12 ? 1 : Math.min(1, d / 90));
    if (sc > best) { best = sc; acc = q; }
  });
  var H = body.hsl[0], S0 = body.hsl[1], grey = S0 < 0.1, sb = grey ? S0 * 0.6 : Math.min(0.62, Math.max(0.28, S0));
  var out = {
    shellA: hslHex(H, sb, 0.3), shellB: hslHex(H, sb, 0.16), shellText: hslHex(H, Math.min(sb, 0.45), 0.92),
    lcdBg: hslHex(H, Math.min(sb, 0.6), 0.05)
  };
  if (grey && !acc) { out.lit = '#f1f1f4'; out.lcdFg = '#dfe0e6'; }
  else {
    out.lit = acc ? hslHex(acc.hsl[0], Math.max(0.78, acc.hsl[1]), Math.max(0.6, Math.min(0.7, acc.hsl[2]))) : hslHex(H, 0.85, 0.68);
    out.lcdFg = grey ? hslHex(acc.hsl[0], 0.6, 0.8) : hslHex(H, Math.max(0.5, Math.min(0.9, S0)), 0.77);
  }
  return out;
}

// Called whenever the playing song may have changed, with its artwork address
// (a template with {w}x{h} in it), or '' when there is none.
function coverTrack(tpl) {
  tpl = tpl || '';
  if (tpl === COVER.key) return;
  COVER.key = tpl;
  COVER.jpeg = '';
  var tok = ++COVER.tok, url, img;
  function none() { COVER.pal = null; COVER.big = ''; coverAim(); npSync(); }
  if (!/^https:\/\//.test(tpl)) { none(); return; }
  url = artUrl(tpl, 150);                // (Spotify's and SoundCloud's artwork: about 300 pixels)
  img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function () {
    if (tok !== COVER.tok) return;                       // another song since
    try {
      var c = document.createElement('canvas'), s = document.createElement('canvas'), g;
      c.width = c.height = 96;
      c.getContext('2d').drawImage(img, 0, 0, 96, 96);
      s.width = s.height = 24;
      g = s.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, 24, 24);
      COVER.pal = coverPalette(g.getImageData(0, 0, 24, 24).data);
      COVER.jpeg = (c.toDataURL('image/jpeg', 0.82).split(',')[1] || '').slice(0, 30000);
      COVER.big = url;
    } catch (e) { COVER.pal = null; COVER.jpeg = ''; COVER.big = ''; }
    coverAim();
    npSync();
  };
  img.onerror = function () { if (tok === COVER.tok) none(); };
  img.src = url;
}
// what the theme should look like for the song playing now
function coverLook() {
  var to = COVER.pal || baseTheme(), t = { id: 'cover', name: COVER.t.name, jp: COVER.t.jp, live: true };
  COLOURS.forEach(function (c) { t[c[0]] = to[c[0]]; });
  if (COVER.big) {
    t.photo = { key: 'cover', kind: 'still', fit: 'cover', size: 130, x: 50, y: 50, tint: 62, blur: 24, glass: 24,
      thumb: COVER.jpeg ? 'data:image/jpeg;base64,' + COVER.jpeg : '' };
  }
  return t;
}
// Head for those colours: at once while the theme is not in use (or nobody is
// looking), gliding over about a second while it is.
function coverAim() {
  var to = coverLook(), same = true, was = {};
  COLOURS.forEach(function (c) { was[c[0]] = COVER.t[c[0]]; if (was[c[0]] !== to[c[0]]) same = false; });
  if (to.photo) { COVER.t.photo = to.photo; USER.photos.cover = { url: COVER.big, blob: null, saved: true }; }
  else delete COVER.t.photo;
  coverSwatch(to);
  if (S.theme !== 'cover' || USER.draft || !S.seen || same) {
    COLOURS.forEach(function (c) { COVER.t[c[0]] = to[c[0]]; });
    COVER.from = COVER.to = null;
    if (S.theme === 'cover' && !USER.draft) retheme();
    return;
  }
  COVER.from = was;
  COVER.to = to;
  COVER.t0 = 0;
  applyTheme();                                          // the picture behind changes now; the colours follow
  if (!COVER.raf) COVER.raf = nextFrame(coverStep);
}
function coverStep(now) {
  COVER.raf = 0;
  if (!COVER.to) return;
  if (!COVER.t0) COVER.t0 = now;
  var k = S.seen ? Math.min(1, Math.max(0, (now - COVER.t0) / 900)) : 1, e = k * k * (3 - 2 * k), on = S.theme === 'cover' && !USER.draft;
  COLOURS.forEach(function (c) { COVER.t[c[0]] = k === 1 ? COVER.to[c[0]] : mixHex(COVER.to[c[0]], COVER.from[c[0]], e); });
  if (on) {
    applyTheme();
    vizColors();
    vzColors();
    kickViz();
    if (k === 1 || ++COVER.n % 8 === 0) notifyHost();     // the title bar follows in a few steps
  }
  if (k < 1) { COVER.raf = nextFrame(coverStep); return; }
  COVER.from = COVER.to = null;
  if (on) npSync();
}
// its key in the themes panel shows the cover and the colours of the moment
function coverSwatch(look) {
  if (!ui.coverSw) return;
  var sw = swatchFor(look || coverLook());
  ui.coverSw.replaceWith(sw);
  ui.coverSw = sw;
  sw.setAttribute('aria-pressed', S.theme === 'cover' && !USER.draft ? 'true' : 'false');
}

// ============================================================================
// Now playing, for the app
// The Windows app can do two things with the song that is playing while the
// listener is busy with something else (src\NowPlaying.cs):
//   - show a small card over whatever is in front when the song changes
//   - show the song on the listener's Discord profile
// The app says what it can do ("caps|popup,discord"); from then on the page
// tells it the settings and, on every change, the song:
//   popup|<0/1>|<corner tl/tr/bl/br>          popup|test  shows a card now
//   discord|<0/1>|<application id>
//   np|<state>|... with the fields below separated by the character 0x1F:
//      state (play / pause / stop), which song (id@place in the queue),
//      title, artist, album, length in ms, position in ms, address of the
//      cover, the theme's six colours, a small JPEG of the cover (base64)
// The app answers "discord|<state>" for the settings panel to show.
// ============================================================================
var NP = { caps: '', last: '', st: '', pos: 0, posAt: 0, dc: '', idTimer: 0, timer: 0 };
var US = '\u001f';
function npClean(s, max) { return String(s || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max || 160); }
function npId() { return /^\d{15,22}$/.test(S.discordId) ? S.discordId : ''; }

function npCaps(list) {
  NP.caps = list;
  document.documentElement.setAttribute('data-mp-caps', list.replace(/[^a-z]+/g, ' ').trim());
  npSettings();
  NP.last = '';
  npSend();
  syncPanel();
}
function npSettings() {
  if (!NP.caps) return;
  send('popup|' + (S.popup ? 1 : 0) + '|' + S.popupPos);
  send('discord|' + (S.discord && npId() ? 1 : 0) + '|' + npId());
}
// Called from wherever something about the song may have changed. The telling
// itself happens a moment later, once: a change of song arrives in pieces (the
// place in the queue, the song, its state), and the app wants the outcome.
function npSync() {
  if (HOST_KIND !== 'windows' || !NP.caps || !ui.app || NP.timer) return;
  NP.timer = setTimeout(npSend, 220);
}
function npSend() {
  clearTimeout(NP.timer);
  NP.timer = 0;
  if (HOST_KIND !== 'windows' || !NP.caps || !ui.app) return;
  var it = nowItem(), info = itemInfo(it), now = performance.now(), pos = 0;
  var st = !it ? 'stop' : S.stable === 'playing' ? 'play' : S.stable === 'paused' ? 'pause' : 'stop';
  var look = S.theme === 'cover' && !USER.draft ? (COVER.to || COVER.t) : themeNow();
  var cols = COLOURS.map(function (c) { return look[c[0]].slice(1); }).join(',');
  var art = it && /^https:\/\//.test(info.art) ? info.art.replace('{w}', 512).replace('{h}', 512).replace('{f}', 'jpg').replace('{c}', 'bb') : '';
  var jpeg = it && info.art && COVER.key === info.art ? COVER.jpeg : '';
  try { pos = Math.round((S.music.currentPlaybackTime || 0) * 1000); } catch (e) {}
  var head = [st, it ? curKey() : '', npClean(it ? info.title : ''), npClean(info.artist), npClean(info.album), Math.round(info.dur * 1000)].join(US);
  var sig = head + US + (jpeg ? 1 : 0) + US + cols;
  // the position is only worth a message when it is not where the last one
  // said it would be by now (the listener moved through the song)
  var expect = NP.pos + (NP.st === 'play' ? now - NP.posAt : 0);
  if (sig === NP.last && Math.abs(expect - pos) < 2500) return;
  NP.last = sig;
  NP.st = st;
  NP.pos = pos;
  NP.posAt = now;
  send('np|' + head + US + pos + US + npClean(art, 400) + US + cols + US + jpeg);
}
// what the settings panel says about Discord
function npDiscordText() {
  if (!S.discord) return '';
  if (!npId()) return 'PASTE THE APPLICATION ID (17 TO 20 DIGITS)';
  return NP.dc === 'on' ? 'CONNECTED TO DISCORD'
    : NP.dc === 'wait' ? 'DISCORD IS NOT RUNNING ON THIS PC'
    : NP.dc === 'bad' ? 'DISCORD DID NOT ACCEPT THAT ID'
    : NP.dc === 'err' ? 'DISCORD CANNOT BE REACHED'
    : 'CONNECTING...';
}

// ------------------------------------------------------------- services ----
// The two services (services/spotify.js, services/soundcloud.js) each bring a
// player of the shape Apple's had (services/engine.js) and their library (see
// "Library data"). SVC is the one the switch at the top is set to, S.music its
// player. Each keeps its own library, queue and song playing.
var SVCS = window.MPServices || {};
var SVC_IDS = ['spotify', 'soundcloud'].filter(function (k) { return !!SVCS[k]; });
var SVC = SVCS[store.get('service', SVC_IDS[0])] || SVCS[SVC_IDS[0]];

// -------------------------------------------------------------- playback ----
function MK() { return window.MPKit || null; }

function stateName() {
  var m = S.music, mk = MK();
  if (!m || !mk || !mk.PlaybackStates) return 'none';
  return mk.PlaybackStates[m.playbackState] || 'none';
}
function authorized() {
  try { return !!(SVC && SVC.signedIn()); } catch (e) { return false; }
}

function call(name) {
  var m = S.music;
  if (!m || typeof m[name] !== 'function') return;
  if (name === 'play' || name === 'skipToNextItem' || name === 'skipToPreviousItem' || name === 'changeToMediaAtIndex') RC.wantAt = performance.now();
  try {
    var r = m[name].apply(m, Array.prototype.slice.call(arguments, 1));
    if (r && typeof r.catch === 'function') r.catch(function () {});
  } catch (e) {}
}

function curIndex() {
  var m = S.music;
  if (!m) return -1;
  try {
    if (typeof m.nowPlayingItemIndex === 'number' && m.nowPlayingItemIndex >= 0) return m.nowPlayingItemIndex;
    if (m.queue && typeof m.queue.position === 'number') return m.queue.position;
  } catch (e) {}
  return -1;
}

function queueItems() {
  try { return (S.music && S.music.queue && S.music.queue.items) || []; } catch (e) { return []; }
}

function itemInfo(it) {
  var o = { title: 'Unknown', artist: '', album: '', dur: 0, art: '', id: '', cid: '' };
  if (!it) return o;
  try { o.title = it.title || (it.attributes && it.attributes.name) || 'Unknown'; } catch (e) {}
  try { o.artist = it.artistName || ''; } catch (e) {}
  try { o.album = it.albumName || ''; } catch (e) {}
  try { o.dur = (it.playbackDuration || 0) / 1000; } catch (e) {}
  try { o.art = it.artworkURL || (it.artwork && it.artwork.url) || ''; } catch (e) {}
  try { o.id = String(it.id || ''); } catch (e) {}
  try { o.cid = String((it.attributes && it.attributes.playParams && it.attributes.playParams.catalogId) || ''); } catch (e) {}
  return o;
}

function nowItem() {
  try { return (S.music && S.music.nowPlayingItem) || null; } catch (e) { return null; }
}

// Artwork in a size that suits px CSS pixels. Spotify's comes as a few
// addresses, biggest first ("big medium small": about 640 / 300 / 64 pixels);
// SoundCloud's is one address with the size in its name (...-large.jpg).
function artUrl(tpl, px) {
  if (!tpl) return '';
  var s = Math.round(px * Math.min(2, window.devicePixelRatio || 1));
  if (tpl.indexOf(' ') > 0) {
    var list = tpl.split(' ');
    return list[s <= 64 ? list.length - 1 : s <= 300 ? Math.min(1, list.length - 1) : 0] || list[0];
  }
  var sc = /-(large|t\d+x\d+|crop|original|small|tiny|badge|mini)\.(jpg|jpeg|png)$/;
  if (/sndcdn\.com\//.test(tpl) && sc.test(tpl))
    return tpl.replace(sc, '-' + (s <= 67 ? 't67x67' : s <= 100 ? 'large' : s <= 300 ? 't300x300' : 't500x500') + '.$2');
  return tpl.replace('{w}', s).replace('{h}', s).replace('{f}', 'jpg').replace('{c}', 'bb');
}

// Listen to both services' players (only the one the switch is set to is
// drawn), and let each service pick up where it was (signed in or not).
function hookMusic() {
  SVC_IDS.forEach(function (k) { bindMusic(SVCS[k].engine); });
  S.music = SVC.engine;
  syncSwitch();
  onState();
  refreshAll();
  onAuthChange();
  SVC_IDS.forEach(function (k) {
    var svc = SVCS[k];
    Promise.resolve(svc.init()).then(function () {
      if (svc !== SVC) return;
      onAuthChange();
      if (svc.warm) svc.warm();
    }, function (e) { dlog(k + ' did not start: ' + errText(e)); });
  });
}

function bindMusic(m) {
  if (!m || m.__mpBound) return;
  m.__mpBound = true;
  // (what the other service's player says is not drawn)
  function on(ev, fn) { try { m.addEventListener(ev, function (a) { if (S.music === m) fn(a); }); } catch (e) {} }
  on('playbackStateDidChange', onState);
  on('nowPlayingItemDidChange', onItem);
  on('playbackTimeDidChange', refreshTime);
  on('playbackTimeDidChange', clockSample);   // measure the precise clock at every tick, lyrics on screen or not
  on('playbackTimeDidChange', rcTick);        // and keep the note of where the music is (see "Coming back from a playback failure")
  on('playbackDurationDidChange', refreshTime);
  on('queueItemsDidChange', onQueue);
  on('queuePositionDidChange', function () { refreshItem(); });
  on('playbackVolumeDidChange', refreshVolume);
  on('shuffleModeDidChange', refreshModes);
  on('repeatModeDidChange', refreshModes);
  on('playbackBitrateDidChange', refreshChips);
  on('mediaPlaybackError', onPlaybackError);
  on('authorizationStatusDidChange', function () { setTimeout(onAuthChange, 300); });
}

function onQueue() {
  S.queueChangedAt = performance.now();
  rcQueue();
  clearTimeout(onQueue.t);
  onQueue.t = setTimeout(renderQueue, 80);
}

function onItem() {
  // A new track right after the queue was replaced means the listener picked
  // something to play (as opposed to the queue simply moving on by itself).
  if (performance.now() - S.queueChangedAt < 4000) S.pendingAuto = true;
  CK.have = false;      // the precise clock measures each track afresh
  CK.lastT = NaN;       // (not -1: a new song's first reading, 0, must not count as a tick)
  refreshItem();
  onState();
  lyRefresh();
  vzSongOsd();
}

function onState() {
  var name = stateName();
  var stable = S.stable;
  if (name === 'playing') stable = 'playing';
  else if (name === 'paused') stable = 'paused';
  else if (name === 'none' || name === 'stopped' || name === 'ended' || name === 'completed') stable = 'idle';

  var started = stable === 'playing' && (S.stable !== 'playing' || S.pendingAuto);
  S.stable = stable;
  if (name === 'playing') {
    S.pendingAuto = false;
    if (started && S.autoCompact && S.mode !== 'compact') setMode('compact');
  }
  refreshState();
}

// ============================================================================
// Coming back from a playback failure
//
// Full songs are copy-protected. In the Windows app their keys are held by
// Windows' own PlayReady, outside the page. Now and then, after an hour or
// two of music (and more often with a game running), Apple's player reports
// "MEDIA_KEY ... The session is already closed" or a plain "Playback Error",
// or sits at "loading" - and then nothing plays again until the app is closed
// and opened. What the log shows fits the keys being taken back underneath
// the player (the engine closes every key session when the graphics device
// is reset), with the player carrying on with sessions that are gone. That
// is not proven: rcSysClosed and the "media error" line below are there to
// show it the next time.
//
// Closing and opening the app has cured it every time. The nearest thing the
// skin can do by itself is a fresh page, so it does that (whether a fresh
// page is always enough has not been seen yet either; the log will say).
// While music plays it keeps a note of what is queued, which song, and how
// far into it. After a failure:
//   1. a moment's wait: the player may have carried on by itself
//   2. the same queue is handed to the player again, at the same spot
//   3. if that fails too, or Windows was seen taking the keys away: the page
//      is loaded again (Windows app) and carries on from the note, left in
//      sessionStorage for the new page
// At most one of each in a row; after that the message stays up and it is the
// listener's turn. Failures that trying again cannot change (another device
// is playing, the subscription, a song that is not available) are only
// reported, and so is one that arrives while nothing was playing.
// ============================================================================
var RC = {
  ids: [],                        // the queue as song ids ('' where it holds something else), kept from the last time it was not empty
  id: '', pos: -1, t: 0,          // the song last heard playing, where in the queue, and how far in (seconds)
  at: -1e9,                       // when that was (performance.now())
  wantAt: -1e9,                   // when the listener last asked for music
  busyAt: 0,                      // since when the player has been "loading" with nothing playing
  healthyAt: 0,                   // since when music has been playing without trouble
  streak: false,                  // a try is on record (see rcStreak)
  sysClosedAt: 0, sysClosedWhy: '',   // Windows closed a key session by itself
  asked: [],                      // the last few times the player asked Apple for a song or for its key (for the log)
  working: 0,                     // a try is under way (its number)
  timer: 0,
  note: null,                     // left by the page before this one: carry on with it (see rcBoot)
  reload: function () { location.reload(); }
};
var RC_SONG = /^(i\.[\w-]+|\d{3,})$/;

// What has been tried since music last played well: { n: tries, hard: the
// page was loaded again, at }. Kept in sessionStorage so that it is still
// known after such a reload; forgotten after ten minutes, or 90 seconds of
// music.
function rcStreak() {
  var s = null;
  try { s = JSON.parse(sessionStorage.getItem('mp.rc') || 'null'); } catch (e) {}
  if (!s || typeof s.at !== 'number' || !(Date.now() - s.at < 600000)) s = { n: 0, hard: false, at: 0 };
  return s;
}
function rcStreakSet(s) {
  RC.streak = !!s;
  RC.healthyAt = 0;
  try { if (s) sessionStorage.setItem('mp.rc', JSON.stringify(s)); else sessionStorage.removeItem('mp.rc'); } catch (e) {}
}

function rcSongId(it) {
  var id = '', type = '';
  try { id = String(it.id || ''); type = String(it.type || ''); } catch (e) {}
  if (type && !/song/i.test(type)) return '';      // a music video, a radio station: not something a list of songs can hold
  return RC_SONG.test(id) ? id : '';
}
function rcIds(items) {
  var ids = [];
  for (var i = 0; i < items.length; i++) ids.push(rcSongId(items[i]));
  return ids;
}
// the queue changed (not written down while it is empty: a failure may be what emptied it)
function rcQueue() {
  var items = queueItems();
  if (items.length) RC.ids = rcIds(items);
}
// music is playing: where it is
function rcTick() {
  var m = S.music, it = nowItem(), t = 0;
  if (!m || !it || stateName() !== 'playing') return;
  try { t = m.currentPlaybackTime || 0; } catch (e) {}
  if (!(t > 0)) return;
  RC.id = String(it.id || '');
  RC.pos = curIndex();
  RC.t = t;
  RC.at = performance.now();
  RC.busyAt = 0;
  if (!RC.streak) return;
  if (!RC.healthyAt) RC.healthyAt = RC.at;
  else if (RC.at - RC.healthyAt > 90000) rcStreakSet(null);     // all is well again: the next failure is a new one
}
// Was music playing, or being asked for, just now?
function rcWanted() {
  var last = Math.max(RC.at, RC.wantAt);
  return last > S.haltAt && performance.now() - last < 60000;
}

// What to carry on with: a stretch of the queue around the song concerned
// (some songs back, QUEUE_CHUNK onwards), which of them it is, and how far in.
// null: nothing that can be handed back (an empty queue, a radio station).
function rcNote() {
  var m = S.music, items = queueItems(), ids = items.length ? rcIds(items) : RC.ids, pos = items.length ? curIndex() : RC.pos, t = 0, i;
  if (!(pos >= 0 && pos < ids.length)) pos = RC.id ? ids.indexOf(RC.id) : -1;     // (the player has lost its place)
  if (pos < 0 || !ids[pos]) return null;
  if (ids[pos] === RC.id) {
    t = RC.t;
    try { if (String(nowItem().id) === RC.id && m.currentPlaybackTime > t) t = m.currentPlaybackTime; } catch (e) {}
  }
  var list = [], at = -1;
  for (i = Math.max(0, pos - 30); i < ids.length && list.length < QUEUE_CHUNK + 30; i++) {
    if (!ids[i]) continue;
    if (i === pos) at = list.length;
    list.push(ids[i]);
  }
  var note = { ids: list, pos: at, id: ids[pos], t: Math.floor(t), shuffle: shuffleOn(), repeat: null };
  try { if (typeof m.repeatMode === 'number') note.repeat = m.repeatMode; } catch (e) {}
  return note;
}

// One line of circumstances for the log, to go with a failure.
function rcDetail(code) {
  var s = [], t = 0, now = performance.now(), i;
  try { t = S.music.currentPlaybackTime || 0; } catch (e) {}
  s.push('code ' + (code || '-'), 'state ' + stateName(), Math.round(t) + ' s in', 'song ' + (RC.id || '-'),
    RC.at > 0 ? 'last heard ' + Math.round((now - RC.at) / 1000) + ' s ago' : 'nothing heard yet',
    S.seen ? 'window in sight' : 'window out of sight', navigator.onLine ? 'online' : 'OFFLINE');
  if (RC.sysClosedAt) s.push('the system closed a key session ' + Math.round((now - RC.sysClosedAt) / 1000) + ' s ago (' + RC.sysClosedWhy + ')');
  try {
    var els = document.querySelectorAll('audio, video');
    for (i = 0; i < els.length; i++) {
      if (els[i].error) s.push(els[i].tagName.toLowerCase() + ' error ' + els[i].error.code + ' ' + String(els[i].error.message || '').slice(0, 110));
    }
  } catch (e) {}
  return s.join(', ');
}
function rcHint() {
  return HOST_KIND === 'windows' ? ' - CLOSE THE APP AND OPEN IT AGAIN' : ' - CLOSE THE PLAYER AND OPEN IT AGAIN';
}
// And a second line: when the player last asked Apple for a song and for a
// key (a key is asked for again every so often while a song plays). Only
// looked at, through the browser's own list of requests - nothing is changed.
function rcAsked() {
  var now = performance.now();
  return 'asked Apple for: ' + RC.asked.map(function (a) {
    return a.what + ' ' + Math.round((now - a.at) / 1000) + ' s ago' + (a.status ? ' (' + a.status + ')' : '') + (a.took > 3000 ? ' took ' + Math.round(a.took / 1000) + ' s' : '');
  }).join(', ');
}
try {
  new PerformanceObserver(function (list) {
    list.getEntries().forEach(function (e) {
      var hit = /\/(webPlayback|acquireWebPlaybackLicense)(\?|$)/.exec(String(e.name || ''));
      if (!hit) return;
      RC.asked.push({ what: hit[1] === 'webPlayback' ? 'song' : 'key', at: e.startTime, took: Math.round(e.duration), status: e.responseStatus || 0 });
      if (RC.asked.length > 6) RC.asked.shift();
    });
  }).observe({ type: 'resource', buffered: true });
} catch (e) {}

// Playback failures, said on the song line. (The Apple Music player also
// tries to get the music back by itself after one - made for the ways Apple's
// player fails. Here each service looks after its own: SoundCloud skips a
// song that will not play, and Spotify's failures are about the account or
// the device, which trying again would not mend. So this only says so.)
function onPlaybackError(e) {
  var what = errText(e);
  dlog('playback error: ' + what);
  notice('PLAYBACK ERROR: ' + what);
}

// A little after a failure: has the player carried on by itself (it skips a
// song it cannot play), is it still at it, or has it given up?
function rcAfterError(what, fresh, n) {
  var name = stateName();
  if (name === 'playing' && performance.now() - RC.at < 1200) return;              // music: nothing to do
  var busy = name === 'playing' || name === 'loading' || name === 'waiting' || name === 'stalled' || name === 'seeking';
  if (busy && n < 7) { RC.timer = setTimeout(function () { rcAfterError(what, fresh, n + 1); }, 1000); return; }   // a few seconds more
  rcNext(what, fresh);
}

// The next thing to try, if there is one left.
function rcNext(what, fresh) {
  var s = rcStreak(), note = rcWanted() ? rcNote() : null;
  var soft = s.n === 0 && !(fresh && HOST_KIND === 'windows');
  var hard = HOST_KIND === 'windows' && !s.hard && !USER.draft;      // (not from under an open theme editor: what is in it would be lost)
  clearTimeout(RC.timer);
  RC.working = 0;
  if (!note) return false;                                           // nothing that can be handed back: the message is all
  if (!soft && !hard) {
    dlog('recover: tried what there is to try, leaving it');
    notice('PLAYBACK ERROR: ' + what + rcHint());
    return false;
  }
  s.n++;
  s.at = Date.now();
  if (soft) {
    rcStreakSet(s);
    dlog('recover: handing the queue to the player again (' + note.ids.length + ' songs, number ' + (note.pos + 1) + ', ' + note.t + ' s in)');
    notice('PLAYBACK STOPPED - STARTING IT AGAIN');
    rcStart(note, false, what);
    return true;
  }
  s.hard = true;
  note.at = Date.now();
  note.mode = S.mode === 'compact' ? 'compact' : 'full';
  note.auth = authorized();
  note.why = String(what).slice(0, 120);
  if (B.view && /^(recent|songs|albums|artists|playlist|album|artist)$/.test(B.view.kind)) note.view = B.view;
  try { sessionStorage.setItem('mp.resume', JSON.stringify(note)); }
  catch (e) { notice('PLAYBACK ERROR: ' + what + rcHint()); return false; }
  rcStreakSet(s);
  dlog('recover: loading the page again to carry on (' + note.ids.length + ' songs, number ' + (note.pos + 1) + ', ' + note.t + ' s in)');
  notice('PLAYBACK STOPPED - STARTING THE PLAYER AGAIN, ONE MOMENT');
  RC.working = -1;
  setTimeout(function () { RC.reload(); }, 600);
  return true;
}

// Hand the note's songs to the player and see that music comes of it.
// back: on a page that was loaded again for this.
function rcStart(note, back, what) {
  var m = S.music, mk = MK(), run = RC.working = (rcStart.n = (rcStart.n || 0) + 1), n = 0, since = performance.now();
  if (!m) { RC.working = 0; return; }
  if (back) {
    // (a fresh page starts with the player's own settings for these)
    try { if (typeof note.repeat === 'number') m.repeatMode = note.repeat; } catch (e) {}
    try { if (mk && mk.PlayerShuffleMode) m.shuffleMode = note.shuffle ? mk.PlayerShuffleMode.songs : mk.PlayerShuffleMode.off; } catch (e) {}
    refreshModes();
  }
  startQueue({ songs: note.ids, startWith: note.pos });
  var tok = S.startTok, started = 0;
  S.starting.then(function () { started = performance.now(); });
  (function look() {
    if (RC.working !== run) return;                                          // failed meanwhile: dealt with elsewhere
    if (S.startTok !== tok || S.haltAt > since) { RC.working = 0; return; }  // the listener has done something else
    var it = nowItem(), t = 0;
    try { t = m.currentPlaybackTime || 0; } catch (e) {}
    // (music heard after the queue was handed over: not what was left of the old one)
    if (started && stateName() === 'playing' && it && RC.at > started) {
      RC.working = 0;
      if (String(it.id) === note.id && note.t > 5 && t < note.t - 3) call('seekToTime', note.t);
      dlog('recover: playing again' + (String(it.id) === note.id ? '' : ' (another song: ' + it.id + ')'));
      notice(back ? 'THE PLAYER WAS STARTED AGAIN - CARRYING ON' : 'PLAYING AGAIN', true);
      return;
    }
    if (++n < (back ? 120 : 60)) { setTimeout(look, 250); return; }
    dlog('recover: nothing playing after ' + Math.round(n / 4) + ' s, state ' + stateName());
    rcNext(what || 'Playback did not start', true);
  })();
}

// A page that was loaded again to get the music back: carry on once Apple's
// player is there (and signed in, if it was).
function rcBoot() {
  var note = RC.note, n = 0;
  if (!note) return;
  RC.note = null;
  RC.working = -1;
  (function ready() {
    if (!S.music) { RC.working = 0; return; }
    if (note.auth && !authorized()) {
      if (++n < 80) { setTimeout(ready, 250); return; }
      RC.working = 0;
      dlog('recover: not signed in on the new page, leaving it');
      notice('PLAYBACK ERROR: ' + (note.why || 'Playback Error') + rcHint());
      return;
    }
    RC.wantAt = performance.now();
    dlog('recover: page loaded again, carrying on');
    rcStart(note, true, note.why);
  })();
}

// "Loading" for 20 seconds with nothing playing is the same failure without
// a message. (Checked once a second.)
function rcWatch() {}                   // (no getting the music back by itself: see onPlaybackError)

// Key sessions: note when one is closed that the page did not close itself.
function rcSysClosed(why) {
  RC.sysClosedAt = performance.now();
  RC.sysClosedWhy = String(why || 'no reason given').slice(0, 40);
  dlog('copy protection: the system closed a key session (' + RC.sysClosedWhy + '), state ' + stateName());
}
(function () {
  try {
    var P = window.MediaKeySession && window.MediaKeySession.prototype;
    if (!P || typeof P.generateRequest !== 'function' || typeof P.close !== 'function') return;
    var gen = P.generateRequest, shut = P.close, seen = new WeakSet(), ours = new WeakSet();
    P.generateRequest = function () {
      var s = this;
      try {
        if (!seen.has(s)) {
          seen.add(s);
          s.closed.then(function (why) { if (!ours.has(s)) rcSysClosed(why); }, function () {});
        }
      } catch (e) {}
      return gen.apply(this, arguments);
    };
    P.close = function () {
      try { ours.add(this); } catch (e) {}
      return shut.apply(this, arguments);
    };
  } catch (e) {}
})();
// what the audio element itself says went wrong (the engine's own words)
document.addEventListener('error', function (e) {
  var el = e.target, err = null;
  try { err = el && (el.tagName === 'AUDIO' || el.tagName === 'VIDEO') && !(el.classList && (el.classList.contains('mp-bgv') || el.classList.contains('mp-ar-pic'))) && el.error; } catch (x) {}
  if (err) dlog('media error ' + err.code + ': ' + String(err.message || '').slice(0, 220));
}, true);

// the note left by the page before this one, if this is such a reload
(function () {
  var n = null, i;
  try {
    n = JSON.parse(sessionStorage.getItem('mp.resume') || 'null');
    sessionStorage.removeItem('mp.resume');
    RC.streak = !!sessionStorage.getItem('mp.rc');
  } catch (e) {}
  if (!n || typeof n !== 'object' || !Array.isArray(n.ids) || !n.ids.length || n.ids.length > QUEUE_CHUNK + 30) return;
  if (!(Date.now() - n.at < 120000) || !(n.pos >= 0 && n.pos < n.ids.length) || n.pos !== Math.floor(n.pos)) return;
  for (i = 0; i < n.ids.length; i++) if (typeof n.ids[i] !== 'string' || !RC_SONG.test(n.ids[i])) return;
  n.id = n.ids[n.pos];
  n.t = n.t > 0 && n.t < 86400 ? Math.floor(n.t) : 0;
  n.shuffle = !!n.shuffle;
  n.auth = !!n.auth;
  n.why = typeof n.why === 'string' ? n.why.slice(0, 120) : '';
  var v = n.view;
  n.view = (v && typeof v === 'object' && /^(recent|songs|albums|artists|playlist|album|artist)$/.test(v.kind)) ? v : null;
  RC.note = n;
  if (n.mode === 'compact') S.mode = 'compact';      // (and the app's window still has that shape)
})();

// A temporary message: on the browser's notice line and on the song line.
// good: news rather than trouble (shown for a shorter time, without the "!").
function notice(text, good) {
  if (ui.toast) {
    ui.toastText.textContent = text;
    ui.toast.setAttribute('data-kind', good ? 'ok' : 'warn');
    ui.toast.setAttribute('data-show', '1');
  }
  setMarquee((good ? '' : '! ') + text, true);
  clearTimeout(S.notice);
  S.notice = setTimeout(function () {
    S.notice = 0;
    if (ui.toast) ui.toast.setAttribute('data-show', '0');
    S.marquee = null;
    refreshItem();
  }, good ? 6000 : 9000);
}

// ----------------------------------------------------------- deck: refresh ---
function refreshState() {
  if (!ui.app) return;
  var name = stateName();
  var st = name === 'playing' ? 'play'
    : name === 'paused' ? 'pause'
    : (name === 'loading' || name === 'waiting' || name === 'stalled' || name === 'seeking') ? 'load'
    : 'stop';
  if (S.state !== st || ui.app.getAttribute('data-state') !== st) {
    S.state = st;
    ui.app.setAttribute('data-state', st);
    ui.chipState.textContent = JP_STATE[st];
    kickViz();
    vzKick();
    lyKick();
  }
  npSync();
}

function refreshTime() {
  if (!ui.app) return;
  var m = S.music, t = 0, d = 0, idle = true;
  if (m) {
    try { t = m.currentPlaybackTime || 0; d = m.currentPlaybackDuration || 0; idle = !m.nowPlayingItem; } catch (e) {}
  }
  if (S.dragSeek !== null) t = S.dragSeek * d;
  var text = idle ? '--:--' : (S.remaining && d ? '-' + clock(Math.max(0, d - t)) : clock(t));
  if (ui.time.textContent !== text) ui.time.textContent = text;
  if (S.dragSeek === null) setSlider(ui.seek, d ? t / d : 0);
  ui.seek.setAttribute('data-disabled', idle || !d ? '1' : '0');
  ui.seek.setAttribute('aria-valuetext', fmt(t) + ' of ' + fmt(d));
  if (S.dragSeek === null) npSync();
}

function refreshItem() {
  if (!ui.app) return;
  var m = S.music, it = null;
  try { it = m && m.nowPlayingItem; } catch (e) {}
  var text, info = itemInfo(it);
  if (it) {
    var idx = curIndex();
    text = (idx >= 0 ? (idx + 1) + '. ' : '') + (info.artist ? info.artist + ' - ' : '') + info.title +
           (info.dur ? ' (' + fmt(info.dur) + ')' : '');
  } else {
    text = 'Nothing playing - pick a song or a playlist from your library';
  }
  if (!S.notice || !ui.toast || ui.toast.getAttribute('data-show') !== '1') setMarquee(text);
  ui.album.textContent = it ? info.album : '';

  var art = it && info.art ? artUrl(info.art, 80) : (__MP_ICON || '');
  if (ui.art.getAttribute('src') !== art) {
    if (art) ui.art.setAttribute('src', art); else ui.art.removeAttribute('src');
  }
  ui.art.setAttribute('data-empty', it && info.art ? '0' : '1');
  ui.art.style.visibility = art ? 'visible' : 'hidden';
  if (ui.chipAdd) ui.chipAdd.hidden = !it;
  coverTrack(it ? info.art : '');

  send('title|' + (it ? info.title + (info.artist ? ' - ' + info.artist : '') : ''));
  refreshChips();
  // bring the playing song into view in the queue only when it changed - not
  // every time this runs (a notice ending, say), which would undo the
  // listener's own scrolling
  var key = curKey();
  markCurrent(key !== S.itemKey);
  S.itemKey = key;
  refreshTime();
  markBrowserCurrent();
}

function refreshChips() {
  if (!ui.app) return;
  var m = S.music, kbps = '', pos = '';
  try { if (m && m.nowPlayingItem && m.bitrate) kbps = m.bitrate + ' KBPS'; } catch (e) {}
  var n = queueItems().length, idx = curIndex();
  if (n && idx >= 0) pos = 'TRACK ' + (idx + 1) + '/' + n;
  ui.chipKbps.textContent = kbps;
  ui.chipPos.textContent = pos;
}

function refreshVolume() {
  if (!ui.app || !S.music) return;
  try {
    var pos = posFromVol(S.music.volume || 0);
    setSlider(ui.vol, pos);
    ui.vol.title = 'Volume ' + Math.round(pos * 100) + '%  (scroll over it for fine steps)';
  } catch (e) {}
}

function refreshModes() {
  if (!ui.app) return;
  var m = S.music, mk = MK(), shuffle = false, repeat = 'none';
  try {
    if (m && mk) {
      // (held: switched off for a moment while a picked song starts, see startNow)
      shuffle = S.shuffleHeld || (!!mk.PlayerShuffleMode && m.shuffleMode !== mk.PlayerShuffleMode.off);
      if (mk.PlayerRepeatMode) repeat = mk.PlayerRepeatMode[m.repeatMode] || 'none';
    }
  } catch (e) {}
  ui.shuffle.setAttribute('data-on', shuffle ? '1' : '0');
  ui.shuffle.setAttribute('aria-pressed', shuffle ? 'true' : 'false');
  ui.repeat.setAttribute('data-on', repeat === 'none' ? '0' : '1');
  ui.repeat.setAttribute('aria-pressed', repeat === 'none' ? 'false' : 'true');
  ui.repeatLabel.textContent = repeat === 'one' ? 'REPEAT 1' : repeat === 'all' ? 'REPEAT ALL' : 'REPEAT';
}

function refreshAll() {
  refreshState();
  renderQueue();
  refreshItem();
  refreshVolume();
  refreshModes();
}

// The song line scrolls only when it does not fit.
function setMarquee(text, force) {
  if (!ui.marqueeIn) return;
  if (!force && S.marquee === text) return;
  S.marquee = text;
  var inner = ui.marqueeIn, first = h('span', { text: text });
  inner.classList.remove('scroll');
  inner.replaceChildren(first);
  if (!deckShown()) return;
  nextFrame(function () {
    if (S.marquee !== text || first.offsetWidth <= ui.marquee.clientWidth - 4) return;
    var gap = '   ***   ';
    inner.appendChild(h('span', { text: gap }));
    inner.appendChild(h('span', { text: text }));
    inner.appendChild(h('span', { text: gap }));
    inner.style.setProperty('--mp-dur', Math.max(9, (text.length + gap.length) * 0.24).toFixed(1) + 's');
    inner.classList.add('scroll');
  });
}

// ------------------------------------------------------------------ queue ----
function renderQueue() {
  if (!ui.app) return;
  var items = queueItems(), list = ui.list;
  if (!items.length) {
    list.replaceChildren(h('div', { class: 'mpc-empty' },
      h('div', { text: 'The queue is empty. Play a song, album or playlist from your library and it shows up here.' })));
    ui.count.textContent = '';
    ui.total.textContent = '0曲';
    refreshChips();
    return;
  }
  var keep = list.scrollTop, frag = document.createDocumentFragment(), total = 0, max = Math.min(items.length, 3000);
  for (var i = 0; i < max; i++) {
    var info = itemInfo(items[i]);
    total += info.dur;
    frag.appendChild(h('div', { class: 'mpc-row', 'data-i': String(i), role: 'option' },
      h('span', { class: 'n', text: (i + 1) + '.' }),
      h('span', { class: 't', text: (info.artist ? info.artist + ' - ' : '') + info.title }),
      h('span', { class: 'd', text: info.dur ? fmt(info.dur) : '' })));
  }
  list.replaceChildren(frag);
  ui.count.textContent = items.length + (items.length === 1 ? ' TRACK' : ' TRACKS');
  ui.total.textContent = items.length + '曲 / ' + fmt(total);     // 曲 = songs
  refreshChips();
  // a new queue, or a new song playing: show it; songs added or moved: stay
  // where the listener was looking
  var key = curKey();
  if (key !== S.queueKey) { S.queueKey = key; markCurrent(true); }
  else { list.scrollTop = keep; markCurrent(false); }
}

// which song is playing, and where in the queue
function curKey() {
  var it = nowItem();
  return it ? String(it.id) + '@' + curIndex() : '';
}

function markCurrent(scroll) {
  if (!ui.list) return;
  var idx = curIndex(), rows = ui.list.children, old = ui.list.querySelector('.mpc-row[data-cur="1"]');
  var row = idx >= 0 && rows[idx] && rows[idx].classList.contains('mpc-row') ? rows[idx] : null;
  if (old && old !== row) old.removeAttribute('data-cur');
  if (row) {
    row.setAttribute('data-cur', '1');
    if (scroll && deckShown() && S.showPl) {
      try { row.scrollIntoView({ block: 'nearest' }); } catch (e) {}
    }
  }
}

function onListClick(e) {
  var row = e.target.closest && e.target.closest('.mpc-row');
  if (!row) return;
  var prev = ui.list.querySelector('.mpc-row[data-sel="1"]');
  if (prev) prev.removeAttribute('data-sel');
  row.setAttribute('data-sel', '1');
  if (e.type === 'dblclick') call('changeToMediaAtIndex', parseInt(row.getAttribute('data-i'), 10));
}

// ---------------------------------------------------------------- sliders ----
function setSlider(el, v) {
  v = clamp01(v || 0);
  el._v = v;
  el.style.setProperty('--v', v.toFixed(4));
  el.setAttribute('aria-valuenow', String(Math.round(v * 100)));
}

function makeSlider(label, onInput, onCommit) {
  var el = h('div', {
    class: 'mp-slider', role: 'slider', tabindex: '0', 'aria-label': label,
    'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0'
  }, h('div', { class: 'mp-slider-fill' }), h('div', { class: 'mp-slider-thumb mp-key' }));
  var dragging = false;

  function ratioAt(e) {
    var r = el.getBoundingClientRect();
    var thumb = parseFloat(getComputedStyle(el).getPropertyValue('--thumb')) || 28;
    return clamp01((e.clientX - r.left - thumb / 2) / Math.max(1, r.width - thumb));
  }
  function disabled() { return el.getAttribute('data-disabled') === '1'; }

  el.addEventListener('pointerdown', function (e) {
    if (e.button !== 0 || disabled()) return;
    dragging = true;
    try { el.setPointerCapture(e.pointerId); } catch (x) {}
    var v = ratioAt(e);
    setSlider(el, v);
    onInput(v);
    e.preventDefault();
  });
  el.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var v = ratioAt(e);
    setSlider(el, v);
    onInput(v);
  });
  function end(e) {
    if (!dragging) return;
    dragging = false;
    try { el.releasePointerCapture(e.pointerId); } catch (x) {}
    if (onCommit) onCommit(el._v || 0);
  }
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  // the drag can also end without either (alt-tab in the middle of it): without
  // this the seek bar would stay stuck on the dragged position
  el.addEventListener('lostpointercapture', end);
  el.addEventListener('keydown', function (e) {
    var step = (e.key === 'ArrowRight' || e.key === 'ArrowUp') ? 0.05
      : (e.key === 'ArrowLeft' || e.key === 'ArrowDown') ? -0.05 : 0;
    if (!step || disabled()) return;
    e.preventDefault();
    e.stopPropagation();
    var v = clamp01((el._v || 0) + step);
    setSlider(el, v);
    onInput(v);
    if (onCommit) onCommit(v);
  });
  return el;
}

function seekTo(ratio) {
  var m = S.music, d = 0;
  try { d = (m && m.currentPlaybackDuration) || 0; } catch (e) {}
  if (d) call('seekToTime', Math.min(d - 0.5, Math.max(0, ratio * d)));
  // keep showing the dragged position until the player reports the new time
  setTimeout(function () { S.dragSeek = null; refreshTime(); }, 350);
}

function seekBy(seconds) {
  var m = S.music;
  if (!m) return;
  try {
    var d = m.currentPlaybackDuration || 0, t = m.currentPlaybackTime || 0;
    if (d) call('seekToTime', Math.min(d - 0.5, Math.max(0, t + seconds)));
  } catch (e) {}
}

function setVolume(v) {
  if (!S.music) return;
  try { S.music.volume = clamp01(v); } catch (e) {}
}

// The volume slider follows loudness, not signal strength: the player's volume
// is the cube of the slider position. Ears hear on a curve, so a straight
// slider is nearly full loudness from half way up and crams every quiet level
// into its first few millimetres. With the curve, half way is about a quarter
// as loud (-18 dB) and the quiet end gets most of the travel.
function volFromPos(x) { x = clamp01(x); return x * x * x; }
function posFromVol(v) { return Math.pow(clamp01(v), 1 / 3); }
function setVolumePos(x) { setVolume(volFromPos(x)); }
function nudgeVolume(d) {
  var v = 0;
  try { v = (S.music && S.music.volume) || 0; } catch (e) {}
  setVolumePos(posFromVol(v) + d);
}

// -------------------------------------------------------------- level bars ---
// The small spectrum on the clock display. It shows the same sound analysis
// the visualizer uses (see "Sound" below).
var viz = { raf: 0, n: 22, last: 0, fg: '#fff', hot: '#fff', off: '#222' };
viz.cur = new Float32Array(viz.n);
viz.peak = new Float32Array(viz.n);
viz.tgt = new Float32Array(viz.n);

function vizColors() {
  var t = themeNow();
  viz.fg = t.lcdFg;
  viz.hot = mix('#ffffff', t.lcdFg, 0.55);
  viz.off = mix(t.lcdFg, t.lcdBg, 0.13);
}

function kickViz() {
  if (!viz.raf && deckShown() && S.seen && ui.viz) viz.raf = nextFrame(vizFrame);
}

function vizFrame(now) {
  viz.raf = 0;
  var c = ui.viz, dpr = drawWin().devicePixelRatio || 1;
  var w = Math.round(c.clientWidth * dpr), ht = Math.round(c.clientHeight * dpr);
  if (!deckShown() || !S.seen || !w || !ht) { viz.last = 0; return; }
  if (c.width !== w || c.height !== ht) { c.width = w; c.height = ht; }

  var dt = viz.last ? Math.min(64, now - viz.last) : 16;
  viz.last = now;
  var playing = S.state === 'play', n = viz.n, i;

  if (playing) auWant(now);
  auFrame(now);
  for (i = 0; i < n; i++) {
    // each bar shows the loudest point of its slice of the spectrum
    var a = 6 + Math.floor(i * 240 / n), b = 6 + Math.floor((i + 1) * 240 / n), top = 0, j;
    for (j = a; j < b; j++) if (AU.spec[j] > top) top = AU.spec[j];
    viz.tgt[i] = clamp01(top * 1.04);
  }

  var energy = 0;
  for (i = 0; i < n; i++) {
    var diff = viz.tgt[i] - viz.cur[i];
    viz.cur[i] = clamp01(viz.cur[i] + diff * Math.min(1, (diff > 0 ? 0.7 : 0.3) * dt / 16.7));
    viz.peak[i] = Math.max(viz.cur[i], viz.peak[i] - 0.00055 * dt);
    energy += viz.cur[i] + viz.peak[i];
  }

  var g = c.getContext('2d');
  g.clearRect(0, 0, w, ht);
  var gap = Math.max(1, Math.round(1.5 * dpr));
  var bw = (w - gap * (n - 1)) / n;
  var x, bwi, moving = false;

  if (S.meter === 'scope') {
    // the waveform itself, as on an oscilloscope
    var wl = AU.waveL, wr = AU.waveR, mid = ht / 2, amp = ht * 0.48, v, top2 = 0;
    g.fillStyle = viz.off;
    g.fillRect(0, Math.round(mid), w, Math.max(1, Math.round(dpr)));
    g.beginPath();
    for (i = 0; i < 256; i++) {
      v = (wl[i * 2] + wr[i * 2]) * 0.5;
      if (v > top2) top2 = v; else if (-v > top2) top2 = -v;
      v = mid - Math.max(-1, Math.min(1, v * 3)) * amp;
      if (i) g.lineTo(i * w / 255, v); else g.moveTo(0, v);
    }
    g.strokeStyle = viz.fg;
    g.lineWidth = Math.max(1, 1.4 * dpr);
    g.lineJoin = 'round';
    g.shadowColor = viz.fg;
    g.shadowBlur = 4 * dpr;
    g.stroke();
    g.shadowBlur = 0;
    moving = top2 > 0.004;
  } else if (S.meter === 'classic') {
    // solid bars that run from green through yellow to red, with falling caps
    if (!viz.grad || viz.gradH !== ht) {
      viz.grad = g.createLinearGradient(0, ht, 0, 0);
      viz.grad.addColorStop(0, '#16860a');
      viz.grad.addColorStop(0.3, '#2fce12');
      viz.grad.addColorStop(0.58, '#d8de28');
      viz.grad.addColorStop(0.8, '#d67a04');
      viz.grad.addColorStop(1, '#ef3110');
      viz.gradH = ht;
    }
    var step = Math.max(1, Math.round(2 * dpr)), cap = Math.max(1, Math.round(1.5 * dpr)), bh, py;
    for (i = 0; i < n; i++) {
      x = Math.round(i * (bw + gap)); bwi = Math.max(1, Math.round(bw));
      bh = Math.round(viz.cur[i] * ht / step) * step;          // in steps, like the rows of an old display
      if (bh > 0) { g.fillStyle = viz.grad; g.fillRect(x, ht - bh, bwi, bh); }
      py = Math.round(viz.peak[i] * ht / step) * step;
      if (viz.peak[i] > 0.03) { g.fillStyle = '#c9c9cf'; g.fillRect(x, Math.max(0, ht - py - cap), bwi, cap); }
    }
  } else {
    // rows of lamps in the theme's own ink
    var seg = Math.max(2, Math.round(3 * dpr)), segGap = Math.max(1, Math.round(dpr));
    var rows = Math.max(1, Math.floor((ht + segGap) / (seg + segGap)));
    for (i = 0; i < n; i++) {
      x = Math.round(i * (bw + gap)); bwi = Math.max(1, Math.round(bw));
      var lit = Math.round(viz.cur[i] * rows);
      for (var r = 0; r < rows; r++) {
        g.fillStyle = r < lit ? (r >= rows * 0.72 ? viz.hot : viz.fg) : viz.off;
        g.fillRect(x, ht - (r + 1) * (seg + segGap) + segGap, bwi, seg);
      }
      if (viz.peak[i] > 0.03) {
        var pr = Math.min(rows - 1, Math.round(viz.peak[i] * rows));
        g.fillStyle = viz.hot;
        g.fillRect(x, ht - (pr + 1) * (seg + segGap) + segGap, bwi, Math.max(1, Math.round(seg / 2)));
      }
    }
  }
  if (playing || energy > 0.02 || moving) viz.raf = nextFrame(vizFrame);
  else viz.last = 0;
}

// Click the small display to change what it shows.
var METERS = [['led', 'LAMPS'], ['classic', 'CLASSIC BARS'], ['scope', 'SCOPE']];
function meterNext() {
  var at = 0, i;
  for (i = 0; i < METERS.length; i++) if (METERS[i][0] === S.meter) at = i;
  at = (at + 1) % METERS.length;
  S.meter = METERS[at][0];
  store.set('meter', S.meter);
  meterTitle();
  kickViz();
}
function meterTitle() {
  var name = 'LAMPS', i;
  for (i = 0; i < METERS.length; i++) if (METERS[i][0] === S.meter) name = METERS[i][1];
  if (ui.viz) ui.viz.title = 'Showing: ' + name + '. Click to change (lamps, classic bars, scope)';
}

// ============================================================================
// Sound
// What the app is playing, as numbers the displays can draw.
//
// The browser extension listens to what this window plays (background.js,
// offscreen.js) and, for as long as the page keeps asking ("tap|1"), sends the
// newest stretch about 60 times a second:
//     pcm|<base64>   8 bytes: frames captured so far, then 1024 stereo frames
//                    of 16-bit samples (left, right, left, right ...)
// From that this section keeps the spectrum (256 points spread evenly over
// pitch), its peaks, a steady stretch of the waveform, how strong bass / mid /
// treble are, and a pulse on every beat.
//
// When no sound arrives while a song is playing (the browser would not let
// the extension listen, volume at zero) a built-in tune stands in so the
// displays keep moving. AU.mode says which it is: live | demo | idle.
// ============================================================================
var AU = {
  rate: 44100,
  N: 2048,                       // samples per analysis
  ringL: new Float32Array(8192), ringR: new Float32Array(8192), pos: 0,
  total: -1,                     // frame counter of the last message
  lastMsg: -1e9, lastLoud: -1e9, lastWant: -1e9, playAt: 0, wasPlaying: false,
  tapState: '',                  // what the app says about its listening: on / failed|<code>
  mode: 'idle',
  force: '',                     // for tests: 'demo' plays the built-in tune regardless
  stamp: -1, lastFrame: 0,
  pre: 1, minVol: 0.01,          // undoing the volume slider (see auFrame)
  // the fixed scale: spectrum decibels shown, tilt towards the top end, and
  // the size of the waveform. Tuned on eight real songs: loud modern pop sits
  // around the middle of the bars and reaches the red top only on its peaks
  // (2-6 % of the time); quiet piano stays low.
  dbRange: 60, dbOff: 46, dbTilt: 24, waveK: 0.45,
  spec: new Float32Array(256), peak: new Float32Array(256), hold: new Float32Array(256),
  waveL: new Float32Array(512), waveR: new Float32Array(512),
  bass: 0, mid: 0, treb: 0, level: 0, beat: 0, hit: false, flow: 0, avgE: 0, lastBeat: 0,
  demoN: 0, demoRnd: 0,
  tex: new Uint8Array(512 * 4)   // what the effects read: spectrum, left wave, right wave, peaks
};
(function () {
  var N = AU.N, bits = Math.round(Math.log(N) / Math.LN2), i, b, r, x;
  AU.re = new Float32Array(N);
  AU.im = new Float32Array(N);
  AU.mag = new Float32Array(N / 2 + 1);
  AU.win = new Float32Array(N);
  AU.cos = new Float32Array(N / 2);
  AU.sin = new Float32Array(N / 2);
  AU.rev = new Uint16Array(N);
  for (i = 0; i < N; i++) {
    AU.win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    for (r = 0, x = i, b = 0; b < bits; b++) { r = (r << 1) | (x & 1); x >>= 1; }
    AU.rev[i] = r;
  }
  for (i = 0; i < N / 2; i++) { AU.cos[i] = Math.cos(2 * Math.PI * i / N); AU.sin[i] = Math.sin(2 * Math.PI * i / N); }
  // where each of the 256 spectrum points sits in the analysis: 35 Hz ... 16 kHz
  AU.binAt = new Float32Array(257);
  for (i = 0; i <= 256; i++) AU.binAt[i] = 35 * Math.pow(16000 / 35, i / 256) / (AU.rate / N);
})();

// Ask the app for sound. Called from whatever is drawing; the app stops
// listening by itself a few seconds after the asking stops.
function auWant(now) {
  if (now - AU.lastWant < 400) return;
  AU.lastWant = now;
  send('tap|1');
}

function onHostMessage(e) {
  var d = e && e.data;
  if (typeof d !== 'string') return;
  if (d.lastIndexOf('pcm|', 0) === 0) auPcm(d);
  else if (d.lastIndexOf('seen|', 0) === 0) setSeen(d.charAt(5) !== '0');
  else if (d.lastIndexOf('tapstate|', 0) === 0) {
    AU.tapState = d.slice(9, 60);
    if (AU.tapState.lastIndexOf('failed', 0) === 0) dlog('sound capture ' + AU.tapState);
    vzStatus();
  }
  else if (d.lastIndexOf('caps|', 0) === 0) npCaps(d.slice(5, 80));
  else if (d.lastIndexOf('discord|', 0) === 0) { NP.dc = d.slice(8, 20); syncPanel(); }
}

// The window went out of sight (minimised, covered by a game) or came back.
// Out of sight, nothing moves: the visualizer, the level bars, the lyrics and
// the CSS animations stop, and with them the sound capture. The music plays on.
function setSeen(on) {
  if (S.seen === on) return;
  S.seen = on;
  document.documentElement.setAttribute('data-mp-seen', on ? '1' : '0');
  bgvSync();
  if (!on) return;
  VZ.last = 0;
  AU.playAt = performance.now();      // the sound capture needs a moment to start again: no stand-in tune meanwhile
  kickViz();
  vzKick();
  lyKick();
  if (deckShown()) setMarquee(S.marquee, true);
}

function auPcm(d) {
  var bin;
  try { bin = atob(d.slice(4)); } catch (e) { return; }
  var n = (bin.length - 8) >> 2, i;
  if (n <= 0 || n > 4096) return;
  var total = 0;
  for (i = 5; i >= 0; i--) total = total * 256 + bin.charCodeAt(i);
  var fresh = (AU.total < 0 || total < AU.total || total - AU.total > n) ? n : total - AU.total;
  var now = performance.now();
  AU.total = total;
  AU.lastMsg = now;

  var L = AU.ringL, R = AU.ringR, mask = L.length - 1, pos = AU.pos, o = 8 + (n - fresh) * 4, l, r, peak = 0;
  // the built-in tune is playing: only real sound may take the stage back
  var keep = AU.mode !== 'demo';
  if (!keep) {
    for (i = 8; i < bin.length; i += 30) { l = bin.charCodeAt(i) | (bin.charCodeAt(i + 1) << 8); if (l > 32767) l = 65536 - l; if (l > peak) peak = l; }   // (30 bytes: alternates left and right)
    keep = peak > 4;
    peak = 0;
  }
  if (!keep) return;
  for (i = 0; i < fresh; i++, o += 4) {
    l = bin.charCodeAt(o) | (bin.charCodeAt(o + 1) << 8); if (l > 32767) l -= 65536;
    r = bin.charCodeAt(o + 2) | (bin.charCodeAt(o + 3) << 8); if (r > 32767) r -= 65536;
    if (l > peak) peak = l; else if (-l > peak) peak = -l;
    if (r > peak) peak = r; else if (-r > peak) peak = -r;
    L[pos] = l / 32768;
    R[pos] = r / 32768;
    pos = (pos + 1) & mask;
  }
  AU.pos = pos;
  if (peak > 4) AU.lastLoud = now;
}

// The stand-in tune: kick, bass, a chord, a hopping note, snare and hi-hat, so
// that spectrum, waveform and beat all have something believable to show.
function auDemo(n) {
  var L = AU.ringL, R = AU.ringR, mask = L.length - 1, pos = AU.pos, k = AU.demoN, rate = AU.rate, i;
  var spb = 60 / 122, TAU = 6.283185307, roots = [55, 55, 65.41, 49], hops = [8, 10, 12, 16, 12, 10];
  for (i = 0; i < n; i++, k++) {
    var t = k / rate, beat = t / spb, bi = Math.floor(beat), bt = (beat - bi) * spb;
    var f = roots[Math.floor(bi / 4) % 4];
    var kick = Math.sin(TAU * (44 * bt + 3.4 * (1 - Math.exp(-bt * 30)))) * Math.exp(-bt * 7.5);
    var late = bt - spb * 0.5, bass = late > 0 ? Math.sin(TAU * f * t) * Math.exp(-late * 7) * 0.45 : 0;
    var pad = (Math.sin(TAU * f * 4 * t) + Math.sin(TAU * f * 5 * t) + Math.sin(TAU * f * 6 * t)) * 0.07 * (0.6 + 0.4 * Math.sin(t * 0.9));
    var six = beat * 4, si = Math.floor(six), st = (six - si) * spb / 4;
    var hop = Math.sin(TAU * f * hops[si % 6] * t) * Math.exp(-st * 16) * 0.16;
    var rnd = Math.random() * 2 - 1, eight = beat * 2, ei = Math.floor(eight), et = (eight - ei) * spb / 2;
    var hat = (rnd - AU.demoRnd) * Math.exp(-et * 55) * (ei % 2 ? 0.16 : 0.07);
    AU.demoRnd = rnd;
    var snare = (bi % 2) ? (rnd * 0.22 + Math.sin(TAU * 185 * bt) * 0.12) * Math.exp(-bt * 16) : 0;
    var pan = 0.5 + 0.45 * Math.sin(t * 1.3);
    // (as loud as a finished record, so that it sits on the fixed scale like real music)
    L[pos] = (kick * 0.8 + bass + pad + hop * pan + hat + snare) * 1.2;
    R[pos] = (kick * 0.8 + bass + pad * 0.9 + hop * (1 - pan) + hat * 0.8 + snare) * 1.2;
    pos = (pos + 1) & mask;
  }
  AU.pos = pos;
  AU.demoN = k;
}

// In-place FFT of AU.re / AU.im (already in bit-reversed order).
function auFft() {
  var N = AU.N, re = AU.re, im = AU.im, cosT = AU.cos, sinT = AU.sin, len, step, i, j, k, a, b, wr, wi, tr, ti;
  for (len = 1; len < N; len <<= 1) {
    step = N / (len << 1);
    for (i = 0; i < N; i += len << 1) {
      for (j = 0, k = 0; j < len; j++, k += step) {
        wr = cosT[k]; wi = -sinT[k];
        a = i + j; b = a + len;
        tr = re[b] * wr - im[b] * wi;
        ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
      }
    }
  }
}

// Work out everything for this frame. Safe to call from several drawing loops:
// it runs once per frame time.
function auFrame(now) {
  if (AU.stamp === now) return;
  var dt = AU.stamp < 0 ? 0.016 : Math.min(0.1, Math.max(0.001, (now - AU.lastFrame) / 1000));
  AU.stamp = now;
  AU.lastFrame = now;

  var playing = S.state === 'play';
  if (playing && !AU.wasPlaying) AU.playAt = now;
  AU.wasPlaying = playing;
  var fed = now - AU.lastMsg < 700, loud = now - AU.lastLoud < 500, mode;
  if (AU.force) mode = AU.force;
  else if (fed && loud) mode = 'live';
  else if (playing) {
    // a song is playing but nothing is heard: wait a moment (the app needs a
    // beat to start listening, songs open with silence) before the tune steps in
    if (fed) mode = now - Math.max(AU.lastLoud, AU.playAt) < 3000 ? 'live' : 'demo';
    else mode = now - Math.max(AU.lastMsg, AU.playAt) < 3000 ? 'idle' : 'demo';
  }
  else mode = fed ? 'live' : 'idle';
  if (mode !== AU.mode) { AU.mode = mode; vzStatus(); }

  var N = AU.N, L = AU.ringL, R = AU.ringR, mask = L.length - 1, i, j, k, v;
  var fresh = Math.min(4096, Math.round(dt * AU.rate));
  if (mode === 'demo') auDemo(fresh);
  else if (mode === 'idle') {
    for (i = 0; i < fresh; i++) { L[AU.pos] = R[AU.pos] = 0; AU.pos = (AU.pos + 1) & mask; }
  }

  // The sound arrives with the volume slider already applied. Undo that, so
  // the displays show how loud the music itself is, on a fixed scale: loud
  // passages fill the bars, quiet ones do not, and turning the volume down
  // does not shrink them (as on Winamp, or a hi-fi's own displays). Very low
  // volume settings (under about 1 %) are not made up for: there is too little
  // left of the sound to show.
  var start = (AU.pos - N) & mask, vol = 1;
  if (mode === 'live') { try { vol = S.music ? +S.music.volume : 1; } catch (e) {} }
  var wantPre = 1 / Math.max(AU.minVol, isFinite(vol) ? vol : 1);
  AU.pre += (wantPre - AU.pre) * Math.min(1, dt * 5);     // (the sound lags the slider a little)
  var g = AU.pre;

  // spectrum
  var re = AU.re, im = AU.im, mag = AU.mag, rev = AU.rev, win = AU.win, norm = 4 / N;
  for (i = 0; i < N; i++) { j = (start + i) & mask; re[rev[i]] = (L[j] + R[j]) * 0.5 * g * win[i]; }
  im.fill(0);
  auFft();
  for (i = 0, k = N >> 1; i < k; i++) mag[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]) * norm;
  mag[k] = 0;

  var spec = AU.spec, peak = AU.peak, hold = AU.hold, bin = AU.binAt, sum = 0, m, b0, b1;
  var up = Math.min(1, dt * 38), down = Math.min(1, dt * 9);
  for (i = 0; i < 256; i++) {
    b0 = bin[i]; b1 = bin[i + 1];
    if (b1 - b0 < 1) { k = b0 | 0; m = mag[k] + (mag[k + 1] - mag[k]) * (b0 - k); }
    else { m = 0; for (k = b0 | 0; k < b1; k++) if (mag[k] > m) m = mag[k]; }
    // decibels (0 = a full-scale tone), tilted up towards the top end (music
    // naturally has less there), on a fixed window of AU.dbRange decibels
    v = 8.6859 * Math.log(m + 1e-7);
    if (AU.rawOut) AU.rawOut[i] = v;                       // (tests: the levels before the scale)
    v = (v + AU.dbTilt * i / 256 + AU.dbOff) / AU.dbRange;
    v = v < 0 ? 0 : v > 1 ? 1 : v;
    spec[i] += (v - spec[i]) * (v > spec[i] ? up : down);
    if (spec[i] >= peak[i]) { peak[i] = spec[i]; hold[i] = 0.35; }
    else if (hold[i] > 0) hold[i] -= dt;
    else peak[i] = Math.max(spec[i], peak[i] - dt * 0.55);
    sum += spec[i];
  }

  var bs = 0, md = 0, tb = 0;
  for (i = 4; i < 70; i++) bs += spec[i];
  for (i = 70; i < 170; i++) md += spec[i];
  for (i = 170; i < 244; i++) tb += spec[i];
  var ease = Math.min(1, dt * 14);
  AU.bass += (bs / 66 - AU.bass) * ease;
  AU.mid += (md / 100 - AU.mid) * ease;
  AU.treb += (tb / 74 - AU.treb) * ease;
  AU.level += (sum / 256 - AU.level) * Math.min(1, dt * 6);

  // a beat: the low end suddenly well above its recent average
  var e = 0;
  for (i = 2; i < 9; i++) e += mag[i] * mag[i];
  AU.hit = false;
  if (e > AU.avgE * 1.5 + 0.0004 && now - AU.lastBeat > 190) { AU.hit = true; AU.lastBeat = now; AU.beat = 1; }
  AU.avgE += (e - AU.avgE) * Math.min(1, dt * 2.2);
  AU.beat *= Math.exp(-dt / 0.17);
  AU.flow += dt * (0.3 + 1.5 * AU.bass + 1.4 * AU.beat);

  // a steady stretch of the waveform: start where it crosses zero going up
  var from = (AU.pos - 1536) & mask, off = 0, p0, p1;
  for (i = 0; i < 500; i++) {
    j = (from + i) & mask; k = (from + i + 1) & mask;
    p0 = L[j] + R[j]; p1 = L[k] + R[k];
    if (p0 < 0 && p1 >= 0) { off = i; break; }
  }
  var wl = AU.waveL, wr = AU.waveR, wg = g * AU.waveK;
  for (i = 0; i < 512; i++) {
    j = (from + off + i * 2) & mask;
    v = L[j] * wg; wl[i] = v < -1 ? -1 : v > 1 ? 1 : v;
    v = R[j] * wg; wr[i] = v < -1 ? -1 : v > 1 ? 1 : v;
  }

  var t = AU.tex, s;
  for (i = 0; i < 512; i++) {
    s = i * 0.5; k = s | 0; j = k < 255 ? k + 1 : 255;
    t[i] = (spec[k] + (spec[j] - spec[k]) * (s - k)) * 255;
    t[512 + i] = 127.5 + wl[i] * 127.5;
    t[1024 + i] = 127.5 + wr[i] * 127.5;
    t[1536 + i] = (peak[k] + (peak[j] - peak[k]) * (s - k)) * 255;
  }
}

// ============================================================================
// Visualizer
// Each effect is one small program for the graphics card (a fragment shader).
// Every frame it gets the previous picture (uPrev) and the sound (uAudio, the
// numbers from "Sound" above) and paints the next picture; effects that warp
// and fade the previous picture are what leave trails. To add an effect, add
// an entry to EFFECTS with a function  vec3 fx(vec2 uv, vec2 p)  where uv runs
// 0..1 across the picture and p is centred (y from -1 to 1, x wider by the
// picture's shape).
// ============================================================================
// One triangle that covers the whole picture (its corners come from a small
// vertex buffer: the most widely supported way to draw it).
var VZ_VERT = [
  '#version 300 es',
  'in vec2 aPos;',
  'out vec2 vUv;',
  'void main(){',
  '  vUv = aPos * 0.5 + 0.5;',
  '  gl_Position = vec4(aPos, 0.0, 1.0);',
  '}'
].join('\n');

// The same programs for WebGL 1 (older or limited graphics), which speaks
// GLSL ES 1.00. The effects themselves only use the helpers in VZ_HEAD, so
// translating the header, the vertex program and the two main()s is enough.
function vzGl1(src, fragment) {
  return src
    .replace('#version 300 es\n', '')
    .replace('precision highp float;', fragment
      ? '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif'
      : 'precision highp float;')
    .replace('precision highp sampler2D;\n', '')
    .replace('in vec2 aPos;', 'attribute vec2 aPos;')
    .replace('out vec2 vUv;', 'varying vec2 vUv;')
    .replace('in vec2 vUv;', 'varying vec2 vUv;')
    .replace('out vec4 outColor;\n', '')
    .replace(/\boutColor\b/g, 'gl_FragColor')
    .replace(/\btexture\(/g, 'texture2D(');
}

var VZ_HEAD = [
  '#version 300 es',
  'precision highp float;',
  'precision highp sampler2D;',
  'uniform sampler2D uPrev;        // the previous picture',
  'uniform sampler2D uAudio;       // rows: spectrum, left wave, right wave, spectrum peaks',
  'uniform vec2 uRes;              // picture size in pixels',
  'uniform float uTime;            // seconds',
  'uniform float uBass, uMid, uTreb, uLevel;   // 0..1',
  'uniform float uBeat;            // jumps to 1 on a beat, then fades',
  'uniform float uFlow;            // time that runs faster when the music pushes',
  'uniform float uSeed;',
  'uniform vec3 uC1, uC2;          // the theme: display ink, lamp colour',
  'uniform vec4 uRing[6];          // ripples: x, y, age in seconds, strength',
  'in vec2 vUv;',
  'out vec4 outColor;',
  '#define PI 3.14159265',
  '#define TAU 6.2831853',
  'float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
  'vec2 hash22(vec2 p){ float n = hash21(p); return vec2(n, hash21(p + n + 17.17)); }',
  'float vnoise(vec2 p){',
  '  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);',
  '  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x), mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);',
  '}',
  'float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return s; }',
  'vec3 pal(float t){ return 0.5 + 0.5 * cos(TAU * (t + vec3(0.0, 0.33, 0.67))); }     // rainbow',
  'mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }',
  'float spec(float x){ return texture(uAudio, vec2(clamp(x, 0.0, 1.0), 0.125)).r; }',
  'float wavL(float x){ return texture(uAudio, vec2(clamp(x, 0.002, 0.998), 0.375)).r * 2.0 - 1.0; }',
  'float wavR(float x){ return texture(uAudio, vec2(clamp(x, 0.002, 0.998), 0.625)).r * 2.0 - 1.0; }',
  'float peakAt(float x){ return texture(uAudio, vec2(clamp(x, 0.0, 1.0), 0.875)).r; }',
  'vec3 prev(vec2 uv){ return texture(uPrev, uv).rgb; }',
  'vec2 toUv(vec2 p){ return vec2(p.x * uRes.y / uRes.x, p.y) * 0.5 + 0.5; }',
  'float sat(float x){ return clamp(x, 0.0, 1.0); }',
  'float hush(){ return 1.0 - smoothstep(0.015, 0.09, uLevel); }     // 1 while nothing is heard',
  'vec3 keep(vec3 c, float k){ return max(c * k - 0.0025, 0.0); }     // what is left of the last picture (fades all the way to black)',
  ''
].join('\n');

var VZ_MAIN = [
  '',
  'void main(){',
  '  vec2 p = (vUv * 2.0 - 1.0) * vec2(uRes.x / uRes.y, 1.0);',
  '  outColor = vec4(clamp(fx(vUv, p), 0.0, 4.0), 1.0);',
  '}'
].join('\n');

var VZ_PRESENT = [
  '#version 300 es',
  'precision highp float;',
  'uniform sampler2D uTex;',
  'in vec2 vUv;',
  'out vec4 outColor;',
  'void main(){',
  '  vec3 c = clamp(texture(uTex, vUv).rgb, 0.0, 1.0);',
  '  c = pow(c, vec3(0.9));',
  '  vec2 q = vUv - 0.5;',
  '  c *= 1.0 - 0.5 * dot(q, q);',
  '  c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;   // a little grain: no bands in dark skies',
  '  outColor = vec4(c, 1.0);',
  '}'
].join('\n');

var EFFECTS = [
  // Two glowing waveforms (left and right channel) flying into the screen.
  // With nothing playing they swell slowly instead of lying flat.
  { id: 'waves', name: 'Colour Waves', jp: '色波', src: [
    'float lineL(float x){ return 0.36 + (0.32 + 0.10 * uLevel) * wavL(x) + hush() * 0.085 * sin(x * 6.3 + uTime * 0.9) * cos(x * 2.1 - uTime * 0.55); }',
    'float lineR(float x){ return -0.36 + (0.32 + 0.10 * uLevel) * wavR(x) + hush() * 0.085 * sin(x * 5.1 - uTime * 0.8 + 2.0) * cos(x * 2.6 + uTime * 0.45); }',
    'vec3 fx(vec2 uv, vec2 p){',
    '  float asp = uRes.x / uRes.y, px = 2.0 / uRes.y;',
    '  vec2 q = rot(0.012 * sin(uTime * 0.23) + 0.005) * p * (0.972 - 0.032 * uBeat);',
    '  q += 0.004 * vec2(sin(p.y * 2.5 + uTime * 0.6), cos(p.x * 2.5 + uTime * 0.5));',
    '  vec3 c = keep(prev(toUv(q)), 0.95);',
    '  c = mix(c, c.brg, 0.022);',
    '  float x = uv.x, e = 0.004;',
    '  float sl = (lineL(x + e) - lineL(x - e)) / (4.0 * e * asp), sr = (lineR(x + e) - lineR(x - e)) / (4.0 * e * asp);',
    '  float dl = abs(p.y - lineL(x)) / sqrt(1.0 + sl * sl), dr = abs(p.y - lineR(x)) / sqrt(1.0 + sr * sr);',
    '  float w = px * (2.0 + 2.4 * uBeat);',
    '  vec3 il = pal(uTime * 0.05 + x * 0.4), ir = pal(uTime * 0.05 + x * 0.4 + 0.45);',
    '  float gl = smoothstep(w, 0.0, dl), gr = smoothstep(w, 0.0, dr);',
    '  c = mix(c, il, sat(gl + 0.14 * w / (dl + w)));            // the line, and the light around it',
    '  c = mix(c, ir, sat(gr + 0.14 * w / (dr + w)));',
    '  c += (il * gl + ir * gr) * 0.45;                          // a hot core',
    '  return c;',
    '}'
  ] },

  // Flying through stars and drifting gas; the low end is the throttle.
  { id: 'stars', name: 'Starfield', jp: '星空', src: [
    'vec3 fx(vec2 uv, vec2 p){',
    '  vec3 c = keep(prev(toUv(p * (0.985 - 0.02 * uBass))), 0.85 + 0.06 * uBass);',
    '  vec2 sp = rot(uTime * 0.015) * p;                         // the whole sky turns slowly',
    '  float n1 = fbm(sp * 1.1 + vec2(uTime * 0.012, uSeed)), n2 = fbm(sp * 2.3 - vec2(uSeed, uTime * 0.02));',
    '  vec3 gas = mix(vec3(0.10, 0.22, 0.60), vec3(0.60, 0.14, 0.48), smoothstep(0.3, 0.7, n2)) * smoothstep(0.36, 0.78, n1);',
    '  c += gas * 0.030 * (0.8 + 0.9 * uMid);',
    '  c += vec3(0.55, 0.65, 1.0) * 0.010 * exp(-length(p) * 3.5) * (0.6 + 2.5 * uBass);',
    '  float travel = uFlow * 0.16;',
    '  for (int i = 0; i < 8; i++) {',
    '    float fi = float(i);',
    '    float depth = fract(fi / 8.0 + travel);',
    '    float scale = mix(16.0, 0.5, depth);',
    '    float fade = smoothstep(0.0, 0.15, depth) * smoothstep(1.0, 0.92, depth);',
    '    vec2 g = sp * scale + vec2(fi * 37.3, fi * 11.9) + uSeed;',
    '    vec2 id = floor(g), f = fract(g) - 0.5;',
    '    vec2 h = hash22(id + fi * 3.7);',
    '    if (h.x > 0.34) continue;',
    '    vec2 off = (hash22(id + 91.7 + fi) - 0.5) * 0.6;',
    '    float d = length(f - off);',
    '    float size = (0.07 + 0.07 * h.y) * mix(1.0, 0.13, depth);',
    '    float tw = 0.75 + 0.25 * sin(uTime * (2.0 + 5.0 * h.y) + h.x * 60.0);',
    '    float s = smoothstep(size, 0.0, d);',
    '    s = s * s * (0.6 + 1.3 * uBeat + 0.9 * uTreb) * tw;',
    '    vec2 fd = abs(f - off) / scale;                         // the near, bright ones get a four-point glint',
    '    s += step(0.7, h.y) * depth * depth * 0.35 * (exp(-fd.x * 260.0 - fd.y * 18.0) + exp(-fd.y * 260.0 - fd.x * 18.0)) * tw;',
    '    vec3 tint = mix(vec3(0.72, 0.84, 1.0), vec3(1.0, 0.86, 0.68), fract(h.y * 7.0));',
    '    tint = mix(tint, pal(h.y + uTime * 0.02), 0.35);',
    '    c += tint * s * fade * 0.8;',
    '  }',
    '  return c;',
    '}'
  ] },

  // The classic: lit segments per band, falling peak caps, a reflection below.
  { id: 'bars', name: 'Spectrum', jp: 'スペクトラム', src: [
    'vec3 fx(vec2 uv, vec2 p){',
    '  float n = floor(clamp(uRes.x / 15.0, 16.0, 72.0));',
    '  float base = 0.26;',
    '  float bar = floor(uv.x * n), fr = fract(uv.x * n);',
    '  float x = 0.02 + (bar + 0.5) / n * 0.94;',
    '  float v = spec(x), pk = peakAt(x);',
    '  float gap = step(0.13, fr) * step(fr, 0.87);',
    '  float rows = floor(uRes.y * (0.94 - base) / 7.0);',
    '  vec3 c = vec3(0.0);',
    '  if (uv.y >= base) {',
    '    float y = (uv.y - base) / (0.94 - base);',
    '    float seg = step(0.24, fract(y * rows));',
    '    float lit = step(y, v) * step(y, 1.0);',
    '    vec3 ink = mix(uC1, uC2, smoothstep(0.45, 0.9, y));',
    '    ink = mix(ink, vec3(1.0), smoothstep(0.84, 1.0, y) * 0.6);',
    '    c += ink * lit * seg * gap;',
    '    float unlit = (1.0 - lit) * seg * gap * step(y, 1.0);',
    '    c += uC1 * 0.07 * unlit;',
    '    c += ink * 0.30 * exp(-max(y - v, 0.0) * 18.0) * unlit * step(0.02, v);      // the lit part glows onto the segments above it',
    '    float cap = step(abs(y - pk - 0.6 / rows), 0.55 / rows) * gap * step(0.03, pk);',
    '    c += mix(uC2, vec3(1.0), 0.5) * cap;',
    '    c += ink * 0.05 * smoothstep(v + 0.10, v - 0.05, y) * (1.0 - gap);            // and between the columns',
    '  } else {',
    '    float y = (base - uv.y) / base;',
    '    float ym = y * 0.62;',
    '    float seg = step(0.24, fract(ym * rows));',
    '    float lit = step(ym, v);',
    '    c += mix(uC1, uC2, smoothstep(0.45, 0.9, ym)) * lit * seg * gap * 0.32 * (1.0 - y) * (1.0 - y);',
    '  }',
    '  c += uC1 * 0.05 * exp(-abs(uv.y - base) * 9.0) * (0.5 + uBass);',
    '  return c;',
    '}'
  ] },

  // An oscilloscope: graticule, a glowing phosphor trace that is dimmer where it moves fast.
  { id: 'scope', name: 'Oscilloscope', jp: '波形', src: [
    'float mono(float x){ return 0.33 * (wavL(x) + wavR(x)); }',
    'vec3 fx(vec2 uv, vec2 p){',
    '  float asp = uRes.x / uRes.y, px = 2.0 / uRes.y;',
    '  vec3 c = keep(prev(uv), 0.80);',
    '  vec2 gd = abs(fract(vec2(uv.x * 10.0, uv.y * 8.0) + 0.5) - 0.5) * vec2(uRes.x / 10.0, uRes.y / 8.0);',
    '  float grid = 1.0 - smoothstep(0.4, 1.3, min(gd.x, gd.y));',
    '  vec2 ax = abs(uv - 0.5) * uRes;',
    '  float axis = 1.0 - smoothstep(0.6, 1.6, min(ax.x, ax.y));',
    '  vec2 tk = abs(fract(vec2(uv.x * 50.0, uv.y * 40.0) + 0.5) - 0.5) * vec2(uRes.x / 50.0, uRes.y / 40.0);',
    '  float ticks = (1.0 - smoothstep(0.4, 1.2, tk.x)) * step(ax.y, 4.5) + (1.0 - smoothstep(0.4, 1.2, tk.y)) * step(ax.x, 4.5);',
    '  c = max(c, uC1 * (0.09 * grid + 0.15 * axis + 0.15 * ticks));',
    '  // the trace: the true distance to the line through the samples nearest',
    '  // this point, so that it stays one unbroken line at any size',
    '  float n = 512.0, at = floor(uv.x * n - 0.5), d = 9.0, s = 0.0;',
    '  for (int k = -2; k <= 2; k++) {',
    '    float xa = (at + float(k) + 0.5) / n, xb = xa + 1.0 / n;',
    '    vec2 a = vec2((xa * 2.0 - 1.0) * asp, mono(xa)), ab = vec2((xb * 2.0 - 1.0) * asp, mono(xb)) - a, ap = p - a;',
    '    d = min(d, length(ap - ab * clamp(dot(ap, ab) / dot(ab, ab), 0.0, 1.0)));',
    '    if (k == 0) s = ab.y / ab.x;',
    '  }',
    '  float w = px * 1.6;',
    '  float beam = 1.0 / (1.0 + 0.3 * abs(s));',
    '  c = max(c, mix(uC1, vec3(1.0), 0.5) * smoothstep(w, 0.0, d) * (0.6 + 0.4 * beam));',
    '  c += uC1 * 0.11 * w / (d + w * 2.0) * (0.4 + 0.6 * beam);',
    '  return c;',
    '}'
  ] },

  // A tunnel of lit panels: each ring shows the spectrum, and light runs down it.
  { id: 'tunnel', name: 'Tunnel', jp: 'トンネル', src: [
    'vec3 fx(vec2 uv, vec2 p){',
    '  vec2 q = p - 0.18 * vec2(sin(uTime * 0.31), cos(uTime * 0.23));',
    '  float r = length(q) + 0.0001, a = atan(q.y, q.x);',
    '  float z = 0.5 / r + uFlow * 0.5;',
    '  float u = a / TAU + 0.5 + 0.05 * sin(z * 0.45 + uTime * 0.2);',
    '  float cu = u * 24.0, cz = z * 2.4;',
    '  vec2 cell = vec2(floor(cu), floor(cz)), f = vec2(fract(cu), fract(cz));',
    '  vec2 e2 = smoothstep(0.0, 0.10, f) * smoothstep(1.0, 0.90, f);',
    '  float panel = e2.x * e2.y * (1.0 - 0.55 * length(f - 0.5));                 // brighter in the middle of each panel',
    '  float band = abs(fract(cell.x / 12.0) * 2.0 - 1.0);',
    '  float v = spec(0.03 + band * 0.85);',
    '  float lit = smoothstep(0.26, 0.70, v * (0.8 + 0.5 * hash21(cell)));',
    '  lit += (0.20 + 0.14 * hush()) * pow(0.5 + 0.5 * sin(cell.y * 0.55 - uTime * 2.4), 8.0);   // light running down the tunnel',
    '  lit += 0.8 * uBeat * step(0.8, hash21(cell + 7.7));',
    '  vec3 ink = pal(cell.y * 0.045 + band * 0.30 + uTime * 0.04);',
    '  float fog = smoothstep(0.02, 0.45, r);',
    '  vec3 c = ink * (0.09 + 1.0 * lit) * panel * fog;',
    '  c += ink * 0.10 * (1.0 - e2.x * e2.y) * fog * (0.3 + uBeat);                // the frame between the panels',
    '  c += pal(uTime * 0.05 + 0.3) * (0.10 + 0.25 * uBass + 0.55 * uBeat) * exp(-r * 5.5);    // the far end',
    '  c += prev(toUv(p * 0.985)) * 0.38;',
    '  return c;',
    '}'
  ] },

  // Liquid light: colours folding into each other, stirred by the low end.
  { id: 'plasma', name: 'Plasma', jp: 'プラズマ', src: [
    'vec3 fx(vec2 uv, vec2 p){',
    '  float t = uTime * 0.06 + uFlow * 0.09;',
    '  vec2 q = p * (0.85 - 0.10 * uBass);',
    '  vec2 w1 = vec2(fbm(q + vec2(t, -0.7 * t) + uSeed), fbm(q + vec2(5.2 - 0.8 * t, 1.3 + t)));',
    '  vec2 w2 = vec2(fbm(q + 2.6 * w1 + vec2(1.7 + 0.6 * t, 9.2)), fbm(q + 2.6 * w1 + vec2(8.3, 2.8 - 0.5 * t)));',
    '  float v = fbm(q + 2.8 * w2 + 0.4 * t);',
    '  v += 0.05 * uTreb * sin(length(q + w2) * 22.0 - uTime * 4.0);',
    '  float k = v * 1.7 + length(w2) * 0.55 + uTime * 0.025 + 0.10 * uBeat;',
    '  vec3 c = 0.5 + 0.5 * cos(TAU * (k + vec3(0.0, 0.14, 0.33)));',
    '  c = mix(c, c * c * 1.2, 0.5);',
    '  c *= 0.50 + 0.75 * smoothstep(0.15, 0.85, v);',
    '  c += vec3(1.0, 0.92, 0.85) * smoothstep(0.035, 0.0, abs(fract(k * 2.0) - 0.5)) * (0.05 + 0.5 * uTreb);   // bright seams, with the treble',
    '  c = mix(c, prev(uv), 0.25);',
    '  return c * (0.82 + 0.14 * uLevel + 0.14 * uBeat);',
    '}'
  ] },

  // Pieces of coloured glass tumbling between six mirrors. Each piece lights
  // up with its own band of the music; with nothing playing they keep turning.
  { id: 'kaleido', name: 'Kaleidoscope', jp: '万華鏡', src: [
    'vec3 glass(vec2 g, float t, float lift){',
    '  vec2 id = floor(g), f = fract(g), who = vec2(0.0);',
    '  float d1 = 8.0, d2 = 8.0;',
    '  for (int j = -1; j <= 1; j++) {',
    '    for (int i = -1; i <= 1; i++) {',
    '      vec2 o = vec2(float(i), float(j));',
    '      vec2 h = hash22(id + o + 0.5);',
    '      vec2 at = o + 0.5 + 0.38 * sin(t * (0.5 + h.yx) + TAU * h) - f;',
    '      float d = dot(at, at);',
    '      if (d < d1) { d2 = d1; d1 = d; who = id + o; } else if (d < d2) { d2 = d; }',
    '    }',
    '  }',
    '  d1 = sqrt(d1); d2 = sqrt(d2);',
    '  float edge = d2 - d1;',
    '  vec2 h = hash22(who + 7.3);',
    '  vec3 ink = pal(h.x + 0.03 * t);',
    '  ink = mix(ink * ink, ink, 0.4) * 1.2;                                   // deeper: jewel colours',
    '  ink = mix(ink, vec3(1.0, 0.96, 0.88), step(0.88, h.y) * 0.8);            // a few clear pieces',
    '  ink *= step(0.14, h.y);                                                 // and a few gaps',
    '  float band = spec(0.04 + 0.8 * fract(h.x * 7.0 + h.y * 3.0));',
    '  float body = smoothstep(0.012, 0.075, edge);                            // dark lines between the pieces',
    '  float facet = 0.6 + 0.4 * smoothstep(0.0, 0.5, edge) + 0.22 * smoothstep(0.4, 0.0, d1);',
    '  return ink * body * facet * (lift + 0.7 * band);',
    '}',
    'vec3 fx(vec2 uv, vec2 p){',
    '  float t = uTime * 0.08 + uFlow * 0.20;                                  // turns slowly; the music turns it faster',
    '  float sector = TAU / 6.0;',
    '  vec2 z = p * (1.0 - 0.05 * uBass - 0.03 * uBeat);',
    '  float r = length(z), a = atan(z.y, z.x) + 0.06 * uTime + 0.4 * sin(uTime * 0.13);',
    '  a = abs(mod(a, sector) - 0.5 * sector);                                 // the mirrors',
    '  vec2 q = r * vec2(cos(a), sin(a));',
    '  vec2 g = rot(0.35 * t) * q * 2.6 + vec2(1.3 * sin(t * 0.61), 1.1 * cos(t * 0.47)) + vec2(0.4 * t, uSeed);',
    '  vec3 c = glass(g, t * 2.0, 0.62);',
    '  vec2 g2 = rot(1.0 - 0.5 * t) * q * 5.8 + vec2(-0.7 * t, 0.9 * sin(t * 0.8)) + 31.7;',
    '  vec3 fine = glass(g2, t * 3.0, 0.55);',
    '  c = mix(c, c * fine * 2.2 + fine * 0.08, 0.5);                           // a second, finer plate of glass in front',
    '  c *= (1.0 + 0.22 * uBeat) * (1.1 - 0.22 * r);',
    '  c += pal(uTime * 0.07) * (0.10 + 0.5 * uBeat) * exp(-r * r * 40.0);',
    '  c = mix(c, prev(toUv(rot(0.01) * p * 0.985)), 0.28);                     // a soft glow that drifts outwards',
    '  return c;',
    '}'
  ] },

  // Fireflies over a meadow at night; each one glows with its own band.
  { id: 'hotaru', name: 'Fireflies', jp: '蛍', src: [
    'float blades(vec2 p, float n, float hgt, float seed){',
    '  float gx = p.x * n, id = floor(gx), f = fract(gx) - 0.5;',
    '  float h = hgt * (0.4 + 0.6 * hash21(vec2(id, seed)));',
    '  float y = (p.y + 1.0) / h;                                               // 0 on the ground, 1 at the tip',
    '  float lean = (hash21(vec2(id, seed + 3.0)) - 0.5) * 0.5 + 0.10 * sin(uTime * 0.8 + id * 0.7) * (0.5 + uBass);',
    '  float wd = 0.30 * (1.0 - y), aa = n * 1.5 / uRes.y;',
    '  return step(y, 1.0) * smoothstep(wd + aa, wd - aa, abs(f - lean * y * y));',
    '}',
    'vec3 fx(vec2 uv, vec2 p){',
    '  float asp = uRes.x / uRes.y;',
    '  vec3 c = keep(prev(toUv(p * 0.997 + vec2(0.0, -0.001))), 0.87);',
    '  vec3 night = mix(vec3(0.010, 0.036, 0.046), vec3(0.0, 0.008, 0.024), uv.y);',
    '  night += vec3(0.03, 0.075, 0.05) * exp(-4.5 * uv.y) * (0.6 + uBass);           // mist over the ground',
    '  vec2 sg = p * 22.0, sh = hash22(floor(sg) + uSeed);',
    '  night += vec3(0.7, 0.8, 1.0) * 0.30 * step(0.9, sh.x) * smoothstep(0.08, 0.0, length(fract(sg) - 0.5 - (sh - 0.5) * 0.6)) * smoothstep(0.4, 0.85, uv.y);',
    '  c = max(c, night);',
    '  for (int i = 0; i < 36; i++) {',
    '    float fi = float(i);',
    '    vec2 h = hash22(vec2(fi * 1.37 + uSeed, fi * 7.77));',
    '    float sp = 0.12 + 0.3 * h.x;',
    '    vec2 pos = vec2(asp * 1.05 * sin(uTime * sp * 0.55 + h.y * TAU + fi), -0.12 + 0.80 * sin(uTime * sp * 0.4 + h.x * TAU * 2.0 + fi * 2.3));',
    '    pos += 0.07 * vec2(sin(uTime * 1.3 + fi), cos(uTime * 1.1 + fi * 1.7));',
    '    float band = spec(0.03 + h.y * 0.85);',
    '    float blink = 0.30 + 0.70 * pow(0.5 + 0.5 * sin(uTime * (0.9 + h.x) + fi * 3.1), 2.0);',
    '    float size = (0.014 + 0.03 * h.x) * (0.85 + 1.1 * band + 0.5 * uBeat);',
    '    float d = length(p - pos);',
    '    float g = size * size / (d * d + size * size * 0.2);',
    '    vec3 ink = mix(vec3(0.72, 1.0, 0.32), vec3(1.0, 0.86, 0.3), h.y);',
    '    c += mix(ink, uC1, 0.25 * h.x) * g * blink * 0.07 * (0.75 + 0.9 * band);',
    '  }',
    '  c = mix(c, vec3(0.0, 0.026, 0.022), blades(p + vec2(0.31, 0.0), 44.0, 0.30, 1.0));   // grass: a far row and a near one',
    '  c = mix(c, vec3(0.0, 0.006, 0.008), blades(p, 23.0, 0.46, 5.0));',
    '  return c;',
    '}'
  ] },

  // Cherry petals on the wind under the moon; the low end is the wind.
  { id: 'sakura', name: 'Sakura Storm', jp: '桜吹雪', src: [
    'float petal(vec2 q){',
    '  float lens = max(length(q - vec2(0.0, 0.35)), length(q + vec2(0.0, 0.35))) - 0.62;',
    '  return max(lens, 0.12 - length(q - vec2(0.55, 0.0)));',
    '}',
    'vec3 fx(vec2 uv, vec2 p){',
    '  float asp = uRes.x / uRes.y;',
    '  vec3 c = mix(vec3(0.20, 0.06, 0.15), vec3(0.03, 0.02, 0.10), smoothstep(0.0, 0.9, uv.y));',
    '  c += vec3(0.34, 0.11, 0.17) * exp(-3.5 * uv.y) * (0.6 + 0.6 * uBass);',
    '  float md = length(p - vec2(asp * 0.50, 0.48));',
    '  c += vec3(1.0, 0.94, 0.9) * (smoothstep(0.18, 0.17, md) * 0.82 + 0.06 / (md + 0.12));',
    '  c += vec3(1.0, 0.75, 0.85) * 0.05 * exp(-md * 2.5) * (1.0 + 2.0 * uBeat);',
    '  for (int i = 0; i < 5; i++) {',
    '    float fl = 4.0 - float(i);                                               // the far ones first',
    '    float scale = 1.25 + fl * 1.45;',
    '    vec2 g = p * scale;',
    '    g.x += uFlow * (0.42 - 0.05 * fl) + 0.35 * sin(p.y * 1.5 + uTime * 0.4 + fl);',
    '    g.y += uTime * 0.24 * (1.3 - 0.15 * fl) + fl * 3.7;',
    '    vec2 id = floor(g), f = fract(g) - 0.5;',
    '    vec2 h = hash22(id + fl * 13.1 + uSeed);',
    '    if (h.x > 0.5) continue;',
    '    vec2 off = (hash22(id * 1.7 + 3.3) - 0.5) * 0.5;',
    '    float spin = h.y * TAU + uTime * (0.6 + h.x) * (h.y > 0.5 ? 1.0 : -1.0);',
    '    float flip = 0.55 + 0.45 * sin(uTime * (1.2 + h.x * 2.0) + h.y * 30.0);',
    '    vec2 q = rot(spin) * (f - off) / 0.2;',
    '    q.y /= max(0.28, flip);',
    '    float aa = scale * 2.0 / uRes.y / 0.2 * (fl < 0.5 ? 7.0 : 1.5);          // the nearest ones are out of focus',
    '    float cov = smoothstep(aa, -aa, petal(q));',
    '    vec3 ink = mix(vec3(1.0, 0.66, 0.80), vec3(1.0, 0.90, 0.94), h.y) * (0.72 + 0.28 * flip);',
    '    ink = mix(ink, vec3(1.0, 0.50, 0.68), 0.35 * smoothstep(0.5, -0.6, q.x));    // pinker towards the stem',
    '    c = mix(c, ink, cov * (fl < 0.5 ? 0.55 : 0.92 - 0.12 * fl));',
    '  }',
    '  c += vec3(1.0, 0.6, 0.75) * 0.07 * uBeat;',
    '  return c;',
    '}'
  ] },

  // Still water at night: a ring for every beat, and the moon broken up in it.
  { id: 'hamon', name: 'Ripples', jp: '波紋', src: [
    'vec3 fx(vec2 uv, vec2 p){',
    '  float asp = uRes.x / uRes.y, hgt = 0.0, drop = 0.0;',
    '  vec2 slope = vec2(0.0);',
    '  for (int i = 0; i < 6; i++) {',
    '    vec4 rg = uRing[i];',
    '    if (rg.w <= 0.0) continue;',
    '    vec2 dv = p - rg.xy;',
    '    float d = length(dv) + 0.0001;',
    '    float x = d - rg.z * 0.42;',
    '    float env = rg.w * exp(-rg.z * 0.7) * exp(-x * x * 8.0) * smoothstep(0.0, 0.08, d);',
    '    hgt += cos(x * 34.0) * env;',
    '    slope += dv / d * (-sin(x * 34.0)) * env;',
    '    drop += rg.w * exp(-rg.z * 7.0) * smoothstep(0.09, 0.0, d);              // the splash itself',
    '  }',
    '  vec2 sw = vec2(cos(p.x * 2.6 + uTime * 0.5) * sin(p.y * 2.1 - uTime * 0.4), sin(p.x * 2.6 + uTime * 0.5) * cos(p.y * 2.1 - uTime * 0.4));',
    '  slope += sw * (0.10 + 0.25 * uBass);',
    '  slope += 0.06 * (vec2(vnoise(p * 9.0 + uTime * 0.7), vnoise(p * 9.0 - uTime * 0.6 + 4.0)) - 0.5);   // a breath of wind',
    '  vec3 nrm = normalize(vec3(-slope * 0.6, 1.0));',
    '  vec2 look = p + nrm.xy * 0.5;                                              // the bit of sky this bit of water shows',
    '  vec3 c = mix(vec3(0.0, 0.018, 0.04), uC1 * 0.12, 0.4);',
    '  c += mix(vec3(0.02, 0.05, 0.10), uC1 * 0.20, 0.3) * smoothstep(-0.4, 1.3, look.y);',
    '  vec2 mo = look - vec2(0.36 * asp, 0.52);',
    '  c += vec3(1.0, 0.96, 0.86) * (0.62 * smoothstep(0.21, 0.14, length(mo)) + 0.05 / (dot(mo, mo) * 6.0 + 0.25));',
    '  vec3 sun = normalize(vec3(-0.35, 0.55, 0.75));',
    '  float diff = max(dot(nrm, sun), 0.0);',
    '  float glint = pow(max(dot(reflect(-sun, nrm), vec3(0.0, 0.0, 1.0)), 0.0), 60.0);',
    '  c += uC1 * 0.42 * pow(diff, 2.5) + mix(uC2, vec3(1.0), 0.6) * glint * 0.9;',
    '  c += uC1 * 0.25 * max(hgt, 0.0) + vec3(0.5) * drop;',
    '  c *= 0.78 + 0.22 * smoothstep(1.6, 0.2, length(p));',
    '  return c;',
    '}'
  ] },

  // Northern lights over a lake: three curtains that reach higher where the music is.
  { id: 'aurora', name: 'Aurora', jp: 'オーロラ', src: [
    'vec3 night(vec2 p){',
    '  vec3 c = vec3(0.0, 0.012, 0.035) + vec3(0.02, 0.01, 0.05) * smoothstep(-0.5, 1.0, p.y);',
    '  vec2 g = p * 34.0;',
    '  vec2 id = floor(g), f = fract(g) - 0.5, h = hash22(id);',
    '  c += vec3(0.8, 0.9, 1.0) * smoothstep(0.07, 0.0, length(f - (h - 0.5) * 0.6)) * step(0.80, h.x) * (0.5 + 0.5 * sin(uTime * 3.0 * h.y + h.x * 50.0));',
    '  for (int i = 0; i < 3; i++) {',
    '    float fi = float(i);',
    '    float x = p.x * (0.9 + 0.25 * fi) + fi * 2.1;',
    '    float t = uTime * (0.10 + 0.04 * fi) + uFlow * 0.08;',
    '    float n = fbm(vec2(x * 1.3 + t, t * 0.7 + fi * 5.0));',
    '    float low = -0.62 + 0.42 * n + 0.10 * fi;',
    '    float band = spec(fract(abs(x) * 0.13 + 0.08 * fi));',
    '    float reach = 0.6 + 0.7 * band + 0.3 * uMid;',
    '    float y = (p.y - low) / reach;',
    '    float body = smoothstep(0.0, 0.05, y) * (exp(-y * 2.3) + 0.5 * exp(-y * 16.0));      // brightest along the lower edge',
    '    float rays = (0.55 + 0.45 * vnoise(vec2(x * 22.0 + t * 3.0, 0.5 + fi))) * (0.75 + 0.25 * vnoise(vec2(x * 61.0 - t * 5.0, 3.0 + fi)));',
    '    vec3 ink = mix(vec3(0.1, 1.0, 0.45), vec3(0.6, 0.25, 0.95), smoothstep(0.1, 0.9, y));',
    '    ink = mix(ink, vec3(1.0, 0.35, 0.6), 0.45 * exp(-y * 16.0));',
    '    c += mix(ink, uC1, 0.18) * body * rays * (0.38 + 0.22 * hush() + 0.5 * band + 0.35 * uBeat) * (0.85 - 0.2 * fi);',
    '  }',
    '  return c;',
    '}',
    'vec3 fx(vec2 uv, vec2 p){',
    '  float hz = -0.56;                                   // the far shore',
    '  vec3 c;',
    '  if (p.y >= hz) c = night(p);',
    '  else {',
    '    float dy = hz - p.y;                              // the same sky, upside down in the water',
    '    vec2 q = vec2(p.x + 0.012 * sin(dy * 70.0 + uTime * 1.6) + 0.02 * sin(dy * 23.0 - uTime), hz + 0.05 + dy * 2.4);',
    '    c = night(q) * vec3(0.40, 0.48, 0.52) * (1.0 - 0.5 * dy);',
    '  }',
    '  float hills = hz + 0.035 + 0.07 * fbm(vec2(p.x * 1.6 + 3.0, 1.0));',
    '  float tree = floor(p.x * 15.0);                     // firs along the ridge',
    '  hills += 0.05 * (1.0 - abs(fract(p.x * 15.0) - 0.5) * 2.0) * step(0.3, hash21(vec2(tree, 2.0))) * (0.5 + 0.5 * hash21(vec2(tree, 6.0)));',
    '  c = mix(c, vec3(0.0, 0.006, 0.012), smoothstep(hills, hills - 0.008, p.y) * smoothstep(hz - 0.012, hz, p.y));',
    '  return c;',
    '}'
  ] },

  // A sun: its face boils, its rim is pushed out by the spectrum, light streams off it.
  { id: 'corona', name: 'Corona', jp: '光環', src: [
    'vec3 fx(vec2 uv, vec2 p){',
    '  float px = 2.0 / uRes.y, quiet = hush();',
    '  vec2 q = rot(0.004 + 0.008 * uBass) * p * (0.972 - 0.02 * uBeat);',
    '  vec3 c = keep(prev(toUv(q)), 0.90);',
    '  float r = length(p), a = atan(p.y, p.x);',
    '  float m = abs(a) / PI;',
    '  float v = spec(0.03 + m * 0.8);',
    '  float core = 0.25 + 0.05 * uBass + 0.012 * quiet * sin(uTime * 0.8);',
    '  float rim = core + 0.02 + 0.32 * v + quiet * 0.035 * (0.5 + 0.5 * sin(m * 28.0 + uTime * 1.6)) * (0.6 + 0.4 * sin(m * 9.0 - uTime));',
    '  vec3 ink = pal(m * 0.55 + uTime * 0.04);',
    '  c = mix(c, ink, smoothstep(px * 2.5, 0.0, abs(r - rim)));                              // the rim',
    '  c = mix(c, ink, 0.10 * smoothstep(rim, core, r) * step(core, r) * (0.3 + 0.7 * v));',
    '  float ray = pow(vnoise(vec2(m * 26.0, uTime * 0.35)), 3.0) + 0.5 * pow(vnoise(vec2(m * 61.0 + 9.0, uTime * 0.6)), 4.0);',
    '  c += ink * ray * smoothstep(rim + 0.7, rim, r) * step(rim, r) * (0.012 + 0.07 * v + 0.03 * uBeat);   // light streaming off',
    '  c += vec3(1.0, 0.72, 0.38) * 0.035 * exp(-(r - core) * 8.0) * step(core, r);',
    '  float boil = 0.6 * fbm(p * 9.0 + vec2(uTime * 0.2, -uTime * 0.15)) + 0.4 * fbm(rot(1.0) * p * 17.0 - uTime * 0.25);',
    '  vec3 hot = mix(vec3(1.0, 0.62, 0.18), vec3(1.0, 0.97, 0.80), smoothstep(0.30, 0.68, boil));',
    '  hot *= (0.95 + 0.25 * boil + 0.45 * uBeat) * (0.72 + 0.28 * sqrt(max(1.0 - r * r / (core * core), 0.0)));',
    '  c = mix(c, hot, smoothstep(core, core - px * 3.0, r));',
    '  return c;',
    '}'
  ] },

  // Synthwave: a striped sun, mountains that follow the spectrum, a grid floor rushing in.
  { id: 'outrun', name: 'Outrun', jp: 'アウトラン', src: [
    'vec3 fx(vec2 uv, vec2 p){',
    '  float asp = uRes.x / uRes.y, px = 2.0 / uRes.y;',
    '  float hz = -0.12;',
    '  vec3 c;',
    '  if (p.y > hz) {',
    '    float hh = (p.y - hz) / (1.0 - hz);',
    '    c = mix(vec3(0.55, 0.12, 0.45), vec3(0.03, 0.015, 0.12), smoothstep(0.0, 0.85, hh));',
    '    vec2 sg = p * 24.0, sh = hash22(floor(sg) + uSeed);',
    '    c += vec3(0.9, 0.85, 1.0) * step(0.86, sh.x) * smoothstep(0.10, 0.0, length(fract(sg) - 0.5 - (sh - 0.5) * 0.6)) * smoothstep(0.3, 0.8, hh) * (0.45 + 0.35 * sin(uTime * 2.5 * sh.y + sh.x * 40.0));',
    '    vec2 sc = vec2(0.0, hz + 0.30);',
    '    float sr = 0.29 + 0.05 * uBass + 0.03 * uBeat;',
    '    float d = length(p - sc);',
    '    float below = clamp((sc.y - p.y) / sr, 0.0, 1.0);',
    '    float cut = below * 0.55, sf = fract((p.y + uTime * 0.04) * 16.0), saa = 16.0 * px;',
    '    float stripe = smoothstep(cut - saa, cut + saa, sf);',
    '    float sun = smoothstep(sr, sr - px * 1.5, d) * mix(1.0, stripe, step(0.0001, below));',
    '    vec3 sunInk = mix(vec3(1.0, 0.88, 0.32), vec3(1.0, 0.22, 0.58), clamp((sc.y + sr - p.y) / (2.0 * sr), 0.0, 1.0));',
    '    c += vec3(1.0, 0.3, 0.6) * (0.30 * exp(-d * 3.2) + 0.10 * uBeat * exp(-d * 2.0));',
    '    c = mix(c, sunInk * (1.0 + 0.15 * uBeat), sun);',
    '    float x = abs(p.x) / asp;',
    '    float far = hz + 0.02 + 0.10 * fbm(vec2(p.x * 2.2 + 11.0, 0.5)) + 0.05 * x;       // a far range, in haze',
    '    c = mix(c, vec3(0.17, 0.05, 0.23), smoothstep(far + px, far - px, p.y));',
    '    float mh = hz + 0.025 + 0.32 * spec(0.05 + x * 0.6) * (0.3 + 0.7 * x) + 0.03 * x * (0.5 + 0.5 * sin(p.x * 9.0));',
    '    c = mix(c, vec3(0.05, 0.015, 0.11), smoothstep(mh + px, mh - px, p.y));',
    '    c += uC2 * (0.85 * smoothstep(px * 2.2, 0.0, abs(p.y - mh)) + 0.09 * exp(-abs(p.y - mh) * 50.0));',
    '  } else {',
    '    float dy = hz - p.y + 0.0001;',
    '    float z = 0.35 / dy;',
    '    float gx = p.x * z * 3.0;',
    '    float gz = z * 2.0 + uFlow * 1.2;',
    '    float dX = abs(fract(gx + 0.5) - 0.5);',
    '    float dZ = abs(fract(gz + 0.5) - 0.5);',
    '    float wX = z * 3.0 * px * 1.4, wZ = 0.7 / (dy * dy) * px * 1.4;',
    '    float line = max(smoothstep(wX, 0.0, dX), smoothstep(wZ, 0.0, dZ));',
    '    float halo = max(wX / (dX + wX), wZ / (dZ + wZ));',
    '    float fade = smoothstep(0.0, 0.3, dy);',
    '    vec3 lineC = mix(vec3(1.0, 0.2, 0.75), vec3(0.2, 0.9, 1.0), 0.5 + 0.5 * sin(uTime * 0.2));',
    '    c = vec3(0.035, 0.0, 0.07) + lineC * (line + 0.16 * halo * halo) * fade * (0.7 + 0.6 * uBeat);',
    '    c += vec3(1.0, 0.3, 0.6) * 0.20 * exp(-dy * 9.0);',
    '    c += vec3(1.0, 0.55, 0.35) * 0.16 * exp(-abs(p.x) * 2.6) * exp(-dy * 2.2) * (0.8 + 0.6 * uBass);    // the sun on the road',
    '  }',
    '  return c;',
    '}'
  ] },

  // Fireworks over a bay; shells go up faster when the music pushes.
  { id: 'hanabi', name: 'Fireworks', jp: '花火', src: [
    'vec3 fx(vec2 uv, vec2 p){',
    '  float asp = uRes.x / uRes.y, hz = -0.66;',
    '  if (p.y < hz) {                                                     // the bay: the sky of a moment ago, upside down',
    '    float dy = hz - p.y;',
    '    vec2 m = vec2(p.x + (0.004 + 0.03 * dy) * sin(dy * 120.0 + uTime * 2.2), hz + 0.02 + dy * 4.2);',
    '    return prev(toUv(m)) * vec3(0.42, 0.46, 0.60) * (1.0 - 1.5 * dy) + vec3(0.0, 0.002, 0.008);',
    '  }',
    '  vec3 c = keep(prev(toUv(p * 0.997 + vec2(0.0, 0.0022))), 0.90);     // sparks hang in the air and sink',
    '  c = max(c, mix(vec3(0.016, 0.012, 0.055), vec3(0.0, 0.0, 0.016), uv.y));',
    '  for (int i = 0; i < 5; i++) {',
    '    float fi = float(i);',
    '    float run = uTime * 0.22 + uFlow * 0.12 + fi * 0.37;',
    '    float t = fract(run), n = floor(run);',
    '    float live = fi < 2.5 ? 1.0 : 1.0 - hush();                       // a quieter show while nothing is playing',
    '    vec2 hs = hash22(vec2(n * 3.1 + fi, fi * 7.3 + uSeed));',
    '    vec2 ctr = vec2((hs.x * 2.0 - 1.0) * asp * 0.72, 0.12 + 0.55 * hs.y);',
    '    vec3 ink = pal(hs.x * 3.0 + hs.y);',
    '    if (t < 0.15) {                                                   // the shell climbing',
    '      float up = t / 0.15;',
    '      vec2 rp = vec2(ctr.x + 0.012 * sin(up * 14.0 + fi), mix(hz, ctr.y, 1.0 - (1.0 - up) * (1.0 - up)));',
    '      float dr = length(p - rp);',
    '      c += vec3(1.0, 0.82, 0.55) * 0.5 * live * exp(-dr * dr * 5000.0);',
    '      continue;',
    '    }',
    '    float tb = (t - 0.15) / 0.85, tb0 = max(tb - 0.09, 0.0);          // now, and a moment ago (each spark draws a streak)',
    '    float size = (0.40 + 0.25 * hs.x) * (0.8 + 0.5 * uLevel + 0.2 * hs.y);',
    '    float spread = size * (1.0 - exp(-tb * 5.0)), spread0 = size * (1.0 - exp(-tb0 * 5.0));',
    '    float fall = 0.30 * tb * tb, fall0 = 0.30 * tb0 * tb0;',
    '    float glow = (1.0 - tb) * (1.0 - tb) * (1.0 - 0.6 * tb) * live;',
    '    vec2 dc = p - ctr + vec2(0.0, fall);',
    '    c += mix(ink, vec3(1.0), 0.6) * exp(-tb * 40.0) * exp(-dot(dc, dc) * 220.0) * 0.5 * live;      // the flash',
    '    if (dot(dc, dc) > (spread + 0.09) * (spread + 0.09)) continue;     // this shell is nowhere near',
    '    vec3 ink2 = pal(hs.x * 3.0 + hs.y + 0.36);                         // the heart of the shell has its own colour',
    '    for (int k = 0; k < 28; k++) {',
    '      float fk = float(k);',
    '      vec2 hk = hash22(vec2(fk * 1.7 + n * 0.37, fi * 3.3 + fk * 0.61));',
    '      float a = (fk + 0.8 * hk.x) / 28.0 * TAU;',
    '      vec2 dir = vec2(cos(a), sin(a)) * (0.18 + 0.82 * sqrt(hk.y));',
    '      vec2 pa = ctr + dir * spread - vec2(0.0, fall), ab = dir * (spread0 - spread) + vec2(0.0, fall - fall0), ap = p - pa;',
    '      float along = clamp(dot(ap, ab) / (dot(ab, ab) + 0.000001), 0.0, 1.0);',
    '      float d = length(ap - ab * along), dh = length(ap);',
    '      float tw = 0.65 + 0.35 * sin(uTime * (14.0 + 20.0 * hk.x) + fk * 2.4);',
    '      vec3 sk = mix(mix(ink, ink2, step(hk.y, 0.22)), vec3(1.0), 0.45 * glow);',
    '      c += sk * glow * tw * (exp(-d * d * 5200.0) * (1.0 - 0.8 * along) * 0.30 + exp(-dh * dh * 3600.0) * 0.22 + 0.007 * exp(-dh * 36.0));',
    '    }',
    '  }',
    '  float shore = hz + 0.012 + 0.03 * fbm(vec2(p.x * 2.4 + 5.0, 2.0));',
    '  c = mix(c, vec3(0.0, 0.0, 0.012), smoothstep(shore + 0.004, shore - 0.004, p.y));',
    '  float lx = p.x * 40.0, lh = hash21(vec2(floor(lx), 3.0));',
    '  c = max(c, mix(vec3(1.0, 0.8, 0.5), vec3(0.7, 0.85, 1.0), step(0.93, lh)) * (lh - 0.2) * step(0.74, lh) * smoothstep(0.011, 0.0, length(vec2((fract(lx) - 0.5) / 40.0, p.y - hz - 0.007))));   // a few lights along the shore',
    '  return c;',
    '}'
  ] },

  // A city at night across the water: each tower is a band of the spectrum,
  // windows flicker with the treble, roof lights jump on the beat.
  { id: 'city', name: 'Neon City', jp: '夜景', src: [
    'vec3 fx(vec2 uv, vec2 p){',
    '  float asp = uRes.x / uRes.y, water = -0.45;',
    '  vec2 q = p;',
    '  float refl = 0.0;',
    '  if (p.y < water) { q.y = 2.0 * water - p.y; q.x += (0.006 + 0.02 * (water - p.y)) * sin(p.y * 90.0 + uTime * 2.0); refl = 1.0; }',
    '  float up = q.y - water;',
    '  vec3 c = mix(vec3(0.07, 0.04, 0.16), vec3(0.0, 0.0, 0.035), smoothstep(0.0, 1.2, up));',
    '  c += mix(uC2, vec3(1.0, 0.35, 0.7), 0.5) * 0.11 * exp(-up * 3.2) * (0.7 + 0.9 * uBass);      // the glow of the town on the sky',
    '  vec2 sg = q * 26.0, sh = hash22(floor(sg) + uSeed);',
    '  c += vec3(0.8, 0.86, 1.0) * step(0.88, sh.x) * smoothstep(0.09, 0.0, length(fract(sg) - 0.5 - (sh - 0.5) * 0.6)) * smoothstep(0.3, 0.9, up) * (0.4 + 0.3 * sin(uTime * 2.0 * sh.y + sh.x * 40.0));',
    '  float md = length(q - vec2(asp * 0.55, 0.62));',
    '  c += vec3(1.0, 0.95, 0.85) * (smoothstep(0.1, 0.095, md) * 0.9 + 0.03 / (md + 0.08));',
    '  float fc = (q.x / asp * 0.5 + 0.5) * 47.0 + 3.0, fcol = floor(fc), ffr = fract(fc);       // the far side of town: lower, in haze',
    '  float ftop = 0.08 + 0.30 * hash21(vec2(fcol, 1.7)) * hash21(vec2(floor(fcol / 5.0), 4.4));',
    '  if (up < ftop && ffr > 0.07) {',
    '    c = mix(vec3(0.045, 0.035, 0.10), c, 0.25);',
    '    vec2 fw = vec2(ffr * 3.0, up * 46.0);',
    '    c += vec3(1.0, 0.82, 0.5) * 0.20 * step(0.80, hash21(floor(fw) + fcol * 7.0)) * step(0.3, fract(fw.x)) * step(0.4, fract(fw.y));',
    '  }',
    '  float n = 26.0;',
    '  float cx = (q.x / asp * 0.5 + 0.5) * n;',
    '  float col = floor(cx), fr = fract(cx);',
    '  float v = spec(0.03 + (col / n) * 0.85);',
    '  float top = 0.12 + 0.35 * hash21(vec2(col, 3.7)) + 0.55 * v;',
    '  float lft = 0.08 + 0.12 * hash21(vec2(col, 9.1));',
    '  vec3 neon = pal(hash21(vec2(col, 5.5)) + uTime * 0.02);',
    '  if (fr > lft && fr < 0.94 && up > 0.0) {',
    '    if (up < top) {',
    '      vec3 wall = mix(vec3(0.03, 0.03, 0.065), uC1 * 0.07, 0.5) * (1.0 + 0.9 * exp(-up * 5.0));',
    '      vec2 wg = vec2((fr - lft) / (0.94 - lft) * 3.0, up * 28.0);',
    '      vec2 wid = floor(wg), wf = fract(wg);',
    '      float lit = step(0.52, hash21(wid + col * 13.0 + floor(uTime * (0.2 + 2.0 * uTreb) + hash21(wid))));',
    '      float win = step(0.18, wf.x) * step(wf.x, 0.82) * step(0.3, wf.y) * step(wf.y, 0.8);',
    '      vec3 lamp = mix(vec3(1.0, 0.78, 0.42), vec3(0.62, 0.86, 1.0), step(0.68, hash21(vec2(col, 2.2))));     // warm rooms, and some cold offices',
    '      wall += mix(lamp, uC2, 0.2) * win * lit * (0.5 + 0.5 * v);',
    '      wall += neon * smoothstep(0.014, 0.0, top - up) * (0.7 + uBeat);                       // the roof line',
    '      c = wall;',
    '    } else {',
    '      c += neon * 0.22 * exp(-(up - top) * 30.0) * (0.5 + uBeat);                            // and its glow',
    '    }',
    '  }',
    '  if (refl > 0.5) c *= vec3(0.36, 0.42, 0.52) * (0.8 + 0.2 * sin(p.y * 160.0 + uTime * 3.0));',
    '  return c;',
    '}'
  ] }
];

var VZ = {
  effect: store.get('vizEffect', 'waves'),
  auto: store.get('vizAuto', true),   // move on to the next effect every so often
  gl: null, dead: false, lost: false, isFloat: false,
  api: 0,              // 2 = WebGL 2, 1 = WebGL 1 (older graphics), 0 = none (yet)
  bad2: false,         // WebGL 2 was there but refused to set up: use WebGL 1
  forceApi: 0,         // (tests: 1 or 2)
  tries: 0, retryAt: 0, why: '', renderer: '', glErrors: 0,
  raf: 0, last: 0, t: 0, since: 0, frames: 0, ms: 0,
  vs: null, present: null, progs: {}, bad: {}, errors: [],
  tex: [null, null], fbo: [null, null], cur: 0, w: 0, h: 0, audioTex: null, audioFmt: 0, vao: null, buf: null,
  rings: [], ringAt: 0, ringData: new Float32Array(24),
  seed: Math.random() * 50, osdTimer: 0, idleTimer: 0, c1: [0.5, 0.8, 1], c2: [1, 0.8, 0.4]
};

function vzVisible() { return !!ui.vzPanel && S.showViz && deckShown() && S.seen && !drawDoc().hidden; }
function vzKick() { if (!VZ.raf && vzVisible()) VZ.raf = nextFrame(vzFrame); }

function vzColors() {
  var t = themeNow(), a = hexToRgb(t.lcdFg), b = hexToRgb(t.lit);
  // a very dark lamp colour (some themes) would vanish on a black picture
  if (isDark(t.lit)) b = hexToRgb(t.lcdFg).map(function (v) { return Math.min(255, v + 60); });
  VZ.c1 = [a[0] / 255, a[1] / 255, a[2] / 255];
  VZ.c2 = [b[0] / 255, b[1] / 255, b[2] / 255];
}

function vzEffectAt() {
  for (var i = 0; i < EFFECTS.length; i++) if (EFFECTS[i].id === VZ.effect) return i;
  return 0;
}

function vzCompile(type, src) {
  var gl = VZ.gl, s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    var log = gl.getShaderInfoLog(s);
    gl.deleteShader(s);
    throw new Error(log || 'shader did not compile');
  }
  return s;
}
function vzProgram(fragSrc) {
  var gl = VZ.gl, p = gl.createProgram(), fs = vzCompile(gl.FRAGMENT_SHADER, VZ.api === 1 ? vzGl1(fragSrc, true) : fragSrc);
  gl.attachShader(p, VZ.vs);
  gl.attachShader(p, fs);
  gl.bindAttribLocation(p, 0, 'aPos');
  gl.linkProgram(p);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    var log = gl.getProgramInfoLog(p);
    gl.deleteProgram(p);
    throw new Error(log || 'program did not link');
  }
  var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS), i, info;
  for (i = 0; i < n; i++) {
    info = gl.getActiveUniform(p, i);
    if (info) u[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, info.name);
  }
  return { p: p, u: u };
}

// Get a drawing context and the things every effect shares: WebGL 2 if the
// computer offers it, else WebGL 1 (older or limited graphics). If neither
// works it tries again a few times (the browser's graphics part may just be
// restarting), and only then settles for plain 2D bars - saying why on the
// panel, with a key to try again.
var VZ_ATTRS = { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false };

function vzHook(c) {
  if (c._mpHooked) return;
  c._mpHooked = true;
  c.addEventListener('webglcontextlost', function (e) {
    e.preventDefault();
    if (c !== ui.vzCanvas) return;
    VZ.gl = null; VZ.lost = true; VZ.progs = {}; VZ.tex = [null, null]; VZ.fbo = [null, null]; VZ.w = VZ.h = 0;
    VZ.errors.push('the graphics context was lost');
  });
  c.addEventListener('webglcontextrestored', function () { if (c === ui.vzCanvas) { VZ.lost = false; vzKick(); } });
}

// A canvas keeps the kind of context it first had: a fresh one for each new try.
function vzNewCanvas() {
  var old = ui.vzCanvas, c = h('canvas', { class: 'mpv-canvas', 'aria-hidden': 'true' });
  if (old && old.parentNode) old.parentNode.replaceChild(c, old);
  ui.vzCanvas = c;
  VZ.gl = null; VZ.api = 0; VZ.lost = false; VZ.progs = {}; VZ.tex = [null, null]; VZ.fbo = [null, null];
  VZ.w = VZ.h = 0; VZ.vs = VZ.present = VZ.audioTex = VZ.vao = VZ.buf = null;
}

function vzSetup() {
  var gl = VZ.gl, two = VZ.api === 2;
  VZ.isFloat = two && !!gl.getExtension('EXT_color_buffer_float');
  VZ.vs = vzCompile(gl.VERTEX_SHADER, two ? VZ_VERT : vzGl1(VZ_VERT, false));
  VZ.present = vzProgram(VZ_PRESENT);
  if (two) { VZ.vao = gl.createVertexArray(); gl.bindVertexArray(VZ.vao); }
  VZ.buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, VZ.buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  VZ.audioFmt = two ? gl.RED : gl.LUMINANCE;
  VZ.audioTex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, VZ.audioTex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, two ? gl.R8 : gl.LUMINANCE, 512, 4, 0, VZ.audioFmt, gl.UNSIGNED_BYTE, AU.tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  var err = gl.getError();
  if (err) throw new Error('graphics error 0x' + err.toString(16) + ' while setting up');
  var d = gl.getExtension('WEBGL_debug_renderer_info');
  VZ.renderer = String((d && gl.getParameter(d.UNMASKED_RENDERER_WEBGL)) || gl.getParameter(gl.RENDERER) || '').slice(0, 120);
}

function vzStart() {
  if (VZ.gl) return true;
  if (VZ.dead || VZ.lost) return false;
  var now = performance.now();
  if (now < VZ.retryAt) return false;
  var apis = VZ.forceApi ? [VZ.forceApi] : VZ.bad2 ? [1] : [2, 1], k, api, gl;
  for (k = 0; k < apis.length; k++) {
    api = apis[k];
    gl = null;
    vzHook(ui.vzCanvas);
    try { gl = ui.vzCanvas.getContext(api === 2 ? 'webgl2' : 'webgl', VZ_ATTRS); }
    catch (e) { VZ.errors.push('WebGL ' + api + ': ' + errText(e)); }
    if (!gl) { if (VZ.errors.length < 40) VZ.errors.push('WebGL ' + api + ' is not available'); continue; }
    VZ.gl = gl;
    VZ.api = api;
    try {
      vzSetup();
      VZ.tries = 0;
      VZ.progs = {};
      VZ.w = VZ.h = 0;
      dlog('visualizer: WebGL ' + api + ', ' + VZ.renderer);
      vzNote();
      return true;
    } catch (e) {
      VZ.errors.push('setting up WebGL ' + api + ': ' + errText(e));
      if (api === 2) VZ.bad2 = true;
      vzNewCanvas();
    }
  }
  if (++VZ.tries >= 4) {
    vzGiveUp(VZ.errors.some(function (x) { return /setting up/.test(x); })
      ? 'the graphics card refused the effects (' + VZ.errors[VZ.errors.length - 1].slice(0, 90) + ')'
      : 'the browser is not letting this page use the graphics card. In the browser\'s settings (System), turn on "Use graphics acceleration when available", then restart Music Player.');
    return false;
  }
  VZ.retryAt = now + 2500 * VZ.tries;
  return false;
}

// Settle for plain 2D bars, and say why on the panel.
function vzGiveUp(why) {
  VZ.dead = true;
  VZ.why = why;
  dlog('visualizer: ' + why + ' | ' + VZ.errors.slice(-4).join(' | '));
  try { console.warn('Music Player visualizer: ' + why, VZ.errors); } catch (e) {}
  vzNewCanvas();                       // (a canvas that had a WebGL context cannot draw in 2D)
  vzNote();
}

// Start again from scratch (the TRY AGAIN key).
function vzRetry() {
  VZ.dead = false; VZ.tries = 0; VZ.retryAt = 0; VZ.bad2 = false; VZ.bad = {}; VZ.errors = []; VZ.why = ''; VZ.glErrors = 0;
  vzNewCanvas();
  vzNote();
  vzKick();
}

// What the panel says about the graphics: a line on the picture when only the
// plain bars can be drawn, and the details at the bottom of the effects list.
function vzNote() {
  if (ui.vzNote) {
    ui.vzNoteText.textContent = VZ.dead ? 'PLAIN BARS ONLY: ' + VZ.why : '';
    ui.vzNote.hidden = !VZ.dead;
  }
  if (ui.vzInfo) {
    var bad = EFFECTS.filter(function (fx) { return VZ.bad[fx.id]; }).length;
    ui.vzInfo.textContent = VZ.dead ? 'Graphics: not available - ' + VZ.why
      : VZ.api ? 'Graphics: WebGL ' + VZ.api + (VZ.renderer ? '  ·  ' + VZ.renderer : '') + (bad ? '  ·  ' + bad + ' effect(s) could not start here' : '')
      : 'Graphics: starting...';
  }
  vzMenuSync();
}

// The two pictures the effects paint into in turn.
function vzTargets(w, h) {
  var gl = VZ.gl, i, t;
  for (i = 0; i < 2; i++) {
    if (VZ.tex[i]) gl.deleteTexture(VZ.tex[i]);
    if (!VZ.fbo[i]) VZ.fbo[i] = gl.createFramebuffer();
    t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, t);
    if (VZ.isFloat) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, VZ.api === 2 ? gl.RGBA8 : gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // (WebGL 1 only allows clamping on pictures whose sides are not powers of two)
    var wrap = VZ.api === 2 ? gl.MIRRORED_REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    gl.bindFramebuffer(gl.FRAMEBUFFER, VZ.fbo[i]);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    VZ.tex[i] = t;
    if (VZ.isFloat && gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      VZ.isFloat = false;                 // no high-precision pictures here: use ordinary ones
      vzTargets(w, h);
      return;
    }
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  VZ.w = w; VZ.h = h; VZ.cur = 0;
}

function vzProgFor(fx) {
  if (VZ.progs[fx.id]) return VZ.progs[fx.id];
  if (VZ.bad[fx.id]) return null;
  try {
    VZ.progs[fx.id] = vzProgram(VZ_HEAD + fx.src.join('\n') + VZ_MAIN);
  } catch (e) {
    VZ.bad[fx.id] = String(e && e.message || e).replace(/\s+/g, ' ').slice(0, 300) || 'could not start';
    VZ.errors.push(fx.id + ': ' + VZ.bad[fx.id]);
    dlog('visualizer: effect ' + fx.id + ' could not start: ' + VZ.bad[fx.id]);
    vzNote();
    return null;
  }
  return VZ.progs[fx.id];
}

function vzFrame(now) {
  VZ.raf = 0;
  if (!vzVisible()) return;
  VZ.raf = nextFrame(vzFrame);
  if (now - VZ.last < 11.5) return;                   // 60 to 85 pictures a second, however fast the screen is
  var dt = VZ.last ? Math.min(0.1, (now - VZ.last) / 1000) : 0.016;
  VZ.last = now;
  VZ.t += dt;
  VZ.since += dt;

  if (S.state === 'play') auWant(now);
  auFrame(now);

  // ripples: one per beat, or a slow drip when nothing is playing
  if (AU.hit || VZ.t - VZ.ringAt > (AU.mode === 'idle' ? 2.6 : 1.4)) {
    VZ.ringAt = VZ.t;
    VZ.rings.push({ x: (Math.random() * 2 - 1) * 0.8, y: (Math.random() * 2 - 1) * 0.7, t: VZ.t, s: AU.hit ? 0.8 + 0.5 * AU.bass : 0.45 });
    if (VZ.rings.length > 6) VZ.rings.shift();
  }
  // on AUTO: move on after a while, on a beat if one comes along
  if (VZ.auto && ui.vzMenu.hidden && VZ.since > 34 && (AU.hit || VZ.since > 42)) vzStep(1, true);

  var t0 = performance.now();
  if (vzStart()) vzDraw(); else if (VZ.dead) vzDraw2d();
  VZ.ms += (performance.now() - t0 - VZ.ms) * 0.1;
  VZ.frames++;
}

function vzSize() {
  var box = ui.vzScreen, cw = box.clientWidth, ch = box.clientHeight;
  if (cw < 8 || ch < 8) return null;
  var k = Math.min(drawWin().devicePixelRatio || 1, 1.5);
  var w = Math.round(cw * k), h = Math.round(ch * k), over = (w * h) / 1400000;
  if (over > 1) { k = 1 / Math.sqrt(over); w = Math.round(w * k); h = Math.round(h * k); }
  var c = ui.vzCanvas;
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return [w, h];
}

function vzDraw() {
  var gl = VZ.gl, size = vzSize(), fx, pr, tries = 0, u, i, r;
  if (!size) return;
  if (VZ.w !== size[0] || VZ.h !== size[1]) vzTargets(size[0], size[1]);

  fx = EFFECTS[vzEffectAt()];
  pr = vzProgFor(fx);
  while (!pr && ++tries <= EFFECTS.length) {            // an effect this card refuses: move on
    VZ.effect = EFFECTS[(vzEffectAt() + 1) % EFFECTS.length].id;
    fx = EFFECTS[vzEffectAt()];
    pr = vzProgFor(fx);
  }
  if (!pr) {
    if (VZ.api === 2 && !VZ.forceApi) {                  // perhaps they run in the older mode
      VZ.bad2 = true; VZ.bad = {};
      VZ.errors.push('no effect started with WebGL 2: trying WebGL 1');
      vzNewCanvas();
      return;
    }
    vzGiveUp('none of the effects could start on this graphics card (' + String(VZ.errors[VZ.errors.length - 1] || '').slice(0, 90) + ')');
    return;
  }

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, VZ.audioTex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 512, 4, VZ.audioFmt, gl.UNSIGNED_BYTE, AU.tex);

  var src = VZ.cur, dst = 1 - src;
  gl.bindFramebuffer(gl.FRAMEBUFFER, VZ.fbo[dst]);
  gl.viewport(0, 0, VZ.w, VZ.h);
  gl.useProgram(pr.p);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, VZ.tex[src]);
  u = pr.u;
  if (u.uPrev) gl.uniform1i(u.uPrev, 0);
  if (u.uAudio) gl.uniform1i(u.uAudio, 1);
  if (u.uRes) gl.uniform2f(u.uRes, VZ.w, VZ.h);
  if (u.uTime) gl.uniform1f(u.uTime, VZ.t);
  if (u.uBass) gl.uniform1f(u.uBass, AU.bass);
  if (u.uMid) gl.uniform1f(u.uMid, AU.mid);
  if (u.uTreb) gl.uniform1f(u.uTreb, AU.treb);
  if (u.uLevel) gl.uniform1f(u.uLevel, AU.level);
  if (u.uBeat) gl.uniform1f(u.uBeat, AU.beat);
  if (u.uFlow) gl.uniform1f(u.uFlow, AU.flow % 4096);
  if (u.uSeed) gl.uniform1f(u.uSeed, VZ.seed);
  if (u.uC1) gl.uniform3f(u.uC1, VZ.c1[0], VZ.c1[1], VZ.c1[2]);
  if (u.uC2) gl.uniform3f(u.uC2, VZ.c2[0], VZ.c2[1], VZ.c2[2]);
  if (u.uRing) {
    for (i = 0; i < 6; i++) {
      r = VZ.rings[i];
      VZ.ringData[i * 4] = r ? r.x * VZ.w / VZ.h : 0;
      VZ.ringData[i * 4 + 1] = r ? r.y : 0;
      VZ.ringData[i * 4 + 2] = r ? VZ.t - r.t : 0;
      VZ.ringData[i * 4 + 3] = r && VZ.t - r.t < 7 ? r.s : 0;
    }
    gl.uniform4fv(u.uRing, VZ.ringData);
  }
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, VZ.w, VZ.h);
  gl.useProgram(VZ.present.p);
  gl.bindTexture(gl.TEXTURE_2D, VZ.tex[dst]);
  if (VZ.present.u.uTex) gl.uniform1i(VZ.present.u.uTex, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  VZ.cur = dst;

  // Now and then: did the graphics card complain? Three times in a row and
  // this effect is put aside (and if that leaves none, the older mode or the
  // plain bars take over, saying why).
  if (VZ.frames % 30 === 0) {
    var err = gl.getError();
    if (!err) { VZ.glErrors = 0; return; }
    VZ.errors.push(fx.id + ': graphics error 0x' + err.toString(16) + ' while drawing');
    if (++VZ.glErrors >= 3) {
      VZ.glErrors = 0;
      VZ.bad[fx.id] = 'graphics error 0x' + err.toString(16) + ' while drawing';
      delete VZ.progs[fx.id];
      vzNote();
    }
  }
}

// Without WebGL: plain bars and a scope line.
function vzDraw2d() {
  var size = vzSize(), c = ui.vzCanvas, g, i, w, h, n = 48, t = themeNow();
  if (!size) return;
  try { g = c.getContext('2d'); } catch (e) { return; }
  if (!g) return;
  w = size[0]; h = size[1];
  g.fillStyle = '#000';
  g.fillRect(0, 0, w, h);
  g.fillStyle = t.lcdFg;
  for (i = 0; i < n; i++) {
    var v = AU.spec[4 + Math.floor(i * 240 / n)], bh = Math.round(v * h * 0.8);
    g.fillRect(Math.round(i * w / n) + 1, h - bh, Math.max(1, Math.floor(w / n) - 2), bh);
  }
  g.strokeStyle = '#fff';
  g.lineWidth = Math.max(1, h / 300);
  g.beginPath();
  for (i = 0; i < 512; i++) {
    var y = h * 0.3 - AU.waveL[i] * h * 0.22;
    if (i) g.lineTo(i * w / 511, y); else g.moveTo(0, y);
  }
  g.stroke();
}

// ---- visualizer: choosing effects, messages on the picture ----
function vzSet(id, byUser) {
  var fx = null, i;
  for (i = 0; i < EFFECTS.length; i++) if (EFFECTS[i].id === id) fx = EFFECTS[i];
  if (!fx) return;
  // say so, rather than seeming to ignore the choice
  if (VZ.dead) { vzOsd(fx.jp, 'EFFECTS CANNOT RUN HERE - SEE THE NOTE ON THE PICTURE'); return; }
  if (VZ.bad[id]) { vzOsd(fx.jp, fx.name.toUpperCase() + ' CANNOT RUN ON THIS COMPUTER'); return; }
  VZ.effect = id;
  VZ.since = 0;
  if (byUser) store.set('vizEffect', id);
  vzOsd(fx.jp, fx.name.toUpperCase());
  vzMenuSync();
  vzKick();
}
function vzStep(d, auto) {
  var n = EFFECTS.length, i = vzEffectAt(), tries = 0;
  do { i = (i + d + n) % n; } while (VZ.bad[EFFECTS[i].id] && ++tries < n);
  vzSet(EFFECTS[i].id, !auto);
}
function vzSetAuto(on, keep) {
  VZ.auto = !!on;
  VZ.since = 0;
  if (keep !== false) store.set('vizAuto', VZ.auto);
  if (ui.vzAuto) {
    ui.vzAuto.setAttribute('data-on', VZ.auto ? '1' : '0');
    ui.vzAuto.setAttribute('aria-pressed', VZ.auto ? 'true' : 'false');
  }
}
function vzOsd(ja, en) {
  if (!ui.vzOsd) return;
  ui.vzOsdJp.textContent = ja || '';
  ui.vzOsdEn.textContent = en || '';
  ui.vzOsd.setAttribute('data-show', '1');
  clearTimeout(VZ.osdTimer);
  VZ.osdTimer = setTimeout(function () { ui.vzOsd.setAttribute('data-show', '0'); }, 2600);
}
// in the big view, name the song when it changes
function vzSongOsd() {
  if (!S.vizBig || !S.showViz) return;
  var info = itemInfo(nowItem());
  if (info.id) vzOsd('♪', (info.artist ? info.artist + ' - ' : '') + info.title);
}
function vzMenuSync() {
  if (!ui.vzMenu) return;
  var items = ui.vzMenu.querySelectorAll('[data-effect]'), i, id;
  for (i = 0; i < items.length; i++) {
    id = items[i].getAttribute('data-effect');
    items[i].setAttribute('aria-pressed', id === VZ.effect && !VZ.dead ? 'true' : 'false');
    if (VZ.bad[id] || VZ.dead) { items[i].setAttribute('data-bad', '1'); items[i].title = 'Cannot run on this computer: ' + (VZ.bad[id] || VZ.why); }
    else { items[i].removeAttribute('data-bad'); items[i].removeAttribute('title'); }
  }
}
function vzMenu(open) {
  if (!ui.vzMenu) return;
  ui.vzMenu.hidden = !open;
  if (open) vzMenuSync();
}
// LIVE = drawing the real sound, DEMO = the built-in tune stands in
function vzStatus() {
  if (!ui.vzSrc) return;
  var m = AU.mode, ts = AU.tapState, failed = ts.lastIndexOf('failed', 0) === 0;
  ui.vzSrc.textContent = m === 'live' ? 'LIVE' : m === 'demo' ? 'DEMO' : '';
  ui.vzSrc.setAttribute('data-s', m);
  ui.vzSrc.title = m === 'live' ? 'Moving with the sound the app is playing'
    : m === 'demo' ? 'The app cannot hear the music right now' + (failed ? ' (' + ts + ')' : '') + ', so a built-in animation is shown'
    : '';
  vzHintSync();
}

// When the extension cannot listen, the picture says so, over the built-in tune.
function vzHintSync() {
  if (!ui.vzHint) return;
  var m = AU.mode, ts = AU.tapState, why = '';
  if (HOST_KIND === 'mac' && m === 'demo' && !VZ.hintOff) {
    if (ts === 'click') why = 'DEMO BEAT - the browser did not let the player hear its own sound. ' +
      'Open the player from the Stream Player app (it starts the browser so that it may), or click the Stream Player button in the toolbar.';
    else if (ts === 'busy') why = 'DEMO BEAT - it is listening to another window; only one can be heard at a time.';
    else if (ts.lastIndexOf('failed', 0) === 0) why = 'DEMO BEAT - listening to the music did not work (' + ts.slice(7) + '). It tries again by itself.';
  }
  ui.vzHintText.textContent = why;
  ui.vzHint.title = why;
  ui.vzHint.hidden = !why;
  if (why) ui.vzSrc.title = why;
}
// big view: the strip of keys hides while the mouse rests
function vzIdle(idle) {
  if (!ui.vzPanel) return;
  clearTimeout(VZ.idleTimer);
  ui.vzPanel.setAttribute('data-idle', idle ? '1' : '0');
  if (!idle && S.vizBig) VZ.idleTimer = setTimeout(function () { if (S.vizBig && ui.vzMenu.hidden) vzIdle(true); }, 2600);
}
function setVizBig(on) {
  on = !!on && deckShown();
  if (on && !S.showViz) setPanel('viz', true);
  S.vizBig = on;
  syncPanels();
  vzIdle(false);
  if (on) vzSongOsd();
  lyBigLine();
  vzKick();
}

// ============================================================================
// Lyrics
// The lyrics of the song that is playing, from LRCLIB (see lyrics.js): most
// come timed line by line, so they follow the song; some are plain text.
// ============================================================================

// ---- the clock for the current song ----
// Both services' players know the position to the millisecond, so the
// lyrics follow it directly.
var CK = { have: true, lastT: -1 };
function clockSample() {}
function songTime() {
  var t = 0;
  try { t = (S.music && S.music.currentPlaybackTime) || 0; } catch (x) {}
  return t;
}

var LY = {
  roma: store.get('lyrRoma', true),     // show the romanised reading when there is one
  trans: store.get('lyrTrans', true),   // show the translation when there is one
  key: '',              // id of the song the panel is showing
  state: 'idle',        // idle | empty (nothing playing) | loading | ready | none | error
  data: null,           // {lines, synced, hasRo, hasTr, writers, lang}
  cache: {}, cached: [],
  token: 0, rows: [], active: -1, raf: 0, last: 0, userAt: -1e9
};

function lyVisible() { return !!ui.lyPanel && S.showLyr && deckShown(); }
function lyKick() {
  if (!LY.raf && lyVisible() && S.seen && LY.data && LY.data.synced && !drawDoc().hidden) LY.raf = nextFrame(lyFrame);
}

function ttTime(s) {                    // "5.932", "1:21.726", "1:02:03.5" -> seconds
  if (!s) return -1;
  var parts = String(s).split(':'), t = 0, i;
  for (i = 0; i < parts.length; i++) t = t * 60 + (parseFloat(parts[i]) || 0);
  return t;
}

// Lyrics as lyrics.js finds them, in the shape the panel draws: a row of
// dots for the intro and for long stretches without words.
function lyBuild(found) {
  if (!found || !found.lines || !found.lines.length) return null;
  var synced = !!found.synced, out = [], prevEnd = 0;
  found.lines.forEach(function (l) {
    var ln = { b: synced ? l.b : -1, e: synced ? l.e : -1, t: l.t || '', parts: null, ro: '', tr: '', side: '' };
    if (synced && !ln.t) return;              // (an empty line ends the one before; long pauses get dots below)
    if (synced && ln.b - prevEnd > (out.length ? 8 : 4))
      out.push({ b: out.length ? prevEnd + 0.5 : 0, e: ln.b, t: '', gap: true, parts: null, ro: '', tr: '', side: '' });
    out.push(ln);
    if (synced) prevEnd = Math.max(ln.b, ln.e);
  });
  if (!out.some(function (l) { return l.t; })) return null;
  return { lines: out, synced: synced, hasRo: false, hasTr: false, writers: [], lang: '', credit: 'Lyrics from LRCLIB (lrclib.net)' };
}

function lyFetch(info) {
  if (!window.MPLyrics) return Promise.resolve(null);
  return window.MPLyrics.find({ title: info.title, artist: info.artist, album: info.album, duration: info.dur, loose: SVC.id === 'soundcloud' })
    .then(lyBuild);
}

function lyMsg(big, small, key) {
  LY.data = null;
  LY.rows = [];
  LY.active = -1;
  ui.lyBody.replaceChildren(h('div', { class: 'mpl-msg' }, h('div', { class: 'big', text: big }), small ? h('div', { text: small }) : null, key || null));
  ui.lyBody.scrollTop = 0;
  ui.lyPanel.setAttribute('data-synced', '0');
  ui.lyRo.hidden = ui.lyTr.hidden = true;
  lyBigLine();
}
function lyNone() {
  LY.state = 'none';
  lyMsg('NO LYRICS FOR THIS SONG', '歌詞なし');
}

// Show the lyrics of the song that is playing (fetching them if need be).
function lyRefresh(force) {
  if (!ui.lyPanel || LY.hold) return;          // (LY.hold, LY.testItem: for tests)
  // not on screen: a forced refresh (signed in, say) is done when it is shown again
  if (!lyVisible()) { if (force) LY.state = 'idle'; return; }
  var it = LY.testItem || nowItem(), info = itemInfo(it);
  if (!it) {
    if (LY.state === 'empty') return;
    LY.key = ''; LY.state = 'empty'; LY.token++;
    lyMsg('NOTHING PLAYING', 'Lyrics show up here when a song with lyrics plays.');
    return;
  }
  var cid = SVC.id + ':' + info.id;           // (lyrics are kept by service and song)
  if (!force && LY.key === cid && LY.state !== 'idle') return;
  LY.key = cid;
  LY.token++;
  if (LY.cache[cid] !== undefined) { if (LY.cache[cid]) lyShow(LY.cache[cid]); else lyNone(); return; }

  LY.state = 'loading';
  lyMsg('LOADING LYRICS', '読込中');
  var tok = LY.token;
  lyFetch(info).then(function (data) {
    LY.cache[cid] = data || null;
    LY.cached.push(cid);
    if (LY.cached.length > 40) delete LY.cache[LY.cached.shift()];
    if (tok !== LY.token) return;
    if (data) lyShow(data); else lyNone();
  }, function (e) {
    if (tok !== LY.token) return;
    if (/40[34]|not found|no related/i.test(errText(e))) { lyNone(); return; }
    // a network hiccup: ask again by itself, twice, before giving up
    if (LY.triesFor !== cid) { LY.triesFor = cid; LY.tries = 0; }
    if (++LY.tries < 3) {
      setTimeout(function () { if (tok === LY.token) lyRefresh(true); }, 4000 * LY.tries);
      return;
    }
    LY.state = 'error';
    lyMsg('COULD NOT LOAD LYRICS', errText(e), textKey('lyrretry', 'TRY AGAIN', null, 'Ask for the lyrics again'));
  });
}

function lyShow(data) {
  LY.data = data;
  LY.state = 'ready';
  LY.active = -1;
  LY.rows = [];
  var frag = document.createDocumentFragment();
  data.lines.forEach(function (ln, i) {
    var t = h('div', { class: 'mpl-t' }), words = null;
    if (ln.gap) { t.appendChild(h('i')); t.appendChild(h('i')); t.appendChild(h('i')); }
    else if (ln.parts) {
      words = [];
      ln.parts.forEach(function (x) {
        if (x.b < 0) { t.appendChild(document.createTextNode(x.t)); return; }
        var w = h('span', { class: x.bg ? 'w bg' : 'w', text: x.t });
        t.appendChild(w);
        words.push({ el: w, b: x.b, e: Math.max(x.e, x.b + 0.05), p: -1 });
      });
    } else t.textContent = ln.t;
    var row = h('div', { class: 'mpl-line', 'data-i': String(i), 'data-gap': ln.gap ? '1' : null, 'data-side': ln.side || null, lang: data.lang || null },
      t, ln.ro ? h('div', { class: 'mpl-ro', lang: 'en', text: ln.ro }) : null, ln.tr ? h('div', { class: 'mpl-tr', lang: 'en', text: ln.tr }) : null);
    row._w = words;
    frag.appendChild(row);
    LY.rows.push(row);
  });
  if (data.writers.length) frag.appendChild(h('div', { class: 'mpl-credit', text: 'Written by ' + data.writers.join(', ') }));
  if (data.credit) frag.appendChild(h('div', { class: 'mpl-credit', text: data.credit }));
  if (!data.synced) frag.appendChild(h('div', { class: 'mpl-credit', text: 'These lyrics are not timed, so they do not follow the song.' }));
  ui.lyBody.replaceChildren(frag);
  ui.lyBody.scrollTop = 0;
  ui.lyPanel.setAttribute('data-synced', data.synced ? '1' : '0');
  ui.lyRo.hidden = !data.hasRo;
  ui.lyTr.hidden = !data.hasTr;
  lySyncKeys();
  lyBigLine();                        // (the big view may still show the previous song's line)
  LY.userAt = -1e9;
  lyKick();
}

function lySyncKeys() {
  if (!ui.lyPanel) return;
  ui.lyPanel.setAttribute('data-roma', LY.roma ? '1' : '0');
  ui.lyPanel.setAttribute('data-trans', LY.trans ? '1' : '0');
  [[ui.lyRo, LY.roma], [ui.lyTr, LY.trans]].forEach(function (x) {
    x[0].setAttribute('data-on', x[1] ? '1' : '0');
    x[0].setAttribute('aria-pressed', x[1] ? 'true' : 'false');
  });
}

// Follow the song: light the line being sung, fill its words, keep it in view.
function lyFrame(now) {
  LY.raf = 0;
  if (!lyVisible() || !S.seen || !LY.data || !LY.data.synced || drawDoc().hidden) return;
  LY.raf = nextFrame(lyFrame);
  if (now - LY.last < 30) return;
  LY.last = now;
  clockSample();
  // (LY.testTime: a made-up position, so the following can be checked without playing)
  var L = LY.data.lines, t = (typeof LY.testTime === 'number' ? LY.testTime : songTime()) + 0.06, i = LY.active, lo, hi, mid;
  if (i < 0 || i >= L.length || t < L[i].b || (i + 1 < L.length && t >= L[i + 1].b)) {
    lo = 0; hi = L.length - 1; i = -1;
    while (lo <= hi) { mid = (lo + hi) >> 1; if (L[mid].b <= t) { i = mid; lo = mid + 1; } else hi = mid - 1; }
  }
  // past the end of the last line: the outro, nothing is being sung
  if (i === L.length - 1 && !L[i].gap && L[i].e > L[i].b && t > L[i].e + 0.5) i = -1;
  if (i !== LY.active) lySetActive(i, now);
  var row = i >= 0 ? LY.rows[i] : null, ws = row && row._w, k, w, p;
  if (ws) {
    for (k = 0; k < ws.length; k++) {
      w = ws[k];
      p = t >= w.e ? 1 : t <= w.b ? 0 : (t - w.b) / (w.e - w.b);
      if (p !== w.p) { w.p = p; w.el.style.setProperty('--p', p.toFixed(3)); }
    }
  }
}

function lySetActive(i, now) {
  var old = LY.rows[LY.active], row = i >= 0 ? LY.rows[i] : null;
  if (old) old.removeAttribute('data-on');
  LY.active = i;
  if (row) {
    row.setAttribute('data-on', '1');
    // leave the list alone for a moment after the listener scrolled it themselves
    if (now - LY.userAt > 3500) {
      var body = ui.lyBody, top = row.offsetTop - (body.clientHeight - row.offsetHeight) * 0.36;
      try { body.scrollTo({ top: Math.max(0, top), behavior: 'smooth' }); } catch (e) { body.scrollTop = Math.max(0, top); }
    }
  }
  lyBigLine();
}

// The line being sung, laid over the big visualizer.
function lyBigLine() {
  if (!ui.vzLyric) return;
  var ln = S.vizBig && S.showLyr && LY.data && LY.data.synced && LY.active >= 0 ? LY.data.lines[LY.active] : null;
  if (!ln || ln.gap) { ui.vzLyric.setAttribute('data-show', '0'); return; }
  ui.vzLyricT.textContent = ln.t;
  ui.vzLyricS.textContent = (LY.roma && ln.ro) || (LY.trans && ln.tr) || '';
  ui.vzLyric.setAttribute('data-show', '1');
}

function onLyricsClick(e) {
  var key = e.target.closest && e.target.closest('[data-act]');
  if (key) { onActClick(e); return; }
  var row = e.target.closest && e.target.closest('.mpl-line');
  if (!row || !LY.data || !LY.data.synced) return;
  var ln = LY.data.lines[+row.getAttribute('data-i')];
  if (!ln || ln.gap) return;
  LY.userAt = -1e9;
  call('seekToTime', Math.max(0, ln.b + 0.01));
}

// ============================================================================
// Library data. Everything comes from the service the switch is set to (SVC,
// see services/), already in the shapes below. Results are kept in memory, and
// the big lists are also saved locally so the next start shows them at once
// and refreshes them in the background. Each service has its own copy.
// ============================================================================
function freshDb() {
  return {
    playlists: null,      // [{id, kind:'playlist', n, a, art, tc, ed, own}]
    recent: null,         // [{id, kind, n, a, art}]
    albums: null,         // [{id, kind:'album', n, a, art, tc}]
    artists: null,        // [{id, n}]
    songs: [],            // [{id, cid, n, a, al, d, art, tn}] - may have holes while loading
    songsTotal: -1,
    songsState: 'idle',   // idle | loading | done
    tracks: {},           // 'playlist:<id>' / 'album:<id>' -> songs
    artistAlbums: {},     // artist id -> {songs, albums}
    busy: {}
  };
}
var DBS = {};
SVC_IDS.forEach(function (k) { DBS[k] = freshDb(); });
var DB = DBS[SVC.id];
// the saved copies, one set per service
function ck(name, svc) { return 'c.' + (svc || SVC).id + '.' + name; }

// Run a loader once at a time per key.
function once(key, fn) {
  if (DB.busy[key]) return DB.busy[key];
  var db = DB;
  var p = fn().then(function (v) { delete db.busy[key]; return v; }, function (e) { delete db.busy[key]; throw e; });
  db.busy[key] = p;
  return p;
}

function loadPlaylists() {
  return once('playlists', function () {
    var svc = SVC, db = DB;
    return svc.playlists().then(function (list) {
      db.playlists = list;
      store.set(ck('playlists', svc), list);
      if (svc === SVC) renderNavPlaylists();
      return list;
    });
  });
}
function loadRecent() {
  return once('recent', function () {
    var svc = SVC, db = DB;
    return svc.recent().then(function (list) { db.recent = list; store.set(ck('recent', svc), list); return list; });
  });
}
function loadAlbums(onChunk) {
  return once('albums', function () {
    var svc = SVC, db = DB;
    return svc.albums(db.albums ? null : onChunk).then(function (list) {
      db.albums = list; store.set(ck('albums', svc), list); return list;
    });
  });
}
function loadArtists(onChunk) {
  return once('artists', function () {
    var svc = SVC, db = DB;
    return svc.artists(db.artists ? null : onChunk).then(function (list) {
      db.artists = list; store.set(ck('artists', svc), list); return list;
    });
  });
}

// All saved songs (Spotify: Liked Songs; SoundCloud: likes). Where the
// service says how many there are, the first page tells, and the rest are
// fetched three pages at a time; where it only says "there is more", page
// after page. With a saved copy on screen the fresh list replaces it once
// complete; without one, rows fill in as pages arrive.
function loadSongs(onProgress) {
  if (DB.songsState !== 'idle') return;
  var svc = SVC, db = DB, size = svc.songsPageSize || 50;
  db.songsState = 'loading';
  var haveCopy = db.songs.length > 0;
  function liked(list) { list.forEach(function (s) { if (s) s.lib = true; }); return list; }
  function finish(list, ok) {
    db.songs = list.filter(Boolean);
    db.songsTotal = db.songs.length;
    db.songsState = ok ? 'done' : 'idle';
    if (ok) saveSongs(svc, db);
    if (onProgress) onProgress();
  }
  if (svc.songsAll) {
    svc.songsAll(function (part) {
      if (!haveCopy) { db.songs = liked(part.slice()); db.songsTotal = db.songs.length; if (onProgress) onProgress(); }
    }).then(function (list) { finish(liked(list), true); }, function () { db.songsState = 'idle'; if (onProgress) onProgress(); });
    return;
  }
  svc.songsPage(0, size).then(function (d) {
    var total = d.total || d.items.length;
    var fresh = new Array(total);
    function put(offset, items) { liked(items); for (var i = 0; i < items.length; i++) fresh[offset + i] = items[i]; }
    put(0, d.items);
    function show() {
      if (!haveCopy) { db.songs = fresh; db.songsTotal = total; if (onProgress) onProgress(); }
    }
    show();
    var offsets = [], o;
    for (o = size; o < total; o += size) offsets.push(o);
    var failed = 0;
    function worker() {
      if (!offsets.length) return Promise.resolve();
      var off = offsets.shift();
      return svc.songsPage(off, size)
        .then(function (dd) { put(off, dd.items); show(); }, function () { failed++; })
        .then(worker);
    }
    return Promise.all([worker(), worker(), worker()]).then(function () { finish(fresh, !failed); });
  }).catch(function () { db.songsState = 'idle'; if (onProgress) onProgress(); });
}

// Songs are saved as plain arrays to keep the copy small.
function saveSongs(svc, db) {
  svc = svc || SVC; db = db || DB;
  var rows = [];
  for (var i = 0; i < db.songs.length; i++) {
    var s = db.songs[i];
    if (!s) return;
    rows.push([s.id, s.cid, s.n, s.a, s.al, s.d, s.art, s.tn, svc.rowExtra ? svc.rowExtra(s) : 0]);
  }
  if (!store.set(ck('songs', svc), rows)) store.del(ck('songs', svc));   // too big for local storage: go without
}
function readCache() {
  SVC_IDS.forEach(function (k) {
    var svc = SVCS[k], db = DBS[k];
    db.playlists = store.get(ck('playlists', svc), null);
    db.recent = store.get(ck('recent', svc), null);
    db.albums = store.get(ck('albums', svc), null);
    db.artists = store.get(ck('artists', svc), null);
    var rows = store.get(ck('songs', svc), null);
    if (rows && rows.length) {
      db.songs = rows.map(function (r) {
        return svc.adopt({ id: r[0], cid: r[1], n: r[2], a: r[3], al: r[4], d: r[5], art: r[6], tn: r[7], lib: true }, r[8]);
      });
      db.songsTotal = db.songs.length;
    }
  });
}
function dropCache() {
  ['playlists', 'recent', 'albums', 'artists', 'songs'].forEach(function (n) { store.del(ck(n)); });
  DBS[SVC.id] = DB = freshDb();
}

// Is this one of the listener's own playlists (one they can change)? Albums
// and other people's playlists are the service's "catalogue": they can be
// saved to the library as a whole (the ADD key), their songs one by one.
function isLibId(kind, id) {
  if (kind !== 'playlist') return false;
  var list = DB.playlists || [];
  for (var i = 0; i < list.length; i++) if (list[i].id === id) return !!list[i].own;
  return false;
}
function loadTracks(kind, id, onChunk) {
  var key = kind + ':' + id, db = DB, svc = SVC;
  if (db.tracks[key]) return Promise.resolve(db.tracks[key]);
  return once('t:' + key, function () {
    return svc.tracks(kind, id, onChunk).then(function (list) { db.tracks[key] = list; return list; });
  });
}

// ============================================================================
// Browser (the big display in the full face)
// ============================================================================

// A list that only builds the rows that are on screen, so thousands of songs
// scroll as easily as twenty.
function VList(scroller, makeRow, bindRow) {
  var self = this;
  this.el = scroller;
  this.count = 0;
  this.live = {};
  this.pool = [];
  this.make = makeRow;
  this.bind = bindRow;
  this.raf = 0;
  this.space = h('div', { class: 'mpv-space' });
  scroller.replaceChildren(this.space);
  // While the list is being flung, rows skip their artwork (this.fast) and
  // get it once the scrolling settles - that is what keeps a fling smooth.
  this.fast = false;
  this.lastTop = 0;
  this.settle = 0;
  this.onScroll = function () {
    if (self.raf) return;
    self.raf = requestAnimationFrame(function () {
      self.raf = 0;
      var top = self.el.scrollTop;
      var flung = Math.abs(top - self.lastTop) > ROW_H * 5;
      self.lastTop = top;
      if (flung) {
        self.fast = true;
        clearTimeout(self.settle);
        self.settle = setTimeout(function () { self.fast = false; self.update(true); }, 130);
      }
      self.update(false);
    });
  };
  scroller.addEventListener('scroll', this.onScroll, { passive: true });
}
VList.prototype.setCount = function (n) {
  this.count = n;
  this.space.style.height = (n * ROW_H) + 'px';
  this.update(true);
};
VList.prototype.update = function (rebind) {
  var top = this.el.scrollTop, view = this.el.clientHeight || 700;
  var first = Math.max(0, Math.floor(top / ROW_H) - 8);
  var last = Math.min(this.count - 1, Math.ceil((top + view) / ROW_H) + 8);
  var k, i, el;
  for (k in this.live) {
    i = +k;
    if (i < first || i > last) { el = this.live[k]; delete this.live[k]; el.style.display = 'none'; this.pool.push(el); }
  }
  for (i = first; i <= last; i++) {
    el = this.live[i];
    if (!el) {
      el = this.pool.pop() || this.make();
      if (!el.parentNode) this.space.appendChild(el);
      el.style.display = '';
      el.style.transform = 'translateY(' + (i * ROW_H) + 'px)';
      el.setAttribute('data-i', String(i));
      this.live[i] = el;
      this.bind(el, i);
    } else if (rebind) {
      this.bind(el, i);
    }
  }
};
VList.prototype.reveal = function (i) {
  var top = i * ROW_H, view = this.el.clientHeight || 700;
  if (top < this.el.scrollTop) this.el.scrollTop = top;
  else if (top + ROW_H > this.el.scrollTop + view) this.el.scrollTop = top + ROW_H - view;
};
VList.prototype.destroy = function () {
  this.el.removeEventListener('scroll', this.onScroll);
  if (this.raf) cancelAnimationFrame(this.raf);
  clearTimeout(this.settle);
};

var B = {
  view: null,     // what the browser is showing: {kind, ...}
  hist: [],       // where "back" goes
  token: 0,       // bumps on every navigation; late answers for an old view are dropped
  vlist: null,
  items: null,    // rows of the current table
  numbered: false,
  sel: -1,
  play: null,     // function (index) for the current table
  shuffle: null,
  secs: {},       // search results: section name -> {items, play}
  tiles: null,    // items behind the tiles on screen
  searchTimer: 0
};

function viewKey(v) {
  if (!v) return '';
  if (v.kind === 'playlist' || v.kind === 'album' || v.kind === 'artist') return v.kind + ':' + v.id;
  if (v.kind === 'search') return 'search:' + v.term;
  return v.kind;
}
function go(view) {
  // (one search replacing another as it is typed is not kept; results that
  // were left by opening something from them are, so Back returns to them)
  if (B.view && viewKey(B.view) !== viewKey(view) && !(B.view.kind === 'search' && view.kind === 'search')) {
    B.hist.push(B.view);
    if (B.hist.length > 40) B.hist.shift();
  }
  B.view = view;
  B.navAt = performance.now();
  renderView();
}
function goBack() {
  var v = B.hist.pop();
  if (!v) return;
  if (ui.search) ui.search.value = v.kind === 'search' ? v.term : '';
  B.view = v;
  B.navAt = performance.now();
  renderView();
}

function clearBody(kind) {
  closeMenu();
  if (B.vlist) { B.vlist.destroy(); B.vlist = null; }
  B.items = null; B.play = null; B.shuffle = null; B.sel = -1; B.secs = {}; B.tiles = null;
  ui.browser.setAttribute('data-kind', kind);
  ui.bBody.className = 'mpb-body';
  ui.bBody.replaceChildren();
  ui.bBody.scrollTop = 0;
}

// head: {title, jp, meta, art, canPlay}
function setHead(o) {
  ui.bBack.hidden = !B.hist.length;
  ui.bTitle.textContent = o.title || '';
  ui.bTitleJp.textContent = o.jp || '';
  ui.bMeta.textContent = o.meta || '';
  if (o.art) { ui.bArt.setAttribute('src', artUrl(o.art, 56)); ui.bArt.hidden = false; }
  else { ui.bArt.hidden = true; ui.bArt.removeAttribute('src'); }
  ui.bPlay.disabled = ui.bShuffle.disabled = !o.canPlay;
  ui.bActions.style.display = o.hideActions ? 'none' : '';
  syncAddKey();
}
function setMeta(text) { ui.bMeta.textContent = text; }

function showMsg(big, small, key) {
  clearBody('msg');
  var box = h('div', { class: 'mpb-msg' }, h('div', { class: 'big', text: big }), small ? h('div', { text: small }) : null, key || null);
  ui.bBody.appendChild(box);
}

function sumDur(items) {
  var t = 0;
  for (var i = 0; i < items.length; i++) if (items[i]) t += items[i].d || 0;
  return t;
}
function songsMeta(n, items) { return n + '曲' + (items && items.length ? ' / ' + fmt(sumDur(items)) : ''); }

// ---- track table ----
function makeTrackRow() {
  return h('div', { class: 'mpr', role: 'row' },
    h('span', { class: 'n' }, h('img', { class: 'mpr-art', alt: '', decoding: 'async' }), h('span', { class: 'mpr-num' })),
    h('span', { class: 't' }), h('span', { class: 'a' }), h('span', { class: 'al' }), h('span', { class: 'd' }),
    // keys that show while the pointer is on the row (or the row is selected)
    h('span', { class: 'x' },
      h('button', { class: 'mpr-key', type: 'button', 'data-row': 'add', title: 'Add to your library', 'aria-label': 'Add to your library' }, svg(I.plus)),
      h('button', { class: 'mpr-key', type: 'button', 'data-row': 'menu', title: 'More: play next, add to a playlist ... (or right-click the row)', 'aria-label': 'More' }, svg(I.more))));
}
// the song a row stands for, and what double-clicking it would do
function rowSong(row) {
  if (!row) return null;
  var i = +row.getAttribute('data-i'), sec = row.getAttribute('data-sec');
  if (sec) return (B.secs[sec] && B.secs[sec].items && B.secs[sec].items[i]) || null;
  return (B.items && B.items[i]) || null;
}
function rowPlay(row) {
  var i = +row.getAttribute('data-i'), sec = row.getAttribute('data-sec');
  if (sec) return B.secs[sec] && B.secs[sec].play ? function () { B.secs[sec].play(i); } : null;
  return B.play ? function () { B.play(i); } : null;
}
function isCurrent(s) {
  var c = B.cur;
  if (!c || !s) return false;
  return s.id === c.id || (!!s.cid && (s.cid === c.id || s.cid === c.cid)) || (!!c.cid && s.id === c.cid);
}
function fillTrackRow(el, s, i, numbered, selected, skipArt) {
  var c = el.children, img = c[0].firstChild;
  if (!s) {
    el.setAttribute('data-empty', '1');
    img.removeAttribute('src');
    c[0].lastChild.textContent = '';
    c[1].textContent = '. . .';
    c[2].textContent = c[3].textContent = c[4].textContent = '';
    el.removeAttribute('data-cur');
    el.removeAttribute('data-sel');
    el.removeAttribute('data-lib');
    return;
  }
  el.removeAttribute('data-empty');
  if (numbered) { el.setAttribute('data-num', '1'); c[0].lastChild.textContent = String(s.tn || i + 1); }
  else {
    el.removeAttribute('data-num');
    var src = skipArt ? '' : artUrl(s.art, 26);
    if ((img.getAttribute('src') || '') !== src) { if (src) img.setAttribute('src', src); else img.removeAttribute('src'); }
  }
  c[1].textContent = s.n;
  c[2].textContent = s.a;
  c[3].textContent = s.al;
  c[4].textContent = s.d ? fmt(s.d) : '';
  if (isCurrent(s)) el.setAttribute('data-cur', '1'); else el.removeAttribute('data-cur');
  if (selected) el.setAttribute('data-sel', '1'); else el.removeAttribute('data-sel');
  rowFlag(el, s);
}
function bindTrackRow(el, i) {
  fillTrackRow(el, B.items && B.items[i], i, B.numbered, i === B.sel, !!(B.vlist && B.vlist.fast));
}

// o: {items, total, numbered, play(i), shuffle()}
function showTable(o) {
  // a list is reused only for the same view (a refresh), never for another
  // one, which would inherit its selection and scroll position
  if (!B.vlist || ui.browser.getAttribute('data-kind') !== 'table' || B.tableKey !== viewKey(B.view)) {
    clearBody('table');
    B.vlist = new VList(ui.bBody, makeTrackRow, bindTrackRow);
    B.tableKey = viewKey(B.view);
  }
  B.items = o.items;
  B.numbered = !!o.numbered;
  B.play = o.play;
  B.shuffle = o.shuffle;
  // an album's own page has no use for the album column
  ui.browser.setAttribute('data-numbered', o.numbered ? '1' : '0');
  B.vlist.setCount(o.total);
}

function markBrowserCurrent() {
  var m = S.music, it = null;
  try { it = m && m.nowPlayingItem; } catch (e) {}
  var info = itemInfo(it);
  B.cur = it ? { id: info.id, cid: info.cid } : null;
  if (S.mode !== 'full' || !ui.bBody) return;
  if (B.vlist) { B.vlist.update(true); return; }
  var rows = ui.bBody.querySelectorAll('.mpr[data-sec]');
  for (var i = 0; i < rows.length; i++) {
    var sec = B.secs[rows[i].getAttribute('data-sec')];
    var s = sec && sec.items[+rows[i].getAttribute('data-i')];
    if (isCurrent(s)) rows[i].setAttribute('data-cur', '1'); else rows[i].removeAttribute('data-cur');
  }
}

// ---- tiles ----
function makeTile(t, i, sec) {
  var sub = t.kind === 'playlist' && !t.a ? jp('プレイリスト') : h('span', { text: t.a });
  var img = h('img', { alt: '', loading: 'lazy', decoding: 'async' });
  if (t.art) img.setAttribute('src', artUrl(t.art, 150));
  else if (__MP_ICON) img.setAttribute('src', __MP_ICON);
  return h('button', { class: 'mpg-tile', type: 'button', 'data-i': String(i), 'data-sec': sec || null, title: t.n },
    img, h('span', { class: 'nm', text: t.n }), h('span', { class: 'sb' }, sub));
}
function showTiles(items) {
  clearBody('tiles');
  B.tiles = items;
  var grid = h('div', { class: 'mpg' });
  for (var i = 0; i < items.length; i++) grid.appendChild(makeTile(items[i], i));
  ui.bBody.appendChild(grid);
}
function openTile(t) {
  if (!t) return;
  go({ kind: t.kind, id: t.id, name: t.n, artist: t.a, art: t.art, tc: t.tc });
}

// what the service calls its parts of the library (Liked Songs, Likes ...)
function navWord(key) {
  var list = SVC.nav || [];
  for (var i = 0; i < list.length; i++) if (list[i].go === key) return list[i];
  return { label: key, jp: '' };
}

// Sections of songs, tiles and artists one after another (search results, an artist).
// sections: [{title, ja, kind: 'songs'|'tiles'|'artists', name, items}] (nulls skipped)
function showFlow(sections) {
  clearBody('flow');
  ui.bBody.className = 'mpb-body mpb-flow';
  var body = ui.bBody;
  sections.forEach(function (sc) {
    if (!sc || !sc.items || !sc.items.length) return;
    var items = sc.items, i, row;
    body.appendChild(h('div', { class: 'mpb-sec' }, h('span', { text: sc.title }), jp(sc.ja)));
    if (sc.kind === 'songs') {
      B.secs[sc.name] = { items: items, play: function (k) { startQueue({ songs: idsFrom(items, 0, QUEUE_CHUNK), startWith: k }); } };
      for (i = 0; i < items.length; i++) {
        row = makeTrackRow();
        row.setAttribute('data-i', String(i));
        row.setAttribute('data-sec', sc.name);
        fillTrackRow(row, items[i], i, false, false);
        body.appendChild(row);
      }
    } else if (sc.kind === 'tiles') {
      B.secs[sc.name] = { items: items };
      var grid = h('div', { class: 'mpg' });
      for (i = 0; i < items.length; i++) grid.appendChild(makeTile(items[i], i, sc.name));
      body.appendChild(grid);
    } else {
      B.secs[sc.name] = { items: items };
      for (i = 0; i < items.length; i++) {
        row = makeArtistRow();
        row.setAttribute('data-i', String(i));
        row.setAttribute('data-sec', sc.name);
        row.children[1].textContent = items[i].n;
        body.appendChild(row);
      }
    }
  });
}

// ---- playing things ----
function shuffleOn() {
  var m = S.music, mk = MK();
  try {
    return S.shuffleHeld || (!!m && !!mk && !!mk.PlayerShuffleMode && m.shuffleMode !== mk.PlayerShuffleMode.off);
  } catch (e) { return false; }
}

// shuffle true / false: set the shuffle switch first (the SHUFFLE keys do).
// Left out: the listener picked one particular song, and that song has to
// play first whatever the switch says.
function startQueue(opts, shuffle) {
  var m = S.music, mk = MK();
  if (!m) return;
  // Starts run one after another (two at once trip the player up); when
  // several are waiting, only the newest is carried out.
  var tok = ++S.startTok;
  S.starting = S.starting.then(function () {
    return tok === S.startTok ? startNow(m, mk, opts, shuffle) : null;
  });
}

function reallyPlaying() {
  var s = stateName();
  return !!nowItem() && s !== 'none' && s !== 'stopped' && s !== 'ended' && s !== 'completed';
}

// Ask the player to play what is queued - and make sure it does. A start that
// comes within about a third of a second of the previous one falls flat: the
// player answers "ok" and plays nothing. Asking again a moment later works.
// (since: when this start was asked for; a Stop or Pause after that ends it.)
function playForSure(m, since) {
  var tries = 0;
  function attempt() {
    return Promise.resolve().then(function () { return m.play(); }).then(function () {
      if (!reallyPlaying() && tries === 4 && S.haltAt <= since) dlog('start: nothing playing after 5 tries, state ' + stateName());
      if (reallyPlaying() || ++tries > 4 || S.haltAt > since) return null;
      return new Promise(function (go) { setTimeout(go, 300); }).then(function () {
        return (reallyPlaying() || S.haltAt > since) ? null : attempt();
      });
    });
  }
  return attempt();
}

function startNow(m, mk, opts, shuffle) {
  var PM = mk && mk.PlayerShuffleMode, resume = false, settled = false, since = performance.now();
  RC.wantAt = since;
  dlog('start: ' + Object.keys(opts).map(function (k) { return k === 'songs' ? 'songs x' + opts.songs.length : k; }).join(' ') + ', state ' + stateName());
  try {
    if (PM && shuffle !== undefined) m.shuffleMode = shuffle ? PM.songs : PM.off;
    else if (PM && m.shuffleMode !== PM.off) {
      // Shuffle is on and one song was picked. Handed over like that, the
      // player shuffles the list and then starts at the picked song's old
      // *position* - on some other song. So: queue in order with shuffle off,
      // start the picked song, and only then switch shuffle back on. That
      // keeps what is playing and shuffles everything else behind it.
      resume = true;
      S.shuffleHeld = true;            // the SHUFFLE lamp stays lit meanwhile
      m.shuffleMode = PM.off;
    }
  } catch (e) {}
  function settle() {
    if (settled) return;
    settled = true;
    if (!resume || !S.shuffleHeld) return;        // (the listener may have switched shuffle off meanwhile)
    S.shuffleHeld = false;
    try { m.shuffleMode = PM.songs; } catch (e) {}
    refreshModes();
  }
  var work = Promise.resolve()
    .then(function () { return m.setQueue(opts); })
    .then(function () { return playForSure(m, since); })
    .then(settle, function (e) { settle(); notice('COULD NOT START PLAYBACK: ' + errText(e)); });
  // ...but never wait on the player for ever
  return Promise.race([work, new Promise(function (done) { setTimeout(done, 9000); })]).then(settle);
}
function idsFrom(items, start, max) {
  var ids = [];
  for (var i = start; i < items.length && ids.length < max; i++) if (items[i]) ids.push(items[i].id);
  return ids;
}
function randomIds(items, max) {
  var pool = [], i, j, t;
  for (i = 0; i < items.length; i++) if (items[i]) pool.push(items[i].id);
  for (i = pool.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
  return pool.slice(0, max);
}
// What to hand the player when song i is picked in the Songs list: normally it
// and the ones listed after it; with shuffle on, it and then songs from all
// over the library.
function songIdsFrom(i) {
  var first = DB.songs[i];
  if (!first || !shuffleOn()) return idsFrom(DB.songs, i, QUEUE_CHUNK);
  return [first.id].concat(randomIds(DB.songs, QUEUE_CHUNK).filter(function (id) { return id !== first.id; }).slice(0, QUEUE_CHUNK - 1));
}

// ============================================================================
// Changing the library: save a song (Spotify: to Liked Songs; SoundCloud: a
// like), save a whole album or playlist, add a song to a playlist, make a new
// playlist. Through the service's own way in (services/), so the change is
// the account's: it shows up in the service's own apps too.
// ============================================================================
function pause(ms) { return new Promise(function (go) { setTimeout(go, ms); }); }
function isLibrarySong(s) { return false; }     // (every song is the service's; s.lib says whether it is saved)
function catalogIdOf(s) { return s ? String(s.id || '') : ''; }
function songFromItem(it) {           // a song as the lists know it, from one of the player's queue items
  if (it && it.song) return it.song;
  var info = itemInfo(it);
  return { id: info.id, cid: info.cid, n: info.title, a: info.artist, al: info.album, d: Math.round(info.dur), art: info.art, tn: 0 };
}

// Which of these are saved already?  kind: songs | albums | playlists.
// Resolves with {id: true}.
function inLibrary(kind, ids) {
  ids = ids.map(String).filter(function (id) { return /^[\w.:\-]+$/.test(id); });
  if (!ids.length || !authorized()) return Promise.resolve({});
  return SVC.inLibrary(kind, ids);
}

// Save one song, album or playlist to the library. Resolves with true.
function addToLibrary(kind, item) {
  if (!item || !item.id) return Promise.reject(new Error('there is nothing to save'));
  return SVC.save(kind, item).then(function () { return true; });
}

// The songs of one of the listener's playlists, fresh from the service.
function playlistSongs(id) {
  delete DB.tracks['playlist:' + id];
  return loadTracks('playlist', id).then(null, function () { return []; });
}
function sameSong(a, b) { return !!a && !!b && String(a.id) === String(b.id); }

// Add a song to a playlist (once: a song that is in it already is left alone).
function addToPlaylist(pl, s) {
  return playlistSongs(pl.id).then(function (songs) {
    if (songs.some(function (t) { return sameSong(t, s); })) {
      var dup = new Error('it is already in that playlist');
      dup.already = true;
      throw dup;
    }
    return SVC.addToPlaylist(pl, s);
  }).then(function () { return true; });
}

// Make a new playlist holding this one song. Resolves with the playlist.
function newPlaylist(name, s) { return SVC.newPlaylist(name, s); }

// After a change: bring the lists on screen (and the saved copies) up to date.
function libraryChanged() {
  clearTimeout(libraryChanged.t);
  libraryChanged.t = setTimeout(function () {
    if (!authorized()) return;
    loadRecent().then(function () { if (S.mode === 'full' && B.view && B.view.kind === 'recent') renderView(); }, function () {});
    if (DB.songsState !== 'loading') {
      DB.songsState = 'idle';
      loadSongs(function () { if (S.mode === 'full' && B.view && B.view.kind === 'songs') renderView(); });
    }
    loadAlbums().catch(function () {});
    loadArtists().catch(function () {});
  }, 3500);
}
function playlistChanged(id) {
  delete DB.tracks['playlist:' + id];
  loadPlaylists().catch(function () {});
  if (S.mode === 'full' && B.view && B.view.kind === 'playlist' && B.view.id === id) renderView();
}

// ---- what the keys and the menu do with all that ----
function doAddToLibrary(s) {
  if (!s || s.adding) return;
  if (!authorized()) { notice('SIGN IN TO SAVE SONGS'); return; }
  s.adding = true;
  syncRowFlags();
  notice(SVC.words.savingSong + ': ' + s.n, true);
  dlog('library add: ' + catalogIdOf(s));
  addToLibrary('songs', s).then(function () {
    s.adding = false;
    s.lib = true;
    dlog('library add confirmed');
    notice(SVC.words.savedSong + ': ' + s.n + '   (it shows up in ' + SVC.name + '\'s own apps too)', true);
    syncRowFlags();
    libraryChanged();
  }, function (e) {
    s.adding = false;
    dlog('library add failed: ' + errText(e));
    notice('COULD NOT SAVE IT: ' + errText(e));
    syncRowFlags();
  });
}

function doAddToPlaylist(s, pl) {
  if (!s || !pl) return;
  if (!authorized()) { notice('SIGN IN TO CHANGE YOUR PLAYLISTS'); return; }
  notice('ADDING TO ' + pl.n + ': ' + s.n, true);
  dlog('playlist add');
  addToPlaylist(pl, s).then(function (seen) {
    dlog('playlist add ' + (seen ? 'confirmed' : 'sent, not confirmed'));
    notice('ADDED TO ' + pl.n + ': ' + s.n, true);
    playlistChanged(pl.id);
  }, function (e) {
    if (e && e.already) { notice(s.n + ' IS ALREADY IN ' + pl.n, true); return; }
    dlog('playlist add failed: ' + errText(e));
    notice('COULD NOT ADD TO ' + pl.n + ': ' + errText(e));
  });
}

function doNewPlaylist(name, s) {
  if (!s || !name) return;
  if (!authorized()) { notice('SIGN IN TO CHANGE YOUR PLAYLISTS'); return; }
  notice('MAKING PLAYLIST ' + name, true);
  dlog('playlist create');
  newPlaylist(name, s).then(function (pl) {
    dlog('playlist create ok');
    notice('MADE PLAYLIST ' + name + ' WITH ' + s.n, true);
    setTimeout(function () { loadPlaylists().catch(function () {}); }, 1200);
    if (pl && DB.playlists && !DB.playlists.some(function (p) { return p.id === pl.id; })) {
      pl.ed = true;
      DB.playlists.push(pl);
      renderNavPlaylists();
    }
  }, function (e) {
    dlog('playlist create failed: ' + errText(e));
    notice('COULD NOT MAKE THE PLAYLIST: ' + errText(e));
  });
}

// A whole album, or someone else's playlist, from its page (the ADD key).
function doAddCollection(v) {
  if (!v || v.adding || v.lib) return;
  if (!authorized()) { notice('SIGN IN TO SAVE TO YOUR LIBRARY'); return; }
  var kind = v.kind === 'playlist' ? 'playlists' : v.kind === 'artist' ? 'artists' : 'albums';
  v.adding = true;
  syncAddKey();
  notice('SAVING TO YOUR LIBRARY: ' + v.name, true);
  addToLibrary(kind, v).then(function () {
    v.adding = false;
    v.lib = true;
    notice('SAVED TO YOUR LIBRARY: ' + v.name + '   (it shows up in ' + SVC.name + '\'s own apps too)', true);
    syncAddKey();
    libraryChanged();
    if (kind === 'playlists') setTimeout(function () { loadPlaylists().catch(function () {}); }, SVC.id === 'soundcloud' ? 50 : 2500);
  }, function (e) {
    v.adding = false;
    notice('COULD NOT SAVE IT: ' + errText(e));
    syncAddKey();
  });
}
// the ADD key in the browser's head: on albums and other people's playlists
function syncAddKey() {
  if (!ui.bAdd) return;
  var v = B.view, cat = !!v && ((v.kind === 'album' || v.kind === 'playlist') && !isLibId(v.kind, v.id) || (v.kind === 'artist' && !!SVC.saveArtists));
  ui.bAdd.hidden = !cat;
  if (!cat) return;
  ui.bAdd.disabled = !!v.adding || !!v.lib;
  ui.bAddLabel.textContent = v.lib ? SVC.words.saved : v.adding ? 'SAVING' : SVC.words.addKey;
  ui.bAdd.setAttribute('data-done', v.lib ? '1' : '0');
}

// Play a song after the current one, or at the end of the queue.
function queueSong(s, next) {
  var m = S.music;
  if (!m || !s) return;
  if (!queueItems().length) { startQueue({ songs: [s.id] }); return; }
  var fn = next ? m.playNext : m.playLater;
  if (typeof fn !== 'function') { notice('THIS PLAYER CANNOT DO THAT'); return; }
  Promise.resolve().then(function () { return fn.call(m, { song: s.id }); }).then(function () {
    notice((next ? 'PLAYING NEXT: ' : 'ADDED TO THE QUEUE: ') + s.n, true);
  }, function (e) { notice('COULD NOT QUEUE IT: ' + errText(e)); });
}

// Lamps on the rows: which of the songs on screen are saved.
function fetchRowFlags(items) {
  if (!authorized() || !items) return;
  var ask = items.filter(function (s) { return s && !isLibrarySong(s) && s.lib === undefined; });
  if (!ask.length) return;
  ask.forEach(function (s) { s.lib = null; });                // asked
  inLibrary('songs', ask.map(function (s) { return String(s.id); })).then(function (map) {
    ask.forEach(function (s) { s.lib = !!map[s.id]; if (typeof map[s.id] === 'string') s.libId = map[s.id]; });
    syncRowFlags();
  }, function () { ask.forEach(function (s) { s.lib = undefined; }); });
}
function rowFlag(el, s) {
  var v = !s || isLibrarySong(s) ? null : s.adding ? 'adding' : s.lib === true ? '1' : s.lib === false ? '0' : null;
  if (v === null) el.removeAttribute('data-lib'); else el.setAttribute('data-lib', v);
}
function syncRowFlags() {
  if (!ui.bBody) return;
  if (B.vlist) { B.vlist.update(true); return; }
  var rows = ui.bBody.querySelectorAll('.mpr[data-sec]'), i, sec;
  for (i = 0; i < rows.length; i++) {
    sec = B.secs[rows[i].getAttribute('data-sec')];
    rowFlag(rows[i], sec && sec.items[+rows[i].getAttribute('data-i')]);
  }
}

// ---- the song menu (right-click, or the ... key on a row) ----
var MENU = { song: null, opts: null, page: 'main' };

function menuKey(what, icon, en, ja, off, arg) {
  return h('button', { class: 'mpm-item', type: 'button', 'data-m': what, 'data-arg': arg || null, disabled: off ? true : null },
    icon ? svg(icon) : h('i'), h('span', { class: 'mpm-en', text: en }), ja ? jp(ja) : null);
}

function menuPage(page) {
  var s = MENU.song, o = MENU.opts || {}, box = ui.menu, signedIn = authorized();
  if (!s || !box) return;
  MENU.page = page;
  var kids = [h('div', { class: 'mpm-head' }, h('span', { class: 'mpm-title', text: s.n }), h('span', { class: 'mpm-sub', text: s.a || '' }))];
  if (page === 'main') {
    var have = isLibrarySong(s) || s.lib === true;
    if (o.play) kids.push(menuKey('play', I.play, 'Play', '再生'));
    kids.push(menuKey('next', I.next, 'Play next', '次に再生'));
    kids.push(menuKey('later', I.list, 'Add to queue', 'キューに追加'));
    kids.push(h('div', { class: 'mpm-sep' }));
    if (have) kids.push(menuKey('', I.check, SVC.words.inLib, 'ライブラリにあります', true));
    else kids.push(menuKey('lib', I.plus, signedIn ? (s.adding ? SVC.words.adding : SVC.words.addSong) : 'Sign in to save songs', 'ライブラリに追加', !signedIn || !!s.adding || !catalogIdOf(s)));
    kids.push(menuKey('pl', I.go, 'Add to a playlist', 'プレイリストに追加', !signedIn));
  } else {
    var mine = orderedPlaylists().filter(function (p) { return p.ed === true; });
    kids.push(menuKey('back', I.back, 'Add to a playlist', 'プレイリストに追加'));
    ui.menuName = h('input', { type: 'text', class: 'mpm-input', maxlength: '80', placeholder: 'New playlist name', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Name for a new playlist' });
    kids.push(h('div', { class: 'mpm-new' }, ui.menuName, h('button', { class: 'mp-key mpm-make', type: 'button', 'data-m': 'create', text: 'MAKE' })));
    kids.push(h('div', { class: 'mpm-sep' }));
    var list = h('div', { class: 'mpm-scroll' });
    mine.forEach(function (p) { list.appendChild(menuKey('topl', I.list, p.n, null, false, p.id)); });
    if (!mine.length) list.appendChild(h('div', { class: 'mpm-note', text: DB.playlists ? 'No playlists of your own yet. Make one above.' : 'Loading your playlists...' }));
    kids.push(list);
  }
  box.replaceChildren.apply(box, kids);
}

function placeMenu(x, y) {
  var box = ui.menu;
  if (typeof x === 'number') { MENU.x = x; MENU.y = y; }
  box.style.left = '0px';
  box.style.top = '0px';
  var w = box.offsetWidth, hgt = box.offsetHeight, pad = 8, win = drawWin();
  box.style.left = Math.max(pad, Math.min(MENU.x, win.innerWidth - w - pad)) + 'px';
  box.style.top = Math.max(pad, Math.min(MENU.y, win.innerHeight - hgt - pad)) + 'px';
}

// opts.play: what "Play" does for this row (left out where the song is playing already)
function openSongMenu(s, x, y, opts) {
  if (!s || !ui.menu || !s.id) return;
  MENU.song = s;
  MENU.opts = opts || {};
  menuPage('main');
  ui.menu.setAttribute('data-open', '1');
  placeMenu(x, y);
  // not known yet whether the song is saved: find out
  if (!isLibrarySong(s) && typeof s.lib !== 'boolean' && authorized()) {
    inLibrary('songs', [String(s.id)]).then(function (map) {
      if (typeof s.lib !== 'boolean') s.lib = !!map[s.id];
      if (MENU.song === s && MENU.page === 'main') { menuPage('main'); placeMenu(); }
    }, function () {});
  }
  // the playlists that can be added to (the saved copy may predate that knowledge)
  if (authorized() && (!DB.playlists || DB.playlists.some(function (p) { return p.ed === undefined; })))
    loadPlaylists().then(function () { if (MENU.song === s && MENU.page === 'pl') { menuPage('pl'); placeMenu(); } }, function () {});
}
function closeMenu() {
  if (!ui.menu || !MENU.song) return;
  MENU.song = null;
  ui.menu.setAttribute('data-open', '0');
}
function menuOpen() { return !!MENU.song; }

function onMenuClick(e) {
  var key = e.target.closest && e.target.closest('[data-m]');
  if (!key || key.disabled) return;
  var s = MENU.song, o = MENU.opts || {}, what = key.getAttribute('data-m'), arg = key.getAttribute('data-arg');
  if (!s) return;
  if (what === 'pl') { menuPage('pl'); placeMenu(); return; }
  if (what === 'back') { menuPage('main'); placeMenu(); return; }
  if (what === 'create') {
    var name = (ui.menuName ? ui.menuName.value : '').trim();
    if (!name) { if (ui.menuName) ui.menuName.focus(); return; }
    closeMenu();
    doNewPlaylist(name, s);
    return;
  }
  closeMenu();
  if (what === 'play' && o.play) o.play();
  else if (what === 'next') queueSong(s, true);
  else if (what === 'later') queueSong(s, false);
  else if (what === 'lib') doAddToLibrary(s);
  else if (what === 'topl') {
    var pl = null;
    (DB.playlists || []).forEach(function (p) { if (p.id === arg) pl = p; });
    doAddToPlaylist(s, pl);
  }
}

// ---- the views ----
function viewRecent(tok) {
  if (SVC.recentSongs) { viewRecentSongs(tok); return; }
  setHead({ title: navWord('recent').label, jp: navWord('recent').jp, meta: DB.recent ? DB.recent.length + ' items' : 'loading...', hideActions: true });
  if (DB.recent) showTiles(DB.recent); else showMsg('LOADING', '読込中');
  loadRecent().then(function (list) {
    if (tok !== B.token) return;
    setMeta(list.length + ' items');
    showTiles(list);
  }).catch(function (e) { if (tok === B.token && !DB.recent) showMsg('COULD NOT LOAD', errText(e)); });
}

// (SoundCloud) "History": what was played here, newest first
function viewRecentSongs(tok) {
  var w = navWord('recent');
  setHead({ title: w.label, jp: w.jp, meta: 'loading...', hideActions: true });
  SVC.recent().then(function (list) {
    if (tok !== B.token) return;
    setHead({ title: w.label, jp: w.jp, meta: list.length + '曲', canPlay: list.length > 0 });
    if (!list.length) { showMsg('NOTHING PLAYED YET', 'Songs played here show up here, newest first.'); return; }
    showTable({
      items: list, total: list.length,
      play: function (i) { startQueue({ songs: idsFrom(list, 0, QUEUE_CHUNK), startWith: i }); },
      shuffle: function () { startQueue({ songs: idsFrom(list, 0, QUEUE_CHUNK) }, true); }
    });
  }, function (e) { if (tok === B.token) showMsg('COULD NOT LOAD', errText(e)); });
}

function viewSongs(tok) {
  function draw() {
    if (tok !== B.token) return;
    var total = DB.songsTotal;
    setHead({ title: navWord('songs').label, jp: navWord('songs').jp, canPlay: total > 0,
              meta: total < 0 ? 'loading...' : total + '曲' + (DB.songsState === 'loading' ? '  (refreshing)' : '') });
    if (total < 0) { showMsg('LOADING', '読込中'); return; }
    if (!total && DB.songsState !== 'loading') { showMsg('NO SONGS YET', SVC.words.noSongs || 'Songs you save show up here.'); return; }
    showTable({
      items: DB.songs, total: total,
      play: function (i) { startQueue({ songs: songIdsFrom(i) }); },
      shuffle: function () { startQueue({ songs: randomIds(DB.songs, QUEUE_CHUNK) }, false); }
    });
  }
  draw();
  if (DB.songsState === 'idle') loadSongs(draw);
}

function viewAlbums(tok) {
  function draw(list, done) {
    if (tok !== B.token) return;
    setHead({ title: navWord('albums').label, jp: navWord('albums').jp, meta: list.length + ' albums' + (done ? '' : '  (loading)'), hideActions: true });
    showTiles(list);
  }
  if (DB.albums) draw(DB.albums, true); else { setHead({ title: navWord('albums').label, jp: navWord('albums').jp, meta: 'loading...', hideActions: true }); showMsg('LOADING', '読込中'); }
  loadAlbums(function (part) { draw(part, false); })
    .then(function (list) { draw(list, true); })
    .catch(function (e) { if (tok === B.token && !DB.albums) showMsg('COULD NOT LOAD', errText(e)); });
}

function makeArtistRow() {
  return h('div', { class: 'mpr', role: 'row', 'data-kind': 'artist' },
    h('span', { class: 'n' }, svg(I.person)), h('span', { class: 't' }), h('span', { class: 'n' }, svg(I.go)));
}
function viewArtists(tok) {
  function draw(list, done) {
    if (tok !== B.token) return;
    setHead({ title: navWord('artists').label, jp: navWord('artists').jp, meta: list.length + ' artists' + (done ? '' : '  (loading)'), hideActions: true });
    if (!B.vlist || ui.browser.getAttribute('data-kind') !== 'artists') {
      clearBody('artists');
      B.vlist = new VList(ui.bBody, makeArtistRow, function (el, i) {
        var a = B.items && B.items[i];
        el.children[1].textContent = a ? a.n : '';
        if (i === B.sel) el.setAttribute('data-sel', '1'); else el.removeAttribute('data-sel');
      });
    }
    B.items = list;
    B.vlist.setCount(list.length);
  }
  if (DB.artists) draw(DB.artists, true); else { setHead({ title: navWord('artists').label, jp: navWord('artists').jp, meta: 'loading...', hideActions: true }); showMsg('LOADING', '読込中'); }
  loadArtists(function (part) { draw(part, false); })
    .then(function (list) { draw(list, true); })
    .catch(function (e) { if (tok === B.token && !DB.artists) showMsg('COULD NOT LOAD', errText(e)); });
}

// An artist: their songs (on SoundCloud, what they put up) and their albums,
// singles and playlists.
function viewArtist(v, tok) {
  setHead({ title: v.name, jp: 'アーティスト', meta: 'loading...', hideActions: true });
  if (SVC.saveArtists && v.lib === undefined) {
    v.lib = null;
    inLibrary('artists', [v.id]).then(function (map) { v.lib = !!map[v.id]; if (B.view === v) syncAddKey(); }, function () { v.lib = undefined; });
  }
  var have = DB.artistAlbums[v.id];
  if (have) { drawArtist(v, have); return; }
  showMsg('LOADING', '読込中');
  var db = DB;
  SVC.artist(v.id).then(function (r) {
    db.artistAlbums[v.id] = r;
    if (tok === B.token) drawArtist(v, r);
  }).catch(function (e) { if (tok === B.token) showMsg('COULD NOT LOAD', errText(e)); });
}
function drawArtist(v, r) {
  var songs = r.songs || [], tiles = (r.albums || []).concat(r.playlists || []), parts = [];
  if (songs.length) parts.push(songs.length + (songs.length === 1 ? ' song' : ' songs'));
  if (tiles.length) parts.push(tiles.length + (tiles.length === 1 ? ' release' : ' releases'));
  setHead({ title: v.name, jp: 'アーティスト', meta: parts.join('  ·  ') || 'nothing here', canPlay: songs.length > 0, hideActions: !songs.length && !SVC.saveArtists });
  if (!songs.length && !tiles.length) { showMsg('NOTHING HERE', 'There is nothing by this artist to play here.'); return; }
  showFlow([
    songs.length ? { title: 'SONGS', ja: '曲', kind: 'songs', name: 'artSongs', items: songs } : null,
    tiles.length ? { title: 'ALBUMS, SINGLES & PLAYLISTS', ja: 'アルバム', kind: 'tiles', name: 'artTiles', items: tiles } : null
  ]);
  if (songs.length) {
    B.play = function (i) { startQueue({ songs: idsFrom(songs, 0, QUEUE_CHUNK), startWith: i }); };
    B.shuffle = function () { startQueue({ songs: idsFrom(songs, 0, QUEUE_CHUNK) }, true); };
  }
  fetchRowFlags(songs);
}

// a playlist or an album
function viewCollection(v, tok) {
  var isPl = v.kind === 'playlist';
  var opt = isPl ? 'playlist' : 'album';
  var fromApple = !isLibId(v.kind, v.id);
  // an album, or someone else's playlist: is it in the library already? (for the ADD key)
  if (fromApple && v.lib === undefined && authorized()) {
    v.lib = null;
    inLibrary(isPl ? 'playlists' : 'albums', [v.id]).then(function (map) {
      v.lib = !!map[v.id];
      if (B.view === v) syncAddKey();
    }, function () { v.lib = undefined; });
  }
  function draw(list, done) {
    if (tok !== B.token) return;
    setHead({ title: v.name, jp: isPl ? 'プレイリスト' : 'アルバム', art: v.art || '', canPlay: list.length > 0,
              meta: (v.artist ? v.artist + '  ·  ' : '') + songsMeta(list.length, list) + (done ? '' : '  (loading)') });
    if (done && !list.length) { showMsg('EMPTY', isPl ? 'This playlist has no songs yet.' : 'No songs found.'); return; }
    var q = {}; q[opt] = v.id;
    showTable({
      items: list, total: list.length, numbered: !isPl,
      play: function (i) { var o = {}; o[opt] = v.id; o.startWith = i; startQueue(o); },
      shuffle: function () { startQueue(q, true); }
    });
    if (done && fromApple) fetchRowFlags(list);
  }
  var have = DB.tracks[v.kind + ':' + v.id];
  if (have) {
    draw(have, true);
    // the copy is from earlier this session: the playlist may have changed
    // since (here, or on another device). Ask again and redraw if it did.
    if (!fromApple) {
      delete DB.tracks[v.kind + ':' + v.id];
      loadTracks(v.kind, v.id).then(function (list) {
        var same = list.length === have.length && list.every(function (s, k) { return s && have[k] && s.id === have[k].id; });
        if (!same && tok === B.token) draw(list, true);
      }, function () { if (!DB.tracks[v.kind + ':' + v.id]) DB.tracks[v.kind + ':' + v.id] = have; });
    }
    return;
  }
  setHead({ title: v.name, jp: isPl ? 'プレイリスト' : 'アルバム', art: v.art, meta: 'loading...' });
  showMsg('LOADING', '読込中');
  loadTracks(v.kind, v.id, function (part) { draw(part, false); })
    .then(function (list) { draw(list, true); })
    .catch(function (e) {
      if (tok !== B.token) return;
      // a list the service plays but will not show song by song (Spotify,
      // for other people's playlists)
      if (e && e.hidden) { drawHidden(e); return; }
      if (isPl && e && e.status === 404) draw([], true); else showMsg('COULD NOT LOAD', errText(e));
    });
  function drawHidden(e) {
    setHead({ title: v.name, jp: isPl ? 'プレイリスト' : 'アルバム', art: v.art || '', canPlay: true,
              meta: (v.artist ? v.artist + '  ·  ' : '') + (v.tc ? v.tc + '曲' : '') });
    showMsg('PLAYS FROM ' + SVC.label, errText(e));
    var q = { name: v.name };
    q[opt] = v.id;
    B.play = function () { startQueue(q); };
    B.shuffle = function () { startQueue(q, true); };
  }
}

// Search: the library on hand (searched here), then the service's catalogue.
function viewSearch(v, tok) {
  setHead({ title: 'Search: ' + v.term, jp: '検索', meta: 'searching...', hideActions: true });
  showMsg('SEARCHING', '検索中');
  var svc = SVC, db = DB, low = v.term.toLowerCase();
  function has(x) { return String(x || '').toLowerCase().indexOf(low) >= 0; }
  var libSongs = (db.songs || []).filter(function (s) { return s && (has(s.n) || has(s.a) || has(s.al)); }).slice(0, 15);
  var libTiles = (db.playlists || []).concat(db.albums || []).filter(function (t) { return t && (has(t.n) || has(t.a)); }).slice(0, 15);
  var libArtists = (db.artists || []).filter(function (a) { return a && has(a.n); }).slice(0, 10);
  svc.search(v.term).then(function (r) { return r || {}; }, function (e) { return { error: e }; }).then(function (C) {
    if (tok !== B.token) return;
    var catSongs = C.songs || [], catTiles = (C.albums || []).concat(C.playlists || []), catArtists = C.artists || [];
    var n = libSongs.length + libTiles.length + libArtists.length + catSongs.length + catTiles.length + catArtists.length;
    setMeta(n ? n + ' results' : C.error ? 'search failed' : 'nothing found');
    if (!n && C.note) {
      showMsg('SEARCH IN THE SOUNDCLOUD WINDOW', C.note,
        textKey('browsesearch', 'SEARCH "' + v.term.slice(0, 40) + '" ON SOUNDCLOUD', null, 'Open SoundCloud\'s own search in a window of its own', I.search));
      return;
    }
    if (!n) { showMsg(C.error ? 'SEARCH FAILED' : 'NOTHING FOUND', C.error ? errText(C.error) : '見つかりません'); return; }
    var name = svc.label;
    showFlow([
      { title: 'YOUR LIBRARY: SONGS', ja: 'ライブラリの曲', kind: 'songs', name: 'libSongs', items: libSongs },
      { title: 'YOUR LIBRARY: ALBUMS & PLAYLISTS', ja: 'アルバム', kind: 'tiles', name: 'libTiles', items: libTiles },
      { title: 'YOUR LIBRARY: ARTISTS', ja: 'アーティスト', kind: 'artists', name: 'libArtists', items: libArtists },
      { title: name + ': SONGS', ja: 'カタログの曲', kind: 'songs', name: 'catSongs', items: catSongs },
      { title: name + ': ALBUMS & PLAYLISTS', ja: 'カタログ', kind: 'tiles', name: 'catTiles', items: catTiles },
      { title: name + ': ARTISTS', ja: 'アーティスト', kind: 'artists', name: 'catArtists', items: catArtists }
    ]);
    if (C.error) notice('SEARCHING ' + name + ' FAILED: ' + errText(C.error));
    if (C.note) ui.bBody.insertBefore(h('div', { class: 'mpb-note' }, h('span', { text: C.note }),
      textKey('browsesearch', 'SEARCH ON SOUNDCLOUD', null, 'Open SoundCloud\'s own search in a window of its own', I.search)), ui.bBody.firstChild);
    fetchRowFlags(catSongs);            // which of the service's songs are saved already
  });
}

// ---- signing in, and each service's own settings ----
function acctLine(text, cls) { return h('div', { class: cls || 'mpb-acct-line', text: text }); }
function viewAccount() {
  var svc = SVC, signed = svc.signedIn(), u = svc.user;
  if (svc.setProfile) {
    setHead({ title: svc.name, jp: svc.jp, hideActions: true, meta: svc.profile ? 'likes from ' + (svc.profile.name || svc.profile.link) : 'no profile link yet' });
    clearBody('msg');
    var sbox = h('div', { class: 'mpb-msg mpb-acct' });
    scAccount(sbox);
    if (svc.lastError) sbox.appendChild(acctLine(svc.lastError, 'mpb-acct-err'));
    ui.bBody.appendChild(sbox);
    return;
  }
  setHead({ title: svc.name, jp: svc.jp, hideActions: true,
            meta: signed ? 'signed in' + (u && u.name ? ' as ' + u.name : '') : svc.ready() ? 'not signed in' : 'not set up yet' });
  clearBody('msg');
  var box = h('div', { class: 'mpb-msg mpb-acct' });
  if (signed) {
    box.appendChild(h('div', { class: 'big', text: 'SIGNED IN TO ' + svc.label }));
    box.appendChild(acctLine((u && u.name ? u.name + '. ' : '') + svc.words.signedInNote));
    box.appendChild(h('div', { class: 'mpb-acct-keys' },
      textKey('signout', 'SIGN OUT', 'サインアウト', 'Sign out of ' + svc.name + ' in this player')));
  } else if (!svc.ready()) {
    box.appendChild(h('div', { class: 'big', text: 'CONNECT ' + svc.label }));
    box.appendChild(acctLine(svc.words.setupIntro));
    var steps = h('ol', { class: 'mpb-acct-steps' });
    svc.setupSteps().forEach(function (st) {
      var li = h('li', null, h('span', { text: st.text }));
      if (st.copy) li.appendChild(h('span', { class: 'mpb-acct-copy' },
        h('code', { text: st.copy }), textKey('copy', 'COPY', null, 'Copy this to the clipboard', null, 'mpb-acct-copykey')));
      if (st.copy) li.lastChild.lastChild.setAttribute('data-copy', st.copy);
      if (st.link) li.appendChild(textKey('openlink', st.linkText || 'OPEN', null, st.link, I.go, 'mpb-acct-link'));
      if (st.link) li.lastChild.setAttribute('data-link', st.link);
      steps.appendChild(li);
    });
    box.appendChild(steps);
    var fields = h('div', { class: 'mpb-acct-fields' });
    svc.setupFields().forEach(function (f) {
      var inp = h('input', { type: f.secret ? 'password' : 'text', class: 'mpb-acct-input', spellcheck: 'false', autocomplete: 'off',
                             placeholder: f.placeholder || '', 'aria-label': f.label, 'data-field': f.key });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ACT.connect(); } });
      fields.appendChild(h('label', { class: 'mpb-acct-field' }, h('span', { text: f.label }), inp));
    });
    fields.appendChild(textKey('connect', 'CONNECT', '接続', 'Save and go on to signing in', I.go));
    box.appendChild(fields);
  } else {
    box.appendChild(h('div', { class: 'big', text: 'SIGN IN TO ' + svc.label }));
    box.appendChild(acctLine(svc.words.signInNote));
    box.appendChild(h('div', { class: 'mpb-acct-keys' },
      textKey('signin', 'SIGN IN', 'サインイン', 'Sign in on ' + svc.name + '\'s own page', I.go),
      svc.setupFields().length ? textKey('setupagain', 'CHANGE APP DETAILS', null, 'Enter the app details again') : null));
  }
  if (svc.lastError) box.appendChild(acctLine(svc.lastError, 'mpb-acct-err'));
  ui.bBody.appendChild(box);
}

// (SoundCloud) nothing to sign in to: what plays and how, and the profile link
function scAccount(box) {
  var svc = SVC;
  box.appendChild(h('div', { class: 'big', text: 'SOUNDCLOUD' }));
  box.appendChild(acctLine('SoundCloud plays here through its own embeddable player (the one on blogs and band pages), so there is ' +
    'nothing to sign in to. Its songs, playlists, albums and artists all play; Go+ songs play as 30-second previews, as they do for anyone not signed in.'));
  box.appendChild(acctLine('Your profile link brings in your public SoundCloud likes (Likes & Saved). Playlists you make, songs and ' +
    'artists you save, and what you played are kept by this player, on this Mac.'));
  var inp = h('input', { type: 'text', class: 'mpb-acct-input', spellcheck: 'false', autocomplete: 'off', 'data-field': 'profile',
                         placeholder: 'soundcloud.com/yourname', 'aria-label': 'Your SoundCloud profile link' });
  inp.value = svc.profile ? svc.profile.link : '';
  inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ACT.scprofile(); } });
  box.appendChild(h('div', { class: 'mpb-acct-fields' },
    h('label', { class: 'mpb-acct-field' }, h('span', { text: 'YOUR SOUNDCLOUD PROFILE LINK (optional)' }), inp),
    textKey('scprofile', 'SAVE', '保存', 'Use this profile\'s likes', I.go)));
  if (svc.profile) box.appendChild(acctLine('Likes come from ' + (svc.profile.name || '') + '  (' + svc.profile.link + ')'));
  box.appendChild(h('div', { class: 'mpb-acct-keys' },
    textKey('browse', 'BROWSE SOUNDCLOUD', 'ブラウズ', 'Search and look around SoundCloud in a window of its own', I.search)));
}

// (SoundCloud) the SoundCloud window, and what is open in it
function viewBrowse() {
  var svc = SVC, b = svc.browsing, open = !!(svc.browseOpen && svc.browseOpen());
  setHead({ title: 'Browse SoundCloud', jp: 'ブラウズ', meta: open ? 'the SoundCloud window is open' : '', hideActions: true });
  clearBody('msg');
  var box = h('div', { class: 'mpb-msg mpb-acct' });
  if (b) {
    box.appendChild(h('div', { class: 'big', text: 'OPEN IN THE SOUNDCLOUD WINDOW' }));
    box.appendChild(acctLine(b.title + '   (' + ({ track: 'a song', playlist: 'a playlist or album', artist: 'an artist', likes: 'likes' }[b.link.kind] || '') + ')'));
    box.appendChild(h('div', { class: 'mpb-acct-keys' },
      textKey('browseplay', 'PLAY IT HERE', '再生', 'Play it in Stream Player', I.play),
      textKey('browseshow', 'SHOW IT HERE', null, 'Open it in Stream Player\'s browser', I.go),
      b.link.kind === 'likes' ? null : textKey('browsesave', 'SAVE IT HERE', '保存', 'Save it to your library here', I.plus)));
  } else {
    box.appendChild(h('div', { class: 'big', text: 'BROWSE SOUNDCLOUD' }));
    box.appendChild(acctLine('Search and look around SoundCloud in a window of its own. Open a song, playlist, album or artist there, ' +
      'and this page offers to play it here, show it, or save it.'));
  }
  box.appendChild(h('div', { class: 'mpb-acct-keys' },
    textKey('browse', open ? 'TO THE SOUNDCLOUD WINDOW' : 'OPEN THE SOUNDCLOUD WINDOW', null, 'SoundCloud, in a window of its own', I.search)));
  ui.bBody.appendChild(box);
}
// a SoundCloud link (from the window, or the search box): play, show or save it
function openFound(url, how) {
  var svc = SVC;
  if (!svc.open) return;
  notice((how === 'play' ? 'OPENING ' : how === 'save' ? 'SAVING ' : 'OPENING ') + url.replace(/^https?:\/\//, ''), true);
  svc.open(url).then(function (r) {
    if (svc !== SVC) return;
    if (r.likes) {
      return svc.search(url).then(function (res) {
        var songs = res.songs || [];
        if (how === 'play' && songs.length) startQueue({ songs: idsFrom(songs, 0, QUEUE_CHUNK) });
        else { if (S.mode !== 'full') setMode('full'); go({ kind: 'search', term: url }); }
      });
    }
    if (r.songs) {
      var s = r.songs[0];
      if (!s) throw new Error('that song cannot be played here');
      if (how === 'play') startQueue({ songs: [s.id] });
      else if (how === 'save') doAddToLibrary(s);
      else { if (S.mode !== 'full') setMode('full'); if (ui.search) ui.search.value = url; go({ kind: 'search', term: url }); }
      return;
    }
    if (r.tile) {
      var t = r.tile, v = { kind: 'playlist', id: t.id, name: t.n, artist: t.a, art: t.art, tc: t.tc, link: t.link };
      if (how === 'play') startQueue({ playlist: t.id, name: t.n });
      else if (how === 'save') doAddCollection(v);
      else { if (S.mode !== 'full') setMode('full'); go(v); }
      return;
    }
    if (r.artist) {
      var a = r.artist, av = { kind: 'artist', id: a.id, name: a.n, art: a.art, link: a.link };
      if (how === 'play') svc.artist(a.id).then(function (x) { if (x.songs.length) startQueue({ songs: idsFrom(x.songs, 0, QUEUE_CHUNK) }); else notice('NOTHING TO PLAY BY ' + a.n); });
      else if (how === 'save') doAddCollection(av);
      else { if (S.mode !== 'full') setMode('full'); go(av); }
    }
  }).catch(function (e) { notice('COULD NOT OPEN IT: ' + errText(e)); });
}

function renderView() {
  var v = B.view;
  if (!v || !ui.browser) return;
  var tok = ++B.token;
  syncNav();
  if (!S.music) {
    setHead({ title: 'Stream Player', jp: 'ストリームプレーヤー', meta: '', hideActions: true });
    showMsg('STARTING UP', '起動中');
    return;
  }
  // everything needs the service signed in; until then, the way to it
  if (v.kind === 'account' || !authorized()) { viewAccount(tok); return; }
  if (v.kind === 'browse') { viewBrowse(tok); return; }
  if (v.kind === 'search') { viewSearch(v, tok); return; }
  switch (v.kind) {
    case 'recent': viewRecent(tok); break;
    case 'songs': viewSongs(tok); break;
    case 'albums': viewAlbums(tok); break;
    case 'artists': viewArtists(tok); break;
    case 'artist': viewArtist(v, tok); break;
    case 'playlist':
    case 'album': viewCollection(v, tok); break;
  }
}

// ---- library panel ----
function navItem(goKey, icon, label, ja) {
  return h('button', { class: 'mpa-nav-item', type: 'button', 'data-go': goKey, title: label },
    svg(icon), h('span', { class: 'nm', text: label }), ja ? jp(ja) : null);
}
// the library entries the service has (Liked Songs, Albums ...)
function renderNavList() {
  if (!ui.navList) return;
  ui.navList.replaceChildren.apply(ui.navList, (SVC.nav || []).map(function (n) {
    return navItem(n.go, I[n.icon] || I.list, n.label, n.jp);
  }));
  syncNav();
}
function renderNavPlaylists() {
  if (!ui.navPls) return;
  var list = orderedPlaylists(), frag = document.createDocumentFragment(), item;
  for (var i = 0; i < list.length; i++) {
    item = navItem('playlist:' + list[i].id, I.list, list[i].n, null);
    item.title = list[i].n + '  (drag it to reorder your playlists)';
    frag.appendChild(item);
  }
  ui.navPls.replaceChildren(frag);
  ui.navPlCount.textContent = list.length ? String(list.length) : '';
  if (ui.navPlReset) ui.navPlReset.hidden = !list.length || !store.get(plKey(), null);
  syncNav();
}

// ---- the listener's own order for the playlists ----
// The order dragged into shape here is kept on this computer (one for each
// service). Playlists it does not know yet (new ones) go at the end, in the
// service's order; deleted ones simply drop out.
function plKey() { return 'plOrder.' + SVC.id; }
function orderedPlaylists() {
  var list = (DB.playlists || []).slice(), order = store.get(plKey(), null);
  if (!order || !order.length) return list;
  var rank = {}, i;
  for (i = 0; i < order.length; i++) rank[order[i]] = i;
  return list.map(function (p, k) { return { p: p, r: rank.hasOwnProperty(p.id) ? rank[p.id] : 100000 + k }; })
    .sort(function (a, b) { return a.r - b.r; })
    .map(function (x) { return x.p; });
}
function savePlaylistOrder(ids) {
  store.set(plKey(), ids);
  renderNavPlaylists();
}
function navPlItems() {
  return Array.prototype.filter.call(ui.navPls.children, function (c) { return c.classList && c.classList.contains('mpa-nav-item'); });
}
// move one playlist to place `to` (0 = top), counted in the list without it
function movePlaylist(id, to) {
  var ids = orderedPlaylists().map(function (p) { return p.id; }), from = ids.indexOf(id);
  if (from < 0) return;
  ids.splice(from, 1);
  to = Math.max(0, Math.min(ids.length, to));
  ids.splice(to, 0, id);
  savePlaylistOrder(ids);
}

// Dragging: press on a playlist, move a few pixels, a lit line shows where it
// will land, let go. A press without moving stays an ordinary click.
var PLDRAG = null;
function onPlDown(e) {
  if (e.button !== 0 || !ui.navPls) return;
  var item = e.target.closest && e.target.closest('.mpa-nav-item');
  if (!item || item.parentNode !== ui.navPls) return;
  PLDRAG = { item: item, id: item.getAttribute('data-go').slice(9), x: e.clientX, y: e.clientY, pid: e.pointerId, moved: false, to: -1 };
}
function onPlMove(e) {
  var d = PLDRAG;
  if (!d || e.pointerId !== d.pid) return;
  if (!d.moved) {
    if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) < 6) return;
    d.moved = true;
    try { ui.navPls.setPointerCapture(e.pointerId); } catch (x) {}
    d.item.setAttribute('data-drag', '1');
    ui.navPls.setAttribute('data-dragging', '1');
    d.mark = h('div', { class: 'mpa-drop' });
    ui.navPls.appendChild(d.mark);
  }
  e.preventDefault();
  if (!d.mark.parentNode) ui.navPls.appendChild(d.mark);   // (the list was redrawn meanwhile)
  var items = navPlItems(), box = ui.navPls.getBoundingClientRect(), i, r, n = items.length;
  if (!n) return;
  // a column (wide window) or a row of tabs (narrow window)?
  var across = n > 1 && Math.abs(items[0].getBoundingClientRect().top - items[1].getBoundingClientRect().top) < 4;
  var pos = across ? e.clientX : e.clientY, slot = n;
  for (i = 0; i < n; i++) {
    r = items[i].getBoundingClientRect();
    if (pos < (across ? r.left + r.width / 2 : r.top + r.height / 2)) { slot = i; break; }
  }
  d.slot = slot;
  // the lit line, between two playlists
  var ref = items[Math.min(slot, n - 1)].getBoundingClientRect(), s = d.mark.style;
  if (across) {
    var x = (slot < n ? ref.left - 3 : ref.right + 1) - box.left + ui.navPls.scrollLeft;
    s.left = x + 'px'; s.top = (ref.top - box.top + ui.navPls.scrollTop) + 'px'; s.width = '2px'; s.height = ref.height + 'px';
  } else {
    var y = (slot < n ? ref.top - 2 : ref.bottom) - box.top + ui.navPls.scrollTop;
    s.top = y + 'px'; s.left = '4px'; s.right = '4px'; s.width = ''; s.height = '2px';
  }
  // near the edge of a list that scrolls: scroll along
  if (!across) {
    if (e.clientY < box.top + 24) ui.navPls.scrollTop -= 8;
    else if (e.clientY > box.bottom - 24) ui.navPls.scrollTop += 8;
  } else if (ui.nav && ui.nav.scrollWidth > ui.nav.clientWidth) {   // (narrow window: the row scrolls sideways)
    var nb = ui.nav.getBoundingClientRect();
    if (e.clientX < nb.left + 30) ui.nav.scrollLeft -= 10;
    else if (e.clientX > nb.right - 30) ui.nav.scrollLeft += 10;
  }
}
function onPlUp(e) {
  var d = PLDRAG;
  if (!d || e.pointerId !== d.pid) return;
  PLDRAG = null;
  if (!d.moved) return;                  // an ordinary click: the click handler opens the playlist
  e.preventDefault();
  try { ui.navPls.releasePointerCapture(e.pointerId); } catch (x) {}
  if (d.mark && d.mark.parentNode) d.mark.parentNode.removeChild(d.mark);
  d.item.removeAttribute('data-drag');
  ui.navPls.removeAttribute('data-dragging');
  PLDRAG_NOCLICK = performance.now() + 400;          // the click that follows a drag is not a click
  if (e.type === 'pointercancel' || d.slot === undefined) return;
  var from = orderedPlaylists().map(function (p) { return p.id; }).indexOf(d.id);   // (as shown)
  movePlaylist(d.id, d.slot > from ? d.slot - 1 : d.slot);
}
var PLDRAG_NOCLICK = 0;
function syncNav() {
  if (!ui.nav) return;
  var v = B.view, key = '';
  if (v) {
    key = v.kind === 'playlist' ? 'playlist:' + v.id
      : v.kind === 'album' ? 'albums'
      : v.kind === 'artist' ? 'artists'
      : v.kind;
  }
  var items = ui.nav.querySelectorAll('[data-go]');
  for (var i = 0; i < items.length; i++)
    items[i].setAttribute('aria-current', items[i].getAttribute('data-go') === key ? 'true' : 'false');
}
function onNavClick(e) {
  if (performance.now() < PLDRAG_NOCLICK) { e.preventDefault(); return; }
  var b = e.target.closest && e.target.closest('[data-go]');
  if (!b) { onActClick(e); return; }
  if (e.detail > 0) b.blur();
  var key = b.getAttribute('data-go');
  if (ui.search) ui.search.value = '';
  if (key.indexOf('playlist:') === 0) {
    var id = key.slice(9), pl = null, list = DB.playlists || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) pl = list[i];
    go({ kind: 'playlist', id: id, name: pl ? pl.n : 'Playlist', art: pl ? pl.art : '', artist: pl ? pl.a : '', tc: pl ? pl.tc : 0 });
  } else {
    go({ kind: key });
  }
}

// ---- clicks and keys in the browser ----
function selectRow(i) {
  B.sel = i;
  if (B.vlist) { B.vlist.update(true); B.vlist.reveal(i); }
}
function onBodyClick(e) {
  var t = e.target;
  if (!t.closest) return;
  // the second half of a double-click whose first half opened a tile: not meant for the new view
  if (e.detail > 1 && performance.now() - (B.tileAt || -1e9) < 500) return;
  var tile = t.closest('.mpg-tile');
  if (tile) {
    if (e.detail >= 1) B.tileAt = performance.now();
    var sn = tile.getAttribute('data-sec'), idx = +tile.getAttribute('data-i');
    openTile(sn ? (B.secs[sn] && B.secs[sn].items[idx]) : (B.tiles && B.tiles[idx]));
    return;
  }
  var row = t.closest('.mpr');
  if (!row) { onActClick(e); return; }
  var key = t.closest('[data-row]');
  if (key) {                           // one of the row's own keys: + (add to library) or ... (menu)
    var song = rowSong(row);
    if (e.type !== 'click' || !song) return;
    if (e.detail > 0) key.blur();
    if (key.getAttribute('data-row') === 'add') doAddToLibrary(song);
    else {
      var box = key.getBoundingClientRect();
      openSongMenu(song, box.right - 236, box.bottom + 4, { play: rowPlay(row) });
    }
    return;
  }
  var i = +row.getAttribute('data-i'), secName = row.getAttribute('data-sec');
  if (row.getAttribute('data-kind') === 'artist') {
    var a = secName ? B.secs[secName].items[i] : (B.items && B.items[i]);
    if (a) go({ kind: 'artist', id: a.id, name: a.n, art: a.art, link: a.link });
    return;
  }
  if (secName) {                       // a song among search results
    var old = ui.bBody.querySelector('.mpr[data-sel="1"]');
    if (old) old.removeAttribute('data-sel');
    row.setAttribute('data-sel', '1');
    if (e.type === 'dblclick' && B.secs[secName].play) B.secs[secName].play(i);
    return;
  }
  if (!B.items || !B.items[i]) return;
  selectRow(i);
  if (e.type === 'dblclick' && B.play) B.play(i);
}

// right-click on a song: its menu
function onBodyMenu(e) {
  var row = e.target.closest && e.target.closest('.mpr');
  if (!row || row.getAttribute('data-kind') === 'artist') return;
  var song = rowSong(row);
  if (!song || !song.id) return;
  e.preventDefault();
  if (row.getAttribute('data-sec')) {
    var old = ui.bBody.querySelector('.mpr[data-sel="1"]');
    if (old) old.removeAttribute('data-sel');
    row.setAttribute('data-sel', '1');
  } else {
    B.sel = +row.getAttribute('data-i');
    if (B.vlist) B.vlist.update(true);
  }
  openSongMenu(song, e.clientX, e.clientY, { play: rowPlay(row) });
}
// ...and on a row of the queue
function onListMenu(e) {
  var row = e.target.closest && e.target.closest('.mpc-row');
  if (!row) return;
  var i = parseInt(row.getAttribute('data-i'), 10), it = queueItems()[i];
  if (!it) return;
  e.preventDefault();
  openSongMenu(songFromItem(it), e.clientX, e.clientY, i === curIndex() ? {} : { play: function () { call('changeToMediaAtIndex', i); } });
}

function onSearchInput() {
  clearTimeout(B.searchTimer);
  B.searchTimer = setTimeout(function () {
    var term = ui.search.value.trim();
    if (term.length < 2) {
      if (!term && B.view && B.view.kind === 'search') {
        var v = B.hist.pop() || { kind: 'recent' };
        B.view = v;
        renderView();
      }
      return;
    }
    go({ kind: 'search', term: term });
  }, 320);
}

// What changed when signing in or out, or when the player first appears.
function onAuthChange() {
  if (!S.music) return;
  dlog(authorized() ? 'signed in' : 'not signed in');
  if (authorized()) {
    renderNavPlaylists();
    loadPlaylists().catch(function () {});
    // warm the big lists a little later so the first screen comes up first
    setTimeout(function () { if (authorized() && DB.songsState === 'idle') loadSongs(function () { if (B.view && B.view.kind === 'songs') renderView(); }); }, 2500);
    setTimeout(function () { if (authorized()) { loadAlbums().catch(function () {}); loadArtists().catch(function () {}); } }, 6000);
  } else {
    dropCache();
    renderNavPlaylists();
  }
  if (S.mode === 'full') renderView();
  lyRefresh(true);
}

// ============================================================================
// Floating compact player (Mac)
// A browser window cannot stay above other apps' windows, but a
// Picture-in-Picture window can - and Chrome, Edge and Brave (116 and later)
// can show a whole page in one (Document Picture-in-Picture). So on a Mac,
// with "keep on top" on (the pin key; on by default there), the compact
// player moves into one: it floats above every other window, the browser's
// own included, whatever app is in front. Its parts are the same ones, moved
// over and still driven from here; they come back when it closes. Meanwhile
// the tab shows a plate saying where the player went. Closing the floating
// window (or its "back to tab" key) brings back the full player.
//
// Only a click or a key press may open such a window. When the compact player
// comes up by itself ("shrink when music starts", a while after the click), or
// the browser cannot float a page, it is the ordinary compact window instead.
// ============================================================================
var FLOAT = { win: null, opening: false, gen: 0, resizeTimer: 0 };

function floatOk() { return HOST_KIND === 'mac' && !!window.documentPictureInPicture; }
// the window, and the page, the player is drawn in now
function drawWin() { return FLOAT.win || window; }
function drawDoc() { return FLOAT.win ? FLOAT.win.document : document; }

// requestAnimationFrame in the window the player is in, with the time reckoned
// as on this page (performance.now() here). A frame asked for before the
// player moved is dropped: the loop starts again in the new window.
function nextFrame(fn) {
  var w = drawWin(), gen = FLOAT.gen, off = 0;
  if (w !== window) { try { off = w.performance.timeOrigin - performance.timeOrigin; } catch (e) {} }
  try { return w.requestAnimationFrame(function (t) { if (gen === FLOAT.gen) fn(t + off); }); }
  catch (e) { return 0; }
}

// Open the floating window and move the player into it. False when that
// cannot be done here and now (the ordinary compact window is used then).
function floatOpen() {
  if (FLOAT.win || FLOAT.opening) return true;
  if (!floatOk() || (navigator.userActivation && !navigator.userActivation.isActive)) return false;
  var size = compactSize(), p;
  try { p = window.documentPictureInPicture.requestWindow({ width: size[0], height: size[1] }); }
  catch (e) { dlog('floating player: ' + errText(e)); return false; }
  FLOAT.opening = true;
  applyTheme();
  Promise.resolve(p).then(function (win) {
    FLOAT.opening = false;
    if (S.mode === 'compact' && S.onTop && !FLOAT.win) { floatMove(win); return; }
    try { win.close(); } catch (e) {}                     // (changed meanwhile)
    applyTheme();
    if (S.mode === 'compact') requestCompactSize();
  }, function (e) {
    FLOAT.opening = false;
    dlog('floating player refused: ' + errText(e));
    applyTheme();
    if (S.mode === 'compact') requestCompactSize();       // the ordinary compact window, then
  });
  return true;
}

function floatMove(win) {
  var doc = win.document, css = skinCss();
  FLOAT.win = win;
  try {
    var sheet = new win.CSSStyleSheet();
    sheet.replaceSync(css);
    doc.adoptedStyleSheets = [sheet];
  } catch (e) {
    var st = doc.createElement('style');
    st.textContent = css;
    doc.head.appendChild(st);
  }
  doc.title = 'Stream Player';
  doc.documentElement.setAttribute('data-mp-floating', '1');
  fontsInto(win);
  applyTheme();
  doc.body.appendChild(ui.root);
  floatFresh();

  win.addEventListener('keydown', onKey, true);
  win.addEventListener('pointerdown', function (e) {
    if (menuOpen() && ui.menu && !ui.menu.contains(e.target)) closeMenu();
  }, true);
  win.addEventListener('blur', function () { closeMenu(); });
  win.addEventListener('resize', function () {
    clearTimeout(FLOAT.resizeTimer);
    FLOAT.resizeTimer = setTimeout(function () {
      if (FLOAT.win === win && deckShown()) { setMarquee(S.marquee, true); kickViz(); vzKick(); }
    }, 120);
  });
  doc.addEventListener('visibilitychange', function () {
    if (FLOAT.win === win && !doc.hidden) { kickViz(); vzKick(); lyKick(); }
  });
  // closed by hand, or with its "back to tab" key: the full player, in the tab
  win.addEventListener('pagehide', function () {
    if (FLOAT.win !== win) return;                        // (closed from here: taken care of)
    floatHome();
    if (S.mode === 'compact') setMode('full');
  });
  dlog('floating player: ' + win.innerWidth + 'x' + win.innerHeight);
}

// After a move: fresh pictures for the two displays (a graphics context
// belongs with its page), and the moving parts started again where the
// player is now.
function floatFresh() {
  FLOAT.gen++;
  viz.raf = VZ.raf = LY.raf = 0;
  viz.last = VZ.last = 0;
  if (ui.viz && ui.viz.parentNode) {
    var c = h('canvas', { class: 'mpc-viz', 'aria-hidden': 'true' });
    ui.viz.parentNode.replaceChild(c, ui.viz);
    ui.viz = c;
  }
  if (VZ.gl) { try { var x = VZ.gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (e) {} }
  if (ui.vzCanvas && ui.vzCanvas.parentNode) vzNewCanvas();
  closeMenu();
  setTimeout(function () {
    kickViz(); vzKick(); lyKick();
    markCurrent(true);
    if (deckShown()) setMarquee(S.marquee, true);
  }, 60);
}

// The player back into the page (the floating window is going).
function floatHome() {
  var win = FLOAT.win;
  FLOAT.win = null;
  clearTimeout(FLOAT.resizeTimer);
  if (document.body && ui.root) document.body.appendChild(ui.root);
  applyTheme();
  floatFresh();
  return win;
}

// The player leaves the floating window (LIBRARY, Ctrl+M, the pin): close it,
// and bring the tab - where the player is again - to the front.
function floatClose(focusTab) {
  if (!FLOAT.win) return false;
  var win = floatHome();
  try { win.close(); } catch (e) {}
  if (focusTab) send('focus|1');
  return true;
}

// The floating window as tall as what is open in it (as wide as it was left).
// The browser allows that right after a click or key in it, which is when
// the panels change.
function floatFit(height) {
  var w = FLOAT.win;
  try { w.resizeTo(w.outerWidth, height + (w.outerHeight - w.innerHeight)); } catch (e) {}
}

// (safety net) the floating window went without saying so: the player comes home
function floatCheck() {
  if (FLOAT.win && FLOAT.win.closed) { floatHome(); if (S.mode === 'compact') setMode('full'); }
}

// Keep our pieces in the page (or in the floating window).
function keepAttached() {
  if (!document.body || !ui.root) return;
  if (!ui.root.isConnected || (!FLOAT.win && ui.root.ownerDocument !== document)) document.body.appendChild(ui.root);
  if (ui.away && !ui.away.isConnected) document.body.appendChild(ui.away);
}

// Styles for the Mac's extras (added after player.css).
var MAC_CSS = [
  '/* ---- Mac: the floating compact player, and the plate the tab shows meanwhile ---- */',
  'html[data-mp-floating="1"] { color-scheme: dark; }',
  'html[data-mp-floating="1"] body { margin: 0; }',
  '#mp-away { display: none; }',
  'html[data-mp-float="1"] #mp-away {',
  '  position: fixed; inset: 0; z-index: 2147483601;',
  '  display: grid; place-items: center; padding: 24px; overflow: auto;',
  '  color: var(--mp-shell-text);',
  '  background: var(--mp-shippo), linear-gradient(180deg, var(--mp-shell-a), var(--mp-shell-b));',
  '  font-family: var(--mp-f-ui);',
  '  -webkit-user-select: none; user-select: none;',
  '}',
  '.mpw-box { display: grid; justify-items: center; gap: 16px; width: min(440px, 100%); text-align: center; }',
  '.mpw-brand { display: flex; align-items: center; gap: 9px; }',
  '.mpw-lcd {',
  '  display: grid; gap: 8px; width: 100%; padding: 18px 22px; border-radius: 8px;',
  '  border: 1px solid var(--mp-edge); color: var(--mp-lcd-fg); background: var(--mp-lcd-bg);',
  '  box-shadow: inset 0 2px 7px rgba(0, 0, 0, .65), 0 1px 0 var(--mp-hi);',
  '}',
  '.mpw-jp { font-size: 22px; letter-spacing: .3em; text-shadow: var(--mp-glow); }',
  '.mpw-title { font: 700 13px/1.3 var(--mp-f-mono); letter-spacing: .18em; color: var(--mp-lcd-text); text-shadow: var(--mp-glow); }',
  '.mpw-text { font: 12px/1.55 var(--mp-f-ui); color: var(--mp-lcd-soft); }',
  '#mp-away .mpc-lib { height: 30px; padding: 0 14px; }',
  '/* ---- Mac: how to let the visualizer hear the music ---- */',
  '.mpv-hint { font-size: 10.5px; line-height: 1.4; max-height: calc(100% - 16px); overflow: hidden; }',
  '.mpv-hint span { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; overflow: hidden; }',
  '.mpv-note:not([hidden]) ~ .mpv-hint { top: auto; bottom: 8px; }'
].join('\n');

// ------------------------------------------------------------- actions -------
var ACT = {
  full: function () { setMode('full'); },
  compact: function () { setMode('compact'); },
  account: function () { if (S.mode !== 'full') setMode('full'); if (ui.search) ui.search.value = ''; go({ kind: 'account' }); },
  service: function () { switchService(); },
  signin: function () {
    var svc = SVC;
    svc.lastError = '';
    notice('SIGNING IN TO ' + svc.label + ' - in the window that opened', true);
    svc.signIn().then(function () {
      notice('SIGNED IN TO ' + svc.label, true);
      if (svc === SVC) { onAuthChange(); if (svc.warm) svc.warm(); if (B.view && B.view.kind === 'account') go({ kind: 'recent' }); }
    }, function (e) {
      if (!(e && e.closed)) svc.lastError = 'Signing in did not work: ' + errText(e);
      notice(e && e.closed ? 'SIGNING IN STOPPED (the window was closed)' : 'COULD NOT SIGN IN: ' + errText(e));
      if (svc === SVC && S.mode === 'full') renderView();
    });
  },
  signout: function () { SVC.signOut(); notice('SIGNED OUT OF ' + SVC.label, true); onAuthChange(); },
  scprofile: function () {
    var inp = ui.bBody.querySelector('[data-field="profile"]');
    var bad = SVC.setProfile ? SVC.setProfile(inp ? inp.value : '') : '';
    if (bad) { notice(bad); return; }
    notice(SVC.profile ? 'PROFILE SAVED - READING YOUR LIKES' : 'PROFILE LINK REMOVED', true);
    DB.songsState = 'idle';
    DB.songs = []; DB.songsTotal = -1;
    loadSongs(function () { if (S.mode === 'full' && B.view && B.view.kind === 'songs') renderView(); });
    go({ kind: SVC.profile ? 'songs' : 'account' });
  },
  browse: function () {
    if (!SVC.browse) return;
    SVC.browse().catch(function (e) { notice('COULD NOT OPEN THE SOUNDCLOUD WINDOW: ' + errText(e)); });
    if (S.mode === 'full' && (!B.view || B.view.kind !== 'browse')) go({ kind: 'browse' });
  },
  browsesearch: function () {
    if (!SVC.browse) return;
    var term = B.view && B.view.kind === 'search' ? B.view.term : '';
    SVC.browse(term).catch(function (e) { notice('COULD NOT OPEN THE SOUNDCLOUD WINDOW: ' + errText(e)); });
  },
  browseplay: function () { if (SVC.browsing) openFound(SVC.browsing.link.url, 'play'); },
  browseshow: function () { if (SVC.browsing) openFound(SVC.browsing.link.url, 'show'); },
  browsesave: function () { if (SVC.browsing) openFound(SVC.browsing.link.url, 'save'); },
  setupagain: function () { if (SVC.forgetApp) SVC.forgetApp(); renderView(); },
  connect: function () {
    var vals = {}, inputs = ui.bBody.querySelectorAll('[data-field]');
    for (var i = 0; i < inputs.length; i++) vals[inputs[i].getAttribute('data-field')] = inputs[i].value.trim();
    var bad = SVC.setApp(vals);
    if (bad) { notice(bad); return; }
    renderView();
    ACT.signin();
  },
  theme: function () { openPanel(); },
  addview: function () { doAddCollection(B.view); },
  plreset: function () { store.del(plKey()); renderNavPlaylists(); notice('PLAYLISTS BACK IN ' + SVC.label + '\'S ORDER', true); },
  nowmenu: function () {                 // the "+ ADD" on the song display: the menu for the song that is playing
    var it = nowItem();
    if (!it || !ui.chipAdd) return;
    if (menuOpen()) { closeMenu(); return; }
    var box = ui.chipAdd.getBoundingClientRect();
    openSongMenu(songFromItem(it), box.left, box.bottom + 6, {});
  },
  closepanel: function () { closePanel(); },
  // themes of your own
  themenew: function () { editOpen(''); },
  themeedit: function () { if (userTheme(S.theme)) editOpen(S.theme); },
  themeexport: function () { exportTheme(S.theme); },
  themeimport: function () { if (ui.userFile) { ui.userFile.value = ''; ui.userFile.click(); } },
  themedelete: function () {                      // asks once more: press it twice
    var t = userTheme(S.theme), b = ui.userDelete;
    if (!t || !b) return;
    if (b.getAttribute('data-arm') === '1') { disarmDelete(); deleteTheme(t.id); userSay('DELETED: ' + t.name, true); return; }
    b.setAttribute('data-arm', '1');
    b.querySelector('span').textContent = 'SURE? PRESS AGAIN';
    clearTimeout(USER.armTimer);
    USER.armTimer = setTimeout(disarmDelete, 3500);
  },
  editsave: function () { editSave(); },
  editcancel: function () { editCancel(); },
  editphoto: function () { if (ui.edFile) { ui.edFile.value = ''; ui.edFile.click(); } },
  editnophoto: function () { editNoPhoto(); },
  editflip: function () { var p = edPhoto(); if (!p) return; p.flip = !p.flip; editFill(); applyTheme(); },
  editfont: function () { if (ui.edFontFile) { ui.edFontFile.value = ''; ui.edFontFile.click(); } },
  editnofont: function () { editNoFont(); },
  meter: function () { meterNext(); },
  poptest: function () { npSettings(); NP.last = ''; npSend(); send('popup|test'); },
  ontop: function () { setOnTop(!S.onTop); },
  pl: function () { setPanel('pl', !S.showPl); },
  viz: function () { setPanel('viz', !S.showViz); },
  lyr: function () { setPanel('lyr', !S.showLyr); },
  vizprev: function () { vzStep(-1); },
  viznext: function () { vzStep(1); },
  vizlist: function () { vzMenu(ui.vzMenu.hidden); },
  vizauto: function () { vzSetAuto(!VZ.auto); vzOsd('自動', VZ.auto ? 'AUTO: NEW EFFECT EVERY 40 SECONDS' : 'AUTO OFF'); },
  vizbig: function () { setVizBig(!S.vizBig); },
  vizretry: function () { vzRetry(); },
  vizhint: function () { VZ.hintOff = true; vzHintSync(); },
  lyrroma: function () { LY.roma = !LY.roma; store.set('lyrRoma', LY.roma); lySyncKeys(); lyBigLine(); },
  lyrtrans: function () { LY.trans = !LY.trans; store.set('lyrTrans', LY.trans); lySyncKeys(); lyBigLine(); },
  lyrretry: function () { lyRefresh(true); },
  back: function () { goBack(); },
  playview: function () { if (B.play) B.play(B.sel >= 0 ? B.sel : 0); },
  shuffleview: function () { if (B.shuffle) B.shuffle(); },
  timemode: function () { S.remaining = !S.remaining; store.set('remaining', S.remaining); refreshTime(); },
  play: function () { call('play'); },
  pause: function () { S.haltAt = performance.now(); call('pause'); },
  stop: function () { S.haltAt = performance.now(); call('stop'); },
  next: function () { call('skipToNextItem'); },
  prev: function () {
    // like a CD player: early in a track goes back one, later restarts it
    var t = 0;
    try { t = S.music.currentPlaybackTime || 0; } catch (e) {}
    if (t > 3) call('seekToTime', 0); else call('skipToPreviousItem');
  },
  shuffle: function () {
    var m = S.music, mk = MK();
    if (!m || !mk || !mk.PlayerShuffleMode) return;
    try {
      if (S.shuffleHeld) {
        // pressed while a picked song is still starting (lamp lit, switch held
        // off): the listener wants it off, so simply do not switch it back on
        S.shuffleHeld = false;
      } else {
        m.shuffleMode = m.shuffleMode === mk.PlayerShuffleMode.off ? mk.PlayerShuffleMode.songs : mk.PlayerShuffleMode.off;
      }
    } catch (e) {}
    setTimeout(refreshModes, 60);
  },
  repeat: function () {
    var m = S.music, mk = MK();
    if (!m || !mk || !mk.PlayerRepeatMode) return;
    var R = mk.PlayerRepeatMode;
    try { m.repeatMode = m.repeatMode === R.none ? R.all : m.repeatMode === R.all ? R.one : R.none; } catch (e) {}
    setTimeout(refreshModes, 60);
  }
};

function togglePlay() {
  var playing = false;
  try { playing = !!S.music.isPlaying; } catch (e) {}
  if (playing) S.haltAt = performance.now();
  call(playing ? 'pause' : 'play');
}

function onActClick(e) {
  var b = e.target.closest && e.target.closest('[data-act]');
  if (!b) return;
  // after a mouse click, drop focus so Space keeps meaning play / pause
  if (e.detail > 0 && typeof b.blur === 'function') b.blur();
  var act = b.getAttribute('data-act');
  if (act === 'copy') { copyText(b.getAttribute('data-copy') || ''); return; }
  if (act === 'openlink') { var link = b.getAttribute('data-link'); if (link && window.MPAuth) window.MPAuth.openPage(link); return; }
  var fn = ACT[act];
  if (fn) fn();
}
function copyText(text) {
  if (!text) return;
  Promise.resolve().then(function () { return navigator.clipboard.writeText(text); }).then(function () {
    notice('COPIED: ' + text, true);
  }, function () { notice('COULD NOT COPY - select it and press Cmd+C'); });
}

// The switch at the top: the other service. What was playing on the one being
// left is paused; each keeps its own queue, song, library and place in the
// browser, so switching back finds it as it was.
var BS = {};
function switchService(id) {
  var next = id ? SVCS[id] : SVCS[SVC_IDS[(SVC_IDS.indexOf(SVC.id) + 1) % SVC_IDS.length]];
  if (!next || next === SVC) return;
  var old = SVC;
  try { if (old.engine.isPlaying || old.engine.playbackState === 1) old.engine.pause(); } catch (e) {}
  closeMenu();
  BS[old.id] = { view: B.view, hist: B.hist };
  SVC = next;
  DB = DBS[next.id];
  S.music = next.engine;
  store.set('service', next.id);
  var back = BS[next.id];
  B.view = back ? back.view : { kind: (next.nav && next.nav[0] && next.nav[0].go) || 'recent' };
  B.hist = back ? back.hist : [];
  if (ui.search) {
    ui.search.value = B.view && B.view.kind === 'search' ? B.view.term : '';
    ui.search.setAttribute('aria-label', 'Search your library and ' + next.name);
  }
  S.pendingAuto = false;
  S.shuffleHeld = false;
  syncSwitch();
  renderNavList();
  renderNavPlaylists();
  onState();
  refreshAll();
  onAuthChange();
  lyRefresh(true);
  vzSongOsd();
  if (next.warm) next.warm();
  notice('NOW PLAYING FROM ' + next.label, true);
  dlog('switched to ' + next.id);
}

// Switch between the three faces.
function setMode(mode) {
  if (mode !== 'full' && mode !== 'compact') return;
  if (S.mode === mode) return;
  if (S.vizBig) { S.vizBig = false; syncPanels(); }
  S.mode = mode;
  applyTheme();
  notifyHost();
  closePanel();
  if (mode === 'compact') {
    // Mac, with "keep on top": a floating window of its own, if one can be had
    if (!(S.onTop && floatOpen())) requestCompactSize();
  } else {
    floatClose(true);
    send('compact|0');
  }

  S.marquee = null;
  refreshAll();
  vizColors();
  kickViz();
  if (mode === 'full') {
    if (!B.view) B.view = { kind: 'recent' };
    // sizes changed with the window: let lists and the song line re-measure
    setTimeout(function () { if (S.mode === 'full') { renderView(); setMarquee(S.marquee, true); } }, 80);
  }
  setTimeout(function () { kickViz(); vzKick(); lyRefresh(); lyKick(); fitClock(); bgvSync(); }, 150);
}

// The compact window is as tall as what is open in it: the deck alone, or the
// deck with any of the three panels stacked under it.
function requestCompactSize() {
  if (S.mode !== 'compact') return;
  var size = compactSize();
  if (FLOAT.win) { floatFit(size[1]); return; }
  if (FLOAT.opening) return;
  // while a theme is being edited, the window is wider by the editor, which
  // sits beside the compact player instead of over it (player.css)
  send('compact|1|' + (size[0] + (editing() ? EDIT_W : 0)) + '|' + size[1]);
}
function compactSize() {
  var base = ui.strip.offsetHeight + ui.deck.offsetHeight;
  var n = (S.showViz ? 1 : 0) + (S.showLyr ? 1 : 0) + (S.showPl ? 1 : 0), height = base;
  if (n === 1 && S.showPl) height = COMPACT_H;
  else if (n) height = base + 10 + (n - 1) * 6 + (S.showViz ? CP_VIZ : 0) + (S.showLyr ? CP_LYR : 0) + (S.showPl ? CP_PL : 0);
  var room = (window.screen && screen.availHeight ? screen.availHeight : 900) - 56;
  return [COMPACT_W, Math.round(Math.max(base, Math.min(height, room)))];
}

// Switch one of the panels on or off: 'viz', 'lyr' or 'pl' (the queue).
function setPanel(which, on) {
  var key = which === 'viz' ? 'showViz' : which === 'lyr' ? 'showLyr' : 'showPl';
  S[key] = !!on;
  store.set(key, S[key]);
  if (which === 'viz' && !on) { S.vizBig = false; vzMenu(false); }
  syncPanels();
  requestCompactSize();
  if (which === 'pl' && on) markCurrent(true);
  if (which === 'viz' && on) { VZ.last = 0; vzKick(); }
  if (which === 'lyr' && on) { lyRefresh(); lyKick(); }
  lyBigLine();
  // the column changed width: let the lists and the song line re-measure
  setTimeout(function () {
    if (S.mode === 'full' && B.vlist) B.vlist.update(false);
    if (deckShown()) setMarquee(S.marquee, true);
  }, 80);
}

function syncPanels() {
  if (!ui.app) return;
  ui.app.setAttribute('data-pl', S.showPl ? '1' : '0');
  ui.app.setAttribute('data-viz', S.showViz ? '1' : '0');
  ui.app.setAttribute('data-lyr', S.showLyr ? '1' : '0');
  ui.app.setAttribute('data-vizbig', S.vizBig ? '1' : '0');
  [[ui.tgViz, S.showViz], [ui.tgLyr, S.showLyr], [ui.tgPl, S.showPl]].forEach(function (x) {
    if (!x[0]) return;
    x[0].setAttribute('data-on', x[1] ? '1' : '0');
    x[0].setAttribute('aria-pressed', x[1] ? 'true' : 'false');
  });
  bgvSync();                           // (a video in a panel that was switched off stops)
}

function setOnTop(on) {
  S.onTop = !!on;
  store.set('compactOnTop', S.onTop);
  send('ontop|' + (S.onTop ? 1 : 0));
  if (ui.pinBtn) {
    ui.pinBtn.setAttribute('data-on', S.onTop ? '1' : '0');
    ui.pinBtn.setAttribute('aria-pressed', S.onTop ? 'true' : 'false');
  }
  syncPanel();
  // Mac: the compact player floats now, or goes back to being the ordinary compact window
  if (floatOk() && S.mode === 'compact') {
    if (S.onTop && !FLOAT.win) { if (floatOpen()) send('compact|0'); }
    else if (!S.onTop && floatClose(true)) requestCompactSize();
  }
}

// --------------------------------------------------------------- build UI ----
function keyBtn(act, icon, label, cls) {
  return h('button', { class: 'mp-key ' + cls, 'data-act': act, title: label, 'aria-label': label, type: 'button' }, svg(icon));
}
// A small key with text (and optionally an icon and a Japanese reading).
function textKey(act, en, ja, title, icon, extra) {
  return h('button', { class: 'mp-key mpc-lib' + (extra ? ' ' + extra : ''), 'data-act': act, type: 'button', title: title || en },
    icon ? svg(icon) : null, h('span', { text: en }), ja ? jp(ja) : null);
}
// A larger key with an English label over its Japanese reading.
function labelKey(act, icon, en, ja, title, lamp) {
  var label = h('span', { class: 'mp-btn-label' }, h('span', { class: 'mp-btn-en', text: en }), jp(ja, 'mp-btn-jp'));
  return h('button', { class: 'mp-key mp-btn', 'data-act': act, type: 'button', title: title, 'aria-label': title },
    lamp ? h('i', { class: 'mp-led', 'data-on': '1' }) : null, svg(icon), label);
}

function buildApp() {
  var root = h('div', { id: 'mp-app', class: 'mp-ui', 'data-state': 'stop' });

  // ---- top strip ----
  ui.pinBtn = keyBtn('ontop', I.pin, 'Keep on top of other windows', 'mpc-ibtn only-compact');
  ui.pinBtn.setAttribute('data-on', S.onTop ? '1' : '0');
  ui.pinBtn.setAttribute('aria-pressed', S.onTop ? 'true' : 'false');
  ui.search = h('input', { type: 'search', placeholder: 'Search  検索', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Search your library and ' + SVC.name });
  ui.search.addEventListener('input', onSearchInput);
  ui.strip = h('div', { class: 'mpc-strip' },
    __MP_ICON ? h('img', { class: 'mpc-logo', src: __MP_ICON, alt: '' }) : null,
    h('span', { class: 'mpc-brand', text: 'STREAM PLAYER' }),
    jp('ストリームプレーヤー', 'mpc-brand-jp'),                       // "stream player"
    ui.svcSwitch = buildSwitch(),
    h('span', { class: 'mp-grip' }),
    h('label', { class: 'mpa-search only-full' }, svg(I.search), ui.search),
    keyBtn('theme', I.theme, 'Themes and settings', 'mpc-ibtn'),
    ui.pinBtn,
    textKey('compact', 'COMPACT', null, 'Small player (Ctrl+M)', I.mini, 'only-full'),
    textKey('full', 'LIBRARY', null, 'Back to the full player (Ctrl+M)', null, 'only-compact'));
  ui.strip.addEventListener('click', onActClick);

  // ---- deck ----
  ui.time = h('button', { class: 'mpc-time', 'data-act': 'timemode', title: 'Click to switch between elapsed and remaining time', type: 'button', text: '--:--' });
  ui.viz = h('canvas', { class: 'mpc-viz', 'data-act': 'meter', role: 'button', 'aria-label': 'Change what the small display shows' });
  meterTitle();
  var clockLcd = h('div', { class: 'mpc-lcd mpc-clock' },
    h('div', { class: 'mpc-state' }, svg(I.play, 's-play'), svg(I.pause, 's-pause'), svg(I.stop, 's-stop')),
    ui.time, ui.viz);

  ui.marqueeIn = h('div', { class: 'mpc-marquee-in' });
  ui.marquee = h('div', { class: 'mpc-marquee' }, ui.marqueeIn);
  ui.album = h('div', { class: 'mpc-album' });
  ui.chipState = h('span', { class: 'mpc-chip mpc-chip-state', lang: 'ja', text: JP_STATE.stop });
  ui.chipKbps = h('span', { class: 'mpc-chip' });
  ui.chipPos = h('span', { class: 'mpc-chip' });
  // add the song that is playing to the library or to a playlist
  ui.chipAdd = h('button', { class: 'mpc-chip mpc-chip-key', 'data-act': 'nowmenu', type: 'button', hidden: true,
    title: 'Add this song to your library or to a playlist', text: '+ ADD' });
  ui.art = h('img', { class: 'mpc-art', alt: '' });
  var infoLcd = h('div', { class: 'mpc-lcd mpc-info' },
    ui.marquee,
    h('div', { class: 'mpc-meta' }, ui.album, h('div', { class: 'mpc-chips' }, ui.chipState, ui.chipKbps, ui.chipPos, ui.chipAdd)),
    ui.art);

  ui.seek = makeSlider('Position',
    function (v) { S.dragSeek = v; refreshTime(); },
    function (v) { seekTo(v); });
  ui.seek.classList.add('mpc-seek');

  ui.vol = makeSlider('Volume', setVolumePos, null);
  ui.repeatLabel = h('span', { text: 'REPEAT' });
  ui.shuffle = h('button', { class: 'mp-key mpc-toggle', 'data-act': 'shuffle', type: 'button', 'aria-pressed': 'false', title: 'Shuffle' },
    h('i', { class: 'mp-led' }), h('span', { text: 'SHUFFLE' }));
  ui.repeat = h('button', { class: 'mp-key mpc-toggle', 'data-act': 'repeat', type: 'button', 'aria-pressed': 'false', title: 'Repeat: off, all, one' },
    h('i', { class: 'mp-led' }), ui.repeatLabel);
  // the three panel switches, in the spirit of Winamp's EQ / PL keys
  ui.tgViz = smallToggle('viz', 'VIS', 'Visualizer (G)');
  ui.tgLyr = smallToggle('lyr', 'LYR', 'Lyrics (L)');
  ui.tgPl = smallToggle('pl', 'PL', 'Queue (Q)');
  var controls = h('div', { class: 'mpc-controls' },
    h('div', { class: 'mpc-transport' },
      keyBtn('prev', I.prev, 'Previous (Z)', ''),
      keyBtn('play', I.play, 'Play (X)', ''),
      keyBtn('pause', I.pause, 'Pause (C)', ''),
      keyBtn('stop', I.stop, 'Stop (V)', ''),
      keyBtn('next', I.next, 'Next (B)', '')),
    h('div', { class: 'mpc-toggles' }, ui.shuffle, ui.repeat, h('span', { class: 'mp-grip' }), ui.tgViz, ui.tgLyr, ui.tgPl),
    ui.volBox = h('div', { class: 'mpc-vol' }, svg(I.speaker), ui.vol));
  // the mouse wheel over the volume (speaker included): small steps either way
  ui.volBox.addEventListener('wheel', function (e) {
    if (!e.deltaY) return;
    e.preventDefault();
    nudgeVolume(e.deltaY < 0 ? 0.02 : -0.02);
  }, { passive: false });

  ui.deck = h('div', { class: 'mpc-deck' }, clockLcd, infoLcd, ui.seek, controls);
  ui.deck.addEventListener('click', onActClick);

  // ---- library panel (full) ----
  ui.navPls = h('div', { class: 'mpa-nav-pls' });
  ui.navPlCount = h('span', { class: 'mpc-pl-count' });
  ui.nav = h('nav', { class: 'mpa-nav only-full', 'aria-label': 'Library' },
    h('div', { class: 'mpa-nav-sec' }, h('span', { text: 'LIBRARY' }), jp('ライブラリ'), h('span', { class: 'mp-grip' })),
    ui.navList = h('div', { class: 'mpa-nav-list' }),
    h('div', { class: 'mpa-nav-sec' }, h('span', { text: 'PLAYLISTS' }), jp('プレイリスト'), ui.navPlCount, h('span', { class: 'mp-grip' }),
      ui.navPlReset = h('button', { class: 'mpa-pl-reset', type: 'button', 'data-act': 'plreset', hidden: true,
        title: 'Back to the service\'s own order', text: 'RESET' })),
    ui.navPls,
    h('div', { class: 'mpa-nav-foot' },
      labelKey('theme', I.theme, 'THEMES', 'テーマ', 'Themes and settings', false),
      labelKey('account', I.person, 'ACCOUNT', 'アカウント', 'Signing in, and this service\'s settings', false)));
  ui.nav.addEventListener('click', onNavClick);
  // dragging playlists into the order the listener wants
  ui.navPls.addEventListener('pointerdown', onPlDown);
  ui.navPls.addEventListener('pointermove', onPlMove);
  ui.navPls.addEventListener('pointerup', onPlUp);
  ui.navPls.addEventListener('pointercancel', onPlUp);

  // ---- browser (full) ----
  ui.bBack = keyBtn('back', I.back, 'Back (Backspace)', 'mpb-back');
  ui.bBack.hidden = true;
  ui.bArt = h('img', { class: 'mpb-art', alt: '', hidden: true });
  ui.bTitle = h('span', { class: 'tx' });
  ui.bTitleJp = jp('');
  ui.bMeta = h('div', { class: 'mpb-meta', lang: 'ja' });
  ui.bPlay = textKey('playview', 'PLAY', '再生', 'Play from the top (or from the selected song)', I.play);
  ui.bShuffle = textKey('shuffleview', 'SHUFFLE', null, 'Play in random order', I.shuffle);
  // on albums and other people's playlists: save the whole thing to the library
  ui.bAddLabel = h('span', { text: 'ADD' });
  ui.bAdd = h('button', { class: 'mp-key mpc-lib', 'data-act': 'addview', type: 'button', hidden: true, 'data-done': '0',
    title: 'Save this to your library (it shows up in the service\'s own apps too)' }, svg(I.plus), ui.bAddLabel, jp('追加'));
  ui.bActions = h('div', { class: 'mpb-actions' }, ui.bAdd, ui.bPlay, ui.bShuffle);
  var head = h('div', { class: 'mpb-head' },
    ui.bBack, ui.bArt,
    h('div', { class: 'mpb-titles' }, h('div', { class: 'mpb-title' }, ui.bTitle, ui.bTitleJp), ui.bMeta),
    ui.bActions);
  head.addEventListener('click', onActClick);
  var cols = h('div', { class: 'mpb-cols' },
    h('span', { class: 'n', text: '#' }), h('span', { class: 't', text: 'TITLE' }), h('span', { class: 'a', text: 'ARTIST' }),
    h('span', { class: 'al', text: 'ALBUM' }), h('span', { class: 'd', text: 'TIME' }));
  ui.bBody = h('div', { class: 'mpb-body', tabindex: '-1' });
  ui.bBody.addEventListener('click', onBodyClick);
  ui.bBody.addEventListener('dblclick', onBodyClick);
  ui.bBody.addEventListener('contextmenu', onBodyMenu);
  ui.bBody.addEventListener('scroll', closeMenu, { passive: true });
  ui.toastText = h('span');
  ui.toast = h('div', { class: 'mpb-toast', role: 'status', 'data-show': '0' }, ui.toastText);
  ui.browser = h('section', { class: 'mpa-browser only-full', 'data-kind': 'msg', 'aria-label': 'Browser' },
    head, cols, ui.bBody,
    h('div', { class: 'mpb-kanji', lang: 'ja', 'aria-hidden': 'true', text: '音楽' }),     // "music"
    ui.toast);

  // ---- queue ----
  ui.count = h('span', { class: 'mpc-pl-count' });
  ui.plHead = h('div', { class: 'mpp-head' },
    h('span', { text: 'QUEUE' }), jp('再生リスト'), ui.count, h('span', { class: 'mp-grip' }),      // "play list"
    keyBtn('pl', I.close, 'Hide the queue (Q)', 'mpc-ibtn'));
  ui.list = h('div', { class: 'mpc-pl-list', role: 'listbox', 'aria-label': 'Queue' });
  ui.total = h('span', { class: 'mpc-pl-total', lang: 'ja' });
  var foot = h('div', { class: 'mpc-pl-foot' }, ui.total,
    textKey('full', 'OPEN LIBRARY', 'ライブラリ', 'Open the full player to play something else', null, 'only-compact'));
  var pl = h('div', { class: 'mpp mpc-pl' },
    arLayer('queue'), ui.plHead, ui.list,
    h('div', { class: 'mpc-pl-kanji', lang: 'ja', 'aria-hidden': 'true', text: '音楽' }),
    foot);
  pl.addEventListener('click', onActClick);
  ui.list.addEventListener('click', onListClick);
  ui.list.addEventListener('dblclick', onListClick);
  ui.list.addEventListener('contextmenu', onListMenu);

  // ---- the column of panels: visualizer, lyrics, queue ----
  ui.panels = h('div', { class: 'mpa-side' }, buildVizPanel(), buildLyricsPanel(), pl);

  root.appendChild(ui.strip);
  root.appendChild(ui.deck);
  root.appendChild(ui.nav);
  root.appendChild(ui.browser);
  root.appendChild(ui.panels);
  // pictures for parts of the player (applyAreas): the top and the library
  // are laid over their places in the grid; the list's is inside it
  root.appendChild(arLayer('top'));
  root.appendChild(arLayer('nav'));
  ui.browser.insertBefore(arLayer('list'), ui.browser.firstChild);
  ui.app = root;
  renderNavList();
  syncSwitch();
  syncPanels();
  return root;
}

// The switch between the two services, like a hi-fi's input selector: a
// slide with a lamp on each side. A click flips it (so does Ctrl+S).
function buildSwitch() {
  return h('button', { class: 'mp-key mpc-svc', type: 'button', 'data-act': 'service', role: 'switch',
                       title: 'Switch between Spotify and SoundCloud (Ctrl+S)' },
    h('span', { class: 'mpc-svc-name mpc-svc-a' }, h('i', { class: 'mp-led' }), h('span', { text: 'SPOTIFY' })),
    h('span', { class: 'mpc-svc-track', 'aria-hidden': 'true' }, h('i', { class: 'mpc-svc-knob' })),
    h('span', { class: 'mpc-svc-name mpc-svc-b' }, h('span', { text: 'SOUNDCLOUD' }), h('i', { class: 'mp-led' })));
}
function syncSwitch() {
  if (!ui.svcSwitch) return;
  ui.svcSwitch.setAttribute('data-svc', SVC.id);
  ui.svcSwitch.setAttribute('aria-checked', SVC.id === 'soundcloud' ? 'true' : 'false');
  ui.svcSwitch.setAttribute('aria-label', 'Playing from ' + SVC.name + '. Click to switch.');
  var root = document.documentElement;
  if (root.getAttribute('data-mp-svc') !== SVC.id) root.setAttribute('data-mp-svc', SVC.id);
  if (FLOAT.win) FLOAT.win.document.documentElement.setAttribute('data-mp-svc', SVC.id);
}
// the layer that holds a part's picture (made once; applyAreas fills it)
function arLayer(k) {
  if (!ui.ar) ui.ar = {};
  return (ui.ar[k] = h('div', { class: 'mp-ar mp-ar-' + k, 'data-on': '0', 'aria-hidden': 'true' }, h('div', { class: 'mp-ar-pic' })));
}

// A small key with a lamp, for things that are on or off.
function smallToggle(act, label, title) {
  return h('button', { class: 'mp-key mpc-toggle', 'data-act': act, type: 'button', 'aria-pressed': 'false', title: title },
    h('i', { class: 'mp-led' }), h('span', { text: label }));
}

function buildVizPanel() {
  ui.vzCanvas = h('canvas', { class: 'mpv-canvas', 'aria-hidden': 'true' });
  ui.vzOsdJp = jp('');
  ui.vzOsdEn = h('span');
  ui.vzOsd = h('div', { class: 'mpv-osd', 'data-show': '0' }, ui.vzOsdJp, ui.vzOsdEn);
  ui.vzLyricT = h('div', { class: 'mpv-lyric-t' });
  ui.vzLyricS = h('div', { class: 'mpv-lyric-s' });
  ui.vzLyric = h('div', { class: 'mpv-lyric', 'data-show': '0' }, ui.vzLyricT, ui.vzLyricS);
  ui.vzMenu = h('div', { class: 'mpv-menu', hidden: true });
  EFFECTS.forEach(function (fx) {
    ui.vzMenu.appendChild(h('button', { class: 'mpv-item', type: 'button', 'data-effect': fx.id, 'aria-pressed': 'false' },
      jp(fx.jp), h('span', { text: fx.name })));
  });
  // which graphics the effects run on (or why they cannot), under the list
  ui.vzInfo = h('div', { class: 'mpv-info', text: 'Graphics: starting...' });
  ui.vzMenu.appendChild(ui.vzInfo);
  // shown on the picture when only the plain bars can be drawn
  ui.vzNoteText = h('span');
  ui.vzNote = h('div', { class: 'mpv-note', hidden: true }, ui.vzNoteText,
    h('button', { class: 'mp-key mpv-retry', type: 'button', 'data-act': 'vizretry', text: 'TRY AGAIN' }));
  // (Mac) how to let it hear the music, while it cannot
  ui.vzHintText = h('span');
  ui.vzHint = h('div', { class: 'mpv-note mpv-hint', hidden: true }, ui.vzHintText,
    h('button', { class: 'mp-key mpv-retry', type: 'button', 'data-act': 'vizhint', title: 'Hide this until the player is opened again', text: 'OK' }));
  ui.vzScreen = h('div', { class: 'mpp-screen mpv-screen' }, ui.vzCanvas, ui.vzLyric, ui.vzOsd, ui.vzNote, ui.vzHint, ui.vzMenu);
  ui.vzSrc = h('span', { class: 'mpp-chip', 'data-s': 'idle' });
  ui.vzAuto = smallToggle('vizauto', 'AUTO', 'Move on to another effect every 40 seconds');
  var head = h('div', { class: 'mpp-head' },
    h('span', { text: 'VISUALIZER' }), jp('映像'), ui.vzSrc, h('span', { class: 'mp-grip' }),          // "picture"
    keyBtn('vizprev', I.back, 'Previous effect ([)', 'mpc-ibtn'),
    keyBtn('vizlist', I.grid, 'Choose an effect', 'mpc-ibtn'),
    keyBtn('viznext', I.go, 'Next effect (])', 'mpc-ibtn'),
    ui.vzAuto,
    keyBtn('vizbig', I.expand, 'Fill the window (F, or double-click the picture)', 'mpc-ibtn'),
    keyBtn('viz', I.close, 'Hide the visualizer (G)', 'mpc-ibtn'));
  ui.vzPanel = h('section', { class: 'mpp mpp-viz', 'aria-label': 'Visualizer', 'data-idle': '0' }, head, ui.vzScreen);
  head.addEventListener('click', onActClick);
  ui.vzScreen.addEventListener('dblclick', function (e) {
    if (!e.target.closest('.mpv-menu')) setVizBig(!S.vizBig);
  });
  ui.vzScreen.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-act]')) { onActClick(e); return; }      // TRY AGAIN
    var item = e.target.closest && e.target.closest('[data-effect]');
    if (item) {                       // picking one by hand means: stay on it
      vzSetAuto(false);
      vzSet(item.getAttribute('data-effect'), true);
      vzMenu(false);
    } else if (!ui.vzMenu.hidden) vzMenu(false);
  });
  ui.vzPanel.addEventListener('mousemove', function () { if (S.vizBig) vzIdle(false); });
  vzSetAuto(VZ.auto, false);
  vzColors();
  return ui.vzPanel;
}

function buildLyricsPanel() {
  ui.lyBody = h('div', { class: 'mpl-body', tabindex: '-1' });
  ui.lyRo = smallToggle('lyrroma', 'ROMAJI', 'Show how each line is pronounced (romanised)');
  ui.lyTr = smallToggle('lyrtrans', 'ENGLISH', 'Show the English translation under each line');
  ui.lyRo.hidden = ui.lyTr.hidden = true;
  var head = h('div', { class: 'mpp-head' },
    h('span', { text: 'LYRICS' }), jp('歌詞'), h('span', { class: 'mp-grip' }), ui.lyRo, ui.lyTr,
    keyBtn('lyr', I.close, 'Hide the lyrics (L)', 'mpc-ibtn'));
  ui.lyPanel = h('section', { class: 'mpp mpp-lyr', 'aria-label': 'Lyrics', 'data-synced': '0' }, head,
    h('div', { class: 'mpp-screen mpl-screen' }, arLayer('lyr'), ui.lyBody,
      h('div', { class: 'mpl-kanji', lang: 'ja', 'aria-hidden': 'true', text: '歌詞' })));     // "lyrics"
  head.addEventListener('click', onActClick);
  ui.lyBody.addEventListener('click', onLyricsClick);
  // scrolling by hand pauses the automatic scrolling for a moment
  ['wheel', 'pointerdown', 'touchstart'].forEach(function (ev) {
    ui.lyBody.addEventListener(ev, function () { LY.userAt = performance.now(); }, { passive: true });
  });
  lySyncKeys();
  return ui.lyPanel;
}

function buildPanel() {
  var wrap = h('div', { id: 'mp-panel-wrap', class: 'mp-ui', 'data-open': '0' });
  var panel = h('div', { class: 'mp-panel', role: 'dialog', 'aria-label': 'Themes and settings' });

  panel.appendChild(h('div', { class: 'mp-panel-head' },
    h('span', { class: 'mp-panel-title', text: 'THEMES' }), jp('テーマ', 'mp-panel-title-jp'),
    h('span', { class: 'mp-grip' }),
    h('button', { class: 'mp-key mp-x', 'data-act': 'closepanel', type: 'button', title: 'Close', 'aria-label': 'Close' }, svg(I.close))));

  var body = h('div', { class: 'mp-panel-body' });
  var grid = h('div', { class: 'mp-themes' });
  THEMES.forEach(function (t) { grid.appendChild(swatchFor(t)); });
  // the one that takes its colours from the cover of the song playing
  ui.coverSw = swatchFor(coverLook());
  grid.appendChild(ui.coverSw);
  body.appendChild(grid);

  // ---- themes of your own: make, pick, edit, and carry to another computer ----
  body.appendChild(h('div', { class: 'mp-panel-sub mp-user-head' }, h('span', { text: 'MY THEMES' }), jp('マイテーマ'), h('span', { class: 'mp-grip' }),
    textKey('themenew', 'NEW', '新規', 'Make a theme of your own: your colours, and a photo behind the player', I.plus),
    textKey('themeimport', 'IMPORT', '読込', 'Open a skin file (.mpskin) made here or on your other computer')));
  ui.userEmpty = h('div', { class: 'mp-hint mp-user-empty', text: 'None yet. NEW starts one from the colours showing now: change any colour, put a photo behind the player, ' +
    'then EXPORT it as a file that also opens in Music Player on your other computer (IMPORT there).' });
  ui.userGrid = h('div', { class: 'mp-themes mp-themes-user' });
  ui.userDelete = textKey('themedelete', 'DELETE', '削除', 'Delete the theme in use (asks once more)');
  ui.userTools = h('div', { class: 'mp-user-tools', hidden: true },
    textKey('themeedit', 'EDIT', '編集', 'Change the colours or the photo of the theme in use'),
    textKey('themeexport', 'EXPORT', '書出', 'Save the theme in use as a file (.mpskin) that opens on Windows and on a Mac'),
    ui.userDelete);
  ui.userMsg = h('div', { class: 'mp-user-msg', hidden: true, role: 'status' });
  ui.userFile = h('input', { type: 'file', accept: '.mpskin,.json,application/json', hidden: true, tabindex: '-1', 'aria-hidden': 'true' });
  ui.userFile.addEventListener('change', function () {
    var f = ui.userFile.files && ui.userFile.files[0];
    if (!f) return;
    importSkin(f).then(function (res) {
      userSay('IMPORTED: ' + res.theme.name + (res.trouble ? ' - BUT ' + res.trouble : ''), !res.trouble);
    }, function (e) { userSay('COULD NOT IMPORT: ' + errText(e), false); });
  });
  body.appendChild(ui.userEmpty);
  body.appendChild(ui.userGrid);
  body.appendChild(ui.userTools);
  body.appendChild(ui.userMsg);
  body.appendChild(ui.userFile);

  body.appendChild(h('div', { class: 'mp-panel-sub' }, h('span', { text: 'COMPACT PLAYER' }), jp('設定'), h('span', { class: 'mp-grip' })));   // "settings"
  body.appendChild(h('button', { class: 'mp-opt', 'data-opt': 'autoCompact', type: 'button', role: 'switch', 'aria-checked': 'false' },
    h('span', { text: 'Shrink to the compact player when music starts' }),
    h('span', { class: 'mp-switch' }, h('i', { class: 'mp-led' }))));
  body.appendChild(h('button', { class: 'mp-opt', 'data-opt': 'onTop', type: 'button', role: 'switch', 'aria-checked': 'false' },
    h('span', { text: HOST_KIND === 'mac' ? 'Keep the compact player on top of other windows (it floats in a small window of its own, above every app)'
      : 'Keep the compact player above everything - fullscreen browsers, and games set to windowed fullscreen' }),
    h('span', { class: 'mp-switch' }, h('i', { class: 'mp-led' }))));

  // ---- while something else is in front (the Windows app says when it can:
  //      data-mp-caps): the "now playing" card, and Discord ----
  var optSwitch = function (key, text) {
    return h('button', { class: 'mp-opt', 'data-opt': key, type: 'button', role: 'switch', 'aria-checked': 'false' },
      h('span', { text: text }), h('span', { class: 'mp-switch' }, h('i', { class: 'mp-led' })));
  };
  var away = h('div', { class: 'mp-away-opts' });
  away.appendChild(h('div', { class: 'mp-panel-sub' }, h('span', { text: 'WHILE YOU PLAY' }), jp('ゲーム中'), h('span', { class: 'mp-grip' })));   // "in a game"
  away.appendChild(optSwitch('popup', 'Show a small "now playing" card when the song changes, over whatever is in front - a game set to windowed fullscreen too'));
  ui.popRow = h('div', { class: 'mp-opt-more' });
  [['tl', 'TOP LEFT'], ['tr', 'TOP RIGHT'], ['bl', 'BOTTOM LEFT'], ['br', 'BOTTOM RIGHT']].forEach(function (x) {
    ui.popRow.appendChild(h('button', { class: 'mp-key mpe-fit', type: 'button', 'data-pop': x[0], 'aria-pressed': 'false', title: 'The corner of the screen the card slides into', text: x[1] }));
  });
  ui.popRow.appendChild(textKey('poptest', 'SHOW ONE', '表示', 'Show the card now, to see where it lands'));
  away.appendChild(ui.popRow);
  away.appendChild(optSwitch('discord', 'Show the song you are listening to on your Discord profile'));
  ui.dcId = h('input', { class: 'mpm-input mp-dc-id', type: 'text', inputmode: 'numeric', maxlength: '22', spellcheck: 'false', autocomplete: 'off',
    placeholder: 'Application ID', 'aria-label': 'Discord application ID' });
  ui.dcId.value = S.discordId;
  ui.dcId.addEventListener('input', function () {
    S.discordId = ui.dcId.value.replace(/\D+/g, '').slice(0, 22);
    if (ui.dcId.value !== S.discordId) ui.dcId.value = S.discordId;
    store.set('discordId', S.discordId);
    NP.dc = '';
    syncPanel();
    clearTimeout(NP.idTimer);
    NP.idTimer = setTimeout(function () { npSettings(); NP.last = ''; npSend(); }, 700);
  });
  ui.dcState = h('div', { class: 'mp-user-msg mp-dc-state', role: 'status' });
  ui.dcRow = h('div', { class: 'mp-dc' },
    h('label', { class: 'mp-opt-more' }, h('span', { class: 'mp-opt-label', text: 'Application ID' }), ui.dcId),
    ui.dcState,
    h('div', { class: 'mp-hint', text: 'Discord shows a song under an "application" of yours. Make one once: at discord.com/developers/applications press ' +
      'New Application and give it the name your friends should see (it reads "Listening to" and that name), then copy its Application ID into the box. ' +
      'While this is on, the title, artist, album and cover of what you play go to Discord.' }));
  away.appendChild(ui.dcRow);
  body.appendChild(away);

  body.appendChild(h('div', { class: 'mp-hint' },
    h('span', { class: 'mp-kbd', text: 'Ctrl+M' }), h('span', { text: ' compact / full    ' }),
    h('span', { class: 'mp-kbd', text: '/' }), h('span', { text: ' search    ' }),
    h('span', { class: 'mp-kbd', text: 'Space' }), h('span', { text: ' play / pause    ' }),
    h('span', { class: 'mp-kbd', text: 'Backspace' }), h('span', { text: ' back    ' }),
    h('span', { class: 'mp-kbd', text: 'G' }), h('span', { text: ' visualizer    ' }),
    h('span', { class: 'mp-kbd', text: 'L' }), h('span', { text: ' lyrics    ' }),
    h('span', { class: 'mp-kbd', text: 'Q' }), h('span', { text: ' queue    ' }),
    h('span', { class: 'mp-kbd', text: '[ ]' }), h('span', { text: ' change effect    ' }),
    h('span', { class: 'mp-kbd', text: 'F' }), h('span', { text: ' visualizer fills the window' })));
  panel.appendChild(body);

  wrap.appendChild(panel);
  wrap.addEventListener('click', function (e) {
    if (e.target === wrap) { closePanel(); return; }
    var sw = e.target.closest('[data-theme]');
    if (sw) { setTheme(sw.getAttribute('data-theme')); return; }
    var opt = e.target.closest('[data-opt]');
    if (opt) {
      var key = opt.getAttribute('data-opt');
      if (key === 'onTop') setOnTop(!S.onTop);
      else if (key === 'autoCompact') { S.autoCompact = !S.autoCompact; store.set('autoCompact', S.autoCompact); syncPanel(); }
      else if (key === 'popup' || key === 'discord') {
        S[key] = !S[key];
        store.set(key, S[key]);
        NP.dc = '';
        syncPanel();
        npSettings();
        NP.last = '';
        npSend();
      }
      return;
    }
    var pop = e.target.closest('[data-pop]');
    if (pop) {
      S.popupPos = pop.getAttribute('data-pop');
      store.set('popupPos', S.popupPos);
      syncPanel();
      npSettings();
      return;
    }
    onActClick(e);
  });
  ui.panelWrap = wrap;
  renderUserThemes();
  return wrap;
}

// The editor for a theme of your own (see "Themes of your own").
function buildEditor() {
  var ed = h('div', { id: 'mp-editor', class: 'mp-ui', 'data-open': '0', role: 'dialog', 'aria-label': 'Edit theme' });
  var sub = function (en, ja) { return h('div', { class: 'mp-panel-sub' }, h('span', { text: en }), jp(ja), h('span', { class: 'mp-grip' })); };
  ed.appendChild(h('div', { class: 'mp-panel-head' },
    h('span', { class: 'mp-panel-title', text: 'EDIT THEME' }), jp('テーマ編集', 'mp-panel-title-jp'),
    h('span', { class: 'mp-grip' }),
    h('button', { class: 'mp-key mp-x', 'data-act': 'editcancel', type: 'button', title: 'Close without saving', 'aria-label': 'Close without saving' }, svg(I.close))));

  var body = h('div', { class: 'mpe-body' });
  body.appendChild(h('div', { class: 'mp-hint mpe-hint', text: 'The player beside this shows every change as you make it. Nothing is kept until you press SAVE.' }));
  ui.edName = h('input', { class: 'mpm-input mpe-name', type: 'text', maxlength: '40', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Name of the theme' });
  body.appendChild(h('label', { class: 'mpe-row' }, h('span', { class: 'mpe-label', text: 'Name' }), ui.edName));

  body.appendChild(sub('COLOURS', '色'));
  COLOURS.forEach(function (c) {
    body.appendChild(h('div', { class: 'mpe-row' },
      h('span', { class: 'mpe-label', text: c[1] }),
      h('input', { class: 'mpe-colour', type: 'color', 'data-c': c[0], 'aria-label': c[1], title: c[1] + ': click to pick a colour' }),
      h('input', { class: 'mpm-input mpe-hex', type: 'text', maxlength: '7', spellcheck: 'false', autocomplete: 'off', 'data-hx': c[0],
        'aria-label': c[1] + ', as a colour code', title: 'Or type a colour code, like #ff4fa3' })));
  });

  // ---- lettering: one of the fonts every computer has, or a font file of your own ----
  body.appendChild(sub('LETTERING', '文字'));
  FONT_ROLES.forEach(function (r) {
    body.appendChild(h('label', { class: 'mpe-row' }, h('span', { class: 'mpe-label', text: r[1] }),
      h('select', { class: 'mpm-input mpe-select', 'data-font': r[0], 'aria-label': 'Lettering for ' + r[1].toLowerCase() })));
  });
  ui.edFontName = h('span', { class: 'mpe-font-name' });
  ui.edNoFont = textKey('editnofont', 'REMOVE', '削除', 'Take the font file out of this theme');
  body.appendChild(h('div', { class: 'mpe-font' }, ui.edFontName,
    h('div', { class: 'mpe-photo-keys' },
      textKey('editfont', 'CHOOSE FONT FILE', '選択', 'Use a font file from this computer (TTF, OTF, WOFF). It is kept inside the theme, so it travels with it', I.plus),
      ui.edNoFont)));
  ui.edFontFile = h('input', { type: 'file', accept: '.ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2', hidden: true, tabindex: '-1', 'aria-hidden': 'true' });
  ui.edFontFile.addEventListener('change', function () {
    if (ui.edFontFile.files && ui.edFontFile.files[0]) editFontPicked(ui.edFontFile.files[0]);
  });
  body.appendChild(ui.edFontFile);

  // ---- pictures: behind the whole player, and for parts of it ----
  body.appendChild(sub('PICTURES', '画像'));
  body.appendChild(h('div', { class: 'mp-hint mpe-hint', text: 'Pick a part of the player, then choose a photo, a moving GIF or a short video for it. Every part can have one of its own.' }));
  ui.edWhere = h('div', { class: 'mpe-where', role: 'group', 'aria-label': 'Behind the whole player, or the compact one' });
  ['app', 'mini'].forEach(function (k) {
    var a = areaInfo(k);
    ui.edWhere.appendChild(h('button', { class: 'mp-key mpe-area', type: 'button', 'data-area': k, 'aria-pressed': 'false', title: a.say },
      h('i', { class: 'mp-led' }), h('span', { text: a.en }), jp(a.jp)));
  });
  // a little map of the full player: each part a key (the visualizer draws
  // over all of its panel, so it is there only to make the map read right)
  ui.edMap = h('div', { class: 'mpe-map', role: 'group', 'aria-label': 'Parts of the player' });
  ['top', 'nav', 'list', 'viz', 'lyr', 'queue'].forEach(function (k) {
    var a = k === 'viz' ? null : areaInfo(k), el;
    if (!a) el = h('div', { class: 'mpe-reg', 'data-none': '1', title: 'The visualizer draws over all of its panel: it has no picture' }, h('span', { text: 'VIS' }));
    else el = h('button', { class: 'mpe-reg', type: 'button', 'data-area': k, 'data-display': a.tint === 'lcd' ? '1' : null, 'aria-pressed': 'false', title: a.say },
      h('i', { class: 'mp-led' }), h('span', { text: a.en }));
    el.style.gridArea = k;
    ui.edMap.appendChild(el);
  });
  body.appendChild(ui.edWhere);
  body.appendChild(ui.edMap);
  ui.edAreaSay = h('div', { class: 'mp-hint mpe-hint mpe-area-say' });
  body.appendChild(ui.edAreaSay);
  ui.edAim = h('i', { class: 'mpe-aim', hidden: true });
  ui.edView = h('i', { class: 'mpe-view', hidden: true });
  ui.edFrame = h('div', { class: 'mpe-frame', tabindex: '0', 'data-has': '0', role: 'group',
    'aria-label': 'The picture for this part. Drag on it (or use the arrow keys) to choose which part of it shows; scroll on it (or press + and -) to zoom' },
    ui.edView, ui.edAim);
  bindFramer(ui.edFrame);
  body.appendChild(ui.edFrame);
  ui.edNoPhoto = textKey('editnophoto', 'REMOVE', '削除', 'Take this part\'s picture out of the theme');
  body.appendChild(h('div', { class: 'mpe-photo-keys mpe-photo-row' },
    textKey('editphoto', 'CHOOSE FILE', '選択', 'A photo, a moving GIF or a short video from this computer, for this part of the player', I.plus), ui.edNoPhoto));
  body.appendChild(h('div', { class: 'mp-hint mpe-hint', text: 'A photo, a moving GIF, or a short video (MP4 or WebM, played without its sound). ' +
    'Drag on the picture to choose what shows (the frame marks it), scroll on it to zoom.' }));
  ui.edOpts = h('div', { class: 'mpe-opts', hidden: true });
  var fits = h('div', { class: 'mpe-fits', role: 'group', 'aria-label': 'How the picture fills its part' });
  FITS.forEach(function (f) {
    fits.appendChild(h('button', { class: 'mp-key mpe-fit', type: 'button', 'data-fit': f[0], 'aria-pressed': 'false', text: f[1] }));
  });
  ui.edFlip = h('button', { class: 'mp-key mpe-fit mpe-flip', type: 'button', 'data-act': 'editflip', 'aria-pressed': 'false', title: 'Mirror the picture, left to right', text: 'MIRROR' });
  fits.appendChild(ui.edFlip);
  ui.edOpts.appendChild(fits);
  PHOTO_KNOBS.forEach(function (k) {
    ui.edOpts.appendChild(h('label', { class: 'mpe-row', 'data-row': k[0] }, h('span', { class: 'mpe-label', text: k[1] }),
      h('input', { class: 'mpe-range', type: 'range', min: String(k[2]), max: String(k[3]), step: String(k[4]), 'data-p': k[0] }),
      h('span', { class: 'mpe-val', 'data-v': k[0] })));
  });
  body.appendChild(ui.edOpts);
  ui.edMsg = h('div', { class: 'mp-user-msg mpe-msg', hidden: true, role: 'status' });
  body.appendChild(ui.edMsg);
  ui.edFile = h('input', { type: 'file', accept: 'image/*,video/mp4,video/webm,video/quicktime,.gif,.webp,.apng,.mp4,.m4v,.webm,.mov', hidden: true, tabindex: '-1', 'aria-hidden': 'true' });
  ui.edFile.addEventListener('change', function () {
    if (ui.edFile.files && ui.edFile.files[0]) editPhotoPicked(ui.edFile.files[0]);
  });
  body.appendChild(ui.edFile);
  ed.appendChild(body);

  ed.appendChild(h('div', { class: 'mpe-foot' },
    textKey('editsave', 'SAVE', '保存', 'Keep this theme: it goes into MY THEMES', I.check),
    textKey('editcancel', 'CANCEL', '取消', 'Close without saving')));

  ed.addEventListener('input', onEditInput);
  // a typed colour code is tidied once the box is left
  ed.addEventListener('change', function (e) {
    var k = e.target && e.target.getAttribute && e.target.getAttribute('data-hx');
    if (k && USER.draft) { e.target.value = USER.draft[k]; e.target.removeAttribute('data-bad'); }
  });
  ed.addEventListener('click', function (e) {
    var f = e.target.closest && e.target.closest('[data-fit]'), ar = e.target.closest && e.target.closest('[data-area]'), p = edPhoto();
    if (ar && USER.draft) {                                // another part of the player
      USER.edArea = ar.getAttribute('data-area');
      editSay('');
      editFill();
      return;
    }
    if (f && p) {
      p.fit = f.getAttribute('data-fit');
      editFill();
      applyTheme();
      return;
    }
    onActClick(e);
  });
  ui.editor = ed;
  return ed;
}

function syncPanel() {
  if (!ui.panelWrap) return;
  var sw = ui.panelWrap.querySelectorAll('[data-theme]'), i;
  if (ui.userTools) { ui.userTools.hidden = !userTheme(S.theme); disarmDelete(); }
  for (i = 0; i < sw.length; i++)
    sw[i].setAttribute('aria-pressed', sw[i].getAttribute('data-theme') === themeNow().id ? 'true' : 'false');
  var opts = ui.panelWrap.querySelectorAll('[data-opt]');
  for (i = 0; i < opts.length; i++)
    opts[i].setAttribute('aria-checked', S[opts[i].getAttribute('data-opt')] ? 'true' : 'false');
  if (ui.popRow) {
    ui.popRow.hidden = !S.popup;
    var pops = ui.popRow.querySelectorAll('[data-pop]');
    for (i = 0; i < pops.length; i++) pops[i].setAttribute('aria-pressed', pops[i].getAttribute('data-pop') === S.popupPos ? 'true' : 'false');
    ui.dcRow.hidden = !S.discord;
    var say = npDiscordText();
    ui.dcState.textContent = say;
    ui.dcState.hidden = !say;
    ui.dcState.setAttribute('data-kind', NP.dc === 'on' && npId() ? 'ok' : 'warn');
  }
}

function openPanel() {
  if (!ui.panelWrap || USER.draft) return;             // (a theme is being edited: SAVE or CANCEL first)
  S.panelOpen = true;
  syncPanel();
  ui.panelWrap.setAttribute('data-open', '1');
}
function closePanel() {
  if (!ui.panelWrap) return;
  S.panelOpen = false;
  ui.panelWrap.setAttribute('data-open', '0');
}

function buildUi() {
  if (ui.root) return;
  ui.root = h('div', { id: 'mp-root' });

  ui.root.appendChild(buildApp());
  ui.root.appendChild(buildPanel());
  ui.root.appendChild(buildEditor());

  // the song menu (one, shared by every list)
  ui.menu = h('div', { id: 'mp-menu', class: 'mp-ui', 'data-open': '0', role: 'menu' });
  ui.menu.addEventListener('click', onMenuClick);
  ui.menu.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.target !== ui.menuName) return;
    e.preventDefault();
    var make = ui.menu.querySelector('[data-m="create"]');
    if (make) make.click();
  });
  ui.root.appendChild(ui.menu);
  // the engine's own right-click menu (Back, Reload, Inspect ...) has no place in the player
  ui.root.addEventListener('contextmenu', function (e) {
    var t = e.target, tag = (t && t.tagName) || '';
    if (tag !== 'INPUT' && tag !== 'TEXTAREA') e.preventDefault();
  });
  // (Mac) what the tab shows while the compact player floats; stays in the page
  if (floatOk()) ui.away = buildAway();
  vizColors();
}

function buildAway() {
  var a = h('div', { id: 'mp-away', class: 'mp-ui' },
    h('div', { class: 'mpw-box' },
      h('div', { class: 'mpw-brand' },
        __MP_ICON ? h('img', { class: 'mpc-logo', src: __MP_ICON, alt: '' }) : null,
        h('span', { class: 'mpc-brand', text: 'STREAM PLAYER' }), jp('ストリームプレーヤー', 'mpc-brand-jp')),
      h('div', { class: 'mpw-lcd' },
        jp('最前面', 'mpw-jp'),                                                   // "frontmost"
        h('div', { class: 'mpw-title', text: 'FLOATING ON TOP' }),
        h('div', { class: 'mpw-text', text: 'The compact player is in its own small window, above all your other windows - ' +
          'whatever app you are using. Close it, or press LIBRARY on it, to bring the player back here.' })),
      textKey('full', 'BACK TO THE FULL PLAYER', 'ライブラリ', 'Bring the player back into this tab (Ctrl+M)', I.full)));
  a.addEventListener('click', onActClick);
  return a;
}

// ------------------------------------------------------------ housekeeping --
function placeControls() {
  if (!document.body || !ui.root) return;
  keepAttached();
}

// ---------------------------------------------------------------- keyboard ---
function moveSel(delta) {
  if (!B.vlist || !B.items) return false;
  var n = B.vlist.count;
  if (!n) return false;
  var i = Math.max(0, Math.min(n - 1, (B.sel < 0 ? (delta > 0 ? -1 : n) : B.sel) + delta));
  selectRow(i);
  return true;
}

function onKey(e) {
  var typing = false, t = e.target, tag = (t && t.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) typing = true;

  if (e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey && (e.key === 'm' || e.key === 'M')) {
    e.preventDefault(); e.stopImmediatePropagation();
    setMode(S.mode === 'full' ? 'compact' : 'full');
    return;
  }
  if (e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey && (e.key === 's' || e.key === 'S')) {
    e.preventDefault(); e.stopImmediatePropagation();
    switchService();
    return;
  }
  if (e.key === 'Escape') {
    if (menuOpen()) { e.preventDefault(); e.stopImmediatePropagation(); closeMenu(); return; }
    if (S.panelOpen) { e.preventDefault(); e.stopImmediatePropagation(); closePanel(); return; }
    if (ui.vzMenu && !ui.vzMenu.hidden) { e.preventDefault(); e.stopImmediatePropagation(); vzMenu(false); return; }
    if (S.vizBig) { e.preventDefault(); e.stopImmediatePropagation(); setVizBig(false); return; }
    if (S.mode === 'full' && t === ui.search) {
      e.preventDefault(); e.stopImmediatePropagation();
      ui.search.value = '';
      ui.search.blur();
      onSearchInput();
      return;
    }
  }
  if (S.panelOpen) {
    // (what is typed into the settings panel's own box stays there)
    if (S.panelOpen && typing && ui.panelWrap && ui.panelWrap.contains(t)) e.stopPropagation();
    return;
  }

  // search shortcuts (full face)
  if (S.mode === 'full' && !typing &&
      ((e.key === '/' && !e.ctrlKey && !e.altKey) || ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 'f' || e.key === 'F')))) {
    e.preventDefault(); e.stopImmediatePropagation();
    ui.search.focus();
    ui.search.select();
    return;
  }
  if (typing) {
    // keep Apple's own page shortcuts away from what is typed into our own boxes
    if (t === ui.search || (ui.menu && ui.menu.contains(t)) || (ui.editor && ui.editor.contains(t))) e.stopPropagation();
    return;
  }
  // the editor's framer has keys of its own (arrows move the picture, + and - zoom)
  if (t && t === ui.edFrame) return;
  // Alt + Up / Down on a playlist in the library panel: move it up or down
  if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && t && ui.navPls && t.parentNode === ui.navPls) {
    e.preventDefault(); e.stopImmediatePropagation();
    var plId = t.getAttribute('data-go').slice(9), plAt = navPlItems().indexOf(t);
    movePlaylist(plId, plAt + (e.key === 'ArrowUp' ? -1 : 1));
    navPlItems().forEach(function (x) { if (x.getAttribute('data-go') === 'playlist:' + plId) x.focus(); });
    return;
  }
  if (S.mode === 'full' && e.altKey && e.key === 'ArrowLeft') {
    e.preventDefault(); e.stopImmediatePropagation();
    goBack();
    return;
  }
  if (e.ctrlKey || e.altKey || e.metaKey) return;

  var onControl = t && t.closest && t.closest('button, .mp-slider');
  var handled = true;
  switch (e.key) {
    case ' ':          if (onControl) return; togglePlay(); break;
    case 'ArrowLeft':  if (onControl) return; seekBy(-5); break;
    case 'ArrowRight': if (onControl) return; seekBy(5); break;
    case 'ArrowUp':
      if (onControl) return;
      if (S.mode === 'full') { if (!moveSel(-1)) handled = false; }
      else nudgeVolume(0.05);
      break;
    case 'ArrowDown':
      if (onControl) return;
      if (S.mode === 'full') { if (!moveSel(1)) handled = false; }
      else nudgeVolume(-0.05);
      break;
    case 'PageDown': if (S.mode !== 'full' || !moveSel(12)) handled = false; break;
    case 'PageUp':   if (S.mode !== 'full' || !moveSel(-12)) handled = false; break;
    case 'Enter':
      if (onControl || S.mode !== 'full' || !B.play || B.sel < 0) return;
      B.play(B.sel);
      break;
    case 'Backspace': if (S.mode !== 'full') return; goBack(); break;
    case 'z': case 'Z': ACT.prev(); break;
    case 'x': case 'X': ACT.play(); break;
    case 'c': case 'C': togglePlay(); break;
    case 'v': case 'V': ACT.stop(); break;
    case 'b': case 'B': ACT.next(); break;
    case 'g': case 'G': ACT.viz(); break;
    case 'l': case 'L': ACT.lyr(); break;
    case 'q': case 'Q': ACT.pl(); break;
    case 'f': case 'F': ACT.vizbig(); break;
    case '[': if (S.showViz) vzStep(-1); else handled = false; break;
    case ']': if (S.showViz) vzStep(1); else handled = false; break;
    default: handled = false;
  }
  if (handled) { e.preventDefault(); e.stopImmediatePropagation(); }
}

// ------------------------------------------------------------------- boot ----
function whenRoot(cb) {
  if (document.documentElement) { cb(); return; }
  var mo = new MutationObserver(function () {
    if (document.documentElement) { mo.disconnect(); cb(); }
  });
  mo.observe(document, { childList: true });
}
function whenBody(cb) {
  if (document.body) cb();
  else document.addEventListener('DOMContentLoaded', cb, { once: true });
}

window.addEventListener('keydown', onKey, true);
// sound from the app, for the visualizer and the level bars
if (host && typeof host.addEventListener === 'function') host.addEventListener('message', onHostMessage);
// mouse "back" button
window.addEventListener('mouseup', function (e) {
  if (e.button === 3 && S.mode === 'full') { e.preventDefault(); goBack(); }
}, true);
// the song menu closes when anything else is pressed, or the window loses focus
window.addEventListener('pointerdown', function (e) {
  if (menuOpen() && ui.menu && !ui.menu.contains(e.target)) closeMenu();
}, true);
window.addEventListener('blur', function () { closeMenu(); });

whenRoot(function () {
  installCss();
  applyTheme();
});

whenBody(function () {
  installCss();
  applyTheme();
  readCache();
  buildUi();
  placeControls();
  renderNavPlaylists();
  B.view = { kind: (SVC.nav && SVC.nav[0] && SVC.nav[0].go) || 'recent' };
  renderView();
  refreshAll();
  hookMusic();
  SVC_IDS.forEach(function (k) {
    var svc = SVCS[k];
    if (!svc.onBrowse) return;
    svc.onBrowse(function (now) {
      if (svc !== SVC) return;
      if (S.mode === 'full' && B.view && B.view.kind === 'browse') renderView();
      else if (now) notice('IN THE SOUNDCLOUD WINDOW: ' + now.title + '  -  BROWSE SOUNDCLOUD plays it here', true);
    });
  });

  notifyHost();
  if (S.mode === 'compact') requestCompactSize(); else send('compact|0');
  send('ontop|' + (S.onTop ? 1 : 0));
  send('hello|2');                     // (the app answers with what it can do: see "Now playing, for the app")
  dlog('skin started, ' + innerWidth + 'x' + innerHeight + ', theme ' + S.theme);

  lyRefresh();
  // draw the (idle) level bars and the visualizer once they have a size
  setTimeout(function () { kickViz(); vzKick(); }, 150);

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(relayout, 120);
  });
  // back on screen (un-minimised, uncovered): pick the moving parts up again
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) { kickViz(); vzKick(); lyKick(); }
  });

  // safety net: keep things in place even if an event is missed
  setInterval(function () {
    installCss();
    applyTheme();
    floatCheck();
    keepAttached();
    rcWatch();
    if (deckShown()) { refreshState(); refreshTime(); vzKick(); lyRefresh(); lyKick(); }
  }, 1000);
});

// handy when poking around in DevTools (F12)
window.__mp = {
  state: S, themes: THEMES, db: DB, browser: B, setTheme: setTheme, setMode: setMode, go: go, float: FLOAT,
  sound: AU, viz: VZ, effects: EFFECTS, lyrics: LY, clock: CK,
  setPanel: setPanel, setEffect: vzSet, setVizBig: setVizBig, vizRetry: vzRetry, setOnTop: setOnTop,
  fetchLyrics: lyFetch, buildLyrics: lyBuild, services: SVCS, service: function () { return SVC; }, switchService: switchService, showLyrics: lyShow, songIdsFrom: songIdsFrom,
  user: USER, userThemes: { edit: editOpen, save: editSave, cancel: editCancel, photo: editPhotoPicked, noPhoto: editNoPhoto,
    font: editFontPicked, noFont: editNoFont, file: skinFile, importSkin: importSkin, remove: deleteTheme, fileName: fileNameFor },
  cover: COVER, coverPalette: coverPalette, nowPlaying: NP, hostMessage: onHostMessage,
  recover: RC, playbackError: onPlaybackError, recoverNote: rcNote, recoverWatch: rcWatch, recoverStreak: rcStreak, recoverAsked: rcAsked,
  areas: AREAS, areaPhoto: areaPhoto, areaLayers: function () { return ui.ar; }, viewOf: viewOf, areaBox: areaBox, framer: { at: frameAt, zoom: frameZoom }
};
})();
