# Fenriy Farm

Ein 2D-Bauernhof-Spiel für den Browser mit Pixel-Grafik. Du startest mit Hofhaus, Scheune und einem kleinen Feld und willst **100.000.000 Fenriy** verdienen.

## Spielen

- **Lokal:** `index.html` per Doppelklick im Browser öffnen.
- **Online (GitHub Pages):**
  1. Neues Repository auf GitHub anlegen (z. B. `fenriy-farm`).
  2. Den kompletten Inhalt dieses Ordners hochladen (`index.html`, `css/`, `js/`, `tools/`).
  3. Im Repository: *Settings → Pages → Branch: main → Save*.
  4. Nach ca. einer Minute läuft das Spiel unter `https://LI4MSKI.github.io/fenriy-farm/`.

Der Spielstand wird automatisch im Browser gespeichert (localStorage). Im Menü (*Auftrag*) gibt es Export/Import, um ihn zu sichern oder auf ein anderes Gerät zu holen.

## Steuerung

| Aktion | Maus | Handy |
|---|---|---|
| Ernten, säen, Produkte einsammeln | Klicken oder mit gedrückter Maus über Felder ziehen | Tippen / ziehen |
| Bauen, Abreißen | Werkzeug wählen, dann klicken oder ziehen | Tippen / ziehen |
| Karte bewegen | Rechtsklick ziehen, WASD / Pfeiltasten, oder Werkzeug *Karte* | Zwei Finger |
| Zoom | Mausrad, + / − | Zwei Finger (Pinch) oder + / − |
| Grundstück kaufen | Auf gesperrtes Land neben deinem Land klicken | Tippen |

Klick auf das Hofhaus öffnet den Auftrag, Klick auf die Scheune die Upgrades.

## Updates hinzufügen (das Wichtigste)

Alle Spielinhalte stehen als einfache Listen in `js/data/`. **Ein neuer Eintrag genügt, dann erscheint der Inhalt im Spiel** (Bau-Menü, Saatgut-Leiste, Grafik). Alte Spielstände funktionieren weiter.

### Neue Pflanze (`js/data/crops.js`)

```js
{ id: 'strawberry', name: 'Erdbeere', unlock: 150000, seed: 200, time: 100, yield: 1100,
  art: { type: 'bush', fruit: '#e0203a', leaf: '#3c9a3c' } },
```

`art.type` kann `tall`, `root`, `bush` oder `vine` sein. Mit `big: true` werden die Früchte größer.

### Neuer Baum (`js/data/trees.js`)

```js
{ id: 'pear', name: 'Birnbaum', cost: 5000, interval: 35, value: 250,
  art: { trunk: '#6b4423', leaf: '#4fa83c', leaf2: '#6cc255', fruit: '#c8d83a' } },
```

### Neue Tierfarm (`js/data/animals.js`)

```js
{ id: 'goats', name: 'Ziegenstall', w: 3, h: 2, cost: 25000, interval: 50, value: 2600, product: 'Ziegenkäse',
  count: 3, art: { kind: 'sheep', ground: '#9ac85a', roof: '#3a7a5a' } },
```

`kind` wählt das Tier-Aussehen (`chicken`, `pig`, `cow`, `sheep`, `alpaca`, `bee`). Ein ganz neues Tier ist ein kleiner Eintrag in `art.animal(...)` in `js/core/sprites.js`.

### Neues Upgrade (`js/data/upgrades.js`)

Vorhandene Effekte: `harvester`, `autosow`, `growth`, `price`, `capacity`, `workers` (Anzahl Arbeiter), `workerspeed` (Lauftempo der Arbeiter). Einfach eine weitere Stufe oder ein weiteres Upgrade mit demselben `effect` eintragen (Werte werden kombiniert).

### Arbeiter

Arbeiter (Upgrade *Arbeiter*) laufen selbstständig zu reifen Feldern, Bäumen und Tierfarmen, ernten, säen leere Felder neu, tragen die Ware zur Scheune und verkaufen sie mit Bonus. Einstellungen in `js/data/config.js`: `workerCarry` (wie viel sie tragen) und `workerBonus` (Verkaufsaufschlag). Das Verhalten steht in `js/core/workers.js`.

### Musik und Geräusche (`js/core/audio.js`)

Die Musik wird live im Browser erzeugt (keine Audiodateien). Die Melodie ändern: Tabellen `CHORDS` (Akkorde pro Takt) und `MELODY` (8 Achtel pro Takt, Zahl = MIDI-Ton, `null` = Pause) bearbeiten; `BPM` und `SWING` bestimmen Tempo und Schunkel-Gefühl. Musik und Effekte lassen sich mit dem ♪-Knopf bzw. im Menü (*Auftrag → Ton*) ausschalten.

### Einführung (`js/core/cutscene.js`)

Der Monolog des alten Bauern steht in `buildSteps()`, jede `say('Alter Bauer', '...')`-Zeile ist eine Sprechblase. Neue Schritte: `say`, `wait`, `act`, `until`. Die Einführung läuft bei einem neuen Spiel und nach *Neustart* und kann mit *Überspringen* oder Esc beendet werden.

### Ränge, Neuigkeiten, Deko

`ranks.js`, `changelog.js`, `decor.js` funktionieren nach dem gleichen Prinzip.

### Update veröffentlichen

1. Änderungen in den Dateien machen.
2. In `index.html` die Zeile `window.FF_BUILD = '0.2.0';` hochzählen (z. B. `'0.2.1'`). Dadurch laden alle Spieler automatisch die neuen Dateien statt der alten aus dem Browser-Cache.
3. Einen Eintrag in `js/data/changelog.js` ergänzen.
4. Dateien auf GitHub hochladen.

**Wichtig:** Die `id` bestehender Einträge nie ändern, sonst verschwinden sie aus alten Spielständen. Neue Dateien musst du in der Liste `files` in `index.html` eintragen.

### Wenn sich das Speicherformat ändert

Erhöhe `saveVersion` in `js/data/config.js` und ergänze in `js/core/state.js` unter `MIGRATIONS` eine Funktion, die alte Spielstände umbaut. Fehlende Felder werden sonst automatisch mit Standardwerten aufgefüllt.

## Preise abstimmen

```
node tools/balance-sim.js
```

Ein Bot spielt das Spiel gierig durch und zeigt, wann er welche Meilensteine erreicht und wie lange er bis zum Ziel braucht. Aktuell schafft der Bot es in ca. 50 Minuten. Ein Mensch braucht vermutlich länger, weil er nicht jeden Moment optimal kauft. Nach dem Ändern von Preisen einfach nochmal laufen lassen. Mit `--eff=0.5` simulierst du einen weniger effizienten Spieler.

## Ordner

```
index.html          Startseite, lädt alle Scripts (FF_BUILD = Version)
css/style.css       Aussehen der Oberfläche
js/data/            Spielinhalt (hier arbeitest du für Updates)
js/core/            Spiel-Engine (Logik, Grafik, Eingabe, Oberfläche, Arbeiter, Musik, Einführung)
tools/balance-sim.js  Wirtschafts-Simulation
```

## Hinweis zu Fenriy

Fenriy ist hier die Spielwährung. Es gibt keine Verbindung zu einer echten Kryptowährung oder Blockchain.
