// Stream Player - starts the player: the styles are read in as text first
// (the skin hands them to the floating compact window too), then player.js.
(function () {
  'use strict';
  window.__MP_ICON = chrome.runtime.getURL('icon128.png');
  Promise.resolve(window.__mpSingle).then(function (first) {
    if (first === false) return null;             // (the player is open already: this window goes)
    // the skin's styles (player.css, as the Apple Music player has them) and
    // Stream Player's own (stream.css), as one
    function text(f) { return fetch(f).then(function (r) { return r.text(); }).catch(function () { return ''; }); }
    return Promise.all([text('player.css'), text('stream.css')]).then(function (css) {
      window.__MP_CSS = css[0] + '\n' + css[1];
      return true;
    });
  }).then(function (go) {
    if (!go) return;
    var s = document.createElement('script');
    s.src = 'player.js';
    document.body.appendChild(s);
  });
})();
