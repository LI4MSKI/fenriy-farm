/* PIXEL-GRAFIK
 * Alle Bilder werden beim Start per Code in winzige Canvas gezeichnet (16 Pixel pro Kachel)
 * und später vergrößert. Neue Pflanzen/Bäume/Tiere brauchen nur Farben in den Daten-Dateien.
 */
(function () {
  const U = FF.util;
  const art = FF.art;
  const cache = {};

  /* Aktuelle Jahreszeit sicher abfragen (auch bevor season.js geladen/gestartet ist) */
  function seasonIdx() { return (FF.season && FF.season.idx) ? FF.season.idx() : 1; }

  /* Farbpaletten für die Wiese, je Jahreszeit (0 Frühling, 1 Sommer, 2 Herbst, 3 Winter) */
  const SEASON_GRASS = [
    { base: '#7bcb5e', a: '#6cc350', b: '#93dd72' },
    { base: '#78c04a', a: '#6cb340', b: '#88d056' },
    { base: '#b99a3e', a: '#a68530', b: '#cdb257' },
    { base: '#e9f1f2', a: '#d7e6ea', b: '#ffffff' }
  ];

  function mk(w, h, fn) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    fn(g, w, h);
    return c;
  }
  function R(g, col, x, y, w, h) { g.fillStyle = col; g.fillRect(x, y, w === undefined ? 1 : w, h === undefined ? 1 : h); }
  function cached(key, w, h, fn) { return cache[key] || (cache[key] = mk(w, h, fn)); }

  /* ---------- Untergrund ---------- */
  art.grass = function (v) {
    const si = seasonIdx();
    return cached('grass' + v + '_' + si, 16, 16, function (g) {
      const pal = SEASON_GRASS[si];
      R(g, pal.base, 0, 0, 16, 16);
      const rnd = U.seeded(v * 97 + 13);
      const n = [3, 6, 7, 9][v];
      for (let i = 0; i < n; i++) {
        const x = Math.floor(rnd() * 15), y = Math.floor(rnd() * 14);
        R(g, i % 2 ? pal.a : pal.b, x, y, 1, 1);
        if (v > 1 && i % 3 === 0) R(g, pal.a, x, y + 1, 1, 1);
      }
      if (v === 3 && si !== 3) { R(g, '#fff', 10, 4); R(g, '#fff', 12, 4); R(g, '#fff', 11, 3); R(g, '#fff', 11, 5); R(g, '#ffd23c', 11, 4); }
      if (si === 3 && v > 0) { R(g, '#ffffff', 3, 3); R(g, '#ffffff', 12, 10); if (v > 2) R(g, '#ffffff', 8, 6); }
    });
  };

  art.soil = function () {
    return cached('soil', 16, 16, function (g) {
      R(g, '#8c5b30', 0, 0, 16, 16);
      for (let y = 0; y < 16; y += 4) {
        R(g, '#6f4520', 0, y + 2, 16, 1);
        R(g, '#9d6c3c', 0, y + 3, 16, 1);
      }
      const rnd = U.seeded(5);
      for (let i = 0; i < 6; i++) R(g, '#a67744', Math.floor(rnd() * 16), Math.floor(rnd() * 16), 1, 1);
    });
  };

  /* ---------- Pflanzen ---------- */
  function shadow(g, cx, oy, w) { R(g, 'rgba(20,15,5,0.18)', cx - Math.ceil(w / 2), oy + 8, w, 1); }
  function cell(g, a, stage, ox, oy) {
    const cx = ox + 4;
    const G = a.leaf || '#3fa53a';
    const GL = U.shade(G, 32), GD = U.shade(G, -28);
    const big = !!a.big;
    if (stage === 0) {
      R(g, '#e8d9a0', cx - 1, oy + 6); R(g, '#e8d9a0', cx + 1, oy + 7); R(g, GL, cx, oy + 6); return;
    }
    switch (a.type) {
      case 'tall': {
        const h = big ? [0, 3, 5, 6][stage] : [0, 2, 3, 5][stage];
        shadow(g, cx, oy, big ? 5 : 3);
        const col = (stage === 3 && a.stem) ? a.stem : G;
        R(g, col, cx, oy + 8 - h, 1, h);
        if (stage >= 2) {
          R(g, GL, cx - 1, oy + 8 - h + 2); R(g, GD, cx + 1, oy + 8 - h + 3);
          if (big) R(g, GL, cx + 1, oy + 8 - h + 1);
        }
        if (stage === 3) {
          if (big) {
            R(g, a.fruit, cx + 1, oy + 3, 2, 3); R(g, U.shade(a.fruit, -40), cx + 2, oy + 3, 1, 3);
            R(g, U.shade(a.fruit, 65), cx + 1, oy + 3); R(g, GD, cx + 1, oy + 6);
          } else {
            R(g, a.fruit, cx - 1, oy + 8 - h - 1, 3, 2); R(g, U.shade(a.fruit, 70), cx - 1, oy + 8 - h - 1);
            R(g, U.shade(a.fruit, -35), cx + 1, oy + 8 - h); R(g, a.fruit, cx, oy + 8 - h - 2);
          }
        }
        break;
      }
      case 'root': {
        if (stage === 1) { shadow(g, cx, oy, 2); R(g, G, cx, oy + 6, 1, 2); R(g, GL, cx, oy + 6); }
        else {
          shadow(g, cx, oy, 3);
          R(g, GD, cx - 1, oy + 5, 1, 3); R(g, G, cx, oy + 3 + (stage === 3 ? 0 : 1), 1, 5); R(g, GL, cx + 1, oy + 5, 1, 3);
          R(g, GL, cx, oy + 3 + (stage === 3 ? 0 : 1));
          if (stage === 3) {
            R(g, a.fruit, cx - 1, oy + 7, 3, 1); R(g, U.shade(a.fruit, 55), cx - 1, oy + 7); R(g, U.shade(a.fruit, -35), cx + 1, oy + 7);
          }
        }
        break;
      }
      case 'bush': {
        if (stage === 1) { shadow(g, cx, oy, 2); R(g, G, cx - 1, oy + 6, 2, 2); R(g, GL, cx - 1, oy + 6); }
        else if (stage === 2) {
          shadow(g, cx, oy, 4);
          R(g, G, cx - 2, oy + 5, 4, 3); R(g, GL, cx - 1, oy + 4, 2, 1); R(g, GD, cx - 2, oy + 7, 4, 1);
        } else {
          shadow(g, cx, oy, 6);
          R(g, G, cx - 3, oy + 4, 6, 4); R(g, GL, cx - 2, oy + 3, 3, 1); R(g, GD, cx - 3, oy + 7, 6, 1);
          R(g, GL, cx + 1, oy + 4, 2, 1);
          if (big) {
            R(g, a.fruit, cx - 3, oy + 5, 3, 3); R(g, a.fruit, cx + 1, oy + 4, 3, 3);
            R(g, U.shade(a.fruit, 70), cx - 3, oy + 5); R(g, U.shade(a.fruit, 70), cx + 1, oy + 4);
            R(g, U.shade(a.fruit, -55), cx - 1, oy + 7); R(g, U.shade(a.fruit, -55), cx + 3, oy + 6);
          } else {
            R(g, a.fruit, cx - 2, oy + 5); R(g, a.fruit, cx + 1, oy + 6); R(g, a.fruit, cx, oy + 4); R(g, a.fruit, cx + 2, oy + 5);
            R(g, U.shade(a.fruit, 75), cx - 2, oy + 5); R(g, U.shade(a.fruit, 75), cx, oy + 4);
          }
        }
        break;
      }
      case 'vine': {
        shadow(g, cx, oy, 4);
        R(g, '#7a5a33', cx, oy + 2, 1, 6); R(g, U.shade('#7a5a33', 30), cx, oy + 2, 1, 1);
        if (stage === 1) { R(g, G, cx + 1, oy + 5); R(g, GL, cx + 1, oy + 5); }
        else {
          R(g, G, cx - 1, oy + 2, 3, 2); R(g, GL, cx - 2, oy + 4, 2, 1); R(g, GD, cx + 1, oy + 4, 2, 1);
          if (stage === 3) {
            R(g, a.fruit, cx - 1, oy + 5, 3, 1); R(g, a.fruit, cx - 1, oy + 6, 2, 1); R(g, a.fruit, cx, oy + 7);
            R(g, U.shade(a.fruit, 75), cx - 1, oy + 5); R(g, U.shade(a.fruit, -40), cx + 1, oy + 6);
          }
        }
        break;
      }
    }
  }

  /* Feld-Kachel mit (optionaler) Pflanze im Wachstums-Stadium 0..3 */
  art.field = function (crop, stage) {
    const key = 'field_' + (crop ? crop.id + '_' + stage : 'empty');
    return cached(key, 16, 16, function (g) {
      g.drawImage(art.soil(), 0, 0);
      if (!crop) return;
      cell(g, crop.art, stage, 0, 0);
      cell(g, crop.art, stage, 8, 0);
      cell(g, crop.art, stage, 0, 8);
      cell(g, crop.art, stage, 8, 8);
    });
  };
  /* Nur die Pflanze (für Icons in der Oberfläche) */
  art.cropIcon = function (crop) {
    return cached('cropicon_' + crop.id, 16, 16, function (g) {
      R(g, '#8c5b30', 1, 1, 14, 14); R(g, '#6f4520', 1, 12, 14, 1);
      cell(g, crop.art, 3, 0, 0); cell(g, crop.art, 3, 8, 0); cell(g, crop.art, 3, 0, 8); cell(g, crop.art, 3, 8, 8);
    });
  };

  /* ---------- Bäume ---------- */
  art.tree = function (def, ready) {
    const si = seasonIdx();
    return cached('tree_' + def.id + '_' + (ready ? 1 : 0) + '_' + si, 16, 16, function (g) {
      const a = def.art;
      let leaf = a.leaf, leaf2 = a.leaf2;
      if (si === 2) { leaf = U.mix(a.leaf, '#d9701e', 0.5); leaf2 = U.mix(a.leaf2, '#f0a83a', 0.5); }
      else if (si === 3) { leaf = U.mix(a.leaf, '#eaf6fb', 0.4); leaf2 = U.mix(a.leaf2, '#ffffff', 0.45); }
      const dark = U.shade(leaf, -35);
      R(g, 'rgba(0,0,0,0.18)', 4, 14, 8, 2);
      R(g, a.trunk, 7, 9, 2, 6); R(g, U.shade(a.trunk, -30), 8, 9, 1, 6); R(g, U.shade(a.trunk, -30), 6, 14, 4, 1);
      R(g, leaf, 5, 0, 6, 1); R(g, leaf, 3, 1, 10, 2); R(g, leaf, 2, 3, 12, 3); R(g, leaf, 3, 6, 10, 2); R(g, leaf, 5, 8, 6, 1);
      R(g, dark, 4, 7, 8, 1); R(g, dark, 5, 8, 6, 1); R(g, dark, 12, 4, 2, 3); R(g, dark, 11, 2, 2, 1);
      R(g, leaf2, 4, 1, 3, 1); R(g, leaf2, 3, 3, 3, 1); R(g, leaf2, 4, 2, 1, 2); R(g, leaf2, 8, 1, 2, 1);
      if (si === 3) { R(g, '#ffffff', 5, 0, 6, 1); R(g, '#ffffff', 4, 1, 1, 1); R(g, '#ffffff', 10, 1, 1, 1); }
      if (ready) {
        [[4, 4], [8, 3], [11, 5], [6, 6], [9, 7]].forEach(function (p) {
          R(g, a.fruit, p[0], p[1], 2, 2); R(g, U.shade(a.fruit, 80), p[0], p[1], 1, 1);
        });
      }
    });
  };

  /* ---------- Tiere ---------- */
  art.animal = function (kind, frame) {
    const f = frame ? 1 : 0;
    return cached('animal_' + kind + f, 16, 16, function (g) {
      switch (kind) {
        case 'chicken':
          R(g, '#fff', 1, 3, 5, 3); R(g, '#e8e8e8', 1, 5, 5, 1); R(g, '#fff', 0, 2, 2, 2); R(g, '#fff', 5, 1, 2, 3);
          R(g, '#e03a2e', 6, 0, 1, 1); R(g, '#f0a030', 7, 2, 1, 1); R(g, '#222', 6, 2, 1, 1);
          R(g, '#f0a030', 2 + f, 6, 1, 2); R(g, '#f0a030', 4 - f, 6, 1, 2);
          break;
        case 'pig':
          R(g, '#f4a6b8', 1, 2, 8, 5); R(g, '#e88aa0', 1, 6, 8, 1); R(g, '#f4a6b8', 8, 3, 3, 4); R(g, '#e88aa0', 10, 4, 2, 2);
          R(g, '#8a3a50', 11, 4); R(g, '#e88aa0', 8, 2, 2, 1); R(g, '#222', 9, 4);
          R(g, '#e88aa0', 2 + f, 7, 2, 2); R(g, '#e88aa0', 7 - f, 7, 2, 2); R(g, '#e88aa0', 0, 3);
          break;
        case 'cow':
          R(g, '#fafafa', 1, 2, 9, 6); R(g, '#d8d8d8', 1, 7, 9, 1); R(g, '#2a2a2a', 3, 3, 3, 2); R(g, '#2a2a2a', 7, 5, 2, 2);
          R(g, '#fafafa', 10, 2, 4, 4); R(g, '#f2b8a0', 12, 4, 2, 2); R(g, '#e8e8e8', 10, 1, 1, 1); R(g, '#e8e8e8', 13, 1, 1, 1);
          R(g, '#222', 11, 3); R(g, '#f2a0a0', 4, 8, 2, 1);
          R(g, '#d0d0d0', 2 + f, 8, 2, 3); R(g, '#d0d0d0', 8 - f, 8, 2, 3);
          break;
        case 'sheep':
          R(g, '#f4f4ec', 1, 1, 8, 6); R(g, '#ffffff', 2, 0, 5, 1); R(g, '#dcdcd0', 2, 6, 6, 1); R(g, '#f4f4ec', 0, 3, 1, 2);
          R(g, '#3a3230', 8, 3, 3, 3); R(g, '#fff', 9, 4); R(g, '#3a3230', 8, 2, 1, 1);
          R(g, '#3a3230', 2 + f, 7, 1, 3); R(g, '#3a3230', 7 - f, 7, 1, 3);
          break;
        case 'alpaca':
          R(g, '#ead7b2', 1, 6, 6, 5); R(g, '#d3bf98', 1, 10, 6, 1); R(g, '#ead7b2', 6, 2, 2, 6); R(g, '#ead7b2', 6, 1, 4, 3);
          R(g, '#ead7b2', 6, 0, 1, 1); R(g, '#ead7b2', 8, 0, 1, 1); R(g, '#3a2a1a', 9, 2); R(g, '#3a2a1a', 10, 3);
          R(g, '#d3bf98', 2 + f, 11, 1, 4); R(g, '#d3bf98', 5 - f, 11, 1, 4); R(g, '#ead7b2', 0, 6, 1, 2);
          break;
        case 'bee':
          R(g, '#ffd23c', 0, 1, 3, 2); R(g, '#222', 1, 1, 1, 2); R(g, 'rgba(255,255,255,0.9)', 1, f ? 0 : 3, 2, 1);
          break;
        case 'duck':
          R(g, '#fff8ec', 1, 4, 7, 4); R(g, '#efe3c8', 1, 7, 7, 1); R(g, '#fff8ec', 0, 3, 2, 2); R(g, '#fff8ec', 6, 2, 3, 3);
          R(g, '#f0a030', 7, 3, 2, 1); R(g, '#222', 6, 3, 1, 1);
          R(g, '#f0a030', 2 + f, 8, 1, 2); R(g, '#f0a030', 4 - f, 8, 1, 2);
          break;
        case 'goat':
          R(g, '#ece7dd', 1, 3, 8, 5); R(g, '#d6d0c0', 1, 7, 8, 1); R(g, '#ece7dd', 9, 3, 3, 4); R(g, '#3a3a3a', 11, 4);
          R(g, '#3a2a1a', 9, 1, 1, 2); R(g, '#3a2a1a', 11, 1, 1, 2); R(g, '#ece7dd', 9, 2, 1, 1);
          R(g, '#3a3230', 2 + f, 8, 1, 3); R(g, '#3a3230', 7 - f, 8, 1, 3);
          break;
      }
    });
  };

  /* Bauern-Figur (zwei Lauf-Bilder) */
  art.farmer = function (frame) {
    const f = frame ? 1 : 0;
    return cached('farmer' + f, 12, 16, function (g) {
      R(g, 'rgba(0,0,0,0.2)', 2, 14, 8, 2);
      R(g, '#e8c76a', 1, 2, 10, 1); R(g, '#e8c76a', 3, 0, 6, 2); R(g, '#b88a3a', 3, 1, 6, 1);
      R(g, '#f3c9a0', 4, 3, 4, 3); R(g, '#222', 5, 4); R(g, '#222', 7, 4);
      R(g, '#d84a3a', 3, 6, 6, 3); R(g, '#3a6ea5', 3, 8, 6, 3); R(g, '#3a6ea5', 4, 6, 1, 2); R(g, '#3a6ea5', 7, 6, 1, 2);
      R(g, '#d84a3a', 2, 6, 1, 3); R(g, '#d84a3a', 9, 6, 1, 3); R(g, '#f3c9a0', 2, 9); R(g, '#f3c9a0', 9, 9);
      R(g, '#3a6ea5', 4, 11, 2, 2 + f); R(g, '#3a6ea5', 6, 11, 2, 3 - f);
      R(g, '#5a3a1a', 4, 13 + f, 2, 1); R(g, '#5a3a1a', 6, 14 - f, 2, 1);
    });
  };

  /* Arbeiter (4 Farbvarianten, zwei Lauf-Bilder) */
  const W_SHIRT = ['#3fa53a', '#8a4ab5', '#e0872a', '#2a9ea6'];
  const W_HAT = ['#e8c76a', '#c0392b', '#4a6ea5', '#e8c76a'];
  art.worker = function (frame, variant) {
    const f = frame ? 1 : 0, v = (variant || 0) % 4;
    return cached('worker' + v + f, 12, 16, function (g) {
      R(g, 'rgba(0,0,0,0.2)', 2, 14, 8, 2);
      R(g, W_HAT[v], 1, 2, 10, 1); R(g, W_HAT[v], 3, 0, 6, 2); R(g, U.shade(W_HAT[v], -40), 3, 1, 6, 1);
      R(g, '#f3c9a0', 4, 3, 4, 3); R(g, '#222', 5, 4); R(g, '#222', 7, 4);
      R(g, W_SHIRT[v], 3, 6, 6, 3); R(g, W_SHIRT[v], 2, 6, 1, 3); R(g, W_SHIRT[v], 9, 6, 1, 3);
      R(g, '#f3c9a0', 2, 9); R(g, '#f3c9a0', 9, 9);
      R(g, '#7a5a3a', 3, 9, 6, 2); R(g, '#7a5a3a', 4, 11, 2, 2 + f); R(g, '#7a5a3a', 6, 11, 2, 3 - f);
      R(g, '#3a2a15', 4, 13 + f, 2, 1); R(g, '#3a2a15', 6, 14 - f, 2, 1);
    });
  };
  /* Beutel, den Arbeiter über dem Kopf tragen */
  art.sack = function () {
    return cached('sack', 10, 9, function (g) {
      R(g, '#b8925a', 1, 3, 8, 6); R(g, '#d3ae72', 2, 3, 6, 1); R(g, '#9a763f', 1, 8, 8, 1);
      R(g, '#b8925a', 2, 1, 6, 2); R(g, '#7a5a33', 2, 2, 6, 1);
      R(g, '#f5c542', 4, 5, 2, 2);
    });
  };

  /* Alter Bauer (Einführung) */
  art.oldFarmer = function (frame) {
    const f = frame ? 1 : 0;
    return cached('oldfarmer' + f, 14, 16, function (g) {
      R(g, 'rgba(0,0,0,0.2)', 2, 14, 8, 2);
      R(g, '#8a6a3a', 1, 2, 10, 1); R(g, '#8a6a3a', 3, 0, 6, 2); R(g, '#5a4020', 3, 1, 6, 1);
      R(g, '#e8b890', 4, 3, 4, 2); R(g, '#222', 5, 3); R(g, '#222', 7, 3);
      R(g, '#eeeeee', 4, 5, 4, 3); R(g, '#d0d0d0', 5, 7, 2, 1); R(g, '#e8b890', 6, 5);
      R(g, '#7a5a3a', 2, 7, 8, 3); R(g, '#5a7a3a', 4, 7, 1, 3); R(g, '#5a7a3a', 7, 7, 1, 3);
      R(g, '#7a5a3a', 1, 7, 1, 3); R(g, '#7a5a3a', 10, 7, 1, 3); R(g, '#e8b890', 1, 10); R(g, '#e8b890', 10, 10);
      R(g, '#5a4a3a', 3, 10, 6, 2); R(g, '#5a4a3a', 4, 12, 2, 1 + f); R(g, '#5a4a3a', 6, 12, 2, 2 - f);
      R(g, '#3a2a15', 4, 13 + f, 2, 1); R(g, '#3a2a15', 6, 14 - f, 2, 1);
      R(g, '#6a4a2a', 12, 9, 1, 6); R(g, '#6a4a2a', 11, 8, 2, 1);
    });
  };

  /* Klappriges altes Auto (schaut nach rechts, wird bei Bedarf gespiegelt) */
  art.car = function (frame) {
    const f = frame ? 1 : 0;
    return cached('car' + f, 38, 22, function (g) {
      const body = '#5f8f8a', dark = '#3f6a66', rust = '#a8552e';
      R(g, 'rgba(0,0,0,0.22)', 2, 20, 34, 2);
      // Pritsche
      R(g, body, 1, 8, 13, 7); R(g, dark, 1, 7, 13, 1); R(g, dark, 1, 8, 1, 7); R(g, rust, 4, 10, 4, 3); R(g, '#c9b896', 9, 11, 3, 2);
      // Kabine
      R(g, body, 14, 3, 11, 12); R(g, dark, 14, 2, 11, 1); R(g, '#bfe6f0', 16, 4, 7, 6); R(g, '#ffffff', 18, 5); R(g, '#9ac8d4', 21, 8, 2, 2);
      R(g, rust, 15, 12, 3, 2);
      // Motorhaube
      R(g, body, 25, 9, 10, 6); R(g, dark, 25, 8, 10, 1); R(g, rust, 29, 10, 3, 2); R(g, '#c9b896', 26, 12, 2, 2);
      // Stoßstange, Licht, Auspuff
      R(g, '#a0a0a0', 35, 13, 2, 3); R(g, '#ffe27a', 35, 9, 2, 2); R(g, '#444444', 0, 13, 2, 3); R(g, '#666666', 12, 15, 24, 1);
      // Räder
      [[6, 19], [29, 19]].forEach(function (w) {
        R(g, '#1a1a1a', w[0] - 3, w[1] - 5, 7, 6); R(g, '#1a1a1a', w[0] - 2, w[1] - 6, 5, 8);
        R(g, '#b0b0b0', w[0] - 1, w[1] - 3, 3, 3); R(g, '#606060', w[0], w[1] - 3 + f, 1, 1 + (f ? 0 : 1));
      });
    });
  };
  art.tire = function () {
    return cached('tire', 7, 7, function (g) {
      R(g, '#1a1a1a', 1, 0, 5, 7); R(g, '#1a1a1a', 0, 1, 7, 5); R(g, '#b0b0b0', 2, 2, 3, 3); R(g, '#606060', 3, 3);
    });
  };
  art.key = function () {
    return cached('key', 9, 6, function (g) {
      R(g, '#f5c542', 0, 1, 3, 1); R(g, '#f5c542', 0, 3, 3, 1); R(g, '#f5c542', 0, 2, 1, 1); R(g, '#f5c542', 2, 2, 1, 1);
      R(g, '#f5c542', 3, 2, 5, 1); R(g, '#f5c542', 6, 3, 1, 2); R(g, '#f5c542', 8, 3, 1, 2); R(g, '#ffe27a', 4, 2, 2, 1);
    });
  };

  /* Tierfarm (Grundfläche mit Zaun und Stall, ohne Tiere) */
  art.pen = function (def) {
    const w = def.w * 16, h = def.h * 16;
    return cached('pen_' + def.id, w, h, function (g) {
      const a = def.art;
      if (a.kind === 'bee') {
        R(g, a.ground, 0, 0, 16, 16);
        R(g, '#6cb340', 1, 14, 3, 1); R(g, '#ff5a7a', 2, 13); R(g, '#fff', 13, 12); R(g, '#ffd23c', 12, 13);
        R(g, '#7a4a20', 4, 13, 2, 2); R(g, '#7a4a20', 10, 13, 2, 2);
        R(g, '#e8b830', 3, 6, 10, 7); R(g, '#c8901a', 3, 8, 10, 1); R(g, '#c8901a', 3, 11, 10, 1);
        R(g, '#f5d060', 4, 6, 8, 1); R(g, '#a04a2a', 2, 3, 12, 3); R(g, '#7a3418', 2, 5, 12, 1);
        R(g, '#5a3a1a', 7, 9, 3, 2);
        return;
      }
      R(g, a.ground, 0, 0, w, h);
      const rnd = U.seeded(def.w * 31 + def.h * 7);
      for (let i = 0; i < w * h / 24; i++) R(g, U.shade(a.ground, rnd() > 0.5 ? 14 : -14), Math.floor(rnd() * w), Math.floor(rnd() * h), 1, 1);
      // Zaun
      const wood = '#a8743c', dk = '#7d5228';
      R(g, wood, 0, 1, w, 2); R(g, wood, 0, 4, w, 1);
      R(g, wood, 0, 1, 2, h - 1); R(g, wood, w - 2, 1, 2, h - 1);
      const gate = Math.floor(w / 2) - 6;
      R(g, wood, 0, h - 3, gate, 2); R(g, wood, gate + 12, h - 3, w - gate - 12, 2);
      R(g, 'rgba(0,0,0,0.12)', 0, h - 1, w, 1);
      for (let x = 0; x < w; x += 8) R(g, dk, x, 0, 2, 6);
      for (let x = 0; x < w; x += 8) if (x < gate || x > gate + 10) R(g, dk, x, h - 5, 2, 5);
      R(g, dk, gate, h - 6, 2, 6); R(g, dk, gate + 10, h - 6, 2, 6);
      // Stall
      const sw = Math.min(w - 12, 26), sx = 6;
      R(g, '#d9c090', sx, 10, sw, 9); R(g, '#b89c68', sx, 18, sw, 1);
      R(g, '#5a3a1a', sx + Math.floor(sw / 2) - 3, 12, 6, 7);
      R(g, a.roof, sx - 2, 5, sw + 4, 5); R(g, U.shade(a.roof, -40), sx - 2, 9, sw + 4, 1); R(g, U.shade(a.roof, 40), sx - 2, 5, sw + 4, 1);
      // Futterschale
      R(g, '#7a5a33', w - 12, h - 14, 6, 3); R(g, '#e8c85a', w - 11, h - 15, 4, 1);
    });
  };

  /* ---------- Gebäude ---------- */
  art.house = function () {
    return cached('house', 48, 48, function (g) {
      R(g, 'rgba(0,0,0,0.15)', 2, 45, 46, 3);
      R(g, '#e9d7a8', 4, 22, 40, 24); R(g, '#d6c08a', 4, 22, 40, 2);
      R(g, '#9a9a90', 4, 42, 40, 4); R(g, '#7a7a70', 4, 45, 40, 1);
      R(g, '#8a5a2f', 4, 22, 2, 24); R(g, '#8a5a2f', 42, 22, 2, 24); R(g, '#8a5a2f', 23, 22, 2, 8);
      // Dach
      for (let j = 0; j < 19; j++) {
        const half = Math.min(23, 5 + j * 1.05);
        const x0 = Math.round(24 - half);
        R(g, j % 3 === 2 ? '#a53b26' : '#c14a30', x0, 4 + j, Math.round(half * 2), 1);
        R(g, '#7a2a1a', x0, 4 + j, 1, 1); R(g, '#7a2a1a', x0 + Math.round(half * 2) - 1, 4 + j, 1, 1);
      }
      R(g, '#7a2a1a', 1, 22, 46, 2);
      R(g, '#8a4a3a', 34, 3, 6, 9); R(g, '#6a3a2a', 33, 2, 8, 2); R(g, '#b0b0b0', 35, 0, 2, 2);
      // Tür
      R(g, '#5a3a1a', 19, 30, 10, 16); R(g, '#7a4f28', 20, 31, 8, 15); R(g, '#7a4f28', 20, 31, 8, 1);
      R(g, '#ffd23c', 26, 39, 1, 2); R(g, '#3a2a15', 23, 31, 1, 15);
      R(g, '#8a5a2f', 18, 29, 12, 1); R(g, '#8a5a2f', 18, 29, 1, 17); R(g, '#8a5a2f', 29, 29, 1, 17);
      // Fenster
      [[9, 29], [33, 29]].forEach(function (p) {
        R(g, '#6b3f1f', p[0] - 1, p[1] - 1, 9, 9); R(g, '#9adcf5', p[0], p[1], 7, 7);
        R(g, '#6b3f1f', p[0] + 3, p[1], 1, 7); R(g, '#6b3f1f', p[0], p[1] + 3, 7, 1);
        R(g, '#ffffff', p[0] + 1, p[1] + 1, 1, 1);
        R(g, '#7a4a20', p[0] - 1, p[1] + 8, 9, 2); R(g, '#e85a7a', p[0], p[1] + 8, 2, 1); R(g, '#ffd23c', p[0] + 3, p[1] + 8, 2, 1); R(g, '#e85a7a', p[0] + 5, p[1] + 8, 2, 1);
      });
      // Dachfenster
      R(g, '#6b3f1f', 20, 10, 8, 8); R(g, '#9adcf5', 21, 11, 6, 6); R(g, '#6b3f1f', 23, 11, 1, 6); R(g, '#6b3f1f', 21, 13, 6, 1);
    });
  };

  art.barn = function () {
    return cached('barn', 48, 32, function (g) {
      R(g, 'rgba(0,0,0,0.15)', 2, 29, 46, 3);
      R(g, '#b83a2e', 3, 12, 42, 18); R(g, '#a02f25', 3, 12, 42, 1);
      for (let x = 6; x < 45; x += 4) R(g, '#9a2c22', x, 13, 1, 17);
      // Dach (Mansarde)
      for (let j = 0; j < 12; j++) {
        const half = Math.min(23, 11 + j * 1.2);
        const x0 = Math.round(24 - half);
        R(g, j % 3 === 2 ? '#5a2a26' : '#7a3a34', x0, 1 + j, Math.round(half * 2), 1);
      }
      R(g, '#4a1e1a', 1, 12, 46, 2);
      // Heuboden-Luke
      R(g, '#3a1a16', 19, 4, 10, 7); R(g, '#e8c85a', 20, 8, 8, 3); R(g, '#f5e08a', 21, 8, 3, 1);
      R(g, '#fafafa', 18, 3, 12, 1); R(g, '#fafafa', 18, 3, 1, 8); R(g, '#fafafa', 29, 3, 1, 8);
      // Tor
      R(g, '#8a2a20', 14, 16, 20, 14); R(g, '#fafafa', 14, 16, 20, 1); R(g, '#fafafa', 14, 16, 1, 14); R(g, '#fafafa', 33, 16, 1, 14);
      R(g, '#fafafa', 23, 16, 2, 14);
      for (let i = 0; i < 9; i++) {
        R(g, '#fafafa', 15 + i, 17 + Math.round(i * 12 / 9), 1, 1);
        R(g, '#fafafa', 23 - i, 17 + Math.round(i * 12 / 9), 1, 1);
        R(g, '#fafafa', 25 + i, 17 + Math.round(i * 12 / 9), 1, 1);
        R(g, '#fafafa', 33 - i, 17 + Math.round(i * 12 / 9), 1, 1);
      }
      R(g, '#5a5a5a', 3, 30, 42, 1);
    });
  };

  /* ---------- Deko / Wege ---------- */
  function edges(g, mask, col) {
    if (!(mask & 1)) R(g, col, 0, 0, 16, 1);
    if (!(mask & 2)) R(g, col, 15, 0, 1, 16);
    if (!(mask & 4)) R(g, col, 0, 15, 16, 1);
    if (!(mask & 8)) R(g, col, 0, 0, 1, 16);
  }
  art.decor = function (def, mask) {
    const a = def.art;
    mask = mask || 0;
    const key = 'decor_' + def.id + (a.type === 'path' || a.type === 'fence' || a.type === 'water' ? '_' + mask : '');
    return cached(key, 16, 16, function (g) {
      switch (a.type) {
        case 'path': {
          R(g, a.base, 0, 0, 16, 16);
          const rnd = U.seeded(def.id.length * 17 + 3);
          if (a.stones) {
            [[1, 1, 6, 5], [8, 2, 6, 5], [2, 8, 5, 6], [8, 9, 6, 5]].forEach(function (s) {
              R(g, a.dark, s[0], s[1], s[2], s[3]); R(g, U.shade(a.base, 14), s[0] + 1, s[1] + 1, s[2] - 2, s[3] - 2);
            });
          } else {
            for (let i = 0; i < 14; i++) R(g, i % 2 ? a.dark : U.shade(a.base, 18), Math.floor(rnd() * 16), Math.floor(rnd() * 16), 1, 1);
          }
          edges(g, mask, a.dark);
          break;
        }
        case 'fence': {
          R(g, 'rgba(0,0,0,0.12)', 4, 13, 8, 2);
          if (mask & 2) { R(g, a.wood, 8, 6, 8, 2); R(g, a.wood, 8, 10, 8, 2); }
          if (mask & 8) { R(g, a.wood, 0, 6, 8, 2); R(g, a.wood, 0, 10, 8, 2); }
          if (mask & 1) { R(g, a.wood, 7, 0, 2, 5); }
          if (mask & 4) { R(g, a.wood, 7, 12, 2, 4); }
          R(g, a.dark, 6, 4, 4, 10); R(g, a.wood, 7, 4, 2, 9); R(g, U.shade(a.wood, 30), 7, 3, 2, 1);
          break;
        }
        case 'flowers': {
          R(g, '#5aa83c', 2, 12, 12, 3); R(g, '#3f8a2a', 3, 14, 10, 1);
          [[3, 6], [8, 3], [11, 8], [6, 9], [13, 4]].forEach(function (p, i) {
            const col = a.colors[i % a.colors.length];
            R(g, '#3f8a2a', p[0], p[1] + 2, 1, 4);
            R(g, col, p[0] - 1, p[1], 3, 1); R(g, col, p[0], p[1] - 1, 1, 3); R(g, '#fff6c0', p[0], p[1]);
          });
          break;
        }
        case 'lamp': {
          R(g, 'rgba(0,0,0,0.15)', 4, 14, 8, 2);
          R(g, '#4a4a4a', 7, 5, 2, 10); R(g, '#3a3a3a', 6, 14, 4, 1);
          R(g, '#333', 5, 1, 6, 1); R(g, '#ffd23c', 6, 2, 4, 3); R(g, '#fff2a0', 7, 3, 2, 1); R(g, '#333', 5, 5, 6, 1);
          break;
        }
        case 'hay': {
          R(g, 'rgba(0,0,0,0.15)', 2, 14, 12, 2);
          R(g, '#e0b84a', 3, 5, 10, 9); R(g, '#e0b84a', 2, 6, 12, 7); R(g, '#f0d070', 3, 5, 10, 1);
          R(g, '#b8902a', 3, 8, 10, 1); R(g, '#b8902a', 3, 11, 10, 1); R(g, '#8a6a2a', 7, 5, 2, 9);
          R(g, '#c9a03a', 2, 13, 12, 1);
          break;
        }
        case 'water': {
          R(g, a.dark, 0, 0, 16, 16);
          R(g, a.base, 1, 1, 14, 14);
          const rnd = U.seeded(def.id.length * 31 + 9);
          for (let y = 2; y < 14; y += 3) {
            const off = Math.floor(rnd() * 3);
            R(g, U.shade(a.base, 22), 2 + off, y, 5, 1);
            R(g, U.shade(a.base, -14), 9 - off, y + 1, 5, 1);
          }
          [[3, 4], [11, 9], [6, 12]].forEach(function (p) { R(g, 'rgba(255,255,255,0.5)', p[0], p[1], 2, 1); });
          edges(g, mask, a.dark);
          break;
        }
      }
    });
  };

  /* ---------- Produktionsstätten & Gewächshäuser (Gebäude, w×h Kacheln) ---------- */
  function productIcon(g, icon, x, y) {
    switch (icon) {
      case 'bread': R(g, '#d9a054', x, y, 6, 4); R(g, '#f2c374', x + 1, y, 4, 1); R(g, '#8a5a24', x, y + 3, 6, 1); break;
      case 'meat': R(g, '#c0392b', x, y, 6, 4); R(g, '#e8a0a0', x + 1, y, 3, 1); R(g, '#7a2318', x, y + 3, 6, 1); break;
      case 'cheese': R(g, '#f2c94c', x, y, 6, 4); R(g, '#fff3b0', x + 1, y, 2, 1); R(g, '#c99a1a', x, y + 3, 6, 1); break;
      default: R(g, '#cccccc', x, y, 6, 4);
    }
  }
  art.factory = function (def) {
    const a = def.art, w = def.w * 16, h = def.h * 16, ry = Math.round(h * 0.36);
    return cached('factory_' + def.id, w, h, function (g) {
      R(g, 'rgba(0,0,0,0.15)', 2, h - 3, w - 4, 2);
      R(g, a.wall, 1, ry, w - 2, h - ry - 2);
      for (let x = 2; x < w - 2; x += 2) R(g, U.shade(a.wall, (x / 2) % 2 ? 10 : -10), x, ry + 1, 1, h - ry - 3);
      R(g, U.shade(a.wall, -30), 1, h - 4, w - 2, 2);
      R(g, a.roof, 0, ry - 3, w, 4);
      R(g, U.shade(a.roof, -30), 0, ry, w, 1);
      R(g, U.shade(a.roof, 25), 0, ry - 3, w, 1);
      const dw = 6, dx = Math.round(w / 2 - dw / 2);
      R(g, '#5a3a22', dx, h - 10, dw, 9); R(g, '#3a2414', dx, h - 2, dw, 1); R(g, '#8a5a34', dx + 2, h - 9, 1, 7);
      R(g, '#bfe6ff', 3, h - 9, 3, 3); R(g, '#7ab8dd', 3, h - 9, 3, 1);
      R(g, '#bfe6ff', w - 6, h - 9, 3, 3); R(g, '#7ab8dd', w - 6, h - 9, 3, 1);
      R(g, U.shade(a.wall, -20), w - 8, ry - 10, 4, 8); R(g, U.shade(a.wall, -40), w - 8, ry - 11, 4, 1);
      R(g, '#fff8e0', Math.round(w / 2 - 4), ry + 2, 8, 6); R(g, U.shade('#fff8e0', -40), Math.round(w / 2 - 4), ry + 7, 8, 1);
      productIcon(g, a.icon, Math.round(w / 2 - 3), ry + 3);
    });
  };
  art.greenhouse = function (def) {
    const a = def.art, w = def.w * 16, h = def.h * 16, ry = Math.round(h * 0.3);
    return cached('greenhouse_' + def.id, w, h, function (g) {
      R(g, 'rgba(0,0,0,0.15)', 2, h - 3, w - 4, 2);
      R(g, a.frame, 0, ry, w, 3);
      R(g, U.shade(a.frame, -25), 0, ry, w, 1);
      R(g, 'rgba(185,228,255,0.55)', 1, ry + 3, w - 2, h - ry - 5);
      R(g, 'rgba(255,255,255,0.35)', 1, ry + 3, w - 2, 1);
      for (let x = 3; x < w - 1; x += 5) R(g, a.frame, x, ry + 3, 1, h - ry - 5);
      for (let y = ry + 3; y < h - 2; y += 5) R(g, a.frame, 1, y, w - 2, 1);
      R(g, a.frame, 0, h - 3, w, 2);
      ['#3f9b3a', '#4ba83f', '#58b94a'].forEach(function (c, i) {
        R(g, c, 3 + i * (w / 3), h - 8, 3, 6); R(g, U.shade(c, 40), 3 + i * (w / 3), h - 8, 1, 1);
      });
    });
  };

  /* ---------- Sonstiges ---------- */
  art.coin = function () {
    return cached('coin', 12, 12, function (g) {
      const rows = [[4, 4], [2, 8], [1, 10], [0, 12], [0, 12], [0, 12], [0, 12], [0, 12], [0, 12], [1, 10], [2, 8], [4, 4]];
      rows.forEach(function (r, y) { R(g, '#b8860b', r[0], y, r[1], 1); });
      const inner = [[5, 2], [3, 6], [2, 8], [1, 10], [1, 10], [1, 10], [1, 10], [1, 10], [1, 10], [2, 8], [3, 6], [5, 2]];
      inner.forEach(function (r, y) { if (y > 0 && y < 11) R(g, '#f5c542', r[0], y, r[1], 1); });
      R(g, '#ffe27a', 3, 2, 3, 1); R(g, '#ffe27a', 2, 3, 1, 2);
      R(g, '#8a5a00', 4, 3, 1, 6); R(g, '#8a5a00', 4, 3, 4, 1); R(g, '#8a5a00', 4, 6, 3, 1);
    });
  };

  art.lock = function () {
    return cached('lock', 12, 14, function (g) {
      R(g, '#dcdcdc', 3, 1, 1, 5); R(g, '#dcdcdc', 8, 1, 1, 5); R(g, '#dcdcdc', 4, 0, 4, 1); R(g, '#dcdcdc', 4, 1, 4, 1);
      R(g, '#3a3a3a', 1, 5, 10, 8); R(g, '#c9a03a', 2, 6, 8, 6); R(g, '#f0d070', 2, 6, 8, 1);
      R(g, '#3a3a3a', 5, 8, 2, 2); R(g, '#3a3a3a', 5, 10, 1, 1);
    });
  };

  /* Icon-Bild (Data-URL) für die Oberfläche */
  const iconCache = {};
  art.icon = function (kind, def) {
    const key = kind + '_' + (def ? def.id : '');
    if (iconCache[key]) return iconCache[key];
    let src;
    switch (kind) {
      case 'coin': src = art.coin(); break;
      case 'crop': src = art.cropIcon(def); break;
      case 'tree': src = art.tree(def, true); break;
      case 'animal': src = art.pen(def); break;
      case 'decor': src = art.decor(def, def.art.type === 'path' ? 15 : def.art.type === 'fence' ? 10 : def.art.type === 'water' ? 15 : 0); break;
      case 'factory': src = art.factory(def); break;
      case 'green': src = art.greenhouse(def); break;
      case 'field': src = art.field(null, 0); break;
      case 'house': src = art.house(); break;
      case 'barn': src = art.barn(); break;
      default: src = art.coin();
    }
    // Große Sprites (Tierfarmen) für Icons auf Kachelgröße bringen
    let out = src;
    const m = Math.max(src.width, src.height);
    if (m > 16) {
      const s = 16 / m;
      const c = document.createElement('canvas');
      c.width = Math.round(src.width * s * 2); c.height = Math.round(src.height * s * 2);
      const g = c.getContext('2d');
      g.imageSmoothingEnabled = true;
      g.drawImage(src, 0, 0, c.width, c.height);
      out = c;
    }
    return (iconCache[key] = out.toDataURL());
  };
})();
