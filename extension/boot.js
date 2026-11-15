// Stream Player - starts the player: the styles are read in as text first
// (the skin hands them to the floating compact window too), then player.js.
(function () {
  'use strict';
  window.__MP_ICON = chrome.runtime.getURL('icon128.png');
  Promise.resolve(window.__mpSingle).then(function (first) {
    if (first === false) return null;             // (the player is open already: this window goes)
    return fetch('player.css').then(function (r) { return r.text(); }).then(function (css) {
      window.__MP_CSS = css;
    }, function () { window.__MP_CSS = ''; }).then(function () { return true; });
  }).then(function (go) {
    if (!go) return;
    var s = document.createElement('script');
    s.src = 'player.js';
    document.body.appendChild(s);
  });
})();
