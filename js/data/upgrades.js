/* UPGRADES
 * effect  legt fest, was das Upgrade bewirkt (wird in logic.js ausgewertet):
 *   'harvester'  values[]  = Sekunden zwischen automatischen Ernten
 *   'autosow'    (nur 1 Stufe) = geerntete Felder werden automatisch neu bepflanzt
 *   'growth'     values[]  = Wachstums-Geschwindigkeit (Faktor)
 *   'price'      values[]  = Verkaufspreis-Faktor
 *   'capacity'   values[]  = Lagerplatz pro Baum/Tierfarm
 *   'workers'    values[]  = Anzahl Arbeiter (ernten, säen neu, verkaufen auf dem Markt)
 *   'workerspeed' values[] = Lauftempo der Arbeiter (Faktor)
 * costs[]  Preis je Stufe (Länge = Anzahl Stufen)
 * values[] Wert je Stufe (Stufe 0 = Grundwert steht in "base")
 */
FF.content.upgrades.push(
  { id: 'harvester', name: 'Erntehelfer', effect: 'harvester', base: 0,
    desc: 'Sammelt reife Ernte & Produkte automatisch alle X Sekunden ein.',
    costs:  [1500, 15000, 200000, 3000000, 40000000],
    values: [30, 15, 8, 4, 2], unit: 's' },

  { id: 'autosow', name: 'Sämaschine', effect: 'autosow', base: 0,
    desc: 'Geerntete Felder werden automatisch mit der gleichen Pflanze neu bestellt.',
    costs:  [8000], values: [1] },

  { id: 'fertilizer', name: 'Dünger', effect: 'growth', base: 1,
    desc: 'Alles wächst und produziert schneller.',
    costs:  [600, 6000, 60000, 700000, 8000000],
    values: [1.2, 1.4, 1.6, 1.8, 2.0], unit: 'x' },

  { id: 'trade', name: 'Handelsposten', effect: 'price', base: 1,
    desc: 'Bessere Verkaufspreise für alles.',
    costs:  [1000, 12000, 150000, 2000000, 25000000],
    values: [1.1, 1.2, 1.3, 1.4, 1.5], unit: 'x' },

  { id: 'storage', name: 'Lagerhaus', effect: 'capacity', base: 5,
    desc: 'Bäume und Tierfarmen können mehr Produkte lagern, bevor sie voll sind.',
    costs:  [2000, 40000, 800000],
    values: [10, 15, 20], unit: '' },

  { id: 'workers', name: 'Arbeiter', effect: 'workers', base: 0,
    desc: 'Stellt Helfer ein: Sie ernten, säen neu, tragen alles zum Markt und verkaufen mit +10 % Bonus.',
    costs:  [4000, 40000, 500000, 6000000, 60000000],
    values: [1, 2, 3, 5, 8], unit: '' },

  { id: 'boots', name: 'Gummistiefel', effect: 'workerspeed', base: 1,
    desc: 'Deine Arbeiter laufen schneller.',
    costs:  [8000, 150000, 3000000],
    values: [1.3, 1.7, 2.2], unit: 'x' }
);
