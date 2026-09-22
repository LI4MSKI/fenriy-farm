/* RENDERER: zeichnet Karte, Objekte, Tiere, Bauer und Effekte auf das Canvas */
(function () {
  const C = FF.config, U = FF.util, T = C.tile, art = FF.art;
  const R = FF.render = {};
  let canvas, ctx, W = 0, H = 0, pr = 1;

  FF.cam = { x: 0, y: 0, zoom: 3 };
  FF.hover = { tx: -1, ty: -1, on: false };
  FF.tool = 'farm';          // 'farm' | 'build' | 'demolish' | 'pan'
  FF.buildSel = null;        // { kind, def }
  FF.floats = [];
  R.ZOOMS = [2, 3, 4, 5, 6];

  const ANIM = { chicken: [8, 8], pig: [12, 9], cow: [14, 11], sheep: [11, 10], alpaca: [11, 15], bee: [3, 4] };
  const CLOUDS = [
    { x: 40, y: 90, rx: 60, ry: 22, sp: 4 }, { x: 300, y: 300, rx: 80, ry: 28, sp: 3 },
    { x: 520, y: 150, rx: 50, ry: 18, sp: 5 }, { x: 150, y: 500, rx: 70, ry: 24, sp: 3.5 },
    { x: 450, y: 560, rx: 55, ry: 20, sp: 4.5 }
  ];

  R.init = function (el) {
    canvas = el; ctx = canvas.getContext('2d');
    R.resize();
  };

  R.resize = function () {
    W = window.innerWidth; H = window.innerHeight;
    pr = Math.max(1, Math.round(window.devicePixelRatio || 1));
    canvas.width = W * pr; canvas.height = H * pr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  };
  R.size = function () { return { w: W, h: H }; };

  R.screenToWorld = function (sx, sy) {
    const z = FF.cam.zoom;
    return { x: (sx - W / 2) / z + FF.cam.x, y: (sy - H / 2) / z + FF.cam.y };
  };
  R.worldToScreen = function (wx, wy) {
    const z = FF.cam.zoom;
    return { x: (wx - FF.cam.x) * z + W / 2, y: (wy - FF.cam.y) * z + H / 2 };
  };
  R.tileAt = function (sx, sy) {
    const w = R.screenToWorld(sx, sy);
    return { x: Math.floor(w.x / T), y: Math.floor(w.y / T) };
  };
  R.clampCam = function () {
    const c = FF.cam, m = 3 * T;
    c.x = U.clamp(c.x, -m, FF.WT.w * T + m);
    c.y = U.clamp(c.y, -m, FF.WT.h * T + m);
  };
  R.setZoom = function (z, sx, sy) {
    const list = R.ZOOMS;
    z = U.clamp(z, list[0], list[list.length - 1]);
    if (z === FF.cam.zoom) return;
    if (sx === undefined) { sx = W / 2; sy = H / 2; }
    const before = R.screenToWorld(sx, sy);
    FF.cam.zoom = z;
    FF.cam.x = before.x - (sx - W / 2) / z;
    FF.cam.y = before.y - (sy - H / 2) / z;
    R.clampCam();
  };
  R.stepZoom = function (dir, sx, sy) {
    const list = R.ZOOMS;
    let i = list.indexOf(FF.cam.zoom);
    if (i < 0) i = 1;
    R.setZoom(list[U.clamp(i + dir, 0, list.length - 1)], sx, sy);
  };
  R.centerHome = function () {
    const sp = C.startPlot, p = C.plotSize * T;
    FF.cam.x = sp.x * p + p / 2; FF.cam.y = sp.y * p + p / 2;
    FF.cam.zoom = window.innerWidth < 700 ? 2 : 3;
    R.clampCam();
  };

  /* ---------- Effekte ---------- */
  FF.on('float', function (f) {
    if (f.hud) return;
    if (FF.floats.length > 40) FF.floats.shift();
    FF.floats.push({ x: f.x, y: f.y, text: f.text, col: f.col, age: 0 });
  });
  R.update = function (dt) {
    for (let i = FF.floats.length - 1; i >= 0; i--) {
      FF.floats[i].age += dt;
      if (FF.floats[i].age > 1.4) FF.floats.splice(i, 1);
    }
  };

  /* ---------- Hilfen ---------- */
  function isType(e, type) {
    if (!e || e.k !== 'decor') return false;
    const d = FF.find('decor', e.t);
    return d && d.art.type === type;
  }
  function neighborMask(e, type) {
    let m = 0;
    if (isType(FF.entAt(e.x, e.y - 1), type)) m |= 1;
    if (isType(FF.entAt(e.x + 1, e.y), type)) m |= 2;
    if (isType(FF.entAt(e.x, e.y + 1), type)) m |= 4;
    if (isType(FF.entAt(e.x - 1, e.y), type)) m |= 8;
    return m;
  }

  function drawPen(e, d, t, labels) {
    const px = e.x * T, py = e.y * T, w = e.w * T, h = e.h * T;
    ctx.drawImage(art.pen(d), px, py);
    const kind = d.art.kind, dim = ANIM[kind] || [8, 8];
    const cnt = d.count || 3;
    for (let i = 0; i < cnt; i++) {
      if (kind === 'bee') {
        const bx = px + 8 + Math.sin(t * 2.3 + i * 2.1) * 6, by = py + 5 + Math.cos(t * 1.9 + i * 1.7) * 4;
        ctx.drawImage(art.animal('bee', Math.floor(t * 12 + i) % 2), Math.round(bx), Math.round(by));
        continue;
      }
      const ph = i * 2.3 + (U.hash(e.x, e.y) % 100) * 0.1;
      const sp = 0.3 + i * 0.06;
      const ax0 = px + 4, ax1 = px + w - 4 - dim[0];
      const ay0 = py + (h >= 48 ? 22 : 12), ay1 = py + h - 6 - dim[1];
      const u = (Math.sin(t * sp + ph) + 1) / 2, v = (Math.sin(t * sp * 0.7 + ph * 1.7) + 1) / 2;
      const x = Math.round(ax0 + u * (ax1 - ax0)), y = Math.round(ay0 + v * Math.max(0, ay1 - ay0));
      const right = Math.cos(t * sp + ph) > 0;
      const spr = art.animal(kind, Math.floor(t * 3 + i) % 2);
      if (right) ctx.drawImage(spr, x, y);
      else { ctx.save(); ctx.translate(x + dim[0], y); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); ctx.restore(); }
    }
    if (e.n > 0) {
      const bob = Math.round(Math.sin(t * 4 + e.x) * 1.5);
      const bx = px + Math.floor(w / 2) - 6, by = py - 8 + bob;
      ctx.drawImage(art.coin(), bx, by);
      labels.push({ x: bx + 12, y: by + 6, text: String(e.n) });
    }
  }

  function stockLabel(e, px, py, w, labels) {
    if (e.n <= 0) return;
    const bx = px + Math.floor(w / 2) - 6, by = py - 8;
    ctx.drawImage(art.coin(), bx, by);
    labels.push({ x: bx + 12, y: by + 6, text: String(e.n) });
  }

  /* Produktionsstätte: Gebäude + kleiner Rauch aus dem Schornstein */
  function drawFactory(e, d, t, labels) {
    const px = e.x * T, py = e.y * T, w = e.w * T, h = e.h * T;
    ctx.drawImage(art.factory(d), px, py);
    const baseX = px + w - 5, baseY = py + Math.round(h * 0.36) - 6;
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.6 + i * 0.9) % 3;
      const a = Math.max(0, 0.3 - ph * 0.09);
      if (a <= 0) continue;
      const sx = baseX + Math.sin(t * 0.7 + i) * 2, sy = baseY - ph * 9;
      const r = 2 + ph;
      ctx.fillStyle = 'rgba(215,215,215,' + a.toFixed(2) + ')';
      ctx.fillRect(Math.round(sx - r / 2), Math.round(sy - r / 2), Math.round(r), Math.round(r));
    }
    stockLabel(e, px, py, w, labels);
  }

  /* Gewächshaus: Gebäude + sanftes Glas-Schimmern */
  function drawGreenhouse(e, d, t, labels) {
    const px = e.x * T, py = e.y * T, w = e.w * T, h = e.h * T;
    ctx.drawImage(art.greenhouse(d), px, py);
    ctx.globalAlpha = 0.16 + Math.sin(t * 1.4 + e.x) * 0.06;
    ctx.fillStyle = '#eaffff';
    const gy = py + Math.round(h * 0.32);
    ctx.fillRect(px + 2, gy, w - 4, py + h - 2 - gy);
    ctx.globalAlpha = 1;
    stockLabel(e, px, py, w, labels);
  }

  /* Wo landet ein Gebäude, wenn man auf Kachel (tx,ty) zeigt? (Mitte = Zeiger) */
  R.anchor = function (tx, ty) {
    const sel = FF.buildSel;
    const sz = sel ? FF.itemSize(sel.kind, sel.def) : { w: 1, h: 1 };
    return { x: tx - Math.floor(sz.w / 2), y: ty - Math.floor(sz.h / 2) };
  };

  function drawGhost(t) {
    const sel = FF.buildSel, hv = FF.hover;
    if (FF.tool !== 'build' || !sel || !hv.on) return;
    const sz = FF.itemSize(sel.kind, sel.def);
    const a = R.anchor(hv.tx, hv.ty);
    const x0 = a.x, y0 = a.y;
    let spr;
    if (sel.kind === 'field') spr = art.field(null, 0);
    else if (sel.kind === 'tree') spr = art.tree(sel.def, true);
    else if (sel.kind === 'pen') spr = art.pen(sel.def);
    else if (sel.kind === 'factory') spr = art.factory(sel.def);
    else if (sel.kind === 'green') spr = art.greenhouse(sel.def);
    else spr = art.decor(sel.def, 0);
    ctx.globalAlpha = 0.7;
    ctx.drawImage(spr, x0 * T, y0 * T);
    ctx.globalAlpha = 1;
    for (let j = 0; j < sz.h; j++) for (let i = 0; i < sz.w; i++) {
      const tx = x0 + i, ty = y0 + j;
      const ok = tx >= 0 && ty >= 0 && tx < FF.WT.w && ty < FF.WT.h && FF.owned(tx, ty) && !FF.entAt(tx, ty);
      ctx.fillStyle = ok ? 'rgba(80,255,120,0.35)' : 'rgba(255,60,60,0.45)';
      ctx.fillRect(tx * T, ty * T, T, T);
    }
  }

  /* ---------- Hauptzeichnung ---------- */
  R.draw = function (t) {
    const S = FF.state;
    if (!S) return;
    const z = FF.cam.zoom, s = z * pr, WT = FF.WT;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#24562e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const ox = Math.round(canvas.width / 2 - FF.cam.x * s), oy = Math.round(canvas.height / 2 - FF.cam.y * s);
    ctx.setTransform(s, 0, 0, s, ox, oy);
    ctx.imageSmoothingEnabled = false;

    const x0 = Math.max(0, Math.floor(-ox / s / T)), x1 = Math.min(WT.w - 1, Math.floor((canvas.width - ox) / s / T));
    const y0 = Math.max(0, Math.floor(-oy / s / T)), y1 = Math.min(WT.h - 1, Math.floor((canvas.height - oy) / s / T));
    const inView = function (e) { return e.x + e.w > x0 && e.x <= x1 && e.y + e.h > y0 && e.y <= y1; };

    // 1. Gras
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const h = U.hash(x, y) % 16;
      ctx.drawImage(art.grass(h < 9 ? 0 : h < 12 ? 1 : h < 15 ? 2 : 3), x * T, y * T);
    }

    // 2. flache Dinge: Felder, Wege, Blumen
    const ents = S.ents;
    const objs = [];
    for (let i = 0; i < ents.length; i++) {
      const e = ents[i];
      if (!inView(e)) continue;
      switch (e.k) {
        case 'field': {
          const crop = e.c ? FF.find('crops', e.c) : null;
          ctx.drawImage(art.field(crop, FF.stageOf(e, crop)), e.x * T, e.y * T);
          break;
        }
        case 'decor': {
          const d = FF.find('decor', e.t);
          if (!d) break;
          const ty = d.art.type;
          if (ty === 'path' || ty === 'water') ctx.drawImage(art.decor(d, neighborMask(e, ty)), e.x * T, e.y * T);
          else if (ty === 'flowers') ctx.drawImage(art.decor(d, 0), e.x * T, e.y * T);
          else objs.push({ y: (e.y + 1) * T, e: e, d: d });
          break;
        }
        case 'tree': objs.push({ y: (e.y + 1) * T, e: e, d: FF.find('trees', e.t) }); break;
        case 'pen': objs.push({ y: (e.y + e.h) * T, e: e, d: FF.find('animals', e.t) }); break;
        case 'factory': objs.push({ y: (e.y + e.h) * T, e: e, d: FF.find('factories', e.t) }); break;
        case 'green': objs.push({ y: (e.y + e.h) * T, e: e, d: FF.find('greenhouses', e.t) }); break;
        case 'house': case 'barn': objs.push({ y: (e.y + e.h) * T, e: e }); break;
      }
    }

    // 3. Grundstücke: Grenzen und gesperrtes Land
    const P = C.plotSize;
    const locked = [];
    for (let py = Math.floor(y0 / P); py <= Math.floor(y1 / P); py++) for (let px = Math.floor(x0 / P); px <= Math.floor(x1 / P); px++) {
      const rx = px * P * T, ry = py * P * T, rw = P * T;
      if (FF.isOwnedPlot(px, py)) {
        ctx.fillStyle = 'rgba(0,0,0,0.10)';
        ctx.fillRect(rx, ry, rw, 1); ctx.fillRect(rx, ry + rw - 1, rw, 1);
        ctx.fillRect(rx, ry, 1, rw); ctx.fillRect(rx + rw - 1, ry, 1, rw);
      } else {
        const buyable = FF.plotBuyable(px, py);
        ctx.fillStyle = buyable ? 'rgba(10,30,20,0.42)' : 'rgba(6,20,12,0.62)';
        ctx.fillRect(rx, ry, rw, rw);
        ctx.fillStyle = buyable ? 'rgba(255,226,122,0.55)' : 'rgba(255,255,255,0.12)';
        for (let d = 0; d < rw; d += 6) {
          ctx.fillRect(rx + d, ry, 3, 1); ctx.fillRect(rx + d, ry + rw - 1, 3, 1);
          ctx.fillRect(rx, ry + d, 1, 3); ctx.fillRect(rx + rw - 1, ry + d, 1, 3);
        }
        ctx.drawImage(art.lock(), rx + rw / 2 - 6, ry + rw / 2 - 20);
        locked.push({ px: px, py: py, cx: rx + rw / 2, cy: ry + rw / 2, buyable: buyable });
      }
    }

    // 4. Wolkenschatten
    ctx.fillStyle = 'rgba(15,35,60,0.07)';
    const ww = WT.w * T;
    CLOUDS.forEach(function (c) {
      const span = ww + c.rx * 2;
      const cx = ((c.x + t * c.sp) % span) - c.rx;
      ctx.beginPath(); ctx.ellipse(Math.round(cx), c.y, c.rx, c.ry, 0, 0, Math.PI * 2); ctx.fill();
    });

    // 5. Objekte nach Tiefe sortiert (inkl. Bauer)
    const f = FF.farmer;
    objs.push({ y: f.y + 2, farmer: true });
    FF.workers.forEach(function (w) { objs.push({ y: w.y + 2, worker: w }); });
    if (FF.cutscene && FF.cutscene.active) FF.cutscene.objects(objs);
    objs.sort(function (a, b) { return a.y - b.y; });
    const labels = [];
    for (let i = 0; i < objs.length; i++) {
      const o = objs[i];
      if (o.cs) { o.cs(ctx, t); continue; }
      if (o.worker) {
        const w = o.worker;
        const wf = w.moving ? Math.floor(w.step) % 2 : 0;
        const wspr = art.worker(wf, w.v);
        const wx = Math.round(w.x), wy = Math.round(w.y) - 14 + (w.moving && wf ? -1 : 0) + (w.st === 'work' ? (Math.floor(t * 8) % 2) : 0);
        if (w.flip) { ctx.save(); ctx.translate(wx + 6, wy); ctx.scale(-1, 1); ctx.drawImage(wspr, 0, 0); ctx.restore(); }
        else ctx.drawImage(wspr, wx - 6, wy);
        if (w.n > 0) ctx.drawImage(art.sack(), wx - 5, wy - 8);
        continue;
      }
      if (o.farmer) {
        const fr = f.moving ? Math.floor(f.step) % 2 : 0;
        const spr = art.farmer(fr);
        const bob = (f.moving ? (fr ? -1 : 0) : 0) - Math.round(f.hop || 0);
        if (f.flip) { ctx.save(); ctx.translate(Math.round(f.x) + 6, Math.round(f.y) - 14 + bob); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); ctx.restore(); }
        else ctx.drawImage(spr, Math.round(f.x) - 6, Math.round(f.y) - 14 + bob);
        continue;
      }
      const e = o.e;
      switch (e.k) {
        case 'tree': if (o.d) ctx.drawImage(art.tree(o.d, e.n > 0), e.x * T, e.y * T); break;
        case 'pen': if (o.d) drawPen(e, o.d, t, labels); break;
        case 'factory': if (o.d) drawFactory(e, o.d, t, labels); break;
        case 'green': if (o.d) drawGreenhouse(e, o.d, t, labels); break;
        case 'house': ctx.drawImage(art.house(), e.x * T, e.y * T); break;
        case 'barn': ctx.drawImage(art.barn(), e.x * T, e.y * T); break;
        case 'decor': if (o.d) ctx.drawImage(art.decor(o.d, o.d.art.type === 'fence' ? neighborMask(e, 'fence') : 0), e.x * T, e.y * T); break;
      }
    }

    // 6. Hover-Rahmen & Bau-Vorschau
    const hv = FF.hover;
    if (hv.on && FF.tool !== 'pan' && !(FF.cutscene && FF.cutscene.active)) {
      if (FF.tool === 'build') drawGhost(t);
      else {
        const e = FF.entAt(hv.tx, hv.ty);
        const bx = e ? e.x : hv.tx, by = e ? e.y : hv.ty, bw = e ? e.w : 1, bh = e ? e.h : 1;
        ctx.strokeStyle = FF.tool === 'demolish' ? 'rgba(255,90,90,0.95)' : 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx * T + 0.5, by * T + 0.5, bw * T - 1, bh * T - 1);
      }
    }

    // ---- Wetter (Regen/Blitz), Bildschirm-Ebene ----
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (FF.weather) FF.weather.draw(ctx, W, H, pr, t);

    // ---- Bildschirm-Ebene (Text) ----
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fs = Math.round(12 * pr * U.clamp(z / 3, 0.9, 1.4));
    ctx.font = '700 ' + fs + 'px "Pixelify Sans", "Trebuchet MS", sans-serif';
    ctx.lineJoin = 'round';
    function label(text, sx, sy, col) {
      ctx.lineWidth = Math.max(3, pr * 3); ctx.strokeStyle = 'rgba(20,20,20,0.85)';
      ctx.strokeText(text, sx, sy);
      ctx.fillStyle = col; ctx.fillText(text, sx, sy);
    }
    const toS = function (wx, wy) { return { x: ox + wx * s, y: oy + wy * s }; };
    labels.forEach(function (l) { const p = toS(l.x, l.y); label(l.text, p.x, p.y, '#ffffff'); });
    if (!(FF.cutscene && FF.cutscene.active)) locked.forEach(function (l) {
      const p = toS(l.cx, l.cy);
      if (l.buyable) {
        const price = FF.plotPrice();
        const can = S.money >= price;
        label(U.fmt(price) + ' F', p.x, p.y + 6 * s, can ? '#ffe27a' : '#ffffff');
        if (z >= 3) label('Grundstück kaufen', p.x, p.y + 6 * s + fs * 1.4, 'rgba(255,255,255,0.85)');
      } else label('gesperrt', p.x, p.y + 6 * s, 'rgba(255,255,255,0.55)');
    });
    FF.floats.forEach(function (fl) {
      const p = toS(fl.x, fl.y);
      const a = 1 - Math.max(0, (fl.age - 0.8) / 0.6);
      ctx.globalAlpha = a;
      label(fl.text, p.x, p.y - fl.age * 22 * pr, fl.col);
      ctx.globalAlpha = 1;
    });
  };

  /* Hilfsfunktion für Screenshots/Tests: Bildschirm-Position einer Kachel */
  R.tileToScreen = function (tx, ty) { return R.worldToScreen(tx * T + 8, ty * T + 8); };
})();
