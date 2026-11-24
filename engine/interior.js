// The inside of a house, and its walled garden. Four plans, each with its own stair, its own rooms and its own way
// through them, and each in five makes: twenty houses, twenty plans. A house picks a plan, a make and a fit-out: floor, joinery, stone, fabrics, the finish of one wall, metal,
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
// wall: what the house is built of. A rendered house has no bare wall to show indoors: it gets one of the other finishes.
export function fitFor(n = 0, plan = 'A', wall = 'brick') {
  const pick = (list, k) => list[((k % list.length) + list.length) % list.length], f = Math.floor;
  const floor = pick(FLOORS, n), wood = pick(WOODS, n * 3), stone = pick(STONES, n * 3), sofa = pick(FABRICS, n * 5 + (n ? 1 : 0)), rug = pick(RUGS, n);
  const paint = pick(WALLS, n), metal = pick(METALS, n * 2);
  let accent = pick(ACCENTS, n * 2);
  if (accent[0] === 'own' && wall === 'plaster') accent = ACCENTS[1 + n % (ACCENTS.length - 1)];
  else if (accent[0] === 'own' && wall === 'wood') accent = ['own', {}, 'Lärche wie außen'];
  return {
    n, plan, floor, up: pick(FLOORS, [0, 2, 7, 6, 0, 1][n % 6]), wood, wood2: pick(WOODS, n * 3 + (n ? 5 : 0)), stone, sofa,
    cush: n ? pick(FABRICS, n * 5 + 4) : [{}, ''], cush2: n ? pick(FABRICS, n * 5 + 6) : [{ color: 0x2f2c2a }, ''], rug, wall: paint, accent, metal, art: pick(ARTS, n),
    style: { sofa: n % 3, coffee: f(n / 3) % 3, dining: (n + f(n / 3)) % 3, kitchen: f(n / 2) % 3, island: n % 2, lamp: (n * 2 + f(n / 3)) % 3, stair: f(n / 4) % 3, garden: f(n / 5) % 3, art: (n + f(n / 2)) % 3 },
    // what the data sheet of the house says
    list: [['Boden', floor[2]], ['Einbauten', wood[2]], ['Arbeitsplatte', stone[2]], ['Treppe', plan === 'C' ? 'Stufenmöbel mit Lamellen' : STAIRS[plan === 'D' ? 2 : f(n / 4) % 3]], ['Akzentwand', accent[2]], ['Beschläge', metal[1]], ['Polster', sofa[1]]],
  };
}

/* ---------- the plans: what the page needs to know about them ---------- */
// Four plans (A ... D), each in five makes (variant 0 ... 4): the same bones (where the stair stands, where the house
// is two storeys high), other rooms on them. Twenty houses, twenty plans.
// tour: where the lens stands [x, y, z], yaw, pitch, lens, frame height, for the five stations inside
// rooms: [name, x0, z0, x1, z1] in metres, per storey. radar: the little plan (u = depth into the plot, v = x)
// rear: the windows in the garden wall upstairs [x0, y0, x1, y1]. upText: what is said upstairs.
// up: the way to the bedroom and the bath and back, after the rooms downstairs. a: from the last station downstairs to
// the bedroom (back to the stair, up it, to the door), bed: in the bedroom, b: on to the bath, bath: in it, c: back
// and down to the foot of the stair, d: from there to the garden glass. [[x, y, z], yaw, pitch(, lens, frame height)];
// as everywhere, a positive pitch looks down.
// Upstairs every house has the same two rooms (suite() in buildInterior), so the way through them is the same too:
// way() takes what a plan has of its own (pre: to the head of its stair, post: from the landing down to its foot) and
// puts the rooms in between. side: where the stair comes up ('W' | 'E'), wall: where the rooms lie ('street' | 'rear').
// In the suite a place is (s, t) and a look h: 0 towards the windows, 90 across the house, away from the stair.
// The lens leaves a room backwards, still looking into it, and only turns on the landing (back: how far from the
// doors the landing lets it step): turning in the doorway it would look at nothing but the wall beside it.
const GARDEN = [[2.6, 2.0, -13.2], -24, -5, 56, 2.45];
const REAR2 = [[0.85, 4.3, 2.35, 5.85], [3.65, 4.3, 5.15, 5.85]], EY = 1.95, UY = L1 + 1.62;
const way = (pre, side, wall, post, d, back = 5.0) => {
  const sx = side === 'W' ? 1 : -1, x0 = side === 'W' ? 0.24 : 5.76, kz = wall === 'street' ? -1 : 1, z0 = wall === 'street' ? -0.43 : -11.97;
  const k = (s, t, h, pitch, lens = 58) => { const r = h * Math.PI / 180; return [[x0 + sx * s, UY, z0 + kz * t], Math.atan2(-sx * Math.sin(r), kz * Math.cos(r)) * 180 / Math.PI, pitch, lens, 2.4]; };
  return {
    a: [...pre, k(3.0, 4.55, 4, 5)], bed: k(3.0, 3.05, 46, 17, 62),
    b: [k(3.0, Math.min(4.7, back), 22, 8), k(2.55, back, back > 4.8 ? -45 : -58, 6), k(1.64, 4.55, -6, 6)], bath: k(1.64, 2.8, -10, 21, 62),
    c: [k(1.64, 4.4, -6, 9), k(1.7, back, 168, 6), ...post], d,
  };
};
const UPTEXT = 'Oben zwei Türen nebeneinander: das Schlafzimmer mit einer Wand aus Eichenlamellen, das Bad mit der Wanne am <em>Fenster.</em>';
const STAIR_W = [1.9, 0.24, 5.9, 1.14], ISLAND_W = [6.95, 1.4, 9.25, 2.2];
export const PLANS = {
  A: {
    name: 'Halle', claim: 'Halle über zwei Geschosse',
    tour: { hall: [[1.72, 1.96, -2.35], -8, -9, 56, 2.2], turn: [[2.0, 1.94, -3.1], -46, -1, 58, 2.35], rear: [[2.75, 2.0, -6.5], -3, 0, 58, 2.5], glass: [[3.02, 2.0, -10.4], -4, 0, 57, 2.5], garden: GARDEN },
    zones: ['HALLE', 'KÜCHE'],
    text: ['Eine Halle über zwei Geschosse, die Treppe an der Wand, unter der Galerie der <em>Wohnraum.</em>', 'Küche mit Insel und Essplatz. Die Glaswand öffnet beides über die ganze Breite zum <em>Garten.</em>'],
    rooms: {
      eg: [['Halle', 0.24, -6.0, 3.1, -1.3], ['Wohnen', 3.1, -6.0, 5.76, -0.4], ['Kochen', 0.24, -12, 2.9, -6.0], ['Essen', 2.9, -12, 5.76, -6.0]],
      og: [['Galerie', 3.1, -6.0, 5.76, -0.4], ['Flur', 0.24, -8.0, 5.76, -6.0], ['Bad', 0.24, -12, 2.44, -8.9], ['Schlafen', 2.54, -12, 5.76, -8.07]],
    },
    rear: REAR2, upText: UPTEXT,
    up: way([[[2.0, EY, -3.2], 172, 2], [[1.75, EY, -1.82], -100, 0], [[0.69, EY, -1.76], 0, -20], [[0.69, UY, -6.32], -35, 5]], 'W', 'rear',
      [[[2.3, UY, -6.62], 150, 15], [[1.5, UY, -6.62], 120, 10], [[0.69, UY, -6.32], 180, 22], [[0.69, EY, -1.76], -70, 6]],
      [[[1.75, EY, -1.82], -40, 2], [[2.0, EY, -3.2], -10, 2], [[2.75, 2.0, -6.5], -3, 0]]),
    radar: { rects: [STAIR_W, [3.25, 4.86, 5.65, 5.72], [3.8, 3.9, 5.1, 4.5], ISLAND_W, [9.3, 3.95, 11.5, 4.95]], dash: 'M1.3 3.1 H6.0 V0.24' },
  },
  B: {
    name: 'Gartenhalle', claim: 'Wohnraum über zwei Geschosse am Garten',
    tour: { hall: [[1.9, 1.75, -2.5], -58, -2, 58, 2.3], turn: [[2.2, 1.78, -5.3], -24, -3, 60, 2.4], rear: [[2.55, 1.85, -8.2], 12, -15, 60, 2.4], glass: [[3.0, 1.95, -10.6], -4, -2, 57, 2.5], garden: GARDEN },
    zones: ['KÜCHE', 'WOHNEN'],
    text: ['Die Küche liegt vorn am Fenster zur Straße, die Treppe führt an der Wand hinauf, dahinter der <em>Essplatz.</em>', 'Am Garten wird das Haus hoch: der Wohnraum über zwei Geschosse, ein Kamin bis unter die Decke, darüber die <em>Galerie.</em>'],
    rooms: {
      eg: [['Diele', 0.24, -5.2, 3.1, -1.3], ['Kochen', 3.1, -5.2, 5.76, -0.4], ['Essen', 0.24, -8.6, 5.76, -5.2], ['Wohnen', 0.24, -12, 5.76, -8.6]],
      og: [['Galerie', 1.28, -8.6, 5.76, -4.43], ['Bad', 0.24, -3.5, 2.44, -0.4], ['Schlafen', 2.54, -4.33, 5.76, -0.4]],
    },
    rear: [[1.3, 3.9, 4.7, 5.9]], upText: UPTEXT,
    up: way([[[2.2, 1.9, -5.3], 172, 2], [[1.75, EY, -2.3], -100, 0], [[0.69, EY, -2.22], 0, -20], [[0.69, UY, -6.85], -20, 8], [[1.5, UY, -7.3], -60, 22]], 'W', 'street',
      [[[1.72, UY, -7.15], -30, 18], [[0.69, UY, -6.85], 180, 22], [[0.69, EY, -2.22], -70, 6]],
      [[[1.75, EY, -2.3], -40, 2], [[2.2, 1.9, -5.3], -10, 3], [[2.55, 1.9, -8.2], -4, 4]]),
    radar: { rects: [[2.4, 0.24, 6.5, 1.14], [2.1, 3.3, 4.5, 4.14], [0.9, 5.12, 5.1, 5.76], [5.9, 3.75, 8.1, 4.75], [9.15, 4.86, 11.55, 5.72], [9.7, 0.24, 11.2, 0.8]], dash: 'M8.6 0.24 V5.76' },
  },
  C: {
    name: 'Stufenmöbel', claim: 'Treppe quer im Haus, zugleich Schrank',
    tour: { hall: [[1.75, 1.72, -2.7], -38, -2, 58, 2.3], turn: [[0.92, 1.72, -5.0], -5, -1, 58, 2.3], rear: [[1.15, 1.8, -9.0], -112, -2, 62, 2.4], glass: [[2.3, 1.95, -10.8], -8, 0, 57, 2.5], garden: GARDEN },
    zones: ['WOHNEN', 'KÜCHE'],
    text: ['Der Wohnraum liegt vorn an der Straße. Die Treppe steht quer im Haus und ist zugleich <em>Schrank.</em>', 'Dahinter die Wohnküche: eine Zeile an der Treppenwand, der lange Tisch vor dem <em>Garten.</em>'],
    rooms: {
      eg: [['Wohnen', 0.24, -5.6, 5.76, -0.4], ['Treppe', 1.6, -6.6, 5.76, -5.6], ['Wohnküche', 0.24, -12, 5.76, -6.7]],
      og: [['Flur', 0.24, -5.55, 5.76, -4.43], ['Schlafen', 0.24, -4.33, 3.46, -0.4], ['Bad', 3.56, -3.5, 5.76, -0.4], ['Kind 1', 0.24, -12, 2.95, -6.75], ['Kind 2', 3.05, -12, 5.76, -6.75]],
    },
    rear: REAR2, upText: UPTEXT,
    up: way([[[0.95, EY, -6.1], -90, -14], [[2.45, 2.72, -6.1], -90, -16], [[5.3, UY, -6.1], -205, 6], [[5.33, UY, -5.0], -245, 6]], 'E', 'street',
      [[[5.33, UY, -5.0], 40, 10], [[5.3, UY, -6.1], 90, 26], [[2.45, 2.72, -6.1], 80, 16], [[0.95, EY, -6.1], 5, 4]],
      [[[1.1, 1.9, -8.4], 2, 3]], 4.6),
    radar: { rects: [[5.6, 1.6, 6.6, 5.76], [2.6, 4.86, 5.0, 5.72], [6.72, 1.75, 7.36, 5.75], [9.3, 2.6, 10.3, 4.8]], dash: '' },
  },
  D: {
    name: 'Wohnhalle', claim: 'Wohnraum über zwei Geschosse an der Straße',
    tour: { hall: [[1.85, 1.75, -2.6], -40, -10, 58, 2.3], turn: [[2.35, 1.8, -4.3], -78, -8, 60, 2.4], rear: [[2.75, 1.95, -6.7], -3, 0, 58, 2.5], glass: [[2.9, 2.0, -10.3], -5, 0, 57, 2.5], garden: GARDEN },
    zones: ['WOHNEN', 'KÜCHE'],
    text: ['Der Wohnraum ist zwei Geschosse hoch. Die Bücherwand reicht bis unter die <em>Decke.</em>', 'Unter dem Obergeschoss die Küche mit Insel, die massive Treppe an der Wand, der Tisch vor dem <em>Garten.</em>'],
    rooms: {
      eg: [['Diele', 0.24, -5.2, 3.1, -1.3], ['Wohnen', 3.1, -5.2, 5.76, -0.4], ['Kochen', 0.24, -12, 2.9, -5.2], ['Essen', 2.9, -12, 5.76, -5.2]],
      og: [['Arbeiten', 0.24, -5.2, 3.1, -0.4], ['Flur', 0.24, -8.0, 4.72, -5.2], ['Schlafen', 0.24, -12, 3.46, -8.07], ['Bad', 3.56, -12, 5.76, -8.9]],
    },
    rear: REAR2, upText: UPTEXT,
    up: way([[[2.95, EY, -9.6], -20, 3], [[4.2, EY, -10.45], -110, 0], [[5.31, EY, -10.38], -180, -16], [[5.33, 2.55, -9.15], -180, -18], [[5.33, UY, -5.64], -230, 8], [[4.3, UY, -5.75], -275, 6]], 'E', 'rear',
      [[[3.6, UY, -5.85], -110, 14], [[4.3, UY, -5.75], -140, 12], [[5.33, UY, -5.64], 110, 16], [[5.33, 4.52, -6.35], 8, 26], [[5.33, 2.55, -9.15], 0, 26], [[5.31, EY, -10.38], 20, 5]],
      [[[4.2, EY, -10.45], 25, 4]]),
    radar: { rects: [[5.9, 4.84, 10.0, 5.74], [2.0, 3.3, 4.4, 4.16], [0.7, 5.44, 5.0, 5.76], ISLAND_W, [10.7, 3.3, 11.5, 4.7]], dash: 'M0.4 3.1 H5.2 V5.76' },
  },
};
// what the makes 1 ... 4 of a plan change in what the page says (make 0 is the plan as it stands above)
const VARIANTS = {
  A: [null,
    { name: 'Halle mit Ostküche', claim: 'Halle über zwei Geschosse, die Küche an der Ostwand',
      text: [PLANS.A.text[0], 'Die Küche steht an der Ostwand, die Insel davor, der Esstisch gegenüber am <em>Garten.</em>'],
      rooms: { eg: [['Halle', 0.24, -6.0, 3.1, -1.3], ['Wohnen', 3.1, -6.0, 5.76, -0.4], ['Essen', 0.24, -12, 2.9, -6.0], ['Kochen', 2.9, -12, 5.76, -6.0]] },
      radar: { rects: [STAIR_W, [3.25, 4.86, 5.65, 5.72], [3.8, 3.9, 5.1, 4.5], [6.95, 3.78, 9.25, 4.62], [9.3, 1.05, 11.5, 2.05]], dash: PLANS.A.radar.dash } },
    { name: 'Halle mit Gartenzimmer', claim: 'Halle über zwei Geschosse, der Wohnraum am Garten',
      text: ['Eine Halle über zwei Geschosse. Unter der Galerie steht der Esstisch am Fenster zur <em>Straße.</em>', 'Hinten die Küche mit Insel, daneben der Wohnraum direkt am <em>Garten.</em>'],
      rooms: { eg: [['Halle', 0.24, -6.0, 3.1, -1.3], ['Essen', 3.1, -6.0, 5.76, -0.4], ['Kochen', 0.24, -12, 2.9, -6.0], ['Wohnen', 2.9, -12, 5.76, -6.0]] },
      radar: { rects: [STAIR_W, [2.7, 3.9, 4.9, 4.9], ISLAND_W, [7.6, 4.86, 10.0, 5.72], [8.2, 3.9, 9.5, 4.5]], dash: PLANS.A.radar.dash } },
    { name: 'Halle mit Kamin', claim: 'Halle über zwei Geschosse, ein Kamin nach zwei Seiten',
      text: ['Eine Halle über zwei Geschosse. Der Wohnraum unter der Galerie hat einen Kamin, der nach beiden Seiten <em>offen</em> ist.', 'Hinter dem Kamin Küche und Essplatz, über die ganze Breite zum <em>Garten</em> geöffnet.'],
      radar: { rects: [STAIR_W, [2.9, 4.86, 5.3, 5.72], [3.45, 3.9, 4.75, 4.5], [5.85, 3.7, 6.25, 5.76], ISLAND_W, [9.3, 3.95, 11.5, 4.95]], dash: PLANS.A.radar.dash } },
    { name: 'Halle mit Tafel', claim: 'Halle über zwei Geschosse, eine Tafel für zwölf',
      text: [PLANS.A.text[0], 'Eine Küchenzeile und eine Tafel für zwölf: Der lange Tisch steht an der Wand, mit einer Bank bis zum <em>Garten.</em>'],
      radar: { rects: [STAIR_W, [3.25, 4.86, 5.65, 5.72], [3.8, 3.9, 5.1, 4.5], [6.9, 4.29, 11.3, 5.24]], dash: PLANS.A.radar.dash } }],
  B: [null,
    { name: 'Gartenhalle mit Ostkamin', claim: 'Wohnraum über zwei Geschosse am Garten, der Kamin an der Ostwand',
      tour: { rear: [[2.75, 1.85, -8.2], -12, -15, 60, 2.4] },
      text: [PLANS.B.text[0], 'Am Garten wird das Haus hoch: der Wohnraum über zwei Geschosse, der Kamin an der Ostwand, das Sofa ihm <em>gegenüber.</em>'],
      radar: { rects: [[2.4, 0.24, 6.5, 1.14], [2.1, 3.3, 4.5, 4.14], [0.9, 5.12, 5.1, 5.76], [5.9, 3.75, 8.1, 4.75], [9.15, 0.28, 11.55, 1.14], [9.7, 5.2, 11.2, 5.76]], dash: PLANS.B.radar.dash } },
    { name: 'Gartenhalle mit Tresen', claim: 'Küche mit Tresen, Wohnraum über zwei Geschosse am Garten',
      text: ['Die Küche liegt vorn am Fenster zur Straße. Ein Tresen trennt sie vom <em>Essplatz.</em>', PLANS.B.text[1]],
      radar: { rects: [[2.4, 0.24, 6.5, 1.14], [4.25, 3.3, 4.95, 5.1], [0.9, 5.12, 5.1, 5.76], [6.4, 3.65, 7.6, 4.85], [9.15, 4.86, 11.55, 5.72], [9.7, 0.24, 11.2, 0.8]], dash: PLANS.B.radar.dash } },
    { name: 'Lichthof', claim: 'Lichthof über zwei Geschosse am Garten, darüber ein Studio',
      tour: { rear: [[2.6, 1.85, -9.6], 6, -22, 62, 2.4] },
      text: [PLANS.B.text[0], 'Der Wohnraum endet in einem Lichthof: Am Garten ist das Haus über zwei Geschosse offen, darüber liegt das <em>Studio.</em>'],
      rooms: { og: [['Studio', 0.24, -10.3, 5.76, -4.43], ['Bad', 0.24, -3.5, 2.44, -0.4], ['Schlafen', 2.54, -4.33, 5.76, -0.4]] },
      radar: { rects: [[2.4, 0.24, 6.5, 1.14], [2.1, 3.3, 4.5, 4.14], [0.9, 5.12, 5.1, 5.76], [5.9, 3.75, 8.1, 4.75], [9.15, 4.86, 11.55, 5.72], [10.4, 0.24, 11.7, 0.8]], dash: 'M10.3 0.24 V5.76' } },
    { name: 'Speisehalle', claim: 'Speisehalle über zwei Geschosse am Garten',
      tour: { rear: [[2.55, 1.85, -8.2], -6, -12, 60, 2.4] }, zones: ['KÜCHE', 'ESSEN'],
      text: ['Die Küche liegt vorn am Fenster zur Straße. In der Mitte des Hauses, unter der niedrigen Decke, der <em>Wohnraum.</em>', 'Am Garten wird das Haus hoch: eine Speisehalle über zwei Geschosse, die Lampen hängen sechs Meter <em>herab.</em>'],
      rooms: { eg: [['Diele', 0.24, -5.2, 3.1, -1.3], ['Kochen', 3.1, -5.2, 5.76, -0.4], ['Wohnen', 0.24, -8.6, 5.76, -5.2], ['Essen', 0.24, -12, 5.76, -8.6]] },
      radar: { rects: [[2.4, 0.24, 6.5, 1.14], [2.1, 3.3, 4.5, 4.14], [0.9, 5.12, 5.1, 5.76], [5.6, 4.86, 8.0, 5.72], [9.2, 4.0, 11.4, 5.0], [9.7, 0.24, 11.2, 0.8]], dash: PLANS.B.radar.dash } }],
  C: [null,
    { name: 'Stufenmöbel mit Insel', claim: 'Treppe als Schrank, Küche mit Insel',
      text: [PLANS.C.text[0], 'Dahinter die Küche: eine Zeile an der Treppenwand, davor die Insel, der Esstisch am <em>Garten.</em>'],
      radar: { rects: [[5.6, 1.6, 6.6, 5.76], [2.6, 4.86, 5.0, 5.72], [6.72, 1.75, 7.36, 5.75], [8.3, 2.7, 9.1, 5.0], [9.6, 3.95, 11.5, 4.95]], dash: '' } },
    { name: 'Bibliothek', claim: 'Bibliothek an der Straße, die Treppe als Schrank',
      text: ['Vorn die Bibliothek: Bücher an der ganzen Wand, das Sofa davor. Die Treppe steht quer im Haus und ist zugleich <em>Schrank.</em>', PLANS.C.text[1]],
      radar: { rects: [[5.6, 1.6, 6.6, 5.76], [2.2, 3.3, 4.6, 4.3], [0.7, 5.44, 5.3, 5.76], [6.72, 1.75, 7.36, 5.75], [9.3, 2.6, 10.3, 4.8]], dash: '' } },
    { name: 'Ostgang', claim: 'Treppe quer im Haus, der Durchgang an der Ostwand',
      tour: { hall: [[1.9, 1.72, -2.6], -30, -2, 58, 2.3], turn: [[5.08, 1.72, -5.0], 5, -1, 58, 2.3], rear: [[4.85, 1.8, -9.0], 112, -2, 62, 2.4], glass: [[3.7, 1.95, -10.8], 8, 0, 57, 2.5] },
      up: way([[[5.05, EY, -6.1], 90, -14], [[3.55, 2.72, -6.1], 90, -16], [[0.7, UY, -6.1], 205, 6], [[0.67, UY, -5.0], 245, 6]], 'W', 'street',
        [[[0.67, UY, -5.0], -40, 10], [[0.7, UY, -6.1], -90, 26], [[3.55, 2.72, -6.1], -80, 16], [[5.05, EY, -6.1], -5, 4]],
        [[[4.9, 1.9, -8.4], -2, 3]], 4.6),
      text: ['Der Wohnraum liegt vorn an der Straße. Die Treppe steht quer im Haus, der Weg nach hinten führt an der Ostwand <em>vorbei.</em>', PLANS.C.text[1]],
      rooms: { eg: [['Wohnen', 0.24, -5.6, 5.76, -0.4], ['Treppe', 0.24, -6.6, 4.4, -5.6], ['Wohnküche', 0.24, -12, 5.76, -6.7]],
        og: [['Flur', 0.24, -5.55, 5.76, -4.43], ['Bad', 0.24, -3.5, 2.44, -0.4], ['Schlafen', 2.54, -4.33, 5.76, -0.4], ['Kind 1', 0.24, -12, 2.95, -6.75], ['Kind 2', 3.05, -12, 5.76, -6.75]] },
      radar: { rects: [[5.6, 0.24, 6.6, 4.4], [2.7, 0.28, 5.1, 1.14], [6.72, 0.25, 7.36, 4.25], [9.3, 1.3, 10.3, 3.5]], dash: '' } },
    { name: 'Arbeitszimmer', claim: 'Arbeitszimmer an der Straße, die Treppe als Schrank',
      text: ['Vorn an der Straße ein Arbeitszimmer mit eigener Tür, dahinter der Wohnraum vor der Treppe, die zugleich <em>Schrank</em> ist.', PLANS.C.text[1]],
      rooms: { eg: [['Arbeiten', 3.15, -3.15, 5.76, -0.4], ['Wohnen', 0.24, -5.6, 5.76, -3.25], ['Treppe', 1.6, -6.6, 5.76, -5.6], ['Wohnküche', 0.24, -12, 5.76, -6.7]] },
      radar: { rects: [[5.6, 1.6, 6.6, 5.76], [1.2, 3.05, 3.2, 3.15], [3.15, 4.3, 3.25, 5.76], [3.4, 4.86, 5.4, 5.72], [6.72, 1.75, 7.36, 5.75], [9.3, 2.6, 10.3, 4.8]], dash: '' } }],
  D: [null,
    { name: 'Kaminhalle', claim: 'Wohnraum über zwei Geschosse mit hohem Kamin',
      text: ['Der Wohnraum ist zwei Geschosse hoch. An seiner Wand steht ein Kamin, der bis unter die <em>Decke</em> reicht.', PLANS.D.text[1]],
      radar: { rects: [[5.9, 4.84, 10.0, 5.74], [2.0, 3.3, 4.4, 4.16], [2.3, 5.2, 3.9, 5.76], ISLAND_W, [10.7, 3.3, 11.5, 4.7]], dash: PLANS.D.radar.dash } },
    { name: 'Große Halle', claim: 'Halle über zwei Geschosse und die ganze Breite des Hauses',
      text: ['Hinter der Tür öffnet sich eine Halle über die ganze Breite des Hauses, zwei Geschosse hoch, die Bücherwand bis unter die <em>Decke.</em>', PLANS.D.text[1]],
      rooms: { eg: [['Wohnhalle', 0.24, -5.2, 5.76, -0.4], ['Kochen', 0.24, -12, 2.9, -5.2], ['Essen', 2.9, -12, 5.76, -5.2]],
        og: [['Flur', 0.24, -8.0, 4.72, -5.2], ['Schlafen', 0.24, -12, 3.46, -8.07], ['Bad', 3.56, -12, 5.76, -8.9]] },
      radar: { rects: PLANS.D.radar.rects, dash: 'M5.2 0.24 V5.76' } },
    { name: 'Tafelhalle', claim: 'Tafel in der hohen Halle, der Wohnraum am Garten', zones: ['ESSEN', 'KÜCHE'],
      text: ['In der hohen Halle an der Straße steht die Tafel vor der Bücherwand, die Lampen hängen von ganz <em>oben.</em>', 'Unter dem Obergeschoss die Küche mit Insel, dahinter der Wohnraum am <em>Garten.</em>'],
      rooms: { eg: [['Diele', 0.24, -5.2, 3.1, -1.3], ['Essen', 3.1, -5.2, 5.76, -0.4], ['Kochen', 0.24, -9.2, 4.8, -5.2], ['Wohnen', 0.24, -12, 5.76, -9.2]] },
      radar: { rects: [[5.9, 4.84, 10.0, 5.74], [2.4, 3.95, 4.6, 4.95], [0.7, 5.44, 5.0, 5.76], [6.3, 1.4, 8.5, 2.2], [9.3, 0.28, 11.6, 1.14]], dash: PLANS.D.radar.dash } },
    { name: 'Gartenzimmer', claim: 'Wohnhalle an der Straße, ein Gartenzimmer hinter Glas',
      text: [PLANS.D.text[0], 'Die Küche mit Insel liegt in der Mitte. Eine Glaswand trennt das Gartenzimmer ab, in dem der <em>Esstisch</em> steht.'],
      rooms: { eg: [['Diele', 0.24, -5.2, 3.1, -1.3], ['Wohnen', 3.1, -5.2, 5.76, -0.4], ['Kochen', 0.24, -9.6, 4.8, -5.2], ['Gartenzimmer', 0.24, -12, 5.76, -9.6]] },
      radar: { rects: [[5.9, 4.84, 10.0, 5.74], [2.0, 3.3, 4.4, 4.16], [0.7, 5.44, 5.0, 5.76], [6.9, 1.4, 9.0, 2.2], [9.55, 0.24, 9.65, 2.0], [9.55, 3.9, 9.65, 4.84], [10.7, 3.3, 11.5, 4.7]], dash: PLANS.D.radar.dash } }],
};
// everything the page needs to know about make `variant` of plan `plan`
export function planInfo(plan, variant = 0) {
  const base = PLANS[plan] || PLANS.A, v = (VARIANTS[PLANS[plan] ? plan : 'A'] || [])[variant];
  if (!v) return base;
  return { ...base, ...v, tour: { ...base.tour, ...(v.tour || {}) }, rooms: { ...base.rooms, ...(v.rooms || {}) }, radar: v.radar || base.radar };
}

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

  // ---- materials. `in`: how much of the one room light a surface gets (1 inside; a little in the garden, which has the
  // sun: with more, a white garden wall in the sun is as bright as the sky behind it)
  const inn = (kind, o = {}) => mat(kind, { ...o, in: 1 }), out = (kind, o = {}) => mat(kind, { ...o, in: 0.3 });
  const own = { color: v.brick, tx: v.wallTx };
  const M = {
    floor: inn(fit.floor[0], fit.floor[1]), up: inn('oakFloor', { color: 0xc3a171, tx: [0, 0.15, 1.7, 0] }),      // (upstairs every house has the same oak boards)
    wood: inn(fit.wood[0], fit.wood[1]), wood2: inn(fit.wood2[0], fit.wood2[1]), stone: inn(fit.stone[0], fit.stone[1]),
    wall: inn('plaster', fit.wall[0]), ceil: inn('plaster'),
    accent: fit.accent[0] === 'own' ? inn(v.wall || 'brick', own) : inn(fit.accent[0], fit.accent[1]),
    steel: inn('steel', fit.metal[0]), dark: inn('steel'),
    sofa: inn('linen', fit.sofa[0]), cush: inn('linen', fit.cush[0]), cush2: inn('linen', fit.cush2[0]), rug: inn('linen', fit.rug[0]), white: inn('linen'),
    art: inn('plain', { color: fit.art }), door: inn('lacquer', v.doorColor ? { color: v.doorColor } : {}),
    basalt: inn('stone', { color: 0x2f2c2a }), glow: inn('interior', { realOnly: true }), clear: inn('glass', { clear: true }), mirror: inn('glass'), leaf: inn('foliage'),
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
      else { G(bx(a, b, G0, y + rise - 0.03), tm); G(bx(a - dir * 0.02, b, y + rise - 0.03, y + rise), M.stone); G(bx(a - dir * 0.021, a + dir * 0.014, y + rise - 0.012, y + rise + 0.002, w0 + 0.002, w1 - 0.002), M.dark, 0); }   // (a dark edge on every tread: from above a pale stair would be one pale slope)
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
  // along x; along 'z': at x = p. doors: [from, to, leaf]. leaf true (or left out): shut, in the colour of the front
  // door (white upstairs). false: an opening without a door. 'a+' | 'a-' | 'b+' | 'b-': the leaf stands open at a right angle, hinged
  // at `from` (a) or at `to` (b), on the + or on the - side of the wall.
  function part(along, p, a0, a1, doors = [], y0 = L1, y1 = CEIL, m = M.wall) {
    const t = 0.05, seg = (s0, s1, ya, yb) => { if (s1 - s0 > 0.01) (along === 'x' ? A(s0, ya, p - t, s1, yb, p + t, m) : A(p - t, ya, s0, p + t, yb, s1, m)); };
    const yf = y0 === L1 ? L1 + 0.012 : y0;                                    // upstairs the wall stands on the boards (at the edge of a floor both would lie in one plane)
    // a piece of the door: s along the wall, d across it
    const P = (s0, d0, ya, s1, d1, yb, mm, lw = 0) => (along === 'x' ? A(s0, ya, p + d0, s1, yb, p + d1, mm, lw) : A(p + d0, ya, s0, p + d1, yb, s1, mm, lw));
    const leafM = y0 >= L1 ? UM.door : M.door;                                 // upstairs every door is white, in every house
    let s = a0;
    [...doors].sort((d, e) => d[0] - e[0]).forEach(([d0, d1, leaf = true]) => {
      const fr = leaf === false ? 0 : 0.02;                                    // the wall ends inside the frame, not flush with it
      seg(s, d0 - fr, yf, y1); seg(d0 - fr, d1 + fr, y0 + 2.1 + fr, y1); s = d1 + fr;
      if (leaf === false) return;
      const f = t + 0.012;
      P(d0 - 0.05, -f, y0, d0, f, y0 + 2.15, M.dark); P(d1, -f, y0, d1 + 0.05, f, y0 + 2.15, M.dark); P(d0 - 0.05, -f, y0 + 2.1, d1 + 0.05, f, y0 + 2.15, M.dark);
      if (leaf === true) {
        P(d0, -0.025, y0, d1, 0.025, y0 + 2.1, leafM, 0.5);
        P(d1 - 0.15, 0.025, y0 + 0.9, d1 - 0.12, 0.075, y0 + 1.3, M.steel); P(d1 - 0.15, -0.075, y0 + 0.9, d1 - 0.12, -0.025, y0 + 1.3, M.steel);
      } else {
        const atA = leaf[0] === 'a', sg = leaf[1] === '+' ? 1 : -1, w = d1 - d0 - 0.03, h0 = atA ? d0 : d1 - 0.04;
        P(h0, sg * (f + 0.005), y0, h0 + 0.04, sg * (f + 0.005 + w), y0 + 2.08, leafM, 0.4);
        const e = atA ? h0 + 0.04 : h0 - 0.045;                              // the handle, on the face that looks into the opening
        P(e, sg * (f + w - 0.16), y0 + 0.98, e + 0.045, sg * (f + w - 0.03), y0 + 1.02, M.steel);
      }
    });
    seg(s, a1, yf, y1);
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
    if (style === 2) { G(L(0.02, 0.86, y + 0.02, 0.86, 1.15, y + 0.14), M.wood2); G(L(0.03, 0.86, y + 0.14, 0.85, 1.15, y + 0.42), M.sofa); }   // one seat is longer: a chaise
  }
  function armchair(L, y = G0) {
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
    const b = opp[face], pad = [cx - s + (b === 'x-' ? t : 0), cz - s + (b === 'z-' ? t : 0), cx + s - (b === 'x+' ? t : 0), cz + s - (b === 'z+' ? t : 0)];   // the seat ends at the back, not in it
    A(pad[0], y + 0.46, pad[1], pad[2], y + 0.51, pad[3], M.white, 0.35);
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
    const len = alongZ ? z1 - z0 : x1 - x0, n = side ? lo(3, Math.floor(len / 0.7)) : 0;       // no side: no stools
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
  // a bed with its head against a wall: a low frame, the mattress, a quilt folded back, two pillows, a padded head
  function bed(L, w = 1.7, y = L1) {
    G(L(0, 0, y, w, 2.1, y + 0.25), M.wood2); G(L(0.03, 0.06, y + 0.25, w - 0.03, 2.08, y + 0.44), M.white); G(L(-0.08, 0, y, w + 0.08, 0.07, y + 1.05), M.sofa, 0.5);
    G(L(0.03, 0.85, y + 0.44, w - 0.03, 2.08, y + 0.47), M.sofa, 0.4); G(L(0.03, 0.7, y + 0.44, w - 0.03, 0.85, y + 0.5), M.white, 0.3);
    G(L(0.1, 0.12, y + 0.44, w / 2 - 0.05, 0.5, y + 0.56), M.cush, 0.3); G(L(w / 2 + 0.05, 0.12, y + 0.44, w - 0.1, 0.5, y + 0.56), M.cush, 0.3);
  }
  const wardrobe = (L, len, h = 2.3, y = L1) => { G(L(0, 0, y, len, 0.6, y + h), M.wood, 0.6); for (let u = 0.6; u < len - 0.2; u += 0.6) G(L(u - 0.004, 0.6, y + 0.06, u + 0.004, 0.606, y + h - 0.04), M.dark, 0); };
  // one wall in the special finish, 22 mm in front of the plaster
  const accentW = (z0, z1, y0 = G0, y1 = CEIL) => A(0.24, y0, z0, 0.262, y1, z1, M.accent);
  const accentE = (z0, z1, y0 = G0, y1 = SL) => A(5.738, y0, z0, 5.76, y1, z1, M.accent);
  const upper = (x0, z0, x1, z1) => { A(x0, SL, z0, x1, L1, z1, M.ceil, 0.6); A(x0, L1, z0, x1, L1 + 0.012, z1, M.up, 0); };
  const bench = (x1 = 5.76) => A(3.3, 0.92, -0.74, x1, 1.004, -0.2, M.wood, 0.6);            // a deep bench under the street window
  // a chimney breast against a party wall ('W' / 'E') from z0 to z1, up to y1, with its hearth and its fire
  const chimney = (side, z0, z1, y1 = CEIL, hd = 0.5) => {
    const L = frame(side, side === 'W' ? 0.24 : 5.76, z1), len = z1 - z0;
    G(L(0, 0, G0, len, 0.56, y1), M.accent); G(L(-0.15, 0.56, G0, len + 0.15, 0.56 + hd, G0 + 0.06), M.stone);
    G(L(0.25, 0.56, G0 + 0.3, len - 0.25, 0.575, G0 + 1.05), M.basalt, 0); G(L(0.4, 0.575, G0 + 0.34, len - 0.4, 0.582, G0 + 0.62), M.glow, 0, NC);
  };
  // a stove with its flue, on a stone plate. f: +1 the fire looks east, -1 west
  const stove = (x, z, f) => {
    A(x - 0.35 + f * 0.03, G0, z - 0.5, x + 0.35 + f * 0.03, G0 + 0.03, z + 0.5, M.stone, 0.4);
    G(cyl(0.24, 0.24, 0.95, 20, x, G0 + 0.505, z), M.dark, 0.5); G(cyl(0.07, 0.07, SL - G0 - 0.98, 12, x, (SL + G0 + 0.98) / 2, z), M.dark, 0.3);
    A(x + f * 0.24, G0 + 0.3, z - 0.14, x + f * 0.248, G0 + 0.62, z + 0.14, M.glow, 0, NC);
  };
  // a sitting group: the sofa against a party wall from z0 towards the garden, a rug, a low table, a picture over the sofa
  const sitting = (side, z0, len = 2.4, artStyle = st.art) => {
    const e = side === 'E';
    A(e ? 3.35 : 0.4, G0, hi(-11.88, z0 - len - 0.3), e ? 5.6 : 2.65, G0 + 0.018, z0 + 0.2, M.rug, 0.4);
    sofa(frame(side, e ? 5.72 : 0.28, z0), len, st.sofa); coffee(e ? 4.2 : 1.8, z0 - len / 2, st.coffee);
    art(frame(side, e ? 5.76 : 0.24, z0 - 0.2), len / 2 - 0.2, 2.15, len - 0.4, 1.2, artStyle);
  };
  // a long table against a party wall: a bench on the wall side, chairs on the other, lamps over it
  const tafel = (side, z0, z1) => {
    const e = side === 'E', xw = e ? 5.74 : 0.26, d = e ? -1 : 1, y = G0, n = Math.floor((z1 - z0) / 0.7);
    A(xw, y, z0, xw + d * 0.44, y + 0.44, z1, M.wood, 0.5); A(xw, y + 0.44, z0 + 0.02, xw + d * 0.42, y + 0.49, z1 - 0.02, M.white, 0.3);
    A(xw + d * 0.5, y + 0.72, z0, xw + d * 1.45, y + 0.78, z1, st.dining === 2 ? M.stone : M.wood2, 0.7);
    for (const z of [z0 + 0.4, (z0 + z1) / 2, z1 - 0.4]) A(xw + d * 0.62, y, z - 0.05, xw + d * 1.33, y + 0.72, z + 0.05, M.wood2);
    for (let i = 0; i < n; i++) { const z = z0 + (z1 - z0) * (i + 0.5) / n; chair(xw + d * 1.69, z, e ? 'x+' : 'x-'); if (i % 2 === 0) pend(xw + d * 0.97, y + 1.66 + (i % 4 ? 0.16 : 0), z, SL, st.lamp); }
  };

  /* ---------- what every plan has ---------- */
  A(0.0, 0.0, -12.0, 6.0, G0, -0.4, M.floor);
  A(0.72, G0 - 0.005, -1.75, 2.68, G0 + 0.006, -1.3, M.basalt, 0);                       // a stone mat inside the door
  A(0.0, G0, -12.0, 0.24, CEIL, -0.4, M.wall); A(5.76, G0, -12.0, 6.0, CEIL, -0.4, M.wall);
  A(0.24, CEIL, -12.0, 5.76, CEIL + 0.1, -0.4, M.ceil, 0);                               // (thin enough to end behind the coping of the lowest back wall)
  A(0.24, G0, -1.3, 0.3, 3.0, -0.4, M.wall, 0);                                           // between party wall and the porch cheek
  A(0.24, SL, -1.3, 3.1, L1, -0.4, M.ceil, 0.6); A(0.24, L1, -1.3, 3.1, L1 + 0.012, -0.4, M.up, 0);   // the floor over the porch
  A(0.24, G0, -11.89, 0.26, G0 + 0.09, -1.3, M.dark, 0); A(5.74, G0, -11.89, 5.76, G0 + 0.09, -0.4, M.dark, 0);   // skirtings: a shadow gap
  A(3.1, G0, -0.43, 5.76, 1.0, -0.4, M.wall, 0); A(3.1, 3.0, -0.43, 5.76, SL, -0.4, M.wall, 0);   // the street wall, plastered inside
  A(3.1, 1.0, -0.43, 3.55, 3.0, -0.4, M.wall, 0); A(5.5, 1.0, -0.43, 5.76, 3.0, -0.4, M.wall, 0);

  /* ---------- the plans ---------- */
  // V: which make of the plan this house is (0 ... 4). The bones stay, the rooms on them change.
  const V = c.variant || 0;
  const lampY = (k) => [4.5, 5.0, 4.2][k % 3];
  /* ---------- upstairs: the same two rooms in every house ----------
     From the landing two doors side by side: the bath and the bedroom. Both lie at an outer wall (at the street or at
     the garden, as the plan has it) and have their windows there. The rooms, their furniture and every surface are the
     same in all twenty houses: oak boards, white plaster, a wall of oak slats behind the bed, pale tiles in the bath.
     A plan only says on which side its stair comes up (side 'W' | 'E'), at which wall the rooms lie (wall 'street' |
     'rear') and whether the corner behind the stair is a store room (where the stair is not there itself).
     In the suite s runs from the party wall on the side of the stair across the house (0 ... 5.52), t from the window
     wall into the house (0 ... 3.9, then the wall with the two doors), heights from the floor upstairs. */
  const UM = {
    wall: inn('plaster'), oak: inn('wood', { color: 0xb18b5c, tx: [2, 0.6, 0, 0] }), slat: inn('wood', { color: 0xb88b55, tx: [3, 0.05, 0, 0] }),
    tile: inn('travertine', { color: 0xb1aa9d, tx: [3, 0.6, 0.6, 0], rough: 0.55 }), wtile: inn('travertine', { color: 0xe8e4dc, tx: [3, 0.6, 0.3, 0], rough: 0.42 }),
    white: inn('lacquer', { color: 0xf3f1ec, rough: 0.34 }), water: inn('lacquer', { color: 0xc6d6d4, rough: 0.2 }), door: inn('lacquer', { color: 0xf0ede6, rough: 0.5 }),
    linen: inn('linen'), throw: inn('linen', { color: 0x8c9787 }), sand: inn('linen', { color: 0xcdbf9f, tx: [6, 0.06, 0, 0.12] }),
    rug: inn('linen', { color: 0xddd6c8, tx: [3, 0.1, 0, 0.22] }), drape: inn('linen', { color: 0xebe6da, tx: [1, 0.09, 0, 0.07] }),
  };
  // The street wall and the garden wall upstairs, plastered inside, with white reveals and a white board in every
  // opening. The openings of the street wall are those of the facade (v.first), the windows to the garden the plan's
  // own (rear): the shell leaves the same holes in its wall.
  const Rm = (x0, y0, x1, y1) => (doorL ? [x0, y0, x1, y1] : [6 - x1, y0, 6 - x0, y1]);
  const street = v.first === 'frame' ? [[0.9, 3.95, 5.1, 6.0]] : [[0.5, 3.9, 2.9, 5.9], [3.875, 3.9, 5.175, 6.0]], rear = planInfo(plan, V).rear || [];
  const lining = (wall, holes) => {
    const st = wall === 'street', za = st ? -0.4 : -12.17, zb = st ? -0.27 : -11.97, zi = st ? -0.47 : -11.9;
    add(K.panel(Rm(0.24, st ? L1 : SL, 5.76, CEIL), holes.map((h) => Rm(...h)), st ? -0.43 : -12.0, st ? -0.4 : -11.97), UM.wall, 0, { parent: g, cast: false });
    holes.forEach(([x0, y0, x1, y1]) => {
      A(x0, y0, za, x0 + 0.012, y1, zb, UM.wall, 0, NC); A(x1 - 0.012, y0, za, x1, y1, zb, UM.wall, 0, NC); A(x0, y1 - 0.012, za, x1, y1, zb, UM.wall, 0, NC);
      A(x0 - 0.02, y0 - 0.025, lo(za, zb, zi), x1 + 0.02, y0 + 0.016, hi(za, zb, zi), UM.white, 0, NC);      // (4 mm over the stone sill of the window)
    });
  };
  if (plan !== 'B') rear.forEach(([x0, y0, x1, y1]) => {
    const z = -12.2, mx = (x0 + x1) / 2;                                        // the frame stands in the outer third of the wall
    for (const b of [[x0, y0, x1, y0 + 0.05], [x0, y1 - 0.05, x1, y1], [x0, y0, x0 + 0.05, y1], [x1 - 0.05, y0, x1, y1], [mx - 0.025, y0, mx + 0.025, y1]]) A(b[0], b[1], z - 0.03, b[2], b[3], z + 0.03, M.dark, 0);
    A(x0 + 0.05, y0 + 0.05, z - 0.006, x1 - 0.05, y1 - 0.05, z + 0.006, M.clear, 0, NC);
    A(x0 - 0.05, y0 - 0.05, -12.38, x1 + 0.05, y0 + 0.004, -12.23, M.cope, 0); // the sill outside
  });
  let suiteWall = null;
  function suite(side, wall, store) {
    suiteWall = wall;
    const sx = side === 'W' ? 1 : -1, x0 = side === 'W' ? 0.24 : 5.76, kz = wall === 'street' ? -1 : 1, z0 = wall === 'street' ? -0.43 : -11.97, H = CEIL - L1, D = 3.9;
    const mb = (s0, y0, t0, s1, y1, t1, m, lw = 0, o) => A(x0 + sx * s0, L1 + y0, z0 + kz * t0, x0 + sx * s1, L1 + y1, z0 + kz * t1, m, lw, o);
    const disc = (r, h, s, y, t, m, o) => G(cyl(r, r, h, 20, x0 + sx * s, L1 + y, z0 + kz * t), m, 0, o);
    // ---- the window wall: every opening belongs to the room it lies in; a strip of window left over beside the wall between the rooms is closed
    const open = [];
    (wall === 'street' ? street : rear).forEach(([xa, ya, xb, yb]) => {
      const a = lo((xa - x0) * sx, (xb - x0) * sx), b = hi((xa - x0) * sx, (xb - x0) * sx);
      for (const [r0, r1] of [[0.03, 2.2], [2.3, 5.47]]) { const c0 = hi(a, r0), c1 = lo(b, r1); if (c1 - c0 >= 0.6) open.push([c0, ya, c1, yb]); }
    });
    lining(wall, open.map(([c0, ya, c1, yb]) => [lo(x0 + sx * c0, x0 + sx * c1), ya, hi(x0 + sx * c0, x0 + sx * c1), yb]));
    // ---- the walls: the one with the doors (t = D), the one between the rooms, the corner behind the stair
    const doors = [...(store ? [[0.12, 0.92]] : []), [1.2, 2.14], [2.5, 3.5]], FL = 0.012;      // (the walls stand on the boards)
    let at = store ? 0 : 1.04;
    doors.forEach(([d0, d1]) => {
      mb(at, FL, D, d0 - 0.02, H, D + 0.1, UM.wall); mb(d0 - 0.02, 2.12, D, d1 + 0.02, H, D + 0.1, UM.wall); at = d1 + 0.02;   // (the wall ends inside the frame)
      mb(d0 - 0.05, 0, D - 0.012, d0, 2.15, D + 0.112, M.dark); mb(d1, 0, D - 0.012, d1 + 0.05, 2.15, D + 0.112, M.dark); mb(d0 - 0.05, 2.1, D - 0.012, d1 + 0.05, 2.15, D + 0.112, M.dark);
    });
    mb(at, FL, D, 5.52, H, D + 0.1, UM.wall);
    mb(2.2, FL, 0, 2.3, H, D, UM.wall); mb(1.04, FL, 2.55, 1.14, H, D, UM.wall); mb(0, FL, 2.55, 1.14, H, 2.65, UM.wall);
    // the leaves: bath and bedroom stand open, each folded back against a wall of its room; the store room is shut
    mb(2.1, 0, D - 0.94, 2.14, 2.08, D - 0.012, UM.door, 0.4); mb(2.07, 0.98, D - 0.9, 2.1, 1.02, D - 0.78, M.dark);
    mb(2.5, 0, D - 0.98, 2.54, 2.08, D - 0.012, UM.door, 0.4); mb(2.54, 0.98, D - 0.94, 2.57, 1.02, D - 0.82, M.dark);
    if (store) { mb(0.12, 0, D + 0.03, 0.92, 2.1, D + 0.07, UM.door, 0.4); mb(0.78, 0.98, D + 0.07, 0.9, 1.02, D + 0.1, M.dark); }

    // ---- the bedroom (s 2.3 ... 5.52): a wall of oak slats, the bed before it, a wardrobe beside the door, a chair at the window
    mb(5.49, 0, 0, 5.52, H, D, UM.slat, 0.4);
    mb(5.41, 0, 0.7, 5.49, 1.12, 2.62, UM.sand, 0.5);                                              // the padded head
    mb(3.39, 0.06, 0.75, 5.41, 0.28, 2.55, UM.oak, 0.5); mb(3.47, 0, 0.83, 5.35, 0.06, 2.47, M.dark);   // the frame on its plinth
    mb(3.42, 0.28, 0.78, 5.4, 0.47, 2.52, UM.linen); mb(3.41, 0.47, 0.76, 4.72, 0.53, 2.54, UM.linen, 0.3); mb(4.6, 0.53, 0.76, 4.76, 0.57, 2.54, UM.linen);   // mattress, quilt, its fold
    mb(3.4, 0.53, 0.74, 3.95, 0.56, 2.56, UM.throw, 0.3);                                           // a blanket across the foot
    mb(4.95, 0.47, 0.84, 5.36, 0.61, 1.6, UM.linen, 0.3); mb(4.95, 0.47, 1.7, 5.36, 0.61, 2.46, UM.linen, 0.3);
    mb(4.84, 0.47, 1.0, 4.96, 0.8, 1.44, UM.sand, 0.3); mb(4.84, 0.47, 1.86, 4.96, 0.8, 2.3, UM.throw, 0.3);
    for (const t of [0.3, 2.62]) {                                                                 // a table on each side, a lamp hanging over it
      mb(5.07, 0.16, t, 5.49, 0.46, t + 0.4, UM.oak, 0.4);
      mb(5.275, 1.12, t + 0.195, 5.285, H, t + 0.205, M.dark); disc(0.08, 0.17, 5.28, 1.04, t + 0.2, M.glow, NC);
    }
    mb(3.0, 0.012, 0.45, 5.3, 0.03, 2.9, UM.rug, 0.4);
    mb(3.7, 0, 3.3, 5.49, 2.45, D, UM.oak, 0.6); for (const sj of [4.3, 4.9]) mb(sj - 0.004, 0.08, 3.292, sj + 0.004, 2.41, 3.3, M.dark);   // the wardrobe
    mb(2.32, 0.02, 0.35, 2.98, 0.3, 1.0, UM.oak, 0.4); mb(2.42, 0.26, 0.38, 2.96, 0.44, 0.97, UM.sand); mb(2.3, 0.3, 0.35, 2.46, 0.86, 1.0, UM.sand, 0.4);   // the chair
    mb(2.4, 0, 1.14, 2.44, 1.5, 1.18, M.dark); G(new THREE.SphereGeometry(0.12, 14, 10).translate(X(x0 + sx * 2.42), L1 + 1.6, z0 + kz * 1.16), M.glow, 0, NC);
    mb(2.3, 1.12, 1.55, 2.335, 2.0, 2.75, M.dark, 0.5); mb(2.335, 1.17, 1.6, 2.347, 1.95, 2.7, UM.linen); mb(2.347, 1.3, 1.72, 2.355, 1.82, 2.12, UM.throw); mb(2.347, 1.38, 2.2, 2.355, 1.74, 2.56, UM.sand);   // a picture
    disc(0.24, 0.03, 3.9, H - 0.015, 1.75, M.glow, NC); disc(0.27, 0.02, 3.9, H - 0.01, 1.75, M.dark, NC);
    mb(2.3, 0, 0, 2.312, 0.07, 2.9, UM.oak); mb(3.55, 0, D - 0.012, 3.7, 0.07, D, UM.oak); mb(2.3, 0, 0, 5.49, 0.07, 0.012, UM.oak);   // skirtings
    open.filter(([c0]) => c0 >= 2.3).forEach(([c0, , c1]) => {                                    // linen at the window, on a rail
      if (c0 - 0.36 >= 2.32) mb(c0 - 0.36, 0.03, 0.04, c0 - 0.02, H - 0.06, 0.1, UM.drape, 0.4);
      if (c1 + 0.36 <= 5.47) mb(c1 + 0.02, 0.03, 0.04, c1 + 0.36, H - 0.06, 0.1, UM.drape, 0.4);
      mb(hi(2.32, c0 - 0.42), H - 0.075, 0.03, lo(5.47, c1 + 0.42), H - 0.05, 0.11, M.dark);
    });

    // ---- the bath (s 0 ... 2.2, and the way in beside the corner): tiles on the floor and behind the wash stand, the tub under the window
    mb(0, 0.012, 0, 2.2, 0.026, 2.55, UM.tile); mb(1.14, 0.012, 2.55, 2.2, 0.026, D, UM.tile);
    mb(0, 0, 0, 0.012, H, 2.55, UM.wtile); mb(2.188, 0, 0, 2.2, 1.2, D, UM.wtile); mb(2.18, 1.2, 0, 2.2, 1.215, D, UM.white);
    mb(0.012, 0, 0, 2.188, 0.5, 0.8, UM.tile, 0.5); mb(0.012, 0.5, 0, 2.188, 0.54, 0.81, UM.white, 0.4); mb(0.33, 0.5, 0.09, 1.9, 0.545, 0.71, UM.water);   // the tub, built in from wall to wall
    mb(0.14, 0.54, 0.36, 0.18, 0.8, 0.4, M.dark); mb(0.14, 0.76, 0.36, 0.36, 0.8, 0.4, M.dark);
    mb(1.15, 0.54, 0.79, 1.95, 2.0, 0.802, M.clear, 0, NC); mb(1.55, 2.1, 0.37, 2.188, 2.13, 0.41, M.dark); disc(0.12, 0.02, 1.55, 2.09, 0.39, M.dark);   // a pane of glass on its edge, the shower over it
    mb(0.012, 0.45, 1.05, 0.5, 0.82, 2.25, UM.oak, 0.5); mb(0.012, 0.82, 1.04, 0.52, 0.86, 2.26, UM.white, 0.4); mb(0.1, 0.86, 1.38, 0.44, 0.96, 1.92, UM.white, 0.3);   // the wash stand
    mb(0.03, 0.86, 1.635, 0.06, 1.14, 1.665, M.dark); mb(0.03, 1.11, 1.635, 0.2, 1.14, 1.665, M.dark);
    mb(0.012, 1.2, 1.12, 0.03, 2.05, 2.18, M.mirror, 0.4); mb(0.03, 2.1, 1.12, 0.07, 2.13, 2.18, M.glow, 0, NC);
    for (const [ya, yb, ta, tb] of [[1.17, 1.2, 1.09, 2.21], [2.05, 2.08, 1.09, 2.21], [1.2, 2.05, 1.09, 1.12], [1.2, 2.05, 2.18, 2.21]]) mb(0.012, ya, ta, 0.036, yb, tb, M.dark);   // its frame
    mb(0.62, 0.026, 0.98, 1.5, 0.04, 1.52, UM.sand, 0.3);                                           // a mat before the tub
    mb(1.95, 0.54, 0.2, 2.15, 0.62, 0.56, UM.linen, 0.3); mb(1.96, 0.62, 0.22, 2.14, 0.68, 0.54, UM.throw, 0.3); disc(0.05, 0.16, 0.2, 0.62, 0.62, M.dark);   // towels on its edge, a vase
    mb(2.05, 0, 0.92, 2.188, 1.2, 1.58, UM.wtile, 0.4); mb(1.55, 0.14, 1.07, 2.05, 0.42, 1.43, UM.white, 0.4); mb(2.04, 0.94, 1.17, 2.05, 1.05, 1.33, M.dark);   // the WC before its wall
    for (const t of [1.8, 2.27]) mb(2.155, 0.6, t, 2.185, 1.75, t + 0.03, M.dark);                 // a ladder for the towels
    for (let y = 0.7; y < 1.7; y += 0.2) mb(2.16, y, 1.8, 2.18, y + 0.025, 2.3, M.dark);
    mb(2.11, 1.02, 1.86, 2.16, 1.62, 2.24, UM.linen, 0.3);
    for (const [ls, lt] of [[1.1, 0.95], [1.1, 1.95], [1.67, 3.2]]) disc(0.06, 0.012, ls, H - 0.006, lt, M.glow, NC);
  }

  if (plan === 'A') {
    // the hall behind the door is two storeys high, a stair on its west wall, a gallery round it upstairs.
    // East of it, under the gallery, the sitting room. Behind both, kitchen and table.
    // 1: kitchen on the east wall. 2: the table at the street, the sofa at the garden. 3: a chimney wall between
    // sitting room and table, open to both. 4: no island, a long table along the wall.
    upper(3.1, -6.0, 5.76, -0.4); upper(0.24, -12.0, 5.76, -6.0);
    accentW(-6.0, -1.3); bench();
    rail(3.1, -6.0, 3.1, -1.3); rail(1.2, -6.0, 3.1, -6.0); rail(0.24, -1.3, 3.1, -1.3);
    flight('z', -1.9, -1, 17, 0.25, 0.26, 1.16, st.stair, 1.1475);
    // upstairs: the landing behind the stair, a store room at its end, the two rooms at the garden
    suite('W', 'rear', true);
    bookWall(frame('E', 5.76, -0.7), 5.0, L1, CEIL - 0.1);
    // a large framed drawing over the foot of the stair (clear of whoever walks up it), three lamps in the height of the hall
    art(frame('W', 0.262, -1.75), 1.2, 4.95, 2.4, 1.5, st.art);
    [[1.75, -2.9], [2.15, -3.6], [1.9, -4.25]].forEach(([x, z], k) => pend(x, lampY(k), z, CEIL, st.lamp));
    // under the gallery
    if (V === 2) { dining(3.9, -4.9, 4.9, -2.7, st.dining); art(frame('E', 5.76, -2.8), 1.0, 2.15, 2.0, 1.2, (st.art + 1) % 3); }
    else {
      sitting('E', V === 3 ? -2.9 : -3.25, 2.4, (st.art + 1) % 3); armchair(frame('N', -0.84, 3.5));
      A(5.38, G0, -2.62, 5.42, 1.86, -2.58, M.steel, 0); G(new THREE.SphereGeometry(0.13, 14, 10).translate(X(5.4), 1.95, -2.6), M.glow, 0, NC);
    }
    A(3.3, SL - 0.012, -5.4, 3.38, SL, -1.0, M.glow, 0, NC);
    if (V === 3) {
      A(3.7, G0, -6.25, 5.76, SL, -5.85, M.accent);
      A(4.2, G0 + 0.3, -5.85, 5.3, G0 + 1.0, -5.835, M.basalt, 0); A(4.35, G0 + 0.34, -5.835, 5.15, G0 + 0.6, -5.828, M.glow, 0, NC);
      A(4.2, G0 + 0.3, -6.265, 5.3, G0 + 1.0, -6.25, M.basalt, 0); A(4.35, G0 + 0.34, -6.272, 5.15, G0 + 0.6, -6.265, M.glow, 0, NC);
    }
    // kitchen and table
    if (V === 1) {
      accentW(-11.9, -6.05, G0, SL);
      kitchenRun(frame('E', 5.76, -6.4), 5.1, st.kitchen); island(3.78, -9.3, 4.62, -6.9, 'x-', st.island);
      sideboard(frame('W', 0.24, -6.5), 2.2); dining(1.05, -11.5, 2.05, -9.3, st.dining);
    } else {
      accentE(-11.9, -6.05);
      kitchenRun(frame('W', 0.24, -6.4), 5.1, st.kitchen);
      if (V !== 4) island(1.38, -9.3, 2.22, -6.9, 'x+', st.island);
      if (V === 2) { sitting('E', -7.6); armchair(frame('S', -11.5, 3.7)); }
      else if (V === 4) tafel('E', -11.3, -6.9);
      else { sideboard(frame('E', 5.76, -6.5), 2.2); dining(3.95, -11.5, 4.95, -9.3, st.dining); }
    }
  } else if (plan === 'B') {
    // low at the street, high at the garden: the kitchen behind the street window, the stair up the west wall through
    // a slot, the table in the middle, and at the back a living room two storeys high with a gallery looking into it.
    // 1: the fire on the east wall, the sofa opposite. 2: a counter instead of the island, a round table.
    // 3: only a strip at the garden is two storeys high (a light well), a studio over the living room.
    // 4: the sofa in the middle of the house, the high room at the garden is the dining hall.
    const edge = V === 3 ? -10.3 : -8.6;
    upper(1.28, edge, 5.76, -0.4); upper(0.24, -3.0, 1.28, -1.3); upper(0.24, edge, 1.28, -6.5);
    accentW(-6.5, -2.3);
    flight('z', -2.4, -1, 17, 0.25, 0.26, 1.16, st.stair, 1.1475);
    rail(0.24, edge, 5.76, edge); rail(1.28, -6.5, 1.28, -4.43);
    // upstairs: the gallery over the living room, the two rooms at the street. A chair on the gallery, to read in
    suite('W', 'street', false);
    armchair(frame('E', 5.72, -5.0), L1); A(5.5, L1, -4.75, 5.54, L1 + 1.5, -4.71, M.steel, 0); G(new THREE.SphereGeometry(0.12, 14, 10).translate(X(5.52), L1 + 1.6, -4.73), M.glow, 0, NC);
    if (V === 3) { A(2.2, L1, -10.1, 3.8, L1 + 0.74, -9.5, M.wood, 0.5); A(2.15, L1 + 0.74, -10.15, 3.85, L1 + 0.78, -9.45, M.stone, 0.4); }
    // the kitchen: a run on the east wall, an island (or a counter) before it
    bench(5.1);
    kitchenRun(frame('E', 5.76, -0.9), 4.2, st.kitchen, 0, 1.0);
    if (V === 2) island(3.3, -4.95, 5.1, -4.25, 'z-', 1); else island(3.3, -4.5, 4.14, -2.1, 'x-', st.island);
    wardrobe(frame('W', 0.24, -6.7), 1.8, 2.3, G0); plant(0.75, -5.7, 1.3);
    // the middle of the house and the garden room
    if (V === 4) {
      sitting('E', -5.6);
      dining(4.0, -11.4, 5.0, -9.2, st.dining === 1 ? 0 : st.dining, CEIL);
      chimney('W', -11.2, -9.7); armchair(frame('S', -11.6, 1.5)); plant(0.8, -9.25, 2.3);
    } else {
      const e = V === 1;
      dining(3.75, -8.1, 4.75, -5.9, V === 2 ? 1 : st.dining);
      if (V === 3) chimney('W', -11.7, -10.4); else chimney(e ? 'E' : 'W', -11.2, -9.7);
      sitting(e ? 'W' : 'E', -9.15);
      armchair(frame('S', -11.6, e ? 3.9 : 1.5)); plant(e ? 5.2 : 0.8, -9.25, 2.3);
      (V === 3 ? [[3.0, -11.0], [3.6, -11.35], [2.5, -11.4]] : e ? [[3.0, -10.1], [2.45, -10.7], [3.4, -10.9]] : [[3.0, -10.1], [3.55, -10.7], [2.6, -10.9]]).forEach(([x, z], k) => pend(x, lampY(k), z, CEIL, st.lamp));
    }
    // a high window over the garden glass
    A(1.3, 3.9, -12.02, 4.7, 3.96, -11.94, M.dark); A(1.3, 5.84, -12.02, 4.7, 5.9, -11.94, M.dark); A(1.3, 3.9, -12.02, 1.36, 5.9, -11.94, M.dark); A(4.64, 3.9, -12.02, 4.7, 5.9, -11.94, M.dark); A(2.97, 3.96, -12.02, 3.03, 5.84, -11.94, M.dark);
    A(1.36, 3.96, -11.99, 4.64, 5.84, -11.975, M.clear, 0, NC);
  } else if (plan === 'C') {
    // every room one storey high. The stair stands across the house, a stepped cupboard with a screen of slats: the
    // living room in front of it, the kitchen with the long table behind it, a passage along the west wall.
    // 1: an island in the kitchen, the table at the garden. 2: books along the whole wall of the living room.
    // 3: the stair climbs the other way, the passage runs along the east wall. 4: a study at the street window.
    const rev = V === 3, n = 16, go = 0.22, rise = (L1 - G0) / n;
    upper(3.1, -5.55, 5.76, -0.4); upper(0.24, -5.55, 3.1, -1.3); upper(0.24, -12.0, 5.76, -6.65);
    if (rev) upper(3.7, -6.65, 5.76, -5.55); else upper(0.24, -6.65, 2.3, -5.55);
    for (let i = 0; i < n; i++) {
      const y = G0 + (i + 1) * rise, d = rev ? -1 : 1, xa = (rev ? 4.4 : 1.6) + d * i * go, xb = i === n - 1 ? (rev ? 0.24 : 5.76) : xa + d * go;
      A(xa, G0, -6.6, xb, y - 0.04, -5.6, M.wood, 0.5); A(xa - d * 0.02, y - 0.04, -6.6, xb, y, -5.6, M.wood2, 0.4);
      if (i < n - 1) for (const k of [0.05, 0.16]) A(xa + d * k, y, -5.6, xa + d * (k + 0.035), SL, -5.555, M.wood2, 0.3);   // the slats
    }
    if (rev) { A(0.24, G0, -6.72, 4.4, SL, -6.6, M.wall); A(4.4, G0, -5.6, 4.44, SL, -5.555, M.wood2, 0.3); rail(1.1, -5.55, 3.7, -5.55); rail(3.7, -6.65, 3.7, -5.55); }
    else { A(1.6, G0, -6.72, 5.76, SL, -6.6, M.wall); A(1.56, G0, -5.6, 1.6, SL, -5.555, M.wood2, 0.3); rail(2.3, -5.55, 4.9, -5.55); rail(2.3, -6.65, 2.3, -5.55); }   // the wall behind the stair: the kitchen stands against it
    // upstairs: a corridor before the stair, the two rooms at the street; at the garden two children's rooms behind their doors
    part('x', -6.7, 0.24, 5.76, rev ? [[0.28, 1.05], [4.3, 5.2]] : [[0.8, 1.7], [4.95, 5.72]]); part('z', 3.0, -12.0, -6.75);
    suite(rev ? 'W' : 'E', 'street', true);
    bed(frame('W', 0.24, -8.0), 1.2); bed(frame('E', 5.76, -8.0), 1.2);
    // a long picture on their wall, over the stair: the corridor looks at it; another one at the foot of the stair
    art(frame('S', -6.65, 0), rev ? 2.7 : 3.3, L1 + 1.5, 1.9, 1.0, (st.art + 2) % 3);
    if (rev) art(frame('E', 5.76, -5.55), 0.55, 1.95, 0.9, 1.2, st.art); else art(frame('W', 0.24, -5.55), 0.55, 1.95, 0.9, 1.2, st.art);
    // the living room
    if (V === 4) {
      A(3.05, G0, -3.2, 3.15, SL, -1.2, M.wall); part('x', -3.2, 3.15, 5.76, [[3.4, 4.3, false]], G0, SL);
      bench(); chair(4.5, -1.15, 'z+'); bookWall(frame('E', 5.76, -0.8), 2.2, G0, SL - 0.05, 53);
      accentE(-5.5, -3.3); sitting('E', -3.4, 2.0); pend(4.2, 2.3, -4.4, SL, st.lamp);
    } else if (V === 2) {
      bench(5.4); bookWall(frame('E', 5.76, -0.7), 4.6, G0, SL - 0.05, 53);
      A(3.2, G0, -5.0, 5.3, G0 + 0.018, -1.9, M.rug, 0.4); sofa(frame('W', 3.3, -2.2), 2.4, st.sofa); coffee(4.75, -3.4, st.coffee);
      armchair(frame('N', -0.84, 3.5)); pend(4.75, 2.3, -3.4, SL, st.lamp);
    } else if (rev) {
      bench(); accentW(-5.5, -2.5, G0, SL); sitting('W', -2.7); armchair(frame('N', -0.84, 3.5)); pend(1.8, 2.3, -3.9, SL, st.lamp);
      art(frame('E', 5.76, -3.3), 0.75, 2.05, 1.5, 1.1, (st.art + 1) % 3);
    } else { bench(); accentE(-5.5, -0.5); sitting('E', -2.6); armchair(frame('N', -0.84, 3.5)); pend(4.2, 2.3, -3.8, SL, st.lamp); }
    if (rev) stove(5.38, -2.4, -1); else { stove(0.62, -3.6, 1); art(frame('W', 0.24, -1.6), 0.45, 1.9, 0.7, 0.9, (st.art + 1) % 3); }
    plant(rev ? 2.6 : 3.6, -5.2, 1.5);
    // the kitchen
    if (rev) { kitchenRun(frame('N', -6.72, 0.25), 4.0, st.kitchen); sideboard(frame('E', 5.76, -9.0), 2.4, 0.5); dining(1.3, -10.3, 3.5, -9.3, st.dining === 1 ? 0 : st.dining); plant(0.75, -11.6, 1.9); }
    else {
      kitchenRun(frame('N', -6.72, 1.75), 4.0, st.kitchen); sideboard(frame('W', 0.24, -9.0), 2.4, 0.5); plant(0.75, -11.65, 1.9);
      if (V === 1) { island(2.7, -9.1, 5.0, -8.3, null, st.island); dining(3.95, -11.5, 4.95, -9.6, st.dining); }
      else dining(2.6, -10.3, 4.8, -9.3, st.dining === 1 ? 0 : st.dining);
    }
  } else {
    // high at the street, low at the garden: the living room two storeys high with a wall of books, a study over the
    // entrance looking down into it, a solid stair at the east wall that climbs towards the street.
    // 1: a chimney two storeys high instead of the books. 2: the hall takes the whole width of the house (no study).
    // 3: the long table stands in the high hall, the sofa at the garden. 4: a wall of glass in front of a garden room.
    const big = V === 2;
    if (!big) upper(0.24, -5.2, 3.1, -1.3);
    upper(0.24, -12.0, 4.72, -5.2); upper(4.72, -5.9, 5.76, -5.2); upper(4.72, -12.0, 5.76, -9.1);
    flight('z', -10.0, 1, 17, 0.25, 4.84, 5.74, 2, 4.8525);
    if (big) { rail(0.24, -5.2, 5.76, -5.2); rail(0.24, -1.3, 3.1, -1.3); rail(3.1, -1.3, 3.1, -0.4); }
    else {
      rail(3.1, -5.2, 3.1, -0.4); rail(3.1, -5.2, 5.76, -5.2);
      A(2.2, L1, -3.6, 2.95, L1 + 0.74, -1.9, M.wood, 0.5); A(2.15, L1 + 0.74, -3.65, 3.0, L1 + 0.78, -1.85, M.stone, 0.4);   // the study over the entrance: a desk at the guard
    }
    // upstairs: a landing open to the hall, the two rooms at the garden
    part('z', 4.72, -9.1, -6.3); rail(4.72, -6.3, 4.72, -5.9); part('x', -9.1, 4.72, 5.76);
    suite('E', 'rear', false);
    // the hall at the street: books up to the roof and a ladder, or a chimney
    if (V === 1) { chimney('E', -3.9, -2.3, CEIL, 0.25); art(frame('E', 5.2, -2.5), 0.6, 3.4, 1.0, 1.4, st.art); bookWall(frame('E', 5.76, -0.7), 1.5, G0, G0 + 1.45, 37); bookWall(frame('E', 5.76, -4.0), 1.0, G0, G0 + 1.45, 41); }
    else {
      bookWall(frame('E', 5.76, -0.7), 4.3, G0, CEIL - 0.1, 37);
      A(5.36, G0, -2.42, 5.4, 5.6, -2.38, M.steel, 0.3); A(5.36, G0, -2.92, 5.4, 5.6, -2.88, M.steel, 0.3);
      for (let y = G0 + 0.3; y < 5.5; y += 0.3) A(5.37, y, -2.9, 5.39, y + 0.025, -2.4, M.steel, 0);
    }
    if (V === 3) dining(3.95, -4.6, 4.95, -2.4, st.dining, CEIL);
    else {
      A(3.2, G0, -4.7, 5.3, G0 + 0.018, -1.6, M.rug, 0.4);
      sofa(frame('W', 3.3, -2.0), 2.4, st.sofa); coffee(V === 1 ? 4.55 : 4.75, -3.2, st.coffee);
      (big ? [[2.5, -3.0], [3.5, -3.7], [4.5, -3.1]] : [[4.6, -2.8], [4.9, -3.4], [4.4, -3.7]]).forEach(([x, z], k) => pend(x, lampY(k) - 0.3, z, CEIL, st.lamp));
    }
    armchair(frame('N', -0.84, 3.6));
    // the entrance: a wall of cupboards, the special wall beside it
    accentW(-5.2, -1.3, G0, big ? CEIL : SL); wardrobe(frame('W', 0.262, -2.7), 2.3, 2.3, G0);
    // under the upper floor
    if (V === 3) {
      kitchenRun(frame('W', 0.24, -5.6), 3.4, st.kitchen, 0.9, 0); island(1.38, -8.5, 2.22, -6.3, 'x+', st.island);
      sitting('W', -9.3, 2.3); armchair(frame('S', -11.6, 3.6));
    } else {
      const cut = V === 4;
      kitchenRun(frame('W', 0.24, -6.4), cut ? 3.1 : 5.1, st.kitchen, 0.9, cut ? 0 : 1.0); island(1.38, cut ? -9.0 : -9.3, 2.22, -6.9, 'x+', st.island);
      if (cut) {                // steel and glass from wall to stair, open in the middle
        A(0.24, SL - 0.06, -9.63, 4.84, SL, -9.57, M.dark);
        for (const x of [0.24, 2.0, 3.9, 4.78]) A(x, G0, -9.63, x + 0.06, SL - 0.06, -9.57, M.dark);
        A(0.3, G0 + 2.2, -9.625, 2.0, G0 + 2.24, -9.575, M.dark); A(3.96, G0 + 2.2, -9.625, 4.78, G0 + 2.24, -9.575, M.dark);
        A(0.3, G0, -9.606, 2.0, SL - 0.06, -9.594, M.clear, 0, NC); A(3.96, G0, -9.606, 4.78, SL - 0.06, -9.594, M.clear, 0, NC);
        plant(0.8, -11.3, 1.8);
      }
      // the table at the garden with a bench on the glass side
      A(3.3, G0 + 0.72, -11.5, 4.7, G0 + 0.78, -10.7, st.dining === 2 ? M.stone : M.wood2, 0.7); A(3.42, G0, -11.2, 3.52, G0 + 0.72, -11.0, M.wood2); A(4.48, G0, -11.2, 4.58, G0 + 0.72, -11.0, M.wood2);
      A(3.3, G0, -11.86, 4.7, G0 + 0.44, -11.56, M.wood, 0.5); A(3.32, G0 + 0.44, -11.84, 4.68, G0 + 0.49, -11.58, M.white, 0.3);
      chair(3.65, -10.46, 'z-'); chair(4.35, -10.46, 'z-');
      pend(3.65, G0 + 1.7, -11.1, SL, st.lamp); pend(4.35, G0 + 1.86, -11.1, SL, st.lamp);
    }
    art(frame('E', 5.76, -10.2), 0.95, 2.0, 1.2, 0.9, st.art);
  }

  for (const w of ['street', 'rear']) if (w !== suiteWall) lining(w, w === 'street' ? street : rear);

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
  A(0.24, 0.0, -14.4, 5.76, G0 - 0.02, -12.3, M.paving); A(0.0, 0.0, -12.3, 6.0, G0 - 0.02, -12.08, M.paving);   // (between the garden walls, not in them)
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

  return { gDoorL, gDoorR, plan, variant: V, fit, M, inn };
}
