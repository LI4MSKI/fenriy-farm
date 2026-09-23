/* OBERFLÄCHE: HUD, Werkzeugleiste, Panels, Tooltips, Meldungen */
(function () {
  const U = FF.util, C = FF.config, art = FF.art;
  const UI = FF.ui = {};
  const $ = function (id) { return document.getElementById(id); };

  let panel = null;               // 'build' | 'upgrades' | 'info' | null
  let buildTab = 'land';
  let lastSel = null;
  let modalOpen = false;
  let seedSig = '';
  const FIELD_DEF = { id: 'field', name: 'Feld', cost: C.fieldCost };

  function coinHtml() { return '<img class="coin-img s" src="' + art.icon('coin') + '" alt="">'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function price(n) { return coinHtml() + ' ' + U.fmt(n); }
  function isSmall() { return window.innerWidth < 700; }

  /* ---------- Meldungen ---------- */
  UI.toast = function (msg, type) {
    const box = $('toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + (type || '');
    el.textContent = msg;
    box.appendChild(el);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 3200);
  };

  /* ---------- Modal ---------- */
  UI.closeModal = function () { $('modalWrap').classList.add('hidden'); $('modalWrap').innerHTML = ''; modalOpen = false; };
  UI.modal = function (o) {
    const wrap = $('modalWrap');
    wrap.innerHTML = '<div class="modal"><h3></h3><div class="mbody"></div><div class="mfoot"></div></div>';
    wrap.querySelector('h3').textContent = o.title;
    wrap.querySelector('.mbody').innerHTML = o.body || '';
    const foot = wrap.querySelector('.mfoot');
    (o.buttons || [{ label: 'OK' }]).forEach(function (b) {
      const btn = document.createElement('button');
      btn.className = 'btn ' + (b.cls || '');
      btn.textContent = b.label;
      if (b.disabled) btn.disabled = true;
      btn.onclick = function () { if (!b.keep) UI.closeModal(); if (b.fn) b.fn(wrap); };
      foot.appendChild(btn);
    });
    wrap.onclick = function (e) { if (e.target === wrap && !o.sticky) UI.closeModal(); };
    wrap.classList.remove('hidden');
    modalOpen = true;
  };

  /* ---------- HUD ---------- */
  function hudUpdate() {
    const S = FF.state;
    $('money').textContent = U.fmt(S.money);
    $('rate').textContent = FF.rt.rate > 0.05 ? '+' + U.fmtRate(FF.rt.rate) + ' / s' : '';
    const r = FF.rankInfo();
    $('rank').textContent = r.cur.name;
    $('goalText').textContent = U.fmt(S.total) + ' / ' + U.fmt(C.goal);
    const pct = Math.min(1, S.total / C.goal) * 100;
    $('goalBar').style.width = (pct > 0 && pct < 1 ? 1 : pct) + '%';
    if (FF.season) {
      const el = $('hudSeason');
      el.className = 'box hud-season s' + FF.season.idx();
      $('seasonLabel').textContent = FF.season.name() + (FF.events && FF.events.buff ? ' · ' + (FF.events.buff === 'merchant' ? '-20% Bau' : '+25% Verkauf') : '');
    }
  }

  /* ---------- Zufalls-Ereignis-Karte ---------- */
  function eventUpdate() {
    const card = $('eventCard'), o = FF.events && FF.events.offer;
    if (!o) { card.classList.add('hidden'); return; }
    const info = FF.events.typeInfo(o.type);
    card.classList.remove('hidden');
    $('eventTitle').textContent = info.name;
    $('eventDesc').textContent = info.desc;
    $('eventBar').style.width = Math.max(0, Math.min(100, (FF.events.offerT / FF.events.OFFER_WIN) * 100)) + '%';
  }

  /* ---------- Saatgut-Leiste ---------- */
  function renderSeedbar(force) {
    const S = FF.state, bar = $('seedbar');
    const show = FF.tool === 'farm' || (FF.tool === 'build' && FF.buildSel && FF.buildSel.kind === 'field');
    bar.classList.toggle('hidden', !show);
    if (!show) return;
    const sig = S.seed + '|' + Object.keys(S.crops).join(',') + '|' + FF.M.growth + '|' + FF.M.price;
    if (!force && sig === seedSig) return;
    seedSig = sig;
    let h = '';
    FF.content.crops.forEach(function (c) {
      const un = !!S.crops[c.id];
      const sub = un ? '+' + U.fmtRate(FF.itemRate('crop', c)) + '/s pro Feld' : coinHtml() + ' ' + U.fmt(c.unlock);
      h += '<button class="chip' + (un && S.seed === c.id ? ' sel' : '') + (un ? '' : ' locked') + '" data-crop="' + c.id + '"' +
        (un ? '' : ' data-cost="' + c.unlock + '"') + '><img src="' + art.icon('crop', c) + '" alt=""><span>' + esc(c.name) + '<small>' + sub + '</small></span></button>';
    });
    bar.innerHTML = h;
  }

  /* ---------- Panels ---------- */
  function tabsHtml(list, cur) {
    return '<div class="tabs">' + list.map(function (t) {
      return '<button class="tab' + (t.id === cur ? ' on' : '') + '" data-tab="' + t.id + '">' + t.label + '</button>';
    }).join('') + '</div>';
  }

  function buildItems(tab) {
    const out = [];
    if (tab === 'land') {
      out.push({ kind: 'field', def: FIELD_DEF });
      FF.content.decor.forEach(function (d) { if (d.art.type === 'path' || d.art.type === 'fence' || d.art.type === 'water') out.push({ kind: 'decor', def: d }); });
    } else if (tab === 'trees') FF.content.trees.forEach(function (d) { out.push({ kind: 'tree', def: d }); });
    else if (tab === 'animals') FF.content.animals.forEach(function (d) { out.push({ kind: 'pen', def: d }); });
    else if (tab === 'produktion') {
      FF.content.factories.forEach(function (d) { out.push({ kind: 'factory', def: d }); });
      FF.content.greenhouses.forEach(function (d) { out.push({ kind: 'green', def: d }); });
    }
    else FF.content.decor.forEach(function (d) { if (d.art.type !== 'path' && d.art.type !== 'fence' && d.art.type !== 'water') out.push({ kind: 'decor', def: d }); });
    return out;
  }

  function cardHtml(it) {
    const d = it.def, sel = FF.tool === 'build' && FF.buildSel && FF.buildSel.kind === it.kind && FF.buildSel.def.id === d.id;
    const cost = FF.itemCost(it.kind, d);
    let meta;
    if (it.kind === 'field') meta = 'Wird mit deiner Saat bepflanzt';
    else if (it.kind === 'tree') meta = '1×1 · +' + U.fmtRate(FF.itemRate('tree', d)) + '/s';
    else if (it.kind === 'pen') meta = d.w + '×' + d.h + ' · ' + esc(d.product) + ' · +' + U.fmtRate(FF.itemRate('pen', d)) + '/s';
    else if (it.kind === 'factory') meta = d.w + '×' + d.h + ' · ' + esc(d.product) + ' · +' + U.fmtRate(FF.itemRate('factory', d)) + '/s' + (FF.factoryReady(d) ? '' : ' · braucht: ' + esc(FF.factoryNeedText(d)));
    else if (it.kind === 'green') meta = d.w + '×' + d.h + ' · beschleunigt alles · +' + U.fmtRate(FF.itemRate('green', d)) + '/s';
    else meta = d.art.type === 'path' ? 'Weg' : d.art.type === 'fence' ? 'Zaun' : d.art.type === 'water' ? 'Fluss' : 'Deko';
    const iconKind = it.kind === 'field' ? 'field' : it.kind === 'tree' ? 'tree' : it.kind === 'pen' ? 'animal' : it.kind === 'factory' ? 'factory' : it.kind === 'green' ? 'green' : 'decor';
    return '<button class="card' + (sel ? ' sel' : '') + '" data-act="pick" data-kind="' + it.kind + '" data-id="' + d.id + '" data-cost="' + cost + '">' +
      '<img class="ic" src="' + art.icon(iconKind, d.id === 'field' ? null : d) + '" alt="">' +
      '<div class="ci"><b>' + esc(d.name) + '</b><span class="meta">' + meta + '</span></div>' +
      '<span class="price">' + price(cost) + '</span></button>';
  }

  function upgValue(u, v) {
    switch (u.effect) {
      case 'harvester': return v > 0 ? 'alle ' + v + ' s' : 'aus';
      case 'autosow': return v > 0 ? 'an' : 'aus';
      case 'growth': case 'price': return v <= 1 ? 'normal' : '+' + Math.round((v - 1) * 100) + ' %';
      case 'capacity': return v + ' Stück';
      case 'workers': return v > 0 ? v + (v === 1 ? ' Arbeiter' : ' Arbeiter') : 'keine';
      case 'workerspeed': return v <= 1 ? 'normal' : '+' + Math.round((v - 1) * 100) + ' %';
    }
    return String(v);
  }

  function upgradesHtml() {
    const S = FF.state;
    let h = '';
    FF.content.upgrades.forEach(function (u) {
      const lvl = S.upg[u.id] || 0, max = u.costs.length;
      const cost = FF.upgradeCost(u);
      const cur = lvl > 0 ? u.values[lvl - 1] : u.base;
      const next = lvl < max ? u.values[lvl] : null;
      let pips = '';
      for (let i = 0; i < max; i++) pips += '<i class="' + (i < lvl ? 'on' : '') + '"></i>';
      h += '<div class="card upg"' + (cost !== null ? ' data-cost="' + cost + '"' : '') + '>' +
        '<div class="ci"><b>' + esc(u.name) + '</b><div class="desc">' + esc(u.desc) + '</div>' +
        '<div class="pips">' + pips + '</div>' +
        '<div class="eff">Jetzt: <b>' + upgValue(u, cur) + '</b>' + (next !== null ? ' → Nächste Stufe: <b>' + upgValue(u, next) + '</b>' : '') + '</div></div>' +
        (cost !== null ? '<button class="btn good" data-act="upg" data-id="' + u.id + '">' + price(cost) + '</button>' : '<span class="price">MAX</span>') +
        '</div>';
    });
    h += '<div class="section">Neue Pflanzen</div>';
    FF.content.crops.forEach(function (c) {
      const un = !!S.crops[c.id];
      h += '<div class="card upg"' + (un ? '' : ' data-cost="' + c.unlock + '"') + '><img class="ic" src="' + art.icon('crop', c) + '" alt="">' +
        '<div class="ci"><b>' + esc(c.name) + '</b><span class="meta">' + c.time + ' s · Ernte ' + U.fmt(c.yield) + ' · Saat ' + U.fmt(c.seed) + '</span></div>' +
        (un ? '<span class="price">frei</span>' : '<button class="btn good" data-act="unlock" data-id="' + c.id + '">' + price(c.unlock) + '</button>') + '</div>';
    });
    return h;
  }

  function infoHtml() {
    const S = FF.state, r = FF.rankInfo();
    const pct = Math.min(100, S.total / C.goal * 100);
    let h = '<div class="big-goal"><p>Du bist ein kleiner Bauer. Baue eine riesige Farm auf und verdiene <b>' + U.fmt(C.goal) + ' ' + C.currency + '</b>!</p>' +
      '<div class="bar"><i style="width:' + Math.max(pct, S.total > 0 ? 1 : 0) + '%"></i></div>' +
      '<p style="margin:6px 0 0;font-size:14px">' + U.fmt(S.total) + ' von ' + U.fmt(C.goal) + ' verdient (' + pct.toFixed(pct < 10 ? 1 : 0).replace('.', ',') + ' %)</p></div>';
    h += '<div class="section">Ränge</div><ul class="ranks">';
    FF.content.ranks.forEach(function (rk, i) {
      h += '<li class="' + (i < r.idx ? 'done' : i === r.idx ? 'cur' : '') + '"><span>' + esc(rk.name) + '</span><span>' + U.fmt(rk.at) + '</span></li>';
    });
    h += '</ul><div class="section">Statistik</div><div class="stats">' +
      '<span>Spielzeit</span><span>' + U.fmtTime(S.playSec) + '</span>' +
      '<span>Ernten</span><span>' + U.fmt(S.stats.harvests) + '</span>' +
      '<span>Produkte gesammelt</span><span>' + U.fmt(S.stats.collected) + '</span>' +
      '<span>Gebaut</span><span>' + U.fmt(S.stats.built) + '</span>' +
      '<span>Grundstücke</span><span>' + S.plots.length + ' / ' + (C.worldPlots.w * C.worldPlots.h) + '</span></div>';
    h += '<div class="section">Spielstand</div><div class="btnrow">' +
      '<button class="btn" data-act="save">Speichern</button>' +
      '<button class="btn" data-act="export">Exportieren</button>' +
      '<button class="btn" data-act="import">Importieren</button>' +
      '<button class="btn bad" data-act="reset">Neustart</button></div>';
    h += '<div class="section">Bestenliste</div>';
    if (!FF.leaderboard || !FF.leaderboard.enabled()) {
      h += '<p class="log">Die Bestenliste ist noch nicht eingerichtet.</p>';
    } else {
      h += '<div class="card" style="cursor:default;flex-wrap:wrap">' +
        '<input id="lbName" type="text" placeholder="Dein Name" value="' + esc(S.playerName || '') + '" maxlength="20" ' +
        'style="flex:1;min-width:120px;padding:7px 8px;border:2px solid var(--wood-d);border-radius:6px;font:14px var(--font);background:#fff">' +
        '<button class="btn good" data-act="lbsubmit">Einreichen</button></div>';
      h += leaderboardListHtml();
      h += '<div class="btnrow"><button class="btn" data-act="lbrefresh">Aktualisieren</button></div>';
    }
    h += '<div class="section">Ton</div><div class="btnrow">' +
      '<button class="btn' + (FF.audio.music ? ' on' : '') + '" data-act="music">Musik: ' + (FF.audio.music ? 'an' : 'aus') + '</button>' +
      '<button class="btn' + (FF.audio.sfxOn ? ' on' : '') + '" data-act="sfx">Effekte: ' + (FF.audio.sfxOn ? 'an' : 'aus') + '</button></div>';
    h += '<div class="section">Neuigkeiten · Version ' + esc(C.version) + '</div><div class="log">';
    FF.content.changelog.forEach(function (c) {
      h += '<b>' + esc(c.version) + ' (' + esc(c.date) + ')</b><ul>' + c.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
    });
    h += '</div><p class="log" style="margin-top:10px">Steuerung: Maus ziehen = ernten/säen, Rechtsklick oder WASD = Karte bewegen, Mausrad = Zoom. Auf dem Handy: zwei Finger = Karte verschieben und zoomen.</p>';
    return h;
  }

  function leaderboardListHtml() {
    const L = FF.leaderboard;
    if (!L) return '';
    if (L.loading) return '<p class="log">Lade…</p>';
    if (L.err) return '<p class="log">' + esc(L.err) + '</p>';
    if (!L.top.length) return '<p class="log">Noch keine Einträge. Sei die/der Erste!</p>';
    let h = '<div class="stats">';
    L.top.forEach(function (e, i) {
      h += '<span>' + (i + 1) + '. ' + esc(e.name) + '</span><span>' + U.fmt(e.total) + '</span>';
    });
    h += '</div>';
    return h;
  }

  function panelTitle(p) { return p === 'build' ? 'Bauen' : p === 'upgrades' ? 'Upgrades' : 'Auftrag & Menü'; }

  UI.refreshPanel = function () {
    if (!panel) return;
    const body = $('panelBody'), top = body.scrollTop;
    let h = '';
    if (panel === 'build') {
      h = tabsHtml([{ id: 'land', label: 'Land' }, { id: 'trees', label: 'Bäume' }, { id: 'animals', label: 'Tiere' }, { id: 'produktion', label: 'Produktion' }, { id: 'deko', label: 'Deko' }], buildTab) +
        buildItems(buildTab).map(cardHtml).join('');
    } else if (panel === 'upgrades') h = upgradesHtml();
    else h = infoHtml();
    body.innerHTML = h;
    body.scrollTop = top;
    tickAfford();
  };

  UI.openPanel = function (name) {
    if (panel === name) return UI.closePanel();
    panel = name;
    $('panel').classList.remove('hidden');
    $('panelTitle').textContent = panelTitle(name);
    $('panelBody').scrollTop = 0;
    if (name === 'build' && FF.tool !== 'build' && lastSel) FF.setTool('build', lastSel);
    if (name === 'info' && FF.leaderboard && FF.leaderboard.enabled() && !FF.leaderboard.lastFetch) {
      FF.leaderboard.fetchTop(function () { UI.refreshPanel(); });
    }
    UI.refreshPanel();
    syncToolbar();
  };
  UI.closePanel = function () {
    panel = null;
    $('panel').classList.add('hidden');
    syncToolbar();
  };

  function syncToolbar() {
    const btns = document.querySelectorAll('#toolbar [data-tool],#toolbar [data-panel]');
    btns.forEach(function (b) {
      let on = false;
      if (b.dataset.tool) on = (b.dataset.tool === FF.tool) || (b.dataset.tool === 'build' && panel === 'build');
      else on = b.dataset.panel === panel;
      b.classList.toggle('on', on);
    });
  }

  /* ---------- Klicks im Panel / Saatgut-Leiste ---------- */
  function onPanelClick(e) {
    const tabEl = e.target.closest('[data-tab]');
    if (tabEl) { buildTab = tabEl.dataset.tab; UI.refreshPanel(); return; }
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act, id = el.dataset.id;
    let why = null;
    switch (act) {
      case 'pick': {
        const kind = el.dataset.kind;
        const def = kind === 'field' ? FIELD_DEF : FF.find(kind === 'tree' ? 'trees' : kind === 'pen' ? 'animals' : kind === 'factory' ? 'factories' : kind === 'green' ? 'greenhouses' : 'decor', id);
        if (!def) return;
        lastSel = { kind: kind, def: def };
        FF.setTool('build', lastSel);
        if (isSmall()) UI.closePanel();
        return;
      }
      case 'upg': why = FF.buyUpgrade(id); break;
      case 'unlock': why = FF.unlockCrop(id); break;
      case 'save': FF.save(); UI.toast('Gespeichert!', 'good'); return;
      case 'export': return exportSave();
      case 'import': return importSave();
      case 'reset': return resetGame();
      case 'music': FF.audio.setMusic(!FF.audio.music); UI.refreshPanel(); return;
      case 'sfx': FF.audio.setSfx(!FF.audio.sfxOn); UI.refreshPanel(); return;
      case 'lbsubmit': {
        const nameEl = document.getElementById('lbName');
        const name = nameEl ? nameEl.value.trim() : '';
        if (!name) { UI.toast('Bitte gib zuerst einen Namen ein.', 'warn'); return; }
        FF.state.playerName = name;
        FF.save();
        FF.leaderboard.submit(name, function (err) {
          if (err) UI.toast('Bestenliste gerade nicht erreichbar.', 'warn');
          else { UI.toast('Score eingereicht!', 'good'); UI.refreshPanel(); }
        });
        return;
      }
      case 'lbrefresh': FF.leaderboard.fetchTop(function () { UI.refreshPanel(); }); return;
    }
    if (why) UI.toast(why, 'warn');
    seedSig = '';
    UI.refreshPanel(); renderSeedbar(true);
  }

  function onSeedClick(e) {
    const el = e.target.closest('[data-crop]');
    if (!el) return;
    const S = FF.state, id = el.dataset.crop;
    if (S.crops[id]) {
      S.seed = id;
      if (FF.tool !== 'farm' && FF.tool !== 'build') FF.setTool('farm');
    } else {
      const why = FF.unlockCrop(id);
      if (why) UI.toast(why, 'warn');
    }
    renderSeedbar(true);
    if (panel === 'upgrades') UI.refreshPanel();
  }

  /* ---------- Spielstand: Export / Import / Neustart ---------- */
  function exportSave() {
    FF.save();
    UI.modal({
      title: 'Spielstand exportieren',
      body: '<p>Kopiere diesen Text und bewahre ihn sicher auf. Über „Importieren“ kannst du damit weiterspielen, auch auf einem anderen Gerät.</p><textarea id="expTxt" readonly></textarea>',
      buttons: [
        { label: 'Kopieren', cls: 'good', keep: true, fn: function (w) {
          const ta = w.querySelector('#expTxt'); ta.select();
          try { navigator.clipboard.writeText(ta.value); UI.toast('Kopiert!', 'good'); } catch (e) { document.execCommand('copy'); }
        } },
        { label: 'Schließen' }
      ]
    });
    $('expTxt').value = JSON.stringify(FF.state);
  }
  function importSave() {
    UI.modal({
      title: 'Spielstand importieren',
      body: '<p>Füge hier deinen exportierten Spielstand ein. <b>Der aktuelle Stand wird überschrieben.</b></p><textarea id="impTxt"></textarea>',
      buttons: [
        { label: 'Laden', cls: 'good', keep: true, fn: function (w) {
          const S = FF.parseSave(w.querySelector('#impTxt').value.trim());
          if (!S) { UI.toast('Das ist kein gültiger Spielstand.', 'warn'); return; }
          UI.closeModal();
          FF.applyState(S);
          UI.toast('Spielstand geladen!', 'good');
        } },
        { label: 'Abbrechen' }
      ]
    });
  }
  function resetGame() {
    UI.modal({
      title: 'Neustart?',
      body: '<p>Dein gesamter Fortschritt wird gelöscht. Das kann nicht rückgängig gemacht werden.</p>',
      buttons: [
        { label: 'Alles löschen', cls: 'bad', fn: function () { FF.reset(); FF.applyState(FF.state); FF.cutscene.start(UI.showIntro); } },
        { label: 'Abbrechen' }
      ]
    });
  }

  /* Neuen Spielstand in Spiel übernehmen (Import/Neustart) */
  FF.applyState = function (S) {
    FF.state = S;
    FF.rebuildGrid();
    FF.recalc();
    FF.rt.recent = []; FF.rt.rate = 0; FF.rt.rankIdx = FF.rankInfo().idx;
    FF.floats.length = 0;
    if (FF.resetWorkers) FF.resetWorkers();
    FF.farmerHome();
    FF.render.centerHome();
    FF.save();
    seedSig = '';
    UI.refreshPanel(); renderSeedbar(true); hudUpdate();
  };

  /* ---------- Grundstück kaufen ---------- */
  function plotDialog(c) {
    const S = FF.state;
    if (!FF.plotBuyable(c.px, c.py)) {
      UI.toast('Kaufe zuerst ein Grundstück direkt neben deinem Land.', 'warn');
      return;
    }
    const p = FF.plotPrice(), can = S.money >= p;
    UI.modal({
      title: 'Grundstück kaufen',
      body: '<p>Ein neues Stück Land für deine Farm (8×8 Felder groß).</p><div class="price-big">' + price(p) + '</div>' +
        (can ? '' : '<p style="color:#c0392b">Dir fehlen noch ' + U.fmt(p - S.money) + ' ' + C.currency + '.</p>'),
      buttons: [
        { label: 'Kaufen', cls: 'good', keep: true, disabled: !can, fn: function () {
          const why = FF.buyPlot(c.px, c.py);
          if (why) UI.toast(why, 'warn'); else UI.closeModal();
        } },
        { label: 'Abbrechen' }
      ]
    });
  }

  /* ---------- Einführung & Sieg ---------- */
  UI.showIntro = function () {
    UI.modal({
      title: 'Deine Schulden: ' + U.fmt(C.goal) + ' ' + C.currency,
      body: '<p>Der alte Bauer hat dir die Farm samt Schulden überlassen. Zahle sie ab, indem du <b>' + U.fmt(C.goal) + ' ' + C.currency + '</b> verdienst.</p>' +
        '<ul><li><b>Ernten &amp; Säen:</b> Mit der Maus über die Felder ziehen.</li>' +
        '<li><b>Bauen:</b> Felder, Bäume, Tierfarmen, Wege, Deko.</li>' +
        '<li><b>Land:</b> Gesperrtes Grundstück anklicken zum Kaufen.</li>' +
        '<li><b>Upgrades:</b> Erntehelfer, Arbeiter und mehr.</li></ul>',
      buttons: [{ label: 'Los geht\'s!', cls: 'good' }]
    });
  };
  function winDialog() {
    FF.save();
    UI.modal({
      title: 'Geschafft!',
      body: '<p>Du hast <b>' + U.fmt(C.goal) + ' ' + C.currency + '</b> verdient und bist jetzt eine <b>Fenriy-Legende</b>!</p><p>Deine Farm gehört dir. Du kannst einfach weiterspielen und das ganze Land ausbauen.</p>',
      buttons: [{ label: 'Weiterspielen', cls: 'good' }]
    });
  }

  /* ---------- Tooltip ---------- */
  function describe() {
    const h = FF.hover, S = FF.state;
    if (!h.on || !FF.input.mouse.in || modalOpen || FF.tool === 'pan') return null;
    const tx = h.tx, ty = h.ty;
    if (!FF.owned(tx, ty)) {
      const p = FF.plotOf(tx, ty);
      if (FF.plotBuyable(p.x, p.y)) return '<b>Grundstück</b><br>' + price(FF.plotPrice()) + '<br>Klicken zum Kaufen';
      return '<b>Gesperrtes Land</b><br>Kaufe zuerst die Nachbar-Grundstücke.';
    }
    if (FF.tool === 'build' && FF.buildSel) {
      const sel = FF.buildSel, a = FF.render.anchor(tx, ty);
      const why = FF.canPlace(sel.kind, sel.def, a.x, a.y);
      const cost = FF.itemCost(sel.kind, sel.def);
      return '<b>' + esc(sel.def.name) + '</b><br>' + price(cost) + (why ? '<br><span class="bad">' + why + '</span>' : (S.money < cost ? '<br><span class="bad">Nicht genug Fenriy</span>' : ''));
    }
    const e = FF.entAt(tx, ty);
    if (!e) return null;
    if (FF.tool === 'demolish') {
      if (e.k === 'house' || e.k === 'barn') return 'Das kann man nicht abreißen';
      const d = FF.defOf(e);
      const cost = e.k === 'field' ? C.fieldCost : (d ? d.cost : 0);
      return '<b>Abreißen</b><br>Rückerstattung ' + price(Math.floor(cost * C.refund));
    }
    switch (e.k) {
      case 'house': return '<b>Bauernhaus</b><br>Klicken für Auftrag & Menü';
      case 'barn': return '<b>Scheune</b><br>Klicken für Upgrades';
      case 'field': {
        const c = e.c ? FF.find('crops', e.c) : null;
        if (!c) return '<b>Feld</b> (leer)<br>Ziehen zum Säen';
        if (FF.fieldReady(e)) return '<b>' + esc(c.name) + '</b> ist reif!<br>Wert: ' + price(c.yield * FF.M.price);
        const left = (c.time - e.p) / FF.M.growth;
        return '<b>' + esc(c.name) + '</b> · ' + Math.floor(e.p / c.time * 100) + ' %<br>noch ' + U.fmtTime(left);
      }
      case 'tree': case 'pen': {
        const d = FF.defOf(e);
        if (!d) return null;
        const full = e.n >= FF.M.capacity;
        let s = '<b>' + esc(d.name) + '</b><br>Vorrat: ' + e.n + ' / ' + FF.M.capacity;
        if (e.n > 0) s += '<br>Wert: ' + price(e.n * d.value * FF.M.price);
        if (!full) s += '<br>Nächstes in ' + U.fmtTime((d.interval - e.p) / FF.M.growth);
        return s;
      }
      case 'decor': { const d = FF.defOf(e); return d ? esc(d.name) : null; }
    }
    return null;
  }

  function tooltipUpdate() {
    const tip = $('tooltip'), html = describe();
    if (!html) { tip.classList.add('hidden'); return; }
    tip.innerHTML = html;
    tip.classList.remove('hidden');
    const m = FF.input.mouse, w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.min(window.innerWidth - w - 8, m.x + 16) + 'px';
    tip.style.top = Math.min(window.innerHeight - h - 8, m.y + 18) + 'px';
  }

  /* ---------- Regelmäßige Aktualisierung ---------- */
  function tickAfford() {
    const money = FF.state.money;
    document.querySelectorAll('#panelBody [data-cost],#seedbar [data-cost]').forEach(function (el) {
      el.classList.toggle('poor', money < parseFloat(el.dataset.cost));
    });
  }
  let tickN = 0;
  UI.tick = function () {
    tickN++;
    hudUpdate();
    eventUpdate();
    tooltipUpdate();
    if (tickN % 4 === 0) { tickAfford(); renderSeedbar(false); }
    if (tickN % 20 === 0 && panel === 'info') UI.refreshPanel();
  };

  /* ---------- Start ---------- */
  UI.init = function () {
    document.querySelectorAll('.coin-img').forEach(function (i) { i.src = art.icon('coin'); });

    document.querySelectorAll('#toolbar [data-tool]').forEach(function (b) {
      b.addEventListener('click', function () {
        const t = b.dataset.tool;
        if (t === 'build') { UI.openPanel('build'); return; }
        FF.setTool(t);
        if (panel === 'build') UI.closePanel();
      });
    });
    document.querySelectorAll('#toolbar [data-panel]').forEach(function (b) {
      b.addEventListener('click', function () { UI.openPanel(b.dataset.panel); });
    });
    $('panelClose').addEventListener('click', UI.closePanel);
    $('panelBody').addEventListener('click', onPanelClick);
    $('seedbar').addEventListener('click', onSeedClick);
    $('hudGoal').addEventListener('click', function () { UI.openPanel('info'); });
    $('zoomIn').addEventListener('click', function () { FF.render.stepZoom(1); });
    $('zoomOut').addEventListener('click', function () { FF.render.stepZoom(-1); });
    $('zoomHome').addEventListener('click', function () { FF.render.centerHome(); });
    $('eventBtn').addEventListener('click', function () { FF.events.claim(); eventUpdate(); hudUpdate(); });
    FF.on('event', eventUpdate);

    FF.on('toast', function (t) { UI.toast(t.msg, t.type); });
    FF.on('rank', function (r) { UI.toast('Neuer Rang: ' + r.name + '!', 'rank'); });
    FF.on('win', winDialog);
    FF.on('plotclick', plotDialog);
    FF.on('plot', function () { UI.refreshPanel(); });
    FF.on('openpanel', function (name) { if (panel !== name) UI.openPanel(name); });
    FF.on('tool', function () { syncToolbar(); renderSeedbar(true); if (panel === 'build') UI.refreshPanel(); });
    FF.on('escape', function () {
      if (modalOpen) UI.closeModal();
      else if (panel) UI.closePanel();
      else if (FF.tool !== 'farm') FF.setTool('farm');
    });
    FF.on('float', function (f) {
      if (!f.hud) return;
      const el = $('hudFloat');
      el.textContent = f.text;
      el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
    });

    syncToolbar(); renderSeedbar(true); hudUpdate();
  };
})();
