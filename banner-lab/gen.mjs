/**
 * gen.mjs — the sampler. Turns the design space in space.mjs into a deck of banner specs.
 *
 * A variation is a small JSON object: one value per design axis, plus the palette and copy
 * it resolved to. The object IS the feedback key, so "which combination makes a good
 * design" is a join between feedback.jsonl and this file.
 *
 * Sampling is seeded and coverage-aware: every value of every axis appears at least
 * `--coverage` times before any combination is repeated, so an early read on an axis is
 * not an artefact of it being rare in the sample.
 *
 *   node gen.mjs --count 240 --out banners.json [--seed 1] [--photos photos2.json]
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PALETTES, LAYOUTS, BACKGROUNDS, TYPES, BADGES, CTAS, PRODUCTS, DECOR, MOTIONS, COPY, COPY_CATS, FULL_CANVAS_LAYOUTS, NEEDS_CUTOUT, WIDTH, HEIGHT, BG_ENERGY, ROLE_MOTION, REFERENCE, variesIn, MODE_NAMES, MODES, AXES } from "./space.mjs";

export * from "./space.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// --------------------------------------------------------------------------- //
// sampling
// --------------------------------------------------------------------------- //

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

/**
 * Coverage-aware sampler. Values are dealt round-robin from a shuffled deck per axis, so
 * after k x (axis size) draws every value has appeared k times. Without this, a rare value
 * looks bad simply because it was drawn twice.
 */
function deck(rng, values, count) {
  const out = [];
  while (out.length < count) {
    const d = values.slice();
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    out.push(...d);
  }
  return out.slice(0, count);
}

export function generate({ count, seed = 1, mode = "scene", photos = [], withCut = [], cutOf = {}, catOf = {} }) {
  const rng = mulberry32(seed);
  const varies = variesIn(mode);
  const domains = {
    paletteName: Object.keys(PALETTES),
    layout: LAYOUTS,
    bg: BACKGROUNDS,
    bgEnergy: BG_ENERGY,
    type: TYPES,
    badge: BADGES,
    cta: CTAS,
    product: PRODUCTS,
    decor: DECOR,
    motion: MOTIONS,
    roleMotion: Object.keys(ROLE_MOTION),
    copy: COPY.map((c) => c.key),
    photo: photos.length ? photos : ["none"],
  };
  // The spec calls the palette axis `palette`; every other axis keeps its own name.
  const specKey = (axis) => (axis === "paletteName" ? "palette" : axis);
  const varied = Object.keys(domains).filter((a) => varies.has(a));
  const space = varied.reduce((n, a) => n * domains[a].length, 1);
  // A Mode that pins most of its axes has a space small enough to cover completely: background
  // varies 2 of 13, which is 40 combinations in total. Covering it completely is the difference
  // between "we looked at some backgrounds" and "we looked at the backgrounds", so when the whole
  // space fits inside the requested count, emit the whole space rather than a sample of it.
  const exhaustive = space <= count;
  const total = exhaustive ? space : count;
  const axes = {};
  if (exhaustive) {
    const combos = [];
    const walk = (i, acc) => {
      if (i === varied.length) { combos.push(acc); return; }
      for (const v of domains[varied[i]]) walk(i + 1, { ...acc, [varied[i]]: v });
    };
    walk(0, {});
    for (let i = combos.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [combos[i], combos[j]] = [combos[j], combos[i]];
    }
    for (const [axis] of Object.entries(domains)) {
      axes[specKey(axis)] = varies.has(axis) ? combos.map((c) => c[axis]) : Array(total).fill(REFERENCE[axis]);
    }
  } else {
    for (const [axis, values] of Object.entries(domains)) {
      // A pinned axis draws nothing from the rng, so each Mode's deck is reproducible on its own
      // and is not perturbed by the size of the axes it is holding still.
      axes[specKey(axis)] = varies.has(axis) ? deck(rng, values, total) : Array(total).fill(REFERENCE[axis]);
    }
  }
  // flat files that have a matching alpha asset; empty until the matting pass has run
  const cutPool = withCut.length ? withCut : photos;
  const catOfCut = {}; // the same subject buckets, but only for photos that have a cutout
  for (const f of cutPool) if (catOf[f]) (catOfCut[catOf[f]] ||= []).push(f);

  const byKey = Object.fromEntries(COPY.map((c) => [c.key, c]));
  const seen = new Set();
  const out = [];
  for (let i = 0; i < total; i++) {
    const spec = Object.fromEntries(Object.entries(axes).map(([k, v]) => [k, v[i]]));
    // a floating product or an arch needs its own box; on a full-canvas photo both read as
    // a hole in the banner rather than a product
    if (FULL_CANVAS_LAYOUTS.has(spec.layout) && (spec.product === "arch" || spec.product === "cutoutFloat")) {
      spec.product = "bottomCrop";
    }
    // Outside scene mode the words and the photo are pinned to the Reference Scene, so the
    // pairing is skipped: a Mode that holds `photo` still is asserting content is not the
    // variable under study, and re-picking it here would silently break that.
    if (varies.has("photo")) {
      // keep the subject and the words honest; 1 in 7 stays free so the pairing itself
      // remains something the lab can learn about
      const allowed = COPY_CATS[spec.copy];
      const wantsCut = NEEDS_CUTOUT.has(spec.product) && withCut.length;
      // A treatment that floats the product needs a real alpha asset, or it renders as a
      // floating rectangle. Prefer a cutout that still matches the copy: overriding the photo
      // with any old cutout is how a "SWEET" headline ends up over a rack of ribs.
      const source = wantsCut ? cutPool : photos;
      if (allowed && rng() > 0.14) {
        const buckets = wantsCut ? catOfCut : catOf;
        const pool = source.filter((f) => allowed.includes(buckets[f]));
        if (pool.length) spec.photo = pool[Math.floor(rng() * pool.length)];
        else if (wantsCut) spec.photo = cutPool[Math.floor(rng() * cutPool.length)];
      } else if (wantsCut) {
        spec.photo = cutPool[Math.floor(rng() * cutPool.length)];
      }
    }
    // Record the alpha asset next to the flat photo. The renderer falls back to a framed
    // treatment when there is none, so a missing cutout degrades instead of breaking.
    spec.cut = cutOf[spec.photo] || null;
    const key = Object.values(spec).join("|");
    if (seen.has(key)) continue; // exact duplicate: keep the set distinct
    seen.add(key);
    out.push({
      ...spec, // the raw axis values, including copy as its key
      id: `b${String(out.length + 1).padStart(4, "0")}`,
      seed: seed,
      mode: mode,
      width: WIDTH,
      height: HEIGHT,
      palette: PALETTES[spec.palette],
      paletteName: spec.palette,
      copy: byKey[spec.copy], // ...replaced by the resolved copy, after the spread
    });
  }
  return out;
}

/** Reads photos2.json into the pools the sampler needs: usable files, their alpha assets, their subjects. */
export function loadPhotos(photosPath) {
  const all = Object.values(JSON.parse(readFileSync(photosPath, "utf8"))).filter((p) => p.keep !== false);
  const photos = [];
  const withCut = [];
  const cutOf = {};
  const catOf = {};
  for (const p of all) {
    photos.push(p.file);
    if (p.cut) { cutOf[p.file] = p.cut; withCut.push(p.file); }
    // photos2.json is keyed by the search term it was fetched with; that term is the
    // subject category the copy pairing matches on
    const cat = p.query || p.category;
    if (cat) catOf[p.file] = cat;
  }
  return { photos, withCut, cutOf, catOf };
}

function main() {
  const argv = process.argv.slice(2);
  const arg = (name, dflt) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? argv[i + 1] : dflt;
  };
  const count = Number(arg("count", 240));
  const seed = Number(arg("seed", 1));
  const mode = arg("mode", "scene");
  const photosPath = arg("photos", path.join(HERE, "photos2.json"));
  let pool;
  try {
    pool = loadPhotos(photosPath);
  } catch {
    console.warn(`! no ${photosPath} — banners will render without a photo`);
    pool = { photos: [], withCut: [], cutOf: {}, catOf: {} };
  }
  const banners = generate({ count, seed, mode, ...pool });
  const outPath = arg("out", path.join(HERE, "banners.json"));
  writeFileSync(outPath, JSON.stringify(banners, null, 1) + "\n");
  console.log(`${banners.length} ${mode} banners from ${pool.photos.length} photos (${pool.withCut.length} with cutouts) -> ${outPath}`);
  console.log(`axes: ${Object.entries(axesOf(banners)).map(([k, v]) => `${k}=${v}`).join(" ")}`);
}

/** How many distinct values of each axis this deck actually contains. */
function axesOf(banners) {
  const out = {};
  for (const k of AXES) out[k] = new Set(banners.map((b) => (k === "copy" ? b.copy.key : b[k]))).size;
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
