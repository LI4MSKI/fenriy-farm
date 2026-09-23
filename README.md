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

### Baumgrößen (`js/data/trees.js`)

Jeder Baum kann optional `art.size` (z. B. `0.8` bis `1.4`) bekommen – rein optisch, verändert nur die Zeichengröße (bodenverankert), nicht das Kachel-Feld (bleibt immer 1×1).

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

### Flüsse & Deko (`js/data/decor.js`)

Ein Fluss ist ein Deko-Eintrag mit `art.type: 'water'` (verbindet sich wie ein Weg mit Nachbarkacheln, plus animiertes Schimmern beim Zeichnen, siehe `waterShimmer()` in `js/core/render.js`). Wege (`'path'`), Zäune (`'fence'`) und Blumenbeete (`'flowers'`) unterstützen mehrere Farbvarianten als eigene Einträge (z. B. Kiesweg, Pflasterweg, Weißer Zaun, Sommerblumen). Eigenständige Deko wie Heuballen, Laterne, Steinhaufen, Zierstrauch oder Vogelscheuche nutzt einen eigenen `art.type` mit passendem `case` in `art.decor` (`js/core/sprites.js`). Neue Deko genauso als Eintrag ergänzen.

### Herumlaufende Wildtiere & Zaun-Tiere (`js/core/wildlife.js`)

Schmetterlinge und Hasen (`FF.wildlife`) wandern rein dekorativ über die Karte, auch durch bebaute Felder. Sie werden nicht gespeichert, sondern bei jedem Laden/Neustart neu verteilt; die Anzahl skaliert automatisch mit der Anzahl gekaufter Grundstücke (`FF.syncWildlife()`, ausgelöst über das `'plot'`-Event). Neue Arten lassen sich in `art.wild()` (`js/core/sprites.js`) und der Typ-Liste in `wildlife.js` ergänzen.

Baust du Zäune, fangen sich zusätzlich Hasen darin (`caught: true`, wandern nur noch in der Nähe gebauter Zaun-Kacheln). Das ist mit einer echten Gameplay-Mechanik verknüpft: `FF.corralCapacity()` (`js/core/logic.js`) berechnet aus der Anzahl gebauter Zaun-Kacheln (`FF.fenceCount()`, jede Zaun-Art zählt) die Anzahl Tierplätze (`C.fenceTilesPerAnimal` Kacheln je Tier, Obergrenze `C.corralMaxAnimals`). Die "Zaun-Tiere" produzieren wie eine Tierfarm passiv Vorrat (`S.corral`), der sich durch Klick auf einen beliebigen Zaun abholen lässt (`FF.collectCorral()`) – auch im Menü unter *Auftrag → Zaun-Tiere*. Werte (Intervall, Wert pro Einheit) stehen in `js/data/config.js`.

### Wind & Pflanzentexturen (`js/core/sprites.js`, `js/core/render.js`)

Gewachsene Feld-Pflanzen wiegen sanft im Wind: `art.field()` cached pro Pflanze/Wachstumsstadium vier leicht versetzte "Sway"-Bilder, `render.js` wählt beim Zeichnen anhand von Spielzeit und Kachel-Position das passende Bild aus (Geschwindigkeit über `C.windSwaySpeed` einstellbar). Die Pflanzenfarben in `cell()` haben zusätzliche helle Glanzlichter für mehr Farbe.

### Produktionsstätten (`js/data/factories.js`)

Verarbeiten deine Ernte zu wertvolleren Waren (Brot, Wurst, Käse, ...). Funktionieren wie Tierfarmen: füllen sich mit der Zeit, werden geerntet und verkauft. `need: { crop: 'wheat' }` oder `need: { animal: 'pigpen' }` legt fest, was zuerst freigeschaltet bzw. gebaut sein muss. Neue Produktionsstätte = neuer Eintrag, dazu ein passendes `icon` (`bread`, `meat`, `cheese`, oder in `js/core/sprites.js` bei `productIcon` ein neues ergänzen).

### Gewächshäuser (`js/data/greenhouses.js`)

Liefern selbst einen kleinen Ertrag und beschleunigen zusätzlich das Wachstum ALLER Felder, Bäume, Tierfarmen und Produktionsstätten um `growth` (z.B. `0.05` = +5 %, mehrere Gewächshäuser stapeln sich). Neue Ausbaustufe = neuer Eintrag.

### Wetter (`js/core/weather.js`)

Seltener, kurzer Regen (manchmal ein Gewitter mit Blitz & Donner), der das Wachstum kurzzeitig beschleunigt. Häufigkeit und Dauer oben in der Datei bei `MIN_GAP`/`MAX_GAP`/`MIN_DUR`/`MAX_DUR` einstellbar.

### Jahreszeiten (`js/core/season.js`)

Frühling, Sommer, Herbst und Winter wechseln sich automatisch ab (Dauer über `DUR` einstellbar, Standard 5 Minuten aktive Spielzeit pro Jahreszeit). Färbt Wiese und Bäume um (siehe `SEASON_GRASS` bzw. die Mix-Farben in `art.tree` in `js/core/sprites.js`) und multipliziert das Wachstum im Freien leicht (`MULT`-Tabelle, Sommer etwas schneller, Winter etwas langsamer). Produktionsstätten und Gewächshäuser sind "drinnen" und bleiben unbeeinflusst – ein guter Grund, im Winter ein Gewächshaus zu bauen.

### Zufällige Ereignisse (`js/core/events.js`)

Ab und zu (Standard: alle 5–10 Minuten aktiver Spielzeit) erscheint oben eine Karte mit einem von drei Ereignissen, die innerhalb von 25 Sekunden angeklickt werden muss: **Reisender Händler** (-20 % Baukosten), **Goldene Stunde** (+25 % Verkaufspreise, je 45 Sekunden) oder **Schatzfund** (sofortiger Fenriy-Bonus). Zeiten stehen oben in der Datei bei `GAP_MIN`/`GAP_MAX`/`OFFER_WIN`/`BUFF_DUR`, neue Ereignis-Typen lassen sich im `TYPES`-Objekt ergänzen.

### Bestenliste (`js/core/leaderboard.js` + `server/`)

Optional: ein kleiner, kostenloser Server (Code liegt in `server/`, Anleitung in `server/README.md`) nimmt Scores entgegen und zeigt die Top 10. Ohne Server zeigt das Menü nur einen Hinweis. Nach dem Deploy die Server-Adresse in `js/data/config.js` bei `leaderboardUrl` eintragen.

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
2. In `index.html` die Zeile `window.FF_BUILD = '0.6.0';` hochzählen (z. B. `'0.6.1'`). Dadurch laden alle Spieler automatisch die neuen Dateien statt der alten aus dem Browser-Cache.
3. Einen Eintrag in `js/data/changelog.js` ergänzen.
4. Dateien auf GitHub hochladen.

**Wichtig:** Die `id` bestehender Einträge nie ändern, sonst verschwinden sie aus alten Spielständen. Neue Dateien musst du in der Liste `files` in `index.html` eintragen.

### Wenn sich das Speicherformat ändert

Erhöhe `saveVersion` in `js/data/config.js` und ergänze in `js/core/state.js` unter `MIGRATIONS` eine Funktion, die alte Spielstände umbaut. Fehlende Felder werden sonst automatisch mit Standardwerten aufgefüllt.

Der Grundstückspreis steigt exponentiell mit jedem gekauften Grundstück, ist aber über `plotPriceCap` (Standard 1.000.000) gedeckelt – wird also ab dieser Summe nicht mehr teurer (`js/data/config.js`, `plotPrice`).

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
js/core/            Spiel-Engine (Logik, Grafik, Eingabe, Oberfläche, Arbeiter, Musik, Einführung, Jahreszeiten, Ereignisse, Wildtiere & Zaun-Tiere)
tools/balance-sim.js  Wirtschafts-Simulation
server/              Optionaler Bestenlisten-Server (separat deployen, siehe server/README.md)
```

## Hinweis zu Fenriy

Fenriy ist hier die Spielwährung. Es gibt keine Verbindung zu einer echten Kryptowährung oder Blockchain.
