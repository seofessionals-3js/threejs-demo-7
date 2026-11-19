# three.js Demo 7

Die Vorderansicht eines Stadthauses, mit Tusche gezeichnet und mit 45°-Schraffur in jedem Schatten. Beim Scrollen gewinnt die Fassade Tiefe, dann verwandelt ein Scan das Papier in Backstein, und kein einziger Schatten bewegt sich, weil die Schraffur die ganze Zeit der echte Schatten war. Die Sonne wandert, die Tür öffnet sich, und Sie gehen durch das Haus bis in den Hof.

[**Live ansehen**](https://seofessionals-3js.github.io/threejs-demo-7/a-one-door/) · [**Startprompt**](PROMPT.md) · [**Alle Demos**](https://seofessionals-3js.github.io/threejs-demos/)

Drei Varianten mit einer Engine:

- [`a-one-door/`](a-one-door/): ein Stadthaus, durch die Haustür hinein (die Hauptdemo)
- [`b-the-row/`](b-the-row/): eine Straße mit sechs Stadthäusern und Hausnummern, Haus 04 reservieren
- [`c-the-face/`](c-the-face/): ein Ziegeldetail 1:20, die Sonne streift über das Relief

## So funktioniert es

- **Die Ansicht ist das Haus.** Das 3D-Modell wird frontal durch ein 2°-Objektiv gesehen und wirkt deshalb wie eine orthogonale Zeichnung.
- **Die Schraffur wird berechnet.** Die Sonne startet nach der Zeichenkonvention, Licht von links oben unter 45°. Jedes Pixel, das die Shadow-Map in den Schatten legt, bekommt eine 45°-Schraffur, sodass gezeichnete und echte Schatten dieselben Formen haben.
- **Ein Material für jede Fläche.** `mat()` in `engine/elevation.js` patcht das Standardmaterial: Papier und Schraffur auf der einen Seite des Scans, Backstein, Stein, Zink und Glas auf der anderen.
- **Kamera-Keys sind Bildausschnitte** (Ziel, Bildhöhe, Objektiv). Der Abstand ergibt sich daraus, und das Objektiv wird im Log-Raum überblendet, sodass es sich ohne Sprung von 2° auf 55° öffnet.
- Die Umrisse zeichnen sich beim Laden selbst, von unten nach oben, jede Linie wächst entlang ihrer Länge.

## Dateien

`engine/elevation.js` und `engine/page.css` werden gemeinsam genutzt. Jede Variante besteht aus einer `index.html` und einer `page.js` mit ihren Kamera-Keys und Texten. Etwa 100 KB für die Hauptdemo.

`?skip` überspringt das Intro. `?at=300` springt zu einer Scrollposition.

## Lokal starten

Die Seiten nutzen JavaScript-Module und brauchen deshalb einen lokalen Server. Ein Doppelklick auf `index.html` funktioniert nicht.

```bash
python -m http.server 8000
```

Dann http://localhost:8000/ öffnen. Am besten auf einem Laptop mit aktuellem Browser.

## Herkunft und Lizenz

Basiert auf „Sunlit Elevation“ aus [flat-to-3d](https://github.com/Sam1983Aing/flat-to-3d) von Samnang Aing, veröffentlicht unter der MIT-Lizenz, und ins Deutsche übersetzt. Die Lizenz liegt unverändert in [LICENSE](LICENSE).

Alle Büros, Häuser, Adressen und Kontaktdaten in der Demo sind erfunden. three.js (MIT) wird von einem CDN geladen, die Schriften Chakra Petch und IBM Plex Mono von Google Fonts (SIL Open Font License).
