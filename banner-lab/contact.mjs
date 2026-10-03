/**
 * contact.mjs — a contact sheet of the photo pool, so the pool can be judged as a set.
 *
 *   node contact.mjs [--sheet photos2-sheet.jpg] [--photos photos2.json]
 *
 * Tiles are labelled with the manifest key, which is also the index you use to drop a photo
 * (`"keep": false` in the manifest) when it is off-subject or a near-duplicate.
 */
import sharp from "sharp";
import { readFileSync } from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const arg = (n, d) => (argv.indexOf(`--${n}`) >= 0 ? argv[argv.indexOf(`--${n}`) + 1] : d);

const manifestPath = arg("photos", "photos2.json");
const out = arg("sheet", manifestPath.replace(/\.json$/, "-sheet.jpg"));
const dir = manifestPath.replace(/\.json$/, ""); // photos2.json -> photos2/
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const entries = Object.entries(manifest).filter(([, v]) => v.keep !== false);
const cols = 8, tw = 200, th = 150, label = 22;
const rows = Math.ceil(entries.length / cols);
const tiles = [];

for (let i = 0; i < entries.length; i++) {
  const [slug, v] = entries[i];
  const x = (i % cols) * tw, y = Math.floor(i / cols) * (th + label);
  tiles.push({ input: await sharp(path.join(dir, v.file)).resize(tw, th, { fit: "cover" }).toBuffer(), left: x, top: y });
  const tag = `${String(i).padStart(3, "0")} ${v.cut ? "*" : " "} ${v.query}`;
  const svg = `<svg width="${tw}" height="${label}"><rect width="100%" height="100%" fill="#111"/><text x="4" y="15" font-family="monospace" font-size="11" fill="#eee">${tag}</text></svg>`;
  tiles.push({ input: Buffer.from(svg), left: x, top: y + th });
}

await sharp({ create: { width: cols * tw, height: rows * (th + label), channels: 3, background: "#111" } })
  .composite(tiles)
  .jpeg({ quality: 84 })
  .toFile(out);
console.log(`${out}  ${entries.length} tiles (${entries.filter(([, v]) => v.cut).length} with cutouts, * = has one)`);
