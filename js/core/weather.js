/* WETTER: seltener, kurzer Regen (manchmal ein Gewitter mit Blitz & Donner).
 * Während des Regens wachsen Felder, Bäume, Tierfarmen und Produktionsstätten etwas schneller.
 * Zeiten ändern: MIN_GAP/MAX_GAP (Abstand zwischen Ereignissen) und MIN_DUR/MAX_DUR (Dauer) unten anpassen. */
(function () {
  const C = FF.config;
  const W = FF.weather = { active: false, storm: false, t: 0, dur: 0, mult: 1, drops: [], flash: 0 };

  const MIN_GAP = 240, MAX_GAP = 480;   // Sekunden Spielzeit zwischen zwei Wetterereignissen (selten)
  const MIN_DUR = 14, MAX_DUR = 24;     // Sekunden Dauer eines Regens (kurz)
  const GROWTH_BOOST = 1.18;            // +18 % Wachstum während es regnet
  const STORM_CHANCE = 0.35;            // Anteil der Regen-Ereignisse, die ein Gewitter sind

  W.next = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);

  function makeDrops() {
    const n = 60, list = [];
    for (let i = 0; i < n; i++) list.push({ x: Math.random(), y: Math.random(), sp: 300 + Math.random() * 160, len: 8 + Math.random() * 7 });
    return list;
  }

  function startRain() {
    W.active = true; W.t = 0;
    W.dur = MIN_DUR + Math.random() * (MAX_DUR - MIN_DUR);
    W.storm = Math.random() < STORM_CHANCE;
    W.mult = GROWTH_BOOST;
    W.drops = makeDrops();
    W.nextFlash = 1.5 + Math.random() * 3;
    if (FF.audio && FF.audio.rainStart) FF.audio.rainStart();
    FF.emit('toast', { msg: W.storm ? 'Ein Gewitter zieht auf!' : 'Es fängt an zu regnen.', type: 'good' });
  }

  function stopRain() {
    W.active = false; W.storm = false; W.mult = 1; W.flash = 0;
    if (FF.audio && FF.audio.rainStop) FF.audio.rainStop();
    W.next = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
  }

  /* Wird pro Bild aufgerufen (nur während echtem Spielen, nicht beim Offline-Fortschritt) */
  W.update = function (dt) {
    if (!FF.state) return;
    if (!W.active) {
      W.next -= dt;
      if (W.next <= 0) startRain();
      return;
    }
    W.t += dt;
    const h = window.innerHeight || 700;
    for (let i = 0; i < W.drops.length; i++) {
      const p = W.drops[i];
      p.y += (p.sp * dt) / h;
      if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); }
    }
    if (W.flash > 0) W.flash = Math.max(0, W.flash - dt * 3.2);
    if (W.storm) {
      W.nextFlash -= dt;
      if (W.nextFlash <= 0) {
        W.flash = 0.85;
        if (FF.audio) FF.audio.sfx('thunder');
        W.nextFlash = 3 + Math.random() * 6;
      }
    }
    if (W.t >= W.dur) stopRain();
  };

  /* Bildschirm-Ebene: Regentropfen, leichte Abdunklung, Blitz. Wird ganz am Ende von R.draw aufgerufen. */
  W.draw = function (ctx, w, h, pr, t) {
    if (!W.active && W.flash <= 0) return;
    const ww = w * pr, hh = h * pr;
    if (W.active) {
      ctx.fillStyle = 'rgba(18,26,50,' + (W.storm ? 0.3 : 0.18) + ')';
      ctx.fillRect(0, 0, ww, hh);
      ctx.strokeStyle = 'rgba(215,232,255,0.7)';
      ctx.lineWidth = Math.max(1, pr);
      ctx.beginPath();
      for (let i = 0; i < W.drops.length; i++) {
        const p = W.drops[i], x = p.x * ww, y = p.y * hh;
        ctx.moveTo(x, y); ctx.lineTo(x - 4 * pr, y + p.len * pr);
      }
      ctx.stroke();
    }
    if (W.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (W.flash * 0.55).toFixed(2) + ')';
      ctx.fillRect(0, 0, ww, hh);
    }
  };
})();
