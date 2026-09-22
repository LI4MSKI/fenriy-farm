/* EINGABE: Maus, Touch, Tastatur */
(function () {
  const R = FF.render, T = FF.config.tile;
  const I = FF.input = { mouse: { x: 0, y: 0, in: false } };
  let canvas;
  const pointers = new Map();
  const keys = {};
  let mode = null;          // 'pan' | 'paint' | 'pinch'
  let click = null;         // { type, px, py } Ziel für einen einfachen Klick
  let moved = false;
  let startX = 0, startY = 0;
  let lastTile = { x: -999, y: -999 };
  let pinch = null;
  let wheelAcc = 0;

  FF.setTool = function (tool, sel) {
    FF.tool = tool;
    FF.buildSel = tool === 'build' ? (sel || FF.buildSel) : null;
    if (canvas) canvas.style.cursor = tool === 'pan' ? 'grab' : tool === 'farm' ? 'default' : 'crosshair';
    FF.emit('tool');
  };

  function tileOf(e) { return R.tileAt(e.clientX, e.clientY); }

  /* Eine Kachel bearbeiten. first = erste Kachel des Klicks (Mehrfach-Bauten nur da) */
  function paint(tx, ty, first) {
    if (tx < 0 || ty < 0 || tx >= FF.WT.w || ty >= FF.WT.h) return;
    if (!FF.owned(tx, ty)) return;
    if (FF.tool === 'farm') {
      const en = FF.entAt(tx, ty);
      if (en && (en.k === 'house' || en.k === 'barn')) return;
      FF.actTile(tx, ty);
      FF.farmerGo(tx, ty);
    } else if (FF.tool === 'build') {
      const sel = FF.buildSel;
      if (!sel) return;
      const sz = FF.itemSize(sel.kind, sel.def);
      if ((sz.w > 1 || sz.h > 1) && !first) return;
      const a = R.anchor(tx, ty);
      const why = FF.place(sel.kind, sel.def, a.x, a.y);
      if (why) FF.toastOnce('place', why);
      else FF.farmerGo(tx, ty);
    } else if (FF.tool === 'demolish') {
      const why = FF.demolish(tx, ty);
      if (why) FF.toastOnce('demo', why);
    }
  }

  function clickTargetAt(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= FF.WT.w || ty >= FF.WT.h) return null;
    if (!FF.owned(tx, ty)) { const p = FF.plotOf(tx, ty); return { type: 'plot', px: p.x, py: p.y }; }
    const en = FF.entAt(tx, ty);
    if (en && FF.tool !== 'demolish' && FF.tool !== 'build') {
      if (en.k === 'house') return { type: 'house' };
      if (en.k === 'barn') return { type: 'barn' };
    }
    return null;
  }

  function onDown(e) {
    if (FF.cutscene && FF.cutscene.active) { FF.cutscene.click(); return; }
    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    FF.emit('canvasdown');
    if (pointers.size === 2) {
      const a = Array.from(pointers.values());
      pinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 };
      mode = 'pinch';
      return;
    }
    if (pointers.size > 2) return;
    startX = e.clientX; startY = e.clientY; moved = false;
    if (e.button === 1 || e.button === 2 || FF.tool === 'pan' || keys[' ']) {
      mode = 'pan'; canvas.style.cursor = 'grabbing'; return;
    }
    mode = 'paint';
    const t = tileOf(e);
    FF.hover.tx = t.x; FF.hover.ty = t.y; FF.hover.on = true;
    lastTile = t;
    click = clickTargetAt(t.x, t.y);
    if (!click) paint(t.x, t.y, true);
  }

  function onMove(e) {
    if (FF.cutscene && FF.cutscene.active) { FF.hover.on = false; return; }
    I.mouse.x = e.clientX; I.mouse.y = e.clientY; I.mouse.in = true;
    const p = pointers.get(e.pointerId);
    const t = tileOf(e);
    FF.hover.tx = t.x; FF.hover.ty = t.y;
    FF.hover.on = t.x >= 0 && t.y >= 0 && t.x < FF.WT.w && t.y < FF.WT.h;
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (mode === 'pan') {
      FF.cam.x -= dx / FF.cam.zoom; FF.cam.y -= dy / FF.cam.zoom; R.clampCam();
    } else if (mode === 'pinch' && pointers.size >= 2) {
      const a = Array.from(pointers.values());
      const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
      const mx = (a[0].x + a[1].x) / 2, my = (a[0].y + a[1].y) / 2;
      FF.cam.x -= (mx - pinch.x) / FF.cam.zoom; FF.cam.y -= (my - pinch.y) / FF.cam.zoom;
      pinch.x = mx; pinch.y = my;
      if (d / pinch.d > 1.3) { R.stepZoom(1, mx, my); pinch.d = d; }
      else if (d / pinch.d < 0.77) { R.stepZoom(-1, mx, my); pinch.d = d; }
      R.clampCam();
    } else if (mode === 'paint') {
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 6) moved = true;
      if (moved) click = null;
      if ((t.x !== lastTile.x || t.y !== lastTile.y) && !click) {
        lastTile = t;
        paint(t.x, t.y, false);
      }
    }
  }

  function onUp(e) {
    pointers.delete(e.pointerId);
    if (mode === 'paint' && click && !moved) {
      const c = click;
      if (c.type === 'plot') FF.emit('plotclick', c);
      else if (c.type === 'house') FF.emit('openpanel', 'info');
      else if (c.type === 'barn') FF.emit('openpanel', 'upgrades');
    }
    click = null;
    if (pointers.size < 2 && mode === 'pinch') mode = null;
    if (pointers.size === 0) {
      mode = null;
      canvas.style.cursor = FF.tool === 'pan' ? 'grab' : FF.tool === 'farm' ? 'default' : 'crosshair';
      if (e.pointerType === 'touch') FF.hover.on = false;
    }
  }

  I.init = function (el) {
    canvas = el;
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('pointerleave', function (e) { I.mouse.in = false; if (e.pointerType === 'mouse') FF.hover.on = false; });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      wheelAcc += e.deltaY;
      if (Math.abs(wheelAcc) >= 40) {
        R.stepZoom(wheelAcc < 0 ? 1 : -1, e.clientX, e.clientY);
        wheelAcc = 0;
      }
    }, { passive: false });
    window.addEventListener('keydown', function (e) {
      if (/INPUT|TEXTAREA|SELECT/.test((e.target && e.target.tagName) || '')) return;
      const k = e.key.toLowerCase();
      keys[k] = true;
      if (k === ' ' || k.indexOf('arrow') === 0) e.preventDefault();
      if (k === 'escape') FF.emit('escape');
      if (k === '+' || k === '=') R.stepZoom(1);
      if (k === '-') R.stepZoom(-1);
    });
    window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
    window.addEventListener('blur', function () { for (const k in keys) keys[k] = false; });
    FF.setTool('farm');
  };

  /* Kamera mit Tasten bewegen */
  I.update = function (dt) {
    let dx = 0, dy = 0;
    if (keys['a'] || keys['arrowleft']) dx -= 1;
    if (keys['d'] || keys['arrowright']) dx += 1;
    if (keys['w'] || keys['arrowup']) dy -= 1;
    if (keys['s'] || keys['arrowdown']) dy += 1;
    if (dx || dy) {
      const sp = 520 / FF.cam.zoom * dt;
      FF.cam.x += dx * sp; FF.cam.y += dy * sp;
      R.clampCam();
    }
  };
})();
