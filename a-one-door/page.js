// A · One door. No. 7, a narrow house of white brick, two storeys, between faint neighbours.
// The elevation drafts itself in black chalk on buff paper, lights in white chalk, gains relief, takes the sun at the drawing's
// own angle (hatching becomes shade), the sun moves on, the two oxide-red leaves of the glass door swing open,
// and the lens walks through the two-storey hall, past the sitting room, through kitchen and dining,
// and out into the walled garden.
import { createStage, run, THREE, span, ease, smooth, lerp, CONVENTION } from '../engine/elevation.js';
window.__boot = true;                                      // the modules have arrived (see the note for old browsers in the page)

const S = createStage({ hatch: 0.13, hatchPhone: 0.17, drawSpan: [0, 9.6], wipe: [-9, 8], soft: 1.1 });

const h = S.house(0, {});
S.house(-6, { faint: true, par: 6.3, roof: 'none', door: 'right', first: 'frame', brick: 0xe0dbcf });
S.house(-12, { faint: true, par: 7.1, roof: 'none', brick: 0xd9d3c7 });
S.house(6, { faint: true, par: 7.3, roof: 'none', first: 'frame', door: 'right', brick: 0xd9d3c7 });
S.house(12, { faint: true, par: 6.5, roof: 'none', brick: 0xe0dbcf });
S.street(-40, 40);
S.figure(3.22, 2.2, 1, true);
S.aimSun(2.5, 3.5, 24);

// levels, on the sheet only
const pins = document.getElementById('pins');
[[0, '±0.00', 'Straße'], [0.3, '+0.30', 'Erdgeschoss'], [3.4, '+3.40', 'Obergeschoss'], [6.7, '+6.70', 'Traufe'], [9.2, '+9.20', 'First']]
  .forEach(([y, a, b]) => {
    const el = pins.appendChild(document.createElement('div'));
    el.className = 'lv'; el.innerHTML = `<em></em><i></i><b>${a}</b><span>${b}</span>`;
    S.pin(el, [6.25, y, 0.5]);
  });

// Outside, a key is a frame on the facade (target, frame height, lens). Inside, it is written from where
// the lens stands (h.key: position, yaw, pitch, lens, frame height): 1.7 m above the floor, never closer
// than 40 cm to anything (window.__clear() measures it).
const KEYS = [
  { p: 0, t: [1.4, 4.75, 0], fh: 11.4, fov: 2, phone: { t: [3, 5.3, 0], fh: 10.6, minW: 8.4 } },
  { p: 18, t: [1.4, 4.75, 0], fh: 11.4, fov: 2, phone: { t: [3, 5.3, 0], fh: 10.6, minW: 8.4 } },
  { p: 115, t: [3.1, 4.0, 0], fh: 9.8, fov: 16, yaw: 13, pitch: -5, phone: { t: [3.2, 4.1, 0], minW: 9.4 } },
  { p: 228, t: [2.9, 3.8, 0], fh: 9.4, fov: 18, yaw: 9, pitch: -5, phone: { t: [3.0, 3.8, 0], minW: 9.0 } },
  { p: 300, t: [2.3, 3.0, 0], fh: 7.6, fov: 26, yaw: 6, pitch: -6, phone: { minW: 7.4 } },
  h.key(385, [1.78, 1.72, 1.55], 2, -1, 54, 2.65),      // on the pavement, in front of the two steps
  h.key(455, [1.72, 1.96, -2.35], -8, -9, 56, 2.2),     // through the door, looking up into the hall
  h.key(540, [2.0, 1.94, -3.1], -46, -1, 58, 2.35),     // turned to the sitting room under the gallery
  h.key(640, [2.75, 2.0, -6.5], -3, 0, 58, 2.5),        // in the kitchen, the table and the garden ahead
  h.key(700, [3.02, 2.0, -10.4], -4, 0, 57, 2.5),       // at the glass wall as it slides open
  h.key(760, [2.6, 2.0, -13.2], -24, -5, 56, 2.45),     // in the garden, turned to the maple
];

const LATE = new THREE.Vector3(-1.45, 0.62, 0.78).normalize(); // 16:40, the sun lower and more from the side
const sunDir = new THREE.Vector3();
const late = new THREE.Color(0xffd9a8), white = new THREE.Color(0xfff1dc);

run(S, {
  length: 780,
  heroOut: [14, 70],
  radar: {
    ox: 0,
    zones: [
      { id: 'street', label: 'STRASSE', tag: 'ANSICHT ±0.00M', at: 95, u0: -4.0, u1: 0.0 },
      { id: 'entry', label: 'EINGANG', tag: 'SCHWELLE +0.30M', at: 385, u0: 0.0, u1: 1.3 },
      { id: 'hall', label: 'HALLE', tag: 'HALLE +0.30M', at: 500, u0: 1.3, u1: 6.0 },
      { id: 'kitchen', label: 'KÜCHE', tag: 'KÜCHE +0.30M', at: 650, u0: 6.0, u1: 12.0 },
      { id: 'garden', label: 'GARTEN', tag: 'GARTEN +0.28M', at: 755, u0: 12.0, u1: 17.8 },
    ],
  },
  frame(p) {
    S.setCam(S.camAt(p, KEYS));
    S.U.uDepthCue.value = span(p, 22, 90) * (1 - span(p, 150, 205));
    // the sun arrives at the drawing's angle: hatching becomes shade
    const u = span(p, 118, 212);
    S.U.uSweep.value.z = u <= 0 ? -60 : u >= 1 ? 60 : lerp(-12, 10, smooth(u));
    // then it moves on, and the shadows slide
    const m = ease(span(p, 226, 300));
    sunDir.copy(CONVENTION).lerp(LATE, m).normalize();
    S.setSun(sunDir);
    S.sun.color.copy(white).lerp(late, m);
    S.sun.intensity = lerp(3.2, 3.0, m);
    S.hemi.intensity = lerp(0.9, 0.8, m);
    // the two oxide-red leaves swing in, and at the back the glass wall slides open as the lens walks through
    h.setDoor(smooth(span(p, 345, 420)));
    h.setGardenDoor(smooth(span(p, 600, 680)));
  },
  beats: [
    { from: 72, to: 128, html: '<span class="n">01 &nbsp;·&nbsp; Relief</span><p>Der Eingang liegt 1,20 m zurück. Der Erker kragt 800 mm aus. Die Zeichnung hat es schon gesagt.</p>' },
    { from: 140, to: 222, html: '<span class="n">02 &nbsp;·&nbsp; Die Sonne</span><p>Jeder Schatten auf dem Blatt fällt unter 45 Grad. So auch bei <em>dieser</em> Sonne.</p>' },
    { from: 236, to: 304, html: '<span class="n">03 &nbsp;·&nbsp; 16:40, Ende Oktober</span><p>Dann wandert sie, und die Schatten wandern mit.</p>' },
    { from: 332, to: 438, html: '<span class="n">04 &nbsp;·&nbsp; Die Schwelle</span><p>Zwei Steinstufen hinauf. Zwei Glasflügel in oxidrotem Stahl schwingen nach innen in die <em>Halle.</em></p>' },
    { from: 452, to: 516, html: '<span class="n">05 &nbsp;·&nbsp; Die Halle</span><p>5,95 Meter bis zur Decke. Eine Treppe aus gefaltetem Stahl führt hinauf zur <em>Galerie.</em></p><div class="row"><div><span>Ebene</span>+0.30 m</div><div><span>Höhe</span>5.95 m</div><div><span>Treppe</span>17 Steigungen</div></div>' },
    { from: 528, to: 594, html: '<span class="n">06 &nbsp;·&nbsp; Wohnraum</span><p>Unter der Galerie: ein Sofa aus Leinen, ein Tisch aus Stein, das Fenster zur <em>Straße.</em></p>' },
    { from: 608, to: 692, html: '<span class="n">07 &nbsp;·&nbsp; Küche &amp; Essen</span><p>Insel und Arbeitsplatte aus hellem Stein, dahinter der lange Tisch aus <em>Eiche.</em></p><div class="row"><div><span>Decke</span>2.85 m</div><div><span>Insel</span>Geschliffener Stein</div><div><span>Verglasung</span>Schiebewand</div></div>' },
    { from: 708, to: 810, html: '<span class="n">08 &nbsp;·&nbsp; No. 7 Kreidegasse</span><p>Die Glaswand fährt auf, hinaus in einen ummauerten Garten mit einem Ahorn in Oktoberlaub <em>hinten.</em></p><div class="row"><div><span>Grundstück</span>6.0 × 17.8 m</div><div><span>Wohnfläche</span>118 m²</div><div><span>Status</span>Zu verkaufen</div></div><a class="pill solid" href="#">Besichtigung buchen</a>' },
  ],
});
