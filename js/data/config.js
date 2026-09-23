/* Grundeinstellungen des Spiels */
FF.config = {
  version: window.FF_BUILD || '0.1.0',  // wird in index.html (FF_BUILD) hochgezählt
  saveKey: 'fenriyFarm.save',
  saveVersion: 1,            // Bei Änderungen am Speicherformat erhöhen + Migration in state.js ergänzen

  currency: 'Fenriy',
  goal: 100000000,           // Ziel: so viel Fenriy insgesamt verdienen
  startMoney: 20,

  tile: 16,                  // Pixel pro Kachel (Grafik)
  plotSize: 8,               // Kacheln pro Grundstück (8x8)
  worldPlots: { w: 5, h: 5 },// Anzahl Grundstücke (5x5)
  startPlot: { x: 2, y: 2 }, // Start-Grundstück (Mitte)

  workerCarry: 6,            // So viele Ernten trägt ein Arbeiter, bevor er zum Markt läuft
  workerBonus: 1.1,          // Arbeiter verkaufen mit +10 % Aufschlag auf dem Markt

  fieldCost: 25,             // Preis pro Feld-Kachel
  refund: 0.5,               // Rückerstattung beim Abreißen
  offlineCapHours: 8,        // So lange wächst alles maximal, wenn das Spiel geschlossen ist

  /* Adresse des Bestenlisten-Servers (siehe server/README.md). Leer lassen = Bestenliste im Spiel
   * zeigt einen Hinweis statt Rangliste. Nach dem Deploy hier die URL eintragen, z.B.
   * 'https://fenriy-farm-server.onrender.com' (OHNE Schrägstrich am Ende). */
  leaderboardUrl: '',

  /* Preis für das n-te gekaufte Grundstück (n = 1 ... 24) */
  plotPrice: function (n) {
    return FF.config.nice(1000 * Math.pow(2.15, n - 1));
  },

  /* Rundet Preise auf "schöne" Zahlen (2 wertige Ziffern) */
  nice: function (v) {
    if (v < 100) return Math.round(v);
    const p = Math.pow(10, Math.floor(Math.log10(v)) - 1);
    return Math.round(v / p) * p;
  }
};
