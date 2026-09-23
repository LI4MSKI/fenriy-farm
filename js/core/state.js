/* SPIELSTAND: Daten, Raster, Speichern & Laden (mit Migration für Updates) */
(function () {
  const C = FF.config;
  const WT = { w: C.plotSize * C.worldPlots.w, h: C.plotSize * C.worldPlots.h };
  FF.WT = WT;

  /* ---- kleiner Event-Bus (Logik -> Oberfläche) ---- */
  const handlers = {};
  FF.on = function (evt, fn) { (handlers[evt] = handlers[evt] || []).push(fn); };
  FF.emit = function (evt, data) { (handlers[evt] || []).forEach(function (fn) { fn(data); }); };

  FF.plotKey = function (px, py) { return px + ',' + py; };
  FF.plotOf = function (tx, ty) { return { x: Math.floor(tx / C.plotSize), y: Math.floor(ty / C.plotSize) }; };

  /* ---- neuer Spielstand ---- */
  FF.newState = function () {
    const sp = C.startPlot, ox = sp.x * C.plotSize, oy = sp.y * C.plotSize;
    const S = {
      sv: C.saveVersion,
      money: C.startMoney,
      total: 0,
      plots: [FF.plotKey(sp.x, sp.y)],
      crops: { wheat: true },
      upg: {},
      seed: 'wheat',
      ents: [],
      savedAt: Date.now(),
      playSec: 0,
      autoT: 0,
      stats: { harvests: 0, collected: 0, built: 0 },
      won: false,
      seen: { intro: false },
      season: { idx: 0, t: 0 },
      playerName: '',
      corral: { p: 0, n: 0 }
    };
    S.ents.push({ k: 'house', x: ox + 1, y: oy + 1, w: 3, h: 3 });
    S.ents.push({ k: 'barn', x: ox + 5, y: oy + 1, w: 3, h: 2 });
    for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) {
      S.ents.push({ k: 'field', x: ox + 1 + x, y: oy + 5 + y, w: 1, h: 1, c: null, p: 0, last: null });
    }
    return S;
  };

  /* ---- Raster: welche Entität steht auf welcher Kachel ---- */
  FF.grid = new Array(WT.w * WT.h);
  FF.entAt = function (x, y) {
    if (x < 0 || y < 0 || x >= WT.w || y >= WT.h) return null;
    return FF.grid[y * WT.w + x] || null;
  };
  FF.setGrid = function (e, val) {
    for (let j = 0; j < e.h; j++) for (let i = 0; i < e.w; i++) FF.grid[(e.y + j) * WT.w + (e.x + i)] = val;
  };
  FF.rebuildGrid = function () {
    FF.grid.fill(undefined);
    FF.state.ents.forEach(function (e) { FF.setGrid(e, e); });
  };
  FF.isOwnedPlot = function (px, py) { return FF.state.plots.indexOf(FF.plotKey(px, py)) >= 0; };
  FF.owned = function (tx, ty) {
    if (tx < 0 || ty < 0 || tx >= WT.w || ty >= WT.h) return false;
    const p = FF.plotOf(tx, ty);
    return FF.isOwnedPlot(p.x, p.y);
  };

  /* ---- Definition zu einer Entität finden ---- */
  FF.defOf = function (e) {
    switch (e.k) {
      case 'tree': return FF.find('trees', e.t);
      case 'pen': return FF.find('animals', e.t);
      case 'factory': return FF.find('factories', e.t);
      case 'green': return FF.find('greenhouses', e.t);
      case 'decor': return FF.find('decor', e.t);
      default: return null;
    }
  };

  /* ---- Speichern / Laden ---- */
  FF.save = function () {
    try {
      if (FF.flushWorkers) FF.flushWorkers();
      FF.state.savedAt = Date.now();
      localStorage.setItem(C.saveKey, JSON.stringify(FF.state));
      return true;
    } catch (e) { return false; }
  };

  /* Migrationen: Wenn du das Speicherformat änderst, C.saveVersion um 1 erhöhen
   * und hier eine Funktion unter der ALTEN Versionsnummer ergänzen. */
  const MIGRATIONS = {
    // 1: function (S) { /* S von Version 1 auf 2 umbauen */ }
  };

  FF.parseSave = function (text) {
    let S;
    try { S = JSON.parse(text); } catch (e) { return null; }
    if (!S || typeof S !== 'object' || !Array.isArray(S.ents) || !Array.isArray(S.plots)) return null;
    while ((S.sv || 1) < C.saveVersion) {
      const m = MIGRATIONS[S.sv || 1];
      if (m) m(S);
      S.sv = (S.sv || 1) + 1;
    }
    // Fehlende Felder mit Standardwerten auffüllen (neue Updates)
    const base = FF.newState();
    Object.keys(base).forEach(function (k) { if (S[k] === undefined) S[k] = base[k]; });
    S.stats = Object.assign({}, base.stats, S.stats);
    S.crops.wheat = true;
    // Unbekannte Inhalte (z.B. entfernte Pflanzen) aussortieren
    S.ents = S.ents.filter(function (e) {
      if (!e || typeof e.x !== 'number' || typeof e.y !== 'number') return false;
      if (e.k === 'tree') { const d = FF.find('trees', e.t); if (!d) return false; e.w = 1; e.h = 1; return true; }
      if (e.k === 'pen') { const d = FF.find('animals', e.t); if (!d) return false; e.w = d.w; e.h = d.h; return true; }
      if (e.k === 'factory') { const d = FF.find('factories', e.t); if (!d) return false; e.w = d.w; e.h = d.h; return true; }
      if (e.k === 'green') { const d = FF.find('greenhouses', e.t); if (!d) return false; e.w = d.w; e.h = d.h; return true; }
      if (e.k === 'decor') { if (!FF.find('decor', e.t)) return false; e.w = 1; e.h = 1; return true; }
      if (e.k === 'field') { e.w = 1; e.h = 1; if (e.c && !FF.find('crops', e.c)) { e.c = null; e.p = 0; } return true; }
      return e.k === 'house' || e.k === 'barn';
    });
    if (!FF.find('crops', S.seed) || !S.crops[S.seed]) S.seed = 'wheat';
    return S;
  };

  FF.load = function () {
    let text = null;
    try { text = localStorage.getItem(C.saveKey); } catch (e) { return null; }
    return text ? FF.parseSave(text) : null;
  };

  FF.reset = function () {
    try { localStorage.removeItem(C.saveKey); } catch (e) { /* ignorieren */ }
    FF.state = FF.newState();
    FF.rebuildGrid();
  };
})();
