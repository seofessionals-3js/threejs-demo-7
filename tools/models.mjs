// Furniture for the site: CC0 models from Poly Haven, made light.
//   node models.mjs [name ...]
// For every model: fewer triangles (meshoptimizer), textures at 512 px or less as KTX2 (Basis Universal), the mesh
// packed with Draco. Two files: <name>.glb with a relief map, <name>.lite.glb without (for phones).
// Written to ../assets/models/ and listed in ../assets/models/manifest.json and ../engine/furniture.js.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, simplify, prune, draco, textureCompress, flatten, join, getBounds } from '@gltf-transform/functions';
import { ktx2 } from 'ktx2-encoder/gltf-transform';
import draco3d from 'draco3dgltf';
import { MeshoptSimplifier } from 'meshoptimizer';

const HERE = path.dirname(new URL(import.meta.url).pathname), OUT = path.join(HERE, '..', 'assets', 'models'), CACHE = path.join(HERE, '.cache');
const UA = 'asset-pipeline/1.0';
const LIST = JSON.parse(fs.readFileSync(path.join(HERE, 'assets.json'), 'utf8')).models;
const only = process.argv.slice(2);
const get = (url, file) => { if (!fs.existsSync(file)) { fs.mkdirSync(path.dirname(file), { recursive: true }); execFileSync('curl', ['-sS', '-L', '--fail', '-m', '900', '-A', UA, '-o', file, url]); } return file; };
const json = (url, file) => JSON.parse(fs.readFileSync(get(url, file), 'utf8'));
const decode = async (buffer) => { const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { width: info.width, height: info.height, data: new Uint8Array(data.buffer, data.byteOffset, data.length) }; };

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule() });
await MeshoptSimplifier.ready;
const tris = (doc) => doc.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((k, p) => k + (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3, 0), 0);

async function one(name, def) {
  const dir = path.join(CACHE, 'phm', def.ph);
  const info = json(`https://api.polyhaven.com/info/${def.ph}`, path.join(dir, 'info.json'));
  const files = json(`https://api.polyhaven.com/files/${def.ph}`, path.join(dir, 'files.json'));
  const g = files.gltf['1k'].gltf, src = get(g.url, path.join(dir, path.basename(g.url)));
  for (const [rel, f] of Object.entries(g.include || {})) get(f.url, path.join(dir, rel));
  const out = {};
  for (const lite of [false, true]) {
    const doc = await io.read(src), before = tris(doc);
    if (lite) for (const m of doc.getRoot().listMaterials()) m.setNormalTexture(null);
    // a model drawn in another unit (centimetres, decimetres) is brought to metres: Poly Haven says how large the thing is
    const b0 = getBounds(doc.getRoot().listScenes()[0]), big = Math.max(...b0.max.map((v, i) => v - b0.min[i])), real = Math.max(...(info.dimensions || [0])) / 1000;
    if (real > 0 && (big / real > 1.6 || big / real < 0.6)) for (const n of doc.getRoot().listScenes()[0].listChildren()) { const k = real / big; n.setScale(n.getScale().map((v) => v * k)); n.setTranslation(n.getTranslation().map((v) => v * k)); }
    await doc.transform(dedup(), flatten(), join(), weld());
    // fewer triangles: as many as asked for, with as little error as that takes (a carved leg needs more leave than a table top)
    for (const error of [0.02, 0.06, 0.15, 0.4]) {
      const now = tris(doc); if (now <= def.tris * 1.15) break;
      await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, def.tris / now), error, lockBorder: false }));
    }
    await doc.transform(prune(), textureCompress({ encoder: sharp, resize: [def.tex, def.tex], targetFormat: 'png' }));
    // colour and the packed occlusion/roughness/metal map as ETC1S, the relief as UASTC
    await doc.transform(
      ktx2({ imageDecoder: decode, slots: /^(baseColor|emissive)/, isUASTC: false, qualityLevel: 230, compressionLevel: 2, generateMipmap: true, isPerceptual: true, isSetKTX2SRGBTransferFunc: true }),
      ktx2({ imageDecoder: decode, slots: /^(occlusion|metallicRoughness)/, isUASTC: false, qualityLevel: 215, compressionLevel: 2, generateMipmap: true, isPerceptual: false, isSetKTX2SRGBTransferFunc: false }),
      ktx2({ imageDecoder: decode, slots: /^normal/, isUASTC: true, uastcLDRQualityLevel: 2, needSupercompression: true, enableRDO: true, rdoQualityLevel: 2.4, isNormalMap: true, generateMipmap: true, isPerceptual: false, isSetKTX2SRGBTransferFunc: false }),
      draco({ method: 'edgebreaker', quantizePosition: 12, quantizeNormal: 9, quantizeTexcoord: 11 }),
    );
    const file = path.join(OUT, name + (lite ? '.lite' : '') + '.glb');
    fs.mkdirSync(OUT, { recursive: true }); await io.write(file, doc);
    const b = getBounds(doc.getRoot().listScenes()[0]);
    Object.assign(out, lite ? { liteBytes: fs.statSync(file).size } : { bytes: fs.statSync(file).size, tris: Math.round(tris(doc)), from: Math.round(before), min: b.min.map((v) => +v.toFixed(3)), max: b.max.map((v) => +v.toFixed(3)), mats: doc.getRoot().listMaterials().map((m) => `${m.getName()}:${m.getAlphaMode()}`) });
  }
  return { ...out, credit: `Poly Haven, "${info.name}" (${Object.keys(info.authors || {}).join(', ')}), CC0, https://polyhaven.com/a/${def.ph}` };
}

const manifestFile = path.join(OUT, 'manifest.json');
const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};
for (const [name, def] of Object.entries(LIST)) {
  if (only.length && !only.includes(name)) continue;
  const t0 = Date.now();
  try { manifest[name] = await one(name, def); const m = manifest[name]; console.log(name.padEnd(12), `${m.from} -> ${m.tris} tris`, `${(m.bytes / 1024).toFixed(0)} kB / lite ${(m.liteBytes / 1024).toFixed(0)} kB`, `size ${m.max.map((v, i) => (v - m.min[i]).toFixed(2)).join(' x ')} m`, m.mats.join(' '), ((Date.now() - t0) / 1000).toFixed(0) + ' s'); }
  catch (e) { console.log(name.padEnd(12), 'FAILED', String(e.stack || e).slice(0, 400)); }
  fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 1));
}
// what the engine has to know to place a model before it is there: its box as modelled (metres)
const lines = Object.keys(LIST).filter((k) => manifest[k]).map((k) => `  ${k}: { min: [${manifest[k].min.join(', ')}], max: [${manifest[k].max.join(', ')}] },`);
fs.writeFileSync(path.join(HERE, '..', 'engine', 'furniture.js'), `// Written by tools/models.mjs: the furniture under assets/models/ (sources and licences: assets/models/CREDITS.md).\nexport const FURNITURE = {\n${lines.join('\n')}\n};\n`);
const credits = Object.keys(LIST).filter((k) => manifest[k]).map((k) => `| \`models/${k}.glb\` | ${manifest[k].credit.replace(/, CC0, /, ' | CC0 | ')} |`);
fs.writeFileSync(path.join(OUT, 'CREDITS.md'), `# Furniture\n\nAll models are CC0 (public domain). Thank you to Poly Haven.\n\n| File | Source | Licence | Link |\n|---|---|---|---|\n${credits.join('\n')}\n`);
