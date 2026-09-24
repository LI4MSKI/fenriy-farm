/* MINEN: neue Endgame-Kategorie. Du stellst Arbeiter ein, die nach Erzen graben - mechanisch wie
 * Produktionsstätten (füllen sich mit der Zeit, werden geerntet/verkauft), nur viel teurer und mit
 * viel höherem Ertrag. Bewusst so teuer, dass sie sich erst lohnen, wenn man schon gut etabliert ist
 * (lange Amortisationszeit) - kein Rush-Weg zum Ziel, sondern ein Bonus-Ziel für danach.
 * w, h      Größe in Kacheln
 * cost      Baupreis
 * interval  alle X Sekunden entsteht 1 Ladung Erz
 * value     Verkaufswert pro Ladung
 * product   Name der Ware (nur Anzeige)
 * art       rock/rockdark = Felsfarben, icon = 'coal' | 'iron' | 'gold' | 'gem'
 *
 * Neue Mine hinzufügen = einfach einen weiteren Eintrag ans Ende setzen.
 */
FF.content.mines.push(
  { id: 'coalmine', name: 'Kohlemine', w: 2, h: 2, cost: 8000000, interval: 45, value: 9000, product: 'Kohle',
    art: { rock: '#6b6b62', rockdark: '#454540', icon: 'coal' } },

  { id: 'ironmine', name: 'Eisenmine', w: 3, h: 2, cost: 80000000, interval: 60, value: 33000, product: 'Eisen',
    art: { rock: '#8a7a6a', rockdark: '#5a4e42', icon: 'iron' } },

  { id: 'goldmine', name: 'Goldmine', w: 3, h: 3, cost: 600000000, interval: 75, value: 168750, product: 'Gold',
    art: { rock: '#7a6a58', rockdark: '#4e4438', icon: 'gold' } },

  { id: 'gemmine', name: 'Edelsteinmine', w: 4, h: 3, cost: 5000000000, interval: 90, value: 900000, product: 'Edelsteine',
    art: { rock: '#5a5266', rockdark: '#38334a', icon: 'gem' } }
);
