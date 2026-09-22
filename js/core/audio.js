/* AUDIO: entspannte, lustige Hintergrundmusik + kleine Effekte, alles live per WebAudio erzeugt (keine Dateien nötig).
 * Melodie ändern: die Tabellen CHORDS und MELODY unten bearbeiten. */
(function () {
  const A = FF.audio = { ctx: null, music: true, sfxOn: true, ready: false };
  const KEY = 'fenriyFarm.settings';

  /* ---------- Einstellungen (unabhängig vom Spielstand) ---------- */
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (s.music === false) A.music = false;
    if (s.sfx === false) A.sfxOn = false;
  } catch (e) { /* ignorieren */ }
  function saveSettings() {
    try { localStorage.setItem(KEY, JSON.stringify({ music: A.music, sfx: A.sfxOn })); } catch (e) { /* ignorieren */ }
  }

  /* ---------- Musik-Daten ---------- */
  const BPM = 96;
  const EIGHTH = 60 / BPM / 2;
  const SWING = 0.14;                        // Schunkel-Gefühl: jede zweite Achtel etwas später

  // Akkorde je Takt (16 Takte): Basston und Akkordtöne (MIDI)
  const C_ = { r: 48, t: [55, 60, 64] }, AM = { r: 45, t: [57, 60, 64] }, F_ = { r: 41, t: [57, 60, 65] },
    G_ = { r: 43, t: [55, 59, 62] }, EM = { r: 40, t: [55, 59, 64] };
  const CHORDS = [C_, AM, F_, G_, C_, AM, F_, G_,   F_, G_, EM, AM, F_, G_, C_, C_];

  // Melodie: 8 Achtel pro Takt, Zahl = MIDI-Ton, null = Pause
  const MELODY = [
    [76, 74, 72, null, 67, null, 72, null],
    [69, 72, 76, null, 72, null, 69, null],
    [72, 69, 65, 69, 72, null, 77, null],
    [74, null, 71, 67, 71, 74, 67, null],
    [76, null, 79, 76, 72, null, 76, null],
    [81, 79, 76, null, 72, 76, 69, null],
    [77, 76, 72, 69, 72, null, 69, null],
    [74, 71, 67, 71, 72, null, 72, null],

    [77, null, 77, 76, 72, null, 69, 72],
    [74, null, 74, 72, 71, null, 67, 71],
    [76, null, 79, 76, 71, null, 67, 71],
    [81, null, 79, 76, 72, null, 69, null],
    [77, 76, 77, 79, 81, null, 77, null],
    [79, 77, 74, 71, 74, null, 79, null],
    [76, 72, 76, 79, 84, null, 79, null],
    [76, null, 72, null, 67, null, null, null]
  ];

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  /* ---------- Klang-Bausteine ---------- */
  let noiseBuf = null;
  function getNoise(ctx) {
    if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
    const len = Math.floor(ctx.sampleRate * 0.5);
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  /* gezupfter Ton (Ukulele/Marimba-artig) */
  function pluck(ctx, dest, t, midi, dur, vol, bright) {
    const f = mtof(midi);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = 'triangle'; o2.type = 'sine';
    o1.frequency.value = f; o2.frequency.value = f * 2;
    const g = ctx.createGain(), g2 = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = bright || 3200;
    g2.gain.value = 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.12, dur));
    o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(lp); lp.connect(dest);
    o1.start(t); o2.start(t);
    o1.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }

  function noiseBurst(ctx, dest, t, dur, vol, hp, lpf) {
    const s = ctx.createBufferSource();
    s.buffer = getNoise(ctx);
    const f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = hp ? 'highpass' : 'lowpass'; f.frequency.value = hp || lpf || 800;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t); s.stop(t + dur + 0.02);
  }

  function tone(ctx, dest, t, type, f0, f1, dur, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.02);
  }

  /* ---------- Ein Takt der Musik ---------- */
  function scheduleBar(ctx, dest, bar, t0) {
    const ch = CHORDS[bar], mel = MELODY[bar];
    const at = function (i) { return t0 + i * EIGHTH + (i % 2 ? EIGHTH * SWING : 0); };

    // Melodie (Ukulele)
    for (let i = 0; i < 8; i++) {
      if (mel[i] === null) continue;
      let len = 1;
      while (i + len < 8 && mel[i + len] === null && len < 3) len++;
      pluck(ctx, dest, at(i), mel[i], len * EIGHTH * 1.4 + 0.12, 0.13, 3600);
    }
    // Bass: "Oom-pah"
    pluck(ctx, dest, at(0), ch.r, EIGHTH * 2, 0.20, 900);
    pluck(ctx, dest, at(3), ch.r + 12, EIGHTH * 1, 0.09, 900);
    pluck(ctx, dest, at(4), ch.r + 7, EIGHTH * 2, 0.17, 900);
    pluck(ctx, dest, at(6), ch.r, EIGHTH * 1.5, 0.12, 900);
    // Akkord-Anschläge auf 2 und 4
    [2, 6].forEach(function (i) {
      ch.t.forEach(function (n, k) { pluck(ctx, dest, at(i) + k * 0.012, n, EIGHTH * 1.2, 0.045, 2400); });
    });
    // Shaker + Holzblock
    for (let i = 0; i < 8; i++) noiseBurst(ctx, dest, at(i), 0.05, i % 2 ? 0.028 : 0.014, 6500);
    tone(ctx, dest, at(4), 'sine', 1000, 700, 0.05, 0.05);

    // Alberne Extras
    if (bar === 7) { tone(ctx, dest, at(6), 'sine', 500, 1200, 0.16, 0.05); }
    if (bar === 15) {
      const o = ctx.createOscillator(), g = ctx.createGain(), t = at(6);
      o.type = 'sine';
      o.frequency.setValueAtTime(420, t);
      o.frequency.exponentialRampToValueAtTime(1100, t + 0.1);
      o.frequency.exponentialRampToValueAtTime(340, t + 0.32);
      g.gain.setValueAtTime(0.09, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
      o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.4);
    }
  }

  /* ---------- Audio-Kette (Master -> Kompressor; Musik mit Echo) ---------- */
  function buildChain(ctx) {
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4;
    const master = ctx.createGain(); master.gain.value = 0.9;
    master.connect(comp); comp.connect(ctx.destination);

    const music = ctx.createGain(); music.gain.value = 0.55;
    const dry = ctx.createGain(); dry.gain.value = 1;
    const delay = ctx.createDelay(1); delay.delayTime.value = EIGHTH * 3;
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const wet = ctx.createGain(); wet.gain.value = 0.22;
    const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2200;
    music.connect(dry); dry.connect(master);
    music.connect(delay); delay.connect(dlp); dlp.connect(fb); fb.connect(delay); dlp.connect(wet); wet.connect(master);

    const sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(master);
    return { master: master, music: music, sfx: sfx };
  }

  /* ---------- Live-Wiedergabe ---------- */
  let chain = null, timer = null, nextBar = 0, barIdx = 0;

  function tick() {
    const ctx = A.ctx;
    if (!ctx || !A.music) return;
    while (nextBar < ctx.currentTime + 0.5) {
      scheduleBar(ctx, chain.music, barIdx, nextBar);
      nextBar += EIGHTH * 8;
      barIdx = (barIdx + 1) % CHORDS.length;
    }
  }
  function startMusic() {
    if (!A.ctx || timer) return;
    nextBar = Math.max(nextBar, A.ctx.currentTime + 0.15);
    tick();
    timer = setInterval(tick, 120);
  }
  function stopMusic() {
    if (timer) { clearInterval(timer); timer = null; }
    // Kette kurz stummschalten, damit schon geplante Töne nicht mehr zu hören sind
    if (chain && A.ctx) {
      chain.music.gain.cancelScheduledValues(A.ctx.currentTime);
      chain.music.gain.setValueAtTime(0, A.ctx.currentTime);
    }
    nextBar = 0;
  }

  A.unlock = function () {
    if (A.ready) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      A.ctx = new AC();
      chain = buildChain(A.ctx);
      A.ready = true;
      if (A.ctx.state === 'suspended') A.ctx.resume();
      if (A.music) startMusic();
    } catch (e) { A.ready = false; }
  };

  A.setMusic = function (on) {
    A.music = !!on; saveSettings();
    if (!A.ready) return;
    if (on) { chain.music.gain.cancelScheduledValues(A.ctx.currentTime); chain.music.gain.setValueAtTime(0.55, A.ctx.currentTime); startMusic(); }
    else stopMusic();
    FF.emit('audio');
  };
  A.setSfx = function (on) {
    A.sfxOn = !!on; saveSettings();
    if (!on) A.rainStop();
    else if (FF.weather && FF.weather.active) A.rainStart();
    FF.emit('audio');
  };

  /* ---------- Effekte ---------- */
  A.sfx = function (name, arg) {
    if (!A.ready || !A.sfxOn || A.ctx.state !== 'running') return;
    const ctx = A.ctx, d = chain.sfx, t = ctx.currentTime + 0.01;
    switch (name) {
      case 'coin':
        tone(ctx, d, t, 'sine', 988, 988, 0.09, 0.09);
        tone(ctx, d, t + 0.08, 'sine', 1319, 1319, 0.2, 0.09);
        break;
      case 'good':
        tone(ctx, d, t, 'triangle', 523, 523, 0.1, 0.08);
        tone(ctx, d, t + 0.09, 'triangle', 784, 784, 0.16, 0.08);
        break;
      case 'blip':
        tone(ctx, d, t, 'square', arg || 220, (arg || 220) * 0.95, 0.045, 0.028);
        break;
      case 'honk':
        for (let k = 0; k < 2; k++) {
          tone(ctx, d, t + k * 0.28, 'sawtooth', 392, 388, 0.2, 0.06);
          tone(ctx, d, t + k * 0.28, 'square', 494, 490, 0.2, 0.035);
        }
        break;
      case 'putter': {           // knatternder Motor, arg = Dauer in Sekunden
        const dur = arg || 1.2;
        for (let x = 0; x < dur; x += 0.11) {
          tone(ctx, d, t + x, 'sine', 90, 55, 0.09, 0.14);
          noiseBurst(ctx, d, t + x, 0.06, 0.05, 0, 500);
        }
        break;
      }
      case 'cough':
        noiseBurst(ctx, d, t, 0.35, 0.16, 0, 700);
        tone(ctx, d, t, 'sawtooth', 130, 45, 0.35, 0.09);
        break;
      case 'clang':
        [700, 1130, 1670].forEach(function (f, k) { tone(ctx, d, t + k * 0.01, 'sine', f, f, 0.5 - k * 0.1, 0.07); });
        break;
      case 'boing':
        tone(ctx, d, t, 'sine', 300, 900, 0.12, 0.08);
        tone(ctx, d, t + 0.12, 'sine', 900, 250, 0.25, 0.08);
        break;
      case 'thunder':
        noiseBurst(ctx, d, t, 1.1, 0.2, 0, 240);
        tone(ctx, d, t, 'sine', 58, 38, 1.0, 0.16);
        tone(ctx, d, t + 0.05, 'sine', 90, 50, 0.5, 0.08);
        break;
    }
  };

  /* ---------- Regen-Dauerklang (Start/Stopp statt einmaligem Effekt) ---------- */
  let rainSrc = null, rainGain = null;
  A.rainStart = function () {
    if (!A.ready || !A.sfxOn || A.ctx.state !== 'running' || rainSrc) return;
    const ctx = A.ctx;
    const src = ctx.createBufferSource();
    src.buffer = getNoise(ctx); src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.5;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    src.connect(f); f.connect(g); g.connect(chain.sfx);
    src.start();
    g.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 2);
    rainSrc = src; rainGain = g;
  };
  A.rainStop = function () {
    if (!rainSrc || !A.ctx) return;
    const ctx = A.ctx, node = rainSrc, g = rainGain;
    rainSrc = null; rainGain = null;
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setValueAtTime(g.gain.value, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
    setTimeout(function () { try { node.stop(); } catch (e) { /* egal */ } }, 1400);
  };

  /* ---------- Test: eine Minute Musik ohne Lautsprecher rendern ---------- */
  A.renderOffline = function (bars) {
    const sr = 22050, len = Math.ceil(bars * EIGHTH * 8 * sr) + sr;
    const ctx = new OfflineAudioContext(1, len, sr);
    const c = buildChain(ctx);
    for (let b = 0; b < bars; b++) scheduleBar(ctx, c.music, b % CHORDS.length, b * EIGHTH * 8);
    return ctx.startRendering();
  };

  /* ---------- Start bei der ersten Eingabe (Browser erlauben Ton erst nach einem Klick) ---------- */
  function onGesture() { A.unlock(); }
  window.addEventListener('pointerdown', onGesture, { capture: true });
  window.addEventListener('keydown', onGesture, { capture: true });
  document.addEventListener('visibilitychange', function () {
    if (!A.ctx) return;
    if (document.hidden) A.ctx.suspend();
    else if (A.ready) A.ctx.resume();
  });
})();
