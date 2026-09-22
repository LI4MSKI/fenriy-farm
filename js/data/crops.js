/* PFLANZEN
 * id      eindeutiger Name (nie ändern, sonst gehen Spielstände kaputt)
 * unlock  Preis zum Freischalten (0 = von Anfang an)
 * seed    Kosten pro Aussaat
 * time    Wachstumszeit in Sekunden
 * yield   Verkaufswert bei der Ernte (Fenriy)
 * art     Aussehen: type = 'tall' | 'root' | 'bush' | 'vine', plus Farben
 *
 * Neue Pflanze hinzufügen = einfach einen weiteren Eintrag ans Ende setzen.
 */
FF.content.crops.push(
  { id: 'wheat',   name: 'Weizen',      unlock: 0,        seed: 1,      time: 10,  yield: 3,
    art: { type: 'tall', stem: '#d9b83a', fruit: '#f2d23c', leaf: '#8fbf3a' } },

  { id: 'carrot',  name: 'Karotte',     unlock: 100,      seed: 3,      time: 20,  yield: 13,
    art: { type: 'root', fruit: '#f28a1e', leaf: '#3fa53a' } },

  { id: 'potato',  name: 'Kartoffel',   unlock: 800,      seed: 10,     time: 40,  yield: 60,
    art: { type: 'root', fruit: '#c9a15a', leaf: '#4ba83f' } },

  { id: 'tomato',  name: 'Tomate',      unlock: 6000,     seed: 30,     time: 60,  yield: 190,
    art: { type: 'bush', fruit: '#e63b2e', leaf: '#3c9a3c' } },

  { id: 'corn',    name: 'Mais',        unlock: 45000,    seed: 100,    time: 90,  yield: 550,
    art: { type: 'tall', stem: '#4fa83f', fruit: '#f7dc3b', leaf: '#3c9a3c', big: true } },

  { id: 'pumpkin', name: 'Kürbis',      unlock: 350000,   seed: 350,    time: 120, yield: 1400,
    art: { type: 'bush', fruit: '#f0781a', leaf: '#2f8a3a', big: true } },

  { id: 'grape',   name: 'Weintraube',  unlock: 2800000,  seed: 1200,   time: 180, yield: 4100,
    art: { type: 'vine', fruit: '#7a2fb5', leaf: '#3c9a3c' } },

  { id: 'crystal', name: 'Fenriy-Frucht', unlock: 25000000, seed: 4000,   time: 240, yield: 11000,
    art: { type: 'bush', fruit: '#4fe3ff', leaf: '#2aa6a0', big: true } }
);
