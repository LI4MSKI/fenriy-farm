/* WEGE, ZÄUNE & DEKO (1x1 Kachel)
 * art.type = 'path' | 'fence' | 'flowers' | 'lamp' | 'hay' | 'water' | 'rock' | 'shrub' | 'scarecrow'
 */
FF.content.decor.push(
  { id: 'dirtpath',    name: 'Erdweg',        cost: 2,   art: { type: 'path', base: '#c9a56a', dark: '#b08d55' } },
  { id: 'stonepath',   name: 'Steinweg',      cost: 8,   art: { type: 'path', base: '#b9b9b0', dark: '#9a9a90', stones: true } },
  { id: 'gravelpath',  name: 'Kiesweg',       cost: 6,   art: { type: 'path', base: '#cdbfa0', dark: '#a89878' } },
  { id: 'cobblepath',  name: 'Pflasterweg',   cost: 18,  art: { type: 'path', base: '#8f8f9a', dark: '#6c6c78', stones: true } },
  { id: 'fence',       name: 'Holzzaun',      cost: 5,   art: { type: 'fence', wood: '#a8743c', dark: '#7d5228' } },
  { id: 'picketfence', name: 'Weißer Zaun',   cost: 9,   art: { type: 'fence', wood: '#e8e2d0', dark: '#b0a888' } },
  { id: 'stonewall',   name: 'Steinmauer',    cost: 16,  art: { type: 'fence', wood: '#9a9a92', dark: '#6a6a62' } },
  { id: 'flowers',     name: 'Blumenbeet',    cost: 10,  art: { type: 'flowers', colors: ['#ff5a7a', '#ffd23c', '#7ab8ff'] } },
  { id: 'flowers2',    name: 'Sommerblumen',  cost: 12,  art: { type: 'flowers', colors: ['#ff9a3a', '#f5c542', '#e0537a'] } },
  { id: 'flowers3',    name: 'Wildblumen',    cost: 12,  art: { type: 'flowers', colors: ['#c85ae0', '#7ab8ff', '#fff6c0'] } },
  { id: 'hay',         name: 'Heuballen',     cost: 15,  art: { type: 'hay' } },
  { id: 'lamp',        name: 'Laterne',       cost: 40,  art: { type: 'lamp' } },
  { id: 'rock',        name: 'Steinhaufen',   cost: 12,  art: { type: 'rock' } },
  { id: 'shrub',       name: 'Zierstrauch',   cost: 14,  art: { type: 'shrub' } },
  { id: 'scarecrow',   name: 'Vogelscheuche', cost: 60,  art: { type: 'scarecrow' } },
  { id: 'water',       name: 'Fluss',         cost: 14,  art: { type: 'water', base: '#3f7fd0', dark: '#264f8a' } }
);
