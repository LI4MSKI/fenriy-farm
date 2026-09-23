/* JAHRESZEITEN: Frühling, Sommer, Herbst, Winter im Wechsel.
 * Wirkt sich auf Wiese/Bäume aus (siehe sprites.js) und leicht auf das Wachstum:
 * Sommer etwas schneller, Winter etwas langsamer im Freien. Produktionsstätten und
 * Gewächshäuser sind "drinnen" und bleiben von der Jahreszeit unbeeinflusst.
 * Dauer ändern: DUR unten anpassen (Sekunden aktiver Spielzeit pro Jahreszeit). */
(function () {
  const S = FF.season = {};
  const NAMES = ['Frühling', 'Sommer', 'Herbst', 'Winter'];
  const SHORT = ['FR', 'SO', 'HE', 'WI'];
  const MULT = [1, 1.05, 1, 0.85];
  const DUR = 300; // Sekunden pro Jahreszeit (5 Min. aktiv gespielt = 1 Jahreszeit, 20 Min. = 1 Jahr)

  function st() { return (FF.state && FF.state.season) || { idx: 0, t: 0 }; }

  S.idx = function () { return st().idx; };
  S.name = function () { return NAMES[st().idx]; };
  S.short = function () { return SHORT[st().idx]; };
  S.mult = function () { return MULT[st().idx]; };
  S.progress = function () { return st().t / DUR; };

  S.update = function (dt) {
    const state = FF.state;
    if (!state) return;
    if (!state.season) state.season = { idx: 0, t: 0 };
    const sea = state.season;
    sea.t += dt;
    if (sea.t >= DUR) {
      sea.t -= DUR;
      sea.idx = (sea.idx + 1) % 4;
      FF.emit('toast', { msg: NAMES[sea.idx] + ' hat begonnen.', type: 'good' });
      FF.emit('season', sea.idx);
    }
  };

  /* Sanft fallende Schneeflocken im Winter (rein optisch, Bildschirm-Ebene).
   * Position wird deterministisch aus der Spielzeit t berechnet (kein eigener dt-Zustand nötig). */
  let flakes = null;
  function makeFlakes() {
    const n = 30, list = [];
    for (let i = 0; i < n; i++) {
      list.push({ x0: Math.random(), y0: Math.random(), spNorm: 0.02 + Math.random() * 0.025, sway: Math.random() * 6.28, r: 1 + Math.random() * 1.4 });
    }
    return list;
  }
  S.draw = function (ctx, w, h, pr, t) {
    if (S.idx() !== 3) return;
    if (!flakes) flakes = makeFlakes();
    const ww = w * pr, hh = h * pr;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < flakes.length; i++) {
      const f = flakes[i];
      const y = (f.y0 + t * f.spNorm) % 1;
      const x = (f.x0 + Math.sin(t * 0.6 + f.sway) * 0.015) * ww;
      const yy = y * hh;
      const r = f.r * pr;
      ctx.fillRect(Math.round(x - r / 2), Math.round(yy - r / 2), Math.round(r), Math.round(r));
    }
  };
})();
