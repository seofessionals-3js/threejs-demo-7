# Wohnungsfinder Dortmund

Ein Wohnungsfinder in three.js, wie ihn ein Bauunternehmen oder Bauträger für seine Neubauprojekte einsetzen kann. Zwei Teile, die zusammengehören: die **Karte** von ganz Dortmund mit sechs erfundenen Neubauprojekten, und die **Häuser** dieser Projekte. Die Karte zeigt, wo ein Projekt liegt, was frei ist und wie weit der Bau ist; „Häuser ansehen“ führt zu seinen Häusern, und von jeder Häuserseite führt „Zur Karte“ zurück.

[**Live ansehen**](https://seofessionals-3js.github.io/threejs-demo-7/) · [**Die Karte im Einzelnen**](dortmund/README.md) · [**Startprompt**](PROMPT.md)

> **Version 2** (fotografierte Oberflächen, Möbelmodelle, Draco und KTX2) liegt auf einem eigenen Branch und ist in [`VERSION-2.md`](VERSION-2.md) beschrieben. Die veröffentlichte Seite ist Version 1.

Das ist ein eigenes Projekt. Das Repository heißt nur noch `threejs-demo-7`, damit seine Adressen gültig bleiben: **an den Adressen der Seiten ändert sich nichts.** Alle Seiten sprechen einander relativ an, das Projekt läuft also unter jedem Namen und jeder Adresse.

## Die Seiten

- [`dortmund/`](dortmund/): die Karte, die Startseite. 26 × 23 km, jede Straße und rund 379.000 Gebäude aus OpenStreetMap, darauf die sechs Projekte. Im Menü: die Projekte mit ihrem Baufortschritt, alle freien Häuser mit Filter (Zimmer, Kaufpreis) und die Leistungen des Bauunternehmens. Dazu `dortmund/objekt.html`, ein Projekt in seiner Nachbarschaft mit Datenblatt, Baufortschritt, Bau & Technik und der Liste seiner Häuser. Aufbau, Daten und Lizenzen stehen in [`dortmund/README.md`](dortmund/README.md).
- [`haeuser/`](haeuser/): die Häuser eines Projekts der Karte, aus deren Daten (`dortmund/js/projects.json`). `?id=…` nennt das Projekt, `?zeile=2` die Zeile, `?haus=14` ein Haus, `at=310` kommt ohne Vorspann bei der Reihe an.
- [`a-one-door/`](a-one-door/): ein Stadthaus, durch die Glastür hinein
- [`b-the-row/`](b-the-row/): eine Straße mit sechs Stadthäusern und Hausnummern, Haus 04 reservieren
- [`c-the-face/`](c-the-face/): ein Ziegeldetail 1:20, schwarze Binder in weißer Wand, die Sonne streift über das Relief

Die Häuserseiten nutzen eine gemeinsame Engine (`engine/`), jede hat oben den Weg „Zur Karte“.

## Was die Häuserseite kann

- **Jedes Haus ist ein anderes.** Sechs Projekte, sechs Bauformen (Stadthäuser mit Zinkerker, weiße Kuben mit Dachterrasse, Klinker-Giebelhäuser, Doppelhaushälften mit Garagen, Holzhäuser mit Pultdach, Reihenhäuser mit Gaube). Innerhalb eines Projekts hat jedes Haus seine eigene Fassade: Ton, Ziegelformat und Verband, Putzart, Schalung, Dachdeckung, Tür- und Fensterfarbe (`style.looks` in den Projektdaten).
- **Frei oder verkauft.** Grün ist frei, rot ist verkauft. Freie Häuser lassen sich betreten: am Schild über dem Dach, an den Tasten oben oder an der Fassade. Verkaufte Häuser bleiben zu; die Seite nennt stattdessen die freien.
- **Durch das ganze Haus.** Der Weg führt durch die Räume unten, dann die Treppe hinauf, ins Schlafzimmer, ins Bad, wieder hinunter und hinaus in den Garten. Oben ist jedes Haus gleich: vom Podest (oder der Galerie) zwei Türen nebeneinander, dahinter dieselben zwei Räume mit denselben Möbeln und Oberflächen. Das Schlafzimmer hat Eichendielen, eine Wand aus Eichenlamellen hinter dem Bett, einen Schrank neben der Tür und Leinen am Fenster; das Bad helle Wandfliesen, graue Bodenfliesen, die Wanne am Fenster und einen Waschtisch aus Eiche. Ein Grundriss legt nur fest, auf welcher Seite seine Treppe ankommt und ob die Räume an der Straße oder am Garten liegen (`suite()` in `engine/interior.js`). Die Haustür schließt sich hinter der Kamera.
- **Zwanzig Häuser, zwanzig Grundrisse.** Jedes freie Haus hat seinen eigenen Innenaufbau (`plan` und `var` in den Projektdaten) und seine eigene Ausstattung (`fit`). Vier Grundtypen legen fest, wo die Treppe steht und wo das Haus zwei Geschosse hoch ist; jeder kommt in fünf Fassungen mit anderen Räumen:
  - **Halle** (Halle über zwei Geschosse, Treppe an der Wand): mit Küche im Westen oder im Osten, mit dem Wohnraum am Garten und dem Esstisch an der Straße, mit einem Kamin nach zwei Seiten, mit einer Tafel für zwölf.
  - **Gartenhalle** (Küche an der Straße, hoher Raum am Garten): mit Kamin im Westen oder im Osten, mit Tresen und rundem Tisch, als Lichthof mit Studio darüber, als Speisehalle mit dem Wohnraum in der Mitte.
  - **Stufenmöbel** (Treppe quer im Haus, zugleich Schrank): mit langem Tisch oder Kochinsel, mit Bibliothek, mit dem Durchgang an der Ostwand, mit einem Arbeitszimmer an der Straße.
  - **Wohnhalle** (Wohnraum über zwei Geschosse an der Straße, massive Treppe): mit Bücherwand oder hohem Kamin, als Halle über die ganze Hausbreite, mit der Tafel in der Halle und dem Wohnraum am Garten, mit einem Gartenzimmer hinter Glas.

  Boden (Dielen, Fischgrät, Würfelparkett, Terrazzo, Estrich, Stein), Einbauten, Arbeitsplatte, Stoffe, Teppich, Akzentwand, Beschläge, Treppe, Sofa, Tisch, Küche, Lampen und Garten wechseln von Haus zu Haus; keine zwei Häuser haben dieselbe Zusammenstellung.
- **Exposé.** Zu jedem Haus ein Datenblatt: Zimmer, Wohnfläche, Grundstück, Kaufpreis, Räume mit Flächen, Ausstattung, Bau & Technik, Baufortschritt in sechs Phasen, eine überschlagene Finanzierung mit Reglern. Es lässt sich drucken (als PDF sichern) und als Link kopieren.
- **Anfrage.** Ein Formular für Besichtigung, Rückruf oder Unterlagen, mit Prüfung der Eingaben. Es ist eine Demo: Nichts wird gesendet oder gespeichert.
- **Werkzeuge.** Sonnenstand von 6 bis 20 Uhr; Grundriss EG und OG (das Haus wird in Geschosshöhe geschnitten, die Räume sind mit Flächen beschriftet); **Bauablauf** (die Zeile von der Bodenplatte bis schlüsselfertig, mit dem Stand von heute); **Bemusterung** (Boden, Einbauten und Arbeitsplatte des gewählten Hauses wechseln, während man hinsieht). Im Haus dreht seitliches Ziehen den Blick, ohne den Standpunkt zu verlassen.

## Schnell und stabil

Die Seite ist darauf gebaut, auf einem Bürolaptop und einem Handy zu laufen und die Grafikkarte nie zu überfordern.

- **Ein Licht für alles.** Sonne, Himmel und ein gleichmäßiges Raumlicht, in jedem Raum jedes Hauses dasselbe. Keine Lampe beleuchtet etwas. Die Zahl der Lichter ändert sich deshalb nie, und kein Shader wird je ein zweites Mal gebaut. (Vorher brachte jedes Haus drei Lampen mit: Mit jedem Haus wurden alle Shader neu gebaut, 130 statt 22 Programme, 15 Punktlichter pro Bildpunkt. Das hat schwächere Grafikkarten zum Absturz gebracht.)
- **Der Himmel ist eine Formel.** Was eine Fläche vom Himmel sieht (sein Licht und sein Spiegelbild), rechnet der Shader aus, statt eine gefilterte Umgebungstextur abzutasten. Das Bild ist dasselbe, die Arbeit je Bildpunkt weniger als die Hälfte. Wie viel Himmelslicht eine Fläche bekommt, hängt nur von ihrer Richtung ab und wird deshalb je Eckpunkt gerechnet; nur was glänzt (Glas, Metall, Lack, versiegelter Boden), schlägt den Himmel je Bildpunkt nach.
- **Ein Shader je Materialart.** Was sich von Haus zu Haus unterscheidet (Farbe, Verband, Bretter, Webart), sind Uniforms. Alle Shader werden hinter dem Ladebild gebaut; im Betrieb wird nichts mehr kompiliert, auch nicht für Grundriss oder Bauablauf.
- **Nur was zu sehen ist.** Räume gibt es nur in Häusern, die man betreten kann; gebaut werden sie, wenn der Browser Zeit hat, und gezeichnet wird nur das Haus, in dem die Kamera steht. Alles Unbewegte ist je Material zu einem Netz verschmolzen, die Schattenkarte wird nur neu gezeichnet, wenn sich Sonne oder Tür bewegt haben, ein Bild nur, wenn sich etwas geändert hat.
- **Gerätestufen.** `engine/quality.js` wählt Auflösung, Schattenkarte und Schattenfilter nach Gerät (Handy, Laptop mit eingebauter Grafik, Desktop) und regelt die Auflösung nach, wenn Bilder zu lange dauern.
- **Keine Rechnung mit offenem Ausgang.** Die Shader rufen weder `pow` noch `smoothstep` auf, sondern zwei eigene, überall gleich definierte Funktionen (`GLSL_MATH`). Der Grund: `pow(0, 1.5)` liefert auf manchen Handy-Grafikchips keine Zahl. Auf einem Galaxy A51 (Mali-G72) war deshalb jede Fläche schwarz, die von der Sonne weg zeigt: Decken, abgewandte Wände, die Schattenseite der Bäume. Ein Test wickelt jede solche Funktion ein und färbt jeden Bildpunkt, der ihr einen undefinierten Wert gibt; über alle Zeilen, Häuser, Grundrisse und Seiten bleibt kein Bildpunkt gefärbt.
- **Keine zwei Flächen in einer Ebene.** Liegen zwei Flächen verschiedener Farbe genau aufeinander, entscheidet die Rundung der Tiefenwerte, welche man sieht: Das Bild flimmert, sobald sich die Kamera bewegt. Deshalb enden Wände in den Zargen der Türen statt bündig mit ihnen, liegen Schwelle, Fensterbank und Fensterbrett ein paar Millimeter über dem, was unter ihnen durchläuft, und stehen die Wände oben auf den Dielen. Eine Prüfung sortiert alle gezeichneten Dreiecke aller zwanzig Häuser nach Ebenen und meldet jede Überdeckung zweier Materialien. Was sie noch meldet, ist verdeckt (Unterseiten, die auf etwas aufliegen, Rückseiten an einer Wand) oder kleiner als zehn Quadratzentimeter.
- **Ein Farbschema.** Die Seiten erklären sich als „nur hell“ (`color-scheme: only light`). Browser, die Seiten von sich aus abdunkeln (Samsung Internet, Chromes „dunkles Design für Websites“), lassen Karten und Knöpfe damit so, wie sie entworfen sind.
- **Wenn doch etwas passiert.** Nimmt der Browser der Seite den WebGL-Kontext, sagt sie es und startet in der sparsamsten Stufe neu. Ohne WebGL erscheint ein Hinweis statt eines stehenden Ladebilds.
- **Nichts von außen.** three.js und die Schriften liegen im Projekt (`vendor/`): kein CDN, kein Schriftendienst, keine Cookies, kein Tracking.

Gemessen im selben Software-Renderer, gleiche Größe, gleiche Stufe, Zeile mit drei freien Häusern: ein Bild der Straße 797 → 241 ms, in der Halle 1659 → 458 ms, in der Küche 1177 → 290 ms; Shaderprogramme 119 → 22; Punktlichter 18 → 0. Auf echten Grafikkarten kommt die sparsamere Stufe für Laptops und Handys noch dazu.

`window.__clear()` misst auf jeder Häuserseite den Abstand der Kamera zu jeder Fläche über den ganzen Weg: In allen zwanzig freien Häusern bleibt er über 40 cm, auch auf den 90 cm breiten Treppen und in den Türen des Obergeschosses. Durch die Haustür geht die Kamera geradeaus zwischen den beiden offenen Flügeln hindurch und dreht sich erst dahinter in den Raum, damit auf einem hochkant gehaltenen Handy kein Türflügel quer im Bild steht. Aus Schlafzimmer und Bad geht sie rückwärts, den Raum noch im Blick, und dreht sich erst auf dem Flur: In der Tür gedreht sähe man nur die Wand daneben.

## Die Häuser: eine Zeichnung, die zum Haus wird

Die Vorderansicht eines Stadthauses, in Trois Crayons auf Tonpapier gezeichnet: schwarze Kreide für Umriss und 45°-Schraffur in jedem Schatten, weiße Kreide für alles, was die Sonne trifft. Beim Scrollen gewinnt die Fassade Tiefe, dann verwandelt ein Scan in Rötel das Papier in das gebaute Haus, und kein einziger Schatten bewegt sich, weil die Schraffur die ganze Zeit der echte Schatten war. Die Sonne wandert, die Tür öffnet sich, und Sie gehen durch das Haus bis in den Garten.

Das Haus der Seite `a-one-door/` ist **No. 7 Kreidegasse**: sechs Meter breit, zwei Geschosse, weißer Backstein unter einem Dach aus Zink. Der Eingang liegt 1,20 m zurück, darüber kragt ein Erker 800 mm aus. Die Tür ist eine Glastür mit zwei Flügeln in oxidroten Stahlrahmen, 2,00 m breit. Dahinter liegt eine Halle über beide Geschosse. Oben liegt hinter der Treppe ein Podest mit den Türen zu Bad und Schlafzimmer. Auch hier führt der Weg nach der Küche die Treppe hinauf in beide Räume und dann in den Garten (ebenso in `b-the-row/`).

## Farben des Blatts

Das Blatt ist ein Trois Crayons: schwarze Kreide, weiße Kreide und ein einziges Rötel auf getöntem Papier. Der Scan ändert keinen Schatten, nur das Material.

| Rolle | Farbe |
| --- | --- |
| Papier | `#dfd2ba` (hell `#eadfcb`, dunkel `#d2c3a7`) |
| Umriss und Schraffur, schwarze Kreide | `#2a2522`, weich `#6e6257` |
| Lichter, weiße Kreide | `#fcf9f2` |
| Akzent Rötel (Scankante, Links) | `#a5432b`, hell `#c65e42`, Text `#8f3620` |
| Frei, verkauft | `#1f7a45`, `#b3261e` |
| Himmel | `#dfe6ea` im Zenit, `#f0e2c8` am Horizont, tiefe warme Sonne |

Die Farben der gebauten Häuser stehen in den Projektdaten und in `engine/interior.js`.

## So funktioniert es

- **Die Ansicht ist das Haus.** Das 3D-Modell wird frontal durch ein 2°-Objektiv gesehen und wirkt deshalb wie eine orthogonale Zeichnung.
- **Die Schraffur wird berechnet.** Die Sonne startet nach der Zeichenkonvention, Licht von links oben unter 45°. Jedes Pixel, das die Shadow-Map in den Schatten legt, bekommt eine 45°-Schraffur, sodass gezeichnete und echte Schatten dieselben Formen haben.
- **Bauformen.** `house()` in `engine/elevation.js` baut ein Haus aus Optionen: Wand (`wall`, `brick`, `wallTx`), Tür und Fenster (`doorColor`, `frame`), Obergeschoss (`first`: Erker, Steinrahmen, Fenster, Balkon), Dach (`roof`: Satteldach, Giebel zur Straße, Pultdach, Flachdach; dazu `dormer`, `terrace`, `roofColor`, `roofTx`: Zink, Tonziegel, Schiefer, begrünt) und Giebelwände, wo kein Nachbar steht.
- **Räume.** `engine/interior.js` baut das Innere: vier Grundtypen in je fünf Fassungen, die Möbel als kleine Bausteine (Sofa, Tisch, Küche, Bücherwand, Kamin, Treppe …), die Paletten der Ausstattung und für jeden Grundriss den Weg der Kamera, die Raumliste und den kleinen Lageplan.
- **Ein Material für jede Fläche.** `mat()` patcht das Standardmaterial: Papier und Schraffur auf der einen Seite des Scans, das echte Material auf der anderen. Muster (Ziegelverband, Fischgrät, Terrazzo, Kelim …) werden im Shader gerechnet, keine Bilddatei.
- **Kamera-Keys sind Bildausschnitte** (Ziel, Bildhöhe, Objektiv). Der Abstand ergibt sich daraus, und das Objektiv wird im Log-Raum überblendet, sodass es sich ohne Sprung von 2° auf 55° öffnet. Im Haus werden die Keys vom Standpunkt der Kamera aus geschrieben (`h.key`); zwischen zwei Standpunkten geht die Kamera eine gerade Linie. Ein Haus mit der Tür rechts spiegelt sie selbst. Auf einem Hochkant-Bildschirm öffnet sich das Objektiv im Haus weiter.
- **Nur three.js.** Keine weitere Bibliothek. Das Scrollen bleibt das der Seite, die Engine glättet nur den Wert, der die Kamera führt.

## Dateien

`engine/elevation.js` (Bühne, Materialien, Fassade, Seitenablauf), `engine/interior.js` (Räume, Grundrisse, Ausstattung), `engine/quality.js` (Gerätestufen) und `engine/page.css` werden von den Häuserseiten gemeinsam genutzt. Jede Seite besteht aus einer `index.html` und einer `page.js`. `vendor/three/` enthält three.js 0.160.1 mit vier Zusatzmodulen, `vendor/fonts/` die Schriften.

`?skip` überspringt das Intro. `?at=300` springt zu einer Scrollposition. `?nosmooth` folgt dem Scroll ohne Glättung. `?q=low|mid|high` erzwingt eine Gerätestufe, `?dpr=1` legt die Auflösung fest, `?debug` zeigt Position, Stufe und Auflösung. Zum Ausprobieren auf der Häuserseite: `?plan=A|B|C|D`, `?var=0…4` und `?fit=1…20`.

## Lokal starten

Die Seiten nutzen JavaScript-Module und brauchen deshalb einen lokalen Server. Ein Doppelklick auf `index.html` funktioniert nicht.

```bash
python -m http.server 8000
```

Dann http://localhost:8000/ öffnen: Die Startadresse führt zur Karte.

## Herkunft und Lizenz

Basiert auf „Sunlit Elevation“ aus [flat-to-3d](https://github.com/Sam1983Aing/flat-to-3d) von Samnang Aing, veröffentlicht unter der MIT-Lizenz, und ins Deutsche übersetzt. Häuser, Grundrisse, Einrichtung und Farbwelt dieser Fassung sind neu. Die Lizenz liegt unverändert in [LICENSE](LICENSE).

Alle Büros, Häuser, Projekte, Adressen, Preise, Termine und Kontaktdaten sind erfunden. three.js (MIT, `vendor/three/LICENSE`) und die Schriften Chakra Petch, IBM Plex Mono und Manrope (SIL Open Font License, Lizenztexte in `vendor/fonts/` und `dortmund/fonts/`) liegen im Projekt. Die Kartendaten stammen von OpenStreetMap (Open Database License); Näheres in [`dortmund/README.md`](dortmund/README.md).
