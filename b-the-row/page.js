// B · The row. Kreidegasse, six houses of two storeys for a developer, plots numbered with their status.
// The street elevation drafts itself house by house, turns to a view along the row,
// one sun crosses the six facades at the drawing's own angle, then the camera goes to plot 04
// (the open one, outlined in red), its two glass leaves swing open, and the lens walks into its hall,
// past the sitting room, and on to the kitchen.
import { createStage, run, THREE, span, ease, smooth, lerp, CONVENTION } from '../engine/elevation.js';
window.__boot = true;                                      // the modules have arrived (see the note for old browsers in the page)

const S = createStage({ hatch: 0.18, hatchPhone: 0.24, drawSpan: [-2, 45], drawDir: [1, 0.9], wipe: [-10, 26], soft: 1.6 });

// white brick with a bay, grey brick with a stone frame, turn and turn about. Every door is red.
const houses = [0, 1, 2, 3, 4, 5].map((i) => S.house(i * 6, {
  ...(i % 2 ? { par: 6.7, door: 'right' } : { par: 7.0, first: 'frame', brick: 0xe0dbcf }),
  setback: i % 2 ? -0.3 : 0, accent: i === 3, interior: i === 3,
}));
const plot4 = houses[3];
S.house(-6, { faint: true, par: 7.6, roof: 'none', first: 'frame', brick: 0xd9d3c7 });
S.house(36, { faint: true, par: 7.6, roof: 'none', brick: 0xd9d3c7 });
S.street(-60, 80);
S.figure(8.2, 2.0, 1, false); S.figure(25.6, 2.3, 1, true); S.figure(26.1, 2.1, 0.94, true);
S.tree(32.6, 2.6, 6.6, 1.9);
S.aimSun(18, 4, 34);

const pins = document.getElementById('pins');
const STATUS = ['Verkauft', 'Verkauft', 'Reserviert', 'Frei', 'Verkauft', 'Frei'];
STATUS.forEach((s, i) => {
  const el = pins.appendChild(document.createElement('div'));
  el.className = 'plot' + (i === 3 ? ' on' : '');
  el.innerHTML = `<b>0${i + 1}</b><span>${s}</span>`;
  S.pin(el, [i * 6 + 3, -0.7, 3.5]);
});

// Plot 04 has its door on the right, so plot4.key() mirrors the walk that a-one-door takes.
const KEYS = [
  { p: 0, t: [18, 6.6, 0], fh: 21.5, fov: 2, phone: { t: [18, 2, 0], minW: 37 } },
  { p: 18, t: [18, 6.6, 0], fh: 21.5, fov: 2, phone: { t: [18, 2, 0], minW: 37 } },
  { p: 110, t: [17, 4.2, 0], fh: 12.6, fov: 14, yaw: 22, pitch: -4, phone: { t: [22, 4.2, 0], minW: 14, yaw: 28 } },
  { p: 252, t: [16.5, 4.0, 0], fh: 12.0, fov: 16, yaw: 16, pitch: -4, phone: { t: [17, 4, 0], minW: 13 } },
  { p: 330, t: [21, 3.6, -0.3], fh: 9.6, fov: 28, yaw: 0, pitch: -4, phone: { minW: 7.6 } },
  plot4.key(405, [1.78, 1.72, 1.55], 2, -1, 54, 2.65),
  plot4.key(480, [1.72, 1.96, -2.35], -8, -9, 56, 2.2),
  plot4.key(560, [2.0, 1.94, -3.1], -46, -1, 58, 2.35),
  plot4.key(645, [2.75, 2.0, -6.5], -3, 0, 58, 2.5),
];

const LATE = new THREE.Vector3(-1.45, 0.62, 0.78).normalize();
const sunDir = new THREE.Vector3();
const late = new THREE.Color(0xffd9a8), white = new THREE.Color(0xfff1dc);

run(S, {
  length: 660,
  heroOut: [14, 64],
  radar: {
    ox: 18,
    mirrorX: true,
    zones: [
      { id: 'street', label: 'REIHE', tag: 'KREIDEGASSE 1:100', at: 105, u0: -4.0, u1: 0.0 },
      { id: 'entry', label: 'HAUS 04', tag: 'HAUS 04 EINGANG', at: 405, u0: 0.0, u1: 1.3 },
      { id: 'hall', label: 'HALLE', tag: 'HALLE +0.30M', at: 520, u0: 1.3, u1: 6.0 },
      { id: 'kitchen', label: 'KÜCHE', tag: 'KÜCHE +0.30M', at: 645, u0: 6.0, u1: 12.0 },
      { id: 'garden', label: 'GARTEN', tag: 'SÜDGARTEN', at: 655, u0: 12.0, u1: 17.8 },
    ],
  },
  frame(p) {
    S.setCam(S.camAt(p, KEYS));
    pins.style.opacity = (1 - span(p, 96, 136)).toFixed(3);
    S.U.uDepthCue.value = span(p, 22, 95) * (1 - span(p, 160, 230));
    // one sun crossing six facades, at the drawing's angle
    const u = span(p, 118, 255);
    S.U.uSweep.value.z = u <= 0 ? -60 : u >= 1 ? 60 : lerp(-12, 28, smooth(u));
    const m = ease(span(p, 262, 332));
    sunDir.copy(CONVENTION).lerp(LATE, m).normalize();
    S.setSun(sunDir);
    S.sun.color.copy(white).lerp(late, m);
    S.sun.intensity = lerp(3.2, 3.0, m);
    plot4.setDoor(smooth(span(p, 365, 435)));
    plot4.setGardenDoor(smooth(span(p, 565, 640)));
  },
  beats: [
    { from: 62, to: 122, html: '<span class="n">01 &nbsp;·&nbsp; Kreidegasse</span><p>Sechs Häuser aus Ziegel, zwei Geschosse, jedes unter einem Dach aus Zink. Gezeichnet im Maßstab 1:100.</p>' },
    { from: 128, to: 252, html: '<span class="n">02 &nbsp;·&nbsp; Eine Sonne</span><p>Die Schatten der Zeichnung fallen unter 45 Grad. Die Sonne kommt im selben Winkel, <em>Haus für Haus.</em></p>' },
    { from: 268, to: 350, html: '<span class="n">03 &nbsp;·&nbsp; Haus 04</span><p>Drei Schlafzimmer und ein Garten nach Süden. In <em>Rötel</em> umrissen.</p><div class="row"><div><span>Schlafzimmer</span>3</div><div><span>Wohnfläche</span>118 m²</div><div><span>Status</span>Frei</div></div>' },
    { from: 368, to: 465, html: '<span class="n">04 &nbsp;·&nbsp; Offene Tür</span><p>Haus 04 ist das Musterhaus. Zwei Steinstufen hinauf und durch die <em>Glastür.</em></p>' },
    { from: 482, to: 575, html: '<span class="n">05 &nbsp;·&nbsp; In Haus 04</span><p>Eine Halle über zwei Geschosse, eine Treppe aus gefaltetem Stahl, unter der Galerie der <em>Wohnraum.</em></p>' },
    { from: 588, to: 690, html: '<span class="n">06 &nbsp;·&nbsp; Küche zum Südgarten</span><p>Küche mit Essplatz. Die Glaswand öffnet sie über die ganze Breite zum ummauerten Garten.</p><div class="row"><div><span>Haus</span>04 von 06</div><div><span>Garten</span>Südlage</div><div><span>Status</span>Frei</div></div><a class="pill solid" href="#">Haus 04 reservieren</a>' },
  ],
});
