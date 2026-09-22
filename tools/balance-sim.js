/* Balance-Simulation für Fenriy Farm
 *
 * Nutzung:   node tools/balance-sim.js
 *
 * Ein "Bot" spielt das Spiel gierig durch (kauft immer das, was sich am schnellsten
 * amortisiert) und zeigt, wie lange man bis zum Ziel braucht. Nach jeder Änderung
 * an den Preisen in js/data/*.js einmal laufen lassen.
 *
 * Optionen:  --eff=0.7  (wie effizient der Spieler ist, 1 = perfekt, 0.7 = normal)
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..', 'js');
const ctx = { window: {}, console };
ctx.window = ctx;
vm.createContext(ctx);
['core/boot.js', 'data/config.js', 'data/crops.js', 'data/trees.js', 'data/animals.js',
 'data/decor.js', 'data/upgrades.js', 'data/factories.js', 'data/greenhouses.js', 'data/ranks.js'].forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
});
const FF = ctx.FF;
const C = FF.content, CFG = FF.config;

const argEff = (process.argv.find(a => a.startsWith('--eff=')) || '').split('=')[1];
const PLAYER_EFF = argEff ? parseFloat(argEff) : 0.75;
const FIELD_COST = 25;               // muss zu logic.js passen (FF.config.fieldCost)
const FIELD_COST_REAL = CFG.fieldCost || FIELD_COST;
const PATH_SHARE = 0.10;             // Anteil Fläche für Wege/Deko
const FIXED_TILES = 9 + 6;           // Haus + Scheune
const MAX_PLOTS = CFG.worldPlots.w * CFG.worldPlots.h;

function up(s, effect) {
  const u = C.upgrades.find(x => x.effect === effect);
  if (!u) return 1;
  const lvl = s.up[u.id] || 0;
  return lvl ? u.values[lvl - 1] : u.base;
}
function upLvl(s, effect) {
  const u = C.upgrades.find(x => x.effect === effect);
  return u ? (s.up[u.id] || 0) : 0;
}
function bestCrop(s) {
  const g = growthMult(s), pm = up(s, 'price');
  let best = null, br = -1;
  for (const c of C.crops) {
    if (!s.unl[c.id]) continue;
    const r = (c.yield * pm - c.seed) / (c.time / g);
    if (r > br) { br = r; best = c; }
  }
  return { crop: best, rate: br };
}
function efficiency(s) {
  const h = upLvl(s, 'harvester') > 0, a = upLvl(s, 'autosow') > 0;
  if (h && a) return 1;
  if (h) return 0.6;            // geerntet, aber Felder bleiben leer bis man neu sät
  return PLAYER_EFF;
}
function passiveEff(s) { return upLvl(s, 'harvester') > 0 ? 1 : PLAYER_EFF; }
function ghMult(s) {
  let m = 1;
  for (const gh of C.greenhouses) { const n = s.gh[gh.id] || 0; if (n && gh.growth) m *= Math.pow(1 + gh.growth, n); }
  return m;
}
function growthMult(s) { return up(s, 'growth') * ghMult(s); }
function factoryReady(s, f) {
  if (!f.need) return true;
  if (f.need.crop) return !!s.unl[f.need.crop];
  if (f.need.animal) return (s.pens[f.need.animal] || 0) > 0;
  return true;
}

function income(s) {
  const g = growthMult(s), pm = up(s, 'price');
  const bc = bestCrop(s);
  const rawField = s.F * bc.rate;
  let rawPas = 0, items = bc.crop ? s.F / (bc.crop.time / g) : 0;
  for (const t of C.trees) { const n = s.trees[t.id] || 0; rawPas += n * t.value * pm / (t.interval / g); items += n / (t.interval / g); }
  for (const a of C.animals) { const n = s.pens[a.id] || 0; rawPas += n * a.value * pm / (a.interval / g); items += n / (a.interval / g); }
  for (const f of C.factories) { const n = s.facs[f.id] || 0; rawPas += n * f.value * pm / (f.interval / g); items += n / (f.interval / g); }
  for (const gh of C.greenhouses) { const n = s.gh[gh.id] || 0; rawPas += n * gh.value * pm / (gh.interval / g); items += n / (gh.interval / g); }
  // Arbeiter: ca. 0,8 Ernten/s pro Arbeiter (bei Tempo 1), ernten + säen neu + verkaufen mit Bonus
  const W = up(s, 'workers') || 0, sp = up(s, 'workerspeed') || 1;
  const share = items > 0 ? Math.min(1, (W * 0.8 * sp) / items) : 0;
  const bonus = CFG.workerBonus || 1;
  const fEff = efficiency(s), pEff = passiveEff(s);
  return rawField * (fEff * (1 - share) + bonus * share) + rawPas * (pEff * (1 - share) + bonus * share);
}
function used(s) {
  let u = s.F;
  for (const t of C.trees) u += s.trees[t.id] || 0;
  for (const a of C.animals) u += (s.pens[a.id] || 0) * a.w * a.h;
  for (const f of C.factories) u += (s.facs[f.id] || 0) * f.w * f.h;
  for (const gh of C.greenhouses) u += (s.gh[gh.id] || 0) * gh.w * gh.h;
  return u;
}
function capacityTiles(s) {
  return Math.floor((s.plots * CFG.plotSize * CFG.plotSize - FIXED_TILES) * (1 - PATH_SHARE));
}
function clone(s) {
  return { ...s, unl: { ...s.unl }, up: { ...s.up }, trees: { ...s.trees }, pens: { ...s.pens }, facs: { ...s.facs }, gh: { ...s.gh } };
}

/* Wert pro Kachel der einzelnen Anlagen (für Ersetzen) */
function perTile(s) {
  const g = growthMult(s), pm = up(s, 'price');
  const list = [];
  const bc = bestCrop(s);
  if (s.F > 0) list.push({ type: 'field', id: 'field', size: 1, count: s.F, rate: bc.rate, cost: FIELD_COST_REAL });
  for (const t of C.trees) if (s.trees[t.id]) list.push({ type: 'tree', id: t.id, size: 1, count: s.trees[t.id], rate: t.value * pm / (t.interval / g), cost: t.cost });
  for (const a of C.animals) if (s.pens[a.id]) list.push({ type: 'pen', id: a.id, size: a.w * a.h, count: s.pens[a.id], rate: a.value * pm / (a.interval / g) / (a.w * a.h), cost: a.cost });
  for (const f of C.factories) if (s.facs[f.id]) list.push({ type: 'factory', id: f.id, size: f.w * f.h, count: s.facs[f.id], rate: f.value * pm / (f.interval / g) / (f.w * f.h), cost: f.cost });
  for (const gh of C.greenhouses) if (s.gh[gh.id]) list.push({ type: 'green', id: gh.id, size: gh.w * gh.h, count: s.gh[gh.id], rate: gh.value * pm / (gh.interval / g) / (gh.w * gh.h), cost: gh.cost });
  return list.sort((x, y) => x.rate - y.rate);
}
function removeTiles(s, need) {
  let refund = 0;
  while (capacityTiles(s) - used(s) < need) {
    const list = perTile(s);
    if (!list.length) return null;
    const w = list[0];
    if (w.type === 'field') { s.F--; refund += FIELD_COST_REAL * CFG.refund; }
    else if (w.type === 'tree') { s.trees[w.id]--; refund += w.cost * CFG.refund; }
    else if (w.type === 'pen') { s.pens[w.id]--; refund += w.cost * CFG.refund; }
    else if (w.type === 'factory') { s.facs[w.id]--; refund += w.cost * CFG.refund; }
    else { s.gh[w.id]--; refund += w.cost * CFG.refund; }
  }
  return refund;
}

function options(s) {
  const opts = [];
  const cur = income(s);
  const add = (name, cost, build) => {
    const s2 = clone(s);
    const extra = build(s2);          // gibt zusätzliche Kosten/Erstattung zurück oder null
    if (extra === null) return;
    const total = cost + extra;
    const gain = income(s2) - cur;
    if (gain <= 0 && !name.startsWith('Grundstück')) return;
    opts.push({ name, cost: Math.max(total, 0), gain, s2, plot: name.startsWith('Grundstück') });
  };
  const spaceFor = (s2, size) => {
    if (capacityTiles(s2) - used(s2) >= size) return 0;
    if (s2.plots < MAX_PLOTS) return null;   // erst Grundstück kaufen (eigene Option)
    return -removeTiles(s2, size);           // ersetzen
  };

  for (const c of C.crops) if (!s.unl[c.id] && c.unlock > 0) add('Pflanze ' + c.name, c.unlock, s2 => { s2.unl[c.id] = 1; return 0; });
  add('Feld', FIELD_COST_REAL, s2 => { const e = spaceFor(s2, 1); if (e === null) return null; s2.F++; return e; });
  for (const t of C.trees) add('Baum ' + t.name, t.cost, s2 => { const e = spaceFor(s2, 1); if (e === null) return null; s2.trees[t.id] = (s2.trees[t.id] || 0) + 1; return e; });
  for (const a of C.animals) add('Tier ' + a.name, a.cost, s2 => { const e = spaceFor(s2, a.w * a.h); if (e === null) return null; s2.pens[a.id] = (s2.pens[a.id] || 0) + 1; return e; });
  for (const f of C.factories) if (factoryReady(s, f)) add('Fabrik ' + f.name, f.cost, s2 => { const e = spaceFor(s2, f.w * f.h); if (e === null) return null; s2.facs[f.id] = (s2.facs[f.id] || 0) + 1; return e; });
  for (const gh of C.greenhouses) add('Gewächshaus ' + gh.name, gh.cost, s2 => { const e = spaceFor(s2, gh.w * gh.h); if (e === null) return null; s2.gh[gh.id] = (s2.gh[gh.id] || 0) + 1; return e; });
  for (const u of C.upgrades) {
    const lvl = s.up[u.id] || 0;
    if (lvl < u.costs.length) add('Upgrade ' + u.name + ' ' + (lvl + 1), u.costs[lvl], s2 => { s2.up[u.id] = lvl + 1; return 0; });
  }
  if (s.plots < MAX_PLOTS) {
    const price = CFG.plotPrice(s.plots);
    // Grundstück lohnt sich nur, wenn der Platz voll ist
    if (capacityTiles(s) - used(s) < 4) {
      const s2 = clone(s); s2.plots++;
      // Gewinn = Platz für ~ beste Anlage pro Kachel
      const pt = perTile(s);
      const best = Math.max(...pt.map(x => x.rate), 0.01);
      opts.push({ name: 'Grundstück ' + (s.plots), cost: price, gain: best * 20, s2, plot: true });
    }
  }
  return opts;
}

/* ------- Simulation ------- */
let s = {
  money: CFG.startMoney, total: 0, t: 0,
  plots: 1, F: 12, unl: { wheat: 1 }, up: {}, trees: {}, pens: {}, facs: {}, gh: {}
};
const log = [];
const milestones = [1e3, 1e4, 1e5, 1e6, 1e7, 5e7, CFG.goal];
let mi = 0;
let guard = 0;

function advance(sec) {
  const inc = income(s);
  s.money += inc * sec; s.total += inc * sec; s.t += sec;
  while (mi < milestones.length && s.total >= milestones[mi]) {
    log.push({ label: 'Gesamt verdient ' + milestones[mi].toLocaleString('de-DE'), t: s.t, plots: s.plots, inc: income(s) });
    mi++;
  }
}

while (s.total < CFG.goal && s.t < 3600 * 200 && guard++ < 20000) {
  const inc = Math.max(income(s), 0.0001);
  const opts = options(s);
  if (!opts.length) { advance(10); continue; }
  let best = null, bs = Infinity;
  for (const o of opts) {
    const wait = Math.max(0, (o.cost - s.money) / inc);
    const score = wait + o.cost / Math.max(o.gain, 1e-9);
    // Kaufe nichts, das sich in dieser Phase nie amortisiert (Restzeit-Schätzung)
    if (score < bs) { bs = score; best = o; }
  }
  if (!best) { advance(10); continue; }
  const wait = Math.max(0, (best.cost - s.money) / inc);
  advance(wait);
  s.money = Math.max(0, s.money - best.cost);
  const { money, total, t } = s;
  s = best.s2; s.money = money; s.total = total; s.t = t;
  if (best.plot) { /* plots++ ist schon in s2 */ }
  if (guard % 1 === 0 && (best.name.startsWith('Pflanze') || best.name.startsWith('Tier') || best.name.startsWith('Baum') || best.name.startsWith('Upgrade') || best.name.startsWith('Grundstück') || best.name.startsWith('Fabrik') || best.name.startsWith('Gewächshaus'))) {
    log.push({ label: '  gekauft: ' + best.name, t: s.t, plots: s.plots, inc: income(s) });
  }
}

const fmt = t => { const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60); return h + 'h ' + String(m).padStart(2, '0') + 'm'; };
const short = n => n >= 1e6 ? (n / 1e6).toFixed(1) + ' Mio' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : n.toFixed(1);
console.log('Spieler-Effizienz (ohne Erntehelfer): ' + PLAYER_EFF);
console.log('Zeit       Ereignis                         Grundstücke   Einkommen/s');
for (const l of log) console.log(fmt(l.t).padEnd(10), l.label.padEnd(34), String(l.plots).padEnd(12), short(l.inc));
console.log('\n=> Ziel ' + CFG.goal.toLocaleString('de-DE') + ' Fenriy erreicht nach ' + fmt(s.t) + (s.total < CFG.goal ? '  (NICHT erreicht!)' : ''));
