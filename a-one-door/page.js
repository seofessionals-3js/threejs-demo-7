// A · One door. No. 7, a narrow brick townhouse between faint neighbours.
// The elevation drafts itself, gains relief, takes the sun at the drawing's own angle
// (hatching becomes shade), the sun moves on, the oak front door swings open, and the
// lens walks through the entrance hall, reception parlour, double-height kitchen atrium,
// and out to the walled rear courtyard garden.
import { createStage, run, THREE, span, ease, smooth, lerp, CONVENTION } from '../engine/elevation.js';

const S = createStage({ hatch: 0.11, hatchPhone: 0.12, drawSpan: [0, 12.2], wipe: [-11, 9], soft: 1.1 });

const h = S.house(0, {});
S.house(-6, { faint: true, par: 9.4, roof: 'none', door: 'right', brick: 0xa9a49b });
S.house(-12, { faint: true, par: 9.4, roof: 'none', first: 'frame', brick: 0x9c5e48 });
S.house(6, { faint: true, par: 10.6, roof: 'none', first: 'frame', door: 'right', brick: 0x9c5e48 });
S.house(12, { faint: true, par: 10.6, roof: 'none', brick: 0xa9a49b });
S.street(-40, 40);
S.figure(2.9, 2.2, 1, true);
S.aimSun(2.5, 4.5, 24);

// levels, on the sheet only
const pins = document.getElementById('pins');
[[0, '±0.00', 'Straße'], [0.45, '+0.45', 'Erdgeschoss'], [3.6, '+3.60', '1. Obergeschoss'], [6.6, '+6.60', '2. Obergeschoss'], [9.1, '+9.10', 'Dach'], [12.0, '+12.00', 'Dachgeschoss']]
  .forEach(([y, a, b]) => {
    const el = pins.appendChild(document.createElement('div'));
    el.className = 'lv'; el.innerHTML = `<em></em><i></i><b>${a}</b><span>${b}</span>`;
    S.pin(el, [6.25, y, 0.5]);
  });

const KEYS = [
  { p: 0, t: [1.2, 6.3, 0], fh: 15.4, fov: 2, phone: { t: [3, 7.0, 0], fh: 14, minW: 8.4 } },
  { p: 18, t: [1.2, 6.3, 0], fh: 15.4, fov: 2, phone: { t: [3, 7.0, 0], fh: 14, minW: 8.4 } },
  { p: 115, t: [3.1, 5.3, 0], fh: 13.2, fov: 16, yaw: 13, pitch: -5, phone: { t: [3.2, 5.4, 0], minW: 9.4 } },
  { p: 228, t: [2.9, 5.0, 0], fh: 12.6, fov: 18, yaw: 9, pitch: -5, phone: { t: [3.0, 5.0, 0], minW: 9.0 } },
  { p: 300, t: [2.5, 4.0, 0], fh: 10.2, fov: 26, yaw: 6, pitch: -6, phone: { minW: 7.4 } },
  { p: 385, t: [1.35, 1.78, -1.15], fh: 2.65, fov: 54, yaw: 4, pitch: -1 },
  { p: 455, t: [2.30, 1.66, -3.45], fh: 2.20, fov: 56, yaw: -20, pitch: -1 },
  { p: 540, t: [3.85, 1.62, -4.55], fh: 2.35, fov: 58, yaw: -24, pitch: -2 },
  { p: 640, t: [3.15, 1.78, -9.80], fh: 2.55, fov: 58, yaw: -4, pitch: 1 },
  { p: 740, t: [3.05, 1.74, -14.60], fh: 2.45, fov: 56, yaw: -5, pitch: 2 },
];

const LATE = new THREE.Vector3(-1.45, 0.62, 0.78).normalize(); // 16:40, the sun lower and more from the side
const sunDir = new THREE.Vector3();
const warm = new THREE.Color(0xffd6a0), white = new THREE.Color(0xfff1dc);

run(S, {
  length: 760,
  heroOut: [14, 70],
  radar: {
    ox: 0,
    zones: [
      { id: 'street', label: 'STRASSE', tag: 'ANSICHT ±0.00M', at: 95, u0: -4.0, u1: 0.0 },
      { id: 'porch', label: 'VERANDA', tag: 'SCHWELLE +0.45M', at: 385, u0: 0.0, u1: 2.0 },
      { id: 'parlour', label: 'SALON', tag: 'SALON +0.45M', at: 525, u0: 2.0, u1: 6.4 },
      { id: 'atrium', label: 'ATRIUM', tag: 'ATRIUM +0.45M', at: 635, u0: 6.4, u1: 12.0 },
      { id: 'garden', label: 'GARTEN', tag: 'HOF +0.30M', at: 735, u0: 12.0, u1: 17.8 },
    ],
  },
  frame(p) {
    S.setCam(S.camAt(p, KEYS));
    S.U.uDepthCue.value = span(p, 22, 90) * (1 - span(p, 150, 205));
    // the sun arrives at the drawing's angle: hatching becomes shade
    const u = span(p, 118, 212);
    S.U.uSweep.value.z = u <= 0 ? -60 : u >= 1 ? 60 : lerp(-14, 10, smooth(u));
    // then it moves on, and the shadows slide
    const m = ease(span(p, 226, 300));
    sunDir.copy(CONVENTION).lerp(LATE, m).normalize();
    S.setSun(sunDir);
    S.sun.color.copy(white).lerp(warm, m);
    S.sun.intensity = lerp(3.4, 3.2, m);
    S.hemi.intensity = lerp(0.52, 0.48, m);
    // swing the fluted oak front door and rear Crittall garden doors open as the camera walks through
    h.setDoor(smooth(span(p, 345, 420)));
    h.setGardenDoor(smooth(span(p, 575, 665)));
  },
  beats: [
    { from: 72, to: 128, html: '<span class="n">01 &nbsp;·&nbsp; Relief</span><p>Die Veranda liegt einen Meter zurück. Der Balkon kragt 900 mm aus. Die Zeichnung hat es schon gesagt.</p>' },
    { from: 140, to: 222, html: '<span class="n">02 &nbsp;·&nbsp; Die Sonne</span><p>Jeder Schatten auf dem Blatt fällt unter 45 Grad. So auch bei <em>dieser</em> Sonne.</p>' },
    { from: 236, to: 304, html: '<span class="n">03 &nbsp;·&nbsp; 16:40, Ende Oktober</span><p>Dann wandert sie, und die Schatten wandern mit.</p>' },
    { from: 332, to: 438, html: '<span class="n">04 &nbsp;·&nbsp; Die Schwelle</span><p>Drei Steinstufen hinauf. Die kannelierte Eichentür schwingt nach innen in die <em>Eingangshalle.</em></p>' },
    { from: 462, to: 568, html: '<span class="n">05 &nbsp;·&nbsp; Empfangssalon</span><p>Nachmittagssonne fällt durch das dreiteilige Straßenfenster auf breite Eichendielen und raumhohe <em>Bücherregale.</em></p><div class="row"><div><span>Ebene</span>+0.45 m</div><div><span>Decke</span>3.00 m Eiche</div><div><span>Einbauten</span>Europäische Eiche</div></div>' },
    { from: 584, to: 672, html: '<span class="n">06 &nbsp;·&nbsp; Küche &amp; Ess-Atrium</span><p>Die Decke öffnet sich auf 6,4 Meter unter einer verglasten Dachlaterne über der <em>Travertin-Insel.</em></p><div class="row"><div><span>Atrium</span>6.40 m hoch</div><div><span>Insel</span>Geschliffener Stein</div><div><span>Verglasung</span>Crittall-Stahl</div></div>' },
    { from: 686, to: 790, html: '<span class="n">07 &nbsp;·&nbsp; No. 7 Albion Row</span><p>Stahltüren falten sich auf, hinaus in einen ummauerten Hof aus Yorkstone mit einem mehrstämmigen Baum <em>hinten.</em></p><div class="row"><div><span>Grundstück</span>6.0 × 17.8 m</div><div><span>Wohnfläche</span>186 m²</div><div><span>Status</span>Zu verkaufen</div></div><a class="pill solid" href="#">Besichtigung buchen</a>' },
  ],
});
