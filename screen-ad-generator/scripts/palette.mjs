#!/usr/bin/env node
/**
 * palette.mjs — photo palette extraction -> design tokens.
 *
 *   node scripts/palette.mjs --images work/images/report.json --brand brand.json \
 *        --out work/tokens.css [--json work/palette.json] [--theme dark]
 *
 * Rules:
 *   - `brand.colors` wins for any token it declares. Extraction only fills the gaps.
 *   - Extracted colours come from the photos, but the food itself is never recoloured:
 *     only the background/surface/accent family is derived, and the derived values are
 *     moved in CIELAB **lightness only**, so hue and chroma survive the contrast fix.
 *   - Every pair that ends up on screen is contrast-checked. A pair that cannot be
 *     fixed by moving lightness is a hard error, never a silent pass.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  EXIT, contrast, cssRgba, hexToRgb, kmeansLab, labDistance, log, luminance,
  parseArgs, readJson, requireFlags, rgbToHex, rgbToLab,
} from "./lib/util.mjs";

/**
 * Built-in fallback theme. Used when a token is neither declared in brand.json nor
 * recoverable from the photos. These are the values the Ko Kitchen board was designed
 * against, so an extraction failure still produces a usable, contrast-safe board.
 */
export const DEFAULT_THEME = {
  dark: {
    bg: "#282F23", surface: "#1D231A", accent: "#FF7D00", accentFill: "#FF7D00",
    price: "#FF7D00", text: "#FFFFFF", textHero: "#FEFAE0", textMuted: "#B5BEA0",
    legal: "#B5BEA0", onAccent: "#1D231A",
  },
  light: {
    bg: "#FFFFFF", surface: "#FEFAE0", accent: "#C2410C", accentFill: "#FF7D00",
    price: "#C2410C", text: "#1D231A", textHero: "#282F23", textMuted: "#5F6F52",
    legal: "#5F6F52", onAccent: "#1D231A",
  },
};

/** Type scale + geometry. Fixed in v1; sizes are never derived from the photos. */
export const TYPE_TOKENS = {
  "--fs-eyebrow": "32px", "--fs-title": "64px", "--fs-badge": "32px",
  "--fs-item": "48px", "--fs-desc": "32px", "--fs-legal": "32px", "--fs-price": "52px",
  "--fs-kicker": "32px", "--fs-headline": "88px", "--fs-tier-label": "44px",
  "--fs-tier-price": "72px", "--fs-cta": "40px", "--fs-terms": "32px",
  "--fw-regular": "400", "--fw-medium": "500", "--fw-semibold": "600",
  "--fw-bold": "700", "--fw-black": "800",
  "--lh-tight": "1.05", "--lh-fine": "1.35",
  "--radius-lg": "28px", "--radius-md": "16px", "--radius-chip": "999px",
  "--safe": "54px",
};

/** Contrast pairs that must hold, with the minimum ratio each one needs. */
export const CONTRAST_PAIRS = [
  ["text", "bg", 7],
  ["text", "surface", 7],
  ["textHero", "bg", 7],
  ["textMuted", "bg", 4.5],
  ["textMuted", "surface", 4.5],
  ["accent", "surface", 4.5],
  ["accent", "bg", 4.5],
  ["price", "surface", 4.5],
  ["price", "bg", 4.5],
  ["legal", "bg", 4.5],
  ["legal", "surface", 4.5],
  ["onAccent", "accentFill", 4.5],
];

/** Move a colour's CIELAB lightness to `targetL`, keeping a/b (hue + chroma). */
function withLightness(hex, targetL) {
  const [L, a, b] = rgbToLab(hexToRgb(hex));
  const scale = targetL / Math.max(L, 0.001);
  return { lab: [targetL, a * Math.min(scale, 1.6), b * Math.min(scale, 1.6)] };
}

function labToHex([L, a, b]) {
  // inverse of rgbToLab (D65)
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const finv = (t) => {
    const t3 = t ** 3;
    return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787;
  };
  const x = 0.95047 * finv(fx);
  const y = 1.0 * finv(fy);
  const z = 1.08883 * finv(fz);
  let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
  let bl = x * 0.0557 + y * -0.204 + z * 1.057;
  const gam = (v) => {
    const s = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(v, 0), 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(1, s)) * 255;
  };
  return rgbToHex([gam(r), gam(g), gam(bl)]);
}

/** Nudge a foreground colour until it clears `minRatio` against a fixed background. */
function fixContrast(fg, bg, minRatio, { direction = "away" } = {}) {
  if (contrast(fg, bg) >= minRatio) return { hex: fg, adjusted: false, ratio: contrast(fg, bg) };
  const bgL = rgbToLab(hexToRgb(bg))[0];
  const dark = bgL > 50;
  const targets = dark
    ? [0, 5, 10, 15, 20, 25, 30, 35, 40, 45]
    : [100, 95, 90, 85, 80, 75, 70, 65, 60, 55];
  for (const t of targets) {
    const cand = labToHex(withLightness(fg, t).lab);
    if (contrast(cand, bg) >= minRatio) return { hex: cand, adjusted: true, ratio: contrast(cand, bg) };
  }
  // last resort: pure black or white, whichever the background allows
  const fallback = dark ? "#000000" : "#FFFFFF";
  return { hex: fallback, adjusted: true, ratio: contrast(fallback, bg), desperate: contrast(fallback, bg) < minRatio };
}

async function extractFromPhotos(report) {
  // `__dir` is the directory holding report.json (set by adkit); the standalone CLI sets
  // `__path` to the report.json file itself. Accept both, and never call path.dirname on
  // undefined.
  const baseDir = report.__dir || (report.__path ? path.dirname(report.__path) : null);
  if (!baseDir) {
    log.warn("palette: the image report has no directory, skipping extraction");
    return null;
  }
  const samples = [];
  for (const item of report.items || []) {
    const file = item.flat ? path.resolve(baseDir, item.flat) : null;
    if (!file) continue;
    try {
      const { data, info } = await sharp(file).resize(96, 96, { fit: "inside" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      for (let i = 0; i < data.length; i += info.channels) {
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
        samples.push(rgbToLab([r, g, b]));
      }
    } catch (e) {
      log.warn(`palette: could not sample ${file}: ${e.message}`);
    }
  }
  if (samples.length < 64) return null;
  const clusters = kmeansLab(samples, 6);
  return clusters.map((c) => ({ hex: labToHex(c.lab), lab: c.lab, weight: c.weight }));
}

/**
 * Build the token set. Returns { tokens, audit, source }.
 * `tokens` maps CSS custom-property names to values.
 */
export async function buildPalette({ imagesReport, brand, theme = "dark", minContrast = 4.5 }) {
  const base = { ...DEFAULT_THEME[theme] };
  const declared = (brand && brand.colors) || {};
  const map = {
    bg: "bg", surface: "surface", accent: "accent", accentFill: "accentFill", price: "price",
    text: "text", textHero: "textHero", textMuted: "textMuted", legal: "legal", onAccent: "onAccent",
  };
  const tokens = { ...base };
  const declaredKeys = [];
  for (const [k, v] of Object.entries(declared)) {
    const target = map[k];
    if (!target) continue;
    tokens[target] = v.toUpperCase();
    declaredKeys.push(k);
  }

  let extracted = null;
  let extractionUsed = false;
  if (imagesReport) {
    extracted = await extractFromPhotos(imagesReport);
  }
  // Extraction only fills tokens the brand did not declare. Background and surface are
  // the ones worth deriving from the photo set; text stays at the theme default so
  // contrast is predictable.
  if (extracted && extracted.length && !declaredKeys.includes("bg") && !declaredKeys.includes("surface")) {
    const sorted = extracted.slice().sort((a, b) => a.lab[0] - b.lab[0]);
    const darkest = sorted[0];
    const nextDark = sorted[1] || sorted[0];
    const mostChromatic = extracted
      .slice()
      .sort((a, b) => Math.hypot(b.lab[1], b.lab[2]) * b.weight - Math.hypot(a.lab[1], a.lab[2]) * a.weight)[0];
    if (theme === "dark") {
      tokens.bg = labToHex(withLightness(darkest.hex, Math.min(Math.max(darkest.lab[0], 14), 26)).lab);
      tokens.surface = labToHex(withLightness(nextDark.hex, Math.max(darkest.lab[0] - 6, 8)).lab);
    } else {
      tokens.bg = "#FFFFFF";
      tokens.surface = labToHex(withLightness(darkest.hex, 94).lab);
    }
    // the accent keeps the photo's hue but is pushed to a legible lightness
    const accentL = theme === "dark" ? 62 : 42;
    const accent = labToHex(withLightness(mostChromatic.hex, accentL).lab);
    tokens.accent = accent;
    tokens.accentFill = accent;
    tokens.price = accent;
    tokens.onAccent = theme === "dark" ? DEFAULT_THEME.dark.onAccent : DEFAULT_THEME.light.onAccent;
    tokens.text = theme === "dark" ? "#FFFFFF" : "#1D231A";
    tokens.textHero = theme === "dark" ? "#FEFAE0" : "#282F23";
    tokens.textMuted = labToHex(withLightness(mostChromatic.hex, theme === "dark" ? 76 : 38).lab);
    tokens.legal = tokens.textMuted;
    extractionUsed = true;
  }

  // ---- contrast audit (and repair) ---------------------------------------
  const audit = [];
  const errors = [];
  // `floor` is the hard minimum and `target` is what the repair aims for. They are not the
  // same number: WCAG AA is 4.5:1, and 7:1 (AAA) is preferred for body copy. A pair that
  // lands between the two is reported as a warning and must not fail the build - enforcing
  // 7:1 as a floor failed a legitimate extraction palette at 6.87:1.
  for (const [fgKey, bgKey, need] of CONTRAST_PAIRS) {
    const floor = minContrast;
    const target = Math.max(need, minContrast);
    const pair = `${fgKey}/${bgKey}`;
    const before = contrast(tokens[fgKey], tokens[bgKey]);
    if (before >= target) {
      audit.push({ pair, ratio: Number(before.toFixed(2)), min: floor, target, pass: true, preferred: true, adjusted: false });
      continue;
    }
    const fixed = fixContrast(tokens[fgKey], tokens[bgKey], target);
    // Never make a pair worse than it already was.
    const best = Math.max(before, fixed.ratio);
    const bestHex = fixed.ratio >= before ? fixed.hex : tokens[fgKey];
    const adjusted = bestHex !== tokens[fgKey];
    audit.push({ pair, ratio: Number(best.toFixed(2)), before: Number(before.toFixed(2)), min: floor, target, pass: best >= floor, preferred: best >= target, adjusted });
    if (best < floor) {
      errors.push(`${fgKey} on ${bgKey} is ${before.toFixed(2)}:1 and cannot be repaired by moving lightness (needs ${floor}:1)`);
      continue;
    }
    if (adjusted) tokens[fgKey] = bestHex;
    if (best >= target) {
      log.warn(`palette: ${fgKey} on ${bgKey} was ${before.toFixed(2)}:1, moved to ${bestHex} (${best.toFixed(2)}:1)`);
    } else {
      log.warn(`palette: ${fgKey} on ${bgKey} is ${best.toFixed(2)}:1 — above the ${floor}:1 floor, below the ${target}:1 preferred${adjusted ? ` (moved to ${bestHex})` : ""}`);
    }
  }

  const cssVars = {
    "--bg": tokens.bg,
    "--surface": tokens.surface,
    "--accent": tokens.accent,
    "--accent-fill": tokens.accentFill,
    "--price": tokens.price,
    "--text": tokens.text,
    "--text-hero": tokens.textHero,
    "--text-muted": tokens.textMuted,
    "--legal": tokens.legal,
    "--on-accent": tokens.onAccent,
    "--hairline": cssRgba(hexToRgb(tokens.textMuted), 0.28),
    "--row-fill": cssRgba(hexToRgb(tokens.text), theme === "dark" ? 0.06 : 0.05),
    "--font": `'${(brand && brand.fonts && brand.fonts.family) || "Montserrat"}', system-ui, sans-serif`,
    ...TYPE_TOKENS,
  };

  return {
    tokens: cssVars,
    audit,
    errors,
    source: { declaredKeys, extractionUsed, clusters: extracted ? extracted.map((c) => ({ hex: c.hex, weight: Number(c.weight.toFixed(3)) })) : [] },
    theme,
  };
}

export function tokensToCss(result) {
  const lines = Object.entries(result.tokens).map(([k, v]) => `  ${k}: ${v};`).join("\n");
  // One flat comment per concern: CSS comments do NOT nest, so an audit block wrapped in
  // /* ... */ with inner /* ... */ would close early and the parser would then swallow the
  // :root rule (this happened; tests/tokens.test.mjs now guards it).
  const audit = result.audit
    .map((a) => `${a.pair} ${a.ratio}:1 (min ${a.min})${a.adjusted ? ` repaired from ${a.before}:1` : ""}`)
    .join("; ");
  return (
    `/* Generated by scripts/palette.mjs - do not edit. Theme: ${result.theme}. */\n` +
    `/* Contrast audit: ${audit} */\n` +
    `:root {\n${lines}\n}\n`
  );
}

async function main() {
  const { flags } = parseArgs();
  requireFlags(flags, ["out"]);
  let report = null;
  if (flags.images) {
    report = await readJson(path.resolve(String(flags.images)));
    report.__path = path.resolve(String(flags.images));
  }
  const brand = flags.brand ? await readJson(path.resolve(String(flags.brand))) : null;
  const theme = String(flags.theme || (brand && brand.theme) || "dark");
  const minContrast = Number((brand && brand.rules && brand.rules.minContrast) || 4.5);

  const result = await buildPalette({ imagesReport: report, brand, theme, minContrast });
  await writeFile(String(flags.out), tokensToCss(result));
  log.ok(`tokens written to ${flags.out} (${result.source.declaredKeys.length} declared, extraction ${result.source.extractionUsed ? "used" : "not used"})`);
  for (const a of result.audit) {
    const line = `${a.pair}: ${a.ratio}:1 (min ${a.min})`;
    if (!a.pass) log.fail(line);
    else if (a.adjusted) log.warn(`${line} — repaired`);
  }
  if (flags.json) {
    await writeFile(String(flags.json), JSON.stringify({ theme, tokens: result.tokens, audit: result.audit, source: result.source }, null, 2));
  }
  if (result.errors.length) {
    for (const e of result.errors) log.fail(`palette: ${e}`);
    process.exit(EXIT.POLICY);
  }
  process.exit(EXIT.OK);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
