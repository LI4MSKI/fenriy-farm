/* EINFÜHRUNG: Der alte Bauer übergibt die Schlüssel und fährt mit seinem klapprigen Auto davon.
 * Text ändern: unten in buildSteps() die say(...)-Zeilen bearbeiten. */
(function () {
  const C = FF.config, T = C.tile, art = FF.art;
  const CS = FF.cutscene = { active: false };
  const $ = function (id) { return document.getElementById(id); };

  let steps = [], si = 0, st = null, onEnd = null, tAll = 0;
  let lock = { x: 0, y: 0, zoom: 3 };
  const A = {
    old: { x: 0, y: 0, vis: true, flip: true, moving: false, step: 0 },
    car: { x: 0, y: 0, vis: false, engine: false, v: 0, smoke: [], smokeT: 0, shake: 0, frame: 0 },
    key: null, tire: null, hop: 0, hopT: -1
  };

  /* ---------- Schritt-Bausteine ---------- */
  const wait = function (sec) { return { wait: sec }; };
  const say = function (who, text) { return { say: { who: who, text: text } }; };
  const act = function (fn) { return { act: fn }; };
  const until = function (fn) { return { until: fn }; };

  function buildSteps() {
    const f = FF.farmer, old = A.old, car = A.car;
    const half = window.innerWidth / 2 / lock.zoom;
    const startX = lock.x + half + 40, exitX = lock.x - half - 50;
    const stopX = f.x + 104, laneY = 360;
    let phase = 0, ph = 0;

    return [
      wait(0.9),
      say('Alter Bauer', 'Da bist du ja, mein Junge! Ich dachte schon, du kommst nie.'),
      say('Alter Bauer', 'Hier sind meine Schlüssel der Farm. Bau sie neu auf und zahle deine Schulden ab!'),
      act(function () {
        A.key = { t: 0, x0: old.x - 4, y0: old.y - 10, x1: f.x + 4, y1: f.y - 12 };
        FF.audio && FF.audio.sfx('good');
      }),
      until(function () { return !A.key; }),
      say('Du', 'Schulden? Wie hoch sind die denn?'),
      say('Alter Bauer', 'Ach, Kleinkram. Nur ' + FF.util.fmt(C.goal) + ' ' + C.currency + '.'),
      act(function () { A.hopT = 0; FF.audio && FF.audio.sfx('boing'); }),
      say('Du', 'WAS?!'),

      // Das Taxi kommt
      act(function () {
        car.vis = true; car.x = startX; car.y = laneY; car.engine = true; car.v = 0;
        FF.audio && FF.audio.sfx('putter', 3.2);
        setTimeout(function () { FF.audio && FF.audio.sfx('honk'); }, 1900);
      }),
      until(function (dt) {
        const d = car.x - stopX;
        const v = Math.min(80, Math.max(14, d * 1.6));
        car.x -= Math.min(d, v * dt);
        if (d < 1.5) { car.engine = false; return true; }
        return false;
      }),
      say('Alter Bauer', 'Ah, mein Taxi! Pünktlich wie immer. Viel Glück, Junge!'),

      // Der Alte steigt ein
      act(function () { old.flip = false; }),
      until(function (dt) {
        const tx = car.x - 1, ty = 352;
        const dx = tx - old.x, dy = ty - old.y, d = Math.hypot(dx, dy);
        const s = 38 * dt;
        if (d <= s) { old.x = tx; old.y = ty; old.moving = false; return true; }
        old.x += dx / d * s; old.y += dy / d * s; old.moving = true; old.step += dt * 9;
        return false;
      }),
      act(function () { old.vis = false; car.engine = true; f.flip = true; phase = 0; ph = 0; }),
      wait(0.5),
      act(function () { FF.audio && FF.audio.sfx('cough'); FF.emit('float', { x: car.x + 14, y: car.y - 24, text: 'PÖFF!', col: '#ffffff' }); }),
      wait(0.9),
      act(function () { FF.audio && FF.audio.sfx('putter', 2.4); FF.emit('float', { x: car.x + 14, y: car.y - 24, text: 'brrm brrm...', col: '#ffffff' }); }),
      wait(1.0),

      // Abfahrt mit Hindernissen: ruckeln, absaufen, dann los
      until(function (dt) {
        ph += dt;
        if (phase === 0) { car.x -= 22 * dt; if (ph > 0.35) { phase = 1; ph = 0; FF.audio && FF.audio.sfx('cough'); FF.emit('float', { x: car.x + 14, y: car.y - 24, text: 'PÖFF!', col: '#ffffff' }); } }
        else if (phase === 1) { car.v = 0; if (ph > 0.7) { phase = 2; ph = 0; FF.audio && FF.audio.sfx('putter', 2.2); } }
        else {
          car.v = Math.min(120, car.v + 70 * dt);
          car.x -= car.v * dt;
          if (!A.tire && ph > 1.0) {
            A.tire = { t: 0, x: car.x + 8, y: laneY - 4, vx: -150 };
            FF.audio && FF.audio.sfx('clang');
            FF.emit('float', { x: car.x + 8, y: car.y - 22, text: 'KLONG!', col: '#ffe27a' });
          }
        }
        return car.x < exitX;
      }),
      act(function () { car.vis = false; car.engine = false; f.flip = false; }),
      wait(0.6),
      say('Du', '...Na dann. Fangen wir mit ein bisschen Weizen an.'),
      wait(0.2)
    ];
  }

  /* ---------- Dialog-Anzeige ---------- */
  function showDialog(who, text) {
    $('dlgName').textContent = who;
    $('dlgName').className = 'dlg-name ' + (who === 'Du' ? 'you' : 'old');
    $('dlgText').textContent = '';
    $('dialog').classList.remove('hidden');
    $('dlgHint').classList.add('hidden');
  }
  function hideDialog() { $('dialog').classList.add('hidden'); }

  function begin(s) {
    st = { s: s, t: 0, typed: 0, tick: 0 };
    if (s.say) showDialog(s.say.who, s.say.text);
    else hideDialog();
    if (s.act) { s.act(); next(); }
  }
  function next() {
    si++;
    if (si >= steps.length) { CS.finish(false); return; }
    begin(steps[si]);
  }

  CS.click = function () {
    if (!CS.active || !st || !st.s.say) return;
    const len = st.s.say.text.length;
    if (st.typed < len) { st.typed = len; $('dlgText').textContent = st.s.say.text; $('dlgHint').classList.remove('hidden'); }
    else next();
  };

  CS.start = function (cb) {
    onEnd = cb || null;
    CS.active = true;
    document.body.classList.add('cutscene');
    FF.render.centerHome();
    FF.farmerHome();
    const f = FF.farmer;
    lock = { x: f.x + 40, y: 345, zoom: window.innerWidth < 700 ? 2 : 3 };
    FF.cam.zoom = lock.zoom; FF.cam.x = lock.x; FF.cam.y = lock.y;
    f.flip = false; f.hop = 0;
    A.old.x = f.x + 34; A.old.y = f.y; A.old.vis = true; A.old.flip = true; A.old.moving = false;
    A.car.vis = false; A.car.smoke = []; A.key = null; A.tire = null; A.hopT = -1;
    steps = buildSteps();
    si = 0; tAll = 0;
    $('skipIntro').classList.remove('hidden');
    begin(steps[0]);
  };

  CS.finish = function () {
    if (!CS.active) return;
    CS.active = false; st = null;
    document.body.classList.remove('cutscene');
    hideDialog();
    $('skipIntro').classList.add('hidden');
    A.car.vis = false; A.tire = null; A.key = null;
    FF.farmer.hop = 0;
    FF.state.seen.intro = true;
    FF.farmerHome();
    FF.render.centerHome();
    FF.save();
    if (onEnd) { const cb = onEnd; onEnd = null; cb(); }
  };
  CS.skip = function () { CS.finish(true); };

  /* ---------- Ablauf pro Bild ---------- */
  CS.update = function (dt) {
    if (!CS.active) return;
    tAll += dt;
    FF.cam.zoom = lock.zoom; FF.cam.x = lock.x; FF.cam.y = lock.y;

    // Kleine Effekte
    const car = A.car;
    if (car.engine && car.vis) {
      car.shake = Math.sin(tAll * 42) * 0.8;
      car.frame = Math.floor(tAll * 12) % 2;
      car.smokeT -= dt;
      if (car.smokeT <= 0) { car.smokeT = 0.11; car.smoke.push({ x: car.x + 17, y: car.y - 7, age: 0, r: 2 }); }
    } else car.shake = 0;
    for (let i = car.smoke.length - 1; i >= 0; i--) {
      const p = car.smoke[i];
      p.age += dt; p.y -= 12 * dt; p.x += 6 * dt; p.r += 4 * dt;
      if (p.age > 1.1) car.smoke.splice(i, 1);
    }
    if (A.key) {
      A.key.t += dt / 0.9;
      if (A.key.t >= 1) { A.key = null; FF.emit('toast', { msg: 'Schlüssel erhalten!', type: 'good' }); }
    }
    if (A.tire) {
      const tr = A.tire;
      tr.t += dt;
      if (tr.t < 2.2) { tr.x += tr.vx * dt; tr.vx *= 0.985; }
    }
    if (A.hopT >= 0) {
      A.hopT += dt;
      FF.farmer.hop = Math.abs(Math.sin(A.hopT * 10)) * 9 * Math.max(0, 1 - A.hopT / 0.7);
      if (A.hopT > 0.7) { A.hopT = -1; FF.farmer.hop = 0; }
    }

    if (!st) return;
    const s = st.s;
    if (s.wait !== undefined) { st.t += dt; if (st.t >= s.wait) next(); }
    else if (s.until) { if (s.until(dt, st)) next(); }
    else if (s.say) {
      const text = s.say.text;
      if (st.typed < text.length) {
        const before = Math.floor(st.typed);
        st.typed = Math.min(text.length, st.typed + dt * 38);
        const after = Math.floor(st.typed);
        $('dlgText').textContent = text.slice(0, after);
        if (after !== before && after % 2 === 0 && FF.audio && text[after - 1] !== ' ') FF.audio.sfx('blip', s.say.who === 'Du' ? 300 : 170 + (after % 4) * 10);
        if (st.typed >= text.length) $('dlgHint').classList.remove('hidden');
      }
    }
  };

  /* ---------- Zeichnen (wird vom Renderer in die Tiefensortierung eingereiht) ---------- */
  CS.objects = function (list) {
    const old = A.old, car = A.car;
    if (old.vis) {
      list.push({ y: old.y + 2, cs: function (ctx) {
        const spr = art.oldFarmer(old.moving ? Math.floor(old.step) % 2 : 0);
        const x = Math.round(old.x), y = Math.round(old.y) - 14;
        if (old.flip) { ctx.save(); ctx.translate(x + 7, y); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); ctx.restore(); }
        else ctx.drawImage(spr, x - 7, y);
      } });
    }
    if (car.vis) {
      list.push({ y: car.y, cs: function (ctx) {
        const spr = art.car(car.frame);
        const x = Math.round(car.x), y = Math.round(car.y + car.shake) - 22;
        ctx.save(); ctx.translate(x + 19, y); ctx.scale(-1, 1); ctx.drawImage(spr, 0, 0); ctx.restore();
      } });
    }
    if (A.tire) {
      const tr = A.tire;
      list.push({ y: 5000, cs: function (ctx) {
        const h = tr.t < 2.2 ? Math.abs(Math.sin(tr.t * 7)) * 12 * Math.exp(-tr.t * 1.1) : 0;
        ctx.drawImage(art.tire(), Math.round(tr.x), Math.round(tr.y - h));
      } });
    }
    // Qualm und Schlüssel liegen immer obenauf
    list.push({ y: 9000, cs: function (ctx) {
      car.smoke.forEach(function (p) {
        const a = 0.55 * (1 - p.age / 1.1);
        ctx.fillStyle = 'rgba(70,70,70,' + a.toFixed(2) + ')';
        const r = Math.round(p.r);
        ctx.fillRect(Math.round(p.x - r), Math.round(p.y - r), r * 2, r * 2);
      });
      if (A.key) {
        const k = A.key, t = Math.min(1, k.t);
        const x = k.x0 + (k.x1 - k.x0) * t, y = k.y0 + (k.y1 - k.y0) * t - Math.sin(t * Math.PI) * 16;
        ctx.drawImage(art.key(), Math.round(x - 4), Math.round(y - 3));
      }
    } });
  };

  /* Bedienung: Escape überspringt, Leertaste/Enter geht weiter */
  FF.on('escape', function () { if (CS.active) CS.skip(); });
  window.addEventListener('keydown', function (e) {
    if (CS.active && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); CS.click(); }
  });
  let wired = false;
  function wire() {
    if (wired || !$('dialog')) return;
    wired = true;
    $('dialog').addEventListener('pointerdown', function (e) { e.stopPropagation(); CS.click(); });
    $('skipIntro').addEventListener('click', function () { CS.skip(); });
  }
  CS.wire = wire;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
