// The houses of one project of the Dortmund map. The project comes from the map's own data
// (/threejs-demos/dortmund/js/projects.json): its architecture, its rows, every house with its state.
// One row is on the sheet at a time. Every house can be picked, from its tag above the roof, from the keys at
// the top or by a click on its facade, and every house can be walked into. Free is green, sold is red.
//
//   ?id=emscher-gaerten   the project      ?zeile=2   the row (1...)      ?haus=14   a house, by its number
import { createStage, run, THREE, Q, span, ease, smooth, lerp, CONVENTION } from '../engine/elevation.js';

const FALLBACK = { id: '', name: 'Kreidegasse', district: 'Musterreihe', type: 'Stadthäuser', arch: 'Fünf Häuser aus Ziegel, zwei Geschosse, jedes unter einem Dach aus Zink.',
  style: { variants: [{ par: 7.0, first: 'frame', brick: '0xe0dbcf' }, { par: 6.7, first: 'bay', setback: -0.3 }] },
  rows: [{ name: 'Zeile', houses: ['Verkauft', 'Frei', 'Verkauft', 'Verkauft', 'Frei'].map((s, i) => ({ no: '0' + (i + 1), status: s, rooms: 4 + (i % 2), area: 112 + i * 4, price: s === 'Frei' ? '498.000 €' : '' })) }] };
const list = await fetch('/threejs-demos/dortmund/js/projects.json').then((r) => r.json()).catch(() => []);
const PR = list.find((x) => x.id === Q.get('id')) || list[0] || FALLBACK;
const hex = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, typeof v === 'string' && v.startsWith('0x') ? parseInt(v, 16) : v]));
const ST = PR.style || {}, BASE = hex(ST.base), VAR = (ST.variants || [{}]).map(hex);
const all = PR.rows.flatMap((r) => r.houses);
const wantNo = Q.get('haus') ? String(parseInt(Q.get('haus'), 10)).padStart(2, '0') : null;
let rowIx = PR.rows.findIndex((r) => r.houses.some((h) => h.no === wantNo));
if (rowIx < 0) rowIx = Math.max(0, Math.min(PR.rows.length - 1, (parseInt(Q.get('zeile') || '1', 10) || 1) - 1));
const ROW = PR.rows[rowIx], HOUSES = ROW.houses, N = HOUSES.length;
const free = (h) => h.status === 'Frei';
const cls = (h) => (free(h) ? 'frei' : 'verkauft');
const FREE = HOUSES.filter(free);
const WORD = ['Kein', 'Ein', 'Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs', 'Sieben', 'Acht'];

// ---- the row: where every house stands. Semi-detached pairs have a gap with two garages between them.
const GROUP = ST.group || 0, GAP = ST.gap || 0, OPEN = !!(GROUP || ST.open);
const xOf = (i) => i * 6 + (GROUP ? Math.floor(i / GROUP) * GAP : 0);
const LEN = xOf(N - 1) + 6, MID = LEN / 2;

const S = createStage({ hatch: 0.18, hatchPhone: 0.24, drawSpan: [-2, LEN + 9], drawDir: [1, 0.9], wipe: [-10, Math.max(26, LEN - 4)], soft: 1.6 });
const houses = HOUSES.map((h, i) => {
  const first = GROUP ? i % GROUP === 0 : i === 0, last = GROUP ? i % GROUP === GROUP - 1 : i === N - 1;
  return S.house(xOf(i), { ...BASE, ...VAR[i % VAR.length], ...(i % 2 ? { door: 'right' } : {}), interior: true, sideL: OPEN && first, sideR: OPEN && last });
});
if (!OPEN) {                                   // a street in town: the neighbours stand on, drawn faintly
  S.house(-6, { faint: true, par: 7.6, roof: 'none', first: 'frame', brick: 0xd9d3c7 });
  S.house(LEN, { faint: true, par: 7.6, roof: 'none', first: 'frame', brick: 0xd9d3c7 });
}
if (ST.garage && GROUP) {                      // two garages in every gap, one for each neighbour
  const wall = S.mat(BASE.wall || 'brick', { color: BASE.brick }), door = S.mat('steel', { color: 0x8d8a84 }), cope = S.mat('stone');
  for (let k = 1; k * GROUP < N; k++) {
    const g0 = xOf(k * GROUP) - GAP;
    for (const [a, b] of [[g0 + 0.12, g0 + GAP / 2 - 0.04], [g0 + GAP / 2 + 0.04, g0 + GAP - 0.12]]) {
      S.add(S.box(a, 0, -6.6, b, 2.7, -0.7), wall, 1.2);
      S.add(S.box(a - 0.04, 2.7, -6.64, b + 0.04, 2.78, -0.66), cope, 0.8);
      S.add(S.box(a + 0.25, 0.02, -0.74, b - 0.25, 2.2, -0.68), door, 0.8);
      const seg = []; for (let y = 0.57; y < 2.1; y += 0.55) seg.push(a + 0.25, y, -0.675, b - 0.25, y, -0.675);
      S.lines(seg, 0.6);
    }
  }
}
S.street(-60, LEN + 50);
S.figure(8.2, 2.0, 1, false); if (LEN > 24) { S.figure(LEN - 9.4, 2.3, 1, true); S.figure(LEN - 8.9, 2.1, 0.94, true); }
S.tree(LEN + (OPEN ? 3.4 : 2.6), 2.6, 6.6, 1.9); if (OPEN) S.tree(-3.6, 2.4, 5.8, 1.7);
S.aimSun(MID, 4, Math.max(30, LEN));

// ---- which house
let sel = Math.max(0, HOUSES.findIndex((h) => h.no === wantNo));
if (!wantNo) sel = Math.max(0, HOUSES.findIndex(free));
let pNow = 0, KEYS = [];
const P = { choose: [286, 340], approach: 372, entry: 448, hall: 523, turn: 603, kitchen: 688, end: 704 };
function keysFor(i) {
  const H = houses[i], cx = xOf(i) + 3, wide = LEN + 4;
  return [
    { p: 0, t: [MID, 6.6, 0], fh: 21.5, minW: wide + 3, fov: 2, phone: { t: [MID, 2, 0], minW: wide + 1 } },
    { p: 18, t: [MID, 6.6, 0], fh: 21.5, minW: wide + 3, fov: 2, phone: { t: [MID, 2, 0], minW: wide + 1 } },
    { p: 110, t: [MID - 1, 4.2, 0], fh: 12.6, fov: 14, yaw: 22, pitch: -4, phone: { t: [MID + 3, 4.2, 0], minW: 14, yaw: 28 } },
    { p: 252, t: [MID - 1.5, 4.0, 0], fh: 12.0, fov: 16, yaw: 16, pitch: -4, phone: { t: [MID, 4, 0], minW: 13 } },
    // the row faces you: every door in the picture, to choose
    { p: P.choose[0], t: [MID, 3.9, 0], fh: 13.5, minW: wide, fov: 18, yaw: 0, pitch: -3, phone: { t: [MID, 3.4, 0], minW: wide - 2.5 } },
    { p: P.choose[1], t: [MID, 3.9, 0], fh: 13.5, minW: wide, fov: 18, yaw: 0, pitch: -3, phone: { t: [MID, 3.4, 0], minW: wide - 2.5 } },
    { p: P.approach, t: [cx, 3.6, -0.3], fh: 9.6, fov: 28, yaw: 0, pitch: -4, phone: { minW: 7.6 } },
    H.key(P.entry, [1.78, 1.72, 1.55], 2, -1, 54, 2.65),
    H.key(P.hall, [1.72, 1.96, -2.35], -8, -9, 56, 2.2),
    H.key(P.turn, [2.0, 1.94, -3.1], -46, -1, 58, 2.35),
    H.key(P.kitchen, [2.75, 2.0, -6.5], -3, 0, 58, 2.5),
  ];
}

// ---- the page around the row
const $ = (id) => document.getElementById(id);
const here = (extra) => `?${PR.id ? 'id=' + encodeURIComponent(PR.id) + '&' : ''}${extra}`;
for (const id of ['markName', 'kickName', 'tbName', 'ldName']) $(id).textContent = PR.name;
$('markSub').textContent = `${PR.type} · ${PR.district}${PR.rows.length > 1 ? ' · ' + ROW.name : ''}`;
document.title = `${PR.name} · Die Häuser · Wohnungsfinder`;
if (PR.id) $('backLink').href = `/threejs-demos/dortmund/?p=${encodeURIComponent(PR.id)}`;
$('h1a').textContent = `${WORD[N] || N} Haustüren.`;
$('h1b').innerHTML = FREE.length ? `${WORD[FREE.length] || FREE.length} noch <em>frei.</em>` : 'Alle <em>verkauft.</em>';
if (PR.rows.length > 1) {
  const nav = $('rows'); nav.hidden = false;
  PR.rows.forEach((r, k) => {
    const a = nav.appendChild(document.createElement('a')); a.href = here('zeile=' + (k + 1));
    a.innerHTML = `${r.name} <small>${r.houses[0].no}–${r.houses[r.houses.length - 1].no} · ${r.houses.filter(free).length} frei</small>`;
    if (k === rowIx) a.setAttribute('aria-current', 'true');
  });
}

// tags above the roofs, and the keys at the top
const pins = $('pins'), chooser = $('chooser'), live = $('live');
const tags = HOUSES.map((h, i) => {
  const el = pins.appendChild(document.createElement('button'));
  el.type = 'button'; el.className = `plot ${cls(h)}`;
  el.innerHTML = `<b>${h.no}</b><span>${h.status}</span>`;
  el.setAttribute('aria-label', `Haus ${h.no}, ${h.status}. Ansehen`);
  el.addEventListener('click', () => choose(i, true));
  S.pin(el, [xOf(i) + 3, 10.3, 0], { tf: 'translateY(-100%)' });       // the tag stands above the roof, clear of the captions
  return el;
});
const keysEl = HOUSES.map((h, i) => {
  const b = chooser.appendChild(document.createElement('button'));
  b.type = 'button'; b.className = cls(h);
  b.innerHTML = `${h.no}<small>${h.status}</small>`;
  b.setAttribute('aria-label', `Haus ${h.no}, ${h.status}`);
  b.addEventListener('click', () => choose(i, true));
  return b;
});

const curtain = $('curtain');
let beatEls = [], radar = null;
function fill() {
  const h = HOUSES[sel], H = houses[sel];
  tags.forEach((t, i) => t.classList.toggle('on', i === sel));
  keysEl.forEach((b, i) => b.setAttribute('aria-pressed', String(i === sel)));
  if (radar) { radar.ox = xOf(sel); radar.mirrorX = !H.doorL; }
  const btn = document.querySelector('#cad-map .cm-btn[data-id="entry"]'); if (btn) btn.textContent = `HAUS ${h.no}`;
  const st = `<b class="st ${cls(h)}">${h.status}</b>`;
  const facts = `<div class="row"><div><span>Zimmer</span>${h.rooms}</div><div><span>Wohnfläche</span>${h.area} m²</div><div><span>Status</span>${st}</div></div>`;
  const others = FREE.filter((f) => f !== h).map((f) => `<button class="go" data-go="${HOUSES.indexOf(f)}">Haus ${f.no} ansehen</button>`).join('');
  if (beatEls[3]) beatEls[3].innerHTML = `<span class="n">04 &nbsp;·&nbsp; Haus ${h.no}</span><p>${free(h) ? `Haus ${h.no} ist <em>frei.</em> Zwei Steinstufen hinauf und durch die Glastür.` : `Haus ${h.no} ist verkauft. Ansehen können Sie es trotzdem: zwei Steinstufen hinauf und durch die Glastür.`}</p>${facts}`;
  if (beatEls[4]) beatEls[4].innerHTML = `<span class="n">05 &nbsp;·&nbsp; In Haus ${h.no}</span><p>Eine Halle über zwei Geschosse, eine Treppe aus gefaltetem Stahl, unter der Galerie der <em>Wohnraum.</em></p>`;
  if (beatEls[5]) beatEls[5].innerHTML = `<span class="n">06 &nbsp;·&nbsp; Küche zum Südgarten</span><p>Küche mit Essplatz. Die Glaswand öffnet sie über die ganze Breite zum ummauerten Garten.</p>`
    + `<div class="row"><div><span>Haus</span>${h.no} von ${String(all.length).padStart(2, '0')}</div><div><span>${free(h) ? 'Kaufpreis' : 'Garten'}</span>${free(h) ? h.price : 'Südlage'}</div><div><span>Status</span>${st}</div></div>`
    + (free(h) ? `<a class="pill solid" href="#">Haus ${h.no} reservieren</a>` : `<span class="pill sold">Verkauft</span><div>${others}</div>`);
  beatEls.forEach((el) => el && el.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => choose(+b.dataset.go, true))));
  live.textContent = `Haus ${h.no}, ${h.status}, ${h.rooms} Zimmer, ${h.area} Quadratmeter`;
}
// pick a house. From the street the lens simply goes to its door; from inside another house a sheet of paper
// closes the picture for a moment, so the change of house is a cut and not a flight through walls.
function choose(i, go) {
  if (!document.documentElement.classList.contains('done')) return;
  const inside = pNow > P.approach - 8;
  const swap = () => { sel = i; KEYS = keysFor(sel); fill(); S.touch(); };
  if (i === sel) { if (go && pNow < P.entry - 30) window.__jumpToP(P.entry); return; }
  if (!inside) { swap(); if (go) window.__jumpToP(P.entry); return; }
  curtain.classList.add('on');
  setTimeout(() => { swap(); if (pNow > P.entry + 30) window.scrollTo({ top: window.scrollY - (pNow - P.entry) * ($('track').offsetHeight / (P.end + 100)), behavior: 'instant' }); setTimeout(() => curtain.classList.remove('on'), 260); }, 300);
}
// a click on a facade picks that house
const ray = new THREE.Raycaster(), wall = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
let downX = 0, downY = 0;
addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; }, { passive: true });
addEventListener('click', (e) => {
  if (e.target instanceof Element && e.target.closest('button, a, #cad-map, .beat')) return;
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8 || pNow > P.approach + 10 || pNow < 20) return;
  ray.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), S.camera);
  if (!ray.ray.intersectPlane(wall, hit) || hit.y < -0.5 || hit.y > 10) return;
  const i = HOUSES.findIndex((_, k) => hit.x >= xOf(k) && hit.x < xOf(k) + 6);
  if (i >= 0) choose(i, true);
});

const LATE = new THREE.Vector3(-1.45, 0.62, 0.78).normalize();
const sunDir = new THREE.Vector3();
const late = new THREE.Color(0xffd9a8), white = new THREE.Color(0xfff1dc);
radar = {
  ox: xOf(sel), mirrorX: !houses[sel].doorL,
  zones: [
    { id: 'street', label: 'REIHE', tag: 'STRASSE 1:100', at: P.choose[0] + 10, u0: -4.0, u1: 0.0 },
    { id: 'entry', label: 'HAUS', tag: 'EINGANG', at: P.entry, u0: 0.0, u1: 1.3 },
    { id: 'hall', label: 'HALLE', tag: 'HALLE +0.30M', at: P.hall + 40, u0: 1.3, u1: 6.0 },
    { id: 'kitchen', label: 'KÜCHE', tag: 'KÜCHE +0.30M', at: P.kitchen, u0: 6.0, u1: 12.0 },
    { id: 'garden', label: 'GARTEN', tag: 'SÜDGARTEN', at: P.end - 4, u0: 12.0, u1: 17.8 },
  ],
};
KEYS = keysFor(sel);
const nos = (f) => HOUSES.filter(f).map((h) => h.no).join(' · ') || 'keines';

run(S, {
  length: P.end,
  heroOut: [14, 64],
  radar,
  frame(p) {
    pNow = p;
    S.setCam(S.camAt(p, KEYS));
    pins.style.opacity = (1 - span(p, P.approach - 14, P.approach + 22)).toFixed(3);
    pins.style.pointerEvents = p > P.approach + 10 ? 'none' : '';
    S.U.uDepthCue.value = span(p, 22, 95) * (1 - span(p, 160, 230));
    // one sun crossing the facades, at the drawing's angle
    const u = span(p, 118, 255);
    S.U.uSweep.value.z = u <= 0 ? -60 : u >= 1 ? 60 + LEN : lerp(-12, Math.max(28, LEN - 2), smooth(u));
    const m = ease(span(p, 262, P.approach));
    sunDir.copy(CONVENTION).lerp(LATE, m).normalize();
    S.setSun(sunDir);
    S.sun.color.copy(white).lerp(late, m);
    S.sun.intensity = lerp(3.2, 3.0, m);
    const d = smooth(span(p, P.entry - 40, P.entry + 30)), g = smooth(span(p, P.turn + 5, P.kitchen - 5));
    houses.forEach((H, i) => { H.setDoor(i === sel ? d : 0); H.setGardenDoor(i === sel ? g : 0); });
  },
  beats: [
    { from: 62, to: 122, html: `<span class="n">01 &nbsp;·&nbsp; ${PR.name}</span><p>${PR.arch}</p>` },
    { from: 128, to: 252, html: '<span class="n">02 &nbsp;·&nbsp; Eine Sonne</span><p>Die Schatten der Zeichnung fallen unter 45 Grad. Die Sonne kommt im selben Winkel, <em>Haus für Haus.</em></p>' },
    { from: 268, to: P.choose[1] + 14, html: `<span class="n">03 &nbsp;·&nbsp; Welches Haus?</span><p>${WORD[N - FREE.length] || N - FREE.length} ${N - FREE.length === 1 ? 'ist' : 'sind'} <b class="st verkauft">verkauft</b>, ${(WORD[FREE.length] || String(FREE.length)).toLowerCase()} ${FREE.length === 1 ? 'ist' : 'sind'} <b class="st frei">frei</b>. Tippen Sie ein Haus an, oder scrollen Sie weiter.</p><div class="row"><div><span>Verkauft</span>${nos((h) => !free(h))}</div><div><span>Frei</span>${nos(free)}</div><div><span>${ST.roofName ? 'Dach' : 'Häuser'}</span>${ST.roofName || N}</div></div>` },
    { from: P.approach + 8, to: P.entry + 28, html: '' },
    { from: P.entry + 44, to: P.turn - 6, html: '' },
    { from: P.turn + 10, to: P.end + 40, html: '' },
  ],
});
beatEls = [...document.querySelectorAll('#beats .beat')];
fill();
window.__haeuser = { get sel() { return sel; }, choose, P, get p() { return pNow; }, PR, ROW };
