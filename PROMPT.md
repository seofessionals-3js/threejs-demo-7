# Startprompt · Wohnungsfinder

Der Prompt, mit dem ich anfangen würde, um diese Demo nachzubauen. Er liefert nicht genau diese Seite, sondern eine erste Version der Idee. Danach beginnt die eigentliche Arbeit.

Ersetzen Sie die Teile in `[eckigen Klammern]` durch Ihr eigenes Thema.

```text
Ich möchte eine scrollgesteuerte Landingpage bauen für [ein Stadthaus, das verkauft wird, Ihr
Thema].

Die Idee: Die Seite öffnet mit einer Vorderansicht, das Gebäude frontal gezeichnet. Schwarze Kreide, weiße Kreide
und Rötel auf getöntem Papier (Trois Crayons), Höhenkoten, ein Schriftfeld, eine Person als Maßstab und eine
45-Grad-Schraffur in jedem Schatten. Nach dem Loader zeichnet sich die Zeichnung vom Boden
aufwärts selbst, dann strömt die Schraffur entlang des Lichts herein.

Der Scrollablauf, der Reihe nach:
1. Relief. Das Objektiv öffnet sich etwas und die Kamera dreht sich, sodass der Eingang
   zurückweicht und der Erker nach vorn kommt.
2. Die Sonne. Eine dünne Rötel-Linie fährt unter 45 Grad über die Fassade und verwandelt
   Papier in weißen Backstein, Stein, Zink und Glas. Kein einziger Schatten bewegt sich.
3. Dann wandert die Sonne zum [späten Nachmittag], und die Schatten gleiten über den Backstein.
4. Die Kamera steigt die Stufen hinauf, die zwei Flügel der großen Glastür schwingen auf, und
   sie geht auf Augenhöhe durch [die hohe Halle, am Wohnraum vorbei, durch Küche und Essplatz]
   bis [in den Garten].
5. Eine letzte Karte mit den Fakten und [Besichtigung buchen].

Worauf es mir ankommt:
- Die Ansicht ist das echte 3D-Modell, frontal gesehen durch ein 2-Grad-Objektiv. Jeder
  Kamera-Key ist ein Bildausschnitt (Ziel, Bildhöhe, Objektiv), und der Abstand ergibt sich
  daraus, sodass sich das Objektiv ohne Sprung auf 55 Grad öffnen kann.
- Die Schraffur wird berechnet, nicht gezeichnet. Die Sonne startet nach der Zeichenkonvention,
  Licht von links oben unter 45 Grad, (-1, 1, 1) normalisiert. Jedes Pixel, das die Shadow-Map
  in den Schatten legt, wird schraffiert, sodass gezeichnete und echte Schatten dieselben
  Formen haben.
- Ein Material pro Fläche, Papier oder echt, pro Pixel vom Scan gewählt.
- Der Look: ein Trois Crayons auf Tonpapier. Papier #dfd2ba, schwarze Kreide #2a2522 für Umriss
  und Schraffur, weiße Kreide #fcf9f2 für die besonnten Flächen, ein einziger Akzent in Rötel
  #a5432b (Tür, Scankante, Links). Danach das gebaute Haus im späten Oktoberlicht: weißer
  Backstein, Zink, Eiche, oxidroter Stahl, Rasen und ein Ahorn in Rost und Orange.
  Chakra Petch für Überschriften, IBM Plex Mono für Beschriftungen, ein Blattrahmen mit
  Eckmarken, eine Live-Anzeige von Sonne und Objektiv und ein kleiner Grundriss, der zeigt,
  wo die Kamera ist.
- Das Haus ist schlicht und hat zwei Geschosse. Die Kamera kommt nie näher als 40 cm an eine
  Fläche. Baue eine Prüfung ein, die das über den ganzen Weg misst.
- Nur three.js 0.160 von einem CDN, keine weitere Bibliothek, einfache Dateien, kein
  Build-Schritt. Das Scrollen bleibt das der Seite und wird im Code geglättet. Keine
  Bilddateien, jede Textur wird im Code gezeichnet.

Bevor du Code schreibst, schlage Fassade und Grundriss mit Maßen vor, die ich mir vorstellen
kann, und den Kameraweg Station für Station, und warte auf meine Antwort. Dann baue in Etappen.
Nur die erste Etappe: das Selbstzeichnen der Zeichnung, das Relief und der Scan. Nimm es auf
und zeig es mir, bevor du weitermachst.
```

Der letzte Absatz ist genauso wichtig wie die Idee. Ohne ihn bekommen Sie eine fertige Seite, die Sie nicht selbst ausgewählt haben.
