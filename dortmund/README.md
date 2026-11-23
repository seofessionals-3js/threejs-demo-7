# Wohnungsfinder Dortmund · die Karte

Ganz Dortmund als interaktive 3D-Karte in three.js: 26 × 23 km, jede Straße, jedes Gewässer, jede Grünfläche und rund 379.000 Gebäude aus OpenStreetMap. Sechs erfundene Neubauprojekte stehen darauf, jedes als kleiner Lageplan mit seinen Häusern: freie Grundstücke grün, verkaufte rot, jedes Haus im Ton seiner Fassade. Ein Klick öffnet die Karte des Projekts mit Preis, freien Häusern und Baufortschritt; „Häuser ansehen" führt zu seinen Häusern.

Die Karte ist die Startseite des Wohnungsfinders. Die Häuser der Projekte liegen im selben Repository nebenan (`../haeuser/`), von dort führt „Zur Karte“ hierher zurück.

Vorbild für Aufbau und Funktionen ist die Dubai-Karte von Todor3D für Evolutions: eine Kartenseite, eine Seite pro Immobilie.

## Was die Seite kann

- **Karte bewegen:** ziehen zum Verschieben, Mausrad oder zwei Finger zum Zoomen, rechte Maustaste oder Drehgeste zum Drehen, Pfeiltasten, `+` und `−`, `Q` und `E`. Die Kamera schaut aus der Ferne fast senkrecht und neigt sich beim Näherkommen.
- **Gebäude wachsen:** In der Übersicht sind die Häuser flache Blöcke. Wer näher kommt, bekommt rund um den Blick alle Gebäude mit ihrer Höhe; sie wachsen aus dem Boden.
- **Projekte:** Pins über den Modellen, aus der Ferne nur das Kürzel. Klick auf Pin oder Gebäude: Die Kamera fliegt hin, eine Karte nennt Lage, Kaufpreis, Wohnfläche, Fertigstellung und Baufortschritt. „Häuser ansehen" führt zu den Häusern des Projekts (`../haeuser/`): freie Häuser sind begehbar, jedes mit eigenem Grundriss und Exposé. „Lage in 3D" führt zur Projektseite.
- **Stadtteil-Auswahl:** fliegt zu 16 Stadtteilen oder zurück zur Übersicht.
- **Menü:** drei Reiter. *Projekte* mit Preis, freien Häusern und Bauphase. *Freie Häuser*: alle freien Häuser aller Projekte, nach Preis geordnet, mit Filter für Zimmer und Kaufpreis; ein Klick führt direkt in das Haus. *Leistungen*: was das Bauunternehmen tut, und der Bauablauf in sechs Schritten.
- **Anfrage:** ein Formular für Besichtigung, Rückruf oder Unterlagen, mit Prüfung der Eingaben. Es ist eine Demo: Nichts wird gesendet oder gespeichert.
- **Sprache:** Deutsch und Englisch.
- **Projektseite** (`objekt.html?id=…`): Das Modell dreht sich langsam in seiner Nachbarschaft, daneben das Datenblatt mit Architektur, Baufortschritt (sechs Phasen), Bau & Technik und der Liste der Häuser mit Stand und Preis; jedes freie Haus ist ein Link in das Haus. Darunter „Zurück zur Karte", Google Maps und „Drehen".

## So ist sie gebaut

- **Daten:** `tools/extract.py` schneidet Dortmund und Umgebung aus einem OpenStreetMap-Auszug, `tools/place.py` rückt die erfundenen Projekte auf freie Flächen, `tools/build.py` schreibt daraus gepackte Binärdateien nach `data/`.
- **Zwei Detailstufen:** `data/base.bin.gz` (5,7 MB) enthält die ganze Übersicht: Wasser, Wald, Grün, die großen Straßen als Flächen, die kleinen als Linien, Bahn, Stadtgrenze und alle Gebäude zu Blöcken verschmolzen. Dazu kommen 42 Dateien `data/c_x_z.bin.gz` (zusammen 11 MB) mit jedem einzelnen Gebäude und den kleinen Straßen; geladen wird nur, was in der Nähe des Blicks liegt.
- **Nichts ruckelt beim Nachladen:** Ein Worker (`js/worker.js`) entpackt die Dateien und baut Dächer und Wände samt eingebackenem Licht abseits des Hauptfadens.
- **Kein Licht, keine Schatten zur Laufzeit:** Alle Farben stehen in den Eckpunkten. Die Karte zeichnet nur, wenn sich etwas bewegt, und nichts, solange die Seite verborgen ist. Flächen und Gebäudeblöcke sind in 4-km-Stücke geteilt, damit nur gezeichnet wird, was die Kamera sieht.
- **Schnell beim Projekt:** Karte und Häuserseite laden dieselbe three.js-Datei aus dem Projekt (`../vendor/three/`). Sobald die Karte steht, holt sie die Dateien der Häuserseite in den Cache. Die Seite selbst wird nicht mehr im Hintergrund vorgebaut: Eine zweite 3D-Szene hinter der Karte kostet die Grafikkarte doppelten Speicher und hat schwächere Geräte zum Absturz gebracht. Der Link führt ohne Vorspann direkt zur Reihe.
- **Stabil:** Nimmt der Browser der Karte den WebGL-Kontext, sagt sie es und startet in der sparsamsten Stufe neu.
- **Geräte:** `js/quality.js` wählt die Auflösung nach Gerät (Handy, Laptop mit eingebauter Grafik, Desktop) und regelt nach. Handys laden einen kleineren Umkreis an Gebäuden und lassen Schuppen und Garagen weg.
- **Projekte als Daten:** `js/projects.json` beschreibt jedes Projekt: Architektur (Wand, Dach, Erker, Gaube), die Fassaden seiner Häuser (`style.looks`: Töne, Verbände, Putze, Schalungen, Türen, Dächer), Baufortschritt (`build`), Bau & Technik (`spec`), Zeilen und für jedes Haus Nummer, Stand, Zimmer, Fläche und Preis; freie Häuser nennen dazu ihren Grundriss (`plan` und `var`) und ihre Ausstattung (`fit`). `js/looks.js` liest die Fassade eines Hauses, `js/models.js` baut daraus den Lageplan auf der Karte, die Häuserseite (`../haeuser/`) dieselben Häuser im Detail. `tools/place.py` dreht jedes Projekt so, dass seine Zeilen an der nächsten Straße liegen.

## Karte neu bauen

```bash
pip install osmium shapely numpy mapbox-earcut
# Auszug für den Regierungsbezirk Arnsberg, z. B. von download.openstreetmap.fr
python3 tools/extract.py arnsberg.osm.pbf raw.pkl
python3 tools/place.py raw.pkl        # nur nötig, wenn Projekte dazukommen
python3 tools/build.py raw.pkl data/
```

## Lokal starten

Im Hauptordner des Repositorys (eine Ebene über diesem Ordner), damit auch die Häuserseiten erreichbar sind:

```bash
python -m http.server 8000
```

Dann http://localhost:8000/dortmund/ öffnen. `?q=low|mid|high` erzwingt eine Gerätestufe, `?dpr=1` legt die Auflösung fest, `?still` überspringt den Anflug, `?p=kronenhoefe` öffnet die Karte bei einem Projekt, `?lang=en` zeigt sie englisch.

## Herkunft und Lizenzen

- Kartendaten © [OpenStreetMap](https://www.openstreetmap.org/copyright)-Mitwirkende, [Open Database License](https://opendatacommons.org/licenses/odbl/). Die Dateien in `data/` sind daraus abgeleitet.
- Schrift: Manrope (SIL Open Font License, `fonts/Manrope-OFL.txt`). three.js (MIT) liegt in `../vendor/three/`. Nichts wird von einem CDN oder einem anderen Dienst geladen.
- Alle Projekte, Namen, Preise und Daten sind erfunden. Für ihre Bauplätze wurden in der Karte einzelne echte Gebäude entfernt.
