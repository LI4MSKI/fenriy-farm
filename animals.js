/* TIERFARMEN / GEBÄUDE
 * w, h      Größe in Kacheln
 * cost      Baupreis
 * interval  alle X Sekunden entsteht 1 Produkt
 * value     Verkaufswert pro Produkt
 * product   Name des Produkts (nur Anzeige)
 * count     Anzahl sichtbarer Tiere
 * art       kind = 'bee' | 'chicken' | 'pig' | 'cow' | 'sheep' | 'alpaca'
 *           ground = Bodenfarbe, roof = Dachfarbe
 */
FF.content.animals.push(
  { id: 'beehive',  name: 'Bienenhaus',   w: 1, h: 1, cost: 250,     interval: 45,  value: 40,      product: 'Honig',
    count: 3, art: { kind: 'bee', ground: '#7bc74d', roof: '#e8b830' } },

  { id: 'duckcoop', name: 'Entenstall',   w: 2, h: 2, cost: 900,     interval: 35,  value: 75,      product: 'Federn',
    count: 3, art: { kind: 'duck', ground: '#bcd6e0', roof: '#3b6ea5' } },

  { id: 'coop',     name: 'Hühnerstall',  w: 2, h: 2, cost: 2500,    interval: 30,  value: 240,     product: 'Eier',
    count: 3, art: { kind: 'chicken', ground: '#c9b06a', roof: '#c0392b' } },

  { id: 'goatpen',  name: 'Ziegenweide',  w: 3, h: 2, cost: 6000,    interval: 40,  value: 520,     product: 'Ziegenmilch',
    count: 4, art: { kind: 'goat', ground: '#a8c96a', roof: '#8a5a2f' } },

  { id: 'pigpen',   name: 'Schweinestall', w: 3, h: 2, cost: 10000,  interval: 45,  value: 1200,    product: 'Speck',
    count: 3, art: { kind: 'pig', ground: '#8a6a45', roof: '#a04a2a' } },

  { id: 'cowbarn',  name: 'Kuhstall',     w: 3, h: 3, cost: 60000,   interval: 60,  value: 4900,   product: 'Milch',
    count: 4, art: { kind: 'cow', ground: '#a3c85a', roof: '#3b6ea5' } },

  { id: 'sheep',    name: 'Schafweide',   w: 4, h: 3, cost: 400000,  interval: 90,  value: 17300,  product: 'Wolle',
    count: 5, art: { kind: 'sheep', ground: '#8fd05a', roof: '#7a4a9a' } },

  { id: 'alpaca',   name: 'Alpaka-Ranch', w: 4, h: 4, cost: 3000000, interval: 120, value: 57600, product: 'Alpaka-Vlies',
    count: 5, art: { kind: 'alpaca', ground: '#b5d46a', roof: '#d0873a' } }
);
