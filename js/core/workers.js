/* ARBEITER: laufen über die Farm, ernten Reifes, säen neu, tragen alles zum Markt (Scheune) und verkaufen mit Bonus */
(function () {
  const C = FF.config, T = C.tile;
  FF.workers = [];
  const reserved = new Set();

  function barnPoint() {
    const b = FF.state.ents.find(function (e) { return e.k === 'barn'; });
    if (!b) return { x: 0, y: 0, tx: 0, ty: 0 };
    return { x: (b.x + b.w / 2) * T, y: (b.y + b.h) * T + 6, tx: b.x + 1, ty: b.y + b.h };
  }

  function makeWorker(i, bp) {
    const hx = bp.x + ((i % 4) - 1.5) * 11, hy = bp.y + 6 + Math.floor(i / 4) * 9;
    return { i: i, v: i, x: hx, y: hy, hx: hx, hy: hy, st: 'idle', t: Math.random() * 0.5, tx: hx, ty: hy,
      target: null, n: 0, val: 0, step: 0, moving: false, flip: false };
  }

  function release(w) { if (w.target) { reserved.delete(w.target); w.target = null; } }

  FF.syncWorkers = function () {
    if (!FF.state) return;
    const n = Math.floor(FF.M.workers || 0);
    const bp = barnPoint();
    while (FF.workers.length < n) FF.workers.push(makeWorker(FF.workers.length, bp));
    while (FF.workers.length > n) { const w = FF.workers.pop(); release(w); }
  };

  /* Arbeiter neu aufstellen (nach Import/Neustart) */
  FF.resetWorkers = function () {
    FF.workers.forEach(release);
    FF.workers.length = 0;
    reserved.clear();
    FF.syncWorkers();
  };

  /* Leeres Feld + genug Geld für das gewählte Saatgut (oder Notsaat) -> Arbeiter säen */
  function canSow(e) {
    const S = FF.state;
    if (e.c || !S.seed || !S.crops[S.seed]) return false;
    const c = FF.find('crops', S.seed);
    return !!c && (S.money >= c.seed || FF.isBroke());
  }

  function isReady(e) {
    if (!e || FF.entAt(e.x, e.y) !== e) return false;
    if (e.k === 'field') return FF.fieldReady(e) || canSow(e);
    if (e.k === 'tree' || e.k === 'pen') return e.n > 0;
    return false;
  }

  function targetPoint(e) {
    if (e.k === 'field') return { x: e.x * T + 8, y: e.y * T + 14 };
    if (e.k === 'tree') return { x: e.x * T + 8, y: e.y * T + 17 };
    return { x: (e.x + e.w / 2) * T, y: (e.y + e.h) * T + 5 };
  }

  /* Nächstes freies, fertiges Ziel */
  function pick(w) {
    const ents = FF.state.ents;
    let best = null, bd = Infinity;
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      if ((e.k !== 'field' && e.k !== 'tree' && e.k !== 'pen') || reserved.has(e) || !isReady(e)) continue;
      const p = targetPoint(e);
      const d = (p.x - w.x) * (p.x - w.x) + (p.y - w.y) * (p.y - w.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function moveTo(w, x, y, dt) {
    const dx = x - w.x, dy = y - w.y, d = Math.hypot(dx, dy);
    const step = 46 * (FF.M.workerSpeed || 1) * dt;
    if (d <= step) { w.x = x; w.y = y; w.moving = false; return true; }
    w.x += dx / d * step; w.y += dy / d * step;
    w.moving = true; w.step += dt * 9;
    if (Math.abs(dx) > 0.5) w.flip = dx < 0;
    return false;
  }

  function goTo(w, e) {
    const p = targetPoint(e);
    w.target = e; reserved.add(e);
    w.tx = p.x; w.ty = p.y; w.st = 'go';
  }

  function goSell(w) { release(w); w.st = 'sell'; }

  FF.updateWorkers = function (dt) {
    const list = FF.workers;
    if (!list.length) return;
    const bp = barnPoint();
    const cap = C.workerCarry || 6;
    for (let i = 0; i < list.length; i++) {
      const w = list[i];
      switch (w.st) {
        case 'idle': {
          w.t -= dt;
          if (w.t <= 0) {
            w.t = 0.4;
            const e = pick(w);
            if (e) { goTo(w, e); break; }
            if (w.n > 0) { goSell(w); break; }
          }
          moveTo(w, w.hx, w.hy, dt);
          break;
        }
        case 'go': {
          if (!isReady(w.target)) { release(w); w.st = w.n > 0 ? 'sell' : 'idle'; w.t = 0; break; }
          if (moveTo(w, w.tx, w.ty, dt)) { w.st = 'work'; w.t = 0.5; }
          break;
        }
        case 'work': {
          w.t -= dt;
          if (w.t > 0) break;
          const e = w.target;
          if (isReady(e) && e.k === 'field' && !e.c) {
            FF.plant(e, FF.state.seed);            // säen (kostet Saatgut, bringt noch nichts zum Tragen)
          } else if (isReady(e)) {
            const gain = e.k === 'field' ? FF.harvestField(e, true, { carry: true, replant: true }) : FF.collect(e, true, { carry: true });
            w.val += gain; w.n++;
          }
          release(w);
          if (w.n >= cap) { w.st = 'sell'; break; }
          const nx = pick(w);
          if (nx) goTo(w, nx);
          else if (w.n > 0) w.st = 'sell';
          else { w.st = 'idle'; w.t = 0; }
          break;
        }
        case 'sell': {
          if (moveTo(w, bp.x + ((w.i % 3) - 1) * 6, bp.y, dt)) { w.st = 'selling'; w.t = 0.4; }
          break;
        }
        case 'selling': {
          w.t -= dt;
          if (w.t <= 0) {
            const total = w.val * (C.workerBonus || 1);
            if (total > 0) {
              FF.earn(total, bp.tx, bp.ty);
              if (FF.audio) FF.audio.sfx('coin');
            }
            w.n = 0; w.val = 0; w.st = 'idle'; w.t = 0.2;
          }
          break;
        }
      }
    }
  };

  /* Beim Speichern: getragene Ware sofort verkaufen, damit nichts verloren geht */
  FF.flushWorkers = function () {
    if (!FF.workers.length || !FF.state) return;
    FF.workers.forEach(function (w) {
      if (w.val > 0) { FF.earn(w.val * (C.workerBonus || 1), 0, 0, true); w.val = 0; w.n = 0; }
    });
  };
})();
