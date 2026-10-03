/**
 * build.mjs — generate one large banner set from several seeds.
 *
 *   node build.mjs [--per-seed 160] [--seeds 1,2,3,4,5,6] [--out banners.json]
 *
 * One file, one id space: the gallery pages through it and feedback.jsonl joins against it
 * by id. Ids are prefixed with the seed so a rebuild with the same seeds reproduces the
 * same set exactly.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generate, loadPhotos } from "./gen.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (n, d) => (argv.indexOf(`--${n}`) >= 0 ? argv[argv.indexOf(`--${n}`) + 1] : d);

const perSeed = Number(arg("per-seed", 160));
const seeds = arg("seeds", "1,2,3,4,5,6").split(",").map(Number);
const outPath = arg("out", path.join(HERE, "banners.json"));

const pool = loadPhotos(arg("photos", path.join(HERE, "photos2.json")));

const all = [];
for (const seed of seeds) {
  const batch = generate({ count: perSeed, seed, ...pool });
  for (const b of batch) all.push({ ...b, id: `s${seed}-${b.id}`, seed });
}

writeFileSync(outPath, JSON.stringify(all, null, 1) + "\n");

const axes = {};
for (const k of ["paletteName", "layout", "bg", "type", "badge", "cta", "product", "decor", "motion", "copy", "photo"]) {
  axes[k] = new Set(all.map((b) => (k === "copy" ? b.copy.key : b[k]))).size;
}
console.log(`${all.length} banners (seeds ${seeds.join(",")}) from ${pool.photos.length} photos, ${pool.withCut.length} with cutouts`);
console.log(`distinct values: ${Object.entries(axes).map(([k, v]) => `${k}=${v}`).join(" ")}`);
console.log(`-> ${outPath}`);
