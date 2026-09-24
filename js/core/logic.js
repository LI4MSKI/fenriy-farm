/* SPIELLOGIK: Wachstum, Ernten, Bauen, Kaufen, Upgrades */
(function () {
  const C = FF.config, U = FF.util;
  const rt = FF.rt = { recent: [], rate: 0, rateT: 0, rankIdx: 0, toastAt: {} };

  /* ---------- Upgrade-Werte (Wachstum, Preis, ...) ---------- */
  FF.M = { growth: 1, price: 1, capacity: 5, tractors: 0, autosow: 0, workers: 0, workerSpeed: 1 };
  FF.recalc = function () {
    const S = FF.state;
    const M = { growth: 1, price: 1, capacity: 5, tractors: 0, autosow: 0, workers: 0, workerSpeed: 1 };
    FF.content.upgrades.forEach(function (u) {
      const lvl = S.upg[u.id] || 0;
      const v = lvl > 0 ? u.values[Math.min(lvl, u.values.length) - 1] : u.base;
      switch (u.effect) {
        case 'growth': M.growth *= v; break;
        case 'price': M.price *= v; break;
        case 'capacity': M.capacity = Math.max(M.capacity, v); break;
        case 'tractors': M.tractors = Math.max(M.tractors, v); break;
        case 'autosow': if (v > 0) M.autosow = 1; break;
        case 'workers': M.workers = Math.max(M.workers, v); break;
        case 'workerspeed': M.workerSpeed *= v; break;
      }
    });
    if (S && S.ents) {
      for (let i = 0; i < S.ents.length; i++) {
        const e = S.ents[i];
        if (e.k !== 'green') continue;
        const gd = FF.find('greenhouses', e.t);
        if (gd && gd.growth) M.growth *= (1 + gd.growth);
      }
    }
    FF.M = M;
    if (FF.syncWorkers) FF.syncWorkers();
    if (FF.syncTractors) FF.syncTractors();
  };

  FF.toastOnce = function (key, msg, type, gap) {
    const now = Date.now();
    if (rt.toastAt[key] && now - rt.toastAt[key] < (gap || 1500)) return;
    rt.toastAt[key] = now;
    FF.emit('toast', { msg: msg, type: type || 'warn' });
  };

  /* ---------- Rang & Ziel ---------- */
  FF.rankInfo = function () {
    const list = FF.content.ranks, t = FF.state.total;
    let idx = 0;
    for (let i = 0; i < list.length; i++) if (t >= list[i].at) idx = i;
    return { idx: idx, cur: list[idx], next: list[idx + 1] || null };
  };

  FF.earn = function (amount, tx, ty, quiet) {
    const S = FF.state;
    S.money += amount; S.total += amount;
    rt.recent.push({ t: S.playSec, a: amount });
    if (!quiet && tx !== undefined) FF.emit('float', { x: tx * C.tile + 8, y: ty * C.tile, text: '+' + U.fmt(amount), col: '#ffe27a' });
    const r = FF.rankInfo();
    if (r.idx > rt.rankIdx) { rt.rankIdx = r.idx; FF.emit('rank', r.cur); }
    if (!S.won && S.total >= C.goal) { S.won = true; FF.emit('win'); }
  };

  /* ---------- Wachstum ---------- */
  FF.fieldReady = function (e) {
    if (!e.c) return false;
    const c = FF.find('crops', e.c);
    return !!c && e.p >= c.time - 1e-6;
  };
  FF.stageOf = function (e, crop) {
    if (!crop) return 0;
    if (e.p >= crop.time - 1e-6) return 3;
    return Math.min(2, Math.floor(e.p / crop.time * 3));
  };

  FF.advance = function (dt) {
    const S = FF.state, g = FF.M.growth, cap = FF.M.capacity;
    const wm = FF.weather ? FF.weather.mult : 1;
    const sm = FF.season ? FF.season.mult() : 1; // Jahreszeit: wirkt nur im Freien (Feld/Baum/Tierfarm), nicht in Gebäuden
    const ents = S.ents;
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      if (e.k === 'field') {
        if (!e.c) continue;
        const c = FF.find('crops', e.c);
        if (c && e.p < c.time) e.p = Math.min(c.time, e.p + dt * g * wm * sm);
      } else if (e.k === 'tree' || e.k === 'pen' || e.k === 'factory' || e.k === 'green' || e.k === 'mine') {
        const d = FF.defOf(e);
        if (!d) continue;
        if (e.n >= cap) { e.p = 0; continue; }
        const outdoor = (e.k === 'tree' || e.k === 'pen') ? sm : 1;
        const tot = e.p + dt * g * wm * outdoor;
        const add = Math.floor(tot / d.interval);
        e.n = Math.min(cap, e.n + add);
        e.p = e.n >= cap ? 0 : tot - add * d.interval;
      }
    }
    // Zaun-Tiere: eingefangene Wildtiere produzieren passiv (draußen, wirkt also die Jahreszeit mit)
    if (S.corral) {
      const corralCap = FF.corralCapacity();
      if (corralCap > 0 && S.corral.n < cap) {
        const tot = S.corral.p + dt * g * wm * sm * corralCap;
        const add = Math.floor(tot / C.corralInterval);
        S.corral.n = Math.min(cap, S.corral.n + add);
        S.corral.p = S.corral.n >= cap ? 0 : tot - add * C.corralInterval;
      } else if (corralCap === 0) {
        S.corral.p = 0;
      }
    }
  };

  /* ---------- Ernten & Säen ---------- */
  /* Pleite und nichts wächst? Dann gibt es Notsaat vom billigsten Saatgut (verhindert Sackgassen). */
  FF.isBroke = function () {
    const S = FF.state;
    let cheapest = Infinity;
    FF.content.crops.forEach(function (c) { if (S.crops[c.id] && c.seed < cheapest) cheapest = c.seed; });
    if (S.money >= cheapest) return false;
    for (let i = 0; i < S.ents.length; i++) {
      const e = S.ents[i];
      if ((e.k === 'field' && e.c) || ((e.k === 'tree' || e.k === 'pen') && e.n > 0)) return false;
    }
    return true;
  };

  FF.plant = function (e, cropId) {
    const S = FF.state;
    let c = FF.find('crops', cropId);
    if (!c || !S.crops[cropId]) return false;
    if (S.money < c.seed) {
      if (FF.isBroke()) {
        // Notsaat: billigste freigeschaltete Pflanze, kostenlos
        FF.content.crops.forEach(function (o) { if (S.crops[o.id] && o.seed < c.seed) c = o; });
        e.c = c.id; e.p = 0; e.last = c.id;
        FF.toastOnce('nosaat', 'Notsaat: ' + c.name + ' wurde kostenlos gesät.', 'good', 4000);
        return true;
      }
      FF.toastOnce('seed', 'Nicht genug Fenriy für ' + c.name + '-Saatgut (' + U.fmt(c.seed) + '). Wähle günstigeres Saatgut.');
      return false;
    }
    S.money -= c.seed; e.c = cropId; e.p = 0; e.last = cropId;
    return true;
  };

  /* opts.carry: Geld wird nicht sofort gutgeschrieben (Arbeiter tragen es zum Markt)
   * opts.replant: Feld wird auch ohne Sämaschine neu bestellt (Arbeiter säen neu) */
  FF.harvestField = function (e, quiet, opts) {
    const S = FF.state, c = FF.find('crops', e.c);
    if (!c) return 0;
    const gain = c.yield * FF.M.price * (FF.events ? FF.events.priceMult : 1);
    if (!(opts && opts.carry)) FF.earn(gain, e.x, e.y, quiet);
    S.stats.harvests++;
    e.last = e.c;
    if ((FF.M.autosow || (opts && opts.replant)) && S.money >= c.seed) { S.money -= c.seed; e.p = 0; }
    else { e.c = null; e.p = 0; }
    return gain;
  };

  FF.collect = function (e, quiet, opts) {
    if (!e.n) return 0;
    const d = FF.defOf(e);
    if (!d) return 0;
    const gain = e.n * d.value * FF.M.price * (FF.events ? FF.events.priceMult : 1);
    FF.state.stats.collected += e.n;
    e.n = 0;
    if (!(opts && opts.carry)) FF.earn(gain, e.x + (e.w - 1) / 2, e.y, quiet);
    return gain;
  };

  /* ---------- Zaun-Tiere ---------- */
  /* Anzahl gebauter Zaun-Kacheln (jede Zaun-Art zählt gleich). */
  FF.fenceCount = function () {
    const S = FF.state;
    let n = 0;
    for (let i = 0; i < S.ents.length; i++) {
      const e = S.ents[i];
      if (e.k !== 'decor') continue;
      const d = FF.find('decor', e.t);
      if (d && d.art.type === 'fence') n++;
    }
    return n;
  };
  FF.corralCapacity = function () { return Math.min(C.corralMaxAnimals, Math.floor(FF.fenceCount() / C.fenceTilesPerAnimal)); };
  FF.corralRate = function () {
    const cap = FF.corralCapacity();
    return cap > 0 ? cap * C.corralValue * FF.M.price / C.corralInterval : 0;
  };
  FF.collectCorral = function (tx, ty, quiet) {
    const S = FF.state;
    if (!S.corral || !S.corral.n) return 0;
    const gain = S.corral.n * C.corralValue * FF.M.price * (FF.events ? FF.events.priceMult : 1);
    S.stats.collected += S.corral.n;
    S.corral.n = 0;
    FF.earn(gain, tx, ty, quiet);
    return gain;
  };

  /* Klick/Ziehen mit dem Ernte-Werkzeug auf einer Kachel */
  FF.actTile = function (tx, ty) {
    const e = FF.entAt(tx, ty);
    if (!e || !FF.owned(tx, ty)) return null;
    if (e.k === 'field') {
      if (FF.fieldReady(e)) { FF.harvestField(e); return 'harvest'; }
      if (!e.c) {
        const S = FF.state;
        if (!S.seed || !S.crops[S.seed]) return null;
        if (FF.plant(e, S.seed)) return 'plant';
      }
      return null;
    }
    if ((e.k === 'tree' || e.k === 'pen' || e.k === 'factory' || e.k === 'green' || e.k === 'mine') && e.n > 0) { FF.collect(e); return 'collect'; }
    if (e.k === 'decor') {
      const d = FF.find('decor', e.t);
      if (d && d.art.type === 'fence' && FF.state.corral && FF.state.corral.n > 0) { FF.collectCorral(e.x, e.y); return 'collect'; }
    }
    return null;
  };

  /* Erntehelfer: alles Fertige einsammeln */
  FF.autoSweep = function () {
    const S = FF.state;
    let total = 0, count = 0;
    const ents = S.ents;
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      if (e.k === 'field' && FF.fieldReady(e)) { total += FF.harvestField(e, true); count++; }
      else if ((e.k === 'tree' || e.k === 'pen' || e.k === 'factory' || e.k === 'green' || e.k === 'mine') && e.n > 0) { total += FF.collect(e, true); count++; }
      else if (e.k === 'field' && !e.c && FF.M.autosow && e.last) {
        const c = FF.find('crops', e.last);
        if (c && S.crops[e.last] && S.money >= c.seed) { S.money -= c.seed; e.c = e.last; e.p = 0; }
      }
    }
    if (S.corral && S.corral.n > 0) { total += FF.collectCorral(0, 0, true); count++; }
    if (total > 0) FF.emit('float', { x: 0, y: 0, text: '+' + U.fmt(total), col: '#ffe27a', hud: true });
    return total;
  };

  /* ---------- Bauen ---------- */
  FF.itemCost = function (kind, def) {
    const base = kind === 'field' ? C.fieldCost : def.cost;
    const cm = (kind === 'field' || kind === 'tree' || kind === 'pen' || kind === 'factory' || kind === 'green' || kind === 'mine') && FF.events ? FF.events.costMult : 1;
    return Math.max(1, Math.round(base * cm));
  };
  FF.itemSize = function (kind, def) { return (kind === 'pen' || kind === 'factory' || kind === 'green' || kind === 'mine') ? { w: def.w, h: def.h } : { w: 1, h: 1 }; };

  /* Voraussetzung für Produktionsstätten (z.B. erst Weizen freischalten oder Schweinestall bauen) */
  FF.factoryReady = function (f) {
    if (!f.need) return true;
    const S = FF.state;
    if (f.need.crop) return !!S.crops[f.need.crop];
    if (f.need.animal) return S.ents.some(function (e) { return e.k === 'pen' && e.t === f.need.animal; });
    return true;
  };
  FF.factoryNeedText = function (f) {
    if (!f.need) return '';
    if (f.need.crop) { const c = FF.find('crops', f.need.crop); return c ? c.name + ' freischalten' : ''; }
    if (f.need.animal) { const a = FF.find('animals', f.need.animal); return a ? a.name + ' bauen' : ''; }
    return '';
  };

  FF.canPlace = function (kind, def, x, y) {
    const s = FF.itemSize(kind, def);
    for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) {
      const tx = x + i, ty = y + j;
      if (tx < 0 || ty < 0 || tx >= FF.WT.w || ty >= FF.WT.h) return 'Außerhalb der Karte';
      if (!FF.owned(tx, ty)) return 'Grundstück noch nicht gekauft';
      if (FF.entAt(tx, ty)) return 'Hier ist schon etwas';
    }
    return null;
  };

  FF.place = function (kind, def, x, y) {
    const S = FF.state;
    const why = FF.canPlace(kind, def, x, y);
    if (why) return why;
    if (kind === 'factory' && !FF.factoryReady(def)) return 'Zuerst nötig: ' + FF.factoryNeedText(def);
    const cost = FF.itemCost(kind, def);
    if (S.money < cost) return 'Nicht genug Fenriy (' + U.fmt(cost) + ')';
    const s = FF.itemSize(kind, def);
    let e;
    if (kind === 'field') e = { k: 'field', x: x, y: y, w: 1, h: 1, c: null, p: 0, last: null };
    else if (kind === 'tree') e = { k: 'tree', x: x, y: y, w: 1, h: 1, t: def.id, p: 0, n: 0 };
    else if (kind === 'pen' || kind === 'factory' || kind === 'green' || kind === 'mine') e = { k: kind, x: x, y: y, w: s.w, h: s.h, t: def.id, p: 0, n: 0 };
    else e = { k: 'decor', x: x, y: y, w: 1, h: 1, t: def.id };
    S.money -= cost;
    S.ents.push(e);
    FF.setGrid(e, e);
    S.stats.built++;
    if (kind === 'field' && S.seed && S.crops[S.seed]) {
      const c = FF.find('crops', S.seed);
      if (c && S.money >= c.seed) FF.plant(e, S.seed);
    }
    if (kind === 'green') FF.recalc();
    if (kind === 'decor' && def.art.type === 'fence' && FF.syncWildlife) FF.syncWildlife();
    return null;
  };

  FF.demolish = function (tx, ty) {
    const S = FF.state;
    const e = FF.entAt(tx, ty);
    if (!e || !FF.owned(tx, ty)) return null;
    if (e.k === 'house' || e.k === 'barn') return 'Das kann man nicht abreißen';
    let cost = 0;
    if (e.k === 'field') cost = C.fieldCost;
    else { const d = FF.defOf(e); cost = d ? d.cost : 0; }
    // Vorrat noch schnell mitnehmen
    if ((e.k === 'tree' || e.k === 'pen' || e.k === 'factory' || e.k === 'green' || e.k === 'mine') && e.n > 0) FF.collect(e);
    const refund = Math.floor(cost * C.refund);
    S.money += refund;
    const wasFence = e.k === 'decor' && (function () { const d = FF.find('decor', e.t); return d && d.art.type === 'fence'; })();
    FF.setGrid(e, undefined);
    S.ents.splice(S.ents.indexOf(e), 1);
    if (e.k === 'green') FF.recalc();
    if (wasFence && FF.syncWildlife) FF.syncWildlife();
    if (refund > 0) FF.emit('float', { x: tx * C.tile + 8, y: ty * C.tile, text: '+' + U.fmt(refund), col: '#b8e8ff' });
    return null;
  };

  /* ---------- Grundstücke ---------- */
  FF.plotPrice = function () { return C.plotPrice(FF.state.plots.length); };
  FF.plotBuyable = function (px, py) {
    if (px < 0 || py < 0 || px >= C.worldPlots.w || py >= C.worldPlots.h) return false;
    if (FF.isOwnedPlot(px, py)) return false;
    return FF.isOwnedPlot(px - 1, py) || FF.isOwnedPlot(px + 1, py) || FF.isOwnedPlot(px, py - 1) || FF.isOwnedPlot(px, py + 1);
  };
  FF.buyPlot = function (px, py) {
    const S = FF.state;
    if (!FF.plotBuyable(px, py)) return 'Nur Grundstücke neben deinem Land können gekauft werden';
    const price = FF.plotPrice();
    if (S.money < price) return 'Nicht genug Fenriy (' + U.fmt(price) + ')';
    S.money -= price;
    S.plots.push(FF.plotKey(px, py));
    FF.emit('toast', { msg: 'Neues Grundstück gekauft!', type: 'good' });
    FF.emit('plot', { x: px, y: py });
    return null;
  };

  /* ---------- Pflanzen freischalten & Upgrades ---------- */
  FF.unlockCrop = function (id) {
    const S = FF.state, c = FF.find('crops', id);
    if (!c || S.crops[id]) return 'Schon freigeschaltet';
    if (S.money < c.unlock) return 'Nicht genug Fenriy (' + U.fmt(c.unlock) + ')';
    S.money -= c.unlock; S.crops[id] = true; S.seed = id;
    FF.emit('toast', { msg: c.name + ' freigeschaltet!', type: 'good' });
    return null;
  };

  FF.upgradeCost = function (u) {
    const lvl = FF.state.upg[u.id] || 0;
    return lvl >= u.costs.length ? null : u.costs[lvl];
  };
  FF.buyUpgrade = function (id) {
    const S = FF.state, u = FF.find('upgrades', id);
    if (!u) return 'Unbekanntes Upgrade';
    const cost = FF.upgradeCost(u);
    if (cost === null) return 'Schon auf der höchsten Stufe';
    if (S.money < cost) return 'Nicht genug Fenriy (' + U.fmt(cost) + ')';
    S.money -= cost;
    S.upg[id] = (S.upg[id] || 0) + 1;
    FF.recalc();
    FF.emit('toast', { msg: u.effect === 'workers' ? 'Neuer Arbeiter eingestellt!' : u.effect === 'tractors' ? 'Neuer Traktor gekauft!' : u.name + ' verbessert!', type: 'good' });
    return null;
  };

  /* ---------- Anzeige-Werte ---------- */
  /* Einnahmen pro Sekunde eines Gegenstands (für Bau-Menü und Tooltips) */
  FF.itemRate = function (kind, def) {
    const g = FF.M.growth, pm = FF.M.price;
    if (kind === 'crop') return (def.yield * pm - def.seed) / (def.time / g);
    if (kind === 'tree' || kind === 'pen' || kind === 'factory' || kind === 'green' || kind === 'mine') return def.value * pm / (def.interval / g);
    return 0;
  };

  /* ---------- Zeitfortschritt ---------- */
  FF.update = function (dt) {
    const S = FF.state;
    S.playSec += dt;
    FF.advance(dt);
    // Aktiv im Spiel übernehmen die Traktoren (Felder) und Arbeiter (alles) das automatische
    // Einsammeln - kein unsichtbarer globaler Auto-Sweep mehr (siehe FF.offline für "während du weg warst").
    // Einkommen pro Sekunde (gleitender Durchschnitt über 15 s)
    rt.rateT += dt;
    if (rt.rateT >= 0.5) {
      rt.rateT = 0;
      const from = S.playSec - 15;
      while (rt.recent.length && rt.recent[0].t < from) rt.recent.shift();
      let sum = 0;
      for (let i = 0; i < rt.recent.length; i++) sum += rt.recent[i].a;
      rt.rate = sum / Math.max(3, Math.min(15, S.playSec));
    }
  };

  /* Spiel war geschlossen / Tab im Hintergrund */
  FF.offline = function (sec) {
    sec = Math.min(sec, C.offlineCapHours * 3600);
    if (sec < 5) { FF.update(sec); return null; }
    const S = FF.state;
    const before = S.total;
    FF.advance(sec);
    let swept = 0;
    if (FF.M.tractors > 0) swept = FF.autoSweep();
    return { sec: sec, swept: swept, earned: S.total - before };
  };

  /* ---------- Bauer (nur Optik) ---------- */
  FF.farmer = { x: 0, y: 0, tx: 0, ty: 0, step: 0, moving: false, flip: false };
  FF.farmerGo = function (tx, ty) {
    FF.farmer.tx = tx * C.tile + 8;
    FF.farmer.ty = ty * C.tile + 12;
  };
  FF.updateFarmer = function (dt) {
    const f = FF.farmer;
    const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy);
    if (d > 1.5) {
      const sp = Math.min(d, 70 * dt);
      f.x += dx / d * sp; f.y += dy / d * sp;
      f.moving = true; f.step += dt * 8;
      if (Math.abs(dx) > 0.5) f.flip = dx < 0;
    } else f.moving = false;
  };
})();
