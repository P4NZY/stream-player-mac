// Stream Player - SoundCloud.
//
// SoundCloud's API (search, the account's own library, likes) only lets in
// apps registered by SoundCloud Artist Pro subscribers, and its website's own
// inner workings are not for other players to use (SoundCloud's terms). What
// SoundCloud does offer every site is its embeddable player - the one on blogs
// and band pages - with a script interface for driving it (the Widget API:
// lib/sc-widget-api.js is SoundCloud's own file). So here:
//   - the sound comes from that player, hidden in this page: any public track,
//     playlist, album or artist plays, a song at a time, in the engine's queue
//     (30-second previews for Go+ songs, as for anyone not signed in)
//   - "Likes" are the likes on the listener's public profile (its link is
//     given once, under ACCOUNT), read through the same player
//   - playlists, saved songs and artists are kept by this player, on this Mac;
//     SoundCloud's own playlists and albums can be saved here by their link
//   - search covers links (pasted into the search box) and the library here;
//     for anything else there is a SoundCloud window (BROWSE SOUNDCLOUD), and
//     whatever is open in it can be played or saved here with one click
//   - a link's title, picture and kind come from SoundCloud's public oEmbed
//     service (soundcloud.com/oembed), made for exactly this
(function () {
  'use strict';
  var U = window.MPUtil, A = window.MPAuth, keep = U.keep;
  var WIDGET = 'https://w.soundcloud.com/player/';
  var OPTS = { auto_play: false, visual: false, show_comments: false, hide_related: true, show_user: true, show_reposts: false,
               show_teaser: false, buying: false, sharing: false, download: false, show_playcount: false };

  var SC = {
    id: 'soundcloud', name: 'SoundCloud', label: 'SOUNDCLOUD', jp: 'サウンドクラウド', color: '#ff7a1f',
    nav: [
      { go: 'songs', icon: 'note', label: 'Likes & Saved', jp: 'いいね' },
      { go: 'recent', icon: 'recent', label: 'History', jp: '履歴' },
      { go: 'artists', icon: 'person', label: 'Artists', jp: 'アーティスト' },
      { go: 'browse', icon: 'search', label: 'Browse SoundCloud', jp: 'ブラウズ' }
    ],
    recentSongs: true,                       // "History" is a list of songs, not tiles
    saveArtists: true,                       // artists can be saved (here)
    words: {
      inLib: 'In your Likes & Saved', addSong: 'Save here', adding: 'Saving', saved: 'SAVED', addKey: 'SAVE',
      savingSong: 'SAVING', savedSong: 'SAVED (in Stream Player)',
      noSongs: 'Your public SoundCloud likes show up here once your profile link is in (ACCOUNT), together with songs you save here.',
      searchNote: 'SoundCloud does not let other players search it. Search in the SoundCloud window (BROWSE SOUNDCLOUD) and play ' +
        'what you find from there, or paste a SoundCloud link (a song, playlist, album or artist) into the search box.'
    },
    profile: keep.get('sc.profile', null),   // {link, id, name, art}
    saved: keep.get('sc.saved', null) || { songs: [], sets: [], artists: [] },
    mine: keep.get('sc.mine', []),           // playlists made here: [{id, n, songs: [rows]}]
    history: keep.get('sc.history', []),     // rows, newest first
    cache: {}, lists: {}, lastError: '', user: null, country: '',
    browsing: null, browseFns: [], likeIds: null
  };
  SC.user = SC.profile ? { name: SC.profile.name || SC.profile.link } : null;

  // ---- songs ----
  function rowOf(s) { return [s.id, s.n, s.a, s.al, s.d, s.art, s.link || '']; }
  function adopt(s, link) {
    var have = SC.cache[s.id];
    if (have) return have;
    if (link && !s.link) s.link = link;
    s.ok = s.ok !== false;
    SC.cache[s.id] = s;
    return s;
  }
  function fromRow(r) {
    return adopt({ id: String(r[0]), cid: '', n: r[1], a: r[2], al: r[3], d: r[4], art: r[5], tn: 0, link: r[6] });
  }
  SC.adopt = adopt;
  SC.rowExtra = function (s) { return s.link || ''; };
  // a song from what SoundCloud's player knows about it
  function packSound(x) {
    if (!x || !x.id || (x.kind && x.kind !== 'track')) return null;
    var s = SC.cache[x.id] || {}, pm = x.publisher_metadata || {};
    if (!x.title) return s.n ? s : null;           // (a stub: only the id so far)
    s.id = String(x.id); s.cid = ''; s.tn = 0;
    s.n = x.title || 'Unknown';
    s.a = pm.artist || (x.user && x.user.username) || '';
    s.al = pm.album_title || '';
    s.d = Math.round((x.full_duration || x.duration || 0) / 1000);
    s.art = x.artwork_url || (x.user && x.user.avatar_url) || '';
    s.link = x.permalink_url || s.link || '';
    s.snip = x.policy === 'SNIP';
    s.ok = x.policy !== 'BLOCK' && x.streamable !== false;
    s.by = x.user ? { id: String(x.user.id), n: x.user.username || '', link: x.user.permalink_url || '', art: x.user.avatar_url || '' } : null;
    SC.cache[s.id] = s;
    return s;
  }
  SC.song = function (id) { return SC.cache[id] || null; };
  SC.listOf = function (kind, id) { return SC.lists[kind + ':' + id] || null; };
  SC.playable = function (s) { return !!(s && s.id && s.ok !== false); };

  // ---- SoundCloud's embeddable player, as a frame in this page ----
  function frame(cls, url) {
    var f = document.createElement('iframe');
    f.className = cls;
    f.setAttribute('allow', 'autoplay; encrypted-media');
    f.setAttribute('aria-hidden', 'true');
    f.tabIndex = -1;
    f.style.cssText = 'position:fixed;left:-2000px;top:0;width:400px;height:200px;border:0;opacity:0;pointer-events:none';
    var q = Object.keys(OPTS).map(function (k) { return k + '=' + OPTS[k]; }).join('&');
    f.src = WIDGET + '?url=' + encodeURIComponent(url) + '&' + q;
    document.body.appendChild(f);
    return f;
  }
  function apiUrl(kind, id) { return 'https://api.soundcloud.com/' + kind + '/' + id; }

  // A second, silent player that only reads lists (a playlist's songs, an
  // artist's songs, the likes), so that reading never interrupts the music.
  var reader = null, readerQ = Promise.resolve();
  function readList(url) {
    var job = readerQ.then(function () { return readNow(url); });
    readerQ = job.catch(function () {});
    return job;
  }
  function readNow(url) {
    return new Promise(function (resolve, reject) {
      var done = false, timer = setTimeout(function () { finish(new Error('SoundCloud did not answer')); }, 20000);
      function finish(err, list) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (err) reject(err); else resolve(list);
      }
      function collect(w) {
        // the player fills in the songs of a long list a moment after it is ready
        var tries = 0, lastN = -1, still = 0;
        (function look() {
          w.getSounds(function (list) {
            list = list || [];
            var stubs = list.filter(function (x) { return x && !x.title; }).length;
            still = list.length === lastN ? still + 1 : 0;
            lastN = list.length;
            if ((!stubs && still >= 1) || ++tries > 14) finish(null, list);
            else setTimeout(look, 600);
          });
        })();
      }
      function onError() { finish(new Error('SoundCloud could not open that (private, removed, or not playable outside SoundCloud)')); }
      if (!reader) {
        var f = frame('mp-sc-reader', url), w = window.SC.Widget(f);
        reader = { w: w, ready: false, onError: onError };
        w.bind(window.SC.Widget.Events.READY, function () {
          if (reader.ready) return;
          reader.ready = true;
          try { w.setVolume(0); } catch (e) {}
          collect(w);
        });
        w.bind(window.SC.Widget.Events.ERROR, function () { if (reader.onError) reader.onError(); });
        return;
      }
      reader.onError = onError;
      reader.w.load(url, Object.assign({}, OPTS, { callback: function () { try { reader.w.setVolume(0); } catch (e) {} collect(reader.w); } }));
    });
  }
  function readSongs(url) {
    return readList(url).then(function (list) { return list.map(packSound).filter(Boolean); });
  }

  // ---- links ----
  var RESERVED = /^(discover|search|stream|you|upload|charts|stations|pages|terms-of-use|settings|messages|notifications|people|mobile|jobs|imprint|pro|artists|for-artists|tags|popular|feed|home|signin|login|logout|signup|premium|gifts|creator|next|go|press|legal)$/i;
  // what a soundcloud.com address points at: {kind: track|playlist|artist|likes|short, url}
  function parseLink(text) {
    var m = String(text || '').trim().match(/^(?:https?:\/\/)?(?:(?:www|m)\.)?(on\.)?soundcloud\.com\/([^?#\s]+)/i);
    if (!m) return null;
    if (m[1]) return { kind: 'short', url: 'https://on.soundcloud.com/' + m[2] };
    var parts = m[2].replace(/\/+$/, '').split('/').filter(Boolean);
    var user = parts[0];
    if (!user || RESERVED.test(user)) return null;
    var base = 'https://soundcloud.com/' + user;
    if (parts.length === 1) return { kind: 'artist', url: base };
    if (parts[1] === 'sets' && parts[2]) return { kind: 'playlist', url: base + '/sets/' + parts[2] + (parts[3] && /^s-/.test(parts[3]) ? '/' + parts[3] : '') };
    if (parts[1] === 'likes') return { kind: 'likes', url: base + '/likes' };
    if (/^(tracks|albums|sets|reposts|popular-tracks|followers|following|comments|spotlight)$/.test(parts[1])) return { kind: 'artist', url: base };
    return { kind: 'track', url: base + '/' + parts[1] + (parts[2] && /^s-/.test(parts[2]) ? '/' + parts[2] : '') };
  }
  SC.parseLink = parseLink;
  // short links (on.soundcloud.com/...) lead to the full address
  function unshorten(link) {
    if (link.kind !== 'short') return Promise.resolve(link);
    return fetch(link.url, { method: 'HEAD', credentials: 'omit', redirect: 'follow' }).then(function (r) {
      var full = parseLink(r.url);
      if (!full || full.kind === 'short') throw new Error('that short link does not lead to a song, playlist or artist');
      return full;
    });
  }
  // SoundCloud's oEmbed: title, picture, and which kind of thing with which id
  var embedCache = {};
  function oembed(url) {
    if (embedCache[url]) return embedCache[url];
    var p = fetch('https://soundcloud.com/oembed?format=json&url=' + encodeURIComponent(url), { credentials: 'omit' }).then(function (r) {
      if (r.status === 404 || r.status === 403) throw new Error('SoundCloud does not know that link (or it is private)');
      if (!r.ok) throw new Error('SoundCloud answered ' + r.status);
      return r.json();
    }).then(function (j) {
      var html = String(j.html || '');
      var m = html.match(/api\.soundcloud\.com%2F(tracks|playlists|users)%2F(\d+)/) || html.match(/api\.soundcloud\.com\/(tracks|playlists|users)\/(\d+)/);
      var title = String(j.title || ''), by = ' by ' + (j.author_name || '');
      if (j.author_name && title.slice(-by.length) === by) title = title.slice(0, -by.length);
      return { type: m ? m[1] : '', id: m ? m[2] : '', title: title, author: j.author_name || '', authorUrl: j.author_url || '', art: j.thumbnail_url || '', url: url };
    });
    embedCache[url] = p;
    p.catch(function () { delete embedCache[url]; });
    return p;
  }
  // a link, ready to show or play: {songs} | {tile} | {artist} | {likes}
  SC.open = function (text) {
    var link = parseLink(text);
    if (!link) return Promise.reject(new Error('that is not a SoundCloud link'));
    return unshorten(link).then(function (l) {
      if (l.kind === 'likes') return { likes: l.url };
      return oembed(l.url).then(function (e) {
        if (e.type === 'tracks') return readSongs(apiUrl('tracks', e.id)).then(function (songs) { return { songs: songs, link: l.url }; });
        if (e.type === 'playlists') return { tile: { id: e.id, kind: 'playlist', n: e.title || 'Playlist', a: e.author, art: e.art, tc: 0, link: l.url, own: false } };
        if (e.type === 'users') return { artist: { id: e.id, n: e.title || e.author || 'Artist', link: l.url, art: e.art } };
        throw new Error('that link is not a song, playlist or artist');
      });
    });
  };

  // ---- "signing in": SoundCloud's player needs none; the profile is optional ----
  SC.ready = function () { return true; };
  SC.signedIn = function () { return true; };
  SC.init = function () { return Promise.resolve(true); };
  SC.signIn = function () { return Promise.resolve(true); };
  SC.signOut = function () {};
  SC.setupSteps = function () { return []; };
  SC.setupFields = function () { return []; };
  SC.setApp = function () { return ''; };
  // the profile whose public likes make up "Likes & Saved"; '' when fine
  SC.setProfile = function (text) {
    text = String(text || '').trim();
    if (!text) { SC.profile = null; SC.user = null; SC.likeIds = null; keep.del('sc.profile'); return ''; }
    var l = parseLink(text);
    if (!l || l.kind === 'short') return 'THAT IS NOT A SOUNDCLOUD PROFILE LINK - it looks like soundcloud.com/yourname';
    var link = 'https://soundcloud.com/' + l.url.split('/')[3];
    SC.profile = { link: link, name: link.split('/')[3] };
    SC.user = { name: SC.profile.name };
    keep.set('sc.profile', SC.profile);
    oembed(link).then(function (e) {
      if (!SC.profile || SC.profile.link !== link) return;
      SC.profile.id = e.id; SC.profile.name = e.title || SC.profile.name; SC.profile.art = e.art;
      SC.user = { name: SC.profile.name };
      keep.set('sc.profile', SC.profile);
    }, function () {});
    return '';
  };

  // ---- the library ----
  function saveLocal() {
    keep.set('sc.saved', SC.saved);
    keep.set('sc.mine', SC.mine);
  }
  function mineTile(p) { return { id: p.id, kind: 'playlist', n: p.n, a: '', art: (p.songs[0] && p.songs[0][5]) || '', tc: p.songs.length, ed: true, own: true }; }
  SC.playlists = function () {
    return Promise.resolve(SC.mine.map(mineTile).concat(SC.saved.sets.map(function (t) { return Object.assign({ ed: false, own: false }, t); })));
  };
  SC.recent = function () { return Promise.resolve(SC.history.map(fromRow)); };
  SC.albums = function () { return Promise.resolve([]); };
  SC.artists = function () {
    return Promise.resolve(SC.saved.artists.slice().sort(function (a, b) { return a.n.localeCompare(b.n); }));
  };
  // Likes (the profile's public likes) and the songs saved here
  SC.songsAll = function (onChunk) {
    var mine = SC.saved.songs.map(fromRow);
    var likes = SC.profile
      ? readSongs(SC.profile.link + '/likes').catch(function (e) { SC.lastError = 'Your likes could not be read: ' + e.message; return []; })
      : Promise.resolve([]);
    return likes.then(function (list) {
      SC.likeIds = {};
      list.forEach(function (s) { SC.likeIds[s.id] = true; });
      var seen = {}, out = [];
      list.concat(mine).forEach(function (s) { if (s && !seen[s.id]) { seen[s.id] = 1; out.push(s); } });
      if (onChunk) onChunk(out);
      return out;
    });
  };
  SC.tracks = function (kind, id, onChunk) {
    var key = kind + ':' + id, p;
    var own = SC.mine.filter(function (x) { return x.id === id; })[0];
    if (own) p = Promise.resolve(own.songs.map(fromRow));
    else p = readSongs(apiUrl('playlists', id));
    return p.then(function (list) { SC.lists[key] = list; if (onChunk) onChunk(list); return list; });
  };
  SC.artist = function (id) {
    return readSongs(apiUrl('users', id)).then(function (songs) { return { songs: songs, albums: [] }; });
  };
  SC.search = function (term) {
    if (parseLink(term)) {
      return SC.open(term).then(function (r) {
        if (r.songs) return { songs: r.songs };
        if (r.tile) return { playlists: [r.tile] };
        if (r.artist) return { artists: [r.artist] };
        return readSongs(r.likes).then(function (songs) { return { songs: songs }; });
      });
    }
    return Promise.resolve({ note: SC.words.searchNote });
  };

  // ---- changing the library (kept here, on this Mac) ----
  SC.inLibrary = function (kind, ids) {
    var out = {};
    if (kind === 'songs') {
      var have = {};
      SC.saved.songs.forEach(function (r) { have[r[0]] = 1; });
      ids.forEach(function (id) { if (have[id] || (SC.likeIds && SC.likeIds[id])) out[id] = true; });
    } else if (kind === 'artists') {
      ids.forEach(function (id) { if (SC.saved.artists.some(function (a) { return a.id === id; })) out[id] = true; });
    } else {
      ids.forEach(function (id) {
        if (SC.saved.sets.some(function (t) { return t.id === id; }) || SC.mine.some(function (p) { return p.id === id; })) out[id] = true;
      });
    }
    return Promise.resolve(out);
  };
  SC.save = function (kind, item) {
    if (kind === 'songs') {
      var s = SC.cache[item.id] || item;
      if (!SC.saved.songs.some(function (r) { return r[0] === s.id; })) SC.saved.songs.push(rowOf(s));
    } else if (kind === 'artists') {
      if (!SC.saved.artists.some(function (a) { return a.id === String(item.id); }))
        SC.saved.artists.push({ id: String(item.id), n: item.n || item.name || 'Artist', link: item.link || '', art: item.art || '' });
    } else if (!SC.saved.sets.some(function (t) { return t.id === String(item.id); })) {
      SC.saved.sets.push({ id: String(item.id), kind: 'playlist', n: item.n || item.name || 'Playlist', a: item.a || item.artist || '',
                           art: item.art || '', tc: item.tc || 0, link: item.link || '' });
    }
    saveLocal();
    return Promise.resolve(true);
  };
  SC.addToPlaylist = function (pl, s) {
    var p = SC.mine.filter(function (x) { return x.id === pl.id; })[0];
    if (!p) return Promise.reject(new Error('only playlists made here can be changed here'));
    p.songs.push(rowOf(s));
    saveLocal();
    return Promise.resolve(true);
  };
  SC.newPlaylist = function (name, s) {
    var p = { id: 'my-' + A.rand(10).replace(/[^\w]/g, 'x'), n: name, songs: s ? [rowOf(s)] : [] };
    SC.mine.push(p);
    saveLocal();
    return Promise.resolve(mineTile(p));
  };
  function remember(s) {                 // History
    SC.history = [rowOf(s)].concat(SC.history.filter(function (r) { return r[0] !== s.id; })).slice(0, 100);
    keep.set('sc.history', SC.history);
  }

  // ---- the SoundCloud window (BROWSE SOUNDCLOUD) ----
  // An ordinary browser window on soundcloud.com, for searching and looking
  // around. The player only follows which page is open in it (its address and
  // title), so that page can be played or saved here.
  var browseWin = null;
  SC.browse = function (term) {
    var url = term ? 'https://soundcloud.com/search?q=' + encodeURIComponent(term) : 'https://soundcloud.com/discover';
    if (browseWin !== null) {
      return chrome.windows.get(browseWin, { populate: true }).then(function (w) {
        var tab = w.tabs && w.tabs.filter(function (t) { return t.active; })[0];
        if (term && tab) chrome.tabs.update(tab.id, { url: url });
        var o = { focused: true };
        if (w.state === 'minimized') o.state = 'normal';
        return chrome.windows.update(browseWin, o);
      }).catch(function () { browseWin = null; return SC.browse(term); });
    }
    var w = 960, h = Math.min(980, screen.availHeight || 900);
    var left = Math.max(screen.availLeft || 0, (screen.availLeft || 0) + (screen.availWidth || 1400) - w - 20);
    return chrome.windows.create({ url: url, type: 'normal', width: w, height: h, left: left, top: screen.availTop || 0, focused: true })
      .then(function (win) { browseWin = win.id; });
  };
  function browseNote(tab) {
    if (!tab || browseWin === null || tab.windowId !== browseWin || !tab.active) return;
    var l = parseLink(tab.url || '');
    var title = String(tab.title || '').replace(/\s*\|\s*[^|]*SoundCloud[^|]*$/i, '').replace(/^Stream\s+/i, '').trim();
    var now = l && l.kind !== 'short' ? { link: l, title: title || l.url, url: tab.url } : null;
    var was = SC.browsing;
    if ((was && now && was.link.url === now.link.url && was.title === now.title) || (!was && !now)) return;
    SC.browsing = now;
    SC.browseFns.forEach(function (fn) { try { fn(now); } catch (e) {} });
  }
  SC.onBrowse = function (fn) { SC.browseFns.push(fn); };
  SC.browseOpen = function () { return browseWin !== null; };
  if (window.chrome && chrome.tabs) {
    chrome.tabs.onUpdated.addListener(function (id, info, tab) { if (info.url || info.title || info.status === 'complete') browseNote(tab); });
    chrome.tabs.onActivated.addListener(function (a) {
      if (a.windowId !== browseWin) return;
      chrome.tabs.get(a.tabId).then(browseNote, function () {});
    });
    chrome.windows.onRemoved.addListener(function (id) {
      if (id !== browseWin) return;
      browseWin = null;
      SC.browsing = null;
      SC.browseFns.forEach(function (fn) { try { fn(null); } catch (e) {} });
    });
  }

  // ---- the sound ----
  var player = null;           // {w, frame}
  var cur = { pos: 0, at: 0, dur: 0, playing: false, tok: 0, song: null, loading: false };
  function onPlayerEvent(name, e) {
    var eng = SC.engine, E = window.SC.Widget.Events;
    if (!eng) return;
    if (name === E.PLAY_PROGRESS) {
      // (the position only: the player also reports it once more after pausing)
      cur.pos = (e && e.currentPosition) || 0;
      cur.at = performance.now();
      if (e && e.relativePosition > 0.01 && cur.pos > 0) cur.dur = cur.pos / e.relativePosition;
      if (cur.loading && cur.pos > 0) { cur.loading = false; cur.playing = true; eng.backendState('playing'); }
    } else if (name === E.PLAY) {
      cur.loading = false;
      cur.playing = true;
      cur.at = performance.now();
      eng.backendState('playing');
      if (cur.song && cur.song !== cur.told) { cur.told = cur.song; remember(cur.song); }
    } else if (name === E.PAUSE) {
      if (cur.loading) return;
      cur.pos = (e && e.currentPosition) || cur.pos;
      cur.playing = false;
      if (eng.st === 2) eng.backendState('paused');
    } else if (name === E.FINISH) {
      cur.playing = false;
      cur.pos = cur.dur;
      eng.backendEnded();
    } else if (name === E.ERROR) {
      cur.playing = false;
      cur.loading = false;
      var song = cur.song;
      eng.backendError(new Error('SoundCloud could not play this song - skipping it'));
      setTimeout(function () { if (eng.loaded && eng.loaded.song === song) eng.skipToNextItem(); }, 1500);
    }
  }
  function startPlayer(url) {
    return new Promise(function (resolve) {
      var f = frame('mp-sc-player', url), w = window.SC.Widget(f), E = window.SC.Widget.Events;
      player = { w: w, frame: f };
      [E.PLAY, E.PAUSE, E.FINISH, E.PLAY_PROGRESS, E.ERROR].forEach(function (name) {
        w.bind(name, function (e) { onPlayerEvent(name, e); });
      });
      w.bind(E.READY, function () { resolve(w); });
    });
  }
  var backend = {
    drivesList: false,
    kbps: 0,
    load: function (items, i) {
      var it = items[i], s = it && it.song;
      if (!s) return Promise.reject(new Error('nothing to play'));
      var tok = ++cur.tok, url = apiUrl('tracks', s.id);
      cur.song = s; cur.pos = 0; cur.dur = (s.d || 0) * 1000; cur.playing = false; cur.loading = true; cur.at = performance.now();
      var vol = Math.round((SC.engine ? SC.engine.vol : 0.8) * 100);
      if (!player) {
        return startPlayer(url).then(function (w) {
          if (tok !== cur.tok) return;
          w.setVolume(vol);
          w.play();
        });
      }
      return new Promise(function (resolve) {
        player.w.load(url, Object.assign({}, OPTS, {
          auto_play: true,
          callback: function () {
            if (tok === cur.tok) { player.w.setVolume(vol); player.w.play(); }
            resolve();
          }
        }));
      });
    },
    play: function () { if (player) player.w.play(); },
    pause: function () { if (player) { cur.pos = backend.time() * 1000; cur.playing = false; player.w.pause(); } },
    seek: function (sec) {
      if (!player) return;
      cur.pos = sec * 1000;
      cur.at = performance.now();
      player.w.seekTo(Math.round(sec * 1000));
    },
    setVolume: function (v) { if (player) player.w.setVolume(Math.round(v * 100)); keep.set('soundcloud.vol', v); },
    time: function () {
      var p = cur.pos + (cur.playing ? performance.now() - cur.at : 0);
      return Math.max(0, cur.dur ? Math.min(p, cur.dur) : p) / 1000;
    },
    duration: function () { return cur.dur / 1000; }
  };

  SC.engine = new window.MPEngine({
    service: SC, backend: backend,
    resolve: function (opts) { return U.queueFrom(SC, opts, 200); }
  });
  SC.engine.vol = keep.get('soundcloud.vol', 0.8);

  window.MPServices = window.MPServices || {};
  window.MPServices.soundcloud = SC;
})();
