/* WELT-GENERIERUNG: bei jedem NEUEN Spielstand schlängelt sich ein zufälliger Fluss über die Karte.
 * Bestehende Spielstände sind davon nie betroffen (wird nur in FF.newState() aufgerufen).
 * Der Bereich um Hofhaus/Scheune/Startfelder wird ausgespart, damit der Fluss dort nie durchläuft. */
(function () {
  const U = FF.util;
  FF.worldgen = {};

  /* Liefert eine Liste { x, y } Kacheln für einen sich windenden Fluss quer über die Karte.
   * ex = { x0, y0, x1, y1 } ist die auszusparende Fläche (Start-Grundstück). */
  FF.worldgen.riverTiles = function (WT, ex) {
    const vertical = Math.random() < 0.5;
    const span = vertical ? WT.h : WT.w;   // Achse, entlang der der Fluss läuft
    const width = vertical ? WT.w : WT.h;  // Achse, auf der er hin- und herschlängelt
    let pos = 3 + Math.random() * Math.max(1, width - 6);
    let vel = 0;
    const tiles = [];
    for (let i = 0; i < span; i++) {
      vel = U.clamp(vel + (Math.random() - 0.5) * 2.2, -1.5, 1.5);
      pos = U.clamp(pos + vel, 2, width - 3);
      const x = vertical ? Math.round(pos) : i;
      const y = vertical ? i : Math.round(pos);
      if (ex && x >= ex.x0 && x <= ex.x1 && y >= ex.y0 && y <= ex.y1) continue; // beim Startgrundstück aussparen
      tiles.push({ x: x, y: y });
    }
    return tiles;
  };

  /* Baut daraus fertige Decor-Entitäten (type 'water'), bereit zum Einfügen in S.ents */
  FF.worldgen.makeRiver = function (WT, ex) {
    return FF.worldgen.riverTiles(WT, ex).map(function (t) {
      return { k: 'decor', x: t.x, y: t.y, w: 1, h: 1, t: 'water' };
    });
  };
})();
