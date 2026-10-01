// Shared helpers. Deliberately small and explicit: this file is read by LLMs as
// often as it is executed. No metaprogramming, no hidden globals.

export const EXIT = {
  OK: 0,
  VALIDATION: 1, // content or brand failed validation
  DEPENDENCY: 2, // a required binary/module/model is missing
  INPUT: 3, // file not found, unreadable, unknown id
  RENDER: 4, // browser/frame capture failed
  ENCODE: 5, // ffmpeg or ffprobe failed
  POLICY: 6, // the render violates a hard screen rule (overflow, contrast, safe area)
};

const C = {
  reset: "\u001b[0m", dim: "\u001b[2m", red: "\u001b[31m", green: "\u001b[32m",
  yellow: "\u001b[33m", blue: "\u001b[34m", bold: "\u001b[1m",
};
const tty = process.stdout.isTTY;
const paint = (c, s) => (tty ? c + s + C.reset : s);

export const log = {
  step: (s) => console.log(`${paint(C.bold + C.blue, "==>")} ${s}`),
  ok: (s) => console.log(`${paint(C.green, "  ok")} ${s}`),
  info: (s) => console.log(`${paint(C.dim, "  ·")} ${s}`),
  warn: (s) => console.log(`${paint(C.yellow, "  !")} ${s}`),
  fail: (s) => console.error(`${paint(C.red, "  x")} ${s}`),
  raw: (s) => console.log(s),
};

/**
 * Minimal argv parser. Supports `--flag`, `--key value`, `--key=value`, repeated
 * flags (collected into an array) and positionals.
 */
export function parseArgs(argv = process.argv.slice(2)) {
  const flags = {};
  const positionals = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      let key = eq === -1 ? a.slice(2) : a.slice(2, eq);
      let val = eq === -1 ? undefined : a.slice(eq + 1);
      const next = argv[i + 1];
      if (val === undefined && next !== undefined && !next.startsWith("--")) {
        val = next;
        i++;
      }
      if (val === undefined) val = true;
      if (key in flags) flags[key] = [].concat(flags[key], val);
      else flags[key] = val;
    } else {
      positionals.push(a);
    }
  }
  return { flags, positionals };
}

export function requireFlags(flags, names) {
  const missing = names.filter((n) => flags[n] === undefined);
  if (missing.length) {
    log.fail(`missing required option(s): ${missing.map((m) => "--" + m).join(", ")}`);
    process.exit(EXIT.INPUT);
  }
}

// ---------- colour ----------

export function hexToRgb(hex) {
  const h = String(hex).trim().replace(/^#/, "");
  if (!/^[0-9A-Fa-f]{6}$/.test(h)) throw new Error(`not a #RRGGBB colour: ${hex}`);
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex([r, g, b]) {
  const p = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${p(r)}${p(g)}${p(b)}`.toUpperCase();
}

/** WCAG 2.1 relative luminance. */
export function luminance([r, g, b]) {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG 2.1 contrast ratio, 1..21. */
export function contrast(a, b) {
  const la = luminance(hexToRgb(a));
  const lb = luminance(hexToRgb(b));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** sRGB -> CIELAB (D65). Used for perceptual palette clustering. */
export function rgbToLab([r, g, b]) {
  const f = (v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const R = f(r), G = f(g), B = f(b);
  let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.0;
  let z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const k = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = k(x); y = k(y); z = k(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

export function labDistance(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

/** Deterministic k-means in CIELAB. Seeded by picking evenly spaced points. */
export function kmeansLab(points, k, iterations = 24) {
  if (points.length === 0) return [];
  const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
  let centroids = [];
  for (let i = 0; i < k; i++) {
    centroids.push(sorted[Math.floor(((i + 0.5) / k) * sorted.length)].slice());
  }
  let assignment = new Array(points.length).fill(0);
  for (let it = 0; it < iterations; it++) {
    let moved = false;
    for (let i = 0; i < points.length; i++) {
      let best = 0, bestD = Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const d = labDistance(points[i], centroids[c]);
        if (d < bestD) { bestD = d; best = c; }
      }
      if (assignment[i] !== best) { assignment[i] = best; moved = true; }
    }
    const sums = centroids.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < points.length; i++) {
      const s = sums[assignment[i]];
      s[0] += points[i][0]; s[1] += points[i][1]; s[2] += points[i][2]; s[3] += 1;
    }
    for (let c = 0; c < centroids.length; c++) {
      if (sums[c][3] > 0) centroids[c] = [sums[c][0] / sums[c][3], sums[c][1] / sums[c][3], sums[c][2] / sums[c][3]];
    }
    if (!moved && it > 2) break;
  }
  const counts = centroids.map(() => 0);
  for (const a of assignment) counts[a]++;
  return centroids
    .map((c, i) => ({ lab: c, weight: counts[i] / points.length }))
    .filter((c) => c.weight > 0)
    .sort((a, b) => b.weight - a.weight);
}

/** sRGB <-> hex convenience for CSS. */
export function cssRgba([r, g, b], alpha = 1) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alpha})`;
}

export function relative(p, base) {
  return new URL(p, "file://" + (base.endsWith("/") ? base : base + "/")).pathname;
}

export async function readJson(path) {
  const { readFile } = await import("node:fs/promises");
  let text;
  try {
    text = await readFile(path, "utf8");
  } catch (e) {
    throw Object.assign(new Error(`cannot read ${path}: ${e.code || e.message}`), { code: EXIT.INPUT });
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw Object.assign(new Error(`${path} is not valid JSON: ${e.message}`), { code: EXIT.VALIDATION });
  }
}

export function formatPrice(value, language = "de") {
  if (typeof value !== "number" || !isFinite(value)) throw new Error(`price must be a number, got ${value}`);
  const fixed = value.toFixed(2);
  const [int, dec] = fixed.split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, language === "de" ? "." : ",");
  return dec === "00" ? grouped : `${grouped}${language === "de" ? "," : "."}${dec}`;
}

export function pct(n) {
  return `${(n * 100).toFixed(1)}%`;
}
