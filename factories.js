/* PRODUKTIONSSTÄTTEN: verarbeiten deine Ernte zu wertvolleren Waren (Brot, Wurst, Käse, ...)
 * w, h      Größe in Kacheln
 * cost      Baupreis
 * interval  alle X Sekunden entsteht 1 Ware
 * value     Verkaufswert pro Ware
 * product   Name der Ware (nur Anzeige)
 * need      Voraussetzung zum Bauen: { crop: 'id' } (Pflanze freigeschaltet) oder { animal: 'id' } (Tierfarm gebaut)
 * art       wall/roof = Farben, icon = 'bread' | 'meat' | 'cheese'
 *
 * Funktioniert genau wie Bäume/Tierfarmen: füllt sich mit der Zeit und wird geerntet/verkauft.
 * Neue Produktionsstätte hinzufügen = einfach einen weiteren Eintrag ans Ende setzen.
 */
FF.content.factories.push(
  { id: 'bakery', name: 'Bäckerei', w: 2, h: 2, cost: 4000, interval: 20, value: 165, product: 'Brot',
    need: { crop: 'wheat' }, art: { wall: '#d9a054', roof: '#8a3a2e', icon: 'bread' } },

  { id: 'butcher', name: 'Metzgerei', w: 2, h: 2, cost: 35000, interval: 35, value: 1450, product: 'Wurst',
    need: { animal: 'pigpen' }, art: { wall: '#c9b7a0', roof: '#7a2318', icon: 'meat' } },

  { id: 'dairy', name: 'Käserei', w: 2, h: 2, cost: 220000, interval: 45, value: 6300, product: 'Käse',
    need: { animal: 'cowbarn' }, art: { wall: '#e8e0c8', roof: '#3a6ea5', icon: 'cheese' } }
);
