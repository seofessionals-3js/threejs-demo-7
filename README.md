# Wohnungsfinder Dortmund

Ein Wohnungsfinder in three.js, in zwei Teilen, die zusammengehören: die **Karte** von ganz Dortmund mit sechs erfundenen Neubauprojekten, und die **Häuser** dieser Projekte, jedes anklickbar und begehbar. Die Karte zeigt, wo ein Projekt liegt und was frei ist; „Entdecken“ führt zu seinen Häusern, und von jeder Häuserseite führt „Zur Karte“ zurück.

[**Live ansehen**](https://seofessionals-3js.github.io/threejs-demo-7/) · [**Die Karte im Einzelnen**](dortmund/README.md) · [**Startprompt**](PROMPT.md)

Das ist ein eigenes Projekt. Mit den three.js Demos und ihrer Übersicht hat es nichts zu tun; das Repository heißt nur noch `threejs-demo-7`, damit seine Adressen gültig bleiben. Alle Seiten sprechen einander relativ an, das Projekt läuft also unter jedem Namen und jeder Adresse.

## Die Seiten

- [`dortmund/`](dortmund/): die Karte, die Startseite. 26 × 23 km, jede Straße und rund 379.000 Gebäude aus OpenStreetMap, darauf die sechs Projekte. Dazu `dortmund/objekt.html`, ein Projekt in seiner Nachbarschaft mit Datenblatt. Aufbau, Daten und Lizenzen stehen in [`dortmund/README.md`](dortmund/README.md).
- [`haeuser/`](haeuser/): die Häuser eines Projekts der Karte. Die Seite liest das Projekt aus den Daten der Karte (`dortmund/js/projects.json`): seine Architektur, seine Zeilen und für jedes Haus, ob es frei (grün) oder verkauft (rot) ist. Sechs Projekte, sechs Bauformen: Stadthäuser mit Zinkerker, weiße Kuben mit Dachterrasse, Klinker-Giebelhäuser, 24 Doppelhaushälften mit Garagen in vier Zeilen, Holzhäuser mit Pultdach, Reihenhäuser mit Gaube unter Schiefer. Jedes Haus lässt sich anklicken, am Schild über dem Dach, an den Tasten oben oder an der Fassade, und jedes lässt sich betreten. `?id=…` nennt das Projekt, `?zeile=2` die Zeile, `?haus=14` ein Haus. Unter „Werkzeuge" lassen sich der Sonnenstand von 6 bis 20 Uhr einstellen, das Haus als Grundriss von oben ansehen (Erdgeschoss oder Obergeschoss, das Haus wird in Geschosshöhe geschnitten) und Boden und Einbauten umfärben. Im Haus dreht seitliches Ziehen den Blick, ohne den Standpunkt zu verlassen. Mit `at=310` kommt man ohne Vorspann bei der Reihe an; die Räume der übrigen Häuser werden erst gebaut, wenn das Bild steht.
- [`a-one-door/`](a-one-door/): ein Stadthaus, durch die Glastür hinein
- [`b-the-row/`](b-the-row/): eine Straße mit sechs Stadthäusern und Hausnummern, Haus 04 reservieren
- [`c-the-face/`](c-the-face/): ein Ziegeldetail 1:20, schwarze Binder in weißer Wand, die Sonne streift über das Relief

Die Häuserseiten nutzen eine gemeinsame Engine (`engine/`), jede hat oben den Weg „Zur Karte“.

## Die Häuser: eine Zeichnung, die zum Haus wird

Die Vorderansicht eines Stadthauses, in Trois Crayons auf Tonpapier gezeichnet: schwarze Kreide für Umriss und 45°-Schraffur in jedem Schatten, weiße Kreide für alles, was die Sonne trifft. Beim Scrollen gewinnt die Fassade Tiefe, dann verwandelt ein Scan in Rötel das Papier in weißen Backstein, und kein einziger Schatten bewegt sich, weil die Schraffur die ganze Zeit der echte Schatten war. Die Sonne wandert, die Tür öffnet sich, und Sie gehen durch das Haus bis in den Garten.

Das Haus der Seite `a-one-door/` ist **No. 7 Kreidegasse**: sechs Meter breit, zwei Geschosse, weißer Backstein unter einem Dach aus Zink. Der Eingang liegt 1,20 m zurück, darüber kragt ein Erker 800 mm aus. Die Tür ist eine Glastür mit zwei Flügeln in oxidroten Stahlrahmen, 2,00 m breit. Dahinter liegt eine Halle über beide Geschosse.

## Farben

Das Blatt ist ein Trois Crayons: schwarze Kreide, weiße Kreide und ein einziges Rötel auf getöntem Papier. Nach dem Scan folgt das gebaute Haus im späten Oktoberlicht. Der Scan ändert keinen Schatten, nur das Material.

| Rolle | Farbe |
| --- | --- |
| Papier | `#dfd2ba` (hell `#eadfcb`, dunkel `#d2c3a7`) |
| Umriss und Schraffur, schwarze Kreide | `#2a2522`, weich `#6e6257` |
| Lichter, weiße Kreide | `#fcf9f2` |
| Akzent Rötel (Tür, Scankante, Links) | `#a5432b`, hell `#c65e42`, Text `#8f3620` |
| Weißer Backstein, Fuge, schwarzer Binder | `#efebe2`, `#d9d3c7`, `#2f2c2a` |
| Zink, schwarzer Stahl, Eiche, Stein, Putz | `#7a858d`, `#2f2c2a`, `#b88b55`, `#cdc5b5`, `#f2efe8` |
| Oxidroter Stahl, nur Haustür und Rahmen | `#9a3f2a` |
| Rasen, Ahorn im Oktober | `#86995f`, `#c9622a` `#d98b2f` `#a8452f` |
| Himmel | `#dfe6ea` im Zenit, `#f0e2c8` am Horizont, tiefe warme Sonne |

## So funktioniert es

- **Die Ansicht ist das Haus.** Das 3D-Modell wird frontal durch ein 2°-Objektiv gesehen und wirkt deshalb wie eine orthogonale Zeichnung.
- **Die Schraffur wird berechnet.** Die Sonne startet nach der Zeichenkonvention, Licht von links oben unter 45°. Jedes Pixel, das die Shadow-Map in den Schatten legt, bekommt eine 45°-Schraffur, sodass gezeichnete und echte Schatten dieselben Formen haben.
- **Bauformen.** `house()` in `engine/elevation.js` baut ein Haus aus Optionen: Wand (`wall`, `brick`), Tür (`doorColor`), Obergeschoss (`first`: Erker, Steinrahmen, Fenster, Balkon), Dach (`roof`: Satteldach, Giebel zur Straße, Pultdach, Flachdach; dazu `dormer`, `terrace`, `roofColor`) und Giebelwände, wo kein Nachbar steht (`sideL`, `sideR`).
- **Ein Material für jede Fläche.** `mat()` in `engine/elevation.js` patcht das Standardmaterial: Papier und Schraffur auf der einen Seite des Scans, Backstein, Stein, Zink und Glas auf der anderen. Das Glas der Haustür ist auf der Zeichnung Papier und wird erst mit dem Scan durchsichtig.
- **Kamera-Keys sind Bildausschnitte** (Ziel, Bildhöhe, Objektiv). Der Abstand ergibt sich daraus, und das Objektiv wird im Log-Raum überblendet, sodass es sich ohne Sprung von 2° auf 55° öffnet. Im Haus werden die Keys vom Standpunkt der Kamera aus geschrieben (`h.key`), und ein Haus mit der Tür rechts spiegelt sie selbst.
- **Kein Clipping.** Die Kamera hält im Haus mindestens 40 cm Abstand zu jeder Fläche. `window.__clear()` misst das: der exakte Abstand vom Auge zu jedem Dreieck über den ganzen Weg. Zurzeit ist der kleinste Wert 0,55 m, neben der Treppe.
- **Nur three.js.** Keine weitere Bibliothek. Das Scrollen bleibt das der Seite, die Engine glättet nur den Wert, der die Kamera führt.
- Die Umrisse zeichnen sich beim Laden selbst, von unten nach oben, jede Linie wächst entlang ihrer Länge.

## Dateien

`engine/elevation.js` und `engine/page.css` werden von den Häuserseiten gemeinsam genutzt. Jede von ihnen besteht aus einer `index.html` und einer `page.js` mit ihren Kamera-Keys und Texten. Etwa 100 KB für die Seite mit einem Haus.

`?skip` überspringt das Intro. `?at=300` springt zu einer Scrollposition. `?nosmooth` folgt dem Scroll ohne Glättung.

## Lokal starten

Die Seiten nutzen JavaScript-Module und brauchen deshalb einen lokalen Server. Ein Doppelklick auf `index.html` funktioniert nicht.

```bash
python -m http.server 8000
```

Dann http://localhost:8000/ öffnen: Die Startadresse führt zur Karte. Am besten auf einem Laptop mit aktuellem Browser.

## Herkunft und Lizenz

Basiert auf „Sunlit Elevation“ aus [flat-to-3d](https://github.com/Sam1983Aing/flat-to-3d) von Samnang Aing, veröffentlicht unter der MIT-Lizenz, und ins Deutsche übersetzt. Haus, Grundriss, Einrichtung und Farbwelt dieser Fassung sind neu. Die Lizenz liegt unverändert in [LICENSE](LICENSE).

Alle Büros, Häuser, Projekte, Adressen, Preise und Kontaktdaten sind erfunden. three.js (MIT) wird von einem CDN geladen, die Schriften Chakra Petch und IBM Plex Mono von Google Fonts (SIL Open Font License). Die Kartendaten stammen von OpenStreetMap (Open Database License), die Schrift der Karte ist Manrope (SIL Open Font License); Näheres in [`dortmund/README.md`](dortmund/README.md).
