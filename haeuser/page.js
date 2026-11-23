// The houses of one project of the Dortmund map. The project comes from the map's own data
// (../dortmund/js/projects.json): its architecture, its rows, every house with its state.
// One row is on the sheet at a time. Every house can be picked, from its tag above the roof, from the keys at
// the top or by a click on its facade. Free is green, sold is red. A free house can be walked into: it has its own
// plan, its own fit-out and its own data sheet. A sold house keeps its door shut.
//
//   ?id=emscher-gaerten   the project      ?zeile=2   the row (1...)      ?haus=14   a house, by its number
import { createStage, run, THREE, Q, span, ease, smooth, lerp, CONVENTION, PLANS, fitFor, FLOORS, WOODS, STONES } from '../engine/elevation.js';
import { lookFor } from '../dortmund/js/looks.js';

const mark = (n) => performance.mark('wf:' + n);            // where the start-up time goes (see performance.getEntriesByType('mark'))
mark('module');
const FALLBACK = { id: '', name: 'Kreidegasse', district: 'Musterreihe', type: 'Stadthäuser', arch: 'Fünf Häuser aus Ziegel, zwei Geschosse, jedes unter einem Dach aus Zink.', ready: '',
  style: { variants: [{ par: 7.0, first: 'frame', brick: '0xe0dbcf' }, { par: 6.7, first: 'bay', setback: -0.3 }] },
  rows: [{ name: 'Zeile', houses: ['Verkauft', 'Frei', 'Verkauft', 'Verkauft', 'Frei'].map((s, i) => ({ no: '0' + (i + 1), status: s, rooms: 4 + (i % 2), area: 112 + i * 4, price: s === 'Frei' ? '498.000 €' : '' })) }] };
const list = await fetch(new URL('../dortmund/js/projects.json', import.meta.url)).then((r) => r.json()).catch(() => []);
mark('data');
const PR = list.find((x) => x.id === Q.get('id')) || list[0] || FALLBACK;
const hex = (o) => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, typeof v === 'string' && v.startsWith('0x') ? parseInt(v, 16) : v]));
const ST = PR.style || {}, BASE = hex(ST.base), VAR = (ST.variants || [{}]).map(hex);
const all = PR.rows.flatMap((r) => r.houses);
const wantNo = Q.get('haus') ? String(parseInt(Q.get('haus'), 10)).padStart(2, '0') : null;
let rowIx = PR.rows.findIndex((r) => r.houses.some((h) => h.no === wantNo));
if (rowIx < 0) rowIx = Math.max(0, Math.min(PR.rows.length - 1, (parseInt(Q.get('zeile') || '1', 10) || 1) - 1));
const ROW = PR.rows[rowIx], HOUSES = ROW.houses, N = HOUSES.length;
const K0 = PR.rows.slice(0, rowIx).reduce((n, r) => n + r.houses.length, 0);      // the place of this row's first house in the project
const free = (h) => h.status === 'Frei';
const cls = (h) => (free(h) ? 'frei' : 'verkauft');
const FREE = HOUSES.filter(free);
const WORD = ['Kein', 'Ein', 'Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs', 'Sieben', 'Acht'];
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---- the row: where every house stands. Semi-detached pairs have a gap with two garages between them.
const GROUP = ST.group || 0, GAP = ST.gap || 0, OPEN = !!(GROUP || ST.open);
const xOf = (i) => i * 6 + (GROUP ? Math.floor(i / GROUP) * GAP : 0);
const LEN = xOf(N - 1) + 6, MID = LEN / 2;
const nearestFree = (i) => HOUSES.map((h, k) => k).filter((k) => free(HOUSES[k])).sort((a, b) => Math.abs(a - i) - Math.abs(b - i))[0] ?? -1;

// which house: the one asked for, else the first free one. sel is the house the walk leads into (always a free one),
// focus the house that was picked last (a sold one can be looked at from the street, not from inside)
let focus = HOUSES.findIndex((h) => h.no === wantNo);
if (focus < 0) focus = Math.max(0, HOUSES.findIndex(free));
let sel = nearestFree(focus);
const WALK = sel >= 0;

const S = createStage({ hatch: 0.18, hatchPhone: 0.24, drawSpan: [-2, LEN + 9], drawDir: [1, 0.9], wipe: [-10, Math.max(26, LEN - 4)], soft: 1.6 });
mark('stage');
const forcePlan = (Q.get('plan') || '').toUpperCase(), forceFit = Q.has('fit') ? parseInt(Q.get('fit'), 10) : null;      // for trying things out
const looks = HOUSES.map((h, i) => lookFor(PR, K0 + i));
const houses = HOUSES.map((h, i) => {
  const first = GROUP ? i % GROUP === 0 : i === 0, last = GROUP ? i % GROUP === GROUP - 1 : i === N - 1;
  const { wallName, ...look } = looks[i];
  const plan = PLANS[forcePlan] ? forcePlan : PLANS[h.plan] ? h.plan : 'ABCD'[(K0 + i) % 4];
  return S.house(xOf(i), { ...BASE, ...VAR[i % VAR.length], ...look, ...(i % 2 ? { door: 'right' } : {}),
    interior: free(h) ? (i === sel ? true : 'later') : false,              // the rooms of the other free houses are built once the page stands
    plan, fit: free(h) ? fitFor(forceFit ?? h.fit ?? K0 + i + 1, plan) : undefined, sideL: OPEN && first, sideR: OPEN && last });
});
if (!OPEN) {                                   // a street in town: the neighbours stand on, drawn faintly
  S.house(-6, { faint: true, par: 7.6, roof: 'none', first: 'frame', brick: 0xd9d3c7 });
  S.house(LEN, { faint: true, par: 7.6, roof: 'none', first: 'frame', brick: 0xd9d3c7 });
}
if (ST.garage && GROUP) {                      // two garages in every gap, one for each neighbour
  const door = S.mat('steel', { color: 0x8d8a84 }), cope = S.mat('stone');
  for (let k = 1; k * GROUP < N; k++) {
    const g0 = xOf(k * GROUP) - GAP;
    [[g0 + 0.12, g0 + GAP / 2 - 0.04, k * GROUP - 1], [g0 + GAP / 2 + 0.04, g0 + GAP - 0.12, k * GROUP]].forEach(([a, b, of]) => {
      S.add(S.box(a, 0, -6.6, b, 2.7, -0.7), S.mat(BASE.wall || 'brick', { color: looks[of].brick ?? BASE.brick, tx: looks[of].wallTx }), 1.2);   // in the wall of the house it belongs to
      S.add(S.box(a - 0.04, 2.7, -6.64, b + 0.04, 2.78, -0.66), cope, 0.8);
      S.add(S.box(a + 0.25, 0.02, -0.74, b - 0.25, 2.2, -0.68), door, 0.8);
      const seg = []; for (let y = 0.57; y < 2.1; y += 0.55) seg.push(a + 0.25, y, -0.675, b - 0.25, y, -0.675);
      S.lines(seg, 0.6);
    });
  }
}
S.street(-60, LEN + 50);
S.figure(8.2, 2.0, 1, false); if (LEN > 24) { S.figure(LEN - 9.4, 2.3, 1, true); S.figure(LEN - 8.9, 2.1, 0.94, true); }
S.tree(LEN + (OPEN ? 3.4 : 2.6), 2.6, 6.6, 1.9); if (OPEN) S.tree(-3.6, 2.4, 5.8, 1.7);
S.aimSun(MID, 4, Math.max(30, LEN));

mark('built');
let pNow = 0, KEYS = [];
const P = { choose: [286, 340], approach: 372, entry: 448, hall: 523, turn: 603, rear: 688, glass: 760, garden: 830, end: WALK ? 846 : 352 };
function keysFor(i) {
  const wide = LEN + 4;
  const street = [
    { p: 0, t: [MID, 6.6, 0], fh: 21.5, minW: wide + 3, fov: 2, phone: { t: [MID, 2, 0], minW: wide + 1 } },
    { p: 18, t: [MID, 6.6, 0], fh: 21.5, minW: wide + 3, fov: 2, phone: { t: [MID, 2, 0], minW: wide + 1 } },
    { p: 110, t: [MID - 1, 4.2, 0], fh: 12.6, fov: 14, yaw: 22, pitch: -4, phone: { t: [MID + 3, 4.2, 0], minW: 14, yaw: 28 } },
    { p: 252, t: [MID - 1.5, 4.0, 0], fh: 12.0, fov: 16, yaw: 16, pitch: -4, phone: { t: [MID, 4, 0], minW: 13 } },
    // the row faces you: every door in the picture, to choose
    { p: P.choose[0], t: [MID, 3.9, 0], fh: 13.5, minW: wide, fov: 18, yaw: 0, pitch: -3, phone: { t: [MID, 3.4, 0], minW: wide - 2.5 } },
    { p: P.choose[1], t: [MID, 3.9, 0], fh: 13.5, minW: wide, fov: 18, yaw: 0, pitch: -3, phone: { t: [MID, 3.4, 0], minW: wide - 2.5 } },
  ];
  if (i < 0) return street;
  // into the house: every plan has its own way through its rooms (PLANS[...].tour), written from where the lens stands
  const H = houses[i], T = PLANS[H.plan].tour, k = (p, s) => H.key(p, s[0], s[1], s[2], s[3], s[4]);
  return [...street,
    { p: P.approach, t: [xOf(i) + 3, 3.6, -0.3], fh: 9.6, fov: 28, yaw: 0, pitch: -4, phone: { minW: 7.6 } },
    H.key(P.entry, [1.78, 1.72, 1.55], 2, -1, 54, 2.65),
    k(P.hall, T.hall), k(P.turn, T.turn), k(P.rear, T.rear), k(P.glass, T.glass), k(P.garden, T.garden)];
}

// ---- the page around the row
const here = (extra) => `?${PR.id ? 'id=' + encodeURIComponent(PR.id) + '&' : ''}${extra}`;
for (const id of ['markName', 'kickName', 'tbName', 'ldName']) $(id).textContent = PR.name;
$('markSub').textContent = `${PR.type} · ${PR.district}${PR.rows.length > 1 ? ' · ' + ROW.name : ''}`;
document.title = `${PR.name} · Die Häuser · Wohnungsfinder`;
if (PR.id) $('backLink').href = `../dortmund/?p=${encodeURIComponent(PR.id)}`;
$('h1a').textContent = `${WORD[N] || N} Haustüren.`;
$('h1b').innerHTML = FREE.length ? `${WORD[FREE.length] || FREE.length} noch <em>frei.</em>` : 'Alle <em>verkauft.</em>';
if (PR.rows.length > 1) {
  const nav = $('rows'); nav.hidden = false;
  PR.rows.forEach((r, k) => {
    const a = nav.appendChild(document.createElement('a')); a.href = here('zeile=' + (k + 1));
    a.innerHTML = `${esc(r.name)} <small>${r.houses[0].no}–${r.houses[r.houses.length - 1].no} · ${r.houses.filter(free).length} frei</small>`;
    if (k === rowIx) a.setAttribute('aria-current', 'true');
  });
}

// tags above the roofs, and the keys at the top
const pins = $('pins'), chooser = $('chooser'), live = $('live');
const tags = HOUSES.map((h, i) => {
  const el = pins.appendChild(document.createElement('button'));
  el.type = 'button'; el.className = `plot ${cls(h)}`;
  el.innerHTML = `<b>${h.no}</b><span>${h.status}</span>`;
  el.setAttribute('aria-label', `Haus ${h.no}, ${h.status}. ${free(h) ? 'Betreten' : 'Nicht zu besichtigen'}`);
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

/* ---------- what a house is: rooms and their sizes, price, plot ---------- */
const euro = (n) => Math.round(n).toLocaleString('de-DE') + ' €';
const priceOf = (h) => (h.price ? parseInt(h.price.replace(/\D/g, ''), 10) : 0);
const PLOT = Math.round(6 * 17.8 + (GROUP ? (GAP / 2) * 17.8 : 0));
const m2 = (a) => a.toFixed(1).replace('.', ',') + ' m²';
// the rooms of the two storeys as they are built, and what the roof holds: together the living area of the data
function schedule(i) {
  const h = HOUSES[i], pl = PLANS[houses[i].plan], ar = (r) => (r[3] - r[1]) * (r[4] - r[2]);
  let eg = pl.rooms.eg.map((r) => [r[0], ar(r)]), og = pl.rooms.og.map((r) => [r[0], ar(r)]);
  const sum = [...eg, ...og].reduce((a, r) => a + r[1], 0), rest = h.area - sum;
  const count = [...eg, ...og].filter((r) => /^(Wohnen|Schlafen|Kind|Arbeiten|Galerie)/.test(r[0])).length, need = h.rooms - count;
  let dg = [];
  if (rest >= 6) dg = [[(BASE.roof === 'none' ? 'Dachstudio an der Terrasse' : BASE.roof === 'mono' ? 'Empore unter dem Pultdach' : need >= 2 ? 'Zwei Zimmer' : need === 1 ? 'Studio' : 'Dachraum, ausgebaut'), rest]];
  else { const f = h.area / sum; eg = eg.map(([n, a]) => [n, a * f]); og = og.map(([n, a]) => [n, a * f]); }
  return { eg, og, dg };
}

/* ---------- cards, the little plan, the data sheet: everything that names the house ---------- */
const curtain = $('curtain'), note = $('note');
let beatEls = [], radar = null;
const stHtml = (h) => `<b class="st ${cls(h)}">${h.status}</b>`;
function fill() {
  tags.forEach((t, i) => { t.classList.toggle('on', i === sel); t.classList.toggle('look', i === focus && i !== sel); });
  keysEl.forEach((b, i) => { b.setAttribute('aria-pressed', String(i === sel)); b.classList.toggle('look', i === focus && i !== sel); });
  if (sel >= 0) {
    const h = HOUSES[sel], H = houses[sel], pl = PLANS[H.plan], fit = H.fit;
    if (radar) {
      radar.ox = xOf(sel); radar.mirrorX = !H.doorL;
      radar.draw?.(pl.radar, { entry: [`HAUS ${h.no}`, 'EINGANG'], hall: [pl.zones[0], `${pl.zones[0]} +0.30M`], kitchen: [pl.zones[1], `${pl.zones[1]} +0.30M`] });
    }
    const facts = `<div class="row"><div><span>Zimmer</span>${h.rooms}</div><div><span>Wohnfläche</span>${h.area} m²</div><div><span>Grundriss</span>${pl.name}</div></div>`;
    if (beatEls[3]) beatEls[3].innerHTML = `<span class="n">04 &nbsp;·&nbsp; Haus ${h.no}</span><p>Haus ${h.no} ist <em>frei.</em> Zwei Steinstufen hinauf und durch die Glastür.</p>${facts}`;
    if (beatEls[4]) beatEls[4].innerHTML = `<span class="n">05 &nbsp;·&nbsp; In Haus ${h.no}</span><p>${pl.text[0]}</p><div class="row"><div><span>Boden</span>${fit.list[0][1]}</div><div><span>Einbauten</span>${fit.list[1][1]}</div><div><span>Treppe</span>${fit.list[3][1]}</div></div>`;
    if (beatEls[5]) beatEls[5].innerHTML = `<span class="n">06 &nbsp;·&nbsp; Zum Garten</span><p>${pl.text[1]}</p><div class="row"><div><span>Arbeitsplatte</span>${fit.list[2][1]}</div><div><span>Akzentwand</span>${fit.list[4][1]}</div><div><span>Beschläge</span>${fit.list[5][1]}</div></div>`;
    if (beatEls[6]) beatEls[6].innerHTML = `<span class="n">07 &nbsp;·&nbsp; Haus ${h.no} · ${PR.name}</span><p>Die Glaswand fährt auf: ein ummauerter Garten nach Süden, ${PLOT} m² <em>Grundstück.</em></p>`
      + `<div class="row"><div><span>Haus</span>${h.no} von ${String(all.length).padStart(2, '0')}</div><div><span>Kaufpreis</span>${h.price || 'auf Anfrage'}</div><div><span>Status</span>${stHtml(h)}</div></div>`
      + `<button class="pill solid" type="button" data-act="ask">Besichtigung anfragen</button> <button class="pill" type="button" data-act="sheet">Exposé</button>`;
    fillKit();
  }
  if (!$('sheet').hidden) fillSheet();
  placeRooms();
  const f = HOUSES[focus];
  live.textContent = `Haus ${f.no}, ${f.status}, ${f.rooms} Zimmer, ${f.area} Quadratmeter`;
}
// a sold house: say so, and offer the free ones
function soldNote(i) {
  const h = HOUSES[i];
  note.innerHTML = `<b>Haus ${h.no} ist verkauft.</b> ${FREE.length ? 'Zu besichtigen sind die freien Häuser:' : 'In dieser Zeile ist kein Haus mehr frei.'} `
    + FREE.map((f) => `<button type="button" data-go="${HOUSES.indexOf(f)}">Haus ${f.no}</button>`).join(' ') + '<button type="button" class="x" data-x aria-label="Schließen">✕</button>';
  note.hidden = false;
  clearTimeout(soldNote.t); soldNote.t = setTimeout(() => { note.hidden = true; }, 9000);
}
note.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  note.hidden = true;
  if (b.dataset.go) choose(+b.dataset.go, true);
});
// pick a house. From the street the lens simply goes to its door; from inside another house a sheet of paper
// closes the picture for a moment, so the change of house is a cut and not a flight through walls.
function choose(i, go) {
  if (!document.documentElement.classList.contains('done')) return;
  focus = i;
  const u = new URL(location.href); u.searchParams.set('haus', String(parseInt(HOUSES[i].no, 10))); history.replaceState(null, '', u);
  if (!free(HOUSES[i])) { fill(); soldNote(i); return; }
  note.hidden = true;
  const inside = pNow > P.approach - 8;
  const swap = () => { houses[i].rooms(); lookY = lookP = 0; sel = i; KEYS = keysFor(sel); fill(); S.touch(); };
  if (i === sel) { fill(); if (go && pNow < P.entry - 30) window.__jumpToP(P.entry); return; }
  if (!inside) { swap(); if (go) window.__jumpToP(P.entry); return; }
  curtain.classList.add('on');
  setTimeout(() => { swap(); if (pNow > P.entry + 30) window.scrollTo({ top: window.scrollY - (pNow - P.entry) * ($('track').offsetHeight / (P.end + 100)), behavior: 'instant' }); setTimeout(() => curtain.classList.remove('on'), 260); }, 300);
}
// a click on a facade picks that house
const ray = new THREE.Raycaster(), wall = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3(), ndc = new THREE.Vector2();
let downX = 0, downY = 0;
addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; }, { passive: true });
addEventListener('click', (e) => {
  if (e.target instanceof Element && e.target.closest('button, a, input, select, textarea, label, #cad-map, .beat, .panel, .modal, .note')) return;
  if (mode || Math.hypot(e.clientX - downX, e.clientY - downY) > 8 || pNow > P.approach + 10 || pNow < 20) return;
  ray.setFromCamera(ndc.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), S.camera);
  if (!ray.ray.intersectPlane(wall, hit) || hit.y < -0.5 || hit.y > 10) return;
  const i = HOUSES.findIndex((_, k) => hit.x >= xOf(k) && hit.x < xOf(k) + 6);
  if (i >= 0) choose(i, true);
});
$('beats').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act], [data-go]'); if (!b) return;
  if (b.dataset.go) choose(+b.dataset.go, true);
  else if (b.dataset.act === 'ask') openAsk(sel);
  else if (b.dataset.act === 'sheet') openPanel('sheet');
});

/* ---------- the tools: sun, storeys, the building site, finishes, looking around ---------- */
// mode: '' the walk, 'eg' / 'og' a plan (the house cut at the height of a storey, seen from above), 'bau' the row as it is built
let sunHour = null, mode = '', modeP = 0, lookY = 0, lookP = 0, lookAtP = 0, bauStep = 4;
const D2R = Math.PI / 180, CUT = { eg: 2.92, og: 6.02 };
const TOP = Math.max(...houses.map((H) => H.PAR)) + (BASE.roof === 'none' ? 1.2 : 3.6);
const BAU = [['Bodenplatte', 0.34], ['Rohbau Erdgeschoss', 3.14], ['Rohbau Obergeschoss', 6.24], ['Dach', TOP - 1.6], ['Schlüsselfertig', Infinity]];
const BAU_NOW = [0, 0, 2, 3, 4, 4][(PR.build || {}).phase ?? 5];              // where the site stands today, as a step of the slider
const BAU_KEY = [{ p: 0, t: [MID, 2.6, -5.2], fh: 16, minW: LEN + 12, fov: 22, yaw: 30, pitch: 31, phone: { minW: LEN + 5, yaw: 24 } }];
const inWalk = (p) => !mode && p > P.entry + 4;
function lens(p) {
  if (mode && Math.abs(p - modeP) > 9) setMode('');           // scrolling on leaves the plan
  houses.forEach((H, i) => { if (H.walkable) H.show(mode === 'bau' ? true : (mode || inWalk(p)) ? i === sel : true); });   // inside a house only its own rooms are drawn
  if (mode === 'eg' || mode === 'og') {
    // a plan: the house cut at the height of a storey, seen straight from above, street at the bottom
    S.cut(CUT[mode], true); S.camera.up.set(0, 0, -1);
    S.setCam({ t: [xOf(Math.max(0, sel)) + 3, CUT[mode], -6.4], fh: Math.max(21.5, 9 / (innerWidth / innerHeight)), fov: 16, yaw: 0, pitch: 89.9 });
    return;
  }
  S.camera.up.set(0, 1, 0);
  if (mode === 'bau') { S.cut(BAU[bauStep][1], false); S.setCam(S.camAt(0, BAU_KEY)); return; }
  S.cut();
  const c = S.camAt(p, KEYS);
  if (Math.abs(p - lookAtP) > 3) { lookY *= 0.86; lookP *= 0.86; if (Math.abs(lookY) + Math.abs(lookP) < 0.2) lookY = lookP = 0; else S.touch(); }
  if (lookY || lookP) {
    // look around from where the lens stands: the place stays, only the direction turns (and never through a wall)
    const d = (c.fh / 2) / Math.tan(c.fov * D2R / 2), cy = Math.cos(c.pitch * D2R);
    const pos = [c.t[0] + Math.sin(c.yaw * D2R) * cy * d, c.t[1] + Math.sin(c.pitch * D2R) * d, c.t[2] + Math.cos(c.yaw * D2R) * cy * d];
    S.setCam(S.viewKey(0, pos, c.yaw + lookY, Math.max(-38, Math.min(30, c.pitch + lookP)), c.fov, c.fh));
  } else S.setCam(c);
}
{
  let drag = null;
  addEventListener('pointerdown', (e) => { if (!(e.target instanceof Element && e.target.closest('button, a, input, select, textarea, label, #cad-map, .beat, .panel, .modal, .note'))) drag = { x: e.clientX, y: e.clientY }; }, { passive: true });
  addEventListener('pointermove', (e) => {
    if (!drag || mode || sel < 0 || pNow < P.entry - 12) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
    lookY = Math.max(-75, Math.min(75, lookY + dx * 0.16)); if (e.pointerType === 'mouse') lookP = Math.max(-28, Math.min(28, lookP - dy * 0.12));
    lookAtP = pNow; S.touch();
  }, { passive: true });
  const end = () => { drag = null; }; addEventListener('pointerup', end, { passive: true }); addEventListener('pointercancel', end, { passive: true });
}
// the two panels: tools and data sheet. One is open at a time.
function openPanel(id) {
  for (const k of ['kit', 'sheet']) { const on = k === id && $(k).hidden; if (k !== id || !on) { $(k).hidden = true; $(k + 'Btn').setAttribute('aria-expanded', 'false'); } if (on) { $(k).hidden = false; $(k + 'Btn').setAttribute('aria-expanded', 'true'); if (k === 'sheet') fillSheet(); } }
}
$('kitBtn').addEventListener('click', () => openPanel('kit'));
$('sheetBtn').addEventListener('click', () => openPanel('sheet'));
document.querySelectorAll('.panel .x').forEach((b) => b.addEventListener('click', () => openPanel('')));
$('sun').addEventListener('input', (e) => {
  sunHour = +e.target.value; const h = Math.floor(sunHour), mi = Math.round((sunHour - h) * 60);
  $('sunLabel').textContent = `${h}:${String(mi).padStart(2, '0')} Uhr`;
  if (pNow < 262) window.__jumpToP(P.choose[0] + 12);            // the sun only shines on the built house
  S.touch();
});
$('floors').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setMode(b.dataset.f); });
function setMode(f) {
  if ((f === 'eg' || f === 'og') && sel < 0) f = '';
  mode = f; lookY = lookP = 0;
  [...$('floors').children].forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.f === f)));
  $('bauBox').hidden = mode !== 'bau';
  if (mode && pNow < 262) { window.__jumpToP(P.choose[0] + 12); modeP = P.choose[0] + 12; } else modeP = pNow;
  if (mode === 'bau') { bauStep = BAU_NOW; $('bau').value = bauStep; bauLabel(); }
  document.documentElement.classList.toggle('plan', !!mode); document.documentElement.dataset.mode = mode;
  placeRooms(); S.touch();
}
function bauLabel() { $('bauLabel').textContent = BAU[bauStep][0] + (bauStep === BAU_NOW && PR.build ? ' · Stand heute' : ''); }
$('bau').addEventListener('input', (e) => { bauStep = +e.target.value; bauLabel(); S.touch(); });
// the names of the rooms, in the plan
const roomEls = Array.from({ length: 6 }, () => { const el = $('rooms3d').appendChild(document.createElement('div')); el.className = 'room'; S.pin(el, [0, 0, 0], { tf: 'translate(-50%, -50%)' }); el.__pin.off = true; el.hidden = true; return el; });
function placeRooms() {
  const on = (mode === 'eg' || mode === 'og') && sel >= 0;
  const rooms = on ? PLANS[houses[sel].plan].rooms[mode] : [], sc = on ? schedule(sel)[mode] : [];
  roomEls.forEach((el, k) => {
    const r = rooms[k]; el.hidden = !r; el.__pin.off = !r; el.__pin.tfNow = '';
    if (!r) return;
    el.innerHTML = `<b>${r[0]}</b>${m2(sc[k][1])}`;
    el.__pin.p.set(...houses[sel].at((r[1] + r[3]) / 2, CUT[mode], (r[2] + r[4]) / 2));
  });
}
// finishes: the floor, the joinery and the stone of the house you are in can be changed while you look
const ROLES = [['mFloor', 'floor', FLOORS], ['mWood', 'wood', WOODS], ['mStone', 'stone', STONES]];
const chosen = new Map();                       // house -> { floor, wood, stone }: what was picked there
function fillKit() {
  const H = houses[sel]; if (!H) return;
  const fit = H.fit, mine = chosen.get(sel) || {};
  ROLES.forEach(([id, role, LIST]) => {
    const own = fit[role], opts = [own, ...LIST.filter((d) => d[2] !== own[2]).slice(fit.n % 3, fit.n % 3 + 3)];
    $(id).innerHTML = '';
    opts.forEach((d) => {
      const b = $(id).appendChild(document.createElement('button')); b.type = 'button';
      b.innerHTML = `<i class="sw" style="background:#${(d[1].color ?? 0xefebe2).toString(16).padStart(6, '0')}"></i>${d[2]}`;
      b.setAttribute('aria-pressed', String((mine[role] || own) === d));
      b.addEventListener('click', () => { H.rooms(); H.swap(role, d); chosen.set(sel, { ...(chosen.get(sel) || {}), [role]: d }); [...$(id).children].forEach((x) => x.setAttribute('aria-pressed', String(x === b))); if (!$('sheet').hidden) fillSheet(); });
    });
  });
}

/* ---------- the data sheet of a house (Exposé): figures, rooms, fit-out, building, progress, a loan sum ---------- */
const PHASES = ['Planung & Genehmigung', 'Erdarbeiten & Bodenplatte', 'Rohbau', 'Dach & Fenster', 'Innenausbau', 'Übergabe'];
const calc = { ek: 20, zins: 3.6, tilg: 2.0 };
function rate(price) { const loan = price * (1 - calc.ek / 100); return { loan, month: loan * (calc.zins + calc.tilg) / 100 / 12, own: price * calc.ek / 100, extra: price * 0.085 }; }
function sheetBody(i, print = false) {
  const h = HOUSES[i], ok = free(h), H = houses[i], pl = PLANS[H.plan], sc = ok ? schedule(i) : null, price = priceOf(h), b = PR.build, sp = PR.spec;
  const mine = chosen.get(i) || {}, fl = ok ? H.fit.list.map(([k, v], n) => [k, (n === 0 && mine.floor?.[2]) || (n === 1 && mine.wood?.[2]) || (n === 2 && mine.stone?.[2]) || v]) : [];
  const dl = (rows) => `<dl>${rows.filter(Boolean).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
  const roomList = (t, rs) => (rs.length ? `<h4>${t}</h4>${dl(rs.map(([n, a]) => [n, m2(a)]))}` : '');
  let s = `<div class="sh-head"><span class="no">${h.no}</span><div><h2>Haus ${h.no}</h2><p>${esc(PR.name)} · ${esc(PR.district)}${PR.rows.length > 1 ? ' · ' + esc(ROW.name) : ''}</p></div>${stHtml(h)}</div>`;
  s += dl([['Bauform', esc(PR.type)], ['Zimmer', h.rooms], ['Wohnfläche', `${h.area} m²`], ['Grundstück', `ca. ${PLOT} m²`], ok && ['Kaufpreis', `<b>${h.price}</b>`], ok && price ? ['je m² Wohnfläche', euro(price / h.area)] : null, PR.ready && ['Fertigstellung', esc(PR.ready)], ['Fassade', esc(looks[i].wallName || ST.wallName || '')], ST.roofName && ['Dach', esc(ST.roofName)]]);
  if (!ok) return s + `<p class="hintline">Dieses Haus ist verkauft und nicht mehr zu besichtigen.</p>` + (FREE.length ? `<div class="acts">${FREE.map((f) => `<button class="pill" type="button" data-go="${HOUSES.indexOf(f)}">Haus ${f.no} ansehen</button>`).join('')}</div>` : '');
  s += `<h3>Grundriss „${pl.name}“</h3><p class="lead">${pl.claim}.</p>${roomList('Erdgeschoss', sc.eg)}${roomList('Obergeschoss', sc.og)}${roomList('Dachgeschoss', sc.dg)}`;
  s += `<h3>Ausstattung</h3>${dl(fl)}`;
  if (sp) s += `<h3>Bau &amp; Technik</h3>${dl([['Bauweise', esc(sp.bauweise)], ['Energie', esc(sp.energie)], ['Heizung', esc(sp.heizung)]])}<ul class="ticks">${sp.extras.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;
  if (b) s += `<h3>Baufortschritt</h3><div class="prog"><i style="width:${b.pct}%"></i></div><p class="lead"><b>${b.pct} %</b> · ${esc(b.note)}. Als Nächstes: ${esc(b.next)}.</p><ol class="phases">${PHASES.map((n, k) => `<li class="${k < b.phase ? 'done' : k === b.phase ? 'now' : ''}">${n}</li>`).join('')}</ol>`;
  if (price) {
    const r = rate(price);
    s += `<h3>Finanzierung, überschlagen</h3>` + (print ? '' : `<div class="calc">
      <label>Eigenkapital <b id="cEkV">${calc.ek} %</b><input type="range" id="cEk" min="10" max="60" step="5" value="${calc.ek}"></label>
      <label>Sollzins <b id="cZiV">${calc.zins.toFixed(1).replace('.', ',')} %</b><input type="range" id="cZi" min="2" max="6" step="0.1" value="${calc.zins}"></label>
      <label>Tilgung <b id="cTiV">${calc.tilg.toFixed(1).replace('.', ',')} %</b><input type="range" id="cTi" min="1" max="5" step="0.5" value="${calc.tilg}"></label></div>`)
      + `<div id="cOut">${dl([['Eigenkapital', `${calc.ek} % · ${euro(r.own)}`], ['Darlehen', euro(r.loan)], ['Sollzins / Tilgung', `${calc.zins.toFixed(1).replace('.', ',')} % / ${calc.tilg.toFixed(1).replace('.', ',')} %`], ['Monatsrate', `<b>${euro(r.month)}</b>`], ['Kaufnebenkosten, ca. 8,5 %', euro(r.extra)]])}</div><p class="hintline">Unverbindliche Beispielrechnung, keine Finanzierungszusage.</p>`;
  }
  if (!print) s += `<div class="acts"><button class="pill solid" type="button" data-act="ask">Besichtigung anfragen</button><button class="pill" type="button" data-act="print">Exposé drucken</button><button class="pill" type="button" data-act="link">Link kopieren</button></div>`;
  return s + `<p class="hintline">Portfolio-Demo: Projekt, Preise und Daten sind erfunden.</p>`;
}
function fillSheet() {
  const body = $('sheetBody'), top = body.scrollTop;
  body.innerHTML = sheetBody(focus); body.scrollTop = top;
}
$('sheetBody').addEventListener('input', (e) => {
  const id = e.target.id; if (!/^c(Ek|Zi|Ti)$/.test(id)) return;
  calc.ek = +$('cEk').value; calc.zins = +$('cZi').value; calc.tilg = +$('cTi').value;
  $('cEkV').textContent = calc.ek + ' %'; $('cZiV').textContent = calc.zins.toFixed(1).replace('.', ',') + ' %'; $('cTiV').textContent = calc.tilg.toFixed(1).replace('.', ',') + ' %';
  const r = rate(priceOf(HOUSES[focus])), dd = $('cOut').querySelectorAll('dd');
  dd[0].textContent = `${calc.ek} % · ${euro(r.own)}`; dd[1].textContent = euro(r.loan); dd[2].textContent = `${calc.zins.toFixed(1).replace('.', ',')} % / ${calc.tilg.toFixed(1).replace('.', ',')} %`; dd[3].innerHTML = `<b>${euro(r.month)}</b>`;
});
$('sheetBody').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act], [data-go]'); if (!b) return;
  if (b.dataset.go) return choose(+b.dataset.go, true);
  if (b.dataset.act === 'ask') openAsk(focus);
  else if (b.dataset.act === 'print') printSheet();
  else if (b.dataset.act === 'link') {
    const u = new URL(location.href); u.search = here(`haus=${parseInt(HOUSES[focus].no, 10)}&at=310`);
    const done = () => { b.textContent = 'Link kopiert'; setTimeout(() => { b.textContent = 'Link kopieren'; }, 1800); };
    (navigator.clipboard?.writeText(u.href) || Promise.reject()).then(done, () => { prompt('Link zu diesem Haus:', u.href); });
  }
});
// the data sheet on paper: the picture as it stands now, and the sheet without its controls
function printSheet() {
  S.render();
  let img = ''; try { img = S.renderer.domElement.toDataURL('image/jpeg', 0.86); } catch (e) {}
  $('print').innerHTML = `<header><b>WOHNUNGSFINDER DORTMUND</b><span>Exposé · ${esc(PR.name)} · Haus ${HOUSES[focus].no}</span></header>${img ? `<img src="${img}" alt="">` : ''}<div class="cols">${sheetBody(focus, true)}</div>`;
  setTimeout(() => window.print(), 60);
}

/* ---------- the enquiry: a form that checks what is entered. A demo: nothing is sent or stored ---------- */
const ask = $('ask'), form = $('askForm');
function openAsk(i) {
  const k = i >= 0 ? i : focus;
  $('askHouse').innerHTML = HOUSES.filter(free).map((h) => `<option value="${h.no}"${HOUSES[k] === h ? ' selected' : ''}>Haus ${h.no} · ${h.rooms} Zimmer · ${h.area} m² · ${h.price}</option>`).join('') + '<option value="">Allgemeine Anfrage zum Projekt</option>';
  if (!free(HOUSES[k])) $('askHouse').value = '';
  $('askTitle').textContent = `Anfrage · ${PR.name}`;
  form.hidden = false; $('askDone').hidden = true; ask.hidden = false;
  setTimeout(() => $('askName').focus(), 50);
}
const closeAsk = () => { ask.hidden = true; };
$('askBtn').addEventListener('click', () => openAsk(sel));
ask.addEventListener('click', (e) => { if (e.target === ask || e.target.closest('[data-close]')) closeAsk(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!ask.hidden) closeAsk(); else openPanel(''); note.hidden = true; } });
form.addEventListener('submit', (e) => {
  e.preventDefault();
  let ok = true;
  for (const el of form.querySelectorAll('[required]')) {
    const bad = el.type === 'checkbox' ? !el.checked : !el.value.trim() || (el.type === 'email' && !/^\S+@\S+\.\S+$/.test(el.value.trim()));
    el.closest('label').classList.toggle('bad', bad); if (bad && ok) { el.focus(); ok = false; }
  }
  if (!ok) return;
  const no = $('askHouse').value;
  $('askDone').innerHTML = `<h3>Vielen Dank, ${esc($('askName').value.trim())}.</h3><p>Ihre Anfrage „${esc($('askKind').selectedOptions[0].textContent)}“${no ? ` zu Haus ${no}` : ''} wäre jetzt beim Vertrieb. Wir würden uns innerhalb eines Werktags melden.</p><p class="hintline">Dies ist eine Portfolio-Demo: Es wurde nichts gesendet und nichts gespeichert.</p><button class="pill solid" type="button" data-close>Schließen</button>`;
  form.hidden = true; $('askDone').hidden = false; form.reset();
});

/* ---------- the walk ---------- */
const LATE = new THREE.Vector3(-1.45, 0.62, 0.78).normalize();
const sunDir = new THREE.Vector3();
const late = new THREE.Color(0xffd9a8), white = new THREE.Color(0xfff1dc);
radar = {
  ox: xOf(Math.max(0, sel)), mirrorX: sel >= 0 ? !houses[sel].doorL : false, plan: sel >= 0 ? PLANS[houses[sel].plan].radar : undefined,
  zones: [
    { id: 'street', label: 'REIHE', tag: 'STRASSE 1:100', at: P.choose[0] + 10, u0: -4.0, u1: 0.0 },
    { id: 'entry', label: 'HAUS', tag: 'EINGANG', at: Math.min(P.entry, P.end), u0: 0.0, u1: 1.3 },
    { id: 'hall', label: 'VORN', tag: 'VORN +0.30M', at: Math.min(P.hall + 40, P.end), u0: 1.3, u1: 6.0 },
    { id: 'kitchen', label: 'HINTEN', tag: 'HINTEN +0.30M', at: Math.min(P.rear, P.end), u0: 6.0, u1: 12.0 },
    { id: 'garden', label: 'GARTEN', tag: 'SÜDGARTEN', at: Math.min(P.garden, P.end), u0: 12.0, u1: 17.8 },
  ],
};
KEYS = keysFor(sel);
const nos = (f) => HOUSES.filter(f).map((h) => h.no).join(' · ') || 'keines';
const nSold = N - FREE.length;

run(S, {
  length: P.end,
  heroOut: [14, 64],
  radar,
  frame(p) {
    pNow = p;
    lens(p);
    pins.style.opacity = mode ? '0' : (1 - span(p, P.approach - 14, P.approach + 22)).toFixed(3);
    pins.style.pointerEvents = mode || p > P.approach + 10 ? 'none' : '';
    S.U.uDepthCue.value = span(p, 22, 95) * (1 - span(p, 160, 230));
    // one sun crossing the facades, at the drawing's angle
    const u = span(p, 118, 255);
    S.U.uSweep.value.z = u <= 0 ? -60 : u >= 1 ? 60 + LEN : lerp(-12, Math.max(28, LEN - 2), smooth(u));
    const m = ease(span(p, 262, P.approach));
    if (sunHour === null) {
      sunDir.copy(CONVENTION).lerp(LATE, m).normalize();
      S.sun.color.copy(white).lerp(late, m); S.sun.intensity = lerp(3.2, 3.0, m);
    } else {
      // the sun of the slider: up in the east, over the garden in the south at noon, down in the west
      const t = (sunHour - 5.5) / 15.5, a = Math.PI * t, up = Math.sin(a);
      sunDir.set(Math.cos(a) * 1.0, up * 0.95 + 0.1, -up * 0.95 + 0.3).normalize();
      S.sun.color.copy(late).lerp(white, Math.min(1, up * 1.5)); S.sun.intensity = lerp(2.3, 3.3, up);
    }
    S.setSun(sunDir);
    const d = mode ? 0 : smooth(span(p, P.entry - 40, P.entry + 30)), g = mode ? 0 : smooth(span(p, P.rear + 14, P.glass - 6));
    houses.forEach((H, i) => { if (H.walkable) { H.setDoor(i === sel ? d : 0); H.setGardenDoor(i === sel ? g : 0); } });
  },
  beats: [
    { from: 62, to: 122, html: `<span class="n">01 &nbsp;·&nbsp; ${esc(PR.name)}</span><p>${esc(PR.arch)}</p>` },
    { from: 128, to: 252, html: '<span class="n">02 &nbsp;·&nbsp; Eine Sonne</span><p>Die Schatten der Zeichnung fallen unter 45 Grad. Die Sonne kommt im selben Winkel, <em>Haus für Haus.</em></p>' },
    { from: 268, to: P.choose[1] + 14, html: `<span class="n">03 &nbsp;·&nbsp; Welches Haus?</span><p>${WORD[nSold] || nSold} ${nSold === 1 ? 'ist' : 'sind'} <b class="st verkauft">verkauft</b>, ${(WORD[FREE.length] || String(FREE.length)).toLowerCase()} ${FREE.length === 1 ? 'ist' : 'sind'} <b class="st frei">frei</b>. ${WALK ? 'Die freien Häuser lassen sich betreten: Tippen Sie eines an, oder scrollen Sie weiter.' : 'In dieser Zeile ist kein Haus mehr zu besichtigen.'}</p><div class="row"><div><span>Verkauft</span>${nos((h) => !free(h))}</div><div><span>Frei</span>${nos(free)}</div><div><span>${ST.roofName ? 'Dach' : 'Häuser'}</span>${ST.roofName || N}</div></div>` },
    ...(WALK ? [
      { from: P.approach + 8, to: P.entry + 28, html: '' },
      { from: P.entry + 44, to: P.turn + 34, html: '' },
      { from: P.turn + 50, to: P.glass + 10, html: '' },
      { from: P.glass + 26, to: P.end + 40, html: '' },
    ] : []),
  ],
});
mark('run');
// the rooms of the other free houses, one house at a time when the browser has nothing else to do
{
  const rest = houses.map((_, i) => i).filter((i) => i !== sel && houses[i].walkable).sort((a, b) => Math.abs(a - sel) - Math.abs(b - sel));
  const idle = window.requestIdleCallback ? (f) => requestIdleCallback(f, { timeout: 900 }) : (f) => setTimeout(f, 160);
  const more = () => { const i = rest.shift(); if (i === undefined) return; houses[i].rooms(); S.touch(); idle(more); };
  const wait = setInterval(() => { if (window.__ready) { clearInterval(wait); setTimeout(() => idle(more), 400); } }, 100);
}
beatEls = [...document.querySelectorAll('#beats .beat')];
fill();
if (wantNo && focus >= 0 && !free(HOUSES[focus])) { const w = setInterval(() => { if (document.documentElement.classList.contains('done')) { clearInterval(w); soldNote(focus); } }, 200); }
window.__haeuser = { get sel() { return sel; }, get focus() { return focus; }, get mode() { return mode; }, choose, setMode, openPanel, openAsk, P, get p() { return pNow; }, PR, ROW, S, houses };
