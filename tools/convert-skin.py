# Stream Player - makes extension/player.js from the Apple Music player's skin.
#
# Stream Player's interface is the skin of Winapp Apple Music Skin
# (https://github.com/P4NZY/Winapp-apple-music-skin, app/ui/player.js), turned
# from a skin for music.apple.com into a player for Spotify and SoundCloud. This
# script does that turning, one exact replacement at a time, so improvements to
# the skin (new visualizer effects, say) come across by running it again:
#
#     python3 tools/convert-skin.py <Winapp-apple-music-skin>/app/ui/player.js extension/player.js
#
# It also copies the skin's player.css (next to its player.js) as it is: the
# styles of Stream Player's own are in extension/stream.css.
#
# Change Stream Player's player.js here (in this script), not in player.js
# itself: the next run would undo it. Every replacement has to match exactly
# as often as stated; when the skin has changed in one of those places, the
# script stops and says which, and that replacement needs bringing up to date.
import re, sys

src, dst = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()


def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        raise SystemExit('expected %d, found %d: %r' % (count, n, old[:120]))
    s = s.replace(old, new)


def rex(pattern, new, count=1):
    global s
    found = re.findall(pattern, s, flags=re.S)
    if len(found) != count:
        raise SystemExit('regex expected %d, found %d: %r' % (count, len(found), pattern[:120]))
    s = re.sub(pattern, lambda m: new, s, flags=re.S)


# ---------------------------------------------------------------- header ----
rex(r'\A// =+\n// Music Player skin - logic\n.*?window\.__mpLoaded = true;\n', r'''// ============================================================================
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
''')

# Apple's sidebar readings: gone with Apple's pages
rex(r"// Japanese readings shown beside Apple's sidebar entries \(matched by label\)\.\nvar JP_NAV = \{.*?\n\};\n", '')

rep("""// What the page talks to: the Windows app (MusicPlayer.exe, through WebView2),
// or on a Mac the browser extension's bridge (Music Player for Mac\\extension).
// Both take the same "verb|arg" messages; whatever one cannot do, it ignores.""",
"""// What the page talks to: host.js, the bridge to the browser (on the PC this
// was MusicPlayer.exe). It takes "verb|arg" messages; what it cannot do, it
// ignores.""")

rep("""  mode: 'full',         // full | compact | apple""", """  mode: 'full',         // full | compact""")
rep("""  music: null,          // the page's MusicKit instance""", """  music: null,          // the player of the service the switch is set to""")

# -------------------------------------------------------------- services ----
rep("""// ------------------------------------------------------ playback (MusicKit) --
function MK() { return window.MusicKit || null; }""",
"""// ------------------------------------------------------------- services ----
// The two services (services/spotify.js, services/soundcloud.js) each bring a
// player of the shape Apple's had (services/engine.js) and their library (see
// "Library data"). SVC is the one the switch at the top is set to, S.music its
// player. Each keeps its own library, queue and song playing.
var SVCS = window.MPServices || {};
var SVC_IDS = ['spotify', 'soundcloud'].filter(function (k) { return !!SVCS[k]; });
var SVC = SVCS[store.get('service', SVC_IDS[0])] || SVCS[SVC_IDS[0]];

// -------------------------------------------------------------- playback ----
function MK() { return window.MPKit || null; }""")
rep("""  try { return !!(S.music && S.music.isAuthorized); } catch (e) { return false; }""",
"""  try { return !!(SVC && SVC.signedIn()); } catch (e) { return false; }""")

rep("""// Artwork addresses come as templates with {w}x{h} in them.
function artUrl(tpl, px) {
  if (!tpl) return '';
  var s = Math.round(px * Math.min(2, window.devicePixelRatio || 1));
  return tpl.replace('{w}', s).replace('{h}', s).replace('{f}', 'jpg').replace('{c}', 'bb');
}""",
"""// Artwork in a size that suits px CSS pixels. Spotify's comes as a few
// addresses, biggest first ("big medium small": about 640 / 300 / 64 pixels);
// SoundCloud's is one address with the size in its name (...-large.jpg).
function artUrl(tpl, px) {
  if (!tpl) return '';
  var s = Math.round(px * Math.min(2, window.devicePixelRatio || 1));
  if (tpl.indexOf(' ') > 0) {
    var list = tpl.split(' ');
    return list[s <= 64 ? list.length - 1 : s <= 300 ? Math.min(1, list.length - 1) : 0] || list[0];
  }
  var sc = /-(large|t\\d+x\\d+|crop|original|small|tiny|badge|mini)\\.(jpg|jpeg|png)$/;
  if (/sndcdn\\.com\\//.test(tpl) && sc.test(tpl))
    return tpl.replace(sc, '-' + (s <= 67 ? 't67x67' : s <= 100 ? 'large' : s <= 300 ? 't300x300' : 't500x500') + '.$2');
  return tpl.replace('{w}', s).replace('{h}', s).replace('{f}', 'jpg').replace('{c}', 'bb');
}""")

rex(r"function hookMusic\(\) \{\n  var tries = 0;.*?\n  document\.addEventListener\('musickitconfigured', attempt\);\n\}\n",
"""// Listen to both services' players (only the one the switch is set to is
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
""")
rep("""function bindMusic(m) {
  if (S.music === m) return;
  S.music = m;
  function on(ev, fn) { try { m.addEventListener(ev, fn); } catch (e) {} }""",
"""function bindMusic(m) {
  if (!m || m.__mpBound) return;
  m.__mpBound = true;
  // (what the other service's player says is not drawn)
  function on(ev, fn) { try { m.addEventListener(ev, function (a) { if (S.music === m) fn(a); }); } catch (e) {} }""")
rep("""  on('authorizationStatusDidChange', function () { setTimeout(onAuthChange, 300); });
  onState();
  refreshAll();
  onAuthChange();
  rcBoot();
}""", """  on('authorizationStatusDidChange', function () { setTimeout(onAuthChange, 300); });
}""")

rex(r"// Apple shows playback failures in a dialog on its own page, which is not\n// drawn in our faces - so say it here, and try to get the music back\.\nfunction onPlaybackError\(e\) \{\n.*?\n\}\n",
"""// Playback failures, said on the song line. (The Apple Music player also
// tries to get the music back by itself after one - made for the ways Apple's
// player fails. Here each service looks after its own: SoundCloud skips a
// song that will not play, and Spotify's failures are about the account or
// the device, which trying again would not mend. So this only says so.)
function onPlaybackError(e) {
  var what = errText(e);
  dlog('playback error: ' + what);
  notice('PLAYBACK ERROR: ' + what);
}
""")
rex(r"function rcWatch\(\) \{\n.*?\n\}\n", """function rcWatch() {}                   // (no getting the music back by itself: see onPlaybackError)
""")

# ----------------------------------------------------------------- sound ----
rep("""// The app (MusicPlayer.exe) listens to its own sound output and, for as long
// as the page keeps asking ("tap|1"), sends the newest stretch about 60 times
// a second:""",
"""// The browser extension listens to what this window plays (background.js,
// offscreen.js) and, for as long as the page keeps asking ("tap|1"), sends the
// newest stretch about 60 times a second:""")
rep("""// When no sound arrives while a song is playing (an older MusicPlayer.exe,
// Windows before 10 version 2004, volume at zero) a built-in tune stands in so
// the displays keep moving. AU.mode says which it is: live | demo | idle.""",
"""// When no sound arrives while a song is playing (the browser would not let
// the extension listen, volume at zero) a built-in tune stands in so the
// displays keep moving. AU.mode says which it is: live | demo | idle.""")

rep("""// Mac: the visualizer hears the music once the extension has been invoked on
// the tab (its button in the toolbar; see background.js). Until then it says
// so on the picture, over the built-in tune.""",
"""// When the extension cannot listen, the picture says so, over the built-in tune.""")
rep("""    if (ts === 'click') why = 'DEMO BEAT - to make it follow your music, click the Music Player button in the browser toolbar ' +
      '(puzzle-piece menu if not pinned) while Apple Music is the tab in front. Once per visit.';
    else if (ts === 'busy') why = 'DEMO BEAT - it is listening to Apple Music in another tab; only one tab can be heard at a time.';
    else if (ts.lastIndexOf('failed', 0) === 0) why = 'DEMO BEAT - listening to the music did not work (' + ts.slice(7) + '). ' +
      'Click the Music Player button in the browser toolbar to try again.';""",
"""    if (ts === 'click') why = 'DEMO BEAT - the browser did not let the player hear its own sound. ' +
      'Open the player from the Stream Player app (it starts the browser so that it may), or click the Stream Player button in the toolbar.';
    else if (ts === 'busy') why = 'DEMO BEAT - it is listening to another window; only one can be heard at a time.';
    else if (ts.lastIndexOf('failed', 0) === 0) why = 'DEMO BEAT - listening to the music did not work (' + ts.slice(7) + '). It tries again by itself.';""")
rep("""title: 'Hide this until Apple Music is opened again', text: 'OK' }));""",
"""title: 'Hide this until the player is opened again', text: 'OK' }));""")

# ---------------------------------------------------------------- lyrics ----
rep("""// Lyrics
// Apple's own lyrics for the song that is playing, fetched the way Apple's
// page does. Most come timed line by line, many word by word; Japanese (and
// other non-Latin) songs can also carry a romanised reading and an English
// translation.""",
"""// Lyrics
// The lyrics of the song that is playing, from LRCLIB (see lyrics.js): most
// come timed line by line, so they follow the song; some are plain text.""")
rex(r"// ---- a precise clock for the current song ----\n.*?\nfunction songTime\(\) \{\n.*?\n\}\n",
"""// ---- the clock for the current song ----
// Both services' players know the position to the millisecond, so the
// lyrics follow it directly.
var CK = { have: true, lastT: -1 };
function clockSample() {}
function songTime() {
  var t = 0;
  try { t = (S.music && S.music.currentPlaybackTime) || 0; } catch (x) {}
  return t;
}
""")
rex(r"// Apple sends lyrics as TTML \(an XML subtitle format\)\.\nfunction parseTtml\(xml\) \{.*?\n\}\n\nfunction lyFetch\(cid\) \{.*?\n\}\n",
"""// Lyrics as lyrics.js finds them, in the shape the panel draws: a row of
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
""")
rep("""  if (!force && LY.key === info.id && LY.state !== 'idle') return;
  LY.key = info.id;
  LY.token++;
  if (!authorized()) { LY.state = 'none'; lyMsg('SIGN IN TO SEE LYRICS', 'Lyrics come with an Apple Music subscription.'); return; }
  var cid = info.cid || (/^\\d+$/.test(info.id) ? info.id : ''), has = null;
  try { has = it.attributes.hasLyrics; } catch (e) {}
  if (!cid || has === false) { lyNone(); return; }
  if (LY.cache[cid] !== undefined) { if (LY.cache[cid]) lyShow(LY.cache[cid]); else lyNone(); return; }

  LY.state = 'loading';
  lyMsg('LOADING LYRICS', '読込中');
  var tok = LY.token;
  lyFetch(cid).then(function (data) {""",
"""  var cid = SVC.id + ':' + info.id;           // (lyrics are kept by service and song)
  if (!force && LY.key === cid && LY.state !== 'idle') return;
  LY.key = cid;
  LY.token++;
  if (LY.cache[cid] !== undefined) { if (LY.cache[cid]) lyShow(LY.cache[cid]); else lyNone(); return; }

  LY.state = 'loading';
  lyMsg('LOADING LYRICS', '読込中');
  var tok = LY.token;
  lyFetch(info).then(function (data) {""")
rep("""  if (data.writers.length) frag.appendChild(h('div', { class: 'mpl-credit', text: 'Written by ' + data.writers.join(', ') }));""",
"""  if (data.writers.length) frag.appendChild(h('div', { class: 'mpl-credit', text: 'Written by ' + data.writers.join(', ') }));
  if (data.credit) frag.appendChild(h('div', { class: 'mpl-credit', text: data.credit }));""")

# ---------------------------------------------------------- library data ----
rex(r"// Library data\. Everything comes from the page's MusicKit instance\n.*?(?=// =+\n// Browser \(the big display in the full face\))",
"""// Library data. Everything comes from the service the switch is set to (SVC,
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

""")

# ---------------------------------------------------------------- browser ----
rep("""function openTile(t) {
  if (!t) return;
  go({ kind: t.kind, id: t.id, name: t.n, artist: t.a, art: t.art });
}""", """function openTile(t) {
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
}""")

rep("""  setHead({ title: 'Recently Added', jp: '最近追加', meta: DB.recent ? DB.recent.length + ' items' : 'loading...', hideActions: true });""",
"""  setHead({ title: navWord('recent').label, jp: navWord('recent').jp, meta: DB.recent ? DB.recent.length + ' items' : 'loading...', hideActions: true });""")
rep("""    setHead({ title: 'Songs', jp: '曲', canPlay: total > 0,""", """    setHead({ title: navWord('songs').label, jp: navWord('songs').jp, canPlay: total > 0,""")
rep("""    setHead({ title: 'Albums', jp: 'アルバム', meta: list.length + ' albums' + (done ? '' : '  (loading)'), hideActions: true });""",
"""    setHead({ title: navWord('albums').label, jp: navWord('albums').jp, meta: list.length + ' albums' + (done ? '' : '  (loading)'), hideActions: true });""")
rep("""  if (DB.albums) draw(DB.albums, true); else { setHead({ title: 'Albums', jp: 'アルバム', meta: 'loading...', hideActions: true }); showMsg('LOADING', '読込中'); }""",
"""  if (DB.albums) draw(DB.albums, true); else { setHead({ title: navWord('albums').label, jp: navWord('albums').jp, meta: 'loading...', hideActions: true }); showMsg('LOADING', '読込中'); }""")
rep("""    setHead({ title: 'Artists', jp: 'アーティスト', meta: list.length + ' artists' + (done ? '' : '  (loading)'), hideActions: true });""",
"""    setHead({ title: navWord('artists').label, jp: navWord('artists').jp, meta: list.length + ' artists' + (done ? '' : '  (loading)'), hideActions: true });""")
rep("""  if (DB.artists) draw(DB.artists, true); else { setHead({ title: 'Artists', jp: 'アーティスト', meta: 'loading...', hideActions: true }); showMsg('LOADING', '読込中'); }""",
"""  if (DB.artists) draw(DB.artists, true); else { setHead({ title: navWord('artists').label, jp: navWord('artists').jp, meta: 'loading...', hideActions: true }); showMsg('LOADING', '読込中'); }""")

rex(r"function viewArtist\(v, tok\) \{\n.*?\n\}\n(?=\n// a playlist or an album)",
"""// An artist: their songs (on SoundCloud, what they put up) and their albums,
// singles and playlists.
function viewArtist(v, tok) {
  setHead({ title: v.name, jp: 'アーティスト', meta: 'loading...', hideActions: true });
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
  setHead({ title: v.name, jp: 'アーティスト', meta: parts.join('  ·  ') || 'nothing here', canPlay: songs.length > 0, hideActions: !songs.length });
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
""")

rep("""  var fromApple = !isLibId(v.kind, v.id);
  // one of Apple's albums or playlists: is it in the library already? (for the ADD key)""",
"""  var fromApple = !isLibId(v.kind, v.id);
  // an album, or someone else's playlist: is it in the library already? (for the ADD key)""")
rep("""    .catch(function (e) {
      if (tok !== B.token) return;
      // an empty library playlist answers "not found"
      if (isPl) draw([], true); else showMsg('COULD NOT LOAD', errText(e));
    });
}""", """    .catch(function (e) {
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
}""")

rex(r"function viewSearch\(v, tok\) \{\n.*?\n\}\n\nfunction viewSignIn\(\) \{\n.*?\n\}\n",
"""// Search: the library on hand (searched here), then the service's catalogue.
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
    fetchRowFlags(catSongs);            // which of the service's songs are saved already
  });
}

// ---- signing in, and each service's own settings ----
function acctLine(text, cls) { return h('div', { class: cls || 'mpb-acct-line', text: text }); }
function viewAccount() {
  var svc = SVC, signed = svc.signedIn(), u = svc.user;
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
      textKey('signin', 'SIGN IN', 'サインイン', 'Sign in on ' + svc.name + '\\'s own page', I.go),
      svc.setupFields().length ? textKey('setupagain', 'CHANGE APP DETAILS', null, 'Enter the app details again') : null));
  }
  if (svc.lastError) box.appendChild(acctLine(svc.lastError, 'mpb-acct-err'));
  ui.bBody.appendChild(box);
}
""")

rex(r"  if \(!S\.music\) \{\n    setHead\(\{ title: 'Music Player', jp: 'ミュージックプレーヤー', meta: '', hideActions: true \}\);\n    showMsg\('STARTING UP', '起動中'\);\n    return;\n  \}\n  if \(v\.kind === 'search'\) \{ viewSearch\(v, tok\); return; \}\n.*?if \(!authorized\(\) && !fromCatalog\) \{ viewSignIn\(\); return; \}\n",
"""  if (!S.music) {
    setHead({ title: 'Stream Player', jp: 'ストリームプレーヤー', meta: '', hideActions: true });
    showMsg('STARTING UP', '起動中');
    return;
  }
  // everything needs the service signed in; until then, the way to it
  if (v.kind === 'account' || !authorized()) { viewAccount(tok); return; }
  if (v.kind === 'search') { viewSearch(v, tok); return; }
""")

# ---- nav ----
rep("""function renderNavPlaylists() {""", """// the library entries the service has (Liked Songs, Albums ...)
function renderNavList() {
  if (!ui.navList) return;
  ui.navList.replaceChildren.apply(ui.navList, (SVC.nav || []).map(function (n) {
    return navItem(n.go, I[n.icon] || I.list, n.label, n.jp);
  }));
  syncNav();
}
function renderNavPlaylists() {""")
rep("""  if (ui.navPlReset) ui.navPlReset.hidden = !list.length || !store.get('plOrder', null);""",
"""  if (ui.navPlReset) ui.navPlReset.hidden = !list.length || !store.get(plKey(), null);""")
rep("""// ---- the listener's own order for the playlists ----
// Apple Music has no order of its own for playlists, so the one dragged into
// shape here is kept on this computer. Playlists it does not know yet (new
// ones) go at the end, in Apple's order; deleted ones simply drop out.
function orderedPlaylists() {
  var list = (DB.playlists || []).slice(), order = store.get('plOrder', null);""",
"""// ---- the listener's own order for the playlists ----
// The order dragged into shape here is kept on this computer (one for each
// service). Playlists it does not know yet (new ones) go at the end, in the
// service's order; deleted ones simply drop out.
function plKey() { return 'plOrder.' + SVC.id; }
function orderedPlaylists() {
  var list = (DB.playlists || []).slice(), order = store.get(plKey(), null);""")
rep("""function savePlaylistOrder(ids) {
  store.set('plOrder', ids);""", """function savePlaylistOrder(ids) {
  store.set(plKey(), ids);""")
rep("""    go({ kind: 'playlist', id: id, name: pl ? pl.n : 'Playlist', art: pl ? pl.art : '' });""",
"""    go({ kind: 'playlist', id: id, name: pl ? pl.n : 'Playlist', art: pl ? pl.art : '', artist: pl ? pl.a : '', tc: pl ? pl.tc : 0 });""")

# ---------------------------------------------------- changing the library ----
rex(r"// Changing the library: add a song \(or a whole album / playlist\) to the\n.*?\n// After a change: bring the lists on screen",
"""// Changing the library: save a song (Spotify: to Liked Songs; SoundCloud: a
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
  ids = ids.map(String).filter(function (id) { return /^[\\w.:\\-]+$/.test(id); });
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

// After a change: bring the lists on screen""")

rep("""  if (!authorized()) { notice('SIGN IN TO ADD SONGS TO YOUR LIBRARY'); return; }
  s.adding = true;
  syncRowFlags();
  notice('ADDING TO YOUR LIBRARY: ' + s.n, true);
  dlog('library add: ' + catalogIdOf(s));
  addToLibrary('songs', catalogIdOf(s)).then(function (libId) {
    s.adding = false;
    s.lib = true;
    if (typeof libId === 'string') s.libId = libId;
    dlog('library add ' + (libId ? 'confirmed' : 'sent, not confirmed'));
    notice(libId ? 'ADDED TO YOUR LIBRARY: ' + s.n + '   (it shows up on your other devices too)'
                 : 'SENT TO YOUR LIBRARY: ' + s.n + '   (Apple has not shown it in the library yet)', true);""",
"""  if (!authorized()) { notice('SIGN IN TO SAVE SONGS'); return; }
  s.adding = true;
  syncRowFlags();
  notice(SVC.words.savingSong + ': ' + s.n, true);
  dlog('library add: ' + catalogIdOf(s));
  addToLibrary('songs', s).then(function () {
    s.adding = false;
    s.lib = true;
    dlog('library add confirmed');
    notice(SVC.words.savedSong + ': ' + s.n + '   (it shows up in ' + SVC.name + '\\'s own apps too)', true);""")
rep("""    notice('COULD NOT ADD TO YOUR LIBRARY: ' + errText(e));
    syncRowFlags();""", """    notice('COULD NOT SAVE IT: ' + errText(e));
    syncRowFlags();""")
rep("""    notice(seen ? 'ADDED TO ' + pl.n + ': ' + s.n : 'SENT TO ' + pl.n + ': ' + s.n + '   (Apple has not shown it in the playlist yet)', true);
    if (!isLibrarySong(s)) { s.lib = true; syncRowFlags(); libraryChanged(); }   // a catalogue song joins the library with it
    playlistChanged(pl.id);""",
"""    notice('ADDED TO ' + pl.n + ': ' + s.n, true);
    playlistChanged(pl.id);""")
rep("""    notice('MADE PLAYLIST ' + name + ' WITH ' + s.n, true);
    if (!isLibrarySong(s)) { s.lib = true; syncRowFlags(); libraryChanged(); }
    setTimeout""", """    notice('MADE PLAYLIST ' + name + ' WITH ' + s.n, true);
    setTimeout""")
rep("""// A whole album or playlist of Apple's, from its page (the ADD key).
function doAddCollection(v) {
  if (!v || v.adding || v.lib) return;
  if (!authorized()) { notice('SIGN IN TO ADD TO YOUR LIBRARY'); return; }
  var kind = v.kind === 'playlist' ? 'playlists' : 'albums';
  v.adding = true;
  syncAddKey();
  notice('ADDING TO YOUR LIBRARY: ' + v.name, true);
  addToLibrary(kind, v.id).then(function (libId) {
    v.adding = false;
    v.lib = true;
    notice(libId ? 'ADDED TO YOUR LIBRARY: ' + v.name + '   (it shows up on your other devices too)'
                 : 'SENT TO YOUR LIBRARY: ' + v.name + '   (Apple has not shown it in the library yet)', true);""",
"""// A whole album, or someone else's playlist, from its page (the ADD key).
function doAddCollection(v) {
  if (!v || v.adding || v.lib) return;
  if (!authorized()) { notice('SIGN IN TO SAVE TO YOUR LIBRARY'); return; }
  var kind = v.kind === 'playlist' ? 'playlists' : 'albums';
  v.adding = true;
  syncAddKey();
  notice('SAVING TO YOUR LIBRARY: ' + v.name, true);
  addToLibrary(kind, v).then(function () {
    v.adding = false;
    v.lib = true;
    notice('SAVED TO YOUR LIBRARY: ' + v.name + '   (it shows up in ' + SVC.name + '\\'s own apps too)', true);""")
rep("""    notice('COULD NOT ADD TO YOUR LIBRARY: ' + errText(e));
    syncAddKey();""", """    notice('COULD NOT SAVE IT: ' + errText(e));
    syncAddKey();""")
rep("""// the ADD key in the browser's head: only on Apple's own albums and playlists""",
"""// the ADD key in the browser's head: on albums and other people's playlists""")
rep("""  ui.bAddLabel.textContent = v.lib ? 'IN LIBRARY' : v.adding ? 'ADDING' : 'ADD';""",
"""  ui.bAddLabel.textContent = v.lib ? SVC.words.saved : v.adding ? 'SAVING' : SVC.words.addKey;""")
rep("""// Lamps on the rows: which of Apple's songs on screen are in the library.""",
"""// Lamps on the rows: which of the songs on screen are saved.""")

# ---- the song menu ----
rep("""    if (have) kids.push(menuKey('', I.check, 'In your library', 'ライブラリにあります', true));
    else kids.push(menuKey('lib', I.plus, signedIn ? (s.adding ? 'Adding to library' : 'Add to library') : 'Sign in to add to library', 'ライブラリに追加', !signedIn || !!s.adding || !catalogIdOf(s)));""",
"""    if (have) kids.push(menuKey('', I.check, SVC.words.inLib, 'ライブラリにあります', true));
    else kids.push(menuKey('lib', I.plus, signedIn ? (s.adding ? SVC.words.adding : SVC.words.addSong) : 'Sign in to save songs', 'ライブラリに追加', !signedIn || !!s.adding || !catalogIdOf(s)));""")
rep("""  // Apple's song, not known yet whether it is in the library: find out""",
"""  // not known yet whether the song is saved: find out""")

# ---------------------------------------------------------------- float ----
rep("""  doc.title = 'Music Player';""", """  doc.title = 'Stream Player';""")
rep("""// Apple's page re-renders itself: keep our pieces in it (or in the floating window).""",
"""// Keep our pieces in the page (or in the floating window).""")

# --------------------------------------------------------------- actions ----
rep("""  apple: function () { setMode('apple'); },""",
"""  account: function () { if (S.mode !== 'full') setMode('full'); if (ui.search) ui.search.value = ''; go({ kind: 'account' }); },
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
  setupagain: function () { if (SVC.forgetApp) SVC.forgetApp(); renderView(); },
  connect: function () {
    var vals = {}, inputs = ui.bBody.querySelectorAll('[data-field]');
    for (var i = 0; i < inputs.length; i++) vals[inputs[i].getAttribute('data-field')] = inputs[i].value.trim();
    var bad = SVC.setApp(vals);
    if (bad) { notice(bad); return; }
    renderView();
    ACT.signin();
  },""")
rep("""  plreset: function () { store.del('plOrder'); renderNavPlaylists(); notice('PLAYLISTS BACK IN APPLE MUSIC\\'S ORDER', true); },""",
"""  plreset: function () { store.del(plKey()); renderNavPlaylists(); notice('PLAYLISTS BACK IN ' + SVC.label + '\\'S ORDER', true); },""")
rep("""function onActClick(e) {
  var b = e.target.closest && e.target.closest('[data-act]');
  if (!b) return;
  // after a mouse click, drop focus so Space keeps meaning play / pause
  if (e.detail > 0 && typeof b.blur === 'function') b.blur();
  var fn = ACT[b.getAttribute('data-act')];
  if (fn) fn();
}""", """function onActClick(e) {
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
  B.view = back ? back.view : { kind: 'recent' };
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
}""")

rep("""  if (mode !== 'full' && mode !== 'compact' && mode !== 'apple') return;""",
"""  if (mode !== 'full' && mode !== 'compact') return;""")
rep("""  if (mode === 'apple') {
    send('tap|0');
    bgvSync();
    watchApple(true);
    // Apple's page was not being drawn; let it measure itself again
    setTimeout(function () { placeControls(); try { window.dispatchEvent(new Event('resize')); } catch (e) {} }, 60);
    return;
  }
  watchApple(false);
""", "")

# --------------------------------------------------------------- build UI ----
rep("""  ui.search = h('input', { type: 'search', placeholder: 'Search  検索', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Search your library and Apple Music' });""",
"""  ui.search = h('input', { type: 'search', placeholder: 'Search  検索', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Search your library and ' + SVC.name });""")
rep("""    h('span', { class: 'mpc-brand', text: 'MUSIC PLAYER' }),
    jp('ミュージックプレーヤー', 'mpc-brand-jp'),                       // "music player"
    h('span', { class: 'mp-grip' }),
    h('label', { class: 'mpa-search only-full' }, svg(I.search), ui.search),""",
"""    h('span', { class: 'mpc-brand', text: 'STREAM PLAYER' }),
    jp('ストリームプレーヤー', 'mpc-brand-jp'),                       // "stream player"
    ui.svcSwitch = buildSwitch(),
    h('span', { class: 'mp-grip' }),
    h('label', { class: 'mpa-search only-full' }, svg(I.search), ui.search),""")
rep("""    h('div', { class: 'mpa-nav-list' },
      navItem('recent', I.recent, 'Recently Added', '最近追加'),
      navItem('songs', I.note, 'Songs', '曲'),
      navItem('albums', I.disc, 'Albums', 'アルバム'),
      navItem('artists', I.person, 'Artists', 'アーティスト')),""",
"""    ui.navList = h('div', { class: 'mpa-nav-list' }),""")
rep("""        title: 'Back to Apple Music\\'s order', text: 'RESET' })),""",
"""        title: 'Back to the service\\'s own order', text: 'RESET' })),""")
rep("""      labelKey('apple', I.go, 'APPLE', 'ブラウズ', 'Apple Music pages: browse, radio, account', false)));""",
"""      labelKey('account', I.person, 'ACCOUNT', 'アカウント', 'Signing in, and this service\\'s settings', false)));""")
rep("""  // on Apple's own albums and playlists: add the whole thing to the library""",
"""  // on albums and other people's playlists: save the whole thing to the library""")
rep("""    title: 'Add this to your library (it shows up on your other devices too)' }, svg(I.plus), ui.bAddLabel, jp('追加'));""",
"""    title: 'Save this to your library (it shows up in the service\\'s own apps too)' }, svg(I.plus), ui.bAddLabel, jp('追加'));""")
rep("""  ui.app = root;
  syncPanels();
  return root;
}""", """  ui.app = root;
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
}""")

rex(r"// Keys shown in Apple's sidebar while its pages are on screen\.\nfunction sideButtons\(\) \{.*?\n\}\n\n// Brand plate for the top of Apple's sidebar\.\nfunction buildBrand\(\) \{.*?\n\}\n\n// The ring \+ watermark drawn around Apple's content area\.\nfunction buildFrame\(\) \{.*?\n\}\n\n", '')
rep("""  // pieces that live inside Apple's sidebar (apple face)
  ui.brand = buildBrand();
  var sb = sideButtons();
  ui.side = h('div', { class: 'mp-side mp-ui' }, sb[0], sb[1]);
  ui.side.addEventListener('click', onActClick);
  var fb = sideButtons();
  ui.fab = h('div', { id: 'mp-fab', class: 'mp-ui', 'data-show': '0' }, fb[0], fb[1]);
  ui.fab.addEventListener('click', onActClick);
  ui.frame = buildFrame();

  ui.root.appendChild(ui.frame);
  ui.root.appendChild(buildApp());
  ui.root.appendChild(ui.fab);
  ui.root.appendChild(buildPanel());""",
"""  ui.root.appendChild(buildApp());
  ui.root.appendChild(buildPanel());""")
rep("""        h('span', { class: 'mpc-brand', text: 'MUSIC PLAYER' }), jp('ミュージックプレーヤー', 'mpc-brand-jp')),""",
"""        h('span', { class: 'mpc-brand', text: 'STREAM PLAYER' }), jp('ストリームプレーヤー', 'mpc-brand-jp')),""")

rex(r"// -+ apple face: housekeeping --\n.*?(?=// -+ keyboard ---)",
"""// ------------------------------------------------------------ housekeeping --
function placeControls() {
  if (!document.body || !ui.root) return;
  keepAttached();
}

""")

# --------------------------------------------------------------- keyboard ----
rep("""    setMode(S.mode === 'full' ? 'compact' : 'full');
    return;
  }
  if (e.key === 'Escape') {""", """    setMode(S.mode === 'full' ? 'compact' : 'full');
    return;
  }
  if (e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey && (e.key === 's' || e.key === 'S')) {
    e.preventDefault(); e.stopImmediatePropagation();
    switchService();
    return;
  }
  if (e.key === 'Escape') {""")
rep("""  if (S.mode === 'apple' || S.panelOpen) {""", """  if (S.panelOpen) {""")

# ------------------------------------------------------------------- boot ----
rex(r"  // Apple's player never came up \(no network when the app started, say\):\n.*?\n  \}, 45000\);\n", '')
rep("""  parseTtml: parseTtml, fetchLyrics: lyFetch,""",
"""  fetchLyrics: lyFetch, buildLyrics: lyBuild, services: SVCS, service: function () { return SVC; }, switchService: switchService,""")

# ------------------------------------------------------------ soundcloud ----
# History (a list of songs), the empty Likes, the browse window, the profile link
rep("""function viewRecent(tok) {
  setHead(""", """function viewRecent(tok) {
  if (SVC.recentSongs) { viewRecentSongs(tok); return; }
  setHead(""")
rep("""function viewSongs(tok) {""", """// (SoundCloud) "History": what was played here, newest first
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

function viewSongs(tok) {""")
rep("""    if (total < 0) { showMsg('LOADING', '読込中'); return; }
    showTable({""", """    if (total < 0) { showMsg('LOADING', '読込中'); return; }
    if (!total && DB.songsState !== 'loading') { showMsg('NO SONGS YET', SVC.words.noSongs || 'Songs you save show up here.'); return; }
    showTable({""")

rep("""    if (!n) { showMsg(C.error ? 'SEARCH FAILED' : 'NOTHING FOUND', C.error ? errText(C.error) : '見つかりません'); return; }""",
"""    if (!n && C.note) {
      showMsg('SEARCH IN THE SOUNDCLOUD WINDOW', C.note,
        textKey('browsesearch', 'SEARCH "' + v.term.slice(0, 40) + '" ON SOUNDCLOUD', null, 'Open SoundCloud\\'s own search in a window of its own', I.search));
      return;
    }
    if (!n) { showMsg(C.error ? 'SEARCH FAILED' : 'NOTHING FOUND', C.error ? errText(C.error) : '見つかりません'); return; }""")
rep("""    if (C.error) notice('SEARCHING ' + name + ' FAILED: ' + errText(C.error));""",
"""    if (C.error) notice('SEARCHING ' + name + ' FAILED: ' + errText(C.error));
    if (C.note) ui.bBody.insertBefore(h('div', { class: 'mpb-note' }, h('span', { text: C.note }),
      textKey('browsesearch', 'SEARCH ON SOUNDCLOUD', null, 'Open SoundCloud\\'s own search in a window of its own', I.search)), ui.bBody.firstChild);""")

rep("""  if (svc.lastError) box.appendChild(acctLine(svc.lastError, 'mpb-acct-err'));
  ui.bBody.appendChild(box);
}""", """  if (svc.lastError) box.appendChild(acctLine(svc.lastError, 'mpb-acct-err'));
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
    textKey('scprofile', 'SAVE', '保存', 'Use this profile\\'s likes', I.go)));
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
      textKey('browseshow', 'SHOW IT HERE', null, 'Open it in Stream Player\\'s browser', I.go),
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
  notice((how === 'play' ? 'OPENING ' : how === 'save' ? 'SAVING ' : 'OPENING ') + url.replace(/^https?:\\/\\//, ''), true);
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
}""")

rep("""  if (v.kind === 'account' || !authorized()) { viewAccount(tok); return; }""",
"""  if (v.kind === 'account' || !authorized()) { viewAccount(tok); return; }
  if (v.kind === 'browse') { viewBrowse(tok); return; }""")
rep("""function viewAccount() {
  var svc = SVC, signed = svc.signedIn(), u = svc.user;""", """function viewAccount() {
  var svc = SVC, signed = svc.signedIn(), u = svc.user;
  if (svc.setProfile) {
    setHead({ title: svc.name, jp: svc.jp, hideActions: true, meta: svc.profile ? 'likes from ' + (svc.profile.name || svc.profile.link) : 'no profile link yet' });
    clearBody('msg');
    var sbox = h('div', { class: 'mpb-msg mpb-acct' });
    scAccount(sbox);
    if (svc.lastError) sbox.appendChild(acctLine(svc.lastError, 'mpb-acct-err'));
    ui.bBody.appendChild(sbox);
    return;
  }""")

# artists can be saved (SoundCloud): the ADD key on an artist's page
rep("""function viewArtist(v, tok) {
  setHead({ title: v.name, jp: 'アーティスト', meta: 'loading...', hideActions: true });""",
"""function viewArtist(v, tok) {
  setHead({ title: v.name, jp: 'アーティスト', meta: 'loading...', hideActions: true });
  if (SVC.saveArtists && v.lib === undefined) {
    v.lib = null;
    inLibrary('artists', [v.id]).then(function (map) { v.lib = !!map[v.id]; if (B.view === v) syncAddKey(); }, function () { v.lib = undefined; });
  }""")
rep("""  setHead({ title: v.name, jp: 'アーティスト', meta: parts.join('  ·  ') || 'nothing here', canPlay: songs.length > 0, hideActions: !songs.length });""",
"""  setHead({ title: v.name, jp: 'アーティスト', meta: parts.join('  ·  ') || 'nothing here', canPlay: songs.length > 0, hideActions: !songs.length && !SVC.saveArtists });""")
rep("""  var kind = v.kind === 'playlist' ? 'playlists' : 'albums';
  v.adding = true;""", """  var kind = v.kind === 'playlist' ? 'playlists' : v.kind === 'artist' ? 'artists' : 'albums';
  v.adding = true;""")
rep("""    if (kind === 'playlists') setTimeout(function () { loadPlaylists().catch(function () {}); }, 2500);""",
"""    if (kind === 'playlists') setTimeout(function () { loadPlaylists().catch(function () {}); }, SVC.id === 'soundcloud' ? 50 : 2500);""")
rep("""  var v = B.view, cat = !!v && (v.kind === 'album' || v.kind === 'playlist') && !isLibId(v.kind, v.id);""",
"""  var v = B.view, cat = !!v && ((v.kind === 'album' || v.kind === 'playlist') && !isLibId(v.kind, v.id) || (v.kind === 'artist' && !!SVC.saveArtists));""")
rep("""    if (a) go({ kind: 'artist', id: a.id, name: a.n });""", """    if (a) go({ kind: 'artist', id: a.id, name: a.n, art: a.art, link: a.link });""")

# actions
rep("""  setupagain: function () {""", """  scprofile: function () {
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
  setupagain: function () {""")

# the SoundCloud window: follow what is open in it
rep("""  hookMusic();

  notifyHost();""", """  hookMusic();
  SVC_IDS.forEach(function (k) {
    var svc = SVCS[k];
    if (!svc.onBrowse) return;
    svc.onBrowse(function (now) {
      if (svc !== SVC) return;
      if (S.mode === 'full' && B.view && B.view.kind === 'browse') renderView();
      else if (now) notice('IN THE SOUNDCLOUD WINDOW: ' + now.title + '  -  BROWSE SOUNDCLOUD plays it here', true);
    });
  });

  notifyHost();""")

# each service opens on its first library entry (SoundCloud: Likes & Saved)
rep("""  B.view = back ? back.view : { kind: 'recent' };""", """  B.view = back ? back.view : { kind: (next.nav && next.nav[0] && next.nav[0].go) || 'recent' };""")
rep("""  renderNavPlaylists();
  // (a page loaded again to get the music back shows what the one before it showed)
  B.view = (RC.note && RC.note.view) || { kind: 'recent' };
  renderView();""", """  renderNavPlaylists();
  B.view = { kind: (SVC.nav && SVC.nav[0] && SVC.nav[0].go) || 'recent' };
  renderView();""")

# the "Album cover" theme: Spotify's and SoundCloud's artwork addresses, about 300 pixels
rep("""  url = tpl.replace('{w}', 300).replace('{h}', 300).replace('{f}', 'jpg').replace('{c}', 'bb');""",
"""  url = artUrl(tpl, 150);                // (Spotify's and SoundCloud's artwork: about 300 pixels)""")

# ---------------------------------------------------------------- wrapper ----
s = """// Stream Player - the player (see the notes below). boot.js loads it after the
// services, with the styles and the icon ready.
(function () {
'use strict';
var __MP_CSS = window.__MP_CSS || '';
var __MP_ICON = window.__MP_ICON || '';

""" + s.rstrip('\n') + "\n})();\n"

left = [w for w in ('MusicKit', 'apple.com', 'storefront(', 'api(', 'packTile', 'packSong(', 'viewSignIn', 'watchApple', 'JP_NAV', 'parseTtml', 'mediaEl(')
        if w in s]
print('left over:', left)
open(dst, 'w', encoding='utf-8').write(s)
print('written', len(s))

import os, shutil
css = os.path.join(os.path.dirname(os.path.abspath(src)), 'player.css')
if os.path.exists(css):
    shutil.copyfile(css, os.path.join(os.path.dirname(os.path.abspath(dst)), 'player.css'))
    print('copied the skin\'s player.css')
