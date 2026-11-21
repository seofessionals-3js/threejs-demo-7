// C · The face is the product. Kiln & Course, an invented brick brand. KC-06 Diaper: burnt black headers
// standing 60 mm proud of a white wall, in a diaper lattice.
// The 1:20 detail is laid course by course, the sun arrives at the drawing's angle
// (every header's small hatched shadow becomes a real one), then drops low and rakes across the
// wall until the pattern stands out, the lens inspects the proud headers, and steps through the open glass door.
import { createStage, run, THREE, span, ease, smooth, lerp, CONVENTION } from '../engine/elevation.js';

const S = createStage({ hatch: 0.055, hatchPhone: 0.065, drawSpan: [0, 6.2], wipe: [-5, 7], soft: 0.7, envScale: 0.55 });

const h0 = S.house(0, { relief: 0.06, header: 0x2f2c2a, first: 'frame', roof: 'none', par: 7.0 });
S.house(6, { relief: 0.06, header: 0x2f2c2a, door: 'right', interior: false, roof: 'none', par: 7.0 });
S.street(0, 30, false);
S.figure(3.22, 1.6, 1, true);
S.aimSun(3.5, 2.5, 14);
S.hemi.intensity = 0.7; S.sun.intensity = 3.4;

const KEYS = [
  { p: 0, t: [2.3, 2.55, 0], fh: 5.9, fov: 2, phone: { t: [2.7, 2.9, 0], fh: 5.9, minW: 3.7 } },
  { p: 18, t: [2.3, 2.55, 0], fh: 5.9, fov: 2, phone: { t: [2.7, 2.9, 0], fh: 5.9, minW: 3.7 } },
  { p: 92, t: [2.7, 2.4, 0], fh: 5.2, fov: 10, yaw: 16, pitch: -3, phone: { t: [2.9, 2.4, 0], minW: 3.6 } },
  { p: 205, t: [2.8, 2.4, 0], fh: 5.0, fov: 12, yaw: 20, pitch: -3, phone: { t: [3.0, 2.4, 0], minW: 3.5 } },
  { p: 292, t: [3.2, 2.5, 0], fh: 4.4, fov: 14, yaw: 24, pitch: -4, phone: { minW: 3.0 } },
  { p: 375, t: [6.0, 2.05, 0], fh: 1.05, fov: 28, yaw: 26, pitch: -8, phone: { fh: 1.2, minW: 0.75 } },
  h0.key(455, [1.78, 1.72, 1.5], 3, -1, 52, 2.55),
  h0.key(525, [1.72, 1.96, -2.3], -10, -7, 56, 2.25),
];

// low, nearly along the wall from the left: each header throws a long streak to the right
const RAKE = new THREE.Vector3(-2.0, 0.62, 0.42).normalize();
const sunDir = new THREE.Vector3();
const late = new THREE.Color(0xffd9a8), white = new THREE.Color(0xfff1dc);

run(S, {
  length: 540,
  heroOut: [14, 64],
  radar: {
    ox: 0,
    zones: [
      { id: 'street', label: '1:20 WAND', tag: 'RAUTENRELIEF 1:20', at: 92, u0: -4.0, u1: -1.2 },
      { id: 'entry', label: 'STREIFLICHT', tag: 'STREIFLICHT', at: 280, u0: -1.2, u1: 0.0 },
      { id: 'hall', label: 'BINDER', tag: 'BINDER 60MM VORSTEHEND', at: 375, u0: 0.0, u1: 1.3 },
      { id: 'kitchen', label: 'LAIBUNG', tag: 'EINGANGSLAIBUNG', at: 455, u0: 1.3, u1: 6.0 },
      { id: 'garden', label: 'INNEN', tag: 'HOHE HALLE', at: 520, u0: 6.0, u1: 17.8 },
    ],
  },
  frame(p) {
    S.setCam(S.camAt(p, KEYS));
    S.U.uDepthCue.value = span(p, 22, 80) * (1 - span(p, 120, 180));
    const u = span(p, 100, 198);
    S.U.uSweep.value.z = u <= 0 ? -60 : u >= 1 ? 60 : lerp(-4.8, 6.5, smooth(u));
    const m = ease(span(p, 208, 292));
    sunDir.copy(CONVENTION).lerp(RAKE, m).normalize();
    S.setSun(sunDir);
    S.sun.color.copy(white).lerp(late, m);
    S.sun.intensity = lerp(3.4, 3.8, m);
    h0.setDoor(smooth(span(p, 395, 465)));
  },
  beats: [
    { from: 52, to: 108, html: '<span class="n">01 &nbsp;·&nbsp; Gezeichnet in 1:20</span><p>Jeder Ziegel auf dem Blatt. Jeder Binder steht 60 mm vor, also hat jeder Binder seinen eigenen Schatten.</p>' },
    { from: 116, to: 202, html: '<span class="n">02 &nbsp;·&nbsp; Dieselbe Sonne</span><p>Unter 45 Grad auf dem Papier. Unter 45 Grad an der Wand.</p>' },
    { from: 214, to: 298, html: '<span class="n">03 &nbsp;·&nbsp; Tiefe Sonne</span><p>Von vorn wirkt die Wand flach. Im Streiflicht <em>tritt das Rautenmuster hervor.</em></p>' },
    { from: 315, to: 410, html: '<span class="n">04 &nbsp;·&nbsp; KC-06 Diaper</span><p>Schwarz gebrannte Binder in einem weißen Läuferverband, 60 mm vor der Wandfläche.</p><div class="row"><div><span>Binder</span>215 × 102 × 65</div><div><span>Überstand</span>60 mm</div><div><span>Raster</span>1.35 × 0.9 m</div></div>' },
    { from: 430, to: 570, html: '<span class="n">05 &nbsp;·&nbsp; In die Laibung</span><p>Der Verband läuft in die tiefe Eingangslaibung, und die Glastür öffnet sich zur hohen <em>Halle.</em></p><div class="row"><div><span>Verband</span>Flämische Raute</div><div><span>Mörtel</span>10 mm Kalk</div><div><span>Muster</span>Box mit 3 Ziegeln</div></div><a class="pill solid" href="#">Musterplatte bestellen</a>' },
  ],
});
