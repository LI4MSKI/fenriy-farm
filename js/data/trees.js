/* BÄUME (1x1 Kachel)
 * cost      Baupreis
 * interval  alle X Sekunden wächst 1 Frucht nach
 * value     Verkaufswert pro Frucht
 * art       Farben: trunk, leaf, leaf2 (Highlight), fruit
 */
FF.content.trees.push(
  { id: 'apple',  name: 'Apfelbaum',    cost: 150,     interval: 30, value: 15,
    art: { trunk: '#6b4423', leaf: '#3f9b3a', leaf2: '#58b94a', fruit: '#e63b2e' } },

  { id: 'cherry', name: 'Kirschbaum',   cost: 1500,    interval: 30, value: 90,
    art: { trunk: '#5a3a22', leaf: '#e58fb5', leaf2: '#f4b3cf', fruit: '#b3122e' } },

  { id: 'orange', name: 'Orangenbaum',  cost: 15000,   interval: 40, value: 320,
    art: { trunk: '#6b4423', leaf: '#2f8a3a', leaf2: '#49a84b', fruit: '#ff9a1a' } },

  { id: 'olive',  name: 'Olivenbaum',   cost: 150000,  interval: 60, value: 1200,
    art: { trunk: '#7a6a55', leaf: '#8ea86a', leaf2: '#a9c286', fruit: '#3a3a1a' } },

  { id: 'golden', name: 'Fenriy-Baum',  cost: 1500000, interval: 90, value: 4500,
    art: { trunk: '#8a5a1a', leaf: '#e8b830', leaf2: '#ffe066', fruit: '#4fe3ff' } }
);
