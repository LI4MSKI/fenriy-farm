/* GEWÄCHSHÄUSER: wachsen unabhängig vom Wetter, liefern selbst einen kleinen Ertrag UND
 * beschleunigen das Wachstum ALLER Felder, Bäume, Tierfarmen und Produktionsstätten ein wenig
 * (mehrere Gewächshäuser wirken zusammen und stapeln sich).
 * growth    zusätzliche Wachstums-Geschwindigkeit pro gebautem Gewächshaus dieses Typs (0.05 = +5 %)
 *
 * Neues Gewächshaus (z.B. eine größere Ausbaustufe) hinzufügen = einfach einen weiteren Eintrag ans Ende setzen.
 */
FF.content.greenhouses.push(
  { id: 'greenhouse', name: 'Gewächshaus', w: 2, h: 2, cost: 3000, interval: 22, value: 70, growth: 0.05,
    art: { frame: '#6b7a3a', roof: '#4a5a2a' } }
);
