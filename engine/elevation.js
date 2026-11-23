// The Elevation engine, shared by the house pages (haeuser, a-one-door, b-the-row, c-the-face).
//
// One model, drawn two ways. Every surface is buff toned paper (trois crayons) with 45 degree hatching in black
// chalk wherever the sun does not reach, heightened in white chalk where it does, or its real lit material. A diagonal sweep decides which, pixel
// by pixel. The sun starts at the drawing convention (45 degrees in plan and elevation,
// 35.26 degrees high), so the hatched areas and the real shadows are the same areas.
//
// The hatching is never drawn by hand: it is read from the shadow map. Move the sun and
// the hatching moves.
//
// Only three.js: the scroll is the page's own, eased in run().
// URL: ?at=VH jumps to a scroll position (vh) and skips the intro, ?skip skips the intro,
//      ?nosmooth follows the scroll without easing (recordings), ?debug shows p in the corner,
//      ?q=low|mid|high forces the device tier, ?dpr=1.5 pins the render resolution (see quality.js).
//
// Built to run on a phone and on an office laptop, and never to stall the graphics card:
// - One light for everything: the sun, the sky, and one even room light (uFill). No lamp lights anything, so the set of
//   lights never changes and no shader is ever built twice.
// - No environment map: what a surface sees of the sky is a formula (elevSky). Sampling a filtered environment texture
//   was more than half of the work of every pixel.
// - One shader per kind of material. What differs from house to house (colour, bond, boards, weave) are uniforms.
//   Every shader is built behind the loader (warm()); nothing is compiled while the page is in use.
// - Everything that does not move is merged into one mesh per material and one line object per pen (flush()), the
//   shadow map is only drawn again when the sun or a door has moved, a frame is only rendered when something changed,
//   and the lit model is only shaded once the sun has arrived.
// - Rooms are only built for houses that can be entered, and only the house the lens is in is drawn.
// - If the browser takes the WebGL context away, the page says so and starts again on the lowest tier.
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { tier, low, high, startDpr, pinnedDpr, governor, visible, safeMode, enterSafeMode } from './quality.js';
import { buildInterior, PLANS, fitFor, FLOORS, WOODS, STONES } from './interior.js';

export { THREE, mergeGeometries, PLANS, fitFor, FLOORS, WOODS, STONES };
export const Q = new URLSearchParams(location.search);
export const num = (k, d) => (Q.has(k) ? parseFloat(Q.get(k)) : d);
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const span = (x, a, b) => clamp01((x - a) / (b - a));
export const smooth = (x) => x * x * (3 - 2 * x);
export const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const lerp = (a, b, t) => a + (b - a) * t;
export function mulberry(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const raw = (hex) => new THREE.Vector3(((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255);
export const CONVENTION = new THREE.Vector3(-1, 1, 1).normalize(); // towards the sun: upper left, in front

// The page cannot show its picture: say so on the sheet instead of leaving the loader standing.
export function fail(text, reload = true) {
  const el = document.getElementById('loader') || document.body.appendChild(document.createElement('div'));
  el.className = 'loader failed'; el.id = 'loader';
  el.innerHTML = `<p>3D-Ansicht angehalten</p><p class="soft">${text}</p><p>${reload ? '<a href="" onclick="location.reload();return false">Neu laden</a> &nbsp;·&nbsp; ' : ''}<a href="../dortmund/">Zur Karte</a></p>`;
  document.documentElement.classList.remove('locked');
}

const GLSL_COMMON = /* glsl */`
  uniform vec3 uSun; uniform vec4 uSweep; uniform float uReal;
  uniform vec3 uPaper; uniform vec3 uInk; uniform vec3 uChalk; uniform vec3 uAccent; uniform vec3 uAccentHi; uniform float uHatch; uniform float uLinePx;
  uniform float uDraw; uniform vec2 uDrawSpan; uniform vec2 uDrawDir; uniform float uHatchIn; uniform vec2 uWipe; uniform float uDetailIn; uniform float uDepthCue;
  uniform float uLive; uniform vec2 uCut;
  float sweepS(vec3 p) { return dot(p.xy, uSweep.xy); }
  float revealAt(vec3 p) {
    float s = sweepS(p);
    return clamp(uReal + 1.0 - smoothstep(uSweep.z - uSweep.w, uSweep.z + uSweep.w, s), 0.0, 1.0);
  }
  float lineAt(float c, float period, float px) {
    float t = c / period, fw = max(fwidth(t), 1e-5);
    float d = abs(fract(t) - 0.5);
    float hw = 0.5 * px * fw;
    return 1.0 - smoothstep(hw, hw + fw, 0.5 - d);
  }
  float lineFade(float c, float period, float minPx) {
    float px = period / max(fwidth(c), 1e-5);
    return smoothstep(minPx, minPx * 1.8, px);
  }
  float frontBand(vec3 p) {
    float bandOn = step(-35.0, uSweep.z) * (1.0 - step(35.0, uSweep.z)) * (1.0 - uReal);
    float sd = sweepS(p) - uSweep.z;
    float w = max(uSweep.w, 0.45);
    float laser = exp(-pow(sd / (w * 0.11), 2.0));
    float halo = exp(-pow(sd / (w * 0.55), 2.0)) * 0.34;
    float gridEnv = exp(-pow(sd / (w * 1.08), 2.0));
    float gx = lineAt(p.x, 0.5, uLinePx * 0.85);
    float gy = lineAt(p.y, 0.5, uLinePx * 0.85);
    float gz = lineAt(p.z, 0.25, uLinePx * 0.8);
    float grid = max(max(gx, gy) * 0.65, gz * 0.55) * gridEnv;
    return clamp(laser + halo + grid, 0.0, 1.0) * bandOn;
  }
  // the hatching pours in along the light, from the upper left
  float hatchWipe(vec3 p) {
    float ns = clamp((dot(p.xy, vec2(0.7071, -0.7071)) - uWipe.x) / (uWipe.y - uWipe.x), 0.0, 1.0);
    return clamp((uHatchIn * 1.3 - ns) / 0.3, 0.0, 1.0);
  }
  // courses and joints are laid in the same order as the lines were drawn
  float detailWipe(vec3 p) {
    float hn = clamp((dot(p.xy, uDrawDir) - uDrawSpan.x) / (uDrawSpan.y - uDrawSpan.x), 0.0, 1.0);
    return clamp((uDetailIn * 1.25 - hn) / 0.25, 0.0, 1.0);
  }
  float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1, 0)), f.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), f.x), f.y); }
  vec2 planeUV(vec3 p, vec3 n) {
    vec3 a = abs(n);
    if (a.y > 0.7) return p.xz;
    return a.x > a.z ? vec2(p.z, p.y) : vec2(p.x, p.y);
  }
`;

// What the shader of one kind of material knows how to draw. uTx (pattern, a, b, c) picks the variant and its measures,
// so a house with another bond, other boards or another weave costs a uniform and not a shader.
const GLSL_KINDS = /* glsl */`
  #if KIND == 1
    // brick. uTx: bond (0 running, 1 stack, 2 third, 3 wild), length and height of a brick with its joint, joint (0 light, 1 dark, 2 in the colour of the brick) + how much the bricks differ (0 ... 0.9)
    float brickOff(float course) {
      if (uTx.x < 0.5) return mod(course, 2.0) * 0.5;
      if (uTx.x < 1.5) return 0.0;
      if (uTx.x < 2.5) return mod(course, 3.0) / 3.0;
      return hash12(vec2(course, 7.3));
    }
    vec2 brickSize() { return vec2(uTx.y > 0.0 ? uTx.y : 0.225, uTx.z > 0.0 ? uTx.z : 0.075); }
    vec4 brickAt(vec2 q) {
      vec2 s = brickSize();
      float course = floor(q.y / s.y);
      float bx = q.x / s.x + brickOff(course);
      return vec4(floor(bx), course, fract(bx) * s.x, fract(q.y / s.y) * s.y);
    }
  #endif
  #if KIND == 11
    // a wooden floor. uTx: 0 boards (width, length), 1 herringbone at 45 degrees (width of a block, how many widths long), 2 squares of strips (width of a strip, strips per square)
    // returns the board (xy), the distance to its edge, and lc: where we are on the board (across, along)
    vec3 floorAt(vec2 q, out vec2 lc) {
      if (uTx.x < 0.5) {
        float pw = uTx.y > 0.0 ? uTx.y : 0.165, pl = uTx.z > 0.0 ? uTx.z : 1.45;
        float c = floor(q.x / pw), yy = q.y + c * 0.55, r = floor(yy / pl);
        lc = vec2(q.x, q.y);
        return vec3(c, r, min(abs(fract(q.x / pw + 0.5) - 0.5) * pw, abs(fract(yy / pl + 0.5) - 0.5) * pl * 1.4));
      }
      if (uTx.x < 1.5) {
        float w = uTx.y > 0.0 ? uTx.y : 0.09, L = uTx.z > 0.0 ? uTx.z : 5.0;
        vec2 t = vec2(q.x + q.y, q.y - q.x) * 0.7071 / w, ip = floor(t), f = fract(t);
        float m = mod(ip.x - ip.y, 2.0 * L), k = floor((ip.x - ip.y) / (2.0 * L));
        if (m < L) { float u = m + f.x; lc = vec2(f.y, u) * w; return vec3(k, ip.y, min(min(u, L - u), min(f.y, 1.0 - f.y)) * w); }
        float u = (2.0 * L - 1.0 - m) + f.y; lc = vec2(f.x, u) * w;
        return vec3(ip.x + 57.0, k, min(min(u, L - u), min(f.x, 1.0 - f.x)) * w);
      }
      float w = uTx.y > 0.0 ? uTx.y : 0.07, n = uTx.z > 0.0 ? uTx.z : 5.0, sq = w * n;
      vec2 cell = floor(q / sq), f = fract(q / sq) * sq;
      float turn = mod(cell.x + cell.y, 2.0);
      float s = turn > 0.5 ? f.x : f.y, strip = floor(s / w);
      lc = turn > 0.5 ? vec2(f.x, f.y) : vec2(f.y, f.x);
      return vec3(cell.x * 7.0 + strip, cell.y * 3.0 + turn, min(abs(fract(s / w + 0.5) - 0.5) * w, min(min(f.x, sq - f.x), min(f.y, sq - f.y))));
    }
  #endif
  // every second band of a period, with a soft edge
  float band(float t) { float f = abs(fract(t) - 0.5), a = max(fwidth(t), 1e-4); return smoothstep(0.25 - a, 0.25 + a, f); }
  // the sky the houses stand under, seen in direction d: warm haze at the horizon, pale zenith, the ground below, a glow
  // where the sun stands. rough 0: as in a mirror; rough 1: all of it run together (the light a matt surface gets)
  vec3 elevSky(vec3 d, float rough) {
    float h = d.y, w = mix(0.03, 1.0, rough);
    vec3 sky = mix(vec3(0.87, 0.76, 0.58), vec3(0.74, 0.79, 0.82), pow(clamp(h, 0.0, 1.0), 0.65));
    vec3 ground = mix(vec3(0.38, 0.35, 0.30), vec3(0.60, 0.55, 0.46), smoothstep(-0.8, 0.0, h));
    float glow = pow(max(0.0, dot(d, vec3(-0.618, 0.486, 0.618))), mix(12.0, 1.5, rough));
    return mix(ground, sky, smoothstep(-w, w, h)) + vec3(0.34, 0.26, 0.14) * glow * (1.0 - 0.7 * rough);
  }
`;

// three's own light loop, with the sun's shadow taken from elevShadow instead of being sampled a second time
const LIGHTS_BEGIN = THREE.ShaderChunk.lights_fragment_begin.replace(
  /directLight\.color \*= \( directLight\.visible && receiveShadow \) \? getShadow\( directionalShadowMap\[ i \][^;]*;/,
  'directLight.color *= elevShadow;');
if (LIGHTS_BEGIN === THREE.ShaderChunk.lights_fragment_begin) console.warn('elevation: the light loop of this three.js has changed, the shadow is sampled twice');

/* =========================================================================== */
export function createStage(cfg = {}) {
  const S = {};
  // The picture is as wide as the window and as high as the LARGE viewport: on a phone the URL bar slides in and
  // out while you scroll, and neither the canvas nor the camera should notice (no reallocation, no stretching).
  const probe = document.documentElement.appendChild(document.createElement('div'));
  probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100vh;height:100lvh;visibility:hidden;pointer-events:none';
  const measure = () => [Math.max(1, innerWidth), Math.max(1, innerHeight, probe.offsetHeight || 0)];
  let [W, H] = measure();
  let DPR = startDpr();
  const DPR0 = DPR;
  document.documentElement.classList.add('q-' + tier);     // the stylesheet drops what a phone cannot afford
  const phone = () => W / H < 0.8;
  const canvas = document.getElementById('gl');
  let renderer;
  // (after the browser has taken the context away once, the picture is drawn without multisampling: a quarter of the memory)
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: !safeMode && !Q.has('noaa'), powerPreference: 'high-performance', stencil: false }); }
  catch (e) { fail('Dieser Browser stellt kein WebGL bereit. Bitte einen aktuellen Browser verwenden oder die Hardwarebeschleunigung einschalten.', false); throw e; }
  // The browser may take the context away (memory, a driver that hangs, a tab long in the background). Say so, remember
  // it for this tab, and start again on the lowest tier. Never more than twice in a row on its own.
  let lost = false;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault(); lost = true; enterSafeMode();
    fail(safeMode ? 'Der Browser hat die Grafik erneut angehalten. Bitte andere Tabs schließen und neu laden.' : 'Der Browser hat die Grafik angehalten. Die Seite startet in einer sparsamen Darstellung neu.');
    let n = 0; try { n = +sessionStorage.getItem('wf-lost') || 0; sessionStorage.setItem('wf-lost', String(n + 1)); } catch (err) {}
    if (n < 2) setTimeout(() => location.reload(), 1600);
  });
  renderer.setPixelRatio(DPR);
  renderer.setSize(W, H, true);
  renderer.setClearColor(0xdfd2ba, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = high ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;       // drawn again only when the sun or a caster has moved (shadowDirty)
  let shadowDirty = true, dirty = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  const scene = new THREE.Scene();
  const root = new THREE.Group(); scene.add(root);

  const hatch0 = (phone() ? cfg.hatchPhone || cfg.hatch : cfg.hatch) || 0.11;
  const U = {
    uSun: { value: CONVENTION.clone() },
    uSweep: { value: new THREE.Vector4(Math.SQRT1_2, -Math.SQRT1_2, -999, cfg.soft || 0.8) },
    uReal: { value: num('real', 0) },
    uPaper: { value: raw(0xdfd2ba) },
    uInk: { value: raw(0x2a2522) },
    uChalk: { value: raw(0xfcf9f2) },
    uAccent: { value: raw(0xa5432b) },
    uAccentHi: { value: raw(0xc65e42) },
    uHatch: { value: hatch0 * (DPR0 < 1.5 ? 1.3 : 1) },
    uLinePx: { value: 1.05 * DPR },
    uDraw: { value: 1 },
    uDrawSpan: { value: new THREE.Vector2(...(cfg.drawSpan || [0, 12])) },
    uDrawDir: { value: new THREE.Vector2(...(cfg.drawDir || [0, 1])) },
    uHatchIn: { value: 1 },
    uWipe: { value: new THREE.Vector2(...(cfg.wipe || [-12, 8])) },
    uDetailIn: { value: 1 },
    uDepthCue: { value: 0 },
    uBump: { value: 1.25 },
    uLive: { value: 1 },                       // 0 while the whole picture is still drawing: the lit model is not shaded at all
    uShTexel: { value: 0.012 },                // one texel of the shadow map, in metres
    uShRange: { value: 200 },                  // depth of the shadow camera, in metres
    uCut: { value: new THREE.Vector2(1e4, 0) },// nothing is drawn above this height (a plan, a building site). y: trees and people too
    uFill: { value: cfg.fill ?? 0.95 },        // the one room light: the same in every room of every house
  };

  /* ---------- light ---------- */
  // No environment map. What a surface sees of the sky (its diffuse light from above and below, and what it mirrors)
  // is a formula in the shader (elevSky): the same pale October sky as before, at a fraction of the cost. Sampling a
  // filtered environment texture was more than half of the work of every pixel.
  const sun = new THREE.DirectionalLight(0xfff1dc, 3.2);
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xdfe6ea, 0xb8a98c, 0.9); scene.add(hemi);
  // The shadow map: its camera is fitted to the box of everything that casts (sunAim.box, measured in flush()): in
  // light space a caster and its shadow share x and y, so nothing else needs to be inside, and a small map still
  // gives the hatching a sharp edge.
  const sunAim = { t: new THREE.Vector3(), ext: 24, box: null };
  const SHADOW_MAP = low ? 1536 : high ? 3072 : 2048;
  const _lm = new THREE.Matrix4(), _lv = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
  function aimSun(cx, cy, ext, map = SHADOW_MAP) {
    sunAim.t.set(cx, cy, -3.5); sunAim.ext = ext;
    sun.castShadow = true;
    sun.shadow.mapSize.set(map, map);
    sun.shadow.bias = 0; sun.shadow.normalBias = 0.012;     // the depth bias is slope scaled, in elevShadowAt()
    placeSun();
  }
  function fitShadow() {
    const c = sun.shadow.camera, b = sunAim.box, e = sunAim.ext;
    if (!b) { c.left = -e; c.right = e; c.top = e; c.bottom = -e; c.near = 6; c.far = 210; }
    else {
      _lm.lookAt(sun.position, sun.target.position, _up).setPosition(sun.position).invert();
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity;
      for (let i = 0; i < 8; i++) {
        _lv.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(_lm);
        x0 = Math.min(x0, _lv.x); x1 = Math.max(x1, _lv.x); y0 = Math.min(y0, _lv.y); y1 = Math.max(y1, _lv.y); z0 = Math.min(z0, _lv.z); z1 = Math.max(z1, _lv.z);
      }
      c.left = x0 - 0.3; c.right = x1 + 0.3; c.bottom = y0 - 0.3; c.top = y1 + 0.3;
      c.near = Math.max(0.5, -z1 - 2); c.far = -z0 + 2;
    }
    c.updateProjectionMatrix();
    U.uShTexel.value = Math.max(c.right - c.left, c.top - c.bottom) / sun.shadow.mapSize.x;
    U.uShRange.value = c.far - c.near;
  }
  function placeSun() {
    sun.target.position.copy(sunAim.t);
    sun.position.copy(U.uSun.value).multiplyScalar(90).add(sunAim.t);
    sun.target.updateMatrixWorld();
    fitShadow();
    shadowDirty = true; dirty = true;
  }
  function setSun(dir) {
    _lv.copy(dir).normalize();
    if (_lv.distanceToSquared(U.uSun.value) < 1e-10) return;   // the pages call this every frame: only a sun that moved costs a shadow pass
    U.uSun.value.copy(_lv); placeSun();
  }
  // nothing above y is drawn: a plan (all = true: trees are cut as well) or a house half built. Infinity: everything
  function cut(y = Infinity, all = false) {
    const v = Number.isFinite(y) ? y : 1e4;
    if (v === U.uCut.value.x && (all ? 1 : 0) === U.uCut.value.y) return;
    U.uCut.value.set(v, all ? 1 : 0); shadowDirty = true; dirty = true;
  }
  // the shadow pass leaves out what the cut leaves out, so the sun falls into a cut house
  const depthMat = (always) => {
    const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uCut = U.uCut;
      sh.vertexShader = 'varying float vCutY;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vCutY = (modelMatrix * vec4(transformed, 1.0)).y;');
      sh.fragmentShader = 'varying float vCutY; uniform vec2 uCut;\n' + sh.fragmentShader.replace('void main() {', `void main() {\n  if (vCutY > uCut.x${always ? '' : ' && uCut.y > 0.5'}) discard;`);
    };
    m.customProgramCacheKey = () => 'elev-depth-' + (always ? 1 : 0);
    return m;
  };
  const DEPTH = depthMat(true), DEPTH_TREE = depthMat(false);

  /* ---------- materials ---------- */
  const KIND = {
    plain: 0, brick: 1, stone: 2, glass: 3, zinc: 4, wood: 5, paving: 6,
    sky: 7, foliage: 8, steel: 9, interior: 10, oakFloor: 11, plaster: 12, travertine: 13, linen: 14, lacquer: 15,
  };
  const BASE = {
    // late October on the Kreidegasse: white brick, pale stone, zinc, oak, black steel (oxide red only on the front door), plaster, lawn and one russet maple
    brick: { color: 0xefebe2, roughness: 0.88 },
    stone: { color: 0xcdc5b5, roughness: 0.76 },
    glass: { color: 0xffffff, roughness: 0.06, metalness: 0.05 },
    zinc: { color: 0x7a858d, roughness: 0.48, metalness: 0.45 },
    wood: { color: 0xa67b49, roughness: 0.44 },
    paving: { color: 0xcdc5b5, roughness: 0.86 },
    sky: { color: 0xdfe6ea, roughness: 1 },
    foliage: { color: 0x86995f, roughness: 0.88, flatShading: true },
    steel: { color: 0x2f2c2a, roughness: 0.4, metalness: 0.45 },
    plain: { color: 0xefebe2, roughness: 0.84 },
    interior: { color: 0xfff6ee, roughness: 0.9, emissive: 0x6a5f50, emissiveIntensity: 0.7 },
    oakFloor: { color: 0xb88b55, roughness: 0.46 },
    plaster: { color: 0xf2efe8, roughness: 0.86 },
    travertine: { color: 0xefebe2, roughness: 0.5 },
    linen: { color: 0xf2efe8, roughness: 0.92 },
    lacquer: { color: 0x9a3f2a, roughness: 0.36, metalness: 0.12 },
  };
  const MATS = {};
  // o: color, tx (pattern and its measures, see GLSL_KINDS), rough, metal, faint (a neighbour, drawn lightly), realOnly / drawOnly
  // (only on one side of the scan), clear (glass you can see through), noCut (a tree: stays when a house is cut),
  // in (how much of the room light it gets)
  function mat(kind, o = {}) {
    const key = [kind, o.color ?? '', o.faint ? 1 : 0, o.realOnly ? 1 : o.drawOnly ? 2 : 0, o.clear ? (o.door ? 2 : 1) : 0, o.noCut ? 1 : 0, o.in || 0, (o.tx || []).join(','), o.rough ?? '', o.metal ?? ''].join('|');
    if (MATS[key]) return MATS[key];
    const m = new THREE.MeshStandardMaterial({ ...BASE[kind], polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    m.envMapIntensity = ({ glass: 1.55, steel: 0.8, zinc: 0.8, wood: 0.8, oakFloor: 0.6, travertine: 0.5, lacquer: 0.7 }[kind] || 0.45) * (cfg.envScale || 1);
    if (o.color != null) m.color.setHex(o.color);
    if (o.rough != null) m.roughness = o.rough;
    if (o.metal != null) m.metalness = o.metal;
    // clear glass: a sheet you can see through once the scan has made it real. On the drawing it is paper like everything else
    const clear = o.clear ? 1 : 0;
    if (kind === 'sky') m.toneMapped = false;
    if (clear) { m.transparent = true; m.opacity = 0.17; m.depthWrite = !!o.door; }
    const fx = new THREE.Vector4(o.faint ? 1 : 0, o.realOnly ? 1 : o.drawOnly ? 2 : 0, o.noCut ? 1 : 0, o.in || 0);
    const tx = new THREE.Vector4(...[0, 1, 2, 3].map((i) => (o.tx && o.tx[i]) || 0));
    Object.assign(m.userData, { drawOnly: !!o.drawOnly, sky: kind === 'sky', noCut: !!o.noCut, kind });
    const K = KIND[kind];
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.uniforms.uFx = { value: fx }; sh.uniforms.uTx = { value: tx }; sh.uniforms.uEnv = { value: m.envMapIntensity };
      sh.vertexShader = 'varying vec3 vWP; varying vec3 vWN;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 wpp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wpp = instanceMatrix * wpp;
        #endif
        vWP = (modelMatrix * wpp).xyz;
        vWN = normalize(mat3(modelMatrix) * objectNormal);`);
      sh.fragmentShader = `#define KIND ${K}\n#define CLEAR ${clear}\n#define ELEV_TAPS ${high ? 16 : 4}\n#define ELEV_LOW ${low ? 1 : 0}\nvarying vec3 vWP; varying vec3 vWN; uniform float uBump; uniform float uShTexel; uniform float uShRange; uniform float uFill; uniform float uEnv;\nuniform vec4 uFx; uniform vec4 uTx;\nfloat elevH = 0.0; float elevRough = -1.0; float elevNear = 0.0;\n${GLSL_COMMON}${GLSL_KINDS}
      ` + sh.fragmentShader
          // the sun's shadow, read once per pixel and used twice: by the light of the real model and by the hatching.
          // The depth bias follows the slope of the surface to the sun, so a brick 60 mm proud keeps its small shadow.
          .replace('#include <shadowmap_pars_fragment>', `#include <shadowmap_pars_fragment>
            float elevShadowAt() {
              #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
                if ( ! receiveShadow ) return 1.0;
                float ndl = clamp(dot(normalize(vWN), uSun), 0.08, 1.0);
                float bias = - uShTexel * (0.6 + 1.3 * min(sqrt(1.0 - ndl * ndl) / ndl, 6.0)) / uShRange;
                #if ELEV_TAPS == 4
                  vec4 sc = vDirectionalShadowCoord[ 0 ];
                  sc.xyz /= sc.w; sc.z += bias;
                  if (sc.x < 0.0 || sc.x > 1.0 || sc.y < 0.0 || sc.y > 1.0 || sc.z > 1.0) return 1.0;
                  vec2 size = directionalLightShadows[ 0 ].shadowMapSize, tx = 1.0 / size;
                  vec2 st = sc.xy * size - 0.5, f = fract(st), b = (floor(st) + 0.5) * tx;
                  float s00 = texture2DCompare(directionalShadowMap[ 0 ], b, sc.z);
                  float s10 = texture2DCompare(directionalShadowMap[ 0 ], b + vec2(tx.x, 0.0), sc.z);
                  float s01 = texture2DCompare(directionalShadowMap[ 0 ], b + vec2(0.0, tx.y), sc.z);
                  float s11 = texture2DCompare(directionalShadowMap[ 0 ], b + tx, sc.z);
                  return mix(mix(s00, s10, f.x), mix(s01, s11, f.x), f.y);
                #else
                  return getShadow( directionalShadowMap[ 0 ], directionalLightShadows[ 0 ].shadowMapSize, bias, directionalLightShadows[ 0 ].shadowRadius, vDirectionalShadowCoord[ 0 ] );
                #endif
              #else
                return 1.0;
              #endif
            }`)
          .replace('void main() {', `void main() {
            #if KIND != 7
              if (vWP.y > uCut.x && ((uFx.z < 0.5 && uFx.x < 0.5) || uCut.y > 0.5)) discard;   // trees and faint neighbours stay whole on a building site
            #endif
            float rv = revealAt(vWP);
            if (uFx.y > 0.5 && uFx.y < 1.5 && rv < 0.5) discard;                       // only on the real side of the scan
            if (uFx.y > 1.5 && (rv > 0.5 || uHatchIn < 0.02)) discard;                 // only on the drawing
            float elevShadow = elevShadowAt();`)
          // while the whole sheet is still a drawing (uLive = 0) the lit model is skipped: textures, lights, reflections
          .replace('vec3 totalEmissiveRadiance = emissive;', `vec3 totalEmissiveRadiance = emissive;
            vec3 elevOut = vec3(0.0);
            if (uLive > 0.5) {`)
          .replace('#include <lights_fragment_begin>', LIGHTS_BEGIN)
          .replace('#include <opaque_fragment>', `elevOut = outgoingLight;
              #if KIND == 7
                elevOut = diffuseColor.rgb;
              #endif
            }
            vec3 outgoingLight = elevOut;
            #include <opaque_fragment>`)
          .replace('#include <color_fragment>', `#include <color_fragment>
            {
              vec2 q = planeUV(vWP, vWN);
              float fw = max(fwidth(q.x), fwidth(q.y));
              elevNear = smoothstep(0.025, 0.004, fw);        // 1 close up, 0 far away: fine detail and relief only where they can be seen
              #if KIND == 1
                vec2 bs = brickSize(); vec4 b = brickAt(q);
                float fwb = fw * 1.15;
                float brickVis = smoothstep(bs.y * 0.6, bs.y * 0.2, fwb);
                float jointVis = smoothstep(0.013, 0.004, fwb);
                float joint = max(1.0 - smoothstep(0.0095 - fwb, 0.0095 + fwb, b.z), 1.0 - smoothstep(0.0095 - fwb, 0.0095 + fwb, b.w));
                float jt = floor(uTx.w + 0.001), vary = 1.0 + 2.0 * fract(uTx.w + 0.001);
                float h = hash12(b.xy), h2 = hash12(b.xy + 17.3), h4 = hash12(b.xy + 83.9);
                vec3 base = diffuseColor.rgb * (0.95 + 0.09 * (vnoise(q * 0.65) - 0.5)) * (0.96 + 0.04 * smoothstep(0.0, 2.5, q.y));
                float kilnDark = smoothstep(0.80, 0.98, h4) * 0.22;
                vec3 bc = base * max(0.35, 1.0 + vary * (0.22 * h - 0.13 - kilnDark)) * (1.0 + 0.04 * (h2 - 0.5));
                bc *= 0.92 + 0.16 * vnoise(vec2(q.x * 55.0, q.y * 140.0) + b.xy * 3.1) * jointVis;
                bc *= 1.0 - (1.0 - smoothstep(0.009, 0.015, b.w)) * step(0.009, b.w) * 0.14 * jointVis;
                vec3 mortar = (jt < 0.5 ? vec3(0.693, 0.651, 0.571) : jt < 1.5 ? vec3(0.075, 0.072, 0.07) : base * 0.74) * (0.94 + 0.12 * vnoise(q * 180.0));
                vec3 far = mix(base, mortar, 0.13), mid = mix(bc, mortar, 0.13), nearC = mix(bc, mortar * 0.92, joint);
                diffuseColor.rgb = mix(mix(far, mid, brickVis), nearC, jointVis);
                elevRough = mix(0.76 + 0.14 * hash12(b.xy + 5.1), 0.96, joint * jointVis);
                #if ELEV_LOW == 0
                  if (elevNear > 0.0) {
                    float e = min(min(b.z, bs.x - b.z + 0.011), min(b.w, bs.y - b.w + 0.011)) - 0.0055;
                    float grain = (vnoise(q * 380.0) - 0.5) * 0.0007 + (vnoise(q * 95.0 + b.xy * 7.0) - 0.5) * 0.0010 + (hash12(b.xy + 9.2) - 0.5) * 0.0014;
                    elevH = mix(-0.0085, grain, smoothstep(0.0035, 0.0095, e));
                  }
                #endif
              #elif KIND == 4
                float vis4 = smoothstep(0.12, 0.03, fw);
                if (uTx.x < 0.5) {              // standing seams of zinc
                  float fwz = max(fwidth(q.x) * 1.4, 0.005);
                  float sx = fract(q.x / 0.43 + 0.5) - 0.5;
                  float seamDark = 1.0 - smoothstep(0.0, fwz, abs(sx) * 0.43);
                  float seamHi = 1.0 - smoothstep(0.0, fwz * 1.4, abs(sx * 0.43 - 0.007));
                  float welt = 1.0 - smoothstep(0.0, max(fwidth(q.y) * 1.4, 0.005), abs(fract(q.y / 1.45 + 0.3) - 0.5) * 1.45);
                  float patina = 0.94 + 0.10 * vnoise(vec2(q.x * 18.0, q.y * 2.2)) + 0.04 * (vnoise(q * 4.0) - 0.5);
                  diffuseColor.rgb *= patina * (1.0 - 0.42 * seamDark - 0.18 * welt) + 0.10 * seamHi;
                  elevRough = 0.42 + 0.14 * vnoise(vec2(q.x * 20.0, q.y * 3.0));
                  #if ELEV_LOW == 0
                    elevH = smoothstep(0.014, 0.003, abs(sx) * 0.43) * 0.008;
                  #endif
                } else if (uTx.x < 1.5) {       // clay pantiles: courses across the slope, a wave along the course
                  float crs = floor(q.y / 0.36), u = q.x / 0.30;
                  float wave = 0.5 + 0.5 * cos(fract(u) * 6.2832);
                  float lap = smoothstep(0.0, 0.07, fract(q.y / 0.36) * 0.36);
                  float tone = 0.86 + 0.22 * hash12(vec2(floor(u), crs));
                  diffuseColor.rgb *= mix(0.92, tone * (0.78 + 0.26 * wave) * (0.62 + 0.38 * lap), vis4) * (0.95 + 0.08 * vnoise(q * 30.0));
                  elevRough = 0.9;
                  #if ELEV_LOW == 0
                    elevH = wave * 0.012 * elevNear;
                  #endif
                } else if (uTx.x < 2.5) {       // slate: small rectangles, every second course shifted by half
                  float crs = floor(q.y / 0.2), u = q.x / 0.25 + mod(crs, 2.0) * 0.5;
                  vec2 f = vec2(fract(u) * 0.25, fract(q.y / 0.2) * 0.2);
                  float edge = 1.0 - smoothstep(0.0, max(fw * 1.3, 0.004), min(f.x, min(0.25 - f.x, f.y)));
                  float tone = 0.84 + 0.26 * hash12(vec2(floor(u), crs));
                  diffuseColor.rgb *= mix(0.95, tone * (1.0 - 0.45 * edge), vis4) * (0.95 + 0.08 * vnoise(q * 40.0));
                  elevRough = 0.7;
                } else {                        // a planted roof
                  float n1 = vnoise(q * 3.0), n2 = vnoise(q * 14.0);
                  diffuseColor.rgb *= 0.70 + 0.35 * n1 + 0.22 * (n2 - 0.5) + 0.12 * (vnoise(q * 60.0) - 0.5);
                  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.25, 0.9, 0.7), smoothstep(0.62, 0.8, n2) * 0.5);
                  elevRough = 0.95;
                }
              #elif KIND == 5
                // timber. uTx: 0 upright boards with a groove, 1 lying boards, 2 veneer without grooves, 3 slats; then the width of a board
                vec2 qw = (uTx.x > 0.5 && uTx.x < 1.5) ? q.yx : q;
                float pitch = uTx.y > 0.0 ? uTx.y : 0.095;
                float board = floor(qw.x / pitch);
                float grain = vnoise(vec2(qw.x * 95.0, qw.y * 4.5 + board * 3.7));
                diffuseColor.rgb *= (0.85 + 0.25 * hash12(vec2(board, 3.0))) * (0.90 + 0.14 * grain + 0.06 * vnoise(vec2(qw.x * 260.0, qw.y * 16.0)));
                float gap = uTx.x > 2.5 ? pitch * 0.2 : 0.0, de = abs(fract(qw.x / pitch + 0.5) - 0.5) * pitch;
                float groove = (uTx.x > 1.5 && uTx.x < 2.5) ? 0.0 : 1.0 - smoothstep(gap, gap + max(fwidth(qw.x) * 1.2, 0.0025), de);
                diffuseColor.rgb *= 1.0 - (uTx.x > 2.5 ? 0.7 : 0.48) * groove;
                elevRough = 0.44 + 0.16 * vnoise(vec2(qw.x * 80.0, qw.y * 6.0));
                #if ELEV_LOW == 0
                  elevH = -groove * (uTx.x > 2.5 ? 0.012 : 0.0045) + (grain - 0.5) * 0.0006;
                #endif
              #elif KIND == 11
                vec2 lc; vec3 fb = floorAt(q, lc);
                float bh = hash12(fb.xy);
                float grain = vnoise(vec2(lc.x * 85.0, lc.y * 3.8 + bh * 9.0));
                float cath = vnoise(vec2(lc.x * 28.0 + sin(lc.y * 2.2) * 0.6, lc.y * 2.5));
                diffuseColor.rgb *= (0.88 + 0.20 * bh) * (0.91 + 0.12 * grain + 0.07 * cath);
                float gv = 1.0 - smoothstep(0.0, max(fw * 1.2, 0.002), fb.z);
                diffuseColor.rgb *= 1.0 - 0.38 * gv;
                elevRough = 0.44 + 0.16 * grain;
                #if ELEV_LOW == 0
                  elevH = -gv * 0.0035 + (cath - 0.5) * 0.0006;
                #endif
              #elif KIND == 6
                // paving: flags laid half over half. uTx.yz: another size of flag
                vec2 fs = vec2(uTx.y > 0.0 ? uTx.y : 0.9, uTx.z > 0.0 ? uTx.z : 0.6);
                float rowP = floor(q.y / fs.y);
                vec2 pq = vec2(q.x + mod(rowP, 2.0) * fs.x * 0.5, q.y);
                vec2 g6 = abs(fract(pq / fs + 0.5) - 0.5) * fs;
                float j = 1.0 - smoothstep(0.0, max(fw * 1.2, 0.005), min(g6.x, g6.y));
                vec3 flagCol = diffuseColor.rgb * (0.88 + 0.18 * hash12(floor(pq / fs))) * (0.95 + 0.09 * vnoise(q * 22.0));
                diffuseColor.rgb = mix(flagCol, vec3(0.45, 0.42, 0.37), j * 0.55);
                #if ELEV_LOW == 0
                  elevH = (vnoise(q * 95.0) - 0.5) * 0.0008 - j * 0.004;
                #endif
              #elif KIND == 7
                // late October: pale zenith #dfe6ea over a warm haze #f0e2c8 at the horizon (linear values, the sky is unlit)
                float k = clamp((vWP.y + 4.0) / 40.0, 0.0, 1.0);
                diffuseColor.rgb = mix(vec3(0.871, 0.760, 0.578), vec3(0.738, 0.791, 0.823), pow(k, 0.55));
              #elif KIND == 2
                float blockJ = 1.0 - smoothstep(0.0, max(fwidth(q.x) * 1.3, 0.003), abs(fract(q.x / 0.9 + 0.5) - 0.5) * 0.9);
                diffuseColor.rgb *= (0.95 + 0.06 * vnoise(vec2(q.x * 4.0, q.y * 26.0)) + 0.04 * (vnoise(q * 75.0) - 0.5)) * (1.0 - 0.18 * blockJ);
                #if ELEV_LOW == 0
                  elevH = (vnoise(q * 140.0) - 0.5) * 0.0007 - blockJ * 0.003;
                #endif
              #elif KIND == 12
                // render. uTx: 0 smooth, 1 scratched, 2 combed, 3 limewash in clouds, 4 concrete cast against boards
                if (uTx.x < 0.5) { diffuseColor.rgb *= 0.97 + vnoise(q * 1.8) * 0.04 + vnoise(q * 9.5) * 0.025; elevH = (vnoise(q * 32.0) - 0.5) * 0.0004; }
                else if (uTx.x < 1.5) { float n = vnoise(q * 85.0); diffuseColor.rgb *= 0.93 + 0.09 * n * elevNear + 0.05 * vnoise(q * 2.2); elevH = (n - 0.5) * 0.0024; }
                else if (uTx.x < 2.5) { float cmb = sin(q.y * 380.0 + vnoise(q * vec2(3.0, 40.0)) * 3.0); diffuseColor.rgb *= 0.96 + 0.035 * cmb * elevNear + 0.05 * vnoise(q * 1.5); elevH = cmb * 0.0006; }
                else if (uTx.x < 3.5) { diffuseColor.rgb *= 0.86 + 0.16 * vnoise(q * 0.8) + 0.08 * vnoise(q * 3.1); elevH = (vnoise(q * 22.0) - 0.5) * 0.0006; }
                else {
                  float jb = 1.0 - smoothstep(0.0, max(fwidth(q.y) * 1.3, 0.003), abs(fract(q.y / 0.18 + 0.5) - 0.5) * 0.18);
                  diffuseColor.rgb *= (0.90 + 0.10 * hash12(vec2(floor(q.y / 0.18), 2.0))) * (0.94 + 0.08 * vnoise(vec2(q.x * 3.0, q.y * 50.0))) * (1.0 - 0.22 * jb);
                  elevH = -jb * 0.002;
                }
              #elif KIND == 13
                // stone indoors. uTx: 0 travertine, 1 marble, 2 terrazzo, 3 screed, 4 granite; then the size of a slab if it is laid as slabs
                if (uTx.x < 0.5) diffuseColor.rgb *= 0.93 + 0.10 * vnoise(vec2(q.x * 3.5 + sin(q.y * 4.0) * 0.25, q.y * 22.0)) + 0.05 * (vnoise(q * 85.0) - 0.5);
                else if (uTx.x < 1.5) {
                  float wv = vnoise(q * 1.3) * 2.2 + vnoise(q * 4.1) * 0.6;
                  float v1 = (1.0 - smoothstep(0.0, 0.07, abs(fract(q.x * 0.9 + q.y * 0.35 + wv) - 0.5))) * (0.4 + 0.6 * vnoise(q * 9.0));
                  float v2 = 1.0 - smoothstep(0.0, 0.03, abs(fract(q.x * 0.4 - q.y * 1.1 + wv * 1.7) - 0.5));
                  float lum = dot(diffuseColor.rgb, vec3(0.3, 0.6, 0.1));
                  diffuseColor.rgb = mix(diffuseColor.rgb, lum < 0.15 ? vec3(0.72, 0.70, 0.66) : diffuseColor.rgb * 0.45, clamp(0.6 * v1 + 0.35 * v2, 0.0, 1.0));
                } else if (uTx.x < 2.5) {
                  vec2 cq = q * 55.0, ic = floor(cq);
                  float hs = hash12(ic), dd = length(fract(cq) - 0.5 - 0.3 * (vec2(hash12(ic + 3.1), hash12(ic + 7.7)) - 0.5));
                  vec3 chip = mix(mix(vec3(0.55, 0.33, 0.24), vec3(0.20, 0.22, 0.24), step(0.72, hs)), vec3(0.86, 0.80, 0.66), step(0.88, hs));
                  diffuseColor.rgb = mix(diffuseColor.rgb * (0.95 + 0.05 * vnoise(q * 6.0)), chip, (1.0 - smoothstep(0.18, 0.30, dd)) * step(0.45, hs) * 0.8 * smoothstep(0.03, 0.008, fw));
                } else if (uTx.x < 3.5) diffuseColor.rgb *= 0.90 + 0.14 * vnoise(q * 0.9) + 0.07 * vnoise(q * 4.3) + 0.03 * (vnoise(q * 40.0) - 0.5);
                else diffuseColor.rgb *= 0.86 + 0.26 * vnoise(q * 220.0) * vnoise(q * 90.0) * elevNear + 0.06 * vnoise(q * 3.0);
                if (uTx.y > 0.0) {
                  vec2 sl = vec2(uTx.y, uTx.z > 0.0 ? uTx.z : uTx.y), gs = abs(fract(q / sl + 0.5) - 0.5) * sl;
                  diffuseColor.rgb *= 1.0 - 0.35 * (1.0 - smoothstep(0.0, max(fw * 1.2, 0.003), min(gs.x, gs.y)));
                }
              #elif KIND == 14
                // cloth. uTx: 0 linen, 1 stripes, 2 check, 3 boucle, 4 kilim, 5 cord, 6 herringbone; the period; -; how much darker the second tone is
                float k2 = uTx.w > 0.0 ? uTx.w : 0.3, pr = uTx.y > 0.0 ? uTx.y : 0.1, pat = 0.0;
                if (uTx.x < 0.5) pat = 0.0;
                else if (uTx.x < 1.5) pat = band(q.x / pr);
                else if (uTx.x < 2.5) pat = 0.5 * (band(q.x / pr) + band(q.y / pr));
                else if (uTx.x < 3.5) pat = smoothstep(0.35, 0.7, vnoise(q * 110.0)) * 0.6 * elevNear;
                else if (uTx.x < 4.5) { vec2 dq = abs(fract(q / pr) - 0.5); float dm = dq.x + dq.y, aa = max(fw / pr, 1e-3) * 1.5; pat = smoothstep(0.24 - aa, 0.24 + aa, dm) * (1.0 - smoothstep(0.37 - aa, 0.37 + aa, dm)) + 1.0 - smoothstep(0.1 - aa, 0.1 + aa, dm); }
                else if (uTx.x < 5.5) pat = (0.5 + 0.5 * sin(q.x / pr * 6.2832)) * smoothstep(pr, pr * 0.25, fw);
                else pat = band((q.x + (mod(floor(q.y / pr), 2.0) < 0.5 ? 1.0 : -1.0) * q.y) / (pr * 0.5));
                pat = mix(0.4, pat, smoothstep(pr * 0.7, pr * 0.2, fw));
                float weave = (vnoise(vec2(q.x * 120.0, q.y * 18.0)) - 0.5) * 0.07 + (vnoise(vec2(q.x * 18.0, q.y * 120.0)) - 0.5) * 0.07;
                diffuseColor.rgb *= (0.98 + weave * elevNear) * (1.0 - k2 * pat);
                #if ELEV_LOW == 0
                  elevH = (sin(q.x * 260.0) * sin(q.y * 260.0)) * 0.0005 + weave * 0.008;
                #endif
              #elif KIND == 3
                float k = fract((vWP.y - 0.45) / 3.0);
                vec3 skyRefl = mix(vec3(0.20, 0.22, 0.23), vec3(0.50, 0.56, 0.60), smoothstep(0.22, 0.92, k));
                float warmZone = smoothstep(0.05, 0.45, k) * (1.0 - smoothstep(0.55, 0.92, k));
                float roomVar = 0.6 + 0.4 * sin(vWP.x * 1.7 + floor((vWP.y - 0.45) / 3.0) * 2.3);
                diffuseColor.rgb = skyRefl + vec3(0.30, 0.25, 0.17) * warmZone * roomVar * mix(0.75, 0.25, uFx.x);
                diffuseColor.rgb += 0.05 * smoothstep(0.18, 0.0, abs(fract((vWP.x - vWP.y * 0.6) / 2.7) - 0.5));
              #elif KIND == 9
                diffuseColor.rgb *= 0.94 + 0.10 * vnoise(q * 45.0);
              #endif
            }`)
          .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
            if (elevRough >= 0.0) roughnessFactor = elevRough;`)
          .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
            #if ELEV_LOW == 0 && (KIND == 1 || KIND == 2 || KIND == 4 || KIND == 5 || KIND == 6 || KIND == 11 || KIND == 12 || KIND == 14)
            {
              float hb = elevH * uBump * elevNear;
              if (elevNear > 0.0) {
                vec3 vp = -vViewPosition;
                vec3 dpx = dFdx(vp), dpy = dFdy(vp);
                vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
                float det = dot(dpx, r1);
                vec3 grad = sign(det) * (dFdx(hb) * r1 + dFdy(hb) * r2);
                normal = normalize(abs(det) * normal - grad);
              }
            }
            #endif`)
          .replace('#include <aomap_fragment>', `#include <aomap_fragment>
            {
              // the sky: its light on the surface, and its picture in it
              reflectedLight.indirectDiffuse += elevSky(normalize(vWN), 1.0) * uEnv * material.diffuseColor;
              reflectedLight.indirectSpecular += elevSky(inverseTransformDirection(reflect(-geometryViewDir, geometryNormal), viewMatrix), material.roughness) * uEnv
                * EnvironmentBRDF(geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness);
              // the one room light: the same amount on every surface of every room
              reflectedLight.indirectDiffuse += vec3(1.0, 0.965, 0.91) * (uFill * uFx.w) * material.diffuseColor * RECIPROCAL_PI;
              // porch & reveal recess gets deep sky occlusion around z = -0.08..-1.05
              float porchAo = smoothstep(-0.08, -0.95, vWP.z) * (1.0 - smoothstep(-1.15, -2.1, vWP.z)) * (1.0 - min(1.0, uFx.w * 2.0));
              float roomCornerAo = smoothstep(0.38, 0.0, abs(vWP.y - 0.45)) * 0.16 * step(-12.0, vWP.z) * step(vWP.z, -1.05);
              float ao = 1.0 - 0.52 * porchAo - roomCornerAo;
              reflectedLight.indirectDiffuse *= ao; reflectedLight.indirectSpecular *= ao;
            }`)
          .replace('#include <dithering_fragment>', `#include <dithering_fragment>
            {
              // the drawing: only worked out where some of the pixel is still paper. Once the scan has passed, none of this runs
              if (rv < 0.999) {
                vec3 N = normalize(vWN);
                float ndl = dot(N, uSun);
                float lit = elevShadow * smoothstep(-0.02, 0.06, ndl);
                float shade = 1.0 - lit;
                vec2 q = planeUV(vWP, N);
                vec3 col = uPaper;
                float hw = hatchWipe(vWP) * step(0.001, uHatchIn);
                // paper tooth: chalk catches the grain of the sheet, so every mark is a little soft and broken
                float tooth = 0.55 + 0.45 * vnoise(gl_FragCoord.xy * 0.85) * (0.6 + 0.4 * vnoise(gl_FragCoord.xy * 0.23));
                #if KIND == 3
                  col = mix(col, uChalk, 0.10 * hw);
                #endif
                #if KIND == 7
                  shade = 0.0; lit = 0.0;
                #endif
                // sunlit faces are heightened in white chalk, so the light reads lighter than the paper
                col = mix(col, uChalk, lit * hw * mix(0.92, 0.22, uFx.x) * tooth);
                // depth cue: what sits back gets a little darker, so the relief reads before the lens moves
                col -= uDepthCue * 0.05 * smoothstep(0.0, -1.1, vWP.z) * mix(1.0, 0.4, uFx.x);
                float hatchK = mix(0.96, 0.2, uFx.x);
                float hl = lineAt(q.x + q.y, uHatch, uLinePx * 1.5);
                float dense = 1.0 - lineFade(q.x + q.y, uHatch, 3.5);
                hl = mix(hl, 0.32, dense);
                hl *= 0.62 + 0.38 * tooth;
                col = mix(col, uInk, hl * shade * hatchK * hw);
                float det = detailWipe(vWP) * mix(1.0, 0.3, uFx.x);
                #if KIND == 1
                  if (abs(N.y) < 0.7) {
                    vec2 bs = brickSize();
                    float c4 = lineAt(q.y, bs.y * 4.0, uLinePx * 0.7) * lineFade(q.y, bs.y * 4.0, 5.0);
                    float c1 = lineAt(q.y, bs.y, uLinePx * 0.6) * lineFade(q.y, bs.y, 7.0);
                    float c2 = lineAt(q.x + brickOff(floor(q.y / bs.y)) * bs.x, bs.x, uLinePx * 0.6) * lineFade(q.y, bs.y, 9.0);
                    col = mix(col, uInk, max(max(c4 * 0.17, c1 * 0.15), c2 * 0.12) * det);
                  }
                #elif KIND == 4
                  col = mix(col, uInk, (uTx.x < 0.5 ? lineAt(q.x, 0.43, uLinePx * 0.7) * lineFade(q.x, 0.43, 5.0) : lineAt(q.y, 0.36, uLinePx * 0.7) * lineFade(q.y, 0.36, 5.0)) * 0.3 * det);
                #elif KIND == 5 || KIND == 11
                  float pc = (uTx.x > 0.5 && uTx.x < 1.5) ? q.y : q.x, pp = (KIND == 5 && uTx.y > 0.0) ? uTx.y : 0.095;
                  col = mix(col, uInk, lineAt(pc, pp, uLinePx * 0.6) * 0.25 * lineFade(pc, pp, 5.0) * det);
                #elif KIND == 6
                  vec2 g6 = vec2(lineAt(q.x, 0.6, uLinePx * 0.6), lineAt(q.y, 0.6, uLinePx * 0.6));
                  col = mix(col, uInk, max(g6.x, g6.y) * 0.12 * lineFade(q.x, 0.6, 6.0) * det);
                #endif
                gl_FragColor.rgb = mix(col, gl_FragColor.rgb, rv);
              }
              // the edge of the scan, in Rötel: only while it is on the sheet
              float fb = 0.0;
              #if KIND != 7
                if (uSweep.z > -35.0 && uSweep.z < 35.0 && uReal < 1.0) {
                  fb = frontBand(vWP);
                  gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(uAccent, uAccentHi, smoothstep(0.42, 0.92, fb)), clamp(fb * 0.85, 0.0, 0.94));
                }
              #endif
              #if CLEAR == 1
                gl_FragColor.a = mix(1.0, max(gl_FragColor.a, fb), rv);
              #endif
            }`);
    };
    m.customProgramCacheKey = () => `elev-${tier}-${K}-${clear}`;
    return (MATS[key] = m);
  }

  // Lines draft themselves on: each segment starts at a time set by its height (bottom first)
  // and a little randomness, then grows along its length. o.first: drawn before everything (the ground line).
  const LMATS = [];
  const lineCache = {};
  function lineMat(px, o = {}) {
    const key = px + JSON.stringify(o);
    if (lineCache[key]) return lineCache[key];
    const m = new LineMaterial({ color: o.color || 0x2a2522, linewidth: px * 1.5 * DPR, transparent: true, toneMapped: false });
    m.resolution.set(W * DPR, H * DPR);
    m.userData.px = px * 1.5;   // chalk is a heavier stroke than a pen
    m.userData.drawOnly = !!o.drawOnly || !(o.realLines > 0);   // nothing of this pen is left once the whole picture is real
    const drawOnly = o.drawOnly ? 1 : 0, first = o.first ? 1 : 0;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.uniforms.uLineReal = { value: o.realLines == null ? 0.0 : o.realLines };
      sh.uniforms.uOrder = { value: o.order == null ? -1 : o.order };
      sh.vertexShader = 'varying vec3 vLW; varying float vT; varying float vT0;\nuniform vec2 uDrawSpan; uniform vec2 uDrawDir; uniform float uOrder;\n' + sh.vertexShader.replace('void main() {', `void main() {
        vec3 wS = (modelMatrix * vec4(instanceStart, 1.0)).xyz, wE = (modelMatrix * vec4(instanceEnd, 1.0)).xyz;
        vLW = position.y < 0.5 ? wS : wE;
        vT = position.y < 0.5 ? 0.0 : 1.0;
        float hn = clamp((min(dot(wS.xy, uDrawDir), dot(wE.xy, uDrawDir)) - uDrawSpan.x) / (uDrawSpan.y - uDrawSpan.x), 0.0, 1.0);
        float rnd = fract(sin(dot(wS.xy + wE.yx * 1.7, vec2(12.9898, 78.233))) * 43758.5453);
        vT0 = ${first ? '0.0' : '0.13 + 0.6 * (uOrder >= 0.0 ? uOrder : hn) + 0.12 * rnd'};`);
      sh.fragmentShader = `#define DRAW_ONLY ${drawOnly}\n#define FIRST ${first}\nvarying vec3 vLW; varying float vT; varying float vT0; uniform float uLineReal;\n${GLSL_COMMON}\n` + sh.fragmentShader.replace('#include <colorspace_fragment>', `#include <colorspace_fragment>
        if (vLW.y > uCut.x) discard;
        float rv = revealAt(vLW);
        float vis = DRAW_ONLY == 1 ? 1.0 - rv : mix(1.0, uLineReal, rv);
        float grow = (uDraw - vT0) / (FIRST == 1 ? 0.16 : 0.12);
        if (vT > grow) discard;
        if (vis < 0.01) discard;
        // black chalk: the stroke breaks up a little on the grain of the paper
        gl_FragColor.a *= vis * (0.74 + 0.26 * vnoise(gl_FragCoord.xy * 0.8));`);
    };
    m.customProgramCacheKey = () => `eline-${drawOnly}-${first}`;
    LMATS.push(m);
    return (lineCache[key] = m);
  }

  /* ---------- geometry helpers ---------- */
  const box = (x0, y0, z0, x1, y1, z1) => new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const rect = (x0, y0, x1, y1) => { const s = new THREE.Shape(); s.moveTo(x0, y0); s.lineTo(x1, y0); s.lineTo(x1, y1); s.lineTo(x0, y1); s.closePath(); return s; };
  const hole = (x0, y0, x1, y1) => { const p = new THREE.Path(); p.moveTo(x0, y0); p.lineTo(x0, y1); p.lineTo(x1, y1); p.lineTo(x1, y0); p.closePath(); return p; };
  function panel(outer, holes, z0, z1) {
    const s = rect(...outer); holes.forEach((h) => s.holes.push(hole(...h)));
    return new THREE.ExtrudeGeometry(s, { depth: z1 - z0, bevelEnabled: false }).translate(0, 0, z0);
  }
  // Nothing is put into the scene one box at a time. add() and lines() only collect: flush() then merges everything
  // that shares a material (or a pen) into one mesh (one line object), with the offset of its house baked in.
  // A group marked userData.host keeps a node of its own: what moves (door leaves, sliding panes) and the rooms of a
  // house (hidden until the sun arrives, and whenever the lens is in another house).
  const MB = new Map(), LB = new Map();
  const drawOnlyNodes = [], syncs = [];
  let pending = false;
  const hostOf = (parent) => { for (let q = parent; q && q !== root; q = q.parent) if (q.userData.host) return q; return root; };
  function add(geo, m, lw = 1, o = {}) {
    const parent = o.parent || root, host = hostOf(parent);
    const cast = o.cast !== false, receive = o.receive !== false, order = o.order || 0;
    const key = `${host.id}|${m.id}|${cast ? 1 : 0}${receive ? 1 : 0}|${order}`;
    let b = MB.get(key); if (!b) MB.set(key, b = { host, m, cast, receive, order, items: [] });
    b.items.push({ geo, parent });
    if (lw > 0) {
      const eg = new THREE.EdgesGeometry(geo, o.angle || 25);
      pushLines(eg.attributes.position.array, lineMat(lw, { color: o.lineColor, drawOnly: o.drawOnlyLines, realLines: o.realLines }), parent, host, 2);
      eg.dispose();
    }
    pending = true;
  }
  function pushLines(arr, lm, parent, host, order) {
    const key = `${host.id}|${lm.id}|${order}`;
    let b = LB.get(key); if (!b) LB.set(key, b = { host, lm, order, items: [] });
    b.items.push({ arr, parent });
    pending = true;
  }
  function lines(segs, lw, o = {}) {
    const parent = o.parent || root;
    pushLines(segs, lineMat(lw, { drawOnly: o.drawOnly !== false, color: o.color, first: o.first, realLines: o.realLines }), parent, hostOf(parent), 3);
  }
  const _rel = new THREE.Matrix4(), _inv = new THREE.Matrix4(), _p = new THREE.Vector3(), _bb = new THREE.Box3();
  const relTo = (parent, host) => { _inv.copy(host.matrixWorld).invert(); return _rel.multiplyMatrices(_inv, parent.matrixWorld); };
  const isIdentity = (m) => m.elements.every((v, i) => Math.abs(v - (i % 5 === 0 ? 1 : 0)) < 1e-9);
  function flush() {
    if (!pending) return;
    pending = false;
    scene.updateMatrixWorld(true);
    const castBox = sunAim.box || new THREE.Box3();
    MB.forEach((b) => {
      const geos = b.items.map(({ geo, parent }) => {
        // position and normal are all the shaders read. Everything gets an index, so boxes and extrusions merge.
        Object.keys(geo.attributes).forEach((k) => { if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k); });
        if (!geo.index) { const n = geo.attributes.position.count, ix = new Uint32Array(n); for (let i = 0; i < n; i++) ix[i] = i; geo.setIndex(new THREE.BufferAttribute(ix, 1)); }
        const rel = relTo(parent, b.host);
        if (!isIdentity(rel)) geo.applyMatrix4(rel);
        return geo;
      });
      const merged = geos.length > 1 ? mergeGeometries(geos, false) : geos[0];
      if (geos.length > 1) geos.forEach((g) => g.dispose());
      const mesh = new THREE.Mesh(merged, b.m);
      mesh.castShadow = b.cast; mesh.receiveShadow = b.receive; mesh.renderOrder = b.order;
      if (b.cast) mesh.customDepthMaterial = b.m.userData.noCut ? DEPTH_TREE : DEPTH;
      b.host.add(mesh);
      if (b.m.userData.drawOnly) drawOnlyNodes.push(mesh);
      if (b.cast) { merged.computeBoundingBox(); castBox.union(_bb.copy(merged.boundingBox).applyMatrix4(b.host.matrixWorld)); }
    });
    MB.clear();
    LB.forEach((b) => {
      let n = 0; b.items.forEach((it) => { n += it.arr.length; });
      const pos = new Float32Array(n); let k = 0;
      b.items.forEach(({ arr, parent }) => {
        const rel = relTo(parent, b.host), id = isIdentity(rel);
        for (let i = 0; i < arr.length; i += 3) {
          if (id) { pos[k++] = arr[i]; pos[k++] = arr[i + 1]; pos[k++] = arr[i + 2]; }
          else { _p.set(arr[i], arr[i + 1], arr[i + 2]).applyMatrix4(rel); pos[k++] = _p.x; pos[k++] = _p.y; pos[k++] = _p.z; }
        }
      });
      const l = new LineSegments2(new LineSegmentsGeometry().setPositions(pos), b.lm);
      l.renderOrder = b.order;
      b.host.add(l);
      if (b.lm.userData.drawOnly) drawOnlyNodes.push(l);
    });
    LB.clear();
    if (!castBox.isEmpty()) { sunAim.box = castBox; fitShadow(); }
    drawOnlyNodes.forEach((n) => { n.visible = !allReal; });
    shadowDirty = true; dirty = true;
  }
  const loop = (pts, z) => { const s = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s.push(a[0], a[1], z, b[0], b[1], z); } return s; };

  /* ---------- the house ---------- */
  // x along the street, y up, z towards the street. Facade plane z = 0 (or the setback).
  // Two storeys: ground floor +0.30 (two steps up), upper floor +3.40, eaves +6.70, ridge +9.20.
  // Every house is described with its door on the left; `door: 'right'` mirrors it.
  const T = 0.4, G0 = 0.3, L1 = 3.4, RH = 2.5;
  function windowIn(g, x0, y0, x1, y1, recess, o) {
    const fw = 0.062, fw2 = 0.032, z1 = -recess, z0 = z1 - 0.075;
    const lw = o.faint ? 0 : 0.7;
    const fm = mat('steel', { faint: o.faint, color: o.frame });
    // outer casement frame
    add(panel([x0, y0, x1, y1], [[x0 + fw, y0 + fw, x1 - fw, y1 - fw]], z0, z1), fm, lw, { parent: g, lineColor: o.lc, realLines: o.rl });
    // inner stepped sash frame, for depth
    if (!o.faint) {
      add(panel([x0 + fw, y0 + fw, x1 - fw, y1 - fw], [[x0 + fw + fw2, y0 + fw + fw2, x1 - fw - fw2, y1 - fw - fw2]], z0 - 0.015, z1 - 0.022), fm, 0, { parent: g, cast: false });
    }
    const n = o.panes || (x1 - x0 > 1.5 ? 2 : 1);
    for (let i = 1; i < n; i++) {
      const mx = x0 + (x1 - x0) * i / n;
      add(box(mx - 0.028, y0 + fw, z0 + 0.008, mx + 0.028, y1 - fw, z1), fm, lw, { parent: g, lineColor: o.lc, realLines: o.rl });
    }
    if (o.transom) add(box(x0 + fw, o.transom - 0.028, z0 + 0.008, x1 - fw, o.transom + 0.028, z1), fm, lw, { parent: g, lineColor: o.lc, realLines: o.rl });
    add(new THREE.PlaneGeometry(x1 - x0 - 0.02, y1 - y0 - 0.02).translate((x0 + x1) / 2, (y0 + y1) / 2, z0 + 0.035), mat('glass', { faint: o.faint }), 0, { parent: g, cast: false });
    if (!o.faint) {
      const segs = [];
      for (let i = 0; i < n; i++) {
        const px0 = x0 + (x1 - x0) * i / n + 0.14, py1 = (o.transom || y1) - 0.16;
        const L = Math.min(0.5, (x1 - x0) / n * 0.4);
        segs.push(px0, py1 - L, 0.02 - recess, px0 + L, py1, 0.02 - recess);
        segs.push(px0 + 0.1, py1 - L - 0.02, 0.02 - recess, px0 + L + 0.08, py1 - 0.04, 0.02 - recess);
      }
      lines(segs, 0.6, { parent: g });
    }
    if (o.sill) {
      const st = mat('stone', { faint: o.faint, color: o.stone });
      add(box(x0 - 0.06, y0 - 0.068, -T + 0.06, x1 + 0.06, y0 + 0.012, 0.065), st, o.faint ? 0 : 0.9, { parent: g, lineColor: o.lc, realLines: o.rl });
      if (!o.faint) {
        add(box(x0 - 0.05, y0 - 0.082, 0.0, x1 + 0.05, y0 - 0.068, 0.048), st, 0, { parent: g });
      }
    }
  }

  // what a house can vary: v.wall ('brick' | 'plaster' | 'wood'), v.brick (its colour) and v.wallTx (bond, boards, render:
  // see GLSL_KINDS), v.doorColor, v.frame (windows), v.stone (sills, copings), v.roofColor and v.roofTx (zinc, tiles,
  // slate, planted), v.first ('bay' | 'frame' | 'plain' | 'balcony'), v.roof ('pitch' | 'front' | 'mono' | 'none'),
  // v.dormer, v.terrace, v.chimney, v.sideL / v.sideR (an outer wall where no neighbour stands).
  // v.interior: true (rooms now), 'later' (rooms when rooms() is called), false (a house that cannot be entered).
  // v.plan ('A' ... 'D') and v.fit (see interior.js): which rooms, and what they are made of.
  function house(ox, v = {}) {
    const g = new THREE.Group(); g.position.set(ox, 0, v.setback || 0); root.add(g);
    const faint = !!v.faint, lc = faint ? 0x8a7d69 : v.accent ? 0xa5432b : undefined, LW = faint ? 0.8 : 1.5, lw = faint ? 0.6 : 0.8;
    const rl = v.accent ? 0.75 : undefined;
    const PAR = v.par || 6.7;
    const doorL = v.door !== 'right';
    const X = (x) => (doorL ? x : 6 - x);
    const bx = (x0, y0, z0, x1, y1, z1) => (doorL ? box(x0, y0, z0, x1, y1, z1) : box(6 - x1, y0, z0, 6 - x0, y1, z1));
    const R4 = (x0, y0, x1, y1) => (doorL ? [x0, y0, x1, y1] : [6 - x1, y0, 6 - x0, y1]);
    const EX = [0.5, 2.9], DX = [0.7, 2.7], pz = -1.2;        // the porch, and the glass door at the back of it
    const first = v.first || 'bay';
    const holes = [R4(EX[0], G0, EX[1], 3.0), R4(3.55, 1.0, 5.5, 3.0)];
    // upstairs every opening stands on the axis of the one below it: the window (or balcony door, or bay) over the
    // porch is exactly as wide as the porch, the tall window sits over the middle of the street window
    const UP = [EX[0], 3.9, EX[1], 5.9], SIDE = [3.875, 3.9, 5.175, 6.0];
    const ff = first === 'frame' ? [[0.9, 3.95, 5.1, 6.0]] : [R4(...UP), R4(...SIDE)];
    holes.push(...ff);
    const brick = mat(v.wall || 'brick', { faint, color: v.brick, tx: v.wallTx });
    const DC = v.doorColor || 0x9a3f2a;
    const O = { parent: g, lineColor: lc, realLines: rl };
    const W = { faint, lc, rl, frame: v.frame, stone: v.stone };       // what every window of this house shares
    add(panel([0, 0, 6, PAR], holes, -T, 0), brick, LW, O);
    const st = mat('stone', { faint, color: v.stone });
    const base = mat('stone', { faint, color: 0x2f2c2a });
    const stm = mat('steel', { faint, color: v.frame });
    const zm = mat('zinc', { faint });
    const rm = v.roofColor || v.roofTx ? mat('zinc', { faint, color: v.roofColor, tx: v.roofTx, ...(v.roofTx && v.roofTx[0] ? { metal: 0, rough: 0.9 } : {}) }) : zm;      // the roof skin

    // a base course of dark stone, with a thin ledge on top
    add(bx(0, 0, 0, EX[0], G0, 0.026), base, lw, O);
    add(bx(EX[1], 0, 0, 6, G0, 0.026), base, lw, O);
    if (!faint) {
      add(bx(0, G0 - 0.02, 0.026, EX[0], G0 + 0.01, 0.042), base, 0, { parent: g });
      add(bx(EX[1], G0 - 0.02, 0.026, 6, G0 + 0.01, 0.042), base, 0, { parent: g });
    }

    // the porch, set back 1.2 m: cheeks of the wall, a stone soffit, a stone floor, two steps up from the street
    add(bx(EX[0] - 0.2, G0, pz, EX[0], 3.0, -T), brick, lw, O);
    add(bx(EX[1], G0, pz, EX[1] + 0.2, 3.0, -T), brick, lw, O);
    add(bx(EX[0] - 0.2, 3.0, pz, EX[1] + 0.2, 3.15, -T), st, lw, O);
    add(bx(EX[0], G0 - 0.15, pz, EX[1], G0, 0), base, lw, O);
    const sp = new THREE.Shape([[0, 0], [0.6, 0], [0.6, 0.15], [0.3, 0.15], [0.3, 0.3], [0, 0.3]].map((p) => new THREE.Vector2(p[0], p[1])));
    add(new THREE.ExtrudeGeometry(sp, { depth: EX[1] - EX[0], bevelEnabled: false }).rotateY(-Math.PI / 2).translate(Math.max(X(EX[0]), X(EX[1])), 0, 0), base, lw, O);
    if (!faint) {
      add(bx(EX[0], 0.125, 0.3, EX[1], 0.152, 0.622), base, 0, { parent: g });
      add(bx(EX[0], 0.275, 0.0, EX[1], 0.302, 0.322), base, 0, { parent: g });
      // the house number on the cheek, a line of light in the soffit (real mode only)
      const px = X(EX[1]) + (doorL ? -0.013 : 0);
      add(box(px, 1.58, -0.36, px + 0.013, 1.74, -0.18), st, 0.5, { parent: g });
      add(bx((EX[0] + EX[1]) / 2 - 0.7, 2.985, -0.74, (EX[0] + EX[1]) / 2 + 0.7, 3.0, -0.66), mat('interior', { realOnly: true }), 0, { parent: g, cast: false });
    }

    // the door: a steel portal, and in it two leaves of glass in frames of the door's colour, 2.0 m by 2.55 m together.
    // A house that can be entered has leaves that swing and glass you can see through.
    const show = !faint && v.interior !== false;
    add(panel(R4(EX[0], G0, EX[1], 3.0), [R4(DX[0], G0, DX[1], 2.86)], pz - 0.1, pz), mat('steel', { faint, color: DC }), lw, O);
    const hA = Math.min(X(DX[0]), X(DX[1])) + 0.012, hB = Math.max(X(DX[0]), X(DX[1])) - 0.012, wL = (hB - hA) / 2 - 0.004;
    const red = mat('lacquer', v.doorColor ? { faint, color: DC } : { faint }), doorGlass = show ? mat('glass', { clear: true, door: true }) : mat('glass', { faint });
    const leaves = [1, -1].map((s) => {
      const piv = new THREE.Group(); piv.position.set(s > 0 ? hA : hB, 0, pz - 0.035); g.add(piv);
      piv.userData.host = show;                              // only the leaves of a house you can enter swing: the others are merged into the row
      const q = (a, b) => (s > 0 ? [a, b] : [-b, -a]);       // along the leaf, from the hinge
      const f = 0.06, y0 = G0 + 0.012, y1 = 2.85, bars = [];
      const B = (a, b, c, d, z0 = -0.05, z1 = 0) => { const [p0, p1] = q(a, b); return box(p0, c, z0, p1, d, z1); };
      bars.push(B(0, wL, y0, y0 + 0.11), B(0, wL, y1 - f, y1), B(0, f, y0, y1), B(wL - f, wL, y0, y1));
      add(mergeGeometries(bars), red, faint ? lw : 1.1, { parent: piv, lineColor: lc || (faint ? undefined : 0xa5432b), realLines: rl });   // the door is drawn in Rötel
      add(B(f, wL - f, y0 + 0.11, y1 - f, -0.031, -0.019), doorGlass, 0, { parent: piv, cast: false });
      if (!faint) {
        add(B(wL - 0.16, wL - 0.125, 1.0, 1.9, 0.03, 0.06), stm, 0.6, { parent: piv });       // pulls, outside and in
        add(B(wL - 0.155, wL - 0.13, 1.1, 1.13, 0, 0.035), stm, 0, { parent: piv }); add(B(wL - 0.155, wL - 0.13, 1.77, 1.8, 0, 0.035), stm, 0, { parent: piv });
        add(B(wL - 0.16, wL - 0.125, 1.0, 1.9, -0.11, -0.08), stm, 0.6, { parent: piv });
        add(B(wL - 0.155, wL - 0.13, 1.1, 1.13, -0.085, -0.05), stm, 0, { parent: piv }); add(B(wL - 0.155, wL - 0.13, 1.77, 1.8, -0.085, -0.05), stm, 0, { parent: piv });
        const segs = []; const [a, b] = q(0.2, 0.62); segs.push(a, 2.1, 0.012, b, 2.52, 0.012, a + 0.1, 2.08, 0.012, b + 0.08, 2.48, 0.012);
        lines(segs, 0.6, { parent: piv });
      }
      return { piv, s };
    });

    // ground floor: the street window
    windowIn(g, ...R4(3.55, 1.0, 5.5, 3.0), 0.22, { ...W, sill: true, panes: 2 });
    // upstairs
    if (first === 'frame') {
      add(panel([0.72, 3.77, 5.28, 6.18], [[0.9, 3.95, 5.1, 6.0]], 0, 0.38), mat('stone', { faint, color: v.stone ?? 0xd6cfc0 }), LW, O);
      if (!faint) add(panel([0.85, 3.9, 5.15, 6.05], [[0.9, 3.95, 5.1, 6.0]], 0, 0.22), mat('stone', { faint, color: 0xc2baa9 }), 0, { parent: g });
      windowIn(g, 0.9, 3.95, 5.1, 6.0, 0.16, { ...W, panes: 3, transom: 5.4 });
    } else {
      if (first === 'bay') {
        // a bay of zinc, 800 mm out over the porch and as wide as the porch with its cheeks, glazed across its front
        const b0 = UP[0] - 0.15, b1 = UP[2] + 0.15;
        add(bx(b0, 3.72, 0, b1, 3.9, 0.8), zm, LW, O);
        add(bx(b0, 5.9, 0, b1, 6.08, 0.8), zm, LW, O);
        add(bx(b0, 3.9, 0, UP[0], 5.9, 0.8), zm, lw, O);
        add(bx(UP[2], 3.9, 0, b1, 5.9, 0.8), zm, lw, O);
        windowIn(g, ...R4(...UP), -0.74, { ...W, panes: 3 });
      } else {
        // a window over the porch; with 'balcony' it is the balcony door: a stone slab and a guard of steel bars in front of it
        windowIn(g, ...R4(...UP), 0.2, { ...W, sill: first !== 'balcony', panes: 2, transom: 5.35 });
        if (first === 'balcony') {
          const s0 = UP[0] - 0.3, s1 = UP[2] + 0.3;
          add(bx(s0, 3.7, 0, s1, 3.86, 1.05), st, LW, O);
          const rail = [bx(s0, 4.84, 0.98, s1, 4.88, 1.04), bx(s0, 4.84, 0, s0 + 0.04, 4.88, 1.04), bx(s1 - 0.04, 4.84, 0, s1, 4.88, 1.04)];
          for (let x = s0 + 0.02; x < s1 - 0.03; x += 0.118) rail.push(bx(x, 3.86, 1.0, x + 0.02, 4.84, 1.02));
          for (let z = 0.14; z < 0.95; z += 0.2) rail.push(bx(s0 + 0.01, 3.86, z, s0 + 0.03, 4.84, z + 0.02), bx(s1 - 0.03, 3.86, z, s1 - 0.01, 4.84, z + 0.02));
          add(mergeGeometries(rail), stm, faint ? 0 : 0.55, O);
        }
      }
      // beside it a tall window with a guard of steel bars
      windowIn(g, ...R4(...SIDE), 0.2, { ...W, sill: true, panes: 1, transom: 5.35 });
      const bars = [];
      for (let x = SIDE[0] + 0.02; x < SIDE[2] - 0.01; x += 0.115) bars.push(bx(x, 3.92, 0.03, x + 0.02, 4.86, 0.05));
      bars.push(bx(SIDE[0] - 0.02, 4.86, 0.02, SIDE[2] + 0.02, 4.9, 0.062));
      if (!faint) bars.push(bx(SIDE[0] - 0.02, 3.94, 0.026, SIDE[2] + 0.02, 3.965, 0.054));
      add(mergeGeometries(bars), stm, faint ? 0 : 0.55, O);
    }

    const roof = v.roof || 'pitch';
    const V2 = (pts) => pts.map((q) => new THREE.Vector2(q[0], q[1]));
    const alongX = (shape, depth, x1) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(x1, 0, 0);   // a profile in z/y, extruded from x1 - depth to x1
    if (roof === 'mono') {
      // one slope that rises to the street: a band of wall above the eaves with a strip of clerestory glass
      add(panel([0, PAR, 6, PAR + 1.55], [[0.9, PAR + 0.42, 5.1, PAR + 1.2]], -T, 0), brick, LW, O);
      windowIn(g, 0.9, PAR + 0.42, 5.1, PAR + 1.2, 0.14, { ...W, panes: 4 });
      add(alongX(new THREE.Shape(V2([[0.75, PAR + 1.55], [0.75, PAR + 1.8], [-9.56, PAR + 0.4], [-9.56, PAR + 0.15]])), 6, 6), rm, LW, O);
    } else if (roof !== 'none') {
      // eaves, then a roof that falls to the street, and a chimney on the ridge
      add(box(0, PAR - 0.03, -T, 6, PAR + 0.1, 0.36), rm, LW, O);
      add(alongX(new THREE.Shape(V2([[0.36, PAR + 0.1], [-4.6, PAR + RH], [-9.56, PAR + 0.1]])), 6, 6), rm, LW, O);
      if (v.chimney !== false) {
        add(bx(4.5, PAR + RH - 0.9, -5.0, 5.3, PAR + RH + 0.85, -4.2), brick, lw, O);
        add(bx(4.46, PAR + RH + 0.85, -5.04, 5.34, PAR + RH + 0.93, -4.16), st, lw, O);
      }
      if (roof === 'front') {
        // a gable to the street: the wall runs up into a triangle, its own little roof meets the big one behind
        const gh = 2.35, gz = 3.5;
        add(new THREE.ExtrudeGeometry(new THREE.Shape(V2([[0.55, PAR], [5.45, PAR], [3, PAR + gh]])), { depth: gz, bevelEnabled: false }).translate(0, 0, -gz), brick, LW, O);
        add(new THREE.ExtrudeGeometry(new THREE.Shape(V2([[0.22, PAR - 0.04], [3, PAR + gh + 0.3], [5.78, PAR - 0.04], [5.52, PAR - 0.04], [3, PAR + gh + 0.06], [0.48, PAR - 0.04]])), { depth: gz + 0.32, bevelEnabled: false }).translate(0, 0, -gz), rm, LW, O);
        windowIn(g, 2.45, PAR + 0.32, 3.55, PAR + 1.28, -0.035, { ...W, panes: 1 });
      }
      if (v.dormer) {
        // a dormer of zinc on the street slope
        const d0 = PAR + 0.5, d1 = PAR + 1.82, dz = -0.72;
        add(panel([1.5, d0, 4.5, d1], [[1.72, PAR + 0.68, 4.28, PAR + 1.62]], dz - 0.12, dz), zm, LW, O);
        add(box(1.5, PAR + 0.3, -3.1, 1.62, d1, dz), zm, lw, O); add(box(4.38, PAR + 0.3, -3.1, 4.5, d1, dz), zm, lw, O);
        add(box(1.4, d1, -3.3, 4.6, d1 + 0.1, dz + 0.14), zm, LW, O);
        windowIn(g, 1.72, PAR + 0.68, 4.28, PAR + 1.62, -dz + 0.05, { ...W, panes: 3 });
      }
    } else {
      // a parapet with a stone coping, and the flat roof behind it
      add(box(0, PAR, -T - 0.04, 6, PAR + 0.085, 0.055), st, LW, O);
      if (!faint) { add(box(0, PAR - 0.035, 0, 6, PAR, 0.028), st, 0, { parent: g }); add(box(0, PAR - 0.34, -9.6, 6, PAR - 0.2, -T), mat('paving', { color: 0xbdb6a8 }), 0, { parent: g }); }
      if (v.terrace) {
        // a roof terrace: a guard of steel behind the coping, and the head of the stair
        const rail = [box(0.08, PAR + 1.02, -0.34, 5.92, PAR + 1.06, -0.28)];
        for (let x = 0.1; x < 5.9; x += 0.145) rail.push(box(x, PAR + 0.085, -0.32, x + 0.02, PAR + 1.02, -0.3));
        add(mergeGeometries(rail), stm, faint ? 0 : 0.55, O);
        add(bx(3.3, PAR, -7.6, 5.9, PAR + 2.35, -4.4), brick, LW, O);
        add(bx(3.24, PAR + 2.35, -7.66, 5.96, PAR + 2.44, -4.34), st, lw, O);
      }
    }
    // an outer wall with its gable, where the house has no neighbour
    for (const side of [v.sideL ? 0 : null, v.sideR ? 6.3 : null]) {
      if (side === null) continue;
      const top = roof === 'none' ? [[0, PAR + 0.08], [-9.56, PAR + 0.08]] : roof === 'mono' ? [[0, PAR + 1.55], [-9.56, PAR + 0.18]] : [[0, PAR], [-4.6, PAR + RH - 0.05], [-9.56, PAR]];
      add(alongX(new THREE.Shape(V2([[0, 0], ...top, [-12.3, PAR - 0.3], [-12.3, 0]])), 0.3, side), brick, LW, O);
    }
    // the back of the house: the wall above the garden glass (down to the ground where nobody goes in), a low roof
    // over the last bay. A house with the high living room at the garden has a window in it.
    if (!faint) {
      add(panel([0, show ? L1 - 0.25 : 0, 6, PAR - 0.3], show && v.plan === 'B' ? [R4(1.3, 3.9, 4.7, 5.9)] : [], -12.3, -12.0), brick, 0, { parent: g });
      add(box(-0.02, PAR - 0.3, -12.34, 6.02, PAR - 0.22, -11.98), st, 0, { parent: g });
      add(box(0, PAR - 0.34, -12.0, 6, PAR - 0.2, -9.5), zm, 0, { parent: g });
    }

    // The rooms. Only a house that can be entered has any. Its rooms are a node of their own (gi): hidden while the
    // sheet is a drawing, and whenever the page says so (the lens is in another house). Until they are there, and
    // while they are hidden, a plain block stands behind the glass of the door (gBack), so nobody looks through the house.
    let inside = null, doorA = 0, gardenD = 0, shown = true;
    const gi = new THREE.Group(), gBack = new THREE.Group();
    if (show) {
      gi.userData.host = gBack.userData.host = true; gi.visible = false; g.add(gi, gBack);
      add(box(0.24, 0, -12, 5.76, PAR - 0.3, pz - 0.14), mat('plain', { color: 0x8d8578 }), 0, { parent: gBack, cast: false });
    } else {
      add(box(0, 0, -12, 6, PAR - 0.3, pz - 0.12), mat('plain', { faint }), 0, { parent: g });
      // two floor plates in it: on the building site (cut) a house that cannot be entered is a shell with its floors
      if (!faint) { const sl = mat('plain', { color: 0xcfc8ba }); add(box(0.05, 0, -11.95, 5.95, G0, pz - 0.17), sl, 0, { parent: g, cast: false }); add(box(0.05, L1 - 0.25, -11.95, 5.95, L1, pz - 0.17), sl, 0, { parent: g, cast: false }); }
    }
    const sync = () => { const on = !!inside && shown && live === true; if (gi.visible !== on) { gi.visible = on; gBack.visible = !on; shadowDirty = true; dirty = true; } };
    if (show) syncs.push(sync);
    const rooms = () => {
      if (inside || !show) return;
      inside = buildInterior({ THREE, add, box, panel, mat, tree, mulberry }, { g: gi, doorL, PAR, O, v, plan: v.plan, fit: v.fit });
      pending = true; sync(); dirty = true;
    };
    if (show && v.interior !== 'later') rooms();

    if (v.relief) {
      const bricks = [];
      const bay = doorL ? [0.15, 3.25] : [2.75, 5.85]; // no headers behind the bay
      const inHole = (x, y) => holes.some(([a, b, c, d]) => x > a - 0.12 && x < c + 0.12 && y > b - 0.12 && y < d + 0.1) || y < G0 + 0.05 || y > PAR - 0.1 || (first !== 'frame' && y > 3.6 && y < 6.2 && x > bay[0] && x < bay[1]);
      for (let c = 0; c * 0.075 < PAR; c++) {
        const off = (c % 2) * 0.5;
        for (let i = -1; i < 28; i++) {
          const u = 2 * i + 1 - 2 * off, P = 12;
          if ((((u + c) % P) + P) % P !== 1 && (((u - c) % P) + P) % P !== 1) continue;
          const x = (i - off) * 0.225 + 0.01, y = c * 0.075 + 0.01;
          if (x < 0 || x + 0.215 > 6) continue;
          if (inHole(x + 0.1, y + 0.03)) continue;
          bricks.push(box(x, y, 0, x + 0.215, y + 0.065, v.relief));
        }
      }
      add(mergeGeometries(bricks), mat('brick', { faint, color: v.header || 0x2f2c2a }), faint ? 0 : 0.55, O);
    }

    const zs = v.setback || 0;
    return {
      g, PAR, ox, doorL, rooms, walkable: show,
      get built() { return !!inside; }, get plan() { return inside ? inside.plan : (PLANS[v.plan] ? v.plan : 'A'); }, get fit() { return inside ? inside.fit : v.fit; },
      door: [ox + X((DX[0] + DX[1]) / 2), 1.7, zs + pz],
      doorX: [ox + Math.min(X(DX[0]), X(DX[1])), ox + Math.max(X(DX[0]), X(DX[1]))],
      // a point of the house (written for a house with its door on the left) in the world
      at(x, y, z) { return [ox + X(x), y, zs + z]; },
      // a camera key from where the lens stands, written for a house with its door on the left
      // (see viewKey): the house mirrors it if its door is on the right
      key(p, cam, yaw, pitch, fov, fh, extra) { return viewKey(p, [ox + X(cam[0]), cam[1], zs + cam[2]], doorL ? yaw : -yaw, pitch, fov, fh, extra); },
      // the rooms are drawn, or not (the lens is in another house)
      show(on) { shown = !!on; sync(); },
      // another floor, other joinery, another stone, while you look at it. role: 'floor' | 'wood' | 'stone', def: [kind, options]
      swap(role, def) {
        if (!inside) return;
        const from = inside.M[role], to = inside.inn(def[0], def[1]);
        if (from === to) return;
        gi.traverse((n) => { if (n.isMesh && n.material === from) n.material = to; });
        inside.M[role] = to; dirty = true;
      },
      setDoor(open01) {
        const a = clamp01(open01) * (82 * Math.PI / 180);
        if (!show || a === doorA) return;
        doorA = a;
        leaves.forEach(({ piv, s }) => { piv.rotation.y = s * a; });
        shadowDirty = true;
      },
      setGardenDoor(open01) {
        const d = clamp01(open01) * 1.3;
        if (!inside || d === gardenD) return;
        gardenD = d;
        inside.gDoorL.position.x = -d; inside.gDoorR.position.x = d;
        shadowDirty = true;
      },
    };
  }

  function street(x0, x1, sky = true) {
    add(box(x0, -0.15, 0, x1, 0, 3.2), mat('paving'), 0, { cast: false });
    add(box(x0, -0.15, 3.2, x1, 0.01, 3.38), mat('stone'), 0, { cast: false });
    add(new THREE.PlaneGeometry(x1 - x0, 30).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, -0.15, 18.4), mat('paving'), 0, { cast: false });
    if (sky) add(new THREE.PlaneGeometry(400, 120).translate(0, 40, -60), mat('sky'), 0, { cast: false, order: 1 });   // drawn last of the solids: it only costs the pixels that stay sky
    lines([x0, 0, 3.4, x1, 0, 3.4], 2.6, { first: true });
  }

  function figure(x, z, s = 1, flip = false) {
    const P = [[0, 1.75], [0.07, 1.73], [0.1, 1.66], [0.09, 1.58], [0.06, 1.53], [0.2, 1.47], [0.24, 1.36], [0.26, 1.06], [0.24, 0.84], [0.2, 0.86], [0.2, 1.2], [0.18, 1.0], [0.17, 0.84], [0.14, 0.45], [0.13, 0.06], [0.17, 0.0], [0.03, 0.0], [0.02, 0.8]];
    const pts = [...P, ...P.slice(1, -1).reverse().map(([a, b]) => [-a, b])].map(([a, b]) => [x + (flip ? -a : a) * s, b * s]);
    const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
    add(new THREE.ShapeGeometry(shape).translate(0, 0, z), mat('plain', { drawOnly: true, color: 0xdfd2ba }), 0, { cast: false });
    lines(loop(pts, z + 0.01), 0.9);
  }

  // a tree. o.parent: it stands in a garden (in the coordinates of that house, smaller, and not on the drawing), o.leaves: three colours
  function tree(x, z, h = 7.5, r = 2.3, o = {}) {
    const grey = new THREE.Color(0x8a7a66), LEAVES = (o.leaves || [0xa8452f, 0xc9622a, 0xd98b2f]).map((c) => new THREE.Color(c).lerp(grey, 0.42).getHex());   // late October: mostly russet, some orange, a few ochre
    const R = mulberry(Math.round(x * 100) + 7), P = o.parent ? { parent: o.parent } : {}, k = { realOnly: true, noCut: true, ...(o.parent ? { in: 0.5 } : {}) };
    add(new THREE.CylinderGeometry(0.1, 0.17, h * 0.62, 8).translate(x, h * 0.31, z), mat('wood', { ...k, color: 0x4a3524 }), 0, P);
    const blobs = [[], [], []], n = o.parent ? 46 : 70;
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, e = (R() - 0.5) * 2.4, rr = r * (0.25 + 0.65 * Math.sqrt(R()));
      blobs[i % 3 === 0 ? 1 : i % 11 === 0 ? 2 : 0].push(new THREE.IcosahedronGeometry(0.22 + R() * 0.28, o.parent ? 0 : 1).translate(x + Math.cos(a) * rr, h - r + Math.sin(e) * r * 0.75, z + Math.sin(a) * rr * 0.7));
    }
    blobs.forEach((bl, i) => { if (bl.length) add(mergeGeometries(bl), mat('foliage', { ...k, color: LEAVES[i] }), 0, P); });
    if (o.parent) return;
    const zz = z + 0.3, segs = [];
    segs.push(x - 0.11, 0, zz, x - 0.06, h - r * 1.1, zz, x + 0.13, 0, zz, x + 0.07, h - r * 1.1, zz);
    segs.push(x - 0.05, h - r * 1.2, zz, x - r * 0.45, h - r * 0.55, zz, x + 0.05, h - r * 1.05, zz, x + r * 0.5, h - r * 0.35, zz, x, h - r * 0.9, zz, x - r * 0.05, h - r * 0.1, zz);
    const pts = [];
    for (let i = 0; i < 120; i++) {
      const a = i / 120 * Math.PI * 2, bump = Math.pow(Math.abs(Math.sin(a * 6.5 + 0.4)), 0.6);
      pts.push([x + Math.cos(a) * r * (0.9 + 0.1 * bump), h - r + Math.sin(a) * r * 1.02 * (0.9 + 0.1 * bump)]);
    }
    segs.push(...loop(pts, zz));
    lines(segs, 0.75);
  }

  /* ---------- camera ---------- */
  // A key: target t, frame height fh at the target (metres), fov (degrees), yaw and pitch (degrees,
  // where the camera sits around the target). fh and fov blend in log space, so going from a 2 degree
  // lens to a 50 degree one keeps the picture's size: the dolly zoom.
  const camera = new THREE.PerspectiveCamera(2, W / H, 1, 3000);
  const D2R = Math.PI / 180;
  function keyFor(k) { return phone() && k.phone ? { ...k, ...k.phone } : k; }
  function fitFh(k) { return Math.max(k.fh, (k.minW || 0) / (W / H)); }
  function camAt(p, keys) {
    let a = keyFor(keys[0]), b = a, u = 0, ia = 0;
    for (let i = 0; i < keys.length - 1; i++) {
      if (p >= keys[i].p) { a = keyFor(keys[i]); b = keyFor(keys[i + 1]); u = span(p, keys[i].p, keys[i + 1].p); ia = i; }
    }
    if (p >= keys[keys.length - 1].p) { a = b = keyFor(keys[keys.length - 1]); u = 0; ia = keys.length - 1; }
    const e = (a.ease || ease)(u);
    const L = (x, y) => lerp(x, y, e), LL = (x, y) => Math.exp(lerp(Math.log(x), Math.log(y), e));
    if (a.cam && b.cam) {
      // between two keys written from where the lens stands, the lens walks a straight line and turns on the way
      // (blending the targets would swing it out in an arc, through whatever stands beside the way)
      let fh = LL(fitFh(a), fitFh(b)), fov = LL(a.fov, b.fov);
      const yaw = L(a.yaw, b.yaw), pitch = L(a.pitch, b.pitch);
      const d = (fh / 2) / Math.tan(fov * D2R / 2), cy = Math.cos(pitch * D2R);
      // an upright screen sees a narrow slice of a room: indoors the lens opens until it takes in 52 degrees across.
      // The place of the lens stays (same distance, a taller frame). Coming in from the street it opens on the way.
      const k = Math.min(1.8, Math.max(1, 0.488 / (Math.tan(fov * D2R / 2) * (W / H))));
      if (k > 1) { const kk = 1 + (k - 1) * (ia > 0 && keys[ia - 1].cam ? 1 : e); fov = 2 * Math.atan(Math.tan(fov * D2R / 2) * kk) / D2R; fh = 2 * d * Math.tan(fov * D2R / 2); }
      return { t: [L(a.cam[0], b.cam[0]) - Math.sin(yaw * D2R) * cy * d, L(a.cam[1], b.cam[1]) - Math.sin(pitch * D2R) * d, L(a.cam[2], b.cam[2]) - Math.cos(yaw * D2R) * cy * d], fh, fov, yaw, pitch };
    }
    return {
      t: [L(a.t[0], b.t[0]), L(a.t[1], b.t[1]), L(a.t[2], b.t[2])],
      fh: LL(fitFh(a), fitFh(b)), fov: LL(a.fov, b.fov), yaw: L(a.yaw || 0, b.yaw || 0), pitch: L(a.pitch || 0, b.pitch || 0),
    };
  }
  // a key written from where the lens stands (interiors are easier to think about that way): the target follows from it
  function viewKey(p, cam, yaw, pitch, fov, fh, extra = {}) {
    const d = (fh / 2) / Math.tan(fov * D2R / 2);
    const dir = [Math.sin(yaw * D2R) * Math.cos(pitch * D2R), Math.sin(pitch * D2R), Math.cos(yaw * D2R) * Math.cos(pitch * D2R)];
    return { p, t: [cam[0] - dir[0] * d, cam[1] - dir[1] * d, cam[2] - dir[2] * d], fh, fov, yaw, pitch, cam: [cam[0], cam[1], cam[2]], ...extra };
  }
  const lastTarget = new THREE.Vector3(), _dir = new THREE.Vector3();
  function setCam(c) {
    camera.fov = c.fov; camera.aspect = W / H;
    const d = (c.fh / 2) / Math.tan(c.fov * D2R / 2);
    lastTarget.set(...c.t);
    _dir.set(Math.sin(c.yaw * D2R) * Math.cos(c.pitch * D2R), Math.sin(c.pitch * D2R), Math.cos(c.yaw * D2R) * Math.cos(c.pitch * D2R));
    camera.position.copy(lastTarget).addScaledVector(_dir, d);
    // the lens never comes closer than 40 cm to anything (window.__clear), so the near plane can stand at 20 cm:
    // four times the depth precision indoors
    camera.near = Math.max(0.2, d - 80, d * 0.03); camera.far = d + 260;
    camera.lookAt(lastTarget); camera.updateProjectionMatrix();
    S.camDist = d;
    S.camTarget = lastTarget;
  }

  /* ---------- overlay pins ---------- */
  const pins = [];
  function pin(el, p, o = {}) { const q = { el, p: new THREE.Vector3(...p), ...o }; pins.push(q); el.__pin = q; return el; }   // el.__pin.p can be moved, el.__pin.off parks it
  const v3 = new THREE.Vector3();
  function placePins() {
    if (pins.length) camera.updateMatrixWorld();          // the pins follow this frame's camera, not the last one's
    pins.forEach((q) => {
      if (q.off) return;
      v3.copy(q.p).project(camera);
      const x = (v3.x + 1) / 2 * W, y = (1 - v3.y) / 2 * H;
      const tf = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) ${q.tf || ''}`, vis = v3.z > 1 ? 'hidden' : '';
      if (tf !== q.tfNow) { q.tfNow = tf; q.el.style.transform = tf; }
      if (vis !== q.visNow) { q.visNow = vis; q.el.style.visibility = vis; }
    });
  }

  /* ---------- size, resolution, what is drawn ---------- */
  // A pen thinner than one pixel of the buffer flickers: it is drawn one pixel wide and lighter instead.
  function applySize() {
    renderer.setPixelRatio(DPR); renderer.setSize(W, H, true);
    LMATS.forEach((m) => {
      const w = m.userData.px * DPR;
      m.resolution.set(W * DPR, H * DPR); m.linewidth = Math.max(1, w); m.opacity = Math.min(1, w);
    });
    U.uLinePx.value = 1.05 * DPR;
    dirty = true;
  }
  const gov = governor({ apply: (d) => { DPR = d; applySize(); } });
  function resize() {
    const [w, h] = measure();
    if (w === W && h === H) return;                // the URL bar of a phone sliding away is not a resize
    W = w; H = h;
    gov.hold(800);
    if (pinnedDpr == null) gov.refit(); else applySize();
  }
  addEventListener('resize', resize, { passive: true });

  // live: some pixel may already show the real house. allReal: no pixel is a drawing any more.
  let live = null, allReal = false;
  function phase() {
    const sw = U.uSweep.value.z, real = U.uReal.value;
    const lv = real > 0.001 || sw > -59, ar = real >= 0.999 || sw >= 59;
    if (lv !== live) {
      live = lv; U.uLive.value = lv ? 1 : 0;
      syncs.forEach((f) => f());                           // the rooms are behind paper until then
      shadowDirty = true;
    }
    if (ar !== allReal) { allReal = ar; drawOnlyNodes.forEach((n) => { n.visible = !ar; }); }
  }
  function render() {
    if (lost) return;
    flush(); phase();
    placePins();
    if (shadowDirty) { renderer.shadowMap.needsUpdate = true; shadowDirty = false; }
    renderer.render(scene, camera);
    dirty = false;
  }
  // before the first frame: everything visible once, so every buffer is on the GPU and every shader is built
  // while the loader still covers the sheet. One small triangle of every kind of material goes along, so a house
  // that gets its rooms later never needs a shader that is not there yet.
  async function warm() {
    const tmp = new THREE.Group(); root.add(tmp);
    const tri = new THREE.BufferGeometry();
    tri.setAttribute('position', new THREE.Float32BufferAttribute([0, -9, 0, 0.01, -9, 0, 0, -9, 0.01], 3));
    tri.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    [...Object.keys(KIND).map((k) => mat(k)), mat('glass', { clear: true }), mat('glass', { clear: true, door: true })].forEach((m) => { const me = new THREE.Mesh(tri, m); me.castShadow = true; me.customDepthMaterial = DEPTH; tmp.add(me); });
    { const me = new THREE.Mesh(tri, mat('foliage', { noCut: true })); me.castShadow = true; me.customDepthMaterial = DEPTH_TREE; tmp.add(me); }
    flush();
    const hidden = []; root.traverse((n) => { if (!n.visible) { hidden.push(n); n.visible = true; } });
    U.uLive.value = 1;
    try { if (renderer.compileAsync) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera); } catch (e) { renderer.compile(scene, camera); }
    renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
    hidden.forEach((n) => { n.visible = false; });
    root.remove(tmp);
    live = null; shadowDirty = true; dirty = true;
  }

  // (defineProperties, not Object.assign: the getters have to stay getters)
  Object.defineProperties(S, Object.getOwnPropertyDescriptors({
    THREE, U, scene, root, renderer, camera, sun, hemi, phone, tier, gov,
    get DPR() { return DPR; }, get W() { return W; }, get H() { return H; }, get lost() { return lost; },
    get dirty() { return dirty || shadowDirty || pending; }, touch() { dirty = true; },
    mat, lineMat, add, lines, loop, box, panel, house, street, figure, tree, aimSun, setSun, cut, camAt, setCam, viewKey, pin, placePins,
    flush, warm, render,
  }));
  return S;
}

/* =========================================================================== */
// The page: a tall track for native scroll (eased here, a short lag behind the page), the loader,
// the drafting intro, then frame(p) every frame with p in vh scrolled.
export function run(S, o) {
  const $ = (s) => document.querySelector(s);
  const html = document.documentElement;
  const track = $('#track');
  track.style.height = `${o.length + 100}vh`;
  const skip = Q.has('at') || Q.has('skip');
  const debug = Q.has('debug') ? Object.assign(document.body.appendChild(document.createElement('div')), { className: 'debug' }) : null;

  // Inject CAD sheet corner registration frame & live solar/optical telemetry HUD
  let hudSun = null, hudOptic = null;
  if (!$('.sheet-frame')) {
    const sf = document.createElement('div');
    sf.className = 'sheet-frame';
    sf.setAttribute('aria-hidden', 'true');
    sf.innerHTML = `
      <span class="reg tl"></span><span class="reg tr"></span><span class="reg bl"></span><span class="reg br"></span>
      <div class="sheet-hud">
        <span class="scale-bar"><i></i><b>CAD // ELV.02</b></span>
        <span>SONNE <b id="hudSun">ALT 35.3° · AZ 135°</b></span>
        <span>OPTIK <b id="hudOptic">2.0° ORTHO</b></span>
      </div>`;
    document.body.appendChild(sf);
    hudSun = sf.querySelector('#hudSun');
    hudOptic = sf.querySelector('#hudOptic');
  }

  // p follows the page's own scroll position with a short lag. One vh is measured on the track itself (the large
  // viewport), not from innerHeight: on a phone innerHeight changes when the URL bar slides, and p must not jump with it.
  const noSmooth = Q.has('nosmooth');
  let vhPx = innerHeight / 100;
  const measureVh = () => { vhPx = (track.offsetHeight / (o.length + 100)) || innerHeight / 100; };
  measureVh(); addEventListener('resize', measureVh, { passive: true });
  let pEase = scrollY / vhPx, pT = performance.now();
  function scrollP(now) {
    const target = scrollY / vhPx, dt = Math.min(0.25, Math.max(0, (now - pT) / 1000)); pT = now;
    pEase = noSmooth ? target : pEase + (target - pEase) * (1 - Math.exp(-7.5 * dt));
    if (Math.abs(target - pEase) < 0.01) pEase = target;
    return pEase;
  }
  function jumpToP(targetP) { window.scrollTo({ top: targetP * vhPx, behavior: 'smooth' }); }
  window.__jumpToP = jumpToP;
  // the page only writes to the DOM when a value has changed
  const setText = (el, t) => { if (el.__t !== t) { el.__t = t; el.textContent = t; } };
  const setAttr = (el, k, v) => { const c = el.__a || (el.__a = {}); if (c[k] !== v) { c[k] = v; el.setAttribute(k, v); } };
  const setStyle = (el, k, v) => { const c = el.__s || (el.__s = {}); if (c[k] !== v) { c[k] = v; el.style[k] = v; } };

  // the little plan in the corner that shows where the lens is (#cad-map)
  const radarCfg = o.radar || {
    ox: 0,
    zones: [
      { id: 'street', label: 'STRASSE', tag: 'ANSICHT ±0.00M', at: 95, u0: -4.0, u1: 0.0 },
      { id: 'entry', label: 'EINGANG', tag: 'EINGANG +0.30M', at: 385, u0: 0.0, u1: 1.3 },
      { id: 'hall', label: 'HALLE', tag: 'HALLE +0.30M', at: 500, u0: 1.3, u1: 6.0 },
      { id: 'kitchen', label: 'KÜCHE', tag: 'KÜCHE +0.30M', at: 635, u0: 6.0, u1: 12.0 },
      { id: 'garden', label: 'GARTEN', tag: 'GARTEN +0.28M', at: 730, u0: 12.0, u1: 17.8 },
    ],
  };
  let cmLbl = null, cmDot = null, cmCone = null, cmScan = null, cmZones = [], cmBtns = [], hoverTag = '';
  const furnPath = (plan) => 'M-0.6 0.5 V2.9 M-0.3 0.5 V2.9 M1.2 0.7 L2.15 0.84 M1.2 2.7 L2.15 2.56 M14.4 0 V6.0 ' + (plan || PLANS.A.radar).rects.map(([a, b, c, d]) => `M${a} ${b} H${c} V${d} H${a} Z`).join(' ');
  if (!$('#cad-map')) {
    const cm = document.createElement('div');
    cm.id = 'cad-map';
    cm.setAttribute('aria-label', 'Interaktives CAD-Grundriss-Radar');
    const zoneRects = radarCfg.zones.map((z) =>
      `<rect class="cm-zone" data-id="${z.id}" data-tag="${z.tag}" data-at="${z.at}" x="${z.u0}" y="0" width="${(z.u1 - z.u0).toFixed(2)}" height="6.0"/>`
    ).join('');
    const zoneBtns = radarCfg.zones.map((z) =>
      `<button type="button" class="cm-btn" data-id="${z.id}" data-tag="${z.tag}" data-at="${z.at}">${z.label}</button>`
    ).join('');
    cm.innerHTML = `
      <div id="cm-lbl"><span>CAD-GRUNDRISS // 1:100</span><b id="cm-pos">STRASSE ±0.00M</b></div>
      <svg viewBox="-4.2 -0.6 22.4 7.2">
        ${zoneRects}
        <!-- the plan: plot walls, the facade with its porch, the glass wall to the garden -->
        <path d="M-4.0 0 H17.6 M-4.0 6.0 H17.6 M0 0 V0.5 M0 2.9 V6.0 M0 0.5 H1.2 M0 2.9 H1.2 M1.2 0.5 V0.7 M1.2 2.7 V2.9 M12.0 0 V1.64 M12.0 4.36 V6.0 M17.6 0 V6.0" fill="none" stroke="#2a2522" stroke-width="0.28" opacity="0.82" pointer-events="none"/>
        <!-- steps, the two door leaves, the garden step, and what stands in the rooms of this plan; dashed: the edge of the upper floor -->
        <path id="cm-furn" d="${furnPath(radarCfg.plan)}" fill="none" stroke="#2a2522" stroke-width="0.16" opacity="0.48" pointer-events="none"/>
        <path id="cm-dash" d="${(radarCfg.plan || PLANS.A.radar).dash}" fill="none" stroke="#2a2522" stroke-width="0.14" stroke-dasharray="0.35 0.25" opacity="0.5" pointer-events="none"/>
        <circle cx="16.15" cy="4.68" r="1.0" fill="none" stroke="#a5432b" stroke-width="0.18" stroke-dasharray="0.4 0.3" opacity="0.8" pointer-events="none"/>
        <line id="cm-scan" x1="0" y1="-0.5" x2="0" y2="6.5" stroke="#a5432b" stroke-width="0.28" stroke-dasharray="0.6 0.4" opacity="0" pointer-events="none"/>
        <polygon id="cm-cone" points="-2.5,3.0 0.5,1.8 0.5,4.2" fill="rgba(165,67,43,0.3)" stroke="#a5432b" stroke-width="0.18" pointer-events="none"/>
        <circle id="cm-dot" cx="-2.5" cy="3.0" r="0.52" fill="#a5432b" stroke="#2a2522" stroke-width="0.14" pointer-events="none"/>
      </svg>
      <div class="cm-pills">${zoneBtns}</div>`;
    document.body.appendChild(cm);
    cmLbl = cm.querySelector('#cm-pos');
    cmDot = cm.querySelector('#cm-dot');
    cmCone = cm.querySelector('#cm-cone');
    cmScan = cm.querySelector('#cm-scan');
    cmZones = [...cm.querySelectorAll('.cm-zone')];
    cmBtns = [...cm.querySelectorAll('.cm-btn')];
    // another house, another plan: the page hands over what stands in its rooms and what the zones are called
    radarCfg.draw = (plan, names) => {
      cm.querySelector('#cm-furn').setAttribute('d', furnPath(plan)); cm.querySelector('#cm-dash').setAttribute('d', plan.dash || 'M0 0');
      if (names) Object.entries(names).forEach(([id, [label, tag]]) => {
        const z = radarCfg.zones.find((q) => q.id === id); if (!z) return;
        z.label = label; z.tag = tag;
        cm.querySelectorAll(`[data-id="${id}"]`).forEach((el) => { el.dataset.tag = tag; if (el.classList.contains('cm-btn')) el.textContent = label; });
      });
      S.touch();
    };
    [...cmZones, ...cmBtns].forEach((el) => {
      el.addEventListener('mouseenter', () => { hoverTag = el.dataset.tag || ''; S.touch(); });
      el.addEventListener('mouseleave', () => { hoverTag = ''; S.touch(); });
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        jumpToP(parseFloat(el.dataset.at || '0'));
      });
    });
  }

  // beats: captions that live between two scroll positions
  const beats = (o.beats || []).map((b) => {
    const el = document.createElement('div');
    el.className = 'beat ' + (b.cls || '');
    el.innerHTML = b.html;
    $('#beats').appendChild(el);
    return { ...b, el };
  });

  S.U.uDraw.value = skip ? 1.2 : 0;
  S.U.uHatchIn.value = skip ? 1 : 0;
  S.U.uDetailIn.value = skip ? 1 : 0;
  html.classList.add('locked');
  if (skip) { html.classList.add('in', 'done'); $('#loader')?.classList.add('gone'); }

  let p = 0, t0 = performance.now(), introT = -1, pLast = NaN, heroLast = '', activeId = '', idle = 0;
  const zoneAt = (u) => { for (const z of radarCfg.zones) if (u >= z.u0 && u <= z.u1) return z; return radarCfg.zones[0]; };
  // Render on demand: a frame is only worked out and drawn when the scroll has moved, the intro is running or the
  // stage asks for it (resize, resolution, shadow). A page at rest costs nothing, a hidden page not even this check.
  function tick(now) {
    requestAnimationFrame(tick);
    if (!visible() || S.lost) { S.gov.frame(now, false); return; }
    p = scrollP(now);
    const intro = introT >= 0 && !skip && !html.classList.contains('done');
    const active = intro || p !== pLast || S.dirty;
    S.gov.frame(now, active);
    if (!active) return;
    pLast = p;
    // intro clock
    if (intro) {
      const t = (now - introT) / 1000;
      S.U.uDraw.value = Math.min(1.2, ease(span(t, 0, 3.3)) * 1.2);
      S.U.uHatchIn.value = ease(span(t, 2.4, 3.8));
      S.U.uDetailIn.value = ease(span(t, 2.6, 3.8));
      if (t > 0.35) $('#loader')?.classList.add('gone');
      if (t > 1.9) html.classList.add('in');
      if (t > 3.9) {
        html.classList.add('done'); html.classList.remove('locked');
        window.__introDone = true;
      }
    }
    o.frame(p, S, now);
    if (hudSun && hudOptic) {
      const sd = S.U.uSun.value;
      const alt = (Math.asin(Math.max(-1, Math.min(1, sd.y))) * 180 / Math.PI).toFixed(1);
      const az = (((Math.atan2(-sd.x, sd.z) * 180 / Math.PI) + 90 + 360) % 360).toFixed(0);
      setText(hudSun, `ALT ${alt}° · AZ ${az}°`);
      const fov = S.camera.fov;
      setText(hudOptic, `${fov.toFixed(1)}° ${fov < 4 ? 'ORTHO' : fov < 22 ? 'RELIEF' : 'PERSP'}`);
    }
    if (cmDot && cmCone && cmLbl) {
      // Map camera position to plan radar coordinates: u = depth into plot (-z), v = x inside house
      const camPos = S.camera.position;
      const camTgt = S.camTarget || S.camera.position;
      const u = Math.max(-3.6, Math.min(17.0, -camPos.z));
      const rawV = camPos.x - (radarCfg.ox || 0);
      const v = Math.max(0.4, Math.min(5.6, radarCfg.mirrorX ? 6 - rawV : rawV));
      setAttr(cmDot, 'cx', u.toFixed(2));
      setAttr(cmDot, 'cy', v.toFixed(2));

      const du = (-camTgt.z) - (-camPos.z);
      const dv = (radarCfg.mirrorX ? -1 : 1) * (camTgt.x - camPos.x);
      const ang = Math.atan2(dv, du);
      const r = 2.8, sp = 0.42;
      const u1 = u + Math.cos(ang - sp) * r, v1 = v + Math.sin(ang - sp) * r;
      const u2 = u + Math.cos(ang + sp) * r, v2 = v + Math.sin(ang + sp) * r;
      setAttr(cmCone, 'points', `${u.toFixed(2)},${v.toFixed(2)} ${u1.toFixed(2)},${v1.toFixed(2)} ${u2.toFixed(2)},${v2.toFixed(2)}`);

      // Active zone highlight
      let activeZone = zoneAt(u);
      if (p > 340 && u < 0.2) activeZone = radarCfg.zones[1] || activeZone;
      if (activeZone.id !== activeId) {
        activeId = activeZone.id;
        cmZones.forEach((el) => el.classList.toggle('active', el.dataset.id === activeId));
        cmBtns.forEach((el) => el.classList.toggle('active', el.dataset.id === activeId));
      }

      const swZ = S.U.uSweep.value.z;
      if (hoverTag) {
        setText(cmLbl, `SPRUNG // ${hoverTag}`);
      } else if (swZ > -30 && swZ < 30) {
        setText(cmLbl, `SCAN // S:${swZ.toFixed(1)}M`);
      } else if (S.camera.fov < 22) {
        setText(cmLbl, `${activeZone.label} · ${S.camera.fov.toFixed(0)}° OBJEKTIV`);
      } else {
        setText(cmLbl, `${activeZone.label} · Z:${(-camPos.z >= 0 ? '+' : '')}${(-camPos.z).toFixed(1)}M`);
      }

      // Sweep scan line indicator
      if (swZ > -30 && swZ < 30) {
        const su = lerp(-3.5, 16.5, clamp01((swZ + 14) / 28));
        setAttr(cmScan, 'x1', su.toFixed(2));
        setAttr(cmScan, 'x2', su.toFixed(2));
        setAttr(cmScan, 'opacity', '0.9');
      } else {
        setAttr(cmScan, 'opacity', '0');
      }
    }
    beats.forEach((b) => {
      const f = b.fade || 14;
      const v = Math.min(span(p, b.from - f, b.from), 1 - span(p, b.to - f, b.to));
      const on = v > 0.001;
      if (on || b.on !== false) {
        setStyle(b.el, 'opacity', v.toFixed(3));
        setStyle(b.el, 'transform', `translate3d(0, ${((1 - v) * 14).toFixed(1)}px, 0)`);
        setStyle(b.el, 'visibility', on ? 'visible' : 'hidden');
        b.on = on;
      }
    });
    const hero = span(p, o.heroOut?.[0] ?? 12, o.heroOut?.[1] ?? 60).toFixed(3);
    if (hero !== heroLast) { heroLast = hero; html.style.setProperty('--hero-out', hero); }
    if (debug) setText(debug, `p ${p.toFixed(1)} vh · ${S.tier} · dpr ${S.DPR.toFixed(2)}`);
    S.render();
  }

  // loader: a percent above the ground line. Fonts, a first frame, every shader built.
  const fill = $('#loadPct');
  // arriving at a place on the page (?at=, ?skip) there is no title sequence to wait for: no minimum time, no wait for fonts
  const minT = skip ? 0 : 1100;
  const fonts = skip ? Promise.resolve() : Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
  o.frame(0, S, 0);
  let shown = 0;
  const count = setInterval(() => { shown = Math.min(99, shown + 3 + Math.random() * 7); if (fill) fill.textContent = `${Math.floor(shown)}%`; }, 70);
  // shaders are built off the main thread where the browser can (compileAsync), so the counter keeps running
  Promise.all([fonts, S.warm()]).then(() => new Promise((r) => setTimeout(r, Math.max(0, minT - (performance.now() - t0))))).then(() => {
    clearInterval(count); if (fill) fill.textContent = '100%';
    measureVh();
    o.frame(0, S, 0);
    S.render();
    S.gov.hold(1500);
    window.__ready = true;
    if (skip) {
      html.classList.remove('locked'); window.__introDone = true;
      const at = num('at', 0);
      requestAnimationFrame(() => { scrollTo(0, at * vhPx); pEase = at; });
    } else {
      setTimeout(() => { introT = performance.now(); }, 250);
    }
    requestAnimationFrame(tick);
  }).catch((e) => { clearInterval(count); console.error(e); fail('Die 3D-Ansicht konnte nicht gestartet werden.'); });
  // (the scroll is held during the intro by html.locked in the stylesheet)
  window.__stage = S; window.__p = () => p;
  // design aid: how close any surface comes to the lens along the scroll. The exact distance from the eye
  // to every triangle of the real model, sampled every `step` vh. Returns the worst, and every sample under `warn`.
  window.__clear = (warn = 0.4, step = 1, p0 = 300, p1 = o.length) => {
    const tri = new THREE.Triangle(), q = new THREE.Vector3(), out = { worst: 9, at: 0, near: [] };
    const meshes = [];
    // only what is drawn counts: the rooms of a house the lens is not in are not there
    const seen = (m) => { for (let q = m; q; q = q.parent) if (!q.visible) return false; return true; };
    o.frame(p1, S, 0); S.flush(); S.render();
    S.scene.traverse((m) => { if (m.isMesh && !m.isLineSegments2 && m.geometry.attributes.position && !m.material.userData?.drawOnly && !m.material.userData?.sky && seen(m)) meshes.push(m); });
    for (let pp = p0; pp <= p1 + 1e-6; pp += step) {
      o.frame(pp, S, 0); S.scene.updateMatrixWorld(true);
      const e = S.camera.position; let best = 9, where = null;
      for (const m of meshes) {
        const g = m.geometry; if (!g.boundingSphere) g.computeBoundingSphere();
        q.copy(g.boundingSphere.center).applyMatrix4(m.matrixWorld);
        if (q.distanceTo(e) - g.boundingSphere.radius > best) continue;
        const P = g.attributes.position, ix = g.index, n = ix ? ix.count : P.count;
        for (let i = 0; i < n; i += 3) {
          tri.a.fromBufferAttribute(P, ix ? ix.getX(i) : i).applyMatrix4(m.matrixWorld);
          tri.b.fromBufferAttribute(P, ix ? ix.getX(i + 1) : i + 1).applyMatrix4(m.matrixWorld);
          tri.c.fromBufferAttribute(P, ix ? ix.getX(i + 2) : i + 2).applyMatrix4(m.matrixWorld);
          const d = tri.closestPointToPoint(e, q).distanceTo(e);
          if (d < best) { best = d; where = q.toArray().map((x) => +x.toFixed(2)); }
        }
      }
      if (best < out.worst) { out.worst = +best.toFixed(3); out.at = pp; }
      if (best < warn) out.near.push({ p: pp, d: +best.toFixed(3), eye: e.toArray().map((x) => +x.toFixed(2)), where });
    }
    o.frame(p, S, 0); S.touch();
    return out;
  };
}
