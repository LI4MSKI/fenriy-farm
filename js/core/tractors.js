/* TRAKTOREN: fahren während des aktiven Spiels automatisch reife Felder ab, mähen (ernten) sie
 * und säen sofort wieder ein (unabhängig von der Sämaschine). Ersetzen den alten "Erntehelfer".
 * Anzahl kommt vom Upgrade 'tractors' (FF.M.tractors). Kein eigener Speicherstand nötig -
 * werden bei jedem Start/Kauf neu aufgestellt (FF.syncTractors). */
(function () {
  const C = FF.config, T = C.tile;
  FF.tractors = [];
  const reserved = new Set();
  const SKINS = ['green', 'red', 'yellow', 'blue'];

  function housePoint() {
    const h = FF.state.ents.find(function (e) { return e.k === 'house'; });
    if (!h) return { x: 0, y: 0 };
    return { x: (h.x + h.w / 2) * T, y: (h.y + h.h) * T + 14 };
  }

  function makeTractor(i, hp) {
    const hx = hp.x + ((i % 3) - 1) * 22, hy = hp.y + Math.floor(i / 3) * 14;
    return { i: i, skin: SKINS[i % SKINS.length], x: hx, y: hy, hx: hx, hy: hy, st: 'idle',
      t: Math.random() * 0.6, tx: hx, ty: hy, target: null, step: Math.random() * 10, moving: false, flip: false };
  }

  function release(tr) { if (tr.target) { reserved.delete(tr.target); tr.target = null; } }

  /* Traktoren-Anzahl an das Upgrade anpassen (nach Kauf/Laden/Neustart) */
  FF.syncTractors = function () {
    if (!FF.state) return;
    const n = Math.floor((FF.M && FF.M.tractors) || 0);
    const hp = housePoint();
    while (FF.tractors.length < n) FF.tractors.push(makeTractor(FF.tractors.length, hp));
    while (FF.tractors.length > n) { const tr = FF.tractors.pop(); release(tr); }
  };

  FF.resetTractors = function () {
    FF.tractors.forEach(release);
    FF.tractors.length = 0;
    reserved.clear();
    FF.syncTractors();
  };

  function isReadyField(e) {
    if (!e || e.k !== 'field' || FF.entAt(e.x, e.y) !== e) return false;
    return FF.fieldReady(e);
  }

  function targetPoint(e) { return { x: e.x * T + 8, y: e.y * T + 15 }; }

  /* Nächstes freies, reifes Feld */
  function pick(tr) {
    const ents = FF.state.ents;
    let best = null, bd = Infinity;
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      if (e.k !== 'field' || reserved.has(e) || !isReadyField(e)) continue;
      const p = targetPoint(e);
      const d = (p.x - tr.x) * (p.x - tr.x) + (p.y - tr.y) * (p.y - tr.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  function moveTo(tr, x, y, dt) {
    const dx = x - tr.x, dy = y - tr.y, d = Math.hypot(dx, dy);
    const step = 50 * dt;
    if (d <= step) { tr.x = x; tr.y = y; tr.moving = false; return true; }
    tr.x += dx / d * step; tr.y += dy / d * step;
    tr.moving = true; tr.step += dt * 7;
    if (Math.abs(dx) > 0.5) tr.flip = dx < 0;
    return false;
  }

  function goTo(tr, e) {
    const p = targetPoint(e);
    tr.target = e; reserved.add(e);
    tr.tx = p.x; tr.ty = p.y; tr.st = 'go';
  }

  FF.updateTractors = function (dt) {
    const list = FF.tractors;
    if (!list.length) return;
    for (let i = 0; i < list.length; i++) {
      const tr = list[i];
      switch (tr.st) {
        case 'idle': {
          tr.t -= dt;
          if (tr.t <= 0) {
            tr.t = 0.5;
            const e = pick(tr);
            if (e) { goTo(tr, e); break; }
          }
          moveTo(tr, tr.hx, tr.hy, dt);
          break;
        }
        case 'go': {
          if (!isReadyField(tr.target)) { release(tr); tr.st = 'idle'; tr.t = 0; break; }
          if (moveTo(tr, tr.tx, tr.ty, dt)) { tr.st = 'work'; tr.t = 0.7; }
          break;
        }
        case 'work': {
          tr.t -= dt;
          if (tr.t > 0) break;
          const e = tr.target;
          if (isReadyField(e)) FF.harvestField(e, false, { replant: true });
          release(tr);
          tr.st = 'idle'; tr.t = 0;
          break;
        }
      }
    }
  };
})();
