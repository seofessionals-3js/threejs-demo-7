# Version 2: fotografierte Oberflächen und echte Möbel

Version 2 ist derselbe Wohnungsfinder mit denselben Seiten, Adressen und Rundgängen wie Version 1. Geändert hat sich, woraus die Häuser gemacht sind: Statt gezeichneter Muster tragen Fassaden, Böden und Einbauten jetzt **fotografierte Oberflächen**, und ein Teil der Möbel sind **3D-Modelle** statt Kästen. Alle Texturen und Modelle sind gemeinfrei (CC0) und stammen von [Poly Haven](https://polyhaven.com) und [ambientCG](https://ambientcg.com).

Dieser Stand liegt auf einem eigenen Branch. `main` und damit die veröffentlichte Seite sind unverändert.

## Was neu ist

- **35 Oberflächen** (`assets/tex/`): fünf Klinker, zwei Putze, Sichtbeton, Holzschalung, Dachziegel, Schiefer, Pflaster, Asphalt, Kies, Rasen, drei Parkette, drei Furniere, zwei Marmore, Travertin, Terrazzo, Granit, Leinen, Bouclé, Cord, Tweed, Samt, Leder, Teppich. Zu jeder gehören eine Farbkarte, eine Reliefkarte (Normal Map) und eine gepackte Karte für Verschattung und Rauheit.
- **17 Möbelmodelle** (`assets/models/`), davon 14 in den Häusern verwendet: Esszimmerstuhl, zwei Sessel, Sofa, zwei Couchtische, Sideboard, Pendelleuchte, drei Pflanzen, drei Vasen. Beistelltisch, Regal und Hocker sind aufbereitet, stehen aber noch in keinem Raum.
- **Jedes Haus bleibt ein anderes.** Die Fotos werden mit der Farbe getönt, die das Haus dem Material gibt. Ein weißer, ein sandfarbener und ein grauer Ziegel sind dasselbe Foto in drei Tönen; das Sofa trägt den Stoffton des Hauses.
- **Weiche Schatten unter den Möbeln**, damit Stühle und Tische im gleichmäßigen Raumlicht nicht schweben.

Kästen bleiben: Betten, Küchen, Schränke, Esstische, Bücherwände, Treppen, das niedrige Podestsofa (eine der drei Sofa-Arten), Barhocker. Für sie gibt es auf Poly Haven kein passendes modernes Modell oder keines, das sich leicht genug machen ließ. Sie tragen aber die fotografierten Oberflächen. Die Bäume sind weiterhin die stilisierten Körper aus Version 1: Die frei verfügbaren Baummodelle haben Hunderttausende bis Millionen Dreiecke.

## Wie es klein bleibt

| | Version 1 | Version 2, Handy | Version 2, Desktop |
|---|---|---|---|
| Download für ein Haus (alles zusammen) | 1,1 MB | 5,5 MB | 12,7 MB |
| davon Oberflächen | – | 2,4 MB | 8,5 MB |
| davon Möbel | – | 0,9 MB | 2,0 MB |
| davon Lader und Entpacker (einmalig) | – | 1,0 MB | 1,0 MB |

Gemessen im Testbrowser an einem Haus der Kreuzhöfe, ohne Übertragungskompression.

- **KTX2 (Basis Universal)** für alle Texturen. Die Grafikkarte behält sie komprimiert im Speicher; ein Handy braucht etwa ein Sechstel dessen, was ein PNG belegt. Farbe und Verschattung/Rauheit als ETC1S, das Relief als UASTC, weil ETC1S eine Normal Map in Blöcke zerlegt.
- **Draco** für die Netze der Modelle, vorher mit meshoptimizer auf 500 bis 4.200 Dreiecke vereinfacht (Ausnahme: das Sideboard mit seinen Lamellen, 10.400).
- **Zwei Stufen.** Ein Handy bekommt Farbkarten mit 512 statt 1024 Pixeln, keine Reliefkarten und die leichteren Modelldateien (`.lite.glb`).
- **Nur was gezeigt wird.** Eine Oberfläche wird geladen, wenn etwas, das sie trägt, zum ersten Mal gezeichnet wird; die Möbel eines Hauses, wenn seine Räume zum ersten Mal zu sehen sind. Bis dahin zeigt die Fläche die mittlere Farbe des Fotos und das Möbel seinen Kasten. Es wird kein Shader nachträglich gebaut.
- **Ein Draw Call je Material und Haus.** Die Kopien eines Modells werden wie jeder Kasten in das Netz ihres Hauses eingebacken: Acht Stühle sind ein Aufruf.

## Schalter zum Vergleichen

- `?notex` zeigt die gezeichneten Muster von Version 1.
- `?nomodels` zeigt die Kastenmöbel von Version 1.
- `?q=low` und `?q=high` erzwingen die Handy- bzw. Desktop-Stufe.

## Die Werkzeuge

`tools/` holt die Quellen und macht sie klein. Es wird nur gebraucht, um Texturen oder Modelle zu ändern; die Seite selbst hat weiterhin keinen Build-Schritt.

```bash
cd tools && npm install
```

```bash
node textures.mjs
```

```bash
node models.mjs
```

Was geladen wird, steht in `tools/assets.json` (Name, Quelle, Größe einer Kachel in Metern, Dreiecksbudget). Die Skripte schreiben die Dateien nach `assets/`, dazu `engine/surfaces.js` und `engine/furniture.js` (was die Engine wissen muss, bevor eine Datei da ist) und die Quellenlisten `assets/tex/CREDITS.md` und `assets/models/CREDITS.md`. `tools/viewer/?m=armchair` zeigt ein einzelnes Modell.

## Geprüft

Alles im Software-Renderer eines Testbrowsers, nicht auf einem echten Handy:

- Kameraabstand in allen 20 Häusern mit Modellen: mindestens 40 cm.
- 50 Seitenaufrufe ohne Fehler, fehlende Dateien oder fremde Hosts.
- Strenger Shader-Test auf der Handy-Stufe (der Test, der den Fehler des Galaxy A51 gefunden hat): kein auffälliger Bildpunkt.

## Was offen ist

- **Kein Test auf echter Hardware.** Bildzeiten, Speicher und das Entpacken der Texturen auf einem Galaxy A51 sind nicht gemessen.
- **Fotorealistisch ist es nicht.** Die Oberflächen und die Modelle sind fotografisch. Das Licht ist es nicht: ein gleichmäßiges Raumlicht und eine Sonne, keine berechnete Lichtausbreitung, keine Spiegelungen der Räume. Kastenmöbel, die stilisierten Bäume und die milchigen Fenster der Nachbarhäuser stehen daneben.
- **Fünfmal so viel Download auf dem Handy** wie Version 1.
