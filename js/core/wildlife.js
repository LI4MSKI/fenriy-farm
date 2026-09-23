/* WILDTIERE: Schmetterlinge & Hasen wandern rein optisch über dein Land (auch über Felder).
 * Baust du Zäune, fangen sich Hasen darin: sie bleiben in der Nähe der Zäune und zählen als
 * "Zaun-Tiere" (siehe FF.corralCapacity in logic.js) - die produzieren dann passiv Fenriy.
 * Kein eigener Speicherstand nötig - werden bei jedem Start neu "ausgesetzt"/eingefangen. */
(function () {
  const C = FF.config, T = C.tile;
  FF.wildlife = [];

  function isFenceEnt(e) {
    if (e.k !== 'decor') return false;
    const d = FF.find('decor', e.t);
    return d && d.art.type === 'fence';
  }

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

  /* Punkt in der Nähe eines zufälligen gebauten Zauns (für die "eingefangenen" Zaun-Tiere) */
  function randFenceAreaPoint() {
    const S = FF.state;
    if (!S) return null;
    const fences = S.ents.filter(isFenceEnt);
    if (!fences.length) return null;
    const f = fences[Math.floor(Math.random() * fences.length)];
    const tx = f.x + Math.floor((Math.random() - 0.5) * 5);
    const ty = f.y + Math.floor((Math.random() - 0.5) * 5);
    return { x: tx * T + 8, y: ty * T + 8 };
  }

  function makeCritter(caught) {
    const kind = caught ? 'rabbit' : (Math.random() < 0.5 ? 'butterfly' : 'rabbit');
    const p = (caught ? randFenceAreaPoint() : randOwnedPoint()) || { x: 0, y: 0 };
    return { kind: kind, caught: !!caught, v: Math.floor(Math.random() * 4), x: p.x, y: p.y, tx: p.x, ty: p.y,
      st: 'wait', t: Math.random() * 2, step: Math.random() * 10, flip: false };
  }

  /* Ein paar frei laufende Tiere mehr, je mehr Land du besitzt, plus ein paar Zaun-Tiere je nach
   * eingefangener Kapazität (Obergrenzen, damit es nicht überladen wirkt). */
  FF.syncWildlife = function () {
    const S = FF.state;
    if (!S) return;
    const nFree = Math.min(9, 2 + Math.floor(S.plots.length / 3));
    const nCaught = Math.min(6, FF.corralCapacity ? FF.corralCapacity() : 0);
    let free = FF.wildlife.filter(function (c) { return !c.caught; });
    let caught = FF.wildlife.filter(function (c) { return c.caught; });
    while (free.length < nFree) { const c = makeCritter(false); FF.wildlife.push(c); free.push(c); }
    while (free.length > nFree) { const c = free.pop(); FF.wildlife.splice(FF.wildlife.indexOf(c), 1); }
    while (caught.length < nCaught) { const c = makeCritter(true); FF.wildlife.push(c); caught.push(c); }
    while (caught.length > nCaught) { const c = caught.pop(); FF.wildlife.splice(FF.wildlife.indexOf(c), 1); }
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
          const p = c.caught ? randFenceAreaPoint() : randOwnedPoint();
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
