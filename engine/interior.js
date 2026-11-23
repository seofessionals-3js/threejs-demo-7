// The inside of a house, and its walled garden. Four plans, each with its own stair, its own rooms and its own way
// through them. A house picks a plan and a fit-out: floor, joinery, stone, fabrics, the finish of one wall, metal,
// and which sofa, table, kitchen, lamps and stair it gets. No two houses of the Wohnungsfinder share all of that.
//
// Everything is written for a house with its door on the left (x 0.7 ... 2.7) and mirrored for the others.
// x along the street (0 ... 6), y up, z into the plot: the door stands at z = -1.3, the garden glass at z = -12,
// the garden ends at z = -17.8. Ground floor +0.30, upper floor +3.40, ceiling +6.25.
//
// There are no lamps that light anything: one light for every room of every house (see uFill in elevation.js).
const G0 = 0.3, L1 = 3.4, CEIL = 6.25, SL = L1 - 0.25;

/* ---------- what a house can be fitted out with ---------- */
// [material kind, options, name]. tx is read by the shader of that kind (elevation.js): pattern and its measures.
export const FLOORS = [
  ['oakFloor', { color: 0xb88b55 }, 'Eiche, Landhausdiele'],
  ['oakFloor', { color: 0x7a5a3e, tx: [1, 0.09, 5, 0] }, 'Räuchereiche, Fischgrät'],
  ['oakFloor', { color: 0xd8c6a2, tx: [0, 0.24, 2.4, 0] }, 'Esche, Schlossdiele'],
  ['travertine', { color: 0xb7b2a8, tx: [3, 0, 0, 0], rough: 0.55 }, 'Sichtestrich, geschliffen'],
  ['travertine', { color: 0xe2dccf, tx: [2, 0, 0, 0], rough: 0.42 }, 'Terrazzo, hell'],
  ['travertine', { color: 0xcfc6b6, tx: [0, 1.2, 0.6, 0], rough: 0.5 }, 'Travertin, Großformat'],
  ['oakFloor', { color: 0x8c5f3c, tx: [2, 0.07, 5, 0] }, 'Nussbaum, Würfelparkett'],
  ['oakFloor', { color: 0xc9a06a, tx: [1, 0.12, 4, 0] }, 'Eiche hell, Fischgrät breit'],
  ['travertine', { color: 0x5a5753, tx: [4, 0.6, 0.6, 0], rough: 0.45 }, 'Basalt, 60 × 60'],
];
export const WOODS = [
  ['wood', { color: 0xa67b49 }, 'Eiche natur, genutet'],
  ['wood', { color: 0x2f2c2a, tx: [2, 0.6, 0, 0] }, 'Eiche, schwarz gebeizt'],
  ['lacquer', { color: 0xe9e5dc, rough: 0.5 }, 'Lack, weiß matt'],
  ['wood', { color: 0x6b4630, tx: [2, 0.6, 0, 0] }, 'Nussbaum, furniert'],
  ['lacquer', { color: 0x6f7f6a, rough: 0.5 }, 'Lack, Salbei'],
  ['lacquer', { color: 0x2c3e55, rough: 0.45 }, 'Lack, Nachtblau'],
  ['wood', { color: 0xcdb48a, tx: [3, 0.045, 0, 0] }, 'Esche, kanneliert'],
  ['lacquer', { color: 0x8a4a3a, rough: 0.5 }, 'Lack, Terrakotta'],
];
export const STONES = [
  ['travertine', { color: 0xefebe2 }, 'Travertin, geschliffen'],
  ['travertine', { color: 0xf2f0ec, tx: [1, 0, 0, 0], rough: 0.3 }, 'Carrara-Marmor'],
  ['travertine', { color: 0x2f2e2e, tx: [1, 0, 0, 0], rough: 0.3 }, 'Nero Marquina'],
  ['travertine', { color: 0xd9d2c4, tx: [2, 0, 0, 0], rough: 0.36 }, 'Terrazzo'],
  ['travertine', { color: 0x5b5854, tx: [4, 0, 0, 0], rough: 0.4 }, 'Granit, anthrazit'],
  ['travertine', { color: 0xa9a59c, tx: [3, 0, 0, 0], rough: 0.55 }, 'Sichtbeton'],
  ['wood', { color: 0xb88b55, tx: [2, 0.4, 0, 0] }, 'Eiche, massiv'],
];
const FABRICS = [
  [{ color: 0xcdc5b5 }, 'Leinen, natur'],
  [{ color: 0xe6dfd0, tx: [3, 0, 0, 0.25] }, 'Bouclé, creme'],
  [{ color: 0x3f5b63, tx: [5, 0.014, 0, 0.2] }, 'Cord, petrol'],
  [{ color: 0x9a5b3c }, 'Leinen, rost'],
  [{ color: 0x777b78, tx: [6, 0.03, 0, 0.3] }, 'Tweed, grau'],
  [{ color: 0x7e8a6b, tx: [3, 0, 0, 0.2] }, 'Wolle, salbei'],
  [{ color: 0x2f3440 }, 'Leinen, nachtblau'],
  [{ color: 0xc9a66b, tx: [5, 0.02, 0, 0.16] }, 'Cord, ocker'],
];
const RUGS = [
  [{ color: 0x7a858d }, 'Wolle, grau'],
  [{ color: 0xd8cdb8, tx: [4, 0.5, 0, 0.35] }, 'Kelim, Raute'],
  [{ color: 0xb9a78a, tx: [1, 0.16, 0, 0.3] }, 'Wolle, gestreift'],
  [{ color: 0x8a4f3b, tx: [4, 0.36, 0, 0.3] }, 'Kelim, rost'],
  [{ color: 0xe3dccb, tx: [2, 0.3, 0, 0.18] }, 'Wolle, kariert'],
  [{ color: 0x4a5560, tx: [6, 0.08, 0, 0.3] }, 'Wolle, Fischgrat'],
];
const WALLS = [
  [{}, 'Putz, weiß'], [{ color: 0xf4ecdc }, 'Putz, warmweiß'], [{ color: 0xe9e6df, tx: [3, 0, 0, 0] }, 'Kalkputz, wolkig'], [{ color: 0xf1ede6, tx: [1, 0, 0, 0] }, 'Kratzputz, fein'],
];
// the one wall that is different: 'own' is the wall the house is built of, left bare
const ACCENTS = [
  ['own', {}, 'Wand wie außen, unverputzt'],
  ['plaster', { color: 0xa9a59c, tx: [4, 0, 0, 0] }, 'Sichtbeton, brettgeschalt'],
  ['wood', { color: 0xb88b55, tx: [3, 0.05, 0, 0] }, 'Lamellen, Eiche'],
  ['plaster', { color: 0xb9684a, tx: [3, 0, 0, 0] }, 'Kalkputz, Terrakotta'],
  ['plaster', { color: 0x7d8a78, tx: [3, 0, 0, 0] }, 'Kalkputz, Salbei'],
  ['plaster', { color: 0x41505c, tx: [3, 0, 0, 0] }, 'Kalkputz, Graublau'],
  ['plaster', { color: 0xd9c9a8, tx: [2, 0, 0, 0] }, 'Lehmputz, gekämmt'],
];
const METALS = [
  [{}, 'Schwarzstahl'], [{ color: 0x6b5a45, metal: 0.7 }, 'Bronze'], [{ color: 0xb08d57, metal: 0.8, rough: 0.3 }, 'Messing'],
  [{ color: 0xc9cbcc, metal: 0.8, rough: 0.3 }, 'Edelstahl'], [{ color: 0xe9e5dc, metal: 0.1 }, 'Weiß beschichtet'],
];
const ARTS = [0x7a858d, 0x9a3f2a, 0x355e4b, 0x1f3a5f, 0xc9a66b, 0x2f2c2a];
const STAIRS = ['Stahl, gefaltet', 'Kragstufen aus Holz, Glas', 'Massiv, verputzt, Steinstufen'];

// The fit-out of house number n: every list is walked at its own pace, so neighbours differ in everything and the
// whole combination only comes round again after 2520 houses. n = 0 is the house of the three older pages.
export function fitFor(n = 0, plan = 'A') {
  const pick = (list, k) => list[((k % list.length) + list.length) % list.length], f = Math.floor;
  const floor = pick(FLOORS, n), wood = pick(WOODS, n * 3), stone = pick(STONES, n * 3), sofa = pick(FABRICS, n * 5 + (n ? 1 : 0)), rug = pick(RUGS, n);
  const wall = pick(WALLS, n), accent = pick(ACCENTS, n * 2), metal = pick(METALS, n * 2);
  return {
    n, plan, floor, up: pick(FLOORS, [0, 2, 7, 6, 0, 1][n % 6]), wood, wood2: pick(WOODS, n * 3 + (n ? 5 : 0)), stone, sofa,
    cush: n ? pick(FABRICS, n * 5 + 4) : [{}, ''], cush2: n ? pick(FABRICS, n * 5 + 6) : [{ color: 0x2f2c2a }, ''], rug, wall, accent, metal, art: pick(ARTS, n),
    style: { sofa: n % 3, coffee: f(n / 3) % 3, dining: (n + f(n / 3)) % 3, kitchen: f(n / 2) % 3, island: n % 2, lamp: (n * 2 + f(n / 3)) % 3, stair: f(n / 4) % 3, garden: f(n / 5) % 3, art: (n + f(n / 2)) % 3 },
    // what the data sheet of the house says
    list: [['Boden', floor[2]], ['Einbauten', wood[2]], ['Arbeitsplatte', stone[2]], ['Treppe', plan === 'C' ? 'Stufenmöbel mit Lamellen' : STAIRS[plan === 'D' ? 2 : f(n / 4) % 3]], ['Akzentwand', accent[2]], ['Beschläge', metal[1]], ['Polster', sofa[1]]],
  };
}

/* ---------- the four plans: what the page needs to know about them ---------- */
// tour: where the lens stands [x, y, z], yaw, pitch, lens, frame height, for the five stations inside
// rooms: [name, x0, z0, x1, z1] in metres, per storey. radar: the little plan (u = depth into the plot, v = x)
const GARDEN = [[2.6, 2.0, -13.2], -24, -5, 56, 2.45];
export const PLANS = {
  A: {
    name: 'Halle', claim: 'Halle über zwei Geschosse',
    tour: { hall: [[1.72, 1.96, -2.35], -8, -9, 56, 2.2], turn: [[2.0, 1.94, -3.1], -46, -1, 58, 2.35], rear: [[2.75, 2.0, -6.5], -3, 0, 58, 2.5], glass: [[3.02, 2.0, -10.4], -4, 0, 57, 2.5], garden: GARDEN },
    zones: ['HALLE', 'KÜCHE'],
    text: ['Eine Halle über zwei Geschosse, die Treppe an der Wand, unter der Galerie der <em>Wohnraum.</em>', 'Küche mit Insel und Essplatz. Die Glaswand öffnet beides über die ganze Breite zum <em>Garten.</em>'],
    rooms: {
      eg: [['Halle', 0.24, -6.0, 3.1, -1.3], ['Wohnen', 3.1, -6.0, 5.76, -0.4], ['Kochen', 0.24, -12, 2.9, -6.0], ['Essen', 2.9, -12, 5.76, -6.0]],
      og: [['Galerie', 3.1, -6.0, 5.76, -0.4], ['Flur', 0.24, -7.3, 5.76, -6.0], ['Schlafen', 0.24, -12, 2.85, -7.4], ['Bad', 2.95, -9.5, 5.76, -7.4], ['Ankleide', 2.95, -12, 5.76, -9.6]],
    },
    radar: { rects: [[1.9, 0.24, 5.9, 1.14], [3.25, 4.86, 5.65, 5.72], [3.8, 3.9, 5.1, 4.5], [6.95, 1.4, 9.25, 2.2], [9.3, 3.95, 11.5, 4.95]], dash: 'M1.3 3.1 H6.0 V0.24' },
  },
  B: {
    name: 'Gartenhalle', claim: 'Wohnraum über zwei Geschosse am Garten',
    tour: { hall: [[1.9, 1.75, -2.5], -58, -2, 58, 2.3], turn: [[2.2, 1.78, -5.3], -24, -3, 60, 2.4], rear: [[2.55, 1.85, -8.2], 12, -15, 60, 2.4], glass: [[3.0, 1.95, -10.6], -4, -2, 57, 2.5], garden: GARDEN },
    zones: ['KÜCHE', 'WOHNEN'],
    text: ['Die Küche liegt vorn am Fenster zur Straße, die Treppe führt an der Wand hinauf, dahinter der <em>Essplatz.</em>', 'Am Garten wird das Haus hoch: der Wohnraum über zwei Geschosse, ein Kamin bis unter die Decke, darüber die <em>Galerie.</em>'],
    rooms: {
      eg: [['Diele', 0.24, -5.2, 3.1, -1.3], ['Kochen', 3.1, -5.2, 5.76, -0.4], ['Essen', 0.24, -8.6, 5.76, -5.2], ['Wohnen', 0.24, -12, 5.76, -8.6]],
      og: [['Galerie', 0.24, -8.6, 5.76, -6.5], ['Flur', 1.28, -6.5, 2.3, -3.0], ['Bad', 0.24, -3.0, 2.3, -0.4], ['Schlafen', 2.4, -3.4, 5.76, -0.4], ['Kind', 2.4, -6.5, 5.76, -3.5]],
    },
    radar: { rects: [[2.4, 0.24, 6.5, 1.14], [2.1, 3.3, 4.5, 4.14], [0.9, 5.12, 5.1, 5.76], [5.9, 3.75, 8.1, 4.75], [9.15, 4.86, 11.55, 5.72], [9.7, 0.24, 11.2, 0.8]], dash: 'M8.6 0.24 V5.76' },
  },
  C: {
    name: 'Stufenmöbel', claim: 'Treppe quer im Haus, zugleich Schrank',
    tour: { hall: [[1.75, 1.72, -2.7], -38, -2, 58, 2.3], turn: [[0.92, 1.72, -5.0], -5, -1, 58, 2.3], rear: [[1.15, 1.8, -9.0], -112, -2, 62, 2.4], glass: [[2.3, 1.95, -10.8], -8, 0, 57, 2.5], garden: GARDEN },
    zones: ['WOHNEN', 'KÜCHE'],
    text: ['Der Wohnraum liegt vorn an der Straße. Die Treppe steht quer im Haus und ist zugleich <em>Schrank.</em>', 'Dahinter die Wohnküche: eine Zeile an der Treppenwand, der lange Tisch vor dem <em>Garten.</em>'],
    rooms: {
      eg: [['Wohnen', 0.24, -5.6, 5.76, -0.4], ['Treppe', 1.6, -6.6, 5.76, -5.6], ['Wohnküche', 0.24, -12, 5.76, -6.7]],
      og: [['Flur', 0.24, -5.55, 5.76, -3.9], ['Schlafen', 2.9, -3.8, 5.76, -0.4], ['Bad', 0.24, -3.8, 2.8, -0.4], ['Kind 1', 0.24, -12, 2.95, -6.75], ['Kind 2', 3.05, -12, 5.76, -6.75]],
    },
    radar: { rects: [[5.6, 1.6, 6.6, 5.76], [2.6, 4.86, 5.0, 5.72], [6.72, 1.75, 7.36, 5.75], [9.3, 2.6, 10.3, 4.8]], dash: '' },
  },
  D: {
    name: 'Wohnhalle', claim: 'Wohnraum über zwei Geschosse an der Straße',
    tour: { hall: [[1.85, 1.75, -2.6], -40, -10, 58, 2.3], turn: [[2.35, 1.8, -4.3], -78, -8, 60, 2.4], rear: [[2.75, 1.95, -6.7], -3, 0, 58, 2.5], glass: [[2.9, 2.0, -10.3], -5, 0, 57, 2.5], garden: GARDEN },
    zones: ['WOHNEN', 'KÜCHE'],
    text: ['Der Wohnraum ist zwei Geschosse hoch. Die Bücherwand reicht bis unter die <em>Decke.</em>', 'Unter dem Obergeschoss die Küche mit Insel, die massive Treppe an der Wand, der Tisch vor dem <em>Garten.</em>'],
    rooms: {
      eg: [['Diele', 0.24, -5.2, 3.1, -1.3], ['Wohnen', 3.1, -5.2, 5.76, -0.4], ['Kochen', 0.24, -12, 2.9, -5.2], ['Essen', 2.9, -12, 5.76, -5.2]],
      og: [['Arbeiten', 0.24, -5.2, 3.1, -0.4], ['Flur', 0.24, -6.3, 5.76, -5.2], ['Schlafen', 0.24, -9.8, 2.9, -6.35], ['Bad', 0.24, -12, 2.9, -9.9], ['Kind', 3.0, -12, 4.67, -6.35]],
    },
    radar: { rects: [[5.9, 4.84, 10.0, 5.74], [2.0, 3.3, 4.4, 4.16], [0.7, 5.44, 5.0, 5.76], [6.95, 1.4, 9.25, 2.2], [10.7, 3.3, 11.5, 4.7]], dash: 'M0.4 3.1 H5.2 V5.76' },
  },
};

/* =========================================================================== */
// K: the tools of the stage (add, box, mat, tree ...). c: the house (its interior group g, door side, parapet, look).
export function buildInterior(K, c) {
  const { THREE, add, box, mat, tree, mulberry } = K;
  const { g, doorL, PAR, O, v } = c;
  const plan = PLANS[c.plan] ? c.plan : 'A';
  const fit = c.fit || fitFor(0, plan), st = fit.style;
  const X = (x) => (doorL ? x : 6 - x);
  const lo = Math.min, hi = Math.max;
  const B = (x0, y0, z0, x1, y1, z1) => (doorL ? box(lo(x0, x1), lo(y0, y1), lo(z0, z1), hi(x0, x1), hi(y0, y1), hi(z0, z1)) : box(6 - hi(x0, x1), lo(y0, y1), lo(z0, z1), 6 - lo(x0, x1), hi(y0, y1), hi(z0, z1)));
  // edge lines are only drawn for a house that is outlined in Rötel (b-the-row): everywhere else nobody sees them
  const LK = O.realLines ? 1 : 0, NC = { cast: false };
  const G = (geo, m, lw = 0.5, o) => add(geo, m, lw * LK, { parent: g, lineColor: O.lineColor, realLines: O.realLines, ...o });
  const A = (x0, y0, z0, x1, y1, z1, m, lw = 0.5, o) => G(B(x0, y0, z0, x1, y1, z1), m, lw, o);
  const cyl = (r0, r1, h, seg, x, y, z) => new THREE.CylinderGeometry(r0, r1, h, seg).translate(X(x), y, z);

  // ---- materials. `in`: how much of the one room light a surface gets (1 inside, less in the garden)
  const inn = (kind, o = {}) => mat(kind, { ...o, in: 1 }), out = (kind, o = {}) => mat(kind, { ...o, in: 0.5 });
  const own = { color: v.brick, tx: v.wallTx };
  const M = {
    floor: inn(fit.floor[0], fit.floor[1]), up: inn(fit.up[0], fit.up[1]),
    wood: inn(fit.wood[0], fit.wood[1]), wood2: inn(fit.wood2[0], fit.wood2[1]), stone: inn(fit.stone[0], fit.stone[1]),
    wall: inn('plaster', fit.wall[0]), ceil: inn('plaster'),
    accent: fit.accent[0] === 'own' ? inn(v.wall || 'brick', own) : inn(fit.accent[0], fit.accent[1]),
    steel: inn('steel', fit.metal[0]), dark: inn('steel'),
    sofa: inn('linen', fit.sofa[0]), cush: inn('linen', fit.cush[0]), cush2: inn('linen', fit.cush2[0]), rug: inn('linen', fit.rug[0]), white: inn('linen'),
    art: inn('plain', { color: fit.art }), door: inn('lacquer', v.doorColor ? { color: v.doorColor } : {}),
    basalt: inn('stone', { color: 0x2f2c2a }), glow: inn('interior', { realOnly: true }), clear: inn('glass', { clear: true }), leaf: inn('foliage'),
    brick: out(v.wall || 'brick', own), cope: out('stone'), paving: out('paving'), lawn: out('plain', { color: 0x86995f }), gravel: out('plain', { color: 0xc9c1b1 }),
    gSteel: out('steel'), gWood: out('wood'), gBasalt: out('stone', { color: 0x2f2c2a }), gGlow: out('interior', { realOnly: true }), gLeaf: out('foliage'),
  };

  /* ---------- pieces ---------- */
  // a local frame for things that stand against something: u runs along it, d comes out of it.
  // 'E' / 'W': back at x = a, u from z = b towards the garden. 'N': back at z = a on the street side, 'S': on the garden side, u from x = b.
  const frame = (o, a, b) => {
    const L = (u0, d0, y0, u1, d1, y1) => (o === 'E' ? B(a - d1, y0, b - u1, a - d0, y1, b - u0) : o === 'W' ? B(a + d0, y0, b - u1, a + d1, y1, b - u0)
      : o === 'N' ? B(b + u0, y0, a - d1, b + u1, y1, a - d0) : B(b + u0, y0, a + d0, b + u1, y1, a + d1));
    L.at = (u, d) => (o === 'E' ? [a - d, b - u] : o === 'W' ? [a + d, b - u] : o === 'N' ? [b + u, a - d] : [b + u, a + d]);
    return L;
  };
  // a balustrade: glass with a rail on top
  const rail = (x0, z0, x1, z1, y = L1) => {
    if (Math.abs(x1 - x0) > Math.abs(z1 - z0)) { A(x0, y, z0 - 0.012, x1, y + 1.0, z0 + 0.012, M.clear, 0, NC); A(x0, y + 1.0, z0 - 0.03, x1, y + 1.045, z0 + 0.03, M.steel); }
    else { A(x0 - 0.012, y, z0, x0 + 0.012, y + 1.0, z1, M.clear, 0, NC); A(x0 - 0.03, y + 1.0, z0, x0 + 0.03, y + 1.045, z1, M.steel); }
  };
  // a straight flight of n risers up to the upper floor. axis 'z' or 'x', a0 the first riser, dir +1 / -1, w0 ... w1 its
  // width, open: where the guard stands (a coordinate across the flight). style 0 folded steel, 1 timber treads out of
  // the wall with a glass guard, 2 solid
  function flight(axis, a0, dir, n, go, w0, w1, style, open) {
    const rise = (L1 - G0) / n;
    const bx = (a, b, ya, yb, wa = w0, wb = w1) => (axis === 'z' ? B(wa, ya, a, wb, yb, b) : B(a, ya, wa, b, yb, wb));
    const tm = style === 0 ? M.dark : style === 1 ? M.wood2 : M.accent;
    for (let i = 0; i < n; i++) {
      const a = a0 + dir * i * go, b = a + dir * (i === n - 1 ? 0.1 : go), y = G0 + i * rise;
      if (style === 0) { G(bx(a - 0.014, a + 0.014, y, y + rise), tm); G(bx(a, b, y + rise - 0.028, y + rise), tm); }
      else if (style === 1) G(bx(a - dir * 0.03, b, y + rise - 0.065, y + rise), tm);
      else { G(bx(a, b, G0, y + rise - 0.03), tm); G(bx(a - dir * 0.02, b, y + rise - 0.03, y + rise), M.stone); }
      if (open == null) continue;
      if (style === 1) { G(bx(a, b, y + rise, y + rise + 1.0, open - 0.008, open + 0.008), M.clear, 0, NC); G(bx(a, b, y + rise + 1.0, y + rise + 1.04, open - 0.025, open + 0.025), M.steel, 0.35); }
      else if (style === 2) G(bx(a, b, y + rise - 0.03, y + rise + 0.95, open - 0.04, open + 0.04), tm);      // a solid stair has a solid guard
      else {
        if (i % 2 === 0) G(bx(a + dir * 0.11, a + dir * 0.135, y + rise, y + rise + 0.95, open - 0.0125, open + 0.0125), M.steel, 0.35);
        if (i < n - 1) G(bx(a - dir * 0.02, a + dir * (go + 0.02), y + rise * 1.5 + 0.93, y + rise * 1.5 + 0.975, open - 0.022, open + 0.022), M.steel, 0.35);
      }
    }
  }
  // a partition of the upper floor (or any wall) with doorways. along 'x': it stands at z = p and runs from a0 to a1
  // along x; along 'z': at x = p. doors: [from, to, leaf]. A leaf is shut, in the colour of the front door.
  function part(along, p, a0, a1, doors = [], y0 = L1, y1 = CEIL, m = M.wall) {
    const t = 0.05, seg = (s0, s1, ya, yb) => { if (s1 - s0 > 0.01) (along === 'x' ? A(s0, ya, p - t, s1, yb, p + t, m) : A(p - t, ya, s0, p + t, yb, s1, m)); };
    let s = a0;
    [...doors].sort((d, e) => d[0] - e[0]).forEach(([d0, d1, leaf = true]) => {
      seg(s, d0, y0, y1); seg(d0, d1, y0 + 2.1, y1); s = d1;
      if (!leaf) return;
      if (along === 'x') {
        A(d0, y0, p - 0.025, d1, y0 + 2.1, p + 0.025, M.door);
        A(d0 - 0.05, y0, p - t - 0.012, d0, y0 + 2.15, p + t + 0.012, M.dark); A(d1, y0, p - t - 0.012, d1 + 0.05, y0 + 2.15, p + t + 0.012, M.dark); A(d0 - 0.05, y0 + 2.1, p - t - 0.012, d1 + 0.05, y0 + 2.15, p + t + 0.012, M.dark);
        A(d1 - 0.15, y0 + 0.9, p + 0.025, d1 - 0.12, y0 + 1.3, p + 0.075, M.steel, 0); A(d1 - 0.15, y0 + 0.9, p - 0.075, d1 - 0.12, y0 + 1.3, p - 0.025, M.steel, 0);
      } else {
        A(p - 0.025, y0, d0, p + 0.025, y0 + 2.1, d1, M.door);
        A(p - t - 0.012, y0 + 2.1, d0 - 0.05, p + t + 0.012, y0 + 2.15, d1 + 0.05, M.dark);
        A(p + 0.025, y0 + 0.9, d1 - 0.15, p + 0.075, y0 + 1.3, d1 - 0.12, M.steel, 0); A(p - 0.075, y0 + 0.9, d1 - 0.15, p - 0.025, y0 + 1.3, d1 - 0.12, M.steel, 0);
      }
    });
    seg(s, a1, y0, y1);
  }
  function sofa(L, len, style = 0) {
    const y = G0;
    if (style === 1) {                              // a low platform, a mattress, loose cushions
      G(L(0, 0, y + 0.02, len, 1.0, y + 0.2), M.wood2); G(L(0.06, 0.06, y + 0.2, len - 0.06, 0.96, y + 0.38), M.sofa);
      G(L(0.06, 0.02, y + 0.38, len - 0.06, 0.24, y + 0.72), M.sofa);
      const n = hi(2, Math.round(len / 0.8));
      for (let i = 0; i < n; i++) { const u = 0.14 + i * (len - 0.28) / n; G(L(u, 0.24, y + 0.38, u + 0.5, 0.4, y + 0.76), i % 2 ? M.cush2 : M.cush, 0.4); }
      return;
    }
    const arms = style === 0, u0 = arms ? 0.22 : 0.02, n = hi(2, Math.round((len - 2 * u0) / 0.7)), w = (len - 2 * u0) / n;
    G(L(0, 0, y + 0.02, len, 0.86, y + 0.14), M.wood2); G(L(0, 0, y + 0.14, len, 0.22, y + 0.84), M.sofa, 0.6);
    if (arms) { G(L(0, 0.22, y + 0.14, 0.2, 0.86, y + 0.62), M.sofa, 0.6); G(L(len - 0.2, 0.22, y + 0.14, len, 0.86, y + 0.62), M.sofa, 0.6); }
    for (let i = 0; i < n; i++) {
      G(L(u0 + i * w + 0.01, 0.22, y + 0.14, u0 + (i + 1) * w - 0.01, 0.88, y + 0.42), M.sofa);
      G(L(u0 + i * w + 0.03, 0.22, y + 0.42, u0 + (i + 1) * w - 0.03, 0.4, y + 0.84), M.sofa, 0.45);
    }
    G(L(u0 + 0.08, 0.4, y + 0.42, u0 + 0.42, 0.6, y + 0.72), M.cush, 0.4); G(L(len - u0 - 0.42, 0.4, y + 0.42, len - u0 - 0.08, 0.6, y + 0.72), M.cush2, 0.4);
    if (style === 2) G(L(len / 2 - 0.4, 1.2, y + 0.04, len / 2 + 0.4, 1.85, y + 0.4), M.sofa);   // a stool in front of it
  }
  function armchair(L) {
    const y = G0;
    G(L(0, 0, y + 0.02, 0.7, 0.65, y + 0.3), M.wood2); G(L(0.03, 0.03, y + 0.26, 0.67, 0.6, y + 0.44), M.cush); G(L(0.03, 0, y + 0.44, 0.67, 0.16, y + 0.84), M.cush);
  }
  function coffee(cx, cz, style = 0) {
    const y = G0;
    if (style === 1) { G(cyl(0.46, 0.46, 0.05, 28, cx, y + 0.335, cz), M.stone, 0.6); G(cyl(0.2, 0.27, 0.31, 20, cx, y + 0.155, cz), M.wood2, 0.4); }
    else if (style === 2) { A(cx - 0.3, y, cz - 0.62, cx + 0.3, y + 0.34, cz - 0.04, M.wood2); A(cx - 0.26, y, cz + 0.06, cx + 0.26, y + 0.26, cz + 0.58, M.stone); }
    else { A(cx - 0.25, y + 0.02, cz - 0.6, cx + 0.25, y + 0.28, cz + 0.6, M.wood2, 0.4); A(cx - 0.3, y + 0.28, cz - 0.66, cx + 0.3, y + 0.34, cz + 0.66, M.stone, 0.6); }
    A(cx - 0.16, y + 0.34, cz - 0.2, cx + 0.16, y + 0.38, cz + 0.18, M.art, 0.35);
    G(cyl(0.08, 0.06, 0.16, 12, cx, y + 0.42, cz + 0.36), M.steel, 0.35);
  }
  // a slab chair. face: the way the sitter looks
  function chair(cx, cz, face) {
    const y = G0, s = 0.21, t = 0.045;
    const at = (side) => (side === 'x-' ? [cx - s, cz - s, cx - s + t, cz + s] : side === 'x+' ? [cx + s - t, cz - s, cx + s, cz + s] : side === 'z-' ? [cx - s, cz - s, cx + s, cz - s + t] : [cx - s, cz + s - t, cx + s, cz + s]);
    const opp = { 'x+': 'x-', 'x-': 'x+', 'z+': 'z-', 'z-': 'z+' }, bk = at(opp[face]), fr = at(face);
    A(bk[0], y, bk[1], bk[2], y + 0.84, bk[3], M.wood2, 0.45); A(fr[0], y, fr[1], fr[2], y + 0.46, fr[3], M.wood2, 0.45);
    A(cx - s, y + 0.46, cz - s, cx + s, y + 0.51, cz + s, M.white, 0.35);
  }
  function pend(x, y, z, top, style = 0) {
    A(x - 0.006, y, z - 0.006, x + 0.006, top, z + 0.006, M.steel, 0);
    if (style === 1) { G(cyl(0.03, 0.17, 0.2, 20, x, y - 0.02, z), M.steel, 0.3); G(cyl(0.15, 0.15, 0.012, 20, x, y - 0.127, z), M.glow, 0, NC); }
    else if (style === 2) G(cyl(0.1, 0.1, 0.3, 20, x, y - 0.05, z), M.glow, 0, NC);
    else G(new THREE.SphereGeometry(0.12, 14, 10).translate(X(x), y, z), M.glow, 0, NC);
  }
  // a table for six (or a round one for four) with the lamps over it. The long side follows the longer side of the rectangle
  function dining(x0, z0, x1, z1, style = 0, top = SL) {
    const y = G0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, alongZ = (z1 - z0) >= (x1 - x0);
    if (style === 1) {
      const r = lo(x1 - x0, z1 - z0) / 2 + 0.1;
      G(cyl(r, r, 0.05, 36, cx, y + 0.755, cz), M.stone, 0.6); G(cyl(0.16, 0.3, 0.73, 20, cx, y + 0.365, cz), M.wood2, 0.4);
      chair(cx + r + 0.1, cz, 'x-'); chair(cx - r - 0.1, cz, 'x+'); chair(cx, cz + r + 0.1, 'z-'); chair(cx, cz - r - 0.1, 'z+');
      pend(cx, y + 1.75, cz, top, st.lamp);
    } else {
      A(x0, y + 0.72, z0, x1, y + 0.78, z1, style === 2 ? M.stone : M.wood2, 0.7);
      if (alongZ) { A(x0 + 0.12, y, z0 + 0.3, x1 - 0.12, y + 0.72, z0 + 0.4, M.wood2); A(x0 + 0.12, y, z1 - 0.4, x1 - 0.12, y + 0.72, z1 - 0.3, M.wood2); }
      else { A(x0 + 0.3, y, z0 + 0.12, x0 + 0.4, y + 0.72, z1 - 0.12, M.wood2); A(x1 - 0.4, y, z0 + 0.12, x1 - 0.3, y + 0.72, z1 - 0.12, M.wood2); }
      const len = alongZ ? z1 - z0 : x1 - x0, n = hi(2, Math.floor((len - 0.2) / 0.62));
      for (let i = 0; i < n; i++) {
        const a = (alongZ ? z0 : x0) + len * (i + 0.5) / n;
        if (alongZ) { chair(x0 - 0.24, a, 'x+'); chair(x1 + 0.24, a, 'x-'); } else { chair(a, z1 + 0.24, 'z-'); chair(a, z0 - 0.24, 'z+'); }
        if (alongZ) pend(cx, y + 1.66 + (i % 2) * 0.16, a, top, st.lamp); else pend(a, y + 1.66 + (i % 2) * 0.16, cz, top, st.lamp);
      }
      G(cyl(0.22, 0.12, 0.11, 16, cx, y + 0.835, cz), M.stone, 0.4);
    }
  }
  // a kitchen along a wall: tall units at the ends, between them base units, a stone top and splashback, wall units over it
  function kitchenRun(L, len, style = 0, tall0 = 0.9, tall1 = 1.0) {
    const y = G0, a = tall0, b = len - tall1;
    if (tall0) G(L(0, 0, y, tall0, 0.64, y + 2.3), M.wood, 0.6);
    if (tall1) G(L(b, 0, y, len, 0.64, y + 2.3), M.wood, 0.6);
    G(L(a, 0, y, b, 0.64, y + 0.9), M.wood, 0.6); G(L(a, 0, y + 0.9, b, 0.66, y + 0.96), M.stone); G(L(a, 0, y + 0.96, b, 0.06, y + 1.6), M.stone, 0.4);
    if (style === 1) {                              // an open shelf with a few things on it
      G(L(a, 0.06, y + 1.6, b, 0.34, y + 1.64), M.wood2, 0.4);
      for (let u = a + 0.3, k = 0; u < b - 0.3; u += 0.62, k++) { const [px, pz] = L.at(u, 0.2); G(cyl(0.07, 0.06, 0.16 + (k % 3) * 0.05, 12, px, y + 1.72 + (k % 3) * 0.025, pz), k % 2 ? M.art : M.stone, 0.3); }
    } else G(L(a, 0, y + 1.6, b, 0.42, y + 2.3), style === 2 ? M.wood : M.wall, 0.6);
    G(L(a + 0.08, 0.08, y + 1.575, b - 0.08, 0.34, y + 1.6), M.glow, 0, NC);
    G(L(a + 0.5, 0.12, y + 0.96, a + 1.1, 0.56, y + 0.966), M.basalt, 0);               // the hob
    G(L(b - 1.2, 0.14, y + 0.955, b - 0.62, 0.52, y + 0.962), M.dark, 0);               // the sink
    G(L(b - 0.93, 0.07, y + 0.96, b - 0.89, 0.11, y + 1.26), M.steel, 0); G(L(b - 0.93, 0.07, y + 1.22, b - 0.89, 0.28, y + 1.26), M.steel, 0);
  }
  // an island with a stone top and stools on one side. side: 'x+' 'x-' 'z+' 'z-'
  function island(x0, z0, x1, z1, side, style = 0) {
    const y = G0, alongZ = (z1 - z0) >= (x1 - x0);
    A(x0 + 0.02, y, z0 + 0.05, x1 - 0.06, y + 0.84, z1 - 0.05, M.wood); A(x0, y + 0.84, z0, x1, y + 0.91, z1, M.stone, 0.7);
    if (style === 0) { if (alongZ) { A(x0, y, z1 - 0.08, x1, y + 0.84, z1, M.stone, 0.6); A(x0, y, z0, x1, y + 0.84, z0 + 0.08, M.stone, 0.6); } else { A(x0, y, z0, x0 + 0.08, y + 0.84, z1, M.stone, 0.6); A(x1 - 0.08, y, z0, x1, y + 0.84, z1, M.stone, 0.6); } }
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    A(cx - 0.22, y + 0.91, cz - 0.02, cx - 0.18, y + 1.22, cz + 0.02, M.steel, 0.4); A(cx - 0.22, y + 1.18, cz - 0.02, cx - 0.03, y + 1.22, cz + 0.02, M.steel, 0.4);
    const len = alongZ ? z1 - z0 : x1 - x0, n = lo(3, Math.floor(len / 0.7));
    for (let i = 0; i < n; i++) {
      const a = (alongZ ? z0 : x0) + len * (i + 0.5) / n, o = 0.19;
      const sx = side === 'x+' ? x1 + o : side === 'x-' ? x0 - o : a, sz = side === 'z+' ? z1 + o : side === 'z-' ? z0 - o : a;
      A(sx - 0.15, y, sz - 0.16, sx + 0.15, y + 0.54, sz + 0.16, M.steel, 0.4); A(sx - 0.17, y + 0.54, sz - 0.18, sx + 0.17, y + 0.6, sz + 0.18, M.white);
    }
    // a line of light over it
    if (alongZ) { A(cx - 0.03, SL - 0.85, z0 + 0.3, cx + 0.03, SL - 0.79, z1 - 0.3, M.steel); A(cx - 0.02, SL - 0.875, z0 + 0.4, cx + 0.02, SL - 0.85, z1 - 0.4, M.glow, 0, NC); A(cx - 0.01, SL - 0.79, cz - 0.02, cx + 0.01, SL, cz + 0.02, M.steel, 0); }
    else { A(x0 + 0.3, SL - 0.85, cz - 0.03, x1 - 0.3, SL - 0.79, cz + 0.03, M.steel); A(x0 + 0.4, SL - 0.875, cz - 0.02, x1 - 0.4, SL - 0.85, cz + 0.02, M.glow, 0, NC); A(cx - 0.02, SL - 0.79, cz - 0.01, cx + 0.02, SL, cz + 0.01, M.steel, 0); }
  }
  const vase = (x, y, z) => new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.125, 0.1], [0.115, 0.24], [0.05, 0.34], [0.06, 0.4]].map((q) => new THREE.Vector2(q[0], q[1])), 20).translate(X(x), y, z);
  function sideboard(L, len, h = 0.75) {
    G(L(0, 0, G0, len, 0.46, G0 + h), M.wood, 0.6); G(L(-0.02, 0, G0 + h, len + 0.02, 0.48, G0 + h + 0.04), M.stone);
    const [x, z] = L.at(len * 0.28, 0.24), [x2, z2] = L.at(len * 0.66, 0.24);
    G(vase(x, G0 + h + 0.04, z), M.art, 0); G(cyl(0.07, 0.09, 0.2, 12, x2, G0 + h + 0.14, z2), M.basalt, 0.4);
  }
  // a wall of books: uprights, shelves, books of three cloths
  function bookWall(L, len, y0, y1, seed = 71) {
    const R = mulberry(seed), D = 0.32;
    G(L(0, 0, y0, len, 0.03, y1), M.wood, 0.6);
    const bays = hi(1, Math.round(len / 1.0)), bw = len / bays, rows = Math.floor((y1 - y0 - 0.1) / 0.44);
    for (let b = 0; b <= bays; b++) G(L(b * bw - 0.018, 0.03, y0, b * bw + 0.018, D, y1), M.wood, 0.4);
    for (let r = 0; r <= rows; r++) G(L(0, 0.03, y0 + r * 0.44, len, D, y0 + r * 0.44 + 0.03), M.wood, 0.4);
    for (let r = 0; r < rows; r++) for (let b = 0; b < bays; b++) {
      let u = b * bw + 0.05; const end = (b + 1) * bw - 0.05, sy = y0 + r * 0.44 + 0.03;
      while (u < end - 0.06) {
        if (R() < 0.22) { u += 0.1 + R() * 0.16; continue; }
        const t = 0.035 + R() * 0.04, bh = 0.22 + R() * 0.14, pick = R();
        G(L(u, 0.07, sy, lo(end, u + t), 0.07 + 0.18 + R() * 0.05, sy + bh), pick < 0.44 ? M.white : pick < 0.78 ? M.cush2 : M.cush, 0.3);
        u += t + 0.005;
      }
    }
  }
  // a framed picture on a wall. L: the frame of that wall, u its middle along the wall, y its middle
  function art(L, u, y, w, h, style = 0) {
    G(L(u - w / 2, 0, y - h / 2, u + w / 2, 0.04, y + h / 2), M.dark, 0.5); G(L(u - w / 2 + 0.05, 0.04, y - h / 2 + 0.05, u + w / 2 - 0.05, 0.052, y + h / 2 - 0.05), M.ceil, 0);
    if (style === 1) for (let i = 0; i < 3; i++) G(L(u - w * 0.3 + i * w * 0.22, 0.052, y - h * 0.3, u - w * 0.3 + i * w * 0.22 + w * 0.14, 0.06, y + h * 0.3), i === 1 ? M.art : M.cush2, 0);
    else if (style === 2) { G(L(u - w * 0.32, 0.052, y - h * 0.3, u + w * 0.32, 0.06, y - h * 0.02), M.art, 0); G(L(u - w * 0.32, 0.052, y + 0.04, u + w * 0.1, 0.06, y + h * 0.3), M.cush2, 0); }
    else { G(L(u - w * 0.3, 0.052, y - h * 0.26, u - w * 0.02, 0.06, y + h * 0.26), M.art, 0); G(L(u + w * 0.05, 0.052, y - h * 0.18, u + w * 0.3, 0.06, y + h * 0.18), M.cush2, 0); }
  }
  // a plant in a pot
  function plant(x, z, h = 1.5, m = M.leaf, pot = M.basalt, o) {
    const R = mulberry(Math.round(x * 97 + z * 31) + 5);
    G(cyl(0.2, 0.15, 0.36, 12, x, G0 + 0.18, z), pot, 0.4, o); G(cyl(0.02, 0.03, h - 0.4, 6, x, G0 + 0.36 + (h - 0.4) / 2, z), M.wood2, 0, o);
    for (let i = 0; i < 7; i++) { const a = R() * 6.283, r = 0.1 + R() * 0.22; G(new THREE.IcosahedronGeometry(0.15 + R() * 0.12, 0).translate(X(x + Math.cos(a) * r), G0 + h - 0.35 + R() * 0.5, z + Math.sin(a) * r), m, 0, o); }
  }
  function bed(L, w = 1.7, y = L1) {
    G(L(0, 0, y, w, 2.1, y + 0.25), M.wood2); G(L(0.03, 0.06, y + 0.25, w - 0.03, 2.08, y + 0.44), M.white); G(L(0, 0, y, w, 0.06, y + 0.95), M.wood);
    G(L(0.03, 0.9, y + 0.44, w - 0.03, 2.08, y + 0.47), M.sofa, 0.4);
    G(L(0.1, 0.12, y + 0.44, w / 2 - 0.05, 0.5, y + 0.54), M.cush, 0.3); G(L(w / 2 + 0.05, 0.12, y + 0.44, w - 0.1, 0.5, y + 0.54), M.cush, 0.3);
  }
  const wardrobe = (L, len, h = 2.3, y = L1) => G(L(0, 0, y, len, 0.6, y + h), M.wood, 0.6);
  function bath(L, y = L1) {              // a tub, a basin on a shelf, a WC, along one wall
    G(L(0, 0, y, 1.7, 0.75, y + 0.56), M.stone, 0.6); G(L(0.06, 0.06, y + 0.5, 1.64, 0.69, y + 0.565), M.white, 0);
    G(L(0.2, 1.5, y + 0.5, 1.2, 1.95, y + 0.82), M.wood, 0.5); G(L(0.35, 1.55, y + 0.82, 1.05, 1.9, y + 0.94), M.stone, 0.4);
    G(L(1.45, 1.45, y, 1.85, 1.95, y + 0.42), M.white, 0.4);
  }
  // one wall in the special finish, 22 mm in front of the plaster
  const accentW = (z0, z1, y0 = G0, y1 = CEIL) => A(0.24, y0, z0, 0.262, y1, z1, M.accent);
  const accentE = (z0, z1, y0 = G0, y1 = SL) => A(5.738, y0, z0, 5.76, y1, z1, M.accent);
  const upper = (x0, z0, x1, z1) => { A(x0, SL, z0, x1, L1, z1, M.ceil, 0.6); A(x0, L1, z0, x1, L1 + 0.012, z1, M.up, 0); };

  /* ---------- what every plan has ---------- */
  A(0.0, 0.0, -12.0, 6.0, G0, -0.4, M.floor);
  A(0.72, G0 - 0.005, -1.75, 2.68, G0 + 0.006, -1.3, M.basalt, 0);                       // a stone mat inside the door
  A(0.0, G0, -12.0, 0.24, CEIL, -0.4, M.wall); A(5.76, G0, -12.0, 6.0, CEIL, -0.4, M.wall);
  A(0.24, CEIL, -12.0, 5.76, CEIL + 0.2, -0.4, M.ceil, 0);
  A(0.24, G0, -1.3, 0.3, 3.0, -0.4, M.wall, 0);                                           // between party wall and the porch cheek
  A(0.24, SL, -1.3, 3.1, L1, -0.4, M.ceil, 0.6); A(0.24, L1, -1.3, 3.1, L1 + 0.012, -0.4, M.up, 0);   // the floor over the porch
  A(0.24, G0, -11.9, 0.26, G0 + 0.09, -1.3, M.dark, 0); A(5.74, G0, -11.9, 5.76, G0 + 0.09, -0.4, M.dark, 0);   // skirtings: a shadow gap
  A(3.1, G0, -0.43, 5.76, 1.0, -0.4, M.wall, 0); A(3.1, 3.0, -0.43, 5.76, SL, -0.4, M.wall, 0);   // the street wall, plastered inside
  A(3.1, 1.0, -0.43, 3.55, 3.0, -0.4, M.wall, 0); A(5.5, 1.0, -0.43, 5.76, 3.0, -0.4, M.wall, 0);

  /* ---------- the plans ---------- */
  const lampY = (k) => [4.5, 5.0, 4.2][k % 3];
  if (plan === 'A') {
    // the hall behind the door is two storeys high, a stair on its west wall, a gallery round it upstairs.
    // East of it, under the gallery, the sitting room. Behind both, kitchen and table.
    upper(3.1, -6.0, 5.76, -0.4); upper(0.24, -12.0, 5.76, -6.0);
    accentW(-6.0, -1.3); accentE(-11.9, -6.05);
    A(3.3, 0.92, -0.74, 5.76, 1.0, -0.2, M.wood, 0.6);                                     // a deep bench under the street window
    rail(3.1, -6.0, 3.1, -1.3); rail(1.2, -6.0, 3.1, -6.0); rail(0.24, -1.3, 3.1, -1.3);
    flight('z', -1.9, -1, 17, 0.25, 0.26, 1.16, st.stair, 1.1475);
    // upstairs: a landing as deep as a room is wide, the door to the bedroom on the axis of the front door
    part('x', -7.35, 0.24, 5.76, [[1.25, 2.15], [4.0, 4.9]]);
    part('z', 2.9, -12.0, -7.4, [[-11.3, -10.4, false]]); part('x', -9.55, 2.95, 5.76);
    bed(frame('W', 0.24, -8.2)); wardrobe(frame('E', 5.76, -9.75), 2.1); bath(frame('E', 5.76, -7.55));
    bookWall(frame('E', 5.76, -0.7), 5.0, L1, CEIL - 0.1);
    // a large framed drawing over the stair, three lamps hanging in the height of the hall
    art(frame('W', 0.262, -2.3), 1.2, 4.6, 2.4, 1.7, st.art);
    [[1.75, -2.9], [2.15, -3.6], [1.9, -4.25]].forEach(([x, z], k) => pend(x, lampY(k), z, CEIL, st.lamp));
    // the sitting room
    A(3.35, G0, -5.95, 5.6, G0 + 0.018, -3.05, M.rug, 0.4);
    sofa(frame('E', 5.72, -3.25), 2.4, st.sofa); coffee(4.2, -4.45, st.coffee); armchair(frame('N', -0.84, 3.5));
    art(frame('E', 5.76, -3.45), 1.0, 2.15, 2.0, 1.2, (st.art + 1) % 3);
    A(5.38, G0, -2.82, 5.42, 1.86, -2.78, M.steel, 0); G(new THREE.SphereGeometry(0.13, 14, 10).translate(X(5.4), 1.95, -2.8), M.glow, 0, NC);
    A(3.3, SL - 0.012, -5.4, 3.38, SL, -1.0, M.glow, 0, NC);
    // kitchen and table
    kitchenRun(frame('W', 0.24, -6.4), 5.1, st.kitchen); island(1.38, -9.3, 2.22, -6.9, 'x+', st.island);
    sideboard(frame('E', 5.76, -6.5), 2.2); dining(3.95, -11.5, 4.95, -9.3, st.dining);
  } else if (plan === 'B') {
    // low at the street, high at the garden: the kitchen behind the street window, the stair up the west wall through
    // a slot, the table in the middle, and at the back a living room two storeys high with a gallery looking into it
    upper(1.28, -8.6, 5.76, -0.4); upper(0.24, -3.0, 1.28, -1.3); upper(0.24, -8.6, 1.28, -6.5);
    accentW(-6.5, -2.3);
    flight('z', -2.4, -1, 17, 0.25, 0.26, 1.16, st.stair, 1.1475);
    rail(0.24, -8.6, 5.76, -8.6); rail(1.28, -6.5, 1.28, -3.0);
    // upstairs: the rooms at the street, their doors on the gallery
    part('x', -6.5, 1.28, 5.76, [[1.4, 2.3, false], [3.6, 4.5]]); part('z', 2.35, -6.45, -0.4, [[-2.9, -2.0]]); part('x', -3.45, 2.4, 5.76); part('x', -3.0, 0.24, 2.3, [[1.4, 2.2]]);
    bed(frame('E', 5.76, -4.1)); bed(frame('E', 5.76, -1.0)); bath(frame('W', 0.24, -0.5));
    // the kitchen: a run on the east wall, an island before it
    A(3.3, 0.92, -0.74, 5.1, 1.0, -0.2, M.wood, 0.6);
    kitchenRun(frame('E', 5.76, -0.9), 4.2, st.kitchen, 0, 1.0); island(3.3, -4.5, 4.14, -2.1, 'x-', st.island);
    // the table, a cupboard under the landing
    dining(3.75, -8.1, 4.75, -5.9, st.dining); wardrobe(frame('W', 0.24, -6.7), 1.8, 2.3, G0); plant(0.75, -5.7, 1.3);
    // the garden room: a chimney breast two storeys high, the sofa facing it
    A(0.24, G0, -11.2, 0.8, CEIL, -9.7, M.accent); A(0.8, G0, -11.35, 1.3, G0 + 0.06, -9.55, M.stone);
    A(0.8, G0 + 0.3, -10.95, 0.815, G0 + 1.05, -9.95, M.basalt, 0); A(0.815, G0 + 0.34, -10.8, 0.822, G0 + 0.62, -10.1, M.glow, 0, NC);
    A(3.0, G0, -11.65, 5.6, G0 + 0.018, -9.0, M.rug, 0.4);
    sofa(frame('E', 5.72, -9.15), 2.4, st.sofa); coffee(4.2, -10.35, st.coffee); armchair(frame('S', -11.6, 1.5)); plant(0.8, -9.25, 2.3);
    art(frame('E', 5.76, -9.35), 1.0, 2.2, 2.0, 1.2, st.art);
    [[3.0, -10.1], [3.55, -10.7], [2.6, -10.9]].forEach(([x, z], k) => pend(x, lampY(k), z, CEIL, st.lamp));
    // a high window over the garden glass
    A(1.3, 3.9, -12.02, 4.7, 3.96, -11.94, M.dark); A(1.3, 5.84, -12.02, 4.7, 5.9, -11.94, M.dark); A(1.3, 3.9, -12.02, 1.36, 5.9, -11.94, M.dark); A(4.64, 3.9, -12.02, 4.7, 5.9, -11.94, M.dark); A(2.97, 3.96, -12.02, 3.03, 5.84, -11.94, M.dark);
    A(1.36, 3.96, -11.99, 4.64, 5.84, -11.975, M.clear, 0, NC);
  } else if (plan === 'C') {
    // every room one storey high. The stair stands across the house, a stepped cupboard with a screen of slats: the
    // living room in front of it, the kitchen with the long table behind it, a passage along the west wall
    upper(3.1, -5.55, 5.76, -0.4); upper(0.24, -5.55, 3.1, -1.3); upper(0.24, -12.0, 5.76, -6.65); upper(0.24, -6.65, 2.3, -5.55);
    const n = 16, go = 0.22, rise = (L1 - G0) / n, x0 = 1.6;
    for (let i = 0; i < n; i++) {
      const xa = x0 + i * go, xb = i === n - 1 ? 5.76 : xa + go, y = G0 + (i + 1) * rise;
      A(xa, G0, -6.6, xb, y - 0.04, -5.6, M.wood, 0.5); A(xa - 0.02, y - 0.04, -6.6, xb, y, -5.6, M.wood2, 0.4);
      if (i < n - 1) for (const k of [0.05, 0.16]) A(xa + k, y, -5.6, xa + k + 0.035, SL, -5.555, M.wood2, 0.3);   // the slats
    }
    A(1.6, G0, -6.72, 5.76, SL, -6.6, M.wall);                                              // the wall behind the stair, the kitchen stands against it
    A(1.56, G0, -5.6, 1.6, SL, -5.555, M.wood2, 0.3);
    rail(2.3, -5.55, 4.9, -5.55); rail(2.3, -6.65, 2.3, -5.55);
    part('x', -6.7, 0.24, 5.76, [[0.8, 1.7], [4.95, 5.72]]); part('z', 3.0, -12.0, -6.75); part('x', -3.85, 0.24, 5.76, [[1.2, 2.1], [3.6, 4.5]]); part('z', 2.85, -3.8, -0.4);
    bed(frame('E', 5.76, -1.0)); bath(frame('W', 0.24, -0.5)); bed(frame('W', 0.24, -8.0), 1.2); bed(frame('E', 5.76, -8.0), 1.2);
    // the living room
    accentE(-5.5, -0.5);
    A(3.3, 0.92, -0.74, 5.76, 1.0, -0.2, M.wood, 0.6);
    A(3.2, G0, -5.2, 5.6, G0 + 0.018, -2.2, M.rug, 0.4);
    sofa(frame('E', 5.72, -2.6), 2.4, st.sofa); coffee(4.2, -3.8, st.coffee); armchair(frame('N', -0.84, 3.5));
    art(frame('E', 5.76, -2.8), 1.0, 2.15, 2.0, 1.2, st.art);
    // a stove on the west wall
    A(0.3, G0, -4.1, 1.0, G0 + 0.03, -3.1, M.stone, 0.4); G(cyl(0.24, 0.24, 0.95, 20, 0.62, G0 + 0.505, -3.6), M.dark, 0.5); G(cyl(0.07, 0.07, SL - G0 - 0.98, 12, 0.62, (SL + G0 + 0.98) / 2, -3.6), M.dark, 0.3);
    A(0.86, G0 + 0.3, -3.74, 0.868, G0 + 0.62, -3.46, M.glow, 0, NC);
    art(frame('W', 0.24, -1.6), 0.45, 1.9, 0.7, 0.9, (st.art + 1) % 3);
    pend(4.2, 2.3, -3.8, SL, st.lamp); plant(3.6, -5.2, 1.5);
    // the kitchen
    kitchenRun(frame('N', -6.72, 1.75), 4.0, st.kitchen); sideboard(frame('W', 0.24, -9.0), 2.4, 0.5);
    dining(2.6, -10.3, 4.8, -9.3, st.dining === 1 ? 0 : st.dining); plant(0.7, -11.5, 1.9);
  } else {
    // high at the street, low at the garden: the living room two storeys high with a wall of books, a study over the
    // entrance looking down into it, a solid stair at the east wall that climbs towards the street
    upper(0.24, -5.2, 3.1, -1.3); upper(0.24, -12.0, 4.72, -5.2); upper(4.72, -5.9, 5.76, -5.2); upper(4.72, -12.0, 5.76, -9.1);
    flight('z', -10.0, 1, 17, 0.25, 4.84, 5.74, 2, 4.8525);
    rail(3.1, -5.2, 3.1, -0.4); rail(3.1, -5.2, 5.76, -5.2);
    part('x', -6.3, 0.24, 4.72, [[1.0, 1.9], [3.3, 4.2]]); part('z', 4.72, -9.1, -6.3); rail(4.72, -6.3, 4.72, -5.9); part('x', -9.1, 4.72, 5.76); part('z', 2.95, -12.0, -6.35); part('x', -9.85, 0.24, 2.9, [[1.6, 2.4]]);
    bed(frame('W', 0.24, -6.9)); bath(frame('W', 0.24, -10.1)); bed(frame('S', -11.9, 3.2), 1.2);
    // the study over the entrance: a desk at the guard
    A(2.2, L1, -3.6, 2.95, L1 + 0.74, -1.9, M.wood, 0.5); A(2.15, L1 + 0.74, -3.65, 3.0, L1 + 0.78, -1.85, M.stone, 0.4);
    // the living room: books up to the roof, a ladder, the sofa turned to them
    bookWall(frame('E', 5.76, -0.7), 4.3, G0, CEIL - 0.1, 37);
    A(5.36, G0, -2.42, 5.4, 5.6, -2.38, M.steel, 0.3); A(5.36, G0, -2.92, 5.4, 5.6, -2.88, M.steel, 0.3);
    for (let y = G0 + 0.3; y < 5.5; y += 0.3) A(5.37, y, -2.9, 5.39, y + 0.025, -2.4, M.steel, 0);
    A(3.2, G0, -4.7, 5.3, G0 + 0.018, -1.6, M.rug, 0.4);
    sofa(frame('W', 3.3, -2.0), 2.4, st.sofa); coffee(4.75, -3.2, st.coffee); armchair(frame('N', -0.84, 3.6));
    [[4.6, -2.8], [4.9, -3.4], [4.4, -3.7]].forEach(([x, z], k) => pend(x, lampY(k) - 0.3, z, CEIL, st.lamp));
    // the entrance: a wall of cupboards, the special wall beside it
    accentW(-5.2, -1.3, G0, SL); wardrobe(frame('W', 0.262, -2.7), 2.3, 2.3, G0);
    // kitchen with island, the table at the garden with a bench on the glass side
    kitchenRun(frame('W', 0.24, -6.4), 5.1, st.kitchen); island(1.38, -9.3, 2.22, -6.9, 'x+', st.island);
    A(3.3, G0 + 0.72, -11.5, 4.7, G0 + 0.78, -10.7, st.dining === 2 ? M.stone : M.wood2, 0.7); A(3.42, G0, -11.2, 3.52, G0 + 0.72, -11.0, M.wood2); A(4.48, G0, -11.2, 4.58, G0 + 0.72, -11.0, M.wood2);
    A(3.3, G0, -11.86, 4.7, G0 + 0.44, -11.56, M.wood, 0.5); A(3.32, G0 + 0.44, -11.84, 4.68, G0 + 0.49, -11.58, M.white, 0.3);
    chair(3.65, -10.46, 'z-'); chair(4.35, -10.46, 'z-');
    pend(3.65, G0 + 1.7, -11.1, SL, st.lamp); pend(4.35, G0 + 1.86, -11.1, SL, st.lamp);
    art(frame('E', 5.76, -10.2), 0.8, 2.0, 1.2, 0.9, st.art);
  }

  /* ---------- the back of the house: a wall of glass, four panels, the middle two sliding ---------- */
  A(0.24, 2.9, -12.08, 5.76, SL, -11.9, M.dark);                                           // the track and its beam
  A(0.24, G0 - 0.01, -12.08, 5.76, G0 + 0.02, -11.9, M.dark, 0);
  const pane = (parent, x0, x1, z) => {
    const f = 0.045, o = { parent, lineColor: O.lineColor, realLines: O.realLines };
    for (const b of [box(x0, G0 + 0.02, z - 0.025, x1, G0 + 0.02 + f, z + 0.025), box(x0, 2.9 - f, z - 0.025, x1, 2.9, z + 0.025), box(x0, G0 + 0.02, z - 0.025, x0 + f, 2.9, z + 0.025), box(x1 - f, G0 + 0.02, z - 0.025, x1, 2.9, z + 0.025)]) add(b, M.dark, 0.6 * LK, o);
    add(box(x0 + f, G0 + 0.02 + f, z - 0.006, x1 - f, 2.9 - f, z + 0.006), M.clear, 0, { parent, cast: false });
  };
  pane(g, 0.24, 1.64, -12.03); pane(g, 4.36, 5.76, -12.03);
  const gDoorL = new THREE.Group(), gDoorR = new THREE.Group();
  gDoorL.userData.host = gDoorR.userData.host = true;
  g.add(gDoorL, gDoorR);
  pane(gDoorL, 1.62, 3.0, -11.96); pane(gDoorR, 3.0, 4.38, -11.96);
  add(box(2.9, 1.1, -11.93, 2.93, 1.5, -11.9), M.dark, 0, { parent: gDoorL }); add(box(3.07, 1.1, -11.93, 3.1, 1.5, -11.9), M.dark, 0, { parent: gDoorR });

  /* ---------- the garden: a terrace, a step down, walls of the house's own material ---------- */
  A(0.0, 0.0, -14.4, 6.0, G0 - 0.02, -12.08, M.paving);
  A(0.22, 0.14, -14.46, 5.78, G0 - 0.015, -14.34, M.gBasalt);
  A(0.0, 0.14, -17.8, 0.24, 2.5, -12.3, M.brick, 0.6); A(-0.02, 2.5, -17.82, 0.26, 2.58, -12.3, M.cope);
  A(5.76, 0.14, -17.8, 6.0, 2.5, -12.3, M.brick, 0.6); A(5.74, 2.5, -17.82, 6.02, 2.58, -12.3, M.cope);
  A(0.0, 0.14, -17.8, 6.0, 2.5, -17.52, M.brick, 0.6); A(-0.02, 2.5, -17.82, 6.02, 2.58, -17.5, M.cope);
  const leafSet = [undefined, [0x7d8f58, 0x93a45f, 0x687a4c], [0xb7a23a, 0xc9b24a, 0x9c8a34]][st.garden];   // maple in October, hornbeam still green, a birch turned yellow
  if (st.garden === 1) {
    // a court of gravel, a long bed along the back wall, a tree with several stems
    A(0.0, 0.0, -17.8, 6.0, 0.14, -14.4, M.gravel);
    A(0.24, 0.14, -17.52, 5.76, 0.5, -16.7, M.brick, 0.6); A(0.24, 0.5, -17.52, 5.76, 0.56, -16.66, M.cope); A(0.36, 0.5, -17.42, 5.64, 0.6, -16.8, M.gLeaf, 0);
    tree(X(1.6), -17.1, 3.6, 0.55, { parent: g, leaves: leafSet }); tree(X(4.4), -17.1, 4.1, 0.6, { parent: g, leaves: leafSet });
    A(2.2, 0.14, -15.9, 3.8, 0.5, -15.5, M.cope); A(2.2, 0.5, -15.92, 3.8, 0.56, -15.48, M.gWood);
  } else {
    A(0.0, 0.0, -17.8, 6.0, 0.14, -14.4, M.lawn);
    A(3.6, 0.14, -17.52, 5.76, 0.66, -14.9, M.brick, 0.6); A(3.56, 0.66, -17.52, 5.76, 0.73, -14.86, M.cope); A(3.74, 0.66, -17.4, 5.64, 0.75, -15.04, M.gLeaf, 0);
    tree(X(5.0), -17.1, 4.0, 0.62, { parent: g, leaves: leafSet });
    A(0.5, 0.56, -16.5, 0.98, 0.62, -14.9, M.gWood); A(0.56, 0.14, -16.42, 0.92, 0.56, -16.34, M.gSteel, 0.4); A(0.56, 0.14, -15.06, 0.92, 0.56, -14.98, M.gSteel, 0.4);
    if (st.garden === 2) { A(0.3, 0.14, -17.5, 3.5, 0.2, -16.9, M.gravel); for (let k = 0; k < 3; k++) plant(0.8 + k * 1.1, -17.2, 1.0, M.gLeaf, M.cope); }
  }
  A(3.28, 0.14, -14.84, 3.4, 0.78, -14.72, M.gSteel, 0.4); A(3.3, 0.62, -14.82, 3.38, 0.74, -14.74, M.gGlow, 0, NC);   // a bollard lamp

  return { gDoorL, gDoorR, plan, fit, M, inn };
}
