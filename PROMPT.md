# Startprompt · seofessionals three.js Demo 7

Der Prompt, mit dem ich anfangen würde, um diese Demo nachzubauen. Er liefert nicht genau diese Seite, sondern eine erste Version der Idee. Danach beginnt die eigentliche Arbeit.

Ersetzen Sie die Teile in `[eckigen Klammern]` durch Ihr eigenes Thema.

```text
Ich möchte eine scrollgesteuerte Landingpage bauen für [ein Stadthaus, das verkauft wird, Ihr
Thema].

Die Idee: Die Seite öffnet mit einer Vorderansicht, das Gebäude frontal gezeichnet. Tusche auf
cremefarbenem Papier, Höhenkoten, ein Schriftfeld, eine Person als Maßstab und eine
45-Grad-Schraffur in jedem Schatten. Nach dem Loader zeichnet sich die Zeichnung vom Boden
aufwärts selbst, dann strömt die Schraffur entlang des Lichts herein.

Der Scrollablauf, der Reihe nach:
1. Relief. Das Objektiv öffnet sich etwas und die Kamera dreht sich, sodass die Veranda
   zurückweicht und der Balkon nach vorn kommt.
2. Die Sonne. Eine dünne Linie in Bernstein fährt unter 45 Grad über die Fassade und
   verwandelt Papier in Backstein, Stein, Zink und Glas. Kein einziger Schatten bewegt sich.
3. Dann wandert die Sonne zum [späten Nachmittag], und die Schatten gleiten über den Backstein.
4. Die Kamera steigt die Stufen hinauf, die Haustür schwingt auf, und sie geht auf Augenhöhe
   durch [die Diele, den Salon, die Küche und das Esszimmer] bis [in den Hof].
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
- Der Look: ein CAD-Blatt. Papier #f2efe7, Tusche #1d1c19, ein Bernstein-Akzent #e85d04,
  Chakra Petch für Überschriften, IBM Plex Mono für Beschriftungen, ein Blattrahmen mit
  Eckmarken, eine Live-Anzeige von Sonne und Objektiv und ein kleiner Grundriss, der zeigt,
  wo die Kamera ist.
- three.js 0.160 und Lenis von einem CDN, einfache Dateien, kein Build-Schritt. Keine
  Bilddateien, jede Textur wird im Code gezeichnet.

Bevor du Code schreibst, schlage Fassade und Grundriss mit Maßen vor, die ich mir vorstellen
kann, und den Kameraweg Station für Station, und warte auf meine Antwort. Dann baue in Etappen.
Nur die erste Etappe: das Selbstzeichnen der Zeichnung, das Relief und der Scan. Nimm es auf
und zeig es mir, bevor du weitermachst.
```

Der letzte Absatz ist genauso wichtig wie die Idee. Ohne ihn bekommen Sie eine fertige Seite, die Sie nicht selbst ausgewählt haben.
