// Textures for the site: photographed surfaces (CC0) from Poly Haven and ambientCG, made small.
//   node textures.mjs [name ...]        (all of assets.json, or only the named ones)
// For every surface: colour, relief (normal map, OpenGL convention) and a packed map (R ambient occlusion,
// G roughness, B metalness), each as KTX2 (Basis Universal: the graphics chip keeps them compressed, a phone needs
// a sixth of the memory of a PNG). Written to ../assets/tex/<name>/ and listed in ../assets/tex/manifest.json.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { encodeToKTX2 } from 'ktx2-encoder';

const HERE = path.dirname(new URL(import.meta.url).pathname), OUT = path.join(HERE, '..', 'assets', 'tex'), CACHE = path.join(HERE, '.cache');
const UA = 'asset-pipeline/1.0';
const LIST = JSON.parse(fs.readFileSync(path.join(HERE, 'assets.json'), 'utf8')).textures;
const only = process.argv.slice(2);
const get = (url, file) => { if (!fs.existsSync(file)) { fs.mkdirSync(path.dirname(file), { recursive: true }); execFileSync('curl', ['-sS', '-L', '--fail', '-m', '600', '-A', UA, '-o', file, url]); } return file; };
const json = (url, file) => JSON.parse(fs.readFileSync(get(url, file), 'utf8'));
const decode = async (buffer) => { const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { width: info.width, height: info.height, data: new Uint8Array(data.buffer, data.byteOffset, data.length) }; };

// the sources of one surface: { color, normal, arm } or { color, normal, rough, ao, metal } as files on disk, and what it measures
async function sources(name, def) {
  if (def.ph) {
    const info = json(`https://api.polyhaven.com/info/${def.ph}`, path.join(CACHE, 'ph', def.ph, 'info.json'));
    const files = json(`https://api.polyhaven.com/files/${def.ph}`, path.join(CACHE, 'ph', def.ph, 'files.json'));
    const key = (re) => Object.keys(files).find((k) => re.test(k));
    const pick = (k) => { if (!k) return null; const f = files[k]['2k'] || files[k]['1k']; const v = f.jpg || f.png; return get(v.url, path.join(CACHE, 'ph', def.ph, path.basename(v.url))); };
    const s = { color: pick(key(/^(diffuse|diff|col(or)?(_\d+)?)$/i)), normal: pick(key(/^nor_gl$/i)), arm: pick(key(/^arm$/i)), rough: pick(key(/^rough$/i)), ao: pick(key(/^ao$/i)) };
    const d = info.dimensions || [2000, 2000];
    return { ...s, size: def.size || [d[0] / 1000, d[1] / 1000], credit: `Poly Haven, "${info.name}" (${Object.keys(info.authors || {}).join(', ')}), CC0, https://polyhaven.com/a/${def.ph}` };
  }
  const dir = path.join(CACHE, 'acg', def.acg), zip = get(`https://ambientcg.com/get?file=${def.acg}_2K-JPG.zip`, path.join(dir, 'src.zip'));
  if (!fs.existsSync(path.join(dir, 'ok'))) { execFileSync('python3', ['-c', 'import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', zip, dir]); fs.writeFileSync(path.join(dir, 'ok'), ''); }
  const f = (re) => { const n = fs.readdirSync(dir).find((x) => re.test(x)); return n ? path.join(dir, n) : null; };
  return { color: f(/_Color\.jpg$/), normal: f(/_NormalGL\.jpg$/), rough: f(/_Roughness\.jpg$/), ao: f(/_AmbientOcclusion\.jpg$/), metal: f(/_Metalness\.jpg$/), size: def.size || [2, 2], credit: `ambientCG, "${def.acg}", CC0, https://ambientcg.com/a/${def.acg}` };
}

const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
async function one(name, def) {
  const s = await sources(name, def), dir = path.join(OUT, name);
  if (!s.color) throw new Error(name + ': no colour map');
  fs.mkdirSync(dir, { recursive: true });
  const files = {}, bytes = {};
  const write = async (tag, png, opt) => { const out = await encodeToKTX2(new Uint8Array(png), { imageDecoder: decode, generateMipmap: true, ...opt }); fs.writeFileSync(path.join(dir, tag + '.ktx2'), out); bytes[tag] = out.length; };
  // colour: sRGB, ETC1S (small files; the grain of a wall survives it)
  for (const px of [1024, 512]) await write('c' + px, await sharp(s.color).resize(px, px, { fit: 'fill', kernel: 'lanczos3' }).removeAlpha().png().toBuffer(), { isUASTC: false, qualityLevel: 235, compressionLevel: 2, isPerceptual: true, isSetKTX2SRGBTransferFunc: true });
  // relief: UASTC (ETC1S breaks a normal map into blocks), packed again with Zstandard. 512 px: at 1024 a single one weighs over a megabyte
  if (s.normal) for (const px of [512]) await write('n' + px, await sharp(s.normal).resize(px, px, { fit: 'fill', kernel: 'lanczos3' }).removeAlpha().png().toBuffer(), { isUASTC: true, uastcLDRQualityLevel: 2, needSupercompression: true, enableRDO: true, rdoQualityLevel: 2.2, isNormalMap: true, isPerceptual: false, isSetKTX2SRGBTransferFunc: false });
  // occlusion, roughness, metalness in one picture
  let arm;
  if (s.arm) arm = sharp(s.arm).resize(512, 512, { fit: 'fill' }).removeAlpha();
  else {
    const ch = async (f, fill) => (f ? sharp(f).resize(512, 512, { fit: 'fill' }).greyscale().raw().toBuffer() : Buffer.alloc(512 * 512, fill));
    const [ao, ro, me] = [await ch(s.ao, 255), await ch(s.rough, 200), await ch(s.metal, 0)], px = Buffer.alloc(512 * 512 * 3);
    for (let i = 0; i < 512 * 512; i++) { px[i * 3] = ao[i]; px[i * 3 + 1] = ro[i]; px[i * 3 + 2] = me[i]; }
    arm = sharp(px, { raw: { width: 512, height: 512, channels: 3 } });
  }
  await write('o512', await arm.png().toBuffer(), { isUASTC: false, qualityLevel: 220, compressionLevel: 2, isPerceptual: false, isSetKTX2SRGBTransferFunc: false });
  // what the surface is on average: its colour (linear), how rough, how much shade it carries. The page shows this until the pictures are there
  const st = await sharp(s.color).resize(64, 64, { fit: 'fill' }).removeAlpha().raw().toBuffer(); const avg = [0, 0, 0];
  for (let i = 0; i < st.length; i += 3) for (let k = 0; k < 3; k++) avg[k] += toLinear(st[i + k] / 255);
  const so = await arm.clone().resize(32, 32).raw().toBuffer(); let ao = 0, ro = 0;
  for (let i = 0; i < so.length; i += 3) { ao += so[i] / 255; ro += so[i + 1] / 255; }
  return { size: s.size.map((v) => +v.toFixed(3)), avg: avg.map((v) => +(v / (st.length / 3)).toFixed(4)), rough: +(ro / (so.length / 3)).toFixed(3), ao: +(ao / (so.length / 3)).toFixed(3), normal: !!s.normal, bytes, credit: s.credit };
}

const manifestFile = path.join(OUT, 'manifest.json');
const manifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};
for (const [name, def] of Object.entries(LIST)) {
  if (only.length && !only.includes(name)) continue;
  const t0 = Date.now();
  try { manifest[name] = await one(name, def); console.log(name.padEnd(18), JSON.stringify(manifest[name].bytes), manifest[name].size.join('x') + ' m', ((Date.now() - t0) / 1000).toFixed(1) + ' s'); }
  catch (e) { console.log(name.padEnd(18), 'FAILED', e.message.slice(0, 200)); }
  fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 1));
}
// what the engine has to know before a single picture is there: s the metres a tile covers, a its mean colour
// (linear), r its mean roughness, o its mean shade, n whether it has a relief
const lines = Object.keys(LIST).filter((k) => manifest[k]).map((k) => { const m = manifest[k]; return `  ${k}: { s: [${m.size.join(', ')}], a: [${m.avg.join(', ')}], r: ${m.rough}, o: ${m.ao}, n: ${m.normal ? 1 : 0} },`; });
fs.writeFileSync(path.join(HERE, '..', 'engine', 'surfaces.js'), `// Written by tools/textures.mjs: the photographed surfaces under assets/tex/ (sources and licences: assets/CREDITS.md).\nexport const SURFACES = {\n${lines.join('\n')}\n};\n`);
const credits = Object.keys(LIST).filter((k) => manifest[k]).map((k) => `| \`tex/${k}\` | ${manifest[k].credit.replace(/, CC0, /, ' | CC0 | ')} |`);
fs.writeFileSync(path.join(OUT, 'CREDITS.md'), `# Surfaces\n\nAll textures are CC0 (public domain). Thank you to Poly Haven and ambientCG.\n\n| Files | Source | Licence | Link |\n|---|---|---|---|\n${credits.join('\n')}\n`);
