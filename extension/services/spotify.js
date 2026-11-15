// Stream Player - Spotify.
//
// Everything goes through Spotify's own public ways in for players like this
// one: the Web API (library, playlists, search, saving songs) and the Web
// Playback SDK (the sound: Spotify's player, running in this window as one of
// the listener's Spotify Connect devices, "Stream Player"). Both want an app
// of the listener's own, registered once on Spotify's developer dashboard
// (free); its Client ID is pasted into the player, which then signs in with
// Spotify's own sign-in page. Playing needs Spotify Premium (Spotify's rule
// for every player outside its own apps), and since February 2026 an app of
// one's own only works while its owner has Premium.
//
// What Spotify lets such apps do changed in 2026, and this file follows the
// new rules: songs are saved with /me/library, a playlist's songs are only
// listed when the playlist is the listener's own (others still play, from
// Spotify's side: see "context" in engine.js), artists have no top songs,
// and the sign-in has to be renewed every six months.
//
// The SDK file in lib/ is Spotify's own loader, kept in the extension because
// extension pages may only run their own files; all it does is open Spotify's
// player page (sdk.scdn.co) in a hidden frame and talk to it.
(function () {
  'use strict';
  var U = window.MPUtil, A = window.MPAuth;
  var API = 'https://api.spotify.com/v1';
  var REDIRECT = A.REDIRECT_BASE + 'spotify';
  var SCOPES = [
    'streaming', 'user-read-email', 'user-read-private',
    'user-library-read', 'user-library-modify',
    'playlist-read-private', 'playlist-read-collaborative', 'playlist-modify-private', 'playlist-modify-public',
    'user-follow-read', 'user-read-playback-state', 'user-modify-playback-state',
    'user-read-currently-playing', 'user-read-recently-played'
  ].join(' ');

  var SP = {
    id: 'spotify', name: 'Spotify',
    label: 'SPOTIFY', jp: 'スポティファイ', color: '#1ed760',
    redirect: REDIRECT,
    dashboard: 'https://developer.spotify.com/dashboard',
    nav: [
      { go: 'recent', icon: 'recent', label: 'Recently Added', jp: '最近追加' },
      { go: 'songs', icon: 'note', label: 'Liked Songs', jp: 'お気に入り' },
      { go: 'albums', icon: 'disc', label: 'Albums', jp: 'アルバム' },
      { go: 'artists', icon: 'person', label: 'Artists', jp: 'アーティスト' }
    ],
    words: {
      inLib: 'In your Liked Songs', addSong: 'Save to Liked Songs', adding: 'Saving to Liked Songs',
      saved: 'SAVED', addKey: 'SAVE', savingSong: 'SAVING TO LIKED SONGS', savedSong: 'SAVED TO LIKED SONGS',
      setupIntro: 'Spotify only lets players like this one in through an app of your own, made on Spotify\'s ' +
        'developer dashboard: free, about a minute, and only once. (Spotify allows it for accounts with Premium.)',
      signInNote: 'Spotify\'s own sign-in page opens in a small window. Sign in there and allow what the player asks ' +
        'for (your library, your playlists, and playing music here).',
      signedInNote: 'Your library, playlists and saved songs are Spotify\'s; changes show up in Spotify\'s own apps too. ' +
        'Playing needs Spotify Premium. Spotify asks for this sign-in again every six months.'
    },
    songsPageSize: 50,
    maxQueue: 100,                               // Spotify gets confused by much longer lists
    auth: U.keep.get('spotify.auth', null),       // {access, refresh, expires, scope}
    clientId: U.keep.get('spotify.clientId', ''),
    user: U.keep.get('spotify.user', null),       // {id, name, product, country}
    country: '',
    cache: {},                                   // id -> song
    lists: {},                                   // 'playlist:<id>' / 'album:<id>' -> songs
    authFns: [],
    engine: null
  };

  // ---- signing in ----
  SP.ready = function () { return !!SP.clientId; };
  SP.signedIn = function () { return !!(SP.clientId && SP.auth && SP.auth.refresh); };
  SP.onAuth = function (fn) { SP.authFns.push(fn); };
  function authChanged() {
    SP.authFns.forEach(function (fn) { try { fn(); } catch (e) {} });
    if (SP.engine) SP.engine.emit('authorizationStatusDidChange');
  }
  SP.setClientId = function (id) {
    id = String(id || '').trim();
    if (!/^[0-9a-f]{32}$/i.test(id)) return false;
    if (id !== SP.clientId) { SP.clientId = id; U.keep.set('spotify.clientId', id); SP.signOut(true); }
    return true;
  };
  // ---- setting up: the listener's own Spotify app ----
  SP.setupSteps = function () {
    return [
      { text: 'Open Spotify\'s developer dashboard and log in with your Spotify account (the one with Premium).',
        link: SP.dashboard, linkText: 'OPEN DASHBOARD' },
      { text: 'Press "Create app". Name and description: anything, say Stream Player. Redirect URI: paste this, then press Add:',
        copy: REDIRECT },
      { text: 'Under "Which API/SDKs are you planning to use?" tick Web API and Web Playback SDK, agree to the terms and press Save.' },
      { text: 'In the app\'s Settings, copy its Client ID (32 letters and digits) and paste it here, then press CONNECT.' }
    ];
  };
  SP.setupFields = function () { return [{ key: 'clientId', label: 'CLIENT ID', placeholder: 'e.g. 0a1b2c3d4e5f...' }]; };
  // '' when fine, else what is wrong (shown to the listener)
  SP.setApp = function (vals) {
    return SP.setClientId(vals.clientId) ? '' : 'THAT IS NOT A CLIENT ID - it is 32 letters and digits, from the app\'s Settings';
  };
  SP.forgetApp = function () { SP.signOut(true); SP.clientId = ''; U.keep.del('spotify.clientId'); };
  // a song from the saved copy of the lists, known again
  SP.adopt = function (s) {
    var have = SP.cache[s.id];
    if (have) return have;
    s.uri = 'spotify:track:' + s.id;
    s.ok = true;
    SP.cache[s.id] = s;
    return s;
  };

  SP.signIn = function () {
    if (!SP.clientId) return Promise.reject(new Error('no Client ID yet'));
    var state = A.rand(24), keys;
    return A.pkce().then(function (k) {
      keys = k;
      var url = 'https://accounts.spotify.com/authorize' + U.qs({
        response_type: 'code', client_id: SP.clientId, scope: SCOPES, redirect_uri: REDIRECT,
        code_challenge_method: 'S256', code_challenge: k.challenge, state: state, show_dialog: 'false'
      });
      return A.popup(url, REDIRECT);
    }).then(function (u) {
      var q = u.searchParams;
      if (q.get('state') !== state) throw new Error('the answer from Spotify did not match the request');
      if (q.get('error')) throw new Error(q.get('error') === 'access_denied' ? 'access was not allowed' : q.get('error'));
      return tokenCall({ grant_type: 'authorization_code', code: q.get('code'), redirect_uri: REDIRECT, client_id: SP.clientId, code_verifier: keys.verifier });
    }).then(function () { return loadMe(); }).then(function () { authChanged(); return SP.user; });
  };
  SP.signOut = function (quiet) {
    SP.auth = null; SP.user = null; SP.cache = {}; SP.lists = {};
    U.keep.del('spotify.auth'); U.keep.del('spotify.user');
    if (SP.engine) SP.engine.reset();
    if (player) { try { player.disconnect(); } catch (e) {} player = null; device = ''; sdkStarted = null; }
    if (!quiet) authChanged();
  };

  function tokenCall(body) {
    return fetch('https://accounts.spotify.com/api/token', {
      method: 'POST', credentials: 'omit',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: U.form(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok || !j.access_token) {
          var e = new Error(j.error_description || j.error || ('Spotify said ' + r.status));
          e.status = r.status;
          e.auth = j.error === 'invalid_grant' || j.error === 'invalid_client';
          // (the sign-in lasts six months, then Spotify wants it done again)
          if (j.error === 'invalid_grant' && body.grant_type === 'refresh_token') e.message = 'Spotify wants you to sign in again (it asks every six months)';
          throw e;
        }
        SP.auth = {
          access: j.access_token,
          refresh: j.refresh_token || (SP.auth && SP.auth.refresh) || '',
          expires: Date.now() + (j.expires_in || 3600) * 1000 - 60000,
          scope: j.scope || ''
        };
        U.keep.set('spotify.auth', SP.auth);
        return SP.auth.access;
      });
    });
  }
  var refreshing = null;
  function token(force) {
    if (!SP.signedIn()) return Promise.reject(new Error('not signed in to Spotify'));
    if (!force && SP.auth.access && Date.now() < SP.auth.expires) return Promise.resolve(SP.auth.access);
    if (!refreshing) {
      refreshing = tokenCall({ grant_type: 'refresh_token', refresh_token: SP.auth.refresh, client_id: SP.clientId })
        .then(function (t) { refreshing = null; return t; }, function (e) {
          refreshing = null;
          if (e.auth) { SP.lastError = e.message; SP.signOut(); }   // the keys ran out or were withdrawn: sign in again
          throw e;
        });
    }
    return refreshing;
  }
  SP.token = token;

  // ---- the Web API ----
  // api('GET', '/me/tracks', {limit: 50}) -> the answer's JSON (null for "no content")
  function api(method, path, q, body, tries) {
    tries = tries || 0;
    return token(tries === 1).then(function (t) {
      var o = { method: method, credentials: 'omit', headers: { Authorization: 'Bearer ' + t } };
      if (body !== undefined) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
      return fetch((/^https:/.test(path) ? path : API + path + U.qs(q)), o);
    }).then(function (r) {
      if (r.status === 401 && tries < 1) return api(method, path, q, body, 1);
      if (r.status === 429 && tries < 4) {
        var wait = Math.min(20, +(r.headers.get('Retry-After') || 2)) * 1000;
        return U.wait(wait).then(function () { return api(method, path, q, body, tries + 2); });
      }
      if (r.status >= 500 && tries < 2 && method === 'GET') return U.wait(800).then(function () { return api(method, path, q, body, 2); });
      if (r.status === 204 || r.status === 202) return null;
      return r.text().then(function (text) {
        var j = null;
        try { j = text ? JSON.parse(text) : null; } catch (e) {}
        if (!r.ok) {
          var msg = (j && j.error && (j.error.message || j.error)) || ('Spotify said ' + r.status);
          var e = new Error(String(msg));
          e.status = r.status;
          e.reason = j && j.error && j.error.reason;
          throw e;
        }
        return j;
      });
    });
  }
  SP.api = api;

  // (Spotify no longer tells apps the account's country or plan: songs are
  // asked for "as this account sees them", and Premium shows when playing)
  function loadMe() {
    return api('GET', '/me').then(function (me) {
      SP.user = { id: me.id, name: me.display_name || me.id };
      U.keep.set('spotify.user', SP.user);
      return SP.user;
    });
  }
  SP.init = function () {
    if (!SP.signedIn()) return Promise.resolve(false);
    return loadMe().then(function () { return true; }, function (e) { return !e.auth && SP.signedIn(); });
  };

  // ---- what the lists keep ----
  // pictures: Spotify gives a few sizes; kept as "big medium small" addresses
  function pics(images) {
    var list = (images || []).filter(function (i) { return i && i.url; })
      .sort(function (a, b) { return (b.width || 0) - (a.width || 0); });
    return list.map(function (i) { return i.url; }).join(' ');
  }
  function names(artists) { return (artists || []).map(function (a) { return a && a.name; }).filter(Boolean).join(', '); }
  function packSong(t, album) {
    if (!t || !t.id || t.type === 'episode' || t.is_local) return null;
    var al = t.album || album || {};
    var s = SP.cache[t.id] || {};
    s.id = t.id; s.cid = ''; s.n = t.name || 'Unknown'; s.a = names(t.artists);
    s.al = al.name || ''; s.d = Math.round((t.duration_ms || 0) / 1000);
    s.art = pics(al.images) || s.art || ''; s.tn = t.track_number || 0;
    s.uri = t.uri || ('spotify:track:' + t.id);
    s.ok = t.is_playable !== false;
    s.arIds = (t.artists || []).map(function (a) { return a && a.id; }).filter(Boolean);
    s.alId = al.id || s.alId || '';
    SP.cache[t.id] = s;
    return s;
  }
  function packAlbum(a) {
    if (!a || !a.id) return null;
    return { id: a.id, kind: 'album', n: a.name || 'Untitled', a: names(a.artists), art: pics(a.images), tc: a.total_tracks || 0, uri: a.uri };
  }
  function packPlaylist(p) {
    if (!p || !p.id) return null;
    var me = SP.user && SP.user.id, own = !!(p.owner && p.owner.id === me);
    var count = (p.items && p.items.total) || (p.tracks && p.tracks.total) || 0;
    return { id: p.id, kind: 'playlist', n: p.name || 'Untitled', a: own ? '' : ((p.owner && (p.owner.display_name || p.owner.id)) || ''),
             art: pics(p.images), tc: count, ed: own || !!p.collaborative, uri: p.uri, own: own };
  }
  function packArtist(a) { return a && a.id ? { id: a.id, n: a.name || 'Unknown' } : null; }
  SP.song = function (id) { return SP.cache[id] || null; };
  SP.listOf = function (kind, id) { return SP.lists[kind + ':' + id] || null; };
  SP.playable = function (s) { return !!(s && s.uri && s.ok !== false); };
  function clean(list) { return list.filter(Boolean); }

  // every page of an offset-paged list
  function pages(path, q, take, onChunk, size) {
    var out = [];
    size = size || 50;
    function page(offset) {
      var p = Object.assign({ limit: size, offset: offset }, q || {});
      return api('GET', path, p).then(function (d) {
        var raw = (d && d.items) || [];
        out = out.concat(clean(raw.map(take)));
        if (onChunk) onChunk(out);
        return d && d.next && raw.length ? page(offset + raw.length) : out;
      });
    }
    return page(0);
  }

  // ---- the library ----
  SP.playlists = function (onChunk) {
    return pages('/me/playlists', {}, packPlaylist, onChunk);
  };
  SP.recent = function () {
    // the albums saved most recently (Spotify lists them newest first)
    return api('GET', '/me/albums', { limit: 50 }).then(function (d) {
      return clean(((d && d.items) || []).map(function (x) { return packAlbum(x.album); }));
    });
  };
  SP.albums = function (onChunk) {
    return pages('/me/albums', {}, function (x) { return packAlbum(x && x.album); }, onChunk);
  };
  SP.artists = function (onChunk) {
    var out = [];
    function page(after) {
      return api('GET', '/me/following', { type: 'artist', limit: 50, after: after }).then(function (d) {
        var a = (d && d.artists) || {};
        out = out.concat(clean((a.items || []).map(packArtist)));
        if (onChunk) onChunk(out);
        var next = a.cursors && a.cursors.after;
        return a.next && next ? page(next) : out;
      });
    }
    return page(undefined).then(function (list) {
      return list.sort(function (x, y) { return x.n.localeCompare(y.n); });
    });
  };
  // Liked Songs, one page at a time (the skin fetches several at once)
  SP.songsPage = function (offset, limit) {
    return api('GET', '/me/tracks', { limit: limit || 50, offset: offset }).then(function (d) {
      return { total: (d && d.total) || 0, items: ((d && d.items) || []).map(function (x) { return packSong(x && x.track); }) };
    });
  };

  SP.tracks = function (kind, id, onChunk) {
    var key = kind + ':' + id;
    var p;
    if (kind === 'album') {
      p = api('GET', '/albums/' + encodeURIComponent(id), { market: 'from_token' }).then(function (al) {
        var tr = al.tracks || al.items || {};
        var out = clean((tr.items || []).map(function (t) { return packSong(t, al); }));
        if (onChunk) onChunk(out);
        var next = tr.next;
        function more(url) {
          if (!url) return out;
          return api('GET', url).then(function (d) {
            out = out.concat(clean(((d && d.items) || []).map(function (t) { return packSong(t, al); })));
            if (onChunk) onChunk(out);
            return more(d && d.next);
          });
        }
        return more(next);
      });
    } else {
      // Spotify only lists the songs of the listener's own playlists (and
      // ones they work on with others); any other playlist answers 403
      p = pages('/playlists/' + encodeURIComponent(id) + '/items', { market: 'from_token', additional_types: 'track' },
        function (x) { return packSong(x && (x.item || x.track)); }, onChunk, 50).catch(function (e) {
        if (e.status === 403 || e.status === 404) {
          var hid = new Error('Spotify only shows the songs of your own playlists to other players. This one still plays: press PLAY or SHUFFLE.');
          hid.hidden = true;
          throw hid;
        }
        throw e;
      });
    }
    return p.then(function (list) { SP.lists[key] = list; return list; });
  };
  // a list Spotify plays from its side when it will not show the songs
  SP.contextFor = function (kind, id, name) {
    return { uri: 'spotify:' + (kind === 'album' ? 'album' : 'playlist') + ':' + id, name: name || '' };
  };

  // An artist: their albums and singles (ten at a time is all Spotify gives
  // now; enough pages for the whole of most artists). Spotify no longer gives
  // other players an artist's top songs.
  SP.artist = function (id) {
    var out = [];
    function page(offset) {
      return api('GET', '/artists/' + encodeURIComponent(id) + '/albums',
        { include_groups: 'album,single,compilation', market: 'from_token', limit: 10, offset: offset }).then(function (d) {
        var raw = (d && d.items) || [];
        out = out.concat(clean(raw.map(packAlbum)));
        return d && d.next && raw.length && offset < 90 ? page(offset + raw.length) : out;
      });
    }
    return page(0).then(function (list) {
      var seen = {}, al = list.filter(function (a) { var k = a.n.toLowerCase(); if (seen[k]) return false; seen[k] = 1; return true; });
      return { songs: [], albums: al };
    });
  };

  SP.search = function (term) {
    return api('GET', '/search', { q: term, type: 'track,album,playlist,artist', limit: 10, market: 'from_token' }).then(function (d) {
      d = d || {};
      return {
        songs: clean(((d.tracks && d.tracks.items) || []).map(function (t) { return packSong(t); })),
        albums: clean(((d.albums && d.albums.items) || []).map(packAlbum)),
        playlists: clean(((d.playlists && d.playlists.items) || []).map(packPlaylist)),
        artists: clean(((d.artists && d.artists.items) || []).map(packArtist))
      };
    });
  };

  // ---- changing the library ----
  // Which of these are saved already: {id: true}. kind: songs | albums | playlists
  function uriOf(kind, id) { return 'spotify:' + (kind === 'albums' ? 'album' : kind === 'playlists' ? 'playlist' : 'track') + ':' + id; }
  SP.inLibrary = function (kind, ids) {
    var out = {}, parts = [], i;
    for (i = 0; i < ids.length; i += 40) parts.push(ids.slice(i, i + 40));
    return Promise.all(parts.map(function (part) {
      return api('GET', '/me/library/contains', { uris: part.map(function (id) { return uriOf(kind, id); }).join(',') }).then(function (r) {
        (r || []).forEach(function (yes, k) { if (yes) out[part[k]] = true; });
      });
    })).then(function () { return out; });
  };
  // save a song (Liked Songs) or an album, or follow a playlist
  SP.save = function (kind, item) {
    return api('PUT', '/me/library', { uris: uriOf(kind, item.id) });
  };
  SP.addToPlaylist = function (pl, s) {
    return api('POST', '/playlists/' + encodeURIComponent(pl.id) + '/items', null, { uris: [s.uri || 'spotify:track:' + s.id] });
  };
  SP.newPlaylist = function (name, s) {
    if (!SP.user) return Promise.reject(new Error('not signed in'));
    return api('POST', '/me/playlists', null, { name: name, public: false, description: 'Made in Stream Player' })
      .then(function (p) {
        return SP.addToPlaylist({ id: p.id }, s).then(function () {
          var t = packPlaylist(p); t.tc = 1; t.ed = true; t.own = true; t.a = ''; return t;
        });
      });
  };

  // ---- the sound: Spotify's player in this window ----
  var player = null, device = '', sdkStarted = null, sdkLoaded = null;
  var last = { st: null, at: 0, pos: 0, dur: 0, playing: false, id: '' };
  function loadSdk() {
    if (sdkLoaded) return sdkLoaded;
    sdkLoaded = new Promise(function (resolve, reject) {
      if (window.Spotify && window.Spotify.Player) { resolve(); return; }
      window.onSpotifyWebPlaybackSDKReady = function () { resolve(); };
      var s = document.createElement('script');
      s.src = 'lib/spotify-player.js';
      s.onerror = function () { sdkLoaded = null; reject(new Error('Spotify\'s player could not be loaded')); };
      document.head.appendChild(s);
    });
    return sdkLoaded;
  }
  function trouble(text) {
    var e = new Error(text);
    if (SP.engine) SP.engine.backendError(e);
    return e;
  }
  function startPlayer() {
    if (sdkStarted) return sdkStarted;
    sdkStarted = loadSdk().then(function () {
      return new Promise(function (resolve, reject) {
        var settled = false;
        function fail(e) { if (!settled) { settled = true; sdkStarted = null; reject(e); } }
        player = new window.Spotify.Player({
          name: 'Stream Player',
          getOAuthToken: function (cb) { token().then(cb, function () { cb(''); }); },
          volume: SP.engine ? SP.engine.vol : 0.8
        });
        player.addListener('ready', function (e) {
          device = e.device_id;
          if (!settled) { settled = true; resolve(device); }
        });
        player.addListener('not_ready', function () { device = ''; });
        player.addListener('initialization_error', function (e) {
          fail(trouble('this browser cannot play Spotify (' + (e && e.message) + ') - Widevine needs to be on'));
        });
        player.addListener('authentication_error', function () {
          token(true).catch(function () {});
          fail(trouble('Spotify did not accept the sign-in - sign in again'));
        });
        player.addListener('account_error', function () {
          fail(trouble('playing needs Spotify Premium'));
        });
        player.addListener('playback_error', function (e) { trouble('Spotify could not play this (' + ((e && e.message) || 'error') + ')'); });
        player.addListener('autoplay_failed', function () { trouble('click play once more to start the sound'); });
        player.addListener('player_state_changed', onSdkState);
        player.connect().then(function (ok) { if (!ok) fail(new Error('Spotify\'s player did not start')); });
        setTimeout(function () { fail(new Error('Spotify\'s player did not start in time')); }, 20000);
      });
    });
    return sdkStarted;
  }
  SP.warm = function () { if (SP.signedIn()) startPlayer().catch(function () {}); };

  function onSdkState(st) {
    var eng = SP.engine, now = performance.now();
    if (!eng) return;
    if (!st) {                                   // played somewhere else now
      last.st = null;
      if (eng.loaded) eng.backendState('paused');
      return;
    }
    var cur = st.track_window && st.track_window.current_track;
    var wasNearEnd = last.playing && last.dur > 0 && (last.pos + (now - last.at)) >= last.dur - 2500;
    var prevId = last.id;
    last.st = st; last.at = now; last.pos = st.position || 0; last.dur = st.duration || 0;
    last.playing = !st.paused && !st.loading;
    if (cur && eng.ctx) {
      // a list Spotify keeps to itself: what plays now, and what comes next
      var cid = cur.id || (cur.uri || '').split(':').pop();
      if (cid !== last.id || !eng.items.length) {
        last.id = cid;
        var now1 = packSong(cur), nxt = ((st.track_window && st.track_window.next_tracks) || []).map(function (t) { return packSong(t); });
        if (now1) {
          eng.backendWindow([now1].concat(clean(nxt)).map(U.itemOf), 0);
          askQueue();
        }
      }
    } else if (cur) {
      var id = (cur.linked_from && cur.linked_from.id) || cur.id;
      last.id = id;
      if (!eng.items[eng.pos] || (eng.items[eng.pos].id !== id && eng.items[eng.pos].id !== cur.id)) {
        eng.backendTrack(eng.items.some(function (x) { return x.id === id; }) ? id : cur.id);
      }
    }
    // the end of the list: Spotify stops on its last song, back at its start
    if (!eng.ctx && st.paused && !st.loading && st.position === 0 && wasNearEnd && (!cur || last.id === prevId) &&
        !(st.track_window && st.track_window.next_tracks && st.track_window.next_tracks.length)) {
      eng.backendEnded();
      if (eng.st === 4 || eng.st === 10) return;
    }
    eng.backendState(st.loading ? 'loading' : st.paused ? (eng.st === 4 ? 'stopped' : 'paused') : 'playing');
  }

  // (context lists) the longer view of what comes next, once per song
  var queueTimer = 0;
  function askQueue() {
    clearTimeout(queueTimer);
    queueTimer = setTimeout(function () {
      var eng = SP.engine;
      if (!eng || !eng.ctx) return;
      api('GET', '/me/player/queue').then(function (q) {
        if (!q || !q.currently_playing || !eng.ctx) return;
        var now1 = packSong(q.currently_playing), cur = eng.items[eng.pos];
        if (!now1 || !cur || cur.id !== now1.id) return;
        var rest = clean((q.queue || []).map(function (t) { return packSong(t); })).slice(0, 50);
        eng.backendWindow([now1].concat(rest).map(U.itemOf), 0);
      }).catch(function () {});
    }, 900);
  }

  var backend = {
    drivesList: true,
    kbps: 0,
    // a whole album or playlist, played from Spotify's side (song: where to start)
    loadContext: function (ctx, song, shuffle) {
      return startPlayer().then(function (dev) {
        try { player.activateElement(); } catch (e) {}
        last.id = '';
        return api('PUT', '/me/player/shuffle', { state: shuffle ? 'true' : 'false', device_id: dev }).catch(function () {}).then(function () {
          var body = { context_uri: ctx.uri };
          if (song && song.uri) body.offset = { uri: song.uri };
          return api('PUT', '/me/player/play', { device_id: dev }, body);
        });
      }).catch(function (e) {
        if (e.status === 403 && /premium/i.test(e.reason || e.message)) throw new Error('playing needs Spotify Premium');
        throw e;
      });
    },
    setShuffle: function (on) {
      if (!device) return null;
      return api('PUT', '/me/player/shuffle', { state: on ? 'true' : 'false', device_id: device }).then(askQueue, function () {});
    },
    load: function (items, i, startSec) {
      return startPlayer().then(function (dev) {
        try { player.activateElement(); } catch (e) {}
        var body = { uris: items.map(function (x) { return x.song.uri; }), offset: { position: i } };
        if (startSec > 0.5) body.position_ms = Math.round(startSec * 1000);
        // (the order is the engine's: Spotify's own shuffle stays off)
        return api('PUT', '/me/player/shuffle', { state: 'false', device_id: dev }).catch(function () {}).then(function () {
          return api('PUT', '/me/player/play', { device_id: dev }, body);
        }).catch(function (e) {
          // the device dropped out of Spotify's list: start it again, once
          if (e.status === 404) {
            sdkStarted = null;
            try { player.disconnect(); } catch (x) {}
            return startPlayer().then(function (d2) { return api('PUT', '/me/player/play', { device_id: d2 }, body); });
          }
          if (e.status === 403 && /premium/i.test(e.reason || e.message)) throw new Error('playing needs Spotify Premium');
          throw e;
        });
      }).then(function () {
        var eng = SP.engine;
        if (eng && eng.rep) backend.setRepeat(window.MPKit.PlayerRepeatMode[eng.rep]);
      });
    },
    play: function () { return player ? player.resume() : null; },
    pause: function () { return player ? player.pause() : null; },
    seek: function (sec) {
      if (!player) return null;
      last.pos = Math.round(sec * 1000); last.at = performance.now();
      return player.seek(Math.round(sec * 1000));
    },
    next: function () { return player ? player.nextTrack() : null; },
    prev: function () { return player ? player.previousTrack() : null; },
    setVolume: function (v) { if (player) { try { player.setVolume(Math.max(0.0001, v)); } catch (e) {} } U.keep.set('spotify.vol', v); },
    setRepeat: function (mode) {
      if (!device) return null;
      return api('PUT', '/me/player/repeat', { state: mode === 'one' ? 'track' : mode === 'all' ? 'context' : 'off', device_id: device }).catch(function () {});
    },
    queueNext: function (items) {
      if (!device || items.length !== 1) return false;
      return api('POST', '/me/player/queue', { uri: items[0].song.uri, device_id: device }).then(function () { return true; }, function () { return false; });
    },
    time: function () {
      if (!last.st) return 0;
      var p = last.pos + (last.playing ? performance.now() - last.at : 0);
      return Math.max(0, Math.min(p, last.dur || p)) / 1000;
    },
    duration: function () { return last.st ? (last.dur || 0) / 1000 : 0; }
  };

  SP.engine = new window.MPEngine({
    service: SP, backend: backend,
    resolve: function (opts) { return U.queueFrom(SP, opts, SP.maxQueue); }
  });
  SP.engine.vol = U.keep.get('spotify.vol', 0.8);

  window.MPServices = window.MPServices || {};
  window.MPServices.spotify = SP;
})();
