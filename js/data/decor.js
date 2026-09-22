/* WEGE, ZÄUNE & DEKO (1x1 Kachel)
 * art.type = 'path' | 'fence' | 'flowers' | 'lamp' | 'hay'
 */
FF.content.decor.push(
  { id: 'dirtpath',  name: 'Erdweg',      cost: 2,   art: { type: 'path', base: '#c9a56a', dark: '#b08d55' } },
  { id: 'stonepath', name: 'Steinweg',    cost: 8,   art: { type: 'path', base: '#b9b9b0', dark: '#9a9a90', stones: true } },
  { id: 'fence',     name: 'Holzzaun',    cost: 5,   art: { type: 'fence', wood: '#a8743c', dark: '#7d5228' } },
  { id: 'flowers',   name: 'Blumenbeet',  cost: 10,  art: { type: 'flowers', colors: ['#ff5a7a', '#ffd23c', '#7ab8ff'] } },
  { id: 'hay',       name: 'Heuballen',   cost: 15,  art: { type: 'hay' } },
  { id: 'lamp',      name: 'Laterne',     cost: 40,  art: { type: 'lamp' } },
  { id: 'water',     name: 'Fluss',       cost: 14,  art: { type: 'water', base: '#3f7fd0', dark: '#264f8a' } }
);
