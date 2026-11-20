// The Elevation engine, shared by the three pages (a-one-door, b-the-row, c-the-face).
//
// One model, drawn two ways. Every surface is black paper with 45 degree hatching in white ink
// wherever the sun does not reach, or its real lit material. A diagonal sweep decides which, pixel
// by pixel. The sun starts at the drawing convention (45 degrees in plan and elevation,
// 35.26 degrees high), so the hatched areas and the real shadows are the same areas.
//
// The hatching is never drawn by hand: it is read from the shadow map. Move the sun and
// the hatching moves.
//
// Only three.js: the scroll is the page's own, eased in run().
// URL: ?at=VH jumps to a scroll position (vh) and skips the intro, ?skip skips the intro,
//      ?nosmooth follows the scroll without easing (recordings), ?debug shows p in the corner.
import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export { THREE, mergeGeometries };
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

const GLSL_COMMON = /* glsl */`
  uniform vec3 uSun; uniform vec4 uSweep; uniform float uReal;
  uniform vec3 uPaper; uniform vec3 uInk; uniform vec3 uAccent; uniform float uHatch; uniform float uLinePx;
  uniform float uDraw; uniform vec2 uDrawSpan; uniform vec2 uDrawDir; uniform float uHatchIn; uniform vec2 uWipe; uniform float uDetailIn; uniform float uDepthCue;
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

/* =========================================================================== */
export function createStage(cfg = {}) {
  const S = {};
  const DPR = Math.min(2, Math.max(1, devicePixelRatio || 1));
  let W = innerWidth, H = innerHeight;
  const phone = () => W / H < 0.8;
  const canvas = document.getElementById('gl');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(DPR);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x0c0c0e, 1);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  const scene = new THREE.Scene();
  const root = new THREE.Group(); scene.add(root);

  const hatch0 = (phone() ? cfg.hatchPhone || cfg.hatch : cfg.hatch) || 0.11;
  const U = {
    uSun: { value: CONVENTION.clone() },
    uSweep: { value: new THREE.Vector4(Math.SQRT1_2, -Math.SQRT1_2, -999, cfg.soft || 0.8) },
    uReal: { value: num('real', 0) },
    uPaper: { value: raw(0x0c0c0e) },
    uInk: { value: raw(0xf1eeea) },
    uAccent: { value: raw(0xe5202e) },
    uHatch: { value: hatch0 * (DPR < 1.5 ? 1.3 : 1) },
    uLinePx: { value: 1.05 * DPR },
    uDraw: { value: 1 },
    uDrawSpan: { value: new THREE.Vector2(...(cfg.drawSpan || [0, 12])) },
    uDrawDir: { value: new THREE.Vector2(...(cfg.drawDir || [0, 1])) },
    uHatchIn: { value: 1 },
    uWipe: { value: new THREE.Vector2(...(cfg.wipe || [-12, 8])) },
    uDetailIn: { value: 1 },
    uDepthCue: { value: 0 },
    uBump: { value: 1.25 },
  };

  /* ---------- environment and light ---------- */
  {
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(new THREE.SphereGeometry(12, 40, 20), new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: 'varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vP; void main() {
        vec3 d = normalize(vP);
        float h = d.y;
        vec3 horizon = vec3(0.60, 0.60, 0.62);
        vec3 zenith = vec3(0.13, 0.135, 0.15);
        vec3 ground = mix(vec3(0.16, 0.16, 0.17), vec3(0.30, 0.30, 0.31), smoothstep(-0.8, 0.0, h));
        vec3 sky = mix(horizon, zenith, pow(clamp(h, 0.0, 1.0), 0.65));
        float sunGlow = pow(max(0.0, dot(d, normalize(vec3(-0.7, 0.55, 0.7)))), 12.0);
        sky += vec3(0.30, 0.29, 0.28) * sunGlow;
        gl_FragColor = vec4(h > 0.0 ? sky : ground, 1.0);
      }`,
    })));
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(envScene, 0.015).texture;
  }
  const sun = new THREE.DirectionalLight(0xfff6ee, 3.5);
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(0xd4d7dc, 0x8c8c90, 0.52); scene.add(hemi);
  const sunAim = { t: new THREE.Vector3(), ext: 24 };
  function aimSun(cx, cy, ext, map = 4096) {
    sunAim.t.set(cx, cy, -3.5); sunAim.ext = ext;
    sun.castShadow = true;
    sun.shadow.mapSize.set(map, map);
    sun.shadow.bias = -0.00035; sun.shadow.normalBias = 0.014;
    const c = sun.shadow.camera;
    c.left = -ext; c.right = ext; c.top = ext; c.bottom = -ext; c.near = 6; c.far = 210;
    c.updateProjectionMatrix();
    placeSun();
  }
  function placeSun() {
    sun.target.position.copy(sunAim.t);
    sun.position.copy(U.uSun.value).multiplyScalar(90).add(sunAim.t);
    sun.target.updateMatrixWorld();
  }
  function setSun(dir) { U.uSun.value.copy(dir).normalize(); placeSun(); }

  /* ---------- materials ---------- */
  const KIND = {
    plain: 0, brick: 1, stone: 2, glass: 3, zinc: 4, wood: 5, paving: 6,
    sky: 7, foliage: 8, steel: 9, interior: 10, oakFloor: 11, plaster: 12, travertine: 13, linen: 14, lacquer: 15,
  };
  const BASE = {
    // black, white, and one red: white brick, pale stone, anthracite zinc, black oak, a red lacquer
    brick: { color: 0xe6e4e0, roughness: 0.88 },
    stone: { color: 0xd2d1ce, roughness: 0.76 },
    glass: { color: 0xffffff, roughness: 0.06, metalness: 0.05 },
    zinc: { color: 0x3a3b3f, roughness: 0.48, metalness: 0.45 },
    wood: { color: 0x29292d, roughness: 0.44 },
    paving: { color: 0x8a8a8d, roughness: 0.86 },
    sky: { color: 0x0c0c0e, roughness: 1 },
    foliage: { color: 0x56585b, roughness: 0.88, flatShading: true },
    steel: { color: 0x161618, roughness: 0.38, metalness: 0.68 },
    plain: { color: 0xdedcd8, roughness: 0.84 },
    interior: { color: 0xfff6ee, roughness: 0.9, emissive: 0x5c5650, emissiveIntensity: 0.7 },
    oakFloor: { color: 0x77777c, roughness: 0.46 },
    plaster: { color: 0xf1f0ed, roughness: 0.86 },
    travertine: { color: 0xdad9d6, roughness: 0.5 },
    linen: { color: 0xe6e4e0, roughness: 0.92 },
    lacquer: { color: 0xc8121f, roughness: 0.36, metalness: 0.12 },
  };
  const MATS = {};
  function mat(kind, o = {}) {
    const key = kind + JSON.stringify(o);
    if (MATS[key]) return MATS[key];
    const m = new THREE.MeshStandardMaterial({ ...BASE[kind], polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    m.envMapIntensity = ({ glass: 1.55, steel: 1.25, zinc: 0.95, wood: 1.0, oakFloor: 0.65, travertine: 0.55, lacquer: 0.8 }[kind] || 0.45) * (cfg.envScale || 1);
    if (o.color) m.color.setHex(o.color);
    // clear glass: a sheet you can see through once the scan has made it real. On the drawing it is paper like everything else
    const clear = o.clear ? 1 : 0;
    if (clear) { m.transparent = true; m.opacity = 0.17; m.depthWrite = !!o.door; }
    m.userData.drawOnly = !!o.drawOnly; m.userData.sky = kind === 'sky';
    const K = KIND[kind];
    const faint = o.faint ? 1 : 0, realOnly = o.realOnly ? 1 : 0, drawOnly = o.drawOnly ? 1 : 0;
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'varying vec3 vWP; varying vec3 vWN;\n' + sh.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
        vec4 wpp = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          wpp = instanceMatrix * wpp;
        #endif
        vWP = (modelMatrix * wpp).xyz;
        vWN = normalize(mat3(modelMatrix) * objectNormal);`);
      sh.fragmentShader = `#define KIND ${K}\n#define FAINT ${faint}\n#define REAL_ONLY ${realOnly}\n#define DRAW_ONLY ${drawOnly}\n#define CLEAR ${clear}\nvarying vec3 vWP; varying vec3 vWN; uniform float uBump;\n${GLSL_COMMON}
        // brick: running bond 215 x 65, 10 mm joints. x: along the course, y: up
        vec4 brickAt(vec2 q) {
          float course = floor(q.y / 0.075);
          float bx = q.x / 0.225 + mod(course, 2.0) * 0.5;
          return vec4(floor(bx), course, fract(bx) * 0.225, fract(q.y / 0.075) * 0.075);
        }
        float brickHeight(vec2 q) {
          vec4 b = brickAt(q);
          float ex = min(b.z, 0.225 - b.z + 0.011), ey = min(b.w, 0.075 - b.w + 0.011);
          float e = min(ex - 0.0055, ey - 0.0055);
          float face = smoothstep(0.0035, 0.0095, e);
          float tilt = (hash12(b.xy + 9.2) - 0.5) * 0.0014;
          float crease = (vnoise(vec2(q.x * 55.0, q.y * 190.0) + b.xy * 5.3) - 0.5) * 0.0009;
          float grain = (vnoise(q * 380.0) - 0.5) * 0.0007 + (vnoise(q * 95.0 + b.xy * 7.0) - 0.5) * 0.0010 + crease + tilt;
          float mortarGrain = -0.0085 + (vnoise(q * 420.0) - 0.5) * 0.0005;
          return mix(mortarGrain, grain, face);
        }
        float matHeight(vec2 q) {
          #if KIND == 1
            return brickHeight(q);
          #elif KIND == 2 || KIND == 13
            float jx = smoothstep(0.004, 0.001, abs(fract(q.x / 0.9 + 0.5) - 0.5) * 0.9);
            float pores = (vnoise(q * 140.0) - 0.5) * 0.0007 + (vnoise(vec2(q.x * 12.0, q.y * 48.0)) - 0.5) * 0.0006;
            return pores - jx * 0.003;
          #elif KIND == 4
            float sx = abs(fract(q.x / 0.43 + 0.5) - 0.5) * 0.43;
            float rib = smoothstep(0.014, 0.003, sx) * 0.008;
            float wave = sin(q.y * 5.5 + floor(q.x / 0.43) * 2.1) * 0.0005;
            return rib + wave;
          #elif KIND == 5
            float gx = abs(fract(q.x / 0.095 + 0.5) - 0.5) * 0.095;
            float groove = -smoothstep(0.005, 0.001, gx) * 0.0045;
            float cath = (vnoise(vec2(q.x * 160.0, q.y * 14.0)) - 0.5) * 0.0007;
            return groove + cath;
          #elif KIND == 11
            float gx = abs(fract(q.x / 0.165 + 0.5) - 0.5) * 0.165;
            float gy = abs(fract((q.y + floor(q.x / 0.165) * 0.55) / 1.45 + 0.5) - 0.5) * 1.45;
            float groove = -smoothstep(0.004, 0.001, min(gx, gy)) * 0.0035;
            float cath = (vnoise(vec2(q.x * 140.0, q.y * 12.0)) - 0.5) * 0.0006;
            return groove + cath;
          #elif KIND == 6
            vec2 g = abs(fract(q / vec2(0.6, 0.6) + 0.5) - 0.5) * 0.6;
            float j = smoothstep(0.008, 0.002, min(g.x, g.y));
            return (vnoise(q * 95.0) - 0.5) * 0.0008 - j * 0.004;
          #elif KIND == 12
            return (vnoise(q * 32.0) - 0.5) * 0.0004 + (vnoise(q * 150.0) - 0.5) * 0.0003;
          #elif KIND == 14
            return (sin(q.x * 260.0) * sin(q.y * 260.0)) * 0.0005 + (vnoise(q * 90.0) - 0.5) * 0.0006;
          #else
            return 0.0;
          #endif
        }
      ` + sh.fragmentShader
          .replace('#include <shadowmap_pars_fragment>', '#include <shadowmap_pars_fragment>\n#include <shadowmask_pars_fragment>')
          .replace('void main() {', `void main() {
            float rv = revealAt(vWP);
            #if REAL_ONLY
              if (rv < 0.5) discard;
            #endif
            #if DRAW_ONLY
              if (rv > 0.5 || uHatchIn < 0.02) discard;
            #endif`)
          .replace('#include <color_fragment>', `#include <color_fragment>
            {
              vec2 q = planeUV(vWP, vWN);
              #if KIND == 1
                vec4 b = brickAt(q);
                float fw = max(fwidth(q.x), fwidth(q.y)) * 1.15;
                float brickVis = smoothstep(0.045, 0.015, fw);
                float jointVis = smoothstep(0.013, 0.004, fw);
                float jx = 1.0 - smoothstep(0.0095 - fw, 0.0095 + fw, b.z);
                float jy = 1.0 - smoothstep(0.0095 - fw, 0.0095 + fw, b.w);
                float joint = max(jx, jy);
                float h = hash12(b.xy), h2 = hash12(b.xy + 17.3), h3 = hash12(b.xy + 41.7), h4 = hash12(b.xy + 83.9);
                vec3 base = diffuseColor.rgb * (0.95 + 0.09 * (vnoise(q * 0.65) - 0.5)) * (0.96 + 0.04 * smoothstep(0.0, 2.5, q.y));
                float kilnDark = smoothstep(0.80, 0.98, h4) * 0.22;
                vec3 bc = base * (0.87 + 0.22 * h - kilnDark) * (1.0 + 0.04 * (h2 - 0.5) - 0.02 * (h3 - 0.5));
                bc *= 0.92 + 0.16 * vnoise(vec2(q.x * 55.0, q.y * 140.0) + b.xy * 3.1) * jointVis;
                float bedShade = (1.0 - smoothstep(0.009, 0.015, b.w)) * step(0.009, b.w) * 0.14 * jointVis;
                bc *= 1.0 - bedShade;
                vec3 mortar = mix(vec3(0.60, 0.60, 0.61), diffuseColor.rgb * 1.5 + 0.12, step(dot(diffuseColor.rgb, vec3(0.333)), 0.3)) * (0.94 + 0.12 * vnoise(q * 180.0));
                vec3 far = mix(base, mortar, 0.13);
                vec3 mid = mix(bc, mortar, 0.13);
                vec3 nearC = mix(bc, mortar * 0.92, joint);
                diffuseColor.rgb = mix(mix(far, mid, brickVis), nearC, jointVis);
              #elif KIND == 4
                float fwz = max(fwidth(q.x) * 1.4, 0.005);
                float sx = fract(q.x / 0.43 + 0.5) - 0.5;
                float seamDark = 1.0 - smoothstep(0.0, fwz, abs(sx) * 0.43);
                float seamHi = 1.0 - smoothstep(0.0, fwz * 1.4, abs(sx * 0.43 - 0.007));
                float welt = 1.0 - smoothstep(0.0, max(fwidth(q.y) * 1.4, 0.005), abs(fract(q.y / 1.45 + 0.3) - 0.5) * 1.45);
                float patina = 0.94 + 0.10 * vnoise(vec2(q.x * 18.0, q.y * 2.2)) + 0.04 * (vnoise(q * 4.0) - 0.5);
                diffuseColor.rgb *= patina * (1.0 - 0.42 * seamDark - 0.18 * welt) + 0.10 * seamHi;
              #elif KIND == 5
                float pitch = 0.095;
                float board = floor(q.x / pitch);
                float grain = vnoise(vec2(q.x * 95.0, q.y * 4.5 + board * 3.7));
                float fine = vnoise(vec2(q.x * 260.0, q.y * 16.0));
                diffuseColor.rgb *= (0.85 + 0.25 * hash12(vec2(board, 3.0))) * (0.90 + 0.14 * grain + 0.06 * fine);
                float groove = 1.0 - smoothstep(0.0, max(fwidth(q.x) * 1.2, 0.0025), abs(fract(q.x / pitch + 0.5) - 0.5) * pitch);
                diffuseColor.rgb *= 1.0 - 0.48 * groove;
              #elif KIND == 11
                float pw = 0.165, pl = 1.45;
                float colIdx = floor(q.x / pw);
                float rowIdx = floor((q.y + colIdx * 0.55) / pl);
                float bh = hash12(vec2(colIdx, rowIdx));
                float grain = vnoise(vec2(q.x * 85.0, q.y * 3.8 + bh * 9.0));
                float cath = vnoise(vec2(q.x * 28.0 + sin(q.y * 2.2) * 0.6, q.y * 2.5));
                diffuseColor.rgb *= (0.88 + 0.20 * bh) * (0.91 + 0.12 * grain + 0.07 * cath);
                float gx = 1.0 - smoothstep(0.0, max(fwidth(q.x) * 1.2, 0.002), abs(fract(q.x / pw + 0.5) - 0.5) * pw);
                float gy = 1.0 - smoothstep(0.0, max(fwidth(q.y) * 1.2, 0.003), abs(fract((q.y + colIdx * 0.55) / pl + 0.5) - 0.5) * pl);
                diffuseColor.rgb *= 1.0 - 0.38 * max(gx, gy * 0.75);
              #elif KIND == 6
                float rowP = floor(q.y / 0.6);
                vec2 pq = vec2(q.x + mod(rowP, 2.0) * 0.45, q.y);
                vec2 cell = floor(pq / vec2(0.9, 0.6));
                vec2 g = abs(fract(pq / vec2(0.9, 0.6) + 0.5) - 0.5) * vec2(0.9, 0.6);
                float j = 1.0 - smoothstep(0.0, max(max(fwidth(q.x), fwidth(q.y)) * 1.2, 0.005), min(g.x, g.y));
                float sh = hash12(cell);
                vec3 flagCol = diffuseColor.rgb * (0.88 + 0.18 * sh);
                flagCol *= 0.95 + 0.09 * vnoise(q * 22.0);
                diffuseColor.rgb = mix(flagCol, vec3(0.24, 0.24, 0.25), j * 0.65);
              #elif KIND == 7
                float k = clamp((vWP.y + 4.0) / 40.0, 0.0, 1.0);
                diffuseColor.rgb = mix(vec3(0.075, 0.075, 0.085), vec3(0.008, 0.008, 0.012), pow(k, 0.7));
              #elif KIND == 2
                float blockJ = 1.0 - smoothstep(0.0, max(fwidth(q.x) * 1.3, 0.003), abs(fract(q.x / 0.9 + 0.5) - 0.5) * 0.9);
                float bed = vnoise(vec2(q.x * 4.0, q.y * 26.0));
                float oolite = vnoise(q * 75.0);
                diffuseColor.rgb *= (0.95 + 0.06 * bed + 0.04 * (oolite - 0.5)) * (1.0 - 0.18 * blockJ);
              #elif KIND == 12
                float blotch = vnoise(q * 1.8) * 0.04 + vnoise(q * 9.5) * 0.025;
                diffuseColor.rgb *= 0.97 + blotch;
              #elif KIND == 13
                float vein = vnoise(vec2(q.x * 3.5 + sin(q.y * 4.0) * 0.25, q.y * 22.0));
                float fleck = vnoise(q * 85.0);
                diffuseColor.rgb *= 0.93 + 0.10 * vein + 0.05 * (fleck - 0.5);
              #elif KIND == 14
                float weave = (vnoise(vec2(q.x * 120.0, q.y * 18.0)) - 0.5) * 0.07 + (vnoise(vec2(q.x * 18.0, q.y * 120.0)) - 0.5) * 0.07;
                diffuseColor.rgb *= 0.98 + weave;
              #elif KIND == 3
                float k = fract((vWP.y - 0.45) / 3.0);
                vec3 skyRefl = mix(vec3(0.02, 0.02, 0.025), vec3(0.13, 0.135, 0.15), smoothstep(0.22, 0.92, k));
                float warmZone = smoothstep(0.05, 0.45, k) * (1.0 - smoothstep(0.55, 0.92, k));
                float roomVar = 0.6 + 0.4 * sin(vWP.x * 1.7 + floor((vWP.y - 0.45) / 3.0) * 2.3);
                vec3 warmRoom = vec3(0.27, 0.265, 0.25) * warmZone * roomVar * (FAINT == 1 ? 0.25 : 0.75);
                diffuseColor.rgb = skyRefl + warmRoom;
                diffuseColor.rgb += 0.065 * smoothstep(0.18, 0.0, abs(fract((vWP.x - vWP.y * 0.6) / 2.7) - 0.5));
              #elif KIND == 9
                diffuseColor.rgb *= 0.94 + 0.10 * vnoise(q * 45.0);
              #endif
            }`)
          .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
            #if KIND == 1
            {
              vec2 qr = planeUV(vWP, vWN);
              vec4 br = brickAt(qr);
              float jr = max(1.0 - smoothstep(0.008, 0.012, br.z), 1.0 - smoothstep(0.008, 0.012, br.w));
              roughnessFactor = mix(0.76 + 0.14 * hash12(br.xy + 5.1), 0.96, jr);
            }
            #elif KIND == 4
            {
              vec2 qr = planeUV(vWP, vWN);
              roughnessFactor = 0.42 + 0.14 * vnoise(vec2(qr.x * 20.0, qr.y * 3.0));
            }
            #elif KIND == 5 || KIND == 11
            {
              vec2 qr = planeUV(vWP, vWN);
              roughnessFactor = 0.44 + 0.16 * vnoise(vec2(qr.x * 80.0, qr.y * 6.0));
            }
            #endif`)
          .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
            #if KIND == 1 || KIND == 2 || KIND == 4 || KIND == 5 || KIND == 6 || KIND == 11 || KIND == 12 || KIND == 13 || KIND == 14
            {
              vec2 q = planeUV(vWP, normalize(vWN));
              float near = smoothstep(0.025, 0.004, max(fwidth(q.x), fwidth(q.y)));
              if (near > 0.0) {
                float hb = matHeight(q) * uBump * near;
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
              // porch & reveal recess gets deep sky occlusion around z = -0.08..-1.05, recovering inside the sunlit rooms
              float porchAo = smoothstep(-0.08, -0.95, vWP.z) * (1.0 - smoothstep(-1.15, -2.1, vWP.z));
              float roomCornerAo = smoothstep(0.38, 0.0, abs(vWP.y - 0.45)) * 0.16 * step(-12.0, vWP.z) * step(vWP.z, -1.05);
              float ao = 1.0 - 0.52 * porchAo - roomCornerAo;
              reflectedLight.indirectDiffuse *= ao; reflectedLight.indirectSpecular *= ao;
            }`)
          .replace('#include <dithering_fragment>', `#include <dithering_fragment>
            {
              vec3 N = normalize(vWN);
              float ndl = dot(N, uSun);
              float lit = getShadowMask() * smoothstep(-0.02, 0.06, ndl);
              float shade = 1.0 - lit;
              vec2 q = planeUV(vWP, N);
              vec3 col = uPaper;
              float hw = hatchWipe(vWP) * step(0.001, uHatchIn);
              #if KIND == 3
                col += 0.032 * hw;
              #endif
              #if KIND == 7
                shade = 0.0;
              #endif
              // depth cue: what sits back gets a little grey, so the relief reads before the lens moves
              col += uDepthCue * 0.055 * smoothstep(0.0, -1.1, vWP.z) * (FAINT == 1 ? 0.4 : 1.0);
              float hatchK = FAINT == 1 ? 0.10 : 0.6;
              float hl = lineAt(q.x + q.y, uHatch, uLinePx * 0.95);
              float dense = 1.0 - lineFade(q.x + q.y, uHatch, 3.5);
              hl = mix(hl, 0.32, dense);
              col += 0.03 * shade * hw * (FAINT == 1 ? 0.3 : 1.0);
              col = mix(col, uInk, hl * shade * hatchK * hw);
              float det = detailWipe(vWP) * (FAINT == 1 ? 0.3 : 1.0);
              #if KIND == 1
                if (abs(N.y) < 0.7) {
                  float c4 = lineAt(q.y, 0.3, uLinePx * 0.7) * lineFade(q.y, 0.3, 5.0);
                  float c1 = lineAt(q.y, 0.075, uLinePx * 0.6) * lineFade(q.y, 0.075, 7.0);
                  float crs = floor(q.y / 0.075);
                  float c2 = lineAt(q.x + mod(crs, 2.0) * 0.1125, 0.225, uLinePx * 0.6) * lineFade(q.y, 0.075, 9.0);
                  col = mix(col, uInk, max(max(c4 * 0.17, c1 * 0.15), c2 * 0.12) * det);
                }
              #elif KIND == 4
                col = mix(col, uInk, lineAt(q.x, 0.43, uLinePx * 0.7) * 0.3 * lineFade(q.x, 0.43, 5.0) * det);
              #elif KIND == 5 || KIND == 11
                col = mix(col, uInk, lineAt(q.x, 0.095, uLinePx * 0.6) * 0.25 * lineFade(q.x, 0.095, 5.0) * det);
              #elif KIND == 6
                vec2 g6 = vec2(lineAt(q.x, 0.6, uLinePx * 0.6), lineAt(q.y, 0.6, uLinePx * 0.6));
                col = mix(col, uInk, max(g6.x, g6.y) * 0.12 * lineFade(q.x, 0.6, 6.0) * det);
              #endif
              gl_FragColor.rgb = mix(col, gl_FragColor.rgb, rv);
              #if KIND != 7
                float fb = frontBand(vWP);
                vec3 scanCol = mix(uAccent, vec3(1.0, 0.34, 0.38), smoothstep(0.42, 0.92, fb));
                gl_FragColor.rgb = mix(gl_FragColor.rgb, scanCol, clamp(fb * 0.85, 0.0, 0.94));
              #endif
              #if CLEAR == 1
                gl_FragColor.a = mix(1.0, max(gl_FragColor.a, fb), rv);
              #endif
            }`);
    };
    m.customProgramCacheKey = () => `elev-${K}-${faint}-${realOnly}-${drawOnly}-${clear}`;
    return (MATS[key] = m);
  }

  // Lines draft themselves on: each segment starts at a time set by its height (bottom first)
  // and a little randomness, then grows along its length. o.first: drawn before everything (the ground line).
  const LMATS = [];
  const lineCache = {};
  function lineMat(px, o = {}) {
    const key = px + JSON.stringify(o);
    if (lineCache[key]) return lineCache[key];
    const m = new LineMaterial({ color: o.color || 0xf1eeea, linewidth: px * DPR, transparent: true, toneMapped: false });
    m.resolution.set(W * DPR, H * DPR);
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
        float rv = revealAt(vLW);
        float vis = DRAW_ONLY == 1 ? 1.0 - rv : mix(1.0, uLineReal, rv);
        float grow = (uDraw - vT0) / (FIRST == 1 ? 0.16 : 0.12);
        if (vT > grow) discard;
        if (vis < 0.01) discard;
        gl_FragColor.a *= vis;`);
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
  function add(geo, m, lw = 1, o = {}) {
    const mesh = new THREE.Mesh(geo, m);
    mesh.castShadow = o.cast !== false; mesh.receiveShadow = o.receive !== false;
    (o.parent || root).add(mesh);
    if (lw > 0) {
      const eg = new THREE.EdgesGeometry(geo, o.angle || 25);
      const lg = new LineSegmentsGeometry().fromEdgesGeometry(eg);
      const l = new LineSegments2(lg, lineMat(lw, { color: o.lineColor, drawOnly: o.drawOnlyLines, realLines: o.realLines }));
      l.renderOrder = 2;
      (o.parent || root).add(l);
    }
    return mesh;
  }
  function lines(segs, lw, o = {}) {
    const lg = new LineSegmentsGeometry(); lg.setPositions(segs);
    const l = new LineSegments2(lg, lineMat(lw, { drawOnly: o.drawOnly !== false, color: o.color, first: o.first, realLines: o.realLines }));
    l.renderOrder = 3;
    (o.parent || root).add(l);
    return l;
  }
  const loop = (pts, z) => { const s = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s.push(a[0], a[1], z, b[0], b[1], z); } return s; };

  /* ---------- the house ---------- */
  // x along the street, y up, z towards the street. Facade plane z = 0 (or the setback).
  // Two storeys: ground floor +0.30 (two steps up), upper floor +3.40, eaves +6.70, ridge +9.20.
  // Every house is described with its door on the left; `door: 'right'` mirrors it.
  const T = 0.4, G0 = 0.3, L1 = 3.4, CEIL = 6.25, RH = 2.5;
  function windowIn(g, x0, y0, x1, y1, recess, o) {
    const fw = 0.062, fw2 = 0.032, z1 = -recess, z0 = z1 - 0.075;
    const lw = o.faint ? 0 : 0.7;
    const fm = mat('steel', { faint: o.faint });
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
      const st = mat('stone', { faint: o.faint });
      add(box(x0 - 0.06, y0 - 0.068, -T + 0.06, x1 + 0.06, y0 + 0.012, 0.065), st, o.faint ? 0 : 0.9, { parent: g, lineColor: o.lc, realLines: o.rl });
      if (!o.faint) {
        add(box(x0 - 0.05, y0 - 0.082, 0.0, x1 + 0.05, y0 - 0.068, 0.048), st, 0, { parent: g });
      }
    }
  }

  // The inside of a show house, and its walled garden.
  // The hall behind the door is two storeys high (x 0.24..3.1, z -1.3..-6.0), a steel stair on its west wall,
  // a gallery round it upstairs. East of it, under the gallery, the sitting room behind the street window.
  // Behind both, kitchen and dining table, then a glass wall that slides open to the garden.
  function buildInterior(g, ox, v, doorL, PAR, O) {
    const X = (x) => (doorL ? x : 6 - x);
    const bM = (x0, y0, z0, x1, y1, z1) => (doorL ? box(x0, y0, z0, x1, y1, z1) : box(6 - x1, y0, z0, 6 - x0, y1, z1));
    const addM = (x0, y0, z0, x1, y1, z1, m, lw = 0, opts = {}) => add(bM(x0, y0, z0, x1, y1, z1), m, lw, { parent: g, ...opts });
    const many = (list, m, lw = 0, opts = {}) => add(mergeGeometries(list), m, lw, { parent: g, ...opts });

    const floor = mat('oakFloor');
    const black = mat('wood');                              // black-stained oak joinery
    const plaster = mat('plaster');
    const ceil = mat('plaster', { color: 0xf6f5f2 });
    const slab = mat('travertine');                          // pale honed stone: worktops, table tops
    const basalt = mat('stone', { color: 0x38383c });
    const brick = mat('brick', { color: v.brick });
    const steel = mat('steel');
    const red = mat('lacquer');
    const redCloth = mat('linen', { color: 0xb9141f });
    const linen = mat('linen');
    const coal = mat('linen', { color: 0x2b2b2f });
    const rug = mat('linen', { color: 0x77777b });
    const glow = mat('interior', { realOnly: true });
    const paving = mat('paving');
    const clear = mat('glass', { clear: true });

    // 1. The shell: ground slab, party walls, ceiling, the upper floor with its hole over the hall
    addM(0.0, 0.0, -12.0, 6.0, G0, -0.4, floor, 0.5, O);
    addM(0.72, G0 - 0.005, -1.75, 2.68, G0 + 0.006, -1.3, basalt, 0);                    // a stone mat inside the door
    addM(0.0, G0, -12.0, 0.24, CEIL, -0.4, plaster, 0.5, O);
    addM(5.76, G0, -12.0, 6.0, CEIL, -0.4, plaster, 0.5, O);
    addM(0.24, CEIL, -12.0, 5.76, CEIL + 0.2, -0.4, ceil, 0);
    addM(0.24, G0, -1.3, 0.3, 3.0, -0.4, plaster, 0);                                     // between party wall and the porch cheek
    addM(0.24, G0, -6.0, 0.262, CEIL, -1.3, brick, 0.5, O);                               // the hall's west wall: the brick left bare, two storeys of it
    addM(5.738, G0, -11.9, 5.76, L1 - 0.25, -6.05, brick, 0.5, O);                        // and the east wall of the kitchen
    addM(0.24, L1 - 0.25, -1.3, 3.1, L1, -0.4, ceil, 0.6, O);                             // the seat of the bay, over the porch
    addM(3.1, L1 - 0.25, -6.0, 5.76, L1, -0.4, ceil, 0.6, O);                             // gallery over the sitting room
    addM(0.24, L1 - 0.25, -12.0, 5.76, L1, -6.0, ceil, 0.6, O);                           // the rooms over the kitchen
    addM(3.1, L1, -6.0, 5.76, L1 + 0.012, -0.4, floor, 0);                                // black boards on the gallery
    addM(0.24, L1, -6.34, 5.76, L1 + 0.012, -6.0, floor, 0);
    // skirtings: a shadow gap in black steel
    addM(0.24, G0, -11.9, 0.26, G0 + 0.09, -1.3, steel, 0);
    addM(5.74, G0, -11.9, 5.76, G0 + 0.09, -0.4, steel, 0);
    // under the street window: lining and a deep bench in black oak
    addM(3.1, G0, -0.46, 5.76, 0.94, -0.38, plaster, 0);
    addM(3.3, 0.92, -0.74, 5.76, 1.0, -0.2, black, 0.6, O);
    // upstairs, the wall of the rooms at the back, a door in it, and a wall of books along the gallery
    addM(0.24, L1, -6.5, 5.76, CEIL, -6.34, plaster, 0.5, O);
    addM(1.5, L1, -6.34, 2.4, 5.5, -6.31, black, 0.4, O);
    addM(2.3, L1 + 1.0, -6.31, 2.34, L1 + 1.14, -6.28, steel, 0);
    addM(5.34, L1, -5.7, 5.76, CEIL - 0.1, -0.7, black, 0.6, O);
    {
      const shelf = [], R = mulberry(71), bA = [], bB = [], bC = [];
      for (let y = L1 + 0.5; y < CEIL - 0.3; y += 0.44) shelf.push(bM(5.3, y, -5.7, 5.36, y + 0.03, -0.7));
      for (let z = -5.7; z <= -0.69; z += 1.0) shelf.push(bM(5.3, L1, z - 0.018, 5.36, CEIL - 0.1, z + 0.018));
      many(shelf, black, 0.4, O);
      for (let s = 0; s < 6; s++) {
        const sy = L1 + 0.09 + s * 0.44 + (s > 0 ? 0.03 : 0) - (s > 0 ? 0.03 : 0);
        for (let b = 0; b < 5; b++) {
          let bz = -5.64 + b * 1.0;
          const zEnd = bz + 0.9;
          while (bz < zEnd - 0.05) {
            if (R() < 0.2) { bz += 0.08 + R() * 0.1; continue; }
            const thick = 0.024 + R() * 0.028, bh = 0.22 + R() * 0.14, depth = 0.2 + R() * 0.06;
            const gBook = bM(5.34 - depth, sy, bz, 5.34, sy + bh, bz + thick);
            const pick = R();
            (pick < 0.44 ? bA : pick < 0.78 ? bB : bC).push(gBook);
            bz += thick + 0.004;
          }
        }
      }
      if (bA.length) many(bA, linen, 0.3, O);
      if (bB.length) many(bB, coal, 0.3, O);
      if (bC.length) many(bC, redCloth, 0.3, O);
    }
    // balustrades round the hole: glass, a steel rail
    const rail = (x0, z0, x1, z1) => {
      const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
      if (alongX) { addM(x0, L1, z0 - 0.012, x1, L1 + 1.0, z0 + 0.012, clear, 0, { cast: false }); addM(x0, L1 + 1.0, z0 - 0.03, x1, L1 + 1.045, z0 + 0.03, steel, 0.5, O); }
      else { addM(x0 - 0.012, L1, z0, x0 + 0.012, L1 + 1.0, z1, clear, 0, { cast: false }); addM(x0 - 0.03, L1 + 1.0, z0, x0 + 0.03, L1 + 1.045, z1, steel, 0.5, O); }
    };
    rail(3.1, -6.0, 3.1, -1.3); rail(1.2, -6.0, 3.1, -6.0); rail(0.24, -1.3, 3.1, -1.3);

    // 2. The hall: a folded stair of black steel plate up the west wall, seventeen risers
    {
      const n = 17, rise = (L1 - G0) / n, go = 0.25, plate = [], bars = [];
      for (let i = 0; i < n; i++) {
        const z = -1.9 - i * go, y = G0 + i * rise;
        plate.push(bM(0.26, y, z - 0.014, 1.16, y + rise, z + 0.014));
        plate.push(bM(0.26, y + rise - 0.028, z - (i === n - 1 ? 0.1 : go), 1.16, y + rise, z));
        if (i % 2 === 0) bars.push(bM(1.135, y + rise, z - 0.135, 1.16, y + rise + 0.95, z - 0.11));
        if (i < n - 1) bars.push(bM(1.125, y + rise * 1.5 + 0.93, z - go - 0.02, 1.17, y + rise * 1.5 + 0.975, z + 0.02));
      }
      many(plate, mat('steel', { color: 0x2c2c31 }), 0.5, O);
      many(bars, steel, 0.35, O);
    }
    // a large framed drawing over the stair, a cluster of three lamps hanging in the height of the hall
    addM(0.262, 3.75, -4.7, 0.3, 5.45, -2.3, steel, 0.5, O);
    addM(0.3, 3.81, -4.64, 0.313, 5.39, -2.36, ceil, 0);
    addM(0.313, 4.15, -4.2, 0.322, 5.05, -3.3, red, 0);
    addM(0.313, 4.02, -3.18, 0.322, 5.18, -3.1, steel, 0);
    [[-2.9, 3.35, 1.75], [-3.6, 4.1, 2.15], [-4.25, 3.0, 1.9]].forEach(([pz, py, px]) => {
      addM(px - 0.006, py, pz - 0.006, px + 0.006, CEIL, pz + 0.006, steel, 0);
      add(new THREE.SphereGeometry(0.15, 16, 12).translate(X(px), py, pz), glow, 0, { parent: g, cast: false });
    });

    // 3. The sitting room, under the gallery: a red sofa on the east wall, a low stone table, a chair by the window
    const SZ = -1.55; // how far back the group sits
    addM(3.35, G0, -5.3 + SZ + 0.9, 5.6, G0 + 0.018, -1.5 + SZ, rug, 0.4, O);
    addM(4.86, G0 + 0.02, -4.1 + SZ, 5.72, G0 + 0.14, -1.7 + SZ, black, 0.5, O);
    addM(5.5, G0 + 0.14, -4.1 + SZ, 5.72, G0 + 0.84, -1.7 + SZ, redCloth, 0.6, O);
    addM(4.86, G0 + 0.14, -1.9 + SZ, 5.5, G0 + 0.62, -1.7 + SZ, redCloth, 0.6, O);
    addM(4.86, G0 + 0.14, -4.1 + SZ, 5.5, G0 + 0.62, -3.9 + SZ, redCloth, 0.6, O);
    for (let i = 0; i < 3; i++) {
      const cz0 = -1.92 - i * 0.66 + SZ, cz1 = cz0 - 0.64;
      addM(4.84, G0 + 0.14, cz1, 5.5, G0 + 0.42, cz0, redCloth, 0.5, O);
      addM(5.32, G0 + 0.42, cz1 + 0.03, 5.5, G0 + 0.84, cz0 - 0.03, redCloth, 0.45, O);
    }
    addM(5.14, G0 + 0.42, -2.34 + SZ, 5.34, G0 + 0.72, -2.0 + SZ, linen, 0.4, O);
    addM(5.14, G0 + 0.42, -3.8 + SZ, 5.34, G0 + 0.72, -3.46 + SZ, coal, 0.4, O);
    addM(3.95, G0 + 0.02, -3.5 + SZ, 4.45, G0 + 0.28, -2.3 + SZ, black, 0.4, O);
    addM(3.9, G0 + 0.28, -3.56 + SZ, 4.5, G0 + 0.34, -2.24 + SZ, slab, 0.6, O);
    addM(4.02, G0 + 0.34, -2.8 + SZ, 4.34, G0 + 0.38, -2.42 + SZ, red, 0.35, O);
    add(new THREE.CylinderGeometry(0.08, 0.06, 0.16, 12).translate(X(4.2), G0 + 0.42, -3.2 + SZ), steel, 0.35, O);
    addM(3.5, G0 + 0.02, -1.5, 4.2, G0 + 0.3, -0.85, black, 0.5, O);
    addM(3.53, G0 + 0.26, -1.47, 4.17, G0 + 0.44, -0.9, linen, 0.5, O);
    addM(3.53, G0 + 0.44, -1.0, 4.17, G0 + 0.84, -0.84, linen, 0.5, O);
    // a painting over the sofa, a standing lamp, a line of light in the ceiling
    addM(5.72, 1.55, -3.9 + SZ, 5.76, 2.75, -1.9 + SZ, steel, 0.5, O);
    addM(5.705, 1.6, -3.85 + SZ, 5.72, 2.7, -1.95 + SZ, ceil, 0);
    addM(5.696, 1.85, -3.45 + SZ, 5.706, 2.45, -2.85 + SZ, coal, 0);
    add(new THREE.CylinderGeometry(0.26, 0.26, 0.012, 28).rotateZ(Math.PI / 2).translate(X(5.699), 2.25, -2.55 + SZ), red, 0, { parent: g, cast: false });
    addM(5.38, G0, -2.82, 5.42, 1.86, -2.78, steel, 0);
    add(new THREE.SphereGeometry(0.13, 14, 10).translate(X(5.4), 1.95, -2.8), glow, 0, { parent: g, cast: false });
    addM(3.3, L1 - 0.262, -5.4, 3.38, L1 - 0.25, -1.0, glow, 0, { cast: false });

    // 4. Kitchen and dining, under the upper rooms
    addM(0.24, G0, -7.3, 0.88, 2.6, -6.4, black, 0.6, O);       // tall units
    addM(0.24, G0, -11.5, 0.88, 2.6, -10.5, black, 0.6, O);
    addM(0.24, G0, -10.5, 0.88, 1.2, -7.3, black, 0.6, O);      // base units
    addM(0.24, 1.2, -10.5, 0.9, 1.26, -7.3, slab, 0.5, O);      // worktop
    addM(0.24, 1.26, -10.5, 0.3, 1.9, -7.3, slab, 0.4, O);      // splashback
    addM(0.24, 1.9, -10.5, 0.66, 2.6, -7.3, plaster, 0.6, O);   // wall units, white
    addM(0.32, 1.875, -10.4, 0.58, 1.9, -7.4, glow, 0, { cast: false });
    // the island, with a waterfall top
    addM(1.4, G0, -9.25, 2.16, 1.14, -6.95, black, 0.5, O);
    addM(1.38, 1.14, -9.3, 2.22, 1.21, -6.9, slab, 0.7, O);
    addM(1.38, G0, -6.98, 2.22, 1.14, -6.9, slab, 0.6, O);
    addM(1.38, G0, -9.3, 2.22, 1.14, -9.22, slab, 0.6, O);
    addM(1.58, 1.21, -8.52, 1.62, 1.52, -8.48, steel, 0.4, O);
    addM(1.58, 1.48, -8.52, 1.77, 1.52, -8.48, steel, 0.4, O);
    for (let i = 0; i < 3; i++) {
      const sz = -7.35 - i * 0.75;
      addM(2.26, G0, sz - 0.16, 2.56, 0.84, sz + 0.16, steel, 0.4, O);
      addM(2.24, 0.84, sz - 0.18, 2.58, 0.9, sz + 0.18, linen, 0.5, O);
    }
    addM(1.78, 2.3, -9.0, 1.84, 2.36, -7.2, steel, 0.5, O);
    addM(1.79, 2.275, -8.9, 1.83, 2.3, -7.3, glow, 0, { cast: false });
    addM(1.8, 2.36, -8.12, 1.82, L1 - 0.25, -8.08, steel, 0);
    // a sideboard on the east wall, and on it the one red vessel
    addM(5.3, G0, -8.7, 5.76, 1.05, -6.5, black, 0.6, O);
    addM(5.28, 1.05, -8.72, 5.76, 1.09, -6.48, slab, 0.5, O);
    add(new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.125, 0.1], [0.115, 0.24], [0.05, 0.34], [0.06, 0.4]].map((q) => new THREE.Vector2(q[0], q[1])), 28).translate(X(5.52), 1.09, -7.1), red, 0, { parent: g });
    add(new THREE.CylinderGeometry(0.07, 0.09, 0.2, 12).translate(X(5.52), 1.19, -7.9), mat('stone'), 0.4, O);
    // the table by the garden glass, six chairs, three lamps over it
    addM(3.95, 1.02, -11.5, 4.95, 1.08, -9.3, black, 0.7, O);
    addM(4.07, G0, -11.2, 4.83, 1.02, -11.1, black, 0.5, O);
    addM(4.07, G0, -9.7, 4.83, 1.02, -9.6, black, 0.5, O);
    addM(4.41, 0.5, -11.1, 4.49, 0.57, -9.7, black, 0.4, O);
    add(new THREE.CylinderGeometry(0.22, 0.12, 0.11, 16).translate(X(4.45), 1.135, -10.4), slab, 0.4, O);
    {
      const chairs = [], pads = [];
      for (let i = 0; i < 3; i++) {
        const cz = -9.75 - i * 0.65;
        chairs.push(bM(3.5, G0, cz - 0.2, 3.55, 1.14, cz + 0.2), bM(3.82, G0, cz - 0.2, 3.87, 0.76, cz + 0.2));
        pads.push(bM(3.52, 0.76, cz - 0.21, 3.88, 0.81, cz + 0.21));
        chairs.push(bM(5.35, G0, cz - 0.2, 5.4, 1.14, cz + 0.2), bM(5.03, G0, cz - 0.2, 5.08, 0.76, cz + 0.2));
        pads.push(bM(5.02, 0.76, cz - 0.21, 5.38, 0.81, cz + 0.21));
      }
      many(chairs, black, 0.45, O);
      many(pads, linen, 0.35, O);
    }
    [[-9.8, 2.1], [-10.4, 1.96], [-11.0, 2.18]].forEach(([pz, py]) => {
      addM(4.44, py, pz - 0.006, 4.452, L1 - 0.25, pz + 0.006, steel, 0);
      add(new THREE.SphereGeometry(0.12, 14, 10).translate(X(4.446), py, pz), glow, 0, { parent: g, cast: false });
    });

    // 5. The back of the house: brick upstairs, and below it a wall of glass, four panels, the middle two sliding
    addM(0.0, L1 - 0.25, -12.3, 6.0, PAR - 0.3, -12.0, brick, 0.6, O);
    addM(-0.02, PAR - 0.3, -12.34, 6.02, PAR - 0.22, -11.98, mat('stone'), 0.5, O);
    addM(0.24, 2.9, -12.08, 5.76, L1 - 0.25, -11.9, steel, 0.5, O);                        // the track and its beam
    addM(0.24, G0 - 0.01, -12.08, 5.76, G0 + 0.02, -11.9, steel, 0);
    const pane = (parent, x0, x1, z) => {
      const f = 0.045, bars = [box(x0, G0 + 0.02, z - 0.025, x1, G0 + 0.02 + f, z + 0.025), box(x0, 2.9 - f, z - 0.025, x1, 2.9, z + 0.025), box(x0, G0 + 0.02, z - 0.025, x0 + f, 2.9, z + 0.025), box(x1 - f, G0 + 0.02, z - 0.025, x1, 2.9, z + 0.025)];
      add(mergeGeometries(bars), steel, 0.6, { parent, lineColor: O.lineColor, realLines: O.realLines });
      add(box(x0 + f, G0 + 0.02 + f, z - 0.006, x1 - f, 2.9 - f, z + 0.006), clear, 0, { parent, cast: false });
    };
    pane(g, 0.24, 1.64, -12.03); pane(g, 4.36, 5.76, -12.03);
    const gDoorL = new THREE.Group(), gDoorR = new THREE.Group();
    g.add(gDoorL, gDoorR);
    pane(gDoorL, 1.62, 3.0, -11.96); pane(gDoorR, 3.0, 4.38, -11.96);
    add(box(2.9, 1.1, -11.93, 2.93, 1.5, -11.9), steel, 0, { parent: gDoorL }); add(box(3.07, 1.1, -11.93, 3.1, 1.5, -11.9), steel, 0, { parent: gDoorR });

    // 6. The garden: a terrace, one step down to gravel, white brick walls, and a red maple in a raised bed
    addM(0.0, 0.0, -14.4, 6.0, G0 - 0.02, -12.08, paving, 0.5, O);
    addM(0.0, 0.0, -17.8, 6.0, 0.14, -14.4, paving, 0.5, O);
    addM(0.22, 0.14, -14.46, 5.78, G0 - 0.015, -14.34, basalt, 0.5, O);
    addM(0.0, 0.14, -17.8, 0.24, 2.5, -12.3, brick, 0.6, O);
    addM(-0.02, 2.5, -17.82, 0.26, 2.58, -12.3, mat('stone'), 0.5, O);
    addM(5.76, 0.14, -17.8, 6.0, 2.5, -12.3, brick, 0.6, O);
    addM(5.74, 2.5, -17.82, 6.02, 2.58, -12.3, mat('stone'), 0.5, O);
    addM(0.0, 0.14, -17.8, 6.0, 2.5, -17.52, brick, 0.6, O);
    addM(-0.02, 2.5, -17.82, 6.02, 2.58, -17.5, mat('stone'), 0.5, O);
    addM(3.6, 0.14, -17.52, 5.76, 0.66, -14.9, brick, 0.6, O);                              // the raised bed, in the same brick, a stone cap on it
    addM(3.56, 0.66, -17.52, 5.76, 0.73, -14.86, mat('stone'), 0.5, O);
    addM(3.74, 0.66, -17.4, 5.64, 0.75, -15.04, mat('foliage'), 0);
    tree(ox + X(4.68), (v.setback || 0) - 16.15, 6.3, 1.5, 0xb3141f);
    addM(0.5, 0.56, -16.5, 0.98, 0.62, -14.9, black, 0.5, O);                               // a bench along the west wall
    addM(0.56, 0.14, -16.42, 0.92, 0.56, -16.34, steel, 0.4, O);
    addM(0.56, 0.14, -15.06, 0.92, 0.56, -14.98, steel, 0.4, O);
    addM(3.28, 0.14, -14.84, 3.4, 0.78, -14.72, steel, 0.4, O);                             // a bollard lamp
    addM(3.3, 0.62, -14.82, 3.38, 0.74, -14.74, glow, 0, { cast: false });

    // 7. Lamps that are on
    const ptHall = new THREE.PointLight(0xfff6ee, 3.4, 10.5, 1.3); ptHall.position.set(X(1.9), 3.6, -3.5);
    const ptSit = new THREE.PointLight(0xfff6ee, 3.2, 8.5, 1.3); ptSit.position.set(X(4.2), 2.5, -4.2);
    const ptBack = new THREE.PointLight(0xfff6ee, 4.4, 12, 1.2); ptBack.position.set(X(3.2), 2.6, -9.0);
    g.add(ptHall, ptSit, ptBack);

    return { gDoorL, gDoorR };
  }

  function house(ox, v = {}) {
    const g = new THREE.Group(); g.position.set(ox, 0, v.setback || 0); root.add(g);
    const faint = !!v.faint, lc = faint ? 0x4a4a50 : v.accent ? 0xe5202e : undefined, LW = faint ? 0.8 : 1.5, lw = faint ? 0.6 : 0.8;
    const rl = v.accent ? 0.75 : undefined;
    const PAR = v.par || 6.7;
    const doorL = v.door !== 'right';
    const X = (x) => (doorL ? x : 6 - x);
    const bx = (x0, y0, z0, x1, y1, z1) => (doorL ? box(x0, y0, z0, x1, y1, z1) : box(6 - x1, y0, z0, 6 - x0, y1, z1));
    const R4 = (x0, y0, x1, y1) => (doorL ? [x0, y0, x1, y1] : [6 - x1, y0, 6 - x0, y1]);
    const EX = [0.5, 2.9], DX = [0.7, 2.7], pz = -1.2;        // the porch, and the glass door at the back of it
    const first = v.first || 'bay';
    const holes = [R4(EX[0], G0, EX[1], 3.0), R4(3.55, 1.0, 5.5, 3.0)];
    const ff = first === 'frame' ? [[0.9, 3.95, 5.1, 6.0]] : [R4(0.75, 3.9, 3.25, 5.9), R4(4.05, 3.9, 5.35, 6.0)];
    holes.push(...ff);
    const brick = mat('brick', { faint, color: v.brick });
    const O = { parent: g, lineColor: lc, realLines: rl };
    add(panel([0, 0, 6, PAR], holes, -T, 0), brick, LW, O);
    const st = mat('stone', { faint });
    const base = mat('stone', { faint, color: 0x38383c });
    const stm = mat('steel', { faint });
    const zm = mat('zinc', { faint });

    // a base course of dark stone, with a thin ledge on top
    add(bx(0, 0, 0, EX[0], G0, 0.026), base, lw, O);
    add(bx(EX[1], 0, 0, 6, G0, 0.026), base, lw, O);
    if (!faint) {
      add(bx(0, G0 - 0.02, 0.026, EX[0], G0 + 0.01, 0.042), base, 0, { parent: g });
      add(bx(EX[1], G0 - 0.02, 0.026, 6, G0 + 0.01, 0.042), base, 0, { parent: g });
    }

    // the porch, set back 1.2 m: brick cheeks, a stone soffit, a stone floor, two steps up from the street
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

    // the door: a black steel portal, and in it two leaves of glass in red frames, 2.0 m by 2.55 m together
    const show = !faint && v.interior !== false;
    add(panel(R4(EX[0], G0, EX[1], 3.0), [R4(DX[0], G0, DX[1], 2.86)], pz - 0.1, pz), stm, lw, O);
    const hA = Math.min(X(DX[0]), X(DX[1])) + 0.012, hB = Math.max(X(DX[0]), X(DX[1])) - 0.012, wL = (hB - hA) / 2 - 0.004;
    const red = mat('lacquer', { faint }), doorGlass = show ? mat('glass', { clear: true, door: true }) : mat('glass', { faint });
    const leaves = [1, -1].map((s) => {
      const piv = new THREE.Group(); piv.position.set(s > 0 ? hA : hB, 0, pz - 0.035); g.add(piv);
      const q = (a, b) => (s > 0 ? [a, b] : [-b, -a]);       // along the leaf, from the hinge
      const f = 0.06, y0 = G0 + 0.012, y1 = 2.85, bars = [];
      const B = (a, b, c, d, z0 = -0.05, z1 = 0) => { const [p0, p1] = q(a, b); return box(p0, c, z0, p1, d, z1); };
      bars.push(B(0, wL, y0, y0 + 0.11), B(0, wL, y1 - f, y1), B(0, f, y0, y1), B(wL - f, wL, y0, y1));
      add(mergeGeometries(bars), red, lw, { parent: piv, lineColor: lc, realLines: rl });
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
    windowIn(g, ...R4(3.55, 1.0, 5.5, 3.0), 0.22, { faint, lc, rl, sill: true, panes: 2 });
    // upstairs
    if (first === 'frame') {
      add(panel([0.72, 3.77, 5.28, 6.18], [[0.9, 3.95, 5.1, 6.0]], 0, 0.38), mat('stone', { faint, color: 0xc9c9c7 }), LW, O);
      if (!faint) add(panel([0.85, 3.9, 5.15, 6.05], [[0.9, 3.95, 5.1, 6.0]], 0, 0.22), mat('stone', { faint, color: 0xbdbdbb }), 0, { parent: g });
      windowIn(g, 0.9, 3.95, 5.1, 6.0, 0.16, { faint, lc, rl, panes: 3, transom: 5.4 });
    } else {
      // a bay of zinc, 800 mm out over the porch, glazed across its front
      add(bx(0.6, 3.72, 0, 3.4, 3.9, 0.8), zm, LW, O);
      add(bx(0.6, 5.9, 0, 3.4, 6.08, 0.8), zm, LW, O);
      add(bx(0.6, 3.9, 0, 0.75, 5.9, 0.8), zm, lw, O);
      add(bx(3.25, 3.9, 0, 3.4, 5.9, 0.8), zm, lw, O);
      windowIn(g, ...R4(0.75, 3.9, 3.25, 5.9), -0.74, { faint, lc, rl, panes: 3 });
      // beside it a tall window with a guard of steel bars
      windowIn(g, ...R4(4.05, 3.9, 5.35, 6.0), 0.2, { faint, lc, rl, sill: true, panes: 1, transom: 5.35 });
      const bars = [];
      for (let x = 4.07; x < 5.34; x += 0.115) bars.push(bx(x, 3.92, 0.03, x + 0.02, 4.86, 0.05));
      bars.push(bx(4.03, 4.86, 0.02, 5.37, 4.9, 0.062));
      if (!faint) bars.push(bx(4.03, 3.94, 0.026, 5.37, 3.965, 0.054));
      add(mergeGeometries(bars), stm, faint ? 0 : 0.55, O);
    }

    if (v.roof !== 'none') {
      // eaves, then a roof of standing-seam zinc that falls to the street, and a chimney on the ridge
      add(box(0, PAR - 0.03, -T, 6, PAR + 0.1, 0.36), zm, LW, O);
      const prof = new THREE.Shape([[0.36, PAR + 0.1], [-4.6, PAR + RH], [-9.56, PAR + 0.1]].map((p) => new THREE.Vector2(p[0], p[1])));
      add(new THREE.ExtrudeGeometry(prof, { depth: 6, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(6, 0, 0), zm, LW, O);
      add(bx(4.5, PAR + RH - 0.9, -5.0, 5.3, PAR + RH + 0.85, -4.2), brick, lw, O);
      add(bx(4.46, PAR + RH + 0.85, -5.04, 5.34, PAR + RH + 0.93, -4.16), st, lw, O);
    } else {
      // a parapet with a stone coping
      add(box(0, PAR, -T - 0.04, 6, PAR + 0.085, 0.055), st, LW, O);
      if (!faint) add(box(0, PAR - 0.035, 0, 6, PAR, 0.028), st, 0, { parent: g });
    }

    let gardenDoors = null;
    if (show) gardenDoors = buildInterior(g, ox, v, doorL, PAR, O);
    else add(box(0, 0, -12, 6, PAR - 0.3, pz - 0.12), mat('plain', { faint }), 0, { parent: g });

    if (v.relief) {
      const bricks = [];
      const bay = doorL ? [0.45, 3.55] : [2.45, 5.55]; // no headers behind the bay
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
      add(mergeGeometries(bricks), mat('brick', { faint, color: v.header || 0x2b2b2f }), faint ? 0 : 0.55, O);
    }

    const zs = v.setback || 0;
    return {
      g, PAR, ox, doorL,
      door: [ox + X((DX[0] + DX[1]) / 2), 1.7, zs + pz],
      doorX: [ox + Math.min(X(DX[0]), X(DX[1])), ox + Math.max(X(DX[0]), X(DX[1]))],
      // a camera key from where the lens stands, written for a house with its door on the left
      // (see viewKey): the house mirrors it if its door is on the right
      key(p, cam, yaw, pitch, fov, fh, extra) { return viewKey(p, [ox + X(cam[0]), cam[1], zs + cam[2]], doorL ? yaw : -yaw, pitch, fov, fh, extra); },
      setDoor(open01) {
        const a = clamp01(open01) * (82 * Math.PI / 180);
        leaves.forEach(({ piv, s }) => { piv.rotation.y = s * a; });
      },
      setGardenDoor(open01) {
        if (!gardenDoors) return;
        const d = clamp01(open01) * 1.3;
        gardenDoors.gDoorL.position.x = -d; gardenDoors.gDoorR.position.x = d;
      },
    };
  }

  function street(x0, x1, sky = true) {
    add(box(x0, -0.15, 0, x1, 0, 3.2), mat('paving'), 0, { cast: false });
    add(box(x0, -0.15, 3.2, x1, 0.01, 3.38), mat('stone'), 0, { cast: false });
    add(new THREE.PlaneGeometry(x1 - x0, 30).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, -0.15, 18.4), mat('plain', { color: 0x1c1c1f }), 0, { cast: false });
    if (sky) add(new THREE.PlaneGeometry(400, 120).translate(0, 40, -60), mat('sky'), 0, { cast: false });
    lines([x0, 0, 3.4, x1, 0, 3.4], 2.6, { first: true });
  }

  function figure(x, z, s = 1, flip = false) {
    const P = [[0, 1.75], [0.07, 1.73], [0.1, 1.66], [0.09, 1.58], [0.06, 1.53], [0.2, 1.47], [0.24, 1.36], [0.26, 1.06], [0.24, 0.84], [0.2, 0.86], [0.2, 1.2], [0.18, 1.0], [0.17, 0.84], [0.14, 0.45], [0.13, 0.06], [0.17, 0.0], [0.03, 0.0], [0.02, 0.8]];
    const pts = [...P, ...P.slice(1, -1).reverse().map(([a, b]) => [-a, b])].map(([a, b]) => [x + (flip ? -a : a) * s, b * s]);
    const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
    add(new THREE.ShapeGeometry(shape).translate(0, 0, z), mat('plain', { drawOnly: true, color: 0x0c0c0e }), 0, { cast: false });
    lines(loop(pts, z + 0.01), 0.9);
  }

  function tree(x, z, h = 7.5, r = 2.3, leaf) {
    const R = mulberry(Math.round(x * 100) + 7);
    add(new THREE.CylinderGeometry(0.1, 0.17, h * 0.62, 8).translate(x, h * 0.31, z), mat('wood', { realOnly: true, color: 0x2a2a2d }), 0);
    const blobs = [];
    for (let i = 0; i < 70; i++) {
      const a = R() * Math.PI * 2, e = (R() - 0.5) * 2.4, rr = r * (0.25 + 0.65 * Math.sqrt(R()));
      blobs.push(new THREE.IcosahedronGeometry(0.32 + R() * 0.4, 1).translate(x + Math.cos(a) * rr, h - r + Math.sin(e) * r * 0.75, z + Math.sin(a) * rr * 0.7));
    }
    add(mergeGeometries(blobs), mat('foliage', { realOnly: true, color: leaf }), 0);
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
    let a = keyFor(keys[0]), b = a, u = 0;
    for (let i = 0; i < keys.length - 1; i++) {
      if (p >= keys[i].p) { a = keyFor(keys[i]); b = keyFor(keys[i + 1]); u = span(p, keys[i].p, keys[i + 1].p); }
    }
    if (p >= keys[keys.length - 1].p) { a = b = keyFor(keys[keys.length - 1]); u = 0; }
    const e = (a.ease || ease)(u);
    const L = (x, y) => lerp(x, y, e), LL = (x, y) => Math.exp(lerp(Math.log(x), Math.log(y), e));
    return {
      t: [L(a.t[0], b.t[0]), L(a.t[1], b.t[1]), L(a.t[2], b.t[2])],
      fh: LL(fitFh(a), fitFh(b)), fov: LL(a.fov, b.fov), yaw: L(a.yaw || 0, b.yaw || 0), pitch: L(a.pitch || 0, b.pitch || 0),
    };
  }
  // a key written from where the lens stands (interiors are easier to think about that way): the target follows from it
  function viewKey(p, cam, yaw, pitch, fov, fh, extra = {}) {
    const d = (fh / 2) / Math.tan(fov * D2R / 2);
    const dir = [Math.sin(yaw * D2R) * Math.cos(pitch * D2R), Math.sin(pitch * D2R), Math.cos(yaw * D2R) * Math.cos(pitch * D2R)];
    return { p, t: [cam[0] - dir[0] * d, cam[1] - dir[1] * d, cam[2] - dir[2] * d], fh, fov, yaw, pitch, ...extra };
  }
  const lastTarget = new THREE.Vector3();
  function setCam(c) {
    camera.fov = c.fov; camera.aspect = W / H;
    const d = (c.fh / 2) / Math.tan(c.fov * D2R / 2);
    lastTarget.set(...c.t);
    const dir = new THREE.Vector3(Math.sin(c.yaw * D2R) * Math.cos(c.pitch * D2R), Math.sin(c.pitch * D2R), Math.cos(c.yaw * D2R) * Math.cos(c.pitch * D2R));
    camera.position.copy(lastTarget).addScaledVector(dir, d);
    camera.near = Math.max(0.05, d - 80, d * 0.03); camera.far = d + 260;
    camera.lookAt(lastTarget); camera.updateProjectionMatrix();
    S.camDist = d;
    S.camTarget = lastTarget;
  }

  /* ---------- overlay pins ---------- */
  const pins = [];
  function pin(el, p, o = {}) { pins.push({ el, p: new THREE.Vector3(...p), ...o }); return el; }
  const v3 = new THREE.Vector3();
  function placePins() {
    pins.forEach((q) => {
      v3.copy(q.p).project(camera);
      const x = (v3.x + 1) / 2 * W, y = (1 - v3.y) / 2 * H;
      q.el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) ${q.tf || ''}`;
      q.el.style.visibility = v3.z > 1 ? 'hidden' : '';
    });
  }

  function resize() {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    LMATS.forEach((m) => m.resolution.set(W * DPR, H * DPR));
  }
  addEventListener('resize', resize);

  Object.assign(S, {
    THREE, U, scene, root, renderer, camera, sun, hemi, DPR, phone, get W() { return W; }, get H() { return H; },
    mat, lineMat, add, lines, loop, box, panel, house, street, figure, tree, aimSun, setSun, camAt, setCam, viewKey, pin, placePins,
    render() { placePins(); renderer.render(scene, camera); },
  });
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

  // p follows the page's own scroll position with a short lag
  const noSmooth = Q.has('nosmooth');
  let pEase = (scrollY / innerHeight) * 100, pT = performance.now();
  function scrollP(now) {
    const target = (scrollY / innerHeight) * 100, dt = Math.min(0.25, Math.max(0, (now - pT) / 1000)); pT = now;
    pEase = noSmooth ? target : pEase + (target - pEase) * (1 - Math.exp(-7.5 * dt));
    if (Math.abs(target - pEase) < 0.01) pEase = target;
    return pEase;
  }
  function jumpToP(targetP) { window.scrollTo({ top: (targetP / 100) * innerHeight, behavior: 'smooth' }); }
  window.__jumpToP = jumpToP;

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
        <path d="M-4.0 0 H17.6 M-4.0 6.0 H17.6 M0 0 V0.5 M0 2.9 V6.0 M0 0.5 H1.2 M0 2.9 H1.2 M1.2 0.5 V0.7 M1.2 2.7 V2.9 M12.0 0 V1.64 M12.0 4.36 V6.0 M17.6 0 V6.0" fill="none" stroke="#f1eeea" stroke-width="0.28" opacity="0.82" pointer-events="none"/>
        <!-- steps, the two door leaves, the stair, the edge of the gallery, sofa, low table, island, dining table, the garden step -->
        <path d="M-0.6 0.5 V2.9 M-0.3 0.5 V2.9 M1.2 0.7 L2.15 0.84 M1.2 2.7 L2.15 2.56 M1.9 0.24 H5.9 V1.14 H1.9 Z M1.7 4.86 H4.1 V5.72 H1.7 Z M2.3 3.95 H3.5 V4.45 H2.3 Z M6.95 1.4 H9.25 V2.2 H6.95 Z M9.3 3.95 H11.5 V4.95 H9.3 Z M14.4 0 V6.0" fill="none" stroke="#f1eeea" stroke-width="0.16" opacity="0.48" pointer-events="none"/>
        <path d="M1.3 3.1 H6.0 V1.2" fill="none" stroke="#f1eeea" stroke-width="0.14" stroke-dasharray="0.35 0.25" opacity="0.5" pointer-events="none"/>
        <circle cx="16.15" cy="4.68" r="1.0" fill="none" stroke="#e5202e" stroke-width="0.18" stroke-dasharray="0.4 0.3" opacity="0.8" pointer-events="none"/>
        <line id="cm-scan" x1="0" y1="-0.5" x2="0" y2="6.5" stroke="#e5202e" stroke-width="0.28" stroke-dasharray="0.6 0.4" opacity="0" pointer-events="none"/>
        <polygon id="cm-cone" points="-2.5,3.0 0.5,1.8 0.5,4.2" fill="rgba(229,32,46,0.3)" stroke="#e5202e" stroke-width="0.18" pointer-events="none"/>
        <circle id="cm-dot" cx="-2.5" cy="3.0" r="0.52" fill="#e5202e" stroke="#f1eeea" stroke-width="0.14" pointer-events="none"/>
      </svg>
      <div class="cm-pills">${zoneBtns}</div>`;
    document.body.appendChild(cm);
    cmLbl = cm.querySelector('#cm-pos');
    cmDot = cm.querySelector('#cm-dot');
    cmCone = cm.querySelector('#cm-cone');
    cmScan = cm.querySelector('#cm-scan');
    cmZones = [...cm.querySelectorAll('.cm-zone')];
    cmBtns = [...cm.querySelectorAll('.cm-btn')];
    [...cmZones, ...cmBtns].forEach((el) => {
      el.addEventListener('mouseenter', () => { hoverTag = el.dataset.tag || ''; });
      el.addEventListener('mouseleave', () => { hoverTag = ''; });
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

  let p = 0, t0 = performance.now(), introT = -1;
  function tick(now) {
    p = scrollP(now);
    // intro clock
    if (introT >= 0 && !skip) {
      const t = (now - introT) / 1000;
      S.U.uDraw.value = Math.min(1.2, ease(span(t, 0, 3.3)) * 1.2);
      S.U.uHatchIn.value = ease(span(t, 2.4, 3.8));
      S.U.uDetailIn.value = ease(span(t, 2.6, 3.8));
      if (t > 0.35) $('#loader')?.classList.add('gone');
      if (t > 1.9) html.classList.add('in');
      if (t > 3.9 && !html.classList.contains('done')) {
        html.classList.add('done'); html.classList.remove('locked');
        window.__introDone = true;
      }
    }
    o.frame(p, S, now);
    if (hudSun && hudOptic) {
      const sd = S.U.uSun.value;
      const alt = (Math.asin(Math.max(-1, Math.min(1, sd.y))) * 180 / Math.PI).toFixed(1);
      const az = (((Math.atan2(-sd.x, sd.z) * 180 / Math.PI) + 90 + 360) % 360).toFixed(0);
      hudSun.textContent = `ALT ${alt}° · AZ ${az}°`;
      const fov = S.camera.fov;
      hudOptic.textContent = `${fov.toFixed(1)}° ${fov < 4 ? 'ORTHO' : fov < 22 ? 'RELIEF' : 'PERSP'}`;
    }
    if (cmDot && cmCone && cmLbl) {
      // Map camera position to plan radar coordinates: u = depth into plot (-z), v = x inside house
      const camPos = S.camera.position;
      const camTgt = S.camTarget || S.camera.position;
      const u = Math.max(-3.6, Math.min(17.0, -camPos.z));
      const rawV = camPos.x - (radarCfg.ox || 0);
      const v = Math.max(0.4, Math.min(5.6, radarCfg.mirrorX ? 6 - rawV : rawV));
      cmDot.setAttribute('cx', u.toFixed(2));
      cmDot.setAttribute('cy', v.toFixed(2));

      const du = (-camTgt.z) - (-camPos.z);
      const dv = (radarCfg.mirrorX ? -1 : 1) * (camTgt.x - camPos.x);
      const ang = Math.atan2(dv, du);
      const r = 2.8, sp = 0.42;
      const u1 = u + Math.cos(ang - sp) * r, v1 = v + Math.sin(ang - sp) * r;
      const u2 = u + Math.cos(ang + sp) * r, v2 = v + Math.sin(ang + sp) * r;
      cmCone.setAttribute('points', `${u.toFixed(2)},${v.toFixed(2)} ${u1.toFixed(2)},${v1.toFixed(2)} ${u2.toFixed(2)},${v2.toFixed(2)}`);

      // Active zone highlight
      let activeZone = radarCfg.zones[0];
      for (const z of radarCfg.zones) {
        if (u >= z.u0 && u <= z.u1) { activeZone = z; break; }
      }
      if (p > 340 && u < 0.2) activeZone = radarCfg.zones[1] || activeZone;
      cmZones.forEach((el) => el.classList.toggle('active', el.dataset.id === activeZone.id));
      cmBtns.forEach((el) => el.classList.toggle('active', el.dataset.id === activeZone.id));

      const swZ = S.U.uSweep.value.z;
      if (hoverTag) {
        cmLbl.textContent = `SPRUNG // ${hoverTag}`;
      } else if (swZ > -30 && swZ < 30) {
        cmLbl.textContent = `SCAN // S:${swZ.toFixed(1)}M`;
      } else if (S.camera.fov < 22) {
        cmLbl.textContent = `${activeZone.label} · ${S.camera.fov.toFixed(0)}° OBJEKTIV`;
      } else {
        cmLbl.textContent = `${activeZone.label} · Z:${(-camPos.z >= 0 ? '+' : '')}${(-camPos.z).toFixed(1)}M`;
      }

      // Sweep scan line indicator
      if (swZ > -30 && swZ < 30) {
        const su = lerp(-3.5, 16.5, clamp01((swZ + 14) / 28));
        cmScan.setAttribute('x1', su.toFixed(2));
        cmScan.setAttribute('x2', su.toFixed(2));
        cmScan.setAttribute('opacity', '0.9');
      } else {
        cmScan.setAttribute('opacity', '0');
      }
    }
    beats.forEach((b) => {
      const f = b.fade || 14;
      const v = Math.min(span(p, b.from - f, b.from), 1 - span(p, b.to - f, b.to));
      b.el.style.opacity = v.toFixed(3);
      b.el.style.transform = `translate3d(0, ${((1 - v) * 14).toFixed(1)}px, 0)`;
      b.el.style.visibility = v <= 0.001 ? 'hidden' : 'visible';
    });
    html.style.setProperty('--hero-out', span(p, o.heroOut?.[0] ?? 12, o.heroOut?.[1] ?? 60).toFixed(3));
    if (debug) debug.textContent = `p ${p.toFixed(1)} vh`;
    S.render();
    requestAnimationFrame(tick);
  }

  // loader: a percent above the ground line. Fonts, a first frame, every shader built.
  const fill = $('#loadPct');
  const minT = 1100;
  const fonts = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]);
  o.frame(0, S, 0);
  S.renderer.compile(S.scene, S.camera);
  let shown = 0;
  const count = setInterval(() => { shown = Math.min(99, shown + 3 + Math.random() * 7); if (fill) fill.textContent = `${Math.floor(shown)}%`; }, 70);
  fonts.then(() => new Promise((r) => setTimeout(r, Math.max(0, minT - (performance.now() - t0))))).then(() => {
    clearInterval(count); if (fill) fill.textContent = '100%';
    S.render();
    window.__ready = true;
    if (skip) {
      html.classList.remove('locked'); window.__introDone = true;
      const at = num('at', 0);
      requestAnimationFrame(() => { scrollTo(0, at / 100 * innerHeight); pEase = at; });
    } else {
      setTimeout(() => { introT = performance.now(); }, 250);
    }
    requestAnimationFrame(tick);
  });
  // (the scroll is held during the intro by html.locked in the stylesheet)
  window.__stage = S; window.__p = () => p;
  // design aid: how close any surface comes to the lens along the scroll. The exact distance from the eye
  // to every triangle of the real model, sampled every `step` vh. Returns the worst, and every sample under `warn`.
  window.__clear = (warn = 0.4, step = 1, p0 = 300, p1 = o.length) => {
    const tri = new THREE.Triangle(), q = new THREE.Vector3(), out = { worst: 9, at: 0, near: [] };
    const meshes = [];
    S.scene.traverse((m) => { if (m.isMesh && !m.isLineSegments2 && m.geometry.attributes.position && !m.material.userData?.drawOnly && !m.material.userData?.sky) meshes.push(m); });
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
    o.frame(p, S, 0);
    return out;
  };
}
