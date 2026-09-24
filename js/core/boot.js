/* Fenriy Farm - Grundgerüst
 * Alle Spielinhalte (Pflanzen, Bäume, Tiere, Deko, Upgrades, Ränge) werden in
 * js/data/*.js in diese Listen eingetragen. Neuer Inhalt = neuer Eintrag.
 */
window.FF = {
  content: {
    crops: [],      // Pflanzen (wachsen auf Feldern)
    trees: [],      // Bäume (liefern Früchte)
    animals: [],    // Tierfarmen / Gebäude (liefern Produkte)
    decor: [],      // Wege, Zäune, Deko
    factories: [],  // Produktionsstätten (verarbeiten Ernte zu Brot, Fleisch, Käse, ...)
    greenhouses: [],// Gewächshäuser (Wachstums-Bonus + eigener Ertrag)
    mines: [],      // Minen (Arbeiter suchen nach Erzen, sehr teuer, viel Ertrag)
    upgrades: [],   // Upgrades
    ranks: [],      // Rang-Titel nach verdientem Fenriy
    changelog: []   // Neuigkeiten
  },
  config: {},
  art: {},
  state: null
};

/* Hilfsfunktion: Eintrag anhand der ID finden */
FF._idx = {};
FF.find = function (kind, id) {
  const list = FF.content[kind];
  let idx = FF._idx[kind];
  if (!idx || idx.n !== list.length) {
    idx = FF._idx[kind] = { n: list.length, map: {} };
    for (let i = 0; i < list.length; i++) idx.map[list[i].id] = list[i];
  }
  return idx.map[id] || null;
};
