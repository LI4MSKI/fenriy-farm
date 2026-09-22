/* Kleine Hilfsfunktionen */
FF.util = (function () {
  const SUFFIX = [
    { v: 1e12, s: ' Bio' },
    { v: 1e9, s: ' Mrd' },
    { v: 1e6, s: ' Mio' }
  ];

  /* Zahl kurz und deutsch formatiert: 1.234 | 12,3 Mio */
  function fmt(n) {
    if (!isFinite(n)) return '0';
    n = Math.floor(n + 1e-9);
    for (let i = 0; i < SUFFIX.length; i++) {
      let x = SUFFIX[i];
      if (n >= x.v) {
        let val = n / x.v;
        if (val >= 999.5 && i > 0) { x = SUFFIX[i - 1]; val = n / x.v; }
        const dec = val >= 100 ? 0 : val >= 10 ? 1 : 2;
        let str = val.toFixed(dec).replace('.', ',');
        if (str.indexOf(',') >= 0) str = str.replace(/,?0+$/, '');
        return str + x.s;
      }
    }
    return n.toLocaleString('de-DE');
  }

  /* Einkommen pro Sekunde (mit Nachkommastellen bei kleinen Werten) */
  function fmtRate(r) {
    if (r < 10) return r.toFixed(1).replace('.', ',');
    return fmt(r);
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h > 0) return h + ' Std ' + m + ' Min';
    if (m > 0) return m + ' Min ' + s + ' s';
    return s + ' s';
  }

  /* Deterministischer Zufall aus Kachel-Koordinaten */
  function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0);
  }

  function seeded(seed) {
    let s = seed >>> 0 || 1;
    return function () {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* Farbe heller/dunkler machen (hex, Betrag -255..255) */
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = clamp((n >> 16) + amt, 0, 255);
    const g = clamp(((n >> 8) & 255) + amt, 0, 255);
    const b = clamp((n & 255) + amt, 0, 255);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  return { fmt, fmtRate, fmtTime, hash, seeded, clamp, shade };
})();
