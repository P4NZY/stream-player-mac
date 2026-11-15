// Stream Player - listening to the player's window (see background.js).
//
// The browser hands this page the sound of the tab with the player in it
// (chrome.tabCapture), and for as long as it does, the tab itself is silent.
// So this page
//   1. plays that sound on to the speakers, unchanged (an <audio> element:
//      it evens out the small difference between the capture's clock and
//      the speakers' clock, so nothing clicks or drifts over a long album)
//   2. measures it for the visualizer, and while the player asks for it,
//      about 60 times a second, sends the newest stretch on, at 44.1 kHz, the
//      way the PC version's app did (see "Sound" in player.js):
//          8 bytes: frames sent so far (little-endian), then the new stereo
//          frames as 16-bit samples (left, right, left, right ...), in base64
// It stops listening by itself after a minute in which nothing was asked for
// and nothing was heard (the music paused), and as soon as anything about
// playing the sound on goes wrong - the tab then plays its own sound again.
'use strict';

var RATE = 44100;            // what the player's analysis expects
var FFT = 4096;              // newest frames the measuring keeps (85 ms at 48 kHz)
var IDLE_MS = 60000;
var T = null;                // the listening under way
var port = null;

function noop() {}
function errText(e) { return String((e && (e.message || e.name)) || e || 'unknown error').slice(0, 120); }

// ---- talking to background.js ----
function link() {
  if (port) return port;
  try { port = chrome.runtime.connect({ name: 'mp-offscreen' }); } catch (e) { port = null; return null; }
  port.onDisconnect.addListener(function () {
    port = null;
    // the background was restarted: tell the new one what is going on here
    if (T && T.on) setTimeout(function () { if (T && T.on) post({ kind: 'hello', run: T.run, tab: T.tab }); }, 50);
  });
  return port;
}
function post(m) {
  var p = link();
  if (!p) return;
  try { p.postMessage(m); } catch (e) { port = null; }
}
function report(run, s, why) { post({ kind: 'state', run: run.run, tab: run.tab, s: s, why: why || '' }); }

chrome.runtime.onMessage.addListener(function (m, sender, reply) {
  if (!m || m.target !== 'mp-offscreen') return;
  if (m.kind === 'start') { start(m); reply(true); }
  else if (m.kind === 'stop') { stop().then(function () { reply(true); }); return true; }
  else if (m.kind === 'want') { if (T) T.wantUntil = performance.now() + 2500; reply(true); }
});

// ---- starting and stopping ----
function start(m) {
  stop().then(function () {
    var run = {
      run: m.run, tab: m.tab, on: false, at: performance.now(),
      stream: null, el: null, ctx: null, aL: null, aR: null, timer: 0, ping: 0,
      bufL: new Float32Array(FFT), bufR: new Float32Array(FFT), out: new Int16Array(2 * (FFT + 16)),
      wantUntil: 0, lastLoud: 0, peekAt: 0, live: false, lastFrame: -1, total: 0, rs: null
    };
    T = run;
    var ctx;
    try { ctx = new AudioContext({ latencyHint: 'playback' }); }
    catch (e) { fail(run, 'no sound output here: ' + errText(e)); return; }
    run.ctx = ctx;
    // the measuring has to be running before the tab is taken over
    resume(ctx).then(function () {
      if (T !== run) return null;
      return navigator.mediaDevices.getUserMedia({
        audio: { mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: m.streamId } },
        video: false
      });
    }).then(function (stream) {
      if (!stream) return null;
      if (T !== run) { stopTracks(stream); return null; }
      run.stream = stream;
      // 1. on to the speakers: from here on the tab itself is silent
      var el = new Audio();
      el.srcObject = stream;
      run.el = el;
      return el.play().then(function () {
        if (T !== run) return;
        el.onpause = function () { if (T === run) fail(run, 'playing the sound on stopped'); };
        el.onerror = function () { if (T === run) fail(run, 'playing the sound on failed'); };
        // 2. measuring: each channel on its own (the measuring node mixes to mono)
        var src = ctx.createMediaStreamSource(stream), split = ctx.createChannelSplitter(2);
        run.aL = ctx.createAnalyser();
        run.aR = ctx.createAnalyser();
        run.aL.fftSize = run.aR.fftSize = FFT;
        src.connect(split);
        split.connect(run.aL, 0);
        split.connect(run.aR, 1);
        run.rs = { ratio: ctx.sampleRate / RATE, next: 0, base: 0, pl: 0, pr: 0 };
        ctx.onstatechange = function () { if (T === run && ctx.state === 'suspended') ctx.resume().catch(noop); };
        stream.getAudioTracks().forEach(function (t) {
          t.onended = function () { if (T === run) stop('the tab stopped'); };
        });
        run.timer = setInterval(function () { tick(run); }, 16);
        // (keeps background.js awake while this goes on, so the sound has somewhere to go)
        run.ping = setInterval(function () { post({ kind: 'ping' }); }, 20000);
        run.on = true;
        var tr = stream.getAudioTracks()[0], st = tr && tr.getSettings ? tr.getSettings() : {};
        console.log('Music Player: listening to tab ' + run.tab + ' (' + ctx.sampleRate + ' Hz, ' +
          (st.channelCount || '?') + ' channels, output latency ' + Math.round((ctx.outputLatency || ctx.baseLatency || 0) * 1000) + ' ms)');
        report(run, 'on');
      });
    }).catch(function (e) {
      if (T === run) fail(run, errText(e));
    });
  });
}

function resume(ctx) {
  if (ctx.state === 'running') return Promise.resolve();
  return Promise.race([
    ctx.resume().catch(noop),
    new Promise(function (r) { setTimeout(r, 1500); })
  ]).then(function () {
    if (ctx.state !== 'running') throw new Error('the sound output did not start (' + ctx.state + ')');
  });
}

function stopTracks(stream) {
  if (stream) stream.getTracks().forEach(function (t) { try { t.stop(); } catch (e) {} });
}

// Stop listening (the tab plays its own sound again). why: said to background.js, unless it asked.
function stop(why) {
  var run = T;
  T = null;
  if (!run) return Promise.resolve();
  clearInterval(run.timer);
  clearInterval(run.ping);
  stopTracks(run.stream);
  if (run.el) { try { run.el.onpause = run.el.onerror = null; run.el.pause(); run.el.srcObject = null; } catch (e) {} }
  if (why) report(run, 'off', why);
  return run.ctx ? run.ctx.close().catch(noop) : Promise.resolve();
}
function fail(run, why) {
  console.warn('Music Player: listening failed: ' + why);
  if (T === run) stop();
  report(run, 'failed', why);
}

// ---- measuring ----
function peak(buf, from) {
  var p = 0, v, i;
  for (i = from; i < buf.length; i += 3) { v = buf[i]; if (v < 0) v = -v; if (v > p) p = v; }
  return p;
}

function tick(run) {
  if (T !== run || !run.aL) return;
  var now = performance.now(), ctx = run.ctx;
  var frame = Math.round(ctx.currentTime * ctx.sampleRate);    // frames played so far
  if (now >= run.wantUntil) {
    // not wanted: only keep an ear on whether the music still plays
    run.live = false;
    if (now - run.peekAt > 500) {
      run.peekAt = now;
      run.aL.getFloatTimeDomainData(run.bufL);
      run.aR.getFloatTimeDomainData(run.bufR);
      if (peak(run.bufL, 0) > 0.0003 || peak(run.bufR, 0) > 0.0003) run.lastLoud = now;
    }
    if (now - Math.max(run.lastLoud, run.wantUntil, run.at) > IDLE_MS) stop('nothing to listen to');
    return;
  }
  if (!run.live) {
    // a fresh stretch: the player starts its picture of the sound over
    run.live = true;
    run.lastFrame = frame;
    run.total += 8192;
    run.rs.next = run.rs.base = 0;
    return;
  }
  var fresh = frame - run.lastFrame;
  if (fresh <= 0) return;
  run.lastFrame = frame;
  run.aL.getFloatTimeDomainData(run.bufL);
  run.aR.getFloatTimeDomainData(run.bufR);
  if (fresh > FFT) {
    // this page was held up for a moment: carry on from the newest sound
    run.total += 8192;
    run.rs.next = run.rs.base = 0;
    fresh = FFT;
  }
  var from = FFT - fresh;
  if (peak(run.bufL, from) > 0.0003 || peak(run.bufR, from) > 0.0003) run.lastLoud = now;
  var n = resample(run, from);
  if (n > 0) send(run, n);
}

// The newest frames (bufL / bufR from index `from`) to 44.1 kHz, into run.out;
// one call follows on from the last.
function resample(run, from) {
  var rs = run.rs, L = run.bufL, R = run.bufR, len = FFT - from, out = run.out, max = out.length >> 1;
  var n = 0, fl, i, f, a, b, v;
  if (rs.next < rs.base - 1) rs.next = rs.base - 1;
  while (n < max) {
    fl = Math.floor(rs.next);
    i = fl - rs.base;                     // -1: between the last call's final frame and this one's first
    if (i + 1 >= len) break;
    f = rs.next - fl;
    a = i < 0 ? rs.pl : L[from + i]; b = L[from + i + 1]; v = (a + (b - a) * f) * 32767;
    out[2 * n] = v > 32767 ? 32767 : v < -32768 ? -32768 : Math.round(v);
    a = i < 0 ? rs.pr : R[from + i]; b = R[from + i + 1]; v = (a + (b - a) * f) * 32767;
    out[2 * n + 1] = v > 32767 ? 32767 : v < -32768 ? -32768 : Math.round(v);
    n++;
    rs.next += rs.ratio;
  }
  rs.pl = L[FFT - 1];
  rs.pr = R[FFT - 1];
  rs.base += len;
  return n;
}

function send(run, n) {
  run.total += n;
  var bytes = new Uint8Array(8 + n * 4), t = run.total, out = run.out, i, o, s;
  for (i = 0; i < 6; i++) { bytes[i] = t % 256; t = Math.floor(t / 256); }
  for (i = 0, o = 8; i < n * 2; i++, o += 2) { s = out[i]; bytes[o] = s & 255; bytes[o + 1] = (s >> 8) & 255; }
  var bin = '';
  for (i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  post({ kind: 'pcm', run: run.run, tab: run.tab, b64: btoa(bin) });
}
