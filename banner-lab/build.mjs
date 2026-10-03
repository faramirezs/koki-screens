/**
 * build.mjs — generate the banner deck: one deck per Mode, from several seeds.
 *
 *   node build.mjs [--per-seed 160] [--seeds 1,2,3,4,5,6] [--modes composition,background,motion,scene]
 *
 * One file, one id space: the gallery pages through it and feedback.jsonl joins against it
 * by id. Ids are `<mode letter><seed>-<b####>`, so a rebuild with the same seeds reproduces
 * the same deck exactly, and a Mode's banners are contiguous under one prefix.
 *
 * Scene keeps the letter `s`, so every id the lab has ever emitted for its full-scene deck is
 * unchanged by this.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generate, loadPhotos } from "./gen.mjs";
import { AXES, MODES, MODE_NAMES } from "./space.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (n, d) => (argv.indexOf(`--${n}`) >= 0 ? argv[argv.indexOf(`--${n}`) + 1] : d);

const perSeed = Number(arg("per-seed", 160));
const seeds = arg("seeds", "1,2,3,4,5,6").split(",").map(Number);
const modes = arg("modes", MODE_NAMES.join(",")).split(",").filter((m) => MODES[m]);
const outPath = arg("out", path.join(HERE, "banners.json"));

for (const m of arg("modes", "").split(",").filter(Boolean)) {
  if (!MODES[m]) throw new Error(`unknown mode "${m}" — expected one of ${MODE_NAMES.join(", ")}`);
}

const pool = loadPhotos(arg("photos", path.join(HERE, "photos2.json")));

const all = [];
// Dedupe on the axis vector across the whole build, not per seed. A Mode that pins most of its
// axes has a small space - background varies 2 of 13, so it has 40 combinations in total - and
// each seed would otherwise re-emit the same 40. Identical banners are not extra evidence, they
// just inflate n in the analysis.
const seen = new Set();
for (const mode of modes) {
  for (const seed of seeds) {
    const batch = generate({ count: perSeed, seed, mode, ...pool });
    for (const b of batch) {
      // The Mode is part of the identity. Two banners in different Modes can share an axis vector
      // - a composition banner whose seven varied axes all happen to equal the reference has the
      // same vector as the motion banner for `slamLeft × hierarchy` - but they are different
      // experiments, and one must not suppress the other.
      const key = `${mode}|${AXES.map((k) => (k === "copy" ? b.copy.key : b[k])).join("|")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      all.push({ ...b, id: `${MODES[mode].letter}${seed}-${b.id}`, seed, mode });
    }
  }
}

writeFileSync(outPath, JSON.stringify(all, null, 1) + "\n");

for (const mode of modes) {
  const deck = all.filter((b) => b.mode === mode);
  const varies = new Set(MODES[mode].varies ?? AXES);
  // an axis this Mode does not vary must be the same value in every one of its banners;
  // if it is not, the Mode is not isolating what it claims to isolate
  const pinned = AXES.filter((a) => !varies.has(a));
  const held = pinned.map((a) => {
    const values = new Set(deck.map((b) => (a === "copy" ? b.copy.key : b[a])));
    return values.size === 1 ? null : `${a}=${values.size}`;
  }).filter(Boolean);
  const spread = AXES.filter((a) => varies.has(a))
    .map((a) => `${a}=${new Set(deck.map((b) => (a === "copy" ? b.copy.key : b[a]))).size}`);
  console.log(
    `${mode.padEnd(11)} ${String(deck.length).padStart(4)} banners  varies: ${spread.join(" ")}` +
    (held.length ? `  !! NOT HELD: ${held.join(" ")}` : `  holds: ${pinned.join(" ")}`),
  );
}
console.log(`${all.length} banners total (seeds ${seeds.join(",")}) from ${pool.photos.length} photos, ${pool.withCut.length} with cutouts`);
console.log(`-> ${outPath}`);
