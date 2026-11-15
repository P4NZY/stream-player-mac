// Stream Player - lyrics.
//
// Neither Spotify nor SoundCloud hands lyrics to other players, so they come
// from LRCLIB (lrclib.net): a free, open collection of lyrics, most of them
// timed line by line, that anyone may use. A song is looked up by its title,
// artist, album and length; LRCLIB only answers when the length matches too
// (within a couple of seconds), so the lyrics are those of this recording.
//
// MPLyrics.find({title, artist, album, duration, loose}) resolves with
//   { synced: true|false, lines: [{b, e, t}] }   b / e: seconds (synced only)
// or null when there are none. loose: the title and artist are guesses (a
// SoundCloud upload titled "Artist - Song (Official Audio)", say).
(function () {
  'use strict';
  var BASE = 'https://lrclib.net/api/';
  var HEAD = { 'Lrclib-Client': 'Stream Player (a personal music player)' };

  function get(path, q) {
    var parts = [], k;
    for (k in q) if (q[k] !== undefined && q[k] !== '' && q[k] !== null) parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(q[k]));
    return fetch(BASE + path + '?' + parts.join('&'), { headers: HEAD, credentials: 'omit' }).then(function (r) {
      if (r.status === 404) return null;
      if (!r.ok) { var e = new Error('lyrics service answered ' + r.status); e.status = r.status; throw e; }
      return r.json();
    });
  }

  // "[01:02.50]" times, several per line allowed; [offset:+120] in ms
  function parseLrc(text) {
    var out = [], offset = 0;
    String(text || '').split(/\r?\n/).forEach(function (raw) {
      var m = raw.match(/^\s*\[offset:\s*([+-]?\d+)\s*\]/i);
      if (m) { offset = (+m[1] || 0) / 1000; return; }
      var times = [], rest = raw, t;
      while ((t = rest.match(/^\s*\[(\d{1,3}):(\d{1,2}(?:[.:]\d{1,3})?)\]/))) {
        times.push((+t[1]) * 60 + parseFloat(t[2].replace(':', '.')));
        rest = rest.slice(t[0].length);
      }
      if (!times.length) return;
      var words = rest.replace(/<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g, '').replace(/\s+/g, ' ').trim();
      times.forEach(function (b) { out.push({ b: Math.max(0, b - offset), t: words }); });
    });
    out.sort(function (a, b) { return a.b - b.b; });
    for (var i = 0; i < out.length; i++) out[i].e = i + 1 < out.length ? out[i + 1].b : out[i].b + 6;
    return out;
  }

  function fromRecord(r) {
    if (!r || r.instrumental) return null;
    if (r.syncedLyrics) {
      var lines = parseLrc(r.syncedLyrics).filter(function (l, i, all) {
        // keep empty lines only as breaks between words (they end the line before)
        return l.t || (i > 0 && all[i - 1].t);
      });
      if (lines.some(function (l) { return l.t; })) return { synced: true, lines: lines };
    }
    if (r.plainLyrics) {
      var plain = String(r.plainLyrics).split(/\r?\n/).map(function (s) { return s.trim(); });
      while (plain.length && !plain[plain.length - 1]) plain.pop();
      if (plain.some(Boolean)) return { synced: false, lines: plain.map(function (s) { return { b: -1, e: -1, t: s }; }) };
    }
    return null;
  }

  // Titles as streaming services write them, made plain for looking up:
  // "Song - Remastered 2011", "Song (feat. X)", "Song [Official Video]" -> "Song"
  var NOISE = /\s*[\(\[\{][^\)\]\}]*(official|audio|video|lyric|visuali[sz]er|music video|free download|out now|hq|hd|4k|remaster|explicit|clean|prod\.?|feat\.?|ft\.?|with )[^\)\]\}]*[\)\]\}]/ig;
  function plainTitle(t) {
    return String(t || '')
      .replace(NOISE, '')
      .replace(/\s+-\s+(\d{4}\s+)?(remaster(ed)?|mono|stereo|single|radio edit|live|bonus).*$/i, '')
      .replace(/\s+(feat|ft)\.?\s.*$/i, '')
      .replace(/\s+/g, ' ').trim();
  }
  function plainArtist(a) {
    return String(a || '').split(/\s*(,|&|\bx\b|\bfeat\.?|\bft\.?|\bwith\b)\s*/i)[0].trim();
  }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ''); }

  // the best of several answers: the right length first, then names that match
  function pick(list, want) {
    var best = null, bestScore = -1;
    (list || []).forEach(function (r) {
      if (!r || r.instrumental || (!r.syncedLyrics && !r.plainLyrics)) return;
      var dd = want.duration ? Math.abs((r.duration || 0) - want.duration) : 0;
      if (want.duration && dd > 3) return;
      var score = 10 - dd;
      if (norm(r.trackName) === norm(want.title)) score += 6;
      else if (norm(r.trackName).indexOf(norm(want.title)) >= 0 || norm(want.title).indexOf(norm(r.trackName)) >= 0) score += 3;
      if (want.artist && norm(r.artistName).indexOf(norm(want.artist)) >= 0) score += 4;
      if (r.syncedLyrics) score += 2;
      if (score > bestScore) { bestScore = score; best = r; }
    });
    return best;
  }

  // one reading of the song: {title, artist, album}
  function lookup(t, dur) {
    var want = { title: t.title, artist: t.artist, duration: dur };
    var exact = t.artist && dur
      ? get('get', { track_name: t.title, artist_name: t.artist, album_name: t.album || '', duration: dur })
      : Promise.resolve(null);
    return exact.then(function (r) {
      var got = fromRecord(r);
      if (got) return got;
      return get('search', t.artist ? { track_name: t.title, artist_name: t.artist } : { q: t.title }).then(function (list) {
        var best = pick(list, want);
        if (best || !t.artist) return fromRecord(best);
        return get('search', { q: t.title + ' ' + t.artist }).then(function (l2) { return fromRecord(pick(l2, want)); });
      });
    });
  }

  // The song as the service names it, and - when the title reads "Artist -
  // Song" (as on SoundCloud, where the uploader is often a label or a fan) -
  // that way too; the likelier reading first.
  function find(info) {
    var dur = Math.round(info.duration || 0);
    var plain = { title: plainTitle(info.title), artist: plainArtist(info.artist), album: info.loose ? '' : (info.album || '') };
    var m = String(info.title || '').match(/^(.+?)\s+[-\u2013\u2014]\s+(.+)$/);
    var split = m ? { title: plainTitle(m[2]), artist: plainArtist(m[1]), album: '' } : null;
    var tries = (info.loose && split ? [split, plain] : split ? [plain, split] : [plain]).filter(function (t) { return t.title; });
    function attempt(i) {
      if (i >= tries.length) return Promise.resolve(null);
      return lookup(tries[i], dur).then(function (r) { return r || attempt(i + 1); });
    }
    return attempt(0);
  }

  window.MPLyrics = { find: find, parseLrc: parseLrc, plainTitle: plainTitle };
})();
