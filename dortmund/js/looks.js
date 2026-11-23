// What makes one house of a project look different from its neighbour: the tone and the make of its wall, its door,
// its window frames, its roof. The lists stand in projects.json (style.looks). The houses page and the small models
// on the map both read them here, so both show the same house.
//   k: the place of the house in its project, counted through all rows from 0
const hx = (v) => (typeof v === 'string' ? parseInt(v, 16) : v);
const pick = (list, n) => (list && list.length ? list[((n % list.length) + list.length) % list.length] : undefined);

export function lookFor(project, k) {
  const L = (project.style || {}).looks, o = {};
  if (!L) return o;
  if (L.tints) {                       // a tone and a finish, combined so that no two houses share both
    const nt = L.tints.length, t = pick(L.textures, k + Math.floor(k / nt));
    o.brick = hx(L.tints[k % nt]);
    if (t) { o.wallTx = t.tx; o.wallName = t.name; }
  }
  const w = pick(L.walls, k);
  if (w) { o.brick = hx(w.brick); o.wallTx = w.tx; o.wallName = w.name; }
  const d = pick(L.doors, k), f = pick(L.frames, k + Math.floor(k / 3)), r = pick(L.roofs, k), h = pick(L.headers, k);
  if (d != null) o.doorColor = hx(d);
  if (f != null) o.frame = hx(f);
  if (h != null) o.header = hx(h);
  if (r) { if (r.roofColor != null) o.roofColor = hx(r.roofColor); if (r.roofTx) o.roofTx = r.roofTx; }
  return o;
}
