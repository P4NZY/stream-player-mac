// Stream Player - what both services share: signing in through the service's
// own page, and a few small helpers.
//
// Signing in is the standard way for players like this one (OAuth with PKCE):
// the service's own sign-in page opens in a small window; once the listener
// has signed in and said yes, the service sends that window to the address
// given when the listener registered their app (the "redirect URI",
// http://127.0.0.1:43117/...). Nothing runs at that address: the extension
// sees the window going there, takes the one-time code from the address, and
// closes the window. The code is then swapped for keys to the account, which
// stay in this browser profile only.
(function () {
  'use strict';
  var REDIRECT_BASE = 'http://127.0.0.1:43117/';

  function rand(n) {
    var abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    var a = new Uint8Array(n), s = '', i;
    crypto.getRandomValues(a);
    for (i = 0; i < n; i++) s += abc[a[i] % abc.length];
    return s;
  }
  function b64url(buf) {
    var bin = '', b = new Uint8Array(buf), i;
    for (i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function pkce() {
    var verifier = rand(64);
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)).then(function (d) {
      return { verifier: verifier, challenge: b64url(d) };
    });
  }

  // Open url in a small window of its own; resolves with the address the
  // service sent the window to once it starts with prefix (a URL object).
  // Rejects with an error whose .closed is true when the window was closed.
  var open = null;
  function popup(url, prefix) {
    if (open) open.abandon();
    return new Promise(function (resolve, reject) {
      var winId = null, tabId = null, done = false;
      function finish(err, u) {
        if (done) return;
        done = true;
        if (open === me) open = null;
        chrome.tabs.onUpdated.removeListener(onUpd);
        chrome.windows.onRemoved.removeListener(onRem);
        if (winId !== null) chrome.windows.remove(winId).catch(function () {});
        if (err) reject(err); else resolve(u);
      }
      function onUpd(id, info, tab) {
        if (tabId !== null && id !== tabId) return;
        var u = info.url || (tab && tab.url) || '';
        if (u && u.lastIndexOf(prefix, 0) === 0) {
          var parsed = null;
          try { parsed = new URL(u); } catch (e) {}
          if (parsed) finish(null, parsed);
        }
      }
      function onRem(id) {
        if (id !== winId) return;
        winId = null;
        var e = new Error('the sign-in window was closed');
        e.closed = true;
        finish(e);
      }
      var me = { abandon: function () { var e = new Error('another sign-in started'); e.closed = true; finish(e); } };
      open = me;
      chrome.tabs.onUpdated.addListener(onUpd);
      chrome.windows.onRemoved.addListener(onRem);
      var w = 520, h = 760;
      var left = Math.round((screen.availLeft || 0) + Math.max(0, (screen.availWidth - w) / 2));
      var top = Math.round((screen.availTop || 0) + Math.max(0, (screen.availHeight - h) / 2));
      chrome.windows.create({ url: url, type: 'popup', width: w, height: h, left: left, top: top, focused: true }).then(function (win) {
        winId = win.id;
        tabId = win.tabs && win.tabs[0] ? win.tabs[0].id : null;
      }, function (e) { finish(e); });
    });
  }

  // A page for the listener to read or do something on (a developer
  // dashboard, say): an ordinary browser window, next to the player.
  function openPage(url) {
    return chrome.windows.create({ url: url, type: 'normal', width: 1180, height: 860, focused: true }).catch(function () {
      window.open(url, '_blank');
    });
  }

  function form(o) {
    return Object.keys(o).filter(function (k) { return o[k] !== undefined && o[k] !== null; })
      .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(o[k]); }).join('&');
  }
  function qs(o) { var s = form(o || {}); return s ? '?' + s : ''; }
  function wait(ms) { return new Promise(function (go) { setTimeout(go, ms); }); }

  // small settings and keys, kept in this browser profile
  var keep = {
    get: function (k, d) { try { var v = localStorage.getItem('sp2.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('sp2.' + k, JSON.stringify(v)); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem('sp2.' + k); } catch (e) {} }
  };

  // A queue item the way the skin reads one (the shape MusicKit's had), made
  // from a song as the lists keep it.
  function itemOf(s) {
    return {
      id: String(s.id), title: s.n, artistName: s.a || '', albumName: s.al || '',
      playbackDuration: (s.d || 0) * 1000, artworkURL: s.art || '',
      attributes: { name: s.n, playParams: { catalogId: String(s.id) } },
      song: s
    };
  }

  // What to play, from what the skin asks for: {songs: [ids], startWith},
  // {song: id}, {playlist: id, startWith} or {album: id, startWith}. Lists
  // longer than max are cut to a stretch around the song picked.
  function queueFrom(svc, opts, max) {
    max = max || 200;
    var list = null, start = Math.max(0, opts.startWith || 0);
    if (opts.songs) list = opts.songs.map(function (id) { return svc.song(id); });
    else if (opts.song) list = [svc.song(opts.song)];
    else if (opts.playlist || opts.album) {
      var kind = opts.playlist ? 'playlist' : 'album', id = opts.playlist || opts.album;
      var have = svc.listOf(kind, id);
      list = have ? Promise.resolve(have) : svc.tracks(kind, id);
      // a list the service will not show song by song: it plays it from its side
      list = list.catch(function (e) {
        if (e && e.hidden && svc.contextFor) return { context: svc.contextFor(kind, id, opts.name) };
        throw e;
      });
    }
    return Promise.resolve(list).then(function (songs) {
      if (songs && songs.context) return { context: songs.context, items: [], index: 0 };
      songs = (songs || []);
      var picked = songs[start];
      songs = songs.filter(function (s) { return s && svc.playable(s); });
      var at = picked ? songs.indexOf(picked) : 0;
      if (at < 0) at = 0;
      var from = 0;
      if (songs.length > max) {
        from = Math.max(0, Math.min(at - 20, songs.length - max));
        songs = songs.slice(from, from + max);
      }
      return { items: songs.map(itemOf), index: at - from };
    });
  }

  window.MPAuth = { REDIRECT_BASE: REDIRECT_BASE, rand: rand, pkce: pkce, popup: popup, openPage: openPage };
  window.MPUtil = { form: form, qs: qs, wait: wait, keep: keep, itemOf: itemOf, queueFrom: queueFrom };
})();
