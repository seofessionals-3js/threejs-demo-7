// The houses. Five town houses in a row for one project of the Dortmund map. Every house can be picked, from its
// plot tag, from the keys at the top or by a click on its facade, and every house can be walked into:
// the street elevation drafts itself, turns to a view along the row, one sun crosses the five facades,
// the row faces you to choose, then the lens goes to the chosen door and through hall and kitchen to the garden.
// Three houses are sold (red), two are free (green).
import { createStage, run, THREE, Q, span, ease, smooth, lerp, CONVENTION } from '../engine/elevation.js';

const HOUSES = [
  { no: '01', status: 'Verkauft', rooms: 4, area: 112, price: '' },
  { no: '02', status: 'Frei', rooms: 5, area: 118, price: '498.000 €' },
  { no: '03', status: 'Verkauft', rooms: 4, area: 112, price: '' },
  { no: '04', status: 'Verkauft', rooms: 5, area: 124, price: '' },
  { no: '05', status: 'Frei', rooms: 5, area: 131, price: '529.000 €' },
];
const N = HOUSES.length, MID = N * 3;
const free = (h) => h.status === 'Frei';
const cls = (h) => (free(h) ? 'frei' : 'verkauft');
const FREE = HOUSES.filter(free);

const S = createStage({ hatch: 0.18, hatchPhone: 0.24, drawSpan: [-2, 39], drawDir: [1, 0.9], wipe: [-10, 26], soft: 1.6 });

// white brick with a bay, grey brick with a stone frame, turn and turn about. Every house has its rooms.
const houses = HOUSES.map((h, i) => S.house(i * 6, {
  ...(i % 2 ? { par: 6.7, door: 'right' } : { par: 7.0, first: 'frame', brick: 0xe0dbcf }),
  setback: i % 2 ? -0.3 : 0, interior: true,
}));
S.house(-6, { faint: true, par: 7.6, roof: 'none', first: 'frame', brick: 0xd9d3c7 });
S.house(N * 6, { faint: true, par: 7.6, roof: 'none', first: 'frame', brick: 0xd9d3c7 });
S.street(-60, 80);
S.figure(8.2, 2.0, 1, false); S.figure(20.6, 2.3, 1, true); S.figure(21.1, 2.1, 0.94, true);
S.tree(N * 6 + 2.6, 2.6, 6.6, 1.9);
S.aimSun(MID, 4, 30);

// ---- which house
let sel = Math.max(0, Math.min(N - 1, (parseInt(Q.get('haus') || '', 10) || (HOUSES.findIndex(free) + 1)) - 1));
let pNow = 0, KEYS = [];
const P = { choose: [286, 340], approach: 372, entry: 448, hall: 523, turn: 603, kitchen: 688, end: 704 };
function keysFor(i) {
  const H = houses[i], cx = i * 6 + 3;
  return [
    { p: 0, t: [MID, 6.6, 0], fh: 21.5, fov: 2, phone: { t: [MID, 2, 0], minW: 31 } },
    { p: 18, t: [MID, 6.6, 0], fh: 21.5, fov: 2, phone: { t: [MID, 2, 0], minW: 31 } },
    { p: 110, t: [MID - 1, 4.2, 0], fh: 12.6, fov: 14, yaw: 22, pitch: -4, phone: { t: [MID + 3, 4.2, 0], minW: 14, yaw: 28 } },
    { p: 252, t: [MID - 1.5, 4.0, 0], fh: 12.0, fov: 16, yaw: 16, pitch: -4, phone: { t: [MID, 4, 0], minW: 13 } },
    // the row faces you: all five doors in the picture, to choose
    { p: P.choose[0], t: [MID, 3.9, 0], fh: 13.5, minW: 34, fov: 18, yaw: 0, pitch: -3, phone: { t: [MID, 3.4, 0], minW: 31.5 } },
    { p: P.choose[1], t: [MID, 3.9, 0], fh: 13.5, minW: 34, fov: 18, yaw: 0, pitch: -3, phone: { t: [MID, 3.4, 0], minW: 31.5 } },
    { p: P.approach, t: [cx, 3.6, -0.3], fh: 9.6, fov: 28, yaw: 0, pitch: -4, phone: { minW: 7.6 } },
    H.key(P.entry, [1.78, 1.72, 1.55], 2, -1, 54, 2.65),
    H.key(P.hall, [1.72, 1.96, -2.35], -8, -9, 56, 2.2),
    H.key(P.turn, [2.0, 1.94, -3.1], -46, -1, 58, 2.35),
    H.key(P.kitchen, [2.75, 2.0, -6.5], -3, 0, 58, 2.5),
  ];
}

// ---- tags over the doors, and the five keys at the top
const pins = document.getElementById('pins'), chooser = document.getElementById('chooser'), live = document.getElementById('live');
const tags = HOUSES.map((h, i) => {
  const el = pins.appendChild(document.createElement('button'));
  el.type = 'button'; el.className = `plot ${cls(h)}`;
  el.innerHTML = `<b>${h.no}</b><span>${h.status}</span>`;
  el.setAttribute('aria-label', `Haus ${h.no}, ${h.status}. Ansehen`);
  el.addEventListener('click', () => choose(i, true));
  S.pin(el, [i * 6 + 3, 10.2, 0], { tf: 'translateY(-100%)' });       // the tag stands above the roof, clear of the captions
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

const curtain = document.getElementById('curtain');
let beatEls = [], radar = null;
function fill() {
  const h = HOUSES[sel], H = houses[sel];
  tags.forEach((t, i) => t.classList.toggle('on', i === sel));
  keysEl.forEach((b, i) => b.setAttribute('aria-pressed', String(i === sel)));
  if (radar) { radar.ox = sel * 6; radar.mirrorX = !H.doorL; }
  const btn = document.querySelector('#cad-map .cm-btn[data-id="entry"]'); if (btn) btn.textContent = `HAUS ${h.no}`;
  const st = `<b class="st ${cls(h)}">${h.status}</b>`;
  const facts = `<div class="row"><div><span>Zimmer</span>${h.rooms}</div><div><span>Wohnfläche</span>${h.area} m²</div><div><span>Status</span>${st}</div></div>`;
  const others = FREE.filter((f) => f !== h).map((f) => `<button class="go" data-go="${HOUSES.indexOf(f)}">Haus ${f.no} ansehen</button>`).join('');
  if (beatEls[3]) beatEls[3].innerHTML = `<span class="n">04 &nbsp;·&nbsp; Haus ${h.no}</span><p>${free(h) ? `Haus ${h.no} ist <em>frei.</em> Zwei Steinstufen hinauf und durch die Glastür.` : `Haus ${h.no} ist verkauft. Ansehen können Sie es trotzdem: zwei Steinstufen hinauf und durch die Glastür.`}</p>${facts}`;
  if (beatEls[4]) beatEls[4].innerHTML = `<span class="n">05 &nbsp;·&nbsp; In Haus ${h.no}</span><p>Eine Halle über zwei Geschosse, eine Treppe aus gefaltetem Stahl, unter der Galerie der <em>Wohnraum.</em></p>`;
  if (beatEls[5]) beatEls[5].innerHTML = `<span class="n">06 &nbsp;·&nbsp; Küche zum Südgarten</span><p>Küche mit Essplatz. Die Glaswand öffnet sie über die ganze Breite zum ummauerten Garten.</p>`
    + `<div class="row"><div><span>Haus</span>${h.no} von 0${N}</div><div><span>${free(h) ? 'Kaufpreis' : 'Garten'}</span>${free(h) ? h.price : 'Südlage'}</div><div><span>Status</span>${st}</div></div>`
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
  setTimeout(() => { swap(); if (pNow > P.entry + 30) window.scrollTo({ top: window.scrollY - (pNow - P.entry) * (document.getElementById('track').offsetHeight / (P.end + 100)), behavior: 'instant' }); setTimeout(() => curtain.classList.remove('on'), 260); }, 300);
}
// a click on a facade picks that house
const ray = new THREE.Raycaster(), wall = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
let downX = 0, downY = 0;
addEventListener('pointerdown', (e) => { downX = e.clientX; downY = e.clientY; }, { passive: true });
addEventListener('click', (e) => {
  if (e.target instanceof Element && e.target.closest('button, a, #cad-map, .beat')) return;
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 8 || pNow > P.approach + 10 || pNow < 20) return;
  ray.setFromCamera(new THREE.Vector2(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), S.camera);
  if (!ray.ray.intersectPlane(wall, hit) || hit.y < -0.5 || hit.y > 9.5) return;
  const i = Math.floor(hit.x / 6);
  if (i >= 0 && i < N) choose(i, true);
});

// ---- the project this row belongs to (from the Dortmund map)
const pid = Q.get('id');
if (pid) {
  document.getElementById('backLink').href = `/threejs-demos/dortmund/?p=${encodeURIComponent(pid)}`;
  fetch('/threejs-demos/dortmund/js/projects.json').then((r) => r.json()).then((list) => {
    const pr = list.find((x) => x.id === pid); if (!pr) return;
    for (const id of ['markName', 'kickName', 'tbName', 'ldName']) document.getElementById(id).textContent = pr.name;
    document.getElementById('markSub').textContent = `Fünf Stadthäuser · ${pr.district}`;
    document.title = `${pr.name} · Die Häuser · Wohnungsfinder`;
  }).catch(() => {});
}

const LATE = new THREE.Vector3(-1.45, 0.62, 0.78).normalize();
const sunDir = new THREE.Vector3();
const late = new THREE.Color(0xffd9a8), white = new THREE.Color(0xfff1dc);
radar = {
  ox: sel * 6, mirrorX: !houses[sel].doorL,
  zones: [
    { id: 'street', label: 'REIHE', tag: 'STRASSE 1:100', at: P.choose[0] + 10, u0: -4.0, u1: 0.0 },
    { id: 'entry', label: 'HAUS', tag: 'EINGANG', at: P.entry, u0: 0.0, u1: 1.3 },
    { id: 'hall', label: 'HALLE', tag: 'HALLE +0.30M', at: P.hall + 40, u0: 1.3, u1: 6.0 },
    { id: 'kitchen', label: 'KÜCHE', tag: 'KÜCHE +0.30M', at: P.kitchen, u0: 6.0, u1: 12.0 },
    { id: 'garden', label: 'GARTEN', tag: 'SÜDGARTEN', at: P.end - 4, u0: 12.0, u1: 17.8 },
  ],
};
KEYS = keysFor(sel);

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
    // one sun crossing five facades, at the drawing's angle
    const u = span(p, 118, 255);
    S.U.uSweep.value.z = u <= 0 ? -60 : u >= 1 ? 60 : lerp(-12, 28, smooth(u));
    const m = ease(span(p, 262, P.approach));
    sunDir.copy(CONVENTION).lerp(LATE, m).normalize();
    S.setSun(sunDir);
    S.sun.color.copy(white).lerp(late, m);
    S.sun.intensity = lerp(3.2, 3.0, m);
    const d = smooth(span(p, P.entry - 40, P.entry + 30)), g = smooth(span(p, P.turn + 5, P.kitchen - 5));
    houses.forEach((H, i) => { H.setDoor(i === sel ? d : 0); H.setGardenDoor(i === sel ? g : 0); });
  },
  beats: [
    { from: 62, to: 122, html: '<span class="n">01 &nbsp;·&nbsp; Die Reihe</span><p>Fünf Häuser aus Ziegel, zwei Geschosse, jedes unter einem Dach aus Zink. Gezeichnet im Maßstab 1:100.</p>' },
    { from: 128, to: 252, html: '<span class="n">02 &nbsp;·&nbsp; Eine Sonne</span><p>Die Schatten der Zeichnung fallen unter 45 Grad. Die Sonne kommt im selben Winkel, <em>Haus für Haus.</em></p>' },
    { from: 268, to: P.choose[1] + 14, html: '<span class="n">03 &nbsp;·&nbsp; Welches Haus?</span><p>Drei sind <b class="st verkauft">verkauft</b>, zwei sind <b class="st frei">frei</b>. Tippen Sie ein Haus an, oder scrollen Sie weiter.</p><div class="row"><div><span>Verkauft</span>01 · 03 · 04</div><div><span>Frei</span>02 · 05</div><div><span>Häuser</span>5</div></div>' },
    { from: P.approach + 8, to: P.entry + 28, html: '' },
    { from: P.entry + 44, to: P.turn - 6, html: '' },
    { from: P.turn + 10, to: P.end + 40, html: '' },
  ],
});
beatEls = [...document.querySelectorAll('#beats .beat')];
fill();
window.__haeuser = { get sel() { return sel; }, choose, P, get p() { return pNow; } };
