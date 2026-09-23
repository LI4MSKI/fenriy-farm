/* WILDTIERE: Schmetterlinge & Hasen wandern rein optisch über dein Land (auch über Felder).
 * Kein Gameplay-Effekt, kein Speicherstand nötig - werden bei jedem Start neu "ausgesetzt". */
(function () {
  const C = FF.config, T = C.tile;
  FF.wildlife = [];

  function randOwnedPoint() {
    const S = FF.state;
    if (!S || !S.plots.length) return null;
    const key = S.plots[Math.floor(Math.random() * S.plots.length)];
    const parts = key.split(',');
    const px = parseInt(parts[0], 10), py = parseInt(parts[1], 10);
    const tx = px * C.plotSize + 1 + Math.floor(Math.random() * (C.plotSize - 2));
    const ty = py * C.plotSize + 1 + Math.floor(Math.random() * (C.plotSize - 2));
    return { x: tx * T + 8, y: ty * T + 8 };
  }

  function makeCritter() {
    const kind = Math.random() < 0.5 ? 'butterfly' : 'rabbit';
    const p = randOwnedPoint() || { x: 0, y: 0 };
    return { kind: kind, v: Math.floor(Math.random() * 4), x: p.x, y: p.y, tx: p.x, ty: p.y,
      st: 'wait', t: Math.random() * 2, step: Math.random() * 10, flip: false };
  }

  /* Ein paar Tiere mehr, je mehr Land du besitzt (Obergrenze, damit es nicht überladen wirkt) */
  FF.syncWildlife = function () {
    const S = FF.state;
    if (!S) return;
    const n = Math.min(9, 2 + Math.floor(S.plots.length / 3));
    while (FF.wildlife.length < n) FF.wildlife.push(makeCritter());
    while (FF.wildlife.length > n) FF.wildlife.pop();
  };

  FF.resetWildlife = function () {
    FF.wildlife.length = 0;
    FF.syncWildlife();
  };

  function moveTo(c, x, y, dt, speed) {
    const dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy);
    if (d <= 1) return true;
    const step = Math.min(d, speed * dt);
    c.x += dx / d * step; c.y += dy / d * step;
    c.step += dt * (c.kind === 'butterfly' ? 10 : 7);
    if (Math.abs(dx) > 0.3) c.flip = dx < 0;
    return d <= step;
  }

  FF.updateWildlife = function (dt) {
    const list = FF.wildlife;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c.st === 'wait') {
        c.t -= dt;
        if (c.t <= 0) {
          const p = randOwnedPoint();
          if (p) { c.tx = p.x; c.ty = p.y; c.st = 'go'; } else c.t = 1;
        }
      } else {
        const speed = c.kind === 'butterfly' ? 26 : 34;
        if (moveTo(c, c.tx, c.ty, dt, speed)) { c.st = 'wait'; c.t = 1 + Math.random() * (c.kind === 'butterfly' ? 2 : 3); }
      }
    }
  };

  FF.on('plot', FF.syncWildlife);
})();
