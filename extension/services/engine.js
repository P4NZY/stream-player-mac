// Stream Player - the player each service plugs into.
//
// The skin (player.js) was written for Apple's player on music.apple.com
// (MusicKit): it reads the queue, the song playing, the time and the state
// from it, and tells it to play, pause, skip and so on. MPEngine is a player
// of exactly that shape, so the skin's deck, queue and keys work as they did.
// What actually makes the sound is a "backend" each service brings along:
//
//   backend.load(items, index, startSec)  start items[index]; a backend that
//                                         plays a list by itself (Spotify) is
//                                         handed the whole list
//   backend.play() / pause() / seek(sec) / setVolume(0..1)
//   backend.next() / prev()               (list backends only)
//   backend.setRepeat('none'|'one'|'all') (list backends only)
//   backend.time() / duration()           seconds
//   backend.kbps                          what the song is streamed at, or 0
//   backend.drivesList                    true: it moves along the list itself
// and it tells the engine what happens through engine.backendState(name),
// engine.backendTrack(item id), engine.backendEnded() and engine.backendError(e).
//
// The queue is normally the engine's own: the order songs play in, shuffled
// or not, with the song playing at queue.position. One exception: a list the
// service plays but will not show song by song (Spotify, for playlists that
// are someone else's). Then the queue is the service's: the engine is handed
// a "context" to play, and the backend reports what is playing and what
// comes next as it goes (engine.backendWindow).
(function () {
  'use strict';

  var NAMES = ['none', 'loading', 'playing', 'paused', 'stopped', 'ended', 'seeking', '', 'waiting', 'stalled', 'completed'];
  var ST = {};
  NAMES.forEach(function (n, i) { if (n) ST[n] = i; });
  function both(o) { var r = {}, k; for (k in o) { r[k] = o[k]; r[o[k]] = k; } return r; }

  // the same constants MusicKit has (the skin reads them through MK())
  window.MPKit = {
    PlaybackStates: (function () { var r = {}; NAMES.forEach(function (n, i) { if (n) { r[i] = n; r[n] = i; } }); return r; })(),
    PlayerRepeatMode: both({ none: 0, one: 1, all: 2 }),
    PlayerShuffleMode: both({ off: 0, songs: 1 })
  };

  function shuffled(list) {
    var a = list.slice(), i, j, t;
    for (i = a.length - 1; i > 0; i--) { j = Math.floor(Math.random() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // opts: { service, backend, resolve(queueOpts) -> Promise<{items, index}> }
  function MPEngine(opts) {
    this.service = opts.service;
    this.backend = opts.backend;
    this.resolveQueue = opts.resolve;
    this.ev = {};
    this.items = [];          // in play order
    this.plain = null;        // the order before shuffling (null: not shuffled)
    this.pos = -1;
    this.loaded = null;       // the item the backend has (null: none yet)
    this.st = ST.none;
    this.shuf = 0;
    this.rep = 0;
    this.vol = 1;
    this.listDirty = false;   // (list backends) the list changed since it was handed over
    this.ctx = null;          // {uri, name}: playing a list the service keeps to itself
    this.ctxGo = false;       // ...and it has been started
    this.handAt = 0;          // when the list was last handed over (or a skip asked for)
    this.ticker = 0;
    this.lastDur = 0;
    var self = this;
    this.backend.engine = this;
    this.tick = function () { self.emit('playbackTimeDidChange'); };
  }
  var P = MPEngine.prototype;

  // ---- events ----
  P.addEventListener = function (name, fn) { (this.ev[name] = this.ev[name] || []).push(fn); };
  P.removeEventListener = function (name, fn) {
    var l = this.ev[name];
    if (l) this.ev[name] = l.filter(function (f) { return f !== fn; });
  };
  P.emit = function (name, arg) {
    var l = this.ev[name] || [], i;
    for (i = 0; i < l.length; i++) { try { l[i](arg); } catch (e) { if (window.console) console.error(e); } }
  };

  // ---- what the skin reads ----
  Object.defineProperties(P, {
    playbackState: { get: function () { return this.st; } },
    isPlaying: { get: function () { return this.st === ST.playing; } },
    isAuthorized: { get: function () { return !!(this.service && this.service.signedIn()); } },
    nowPlayingItem: { get: function () { return this.items[this.pos] || null; } },
    nowPlayingItemIndex: { get: function () { return this.items[this.pos] ? this.pos : -1; } },
    queue: { get: function () { return { items: this.items, position: this.pos, isEmpty: !this.items.length }; } },
    currentPlaybackTime: {
      get: function () {
        if (!this.loaded || this.loaded !== this.items[this.pos]) return 0;
        var t = this.backend.time();
        return isFinite(t) && t > 0 ? t : 0;
      }
    },
    currentPlaybackDuration: {
      get: function () {
        var it = this.items[this.pos];
        if (!it) return 0;
        var d = this.loaded === it ? this.backend.duration() : 0;
        return isFinite(d) && d > 0 ? d : (it.playbackDuration || 0) / 1000;
      }
    },
    bitrate: { get: function () { return this.loaded ? (this.backend.kbps || 0) : 0; } },
    storefrontId: { get: function () { return (this.service && this.service.country) || 'us'; } },
    volume: {
      get: function () { return this.vol; },
      set: function (v) {
        v = Math.max(0, Math.min(1, +v || 0));
        this.vol = v;
        try { this.backend.setVolume(v); } catch (e) {}
        this.emit('playbackVolumeDidChange');
      }
    },
    shuffleMode: {
      get: function () { return this.shuf; },
      set: function (v) { this.setShuffle(v ? 1 : 0); }
    },
    repeatMode: {
      get: function () { return this.rep; },
      set: function (v) {
        v = v === 1 || v === 2 ? v : 0;
        if (v === this.rep) return;
        this.rep = v;
        if (this.backend.drivesList && this.backend.setRepeat) {
          try { this.backend.setRepeat(window.MPKit.PlayerRepeatMode[v]); } catch (e) {}
        }
        this.emit('repeatModeDidChange');
      }
    }
  });

  // ---- state from the backend ----
  P.setState = function (name) {
    var n = ST[name];
    if (n === undefined || n === this.st) return;
    this.st = n;
    clearInterval(this.ticker);
    this.ticker = 0;
    if (n === ST.playing) this.ticker = setInterval(this.tick, 250);
    this.emit('playbackStateDidChange');
    this.emit('playbackTimeDidChange');
  };
  P.backendState = function (name) {
    // a list backend that stopped by itself at the end of the list
    this.setState(name);
    var d = this.currentPlaybackDuration;
    if (d && d !== this.lastDur) { this.lastDur = d; this.emit('playbackDurationDidChange'); }
  };
  // a list backend moved on to another song (by itself, or as asked)
  P.backendTrack = function (id) {
    var cur = this.items[this.pos];
    if (cur && cur.id === id) return;
    var natural = Date.now() - this.handAt > 2500;
    if (natural && this.listDirty) {
      // songs were added since the list was handed over: what comes next is ours
      var nxt = this.pos + 1 < this.items.length ? this.pos + 1 : (this.rep === 2 ? 0 : -1);
      if (nxt >= 0) { this.startAt(nxt); return; }
    }
    var at = -1, i;
    // the nearest one after the song that was playing (a song can be in the queue twice)
    for (i = Math.max(0, this.pos); i < this.items.length && at < 0; i++) if (this.items[i].id === id) at = i;
    for (i = 0; i < this.pos && at < 0; i++) if (this.items[i].id === id) at = i;
    if (at < 0) return;                       // something we did not ask for (another device)
    this.pos = at;
    this.loaded = this.items[at];
    this.lastDur = 0;
    this.emit('queuePositionDidChange');
    this.emit('nowPlayingItemDidChange');
  };
  // (context lists) what is playing and what comes after it, as the service says
  P.backendWindow = function (items, index) {
    if (!this.ctx) return;
    var cur = items[index], was = this.items[this.pos];
    this.items = items;
    this.pos = cur ? index : -1;
    this.loaded = cur || null;
    this.emit('queueItemsDidChange');
    this.emit('queuePositionDidChange');
    if (!was || !cur || was.id !== cur.id) { this.lastDur = 0; this.emit('nowPlayingItemDidChange'); }
  };
  // the song came to its end (backends that play one song at a time, and a
  // list backend at the end of its list)
  P.backendEnded = function () {
    if (!this.items.length) return;
    if (this.backend.drivesList) {
      if (this.listDirty && this.pos + 1 < this.items.length) { this.startAt(this.pos + 1); return; }
      this.setState('completed');
      return;
    }
    if (this.rep === 1) { this.startAt(this.pos); return; }
    if (this.pos + 1 < this.items.length) { this.startAt(this.pos + 1); return; }
    if (this.rep === 2) { this.startAt(0); return; }
    this.setState('completed');
  };
  P.backendError = function (e) {
    this.emit('mediaPlaybackError', e);
  };

  // ---- the queue ----
  P.setQueue = function (opts) {
    var self = this;
    return Promise.resolve(this.resolveQueue(opts || {})).then(function (r) {
      var items = (r && r.items) || [], index = Math.max(0, Math.min(items.length - 1, (r && r.index) || 0));
      self.plain = null;
      self.ctx = (r && r.context) || null;
      self.ctxGo = false;
      if (self.shuf && items.length > 1 && !self.ctx) {
        // shuffle on: the whole list in random order (as MusicKit does)
        self.plain = items.slice();
        items = shuffled(items);
        index = 0;
      }
      self.items = items;
      self.pos = items.length ? index : -1;
      self.loaded = null;
      self.listDirty = false;
      if (self.st === ST.playing || self.st === ST.loading) { try { self.backend.pause(); } catch (e) {} }
      self.setState(items.length ? 'paused' : 'none');
      self.emit('queueItemsDidChange');
      self.emit('queuePositionDidChange');
      self.emit('nowPlayingItemDidChange');
      return self.queue;
    });
  };

  // hand the backend the song at i (and, for a list backend, the list)
  P.handOver = function (i, startSec) {
    var it = this.items[i];
    if (!it) return Promise.resolve();
    var self = this;
    this.handAt = Date.now();
    this.listDirty = false;
    this.loaded = it;
    this.setState('loading');
    return Promise.resolve(this.backend.load(this.items, i, startSec || 0)).catch(function (e) {
      if (self.loaded === it) self.setState('paused');
      self.backendError(e);
      throw e;
    });
  };
  P.startAt = function (i) {
    if (!this.items[i]) return Promise.resolve();
    var changed = i !== this.pos;
    this.pos = i;
    this.lastDur = 0;
    if (changed) { this.emit('queuePositionDidChange'); this.emit('nowPlayingItemDidChange'); }
    return this.handOver(i, 0).catch(function () {});
  };

  P.setShuffle = function (v) {
    if (v === this.shuf) return;
    this.shuf = v;
    if (this.ctx) {
      // the service shuffles a list it keeps to itself
      if (this.ctxGo && this.backend.setShuffle) { try { this.backend.setShuffle(!!v); } catch (e) {} }
      this.emit('shuffleModeDidChange');
      return;
    }
    var cur = this.items[this.pos];
    if (this.items.length > 1) {
      if (v) {
        // keep what is playing, and shuffle everything else in behind it
        this.plain = this.items.slice();
        var rest = this.items.filter(function (x, k) { return k !== this.pos; }, this);
        this.items = (cur ? [cur] : []).concat(shuffled(rest));
        this.pos = cur ? 0 : -1;
      } else if (this.plain) {
        this.items = this.plain;
        this.plain = null;
        var at = cur ? this.items.indexOf(cur) : -1;
        this.pos = at >= 0 ? at : 0;
      }
      this.listChanged(true);
    }
    this.emit('shuffleModeDidChange');
  };

  // The order changed: a list backend has to have the new one. Now (a new
  // order: what plays next changed), or once it matters (songs added at the
  // end: when the list it has runs out).
  P.listChanged = function (now) {
    this.emit('queueItemsDidChange');
    this.emit('queuePositionDidChange');
    if (!this.backend.drivesList || !this.loaded) return;
    if (!now) { this.listDirty = true; return; }
    var going = this.st === ST.playing || this.st === ST.loading;
    if (going) this.handOver(this.pos, this.currentPlaybackTime).catch(function () {});
    else this.listDirty = true;                 // (paused: handed over when it plays again)
  };

  P.playNext = function (opts) { return this.insert(opts, true); };
  P.playLater = function (opts) { return this.insert(opts, false); };
  P.insert = function (opts, next) {
    var self = this;
    return Promise.resolve(this.resolveQueue(opts || {})).then(function (r) {
      var add = (r && r.items) || [];
      if (!add.length) return;
      if (self.ctx) {
        // a context list: the service's own queue (songs go in right after the current one)
        if (!self.ctxGo || !self.backend.queueNext) throw new Error('start the list first');
        return Promise.resolve(self.backend.queueNext(add)).then(function (ok) { if (!ok) throw new Error('the service did not take it'); });
      }
      if (!self.items.length) { self.items = add; self.pos = 0; self.emit('nowPlayingItemDidChange'); self.listChanged(false); return; }
      var at = next ? self.pos + 1 : self.items.length;
      self.items = self.items.slice(0, at).concat(add, self.items.slice(at));
      if (self.plain) self.plain = self.plain.concat(add);
      if (!next || !self.backend.drivesList || !self.loaded) { self.listChanged(false); return; }
      // "play next" on a list backend: slipped in after the current song
      // where it can do that without stopping it, else the list goes over again
      var was = self.listDirty;
      self.emit('queueItemsDidChange');
      self.emit('queuePositionDidChange');
      return Promise.resolve(self.backend.queueNext ? self.backend.queueNext(add) : false).then(function (ok) {
        if (!ok) self.listChanged(true); else self.listDirty = was;
      }, function () { self.listChanged(true); });
    });
  };

  // ---- the keys ----
  P.play = function () {
    var it = this.items[this.pos];
    if (this.ctx && !this.ctxGo) {
      // a context list: started once; the service then says what is playing
      var self0 = this;
      this.ctxGo = true;
      this.handAt = Date.now();
      this.setState('loading');
      return Promise.resolve(this.backend.loadContext(this.ctx, null, !!this.shuf)).catch(function (e) {
        self0.ctxGo = false;
        self0.setState(self0.items.length ? 'paused' : 'none');
        self0.backendError(e);
      });
    }
    if (!it) return Promise.resolve();
    if (this.loaded === it && this.st !== ST.stopped && this.st !== ST.completed && this.st !== ST.ended) {
      if (this.listDirty) return this.handOver(this.pos, this.currentPlaybackTime);
      this.setState('playing');
      return Promise.resolve(this.backend.play()).catch(this.backendError.bind(this));
    }
    if (this.loaded === it && (this.st === ST.stopped || this.st === ST.completed || this.st === ST.ended) && !this.listDirty) {
      var self = this;
      this.setState('playing');
      return Promise.resolve(this.backend.seek(0)).then(function () { return self.backend.play(); }).catch(this.backendError.bind(this));
    }
    return this.handOver(this.pos, 0).catch(function () {});
  };
  P.pause = function () {
    if (!this.loaded) return Promise.resolve();
    this.setState('paused');
    return Promise.resolve(this.backend.pause()).catch(function () {});
  };
  P.stop = function () {
    if (!this.loaded) { this.setState(this.items.length ? 'stopped' : 'none'); return Promise.resolve(); }
    var b = this.backend;
    this.setState('stopped');
    return Promise.resolve(b.pause()).then(function () { return b.seek(0); }).catch(function () {});
  };
  P.seekToTime = function (sec) {
    if (!this.loaded) return Promise.resolve();
    var self = this;
    return Promise.resolve(this.backend.seek(Math.max(0, +sec || 0))).then(function () { self.emit('playbackTimeDidChange'); }).catch(function () {});
  };
  P.skipToNextItem = function () {
    if (this.ctx) { this.handAt = Date.now(); return this.ctxGo ? Promise.resolve(this.backend.next()).catch(function () {}) : Promise.resolve(); }
    if (!this.items.length) return Promise.resolve();
    var i = this.pos + 1;
    if (i >= this.items.length) { if (this.rep !== 2) return Promise.resolve(); i = 0; }
    if (this.backend.drivesList && !this.listDirty && this.loaded && this.backend.next && i === this.pos + 1) {
      this.handAt = Date.now();
      return Promise.resolve(this.backend.next()).catch(function () {});
    }
    return this.startAt(i);
  };
  P.skipToPreviousItem = function () {
    if (this.ctx) { this.handAt = Date.now(); return this.ctxGo ? Promise.resolve(this.backend.prev()).catch(function () {}) : Promise.resolve(); }
    if (!this.items.length) return Promise.resolve();
    var i = this.pos - 1;
    if (i < 0) { if (this.rep !== 2) return this.seekToTime(0); i = this.items.length - 1; }
    if (this.backend.drivesList && !this.listDirty && this.loaded && this.backend.prev && i === this.pos - 1) {
      this.handAt = Date.now();
      return Promise.resolve(this.backend.prev()).catch(function () {});
    }
    return this.startAt(i);
  };
  P.changeToMediaAtIndex = function (i) {
    i = parseInt(i, 10);
    if (!(i >= 0 && i < this.items.length)) return Promise.resolve();
    if (this.ctx) {
      if (i === this.pos) return Promise.resolve();
      var self = this;
      this.ctxGo = true;
      this.handAt = Date.now();
      this.setState('loading');
      return Promise.resolve(this.backend.loadContext(this.ctx, this.items[i].song, !!this.shuf)).catch(function (e) { self.backendError(e); });
    }
    return this.startAt(i);
  };
  // everything stops and the queue empties (signing out, switching accounts)
  P.reset = function () {
    try { this.backend.pause(); } catch (e) {}
    this.items = []; this.plain = null; this.pos = -1; this.loaded = null; this.listDirty = false;
    this.ctx = null; this.ctxGo = false;
    this.setState('none');
    this.emit('queueItemsDidChange');
    this.emit('nowPlayingItemDidChange');
  };

  window.MPEngine = MPEngine;
})();
