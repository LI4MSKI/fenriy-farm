/* BESTENLISTE: spricht optional mit einem kleinen Online-Server (siehe /server im Projekt-Ordner).
 * Solange FF.config.leaderboardUrl leer ist, zeigt die Oberfläche nur einen Hinweis an.
 * Alles hier läuft rein über fetch() und blockiert das Spiel nie, auch wenn der Server offline ist. */
(function () {
  const LB = FF.leaderboard = {};
  LB.top = [];
  LB.loading = false;
  LB.err = null;
  LB.lastFetch = 0;

  function url() { return (FF.config.leaderboardUrl || '').replace(/\/$/, ''); }
  LB.enabled = function () { return !!url(); }

  LB.fetchTop = function (cb) {
    const base = url();
    if (!base) { LB.err = 'nicht eingerichtet'; if (cb) cb(); return; }
    LB.loading = true; LB.err = null;
    fetch(base + '/top?limit=10').then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (data) {
      LB.top = Array.isArray(data) ? data : (data.top || []);
      LB.loading = false; LB.lastFetch = Date.now();
      if (cb) cb();
    }).catch(function (e) {
      LB.loading = false; LB.err = 'Server nicht erreichbar';
      if (cb) cb(e);
    });
  };

  LB.submit = function (name, cb) {
    const base = url();
    if (!base) { if (cb) cb('nicht eingerichtet'); return; }
    name = (name || 'Bauer').toString().slice(0, 20);
    const total = (FF.state && FF.state.total) || 0;
    fetch(base + '/score', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, total: total })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function () {
      if (cb) cb(null);
      LB.fetchTop();
    }).catch(function () {
      if (cb) cb('Server nicht erreichbar');
    });
  };
})();
