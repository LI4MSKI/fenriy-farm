/* START & HAUPTSCHLEIFE */
(function () {
  const C = FF.config, T = C.tile;

  FF.farmerHome = function () {
    const sp = C.startPlot, o = C.plotSize;
    const f = FF.farmer;
    f.x = f.tx = (sp.x * o + 2) * T + 8;
    f.y = f.ty = (sp.y * o + 4) * T + 12;
  };

  function start() {
    const canvas = document.getElementById('game');
    let fresh = false;
    FF.state = FF.load();
    if (!FF.state) { FF.state = FF.newState(); fresh = true; }
    FF.rebuildGrid();
    FF.recalc();
    FF.rt.rankIdx = FF.rankInfo().idx;

    FF.render.init(canvas);
    FF.render.centerHome();
    FF.input.init(canvas);
    FF.ui.init();
    FF.farmerHome();
    if (FF.syncWorkers) FF.syncWorkers();
    const sb = document.getElementById('soundBtn');
    function soundUi() { sb.classList.toggle('off', !FF.audio.music); }
    sb.addEventListener('click', function () { FF.audio.setMusic(!FF.audio.music); soundUi(); FF.ui.refreshPanel(); });
    FF.on('audio', soundUi); soundUi();

    // Fortschritt seit dem letzten Besuch
    if (!fresh) {
      const away = (Date.now() - FF.state.savedAt) / 1000;
      const r = FF.offline(away);
      if (r) {
        FF.ui.toast('Willkommen zurück! ' + (r.swept > 0 ? 'Dein Erntehelfer hat ' + FF.util.fmt(r.swept) + ' Fenriy eingesammelt.' : 'Deine Farm ist weitergewachsen.'), 'good');
      }
    } else {
      FF.cutscene.start(FF.ui.showIntro);
    }

    window.addEventListener('resize', function () { FF.render.resize(); });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) FF.save();
      else last = performance.now();
    });
    window.addEventListener('beforeunload', function () { FF.save(); });
    window.addEventListener('pagehide', function () { FF.save(); });

    let last = performance.now(), lastWall = Date.now(), saveT = 0, uiT = 0, time = 0;
    function frame(now) {
      let dt = (now - last) / 1000;
      last = now;
      const wall = Date.now();
      // Wenn der Tab lange im Hintergrund war (Zeit springt), Offline-Fortschritt anwenden
      if (wall - lastWall > 3000) {
        const r = FF.offline((wall - lastWall) / 1000);
        if (r && r.earned > 0) FF.ui.toast('Deine Farm hat weitergearbeitet: +' + FF.util.fmt(r.earned) + ' Fenriy', 'good');
        dt = 0;
      }
      lastWall = wall;
      dt = Math.min(dt, 0.25);
      time += dt;
      if (FF.cutscene.active) FF.cutscene.update(dt);
      FF.update(dt);
      FF.updateFarmer(dt);
      FF.updateWorkers(dt);
      FF.input.update(dt);
      FF.render.update(dt);
      FF.render.draw(time);
      uiT += dt; saveT += dt;
      if (uiT >= 0.1) { uiT = 0; FF.ui.tick(); }
      if (saveT >= 15) { saveT = 0; FF.save(); }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
