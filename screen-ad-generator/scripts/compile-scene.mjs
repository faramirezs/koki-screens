#!/usr/bin/env node
/**
 * compile-scene.mjs — content + brand + palette + images -> one self-contained scene.html
 *
 *   node scripts/compile-scene.mjs \
 *     --content examples/ko-kitchen/content.json \
 *     --brand   examples/ko-kitchen/brand.json \
 *     --images  work/ko-kitchen/images/report.json \
 *     --tokens  work/ko-kitchen/tokens.css \
 *     --profile profiles/landscape-1080p.json \
 *     --out     work/ko-kitchen/scene
 *
 * Writes:
 *   <out>/scene.html   the whole board: inlined fonts (base64), inlined GSAP, inlined
 *                      timeline. No network, no relative asset beyond ./assets/*.
 *   <out>/plan.json    the timeline plan (the JSON contract in references/timeline-model.md)
 *   <out>/assets/**    the photos the scene references
 *
 * The file is byte-identical for identical inputs — no timestamps, no random ids — so
 * frame hashes are reproducible.
 *
 * Template syntax (deliberately tiny, no logic, no loops with conditions):
 *   {{path.to.value}}         scalar, HTML-escaped unless the key ends in `Html`
 *   {{*path.to.array}}        repeats the inner markup once per array element; inside
 *     ...                     the block, `{{field}}` reads the element first and falls
 *   {{/path.to.array}}        back to the enclosing scope
 * Anything missing is a hard error: a placeholder that silently renders empty is how a
 * price disappears from a screen.
 */
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXIT, formatPrice, log, parseArgs, readJson, requireFlags } from "./lib/util.mjs";
import { compileTimeline, validatePlan } from "../src/timeline.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SKILL_ROOT = path.resolve(HERE, "..");

/** EU-14 allergen legend. Factual table from LMIV Annex II — never generated per item. */
export const ALLERGEN_NAMES = {
  de: { A: "Gluten", B: "Krebstiere", C: "Ei", D: "Fisch", E: "Erdnuss", F: "Soja", G: "Milch", H: "Schalenfrüchte", I: "Sellerie", J: "Senf", K: "Sesam", L: "Schwefeldioxid", M: "Lupine", N: "Weichtiere" },
  en: { A: "gluten", B: "crustaceans", C: "egg", D: "fish", E: "peanut", F: "soy", G: "milk", H: "nuts", I: "celery", J: "mustard", K: "sesame", L: "sulphites", M: "lupin", N: "molluscs" },
};

export const LABELS = {
  de: { allergens: "ALLERGENE", allergenNote: "vollständige Liste auf der gedruckten Karte", perMonth: "im Monat" },
  en: { allergens: "ALLERGENS", allergenNote: "full list on the printed menu", perMonth: "per month" },
};

const escapeHtml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function resolve(obj, dotted) {
  let cur = obj;
  for (const part of dotted.split(".")) {
    if (cur === null || cur === undefined) return undefined;
    if (!(part in Object(cur))) return undefined;
    cur = cur[part];
  }
  return cur;
}

/** Render a template string. See the header for the two supported constructs. */
export function renderTemplate(tpl, ctx) {
  let out = tpl;
  for (let guard = 0; guard < 500; guard++) {
    const open = /\{\{\*([\w.]+)\}\}/.exec(out);
    if (!open) break;
    const name = open[1];
    const innerStart = open.index + open[0].length;
    const tag = /\{\{\*[\w.]+\}\}|\{\{\/[\w.]+\}\}/g;
    tag.lastIndex = innerStart;
    let depth = 1;
    let endIdx = -1;
    let m;
    while ((m = tag.exec(out))) {
      if (m[0].startsWith("{{*")) depth++;
      else if (--depth === 0) { endIdx = m.index; break; }
    }
    if (endIdx === -1) throw new Error(`unclosed block {{*${name}}}`);
    const inner = out.slice(innerStart, endIdx);
    const value = resolve(ctx, name);
    if (!Array.isArray(value)) {
      throw new Error(`block {{*${name}}} needs an array in the context, got ${value === undefined ? "nothing" : typeof value}`);
    }
    const rendered = value
      .map((el) => {
        const child = Object.create(ctx);
        if (el && typeof el === "object") Object.assign(child, el);
        else child.value = el;
        return renderTemplate(inner, child);
      })
      .join("");
    out = out.slice(0, open.index) + rendered + out.slice(endIdx + `{{/${name}}}`.length);
  }
  return out.replace(/\{\{([\w.]+)\}\}/g, (_all, key) => {
    const v = resolve(ctx, key);
    if (v === undefined || v === null) throw new Error(`unknown placeholder {{${key}}} — the context has no such value`);
    return /Html$/.test(key) ? String(v) : escapeHtml(v);
  });
}

/** Build the template context from validated content + brand + image report. */
export function buildContext({ content, brand, imageReport, assetsPrefix = "assets", labels }) {
  const lang = content.language;
  const L = { ...LABELS[lang], ...labels };
  const theme = (brand && brand.theme) || "dark";
  const focalOf = (id, fallback = [0.5, 0.5]) => {
    const item = (content.items || []).find((i) => i.id === id);
    if (item && item.focalPoint) return item.focalPoint;
    const rep = imageReport && (imageReport.items || []).find((i) => i.id === id);
    if (rep && rep.focal) return [rep.focal.x, rep.focal.y];
    return fallback;
  };
  const flatOf = (id) => `${assetsPrefix}/${id}/flat.jpg`;
  const cutoutOf = (id) => `${assetsPrefix}/${id}/cutout.png`;
  const mattingOk = (id) => {
    const rep = imageReport && (imageReport.items || []).find((i) => i.id === id);
    return !!(rep && rep.alpha && rep.alpha.coverage > 0.02 && !rep.alpha.edge?.touchesBorder);
  };

  const items = (content.items || []).map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description ? [{ text: item.description }] : [],
    price: `${formatPrice(item.price, lang)} €`,
    allergens: (item.allergens || []).join(" · ") || "—",
    allergensList: item.allergens || [],
    ribbon: item.promo ? [{ text: item.promo }] : [],
    diet: item.diet || [],
    image: flatOf(item.id),
    cutout: cutoutOf(item.id),
  }));

  const usedCodes = [...new Set((content.items || []).flatMap((i) => i.allergens || []))].sort();
  const legalLines = [];
  if (usedCodes.length) {
    const legend = Object.entries(ALLERGEN_NAMES[lang])
      .map(([code, name]) => (usedCodes.includes(code) ? `${code} ${name}` : null))
      .filter(Boolean)
      .join(" · ");
    legalLines.push({
      bodyHtml: `<span class="legal-strip__key">${escapeHtml(L.allergens)}</span>${escapeHtml(legend)}<span class="legal-strip__sep">|</span>${escapeHtml(content.legal.allergenNote || L.allergenNote)}`,
    });
  }
  const tail = [content.hours, content.legal.address, content.legal.website, content.legal.vatNote].filter(Boolean);
  if (tail.length) {
    legalLines.push({ bodyHtml: tail.map((t) => escapeHtml(t)).join('<span class="legal-strip__sep">·</span>') });
  }

  const heroItem = content.items[0];
  const heroId = heroItem.id;

  const ctx = {
    lang,
    theme,
    boardTitle: `${(brand && brand.name) || ""} ${content.title || ""}`.trim() || "Screen",
    brandName: (brand && brand.name) || "",
    title: content.title || "",
    subtitle: content.subtitle ? [{ text: content.subtitle }] : [],
    badge: content.badge ? [{ text: content.badge, hours: content.hours ? [{ text: content.hours }] : [] }] : [],
    logo: brand && brand.logo ? [{ src: brand.logo, invertClass: brand.logoDarkOnLight ? " board__logo--invert" : "" }] : [],
    labels: L,
    items,
    legal: { lines: legalLines },
    hero: {
      src: flatOf(heroId),
      focal: focalOf(heroId).map((v) => `${(v * 100).toFixed(1)}%`).join(" "),
      ribbon: heroItem.promo ? [{ text: heroItem.promo }] : [],
    },
  };

  if (content.promo) {
    const p = content.promo;
    const subjectId = p.image ? p.image.replace(/\.[a-z]+$/i, "") : content.items[0].id;
    const useCutout = p.image ? false : mattingOk(content.items[0].id);
    const shownId = p.image ? subjectId : content.items[0].id;
    ctx.promoSceneHtml = ""; // filled by the caller after rendering the promo template
    ctx.promo = {
      headline: p.headline,
      kicker: p.kicker ? [{ text: p.kicker }] : [],
      cta: p.cta ? [{ text: p.cta }] : [],
      terms: p.terms ? [{ text: p.terms }] : [],
      tiers: (p.tiers || []).map((t) => ({
        label: t.label,
        price: `${formatPrice(t.price, lang)} €`,
        unit: t.unit || "",
        highlightClass: t.highlight ? " is-highlight" : "",
      })),
      subjectClass: useCutout ? "" : " promo__subject--flat",
      subject: {
        src: useCutout ? cutoutOf(content.items[0].id) : flatOf(shownId),
        focal: focalOf(shownId).map((v) => `${(v * 100).toFixed(1)}%`).join(" "),
      },
      legal: { lines: legalLines },
    };
  }
  return ctx;
}

/**
 * Compose the timeline plan. The base scene is the menu board; the promo, when present,
 * is an overlay that fades in, plays its beats and fades out before the loop restarts.
 */
export function buildPlan({ profile, content, boardTemplate, promoTemplate }) {
  const duration = profile.duration;
  const scenes = [
    {
      id: "board",
      selector: "#scene-board",
      start: 0,
      beats: (boardTemplate.beats || []).map((b) => ({ selector: b.selector, preset: b.preset, at: b.at, duration: b.duration, stagger: b.stagger })),
    },
  ];
  if (content.promo) {
    const promoDuration = profile.promo?.duration ?? 5.6;
    const tail = profile.promo?.boardTail ?? 1.4;
    const fade = profile.promo?.fade ?? 0.6;
    const start = Number((duration - tail - promoDuration).toFixed(3));
    const fadeOutAt = Number((start + promoDuration - fade).toFixed(3));
    scenes.push({
      id: "promo",
      selector: "#scene-promo",
      start,
      fadeIn: { at: start, duration: fade },
      fadeOut: { at: fadeOutAt, duration: fade },
      beats: (promoTemplate.beats || []).map((b) => ({
        selector: b.selector,
        preset: b.preset,
        at: Number((start + b.offset).toFixed(3)),
        duration: b.duration,
        stagger: b.stagger,
      })),
    });
  }
  return {
    schemaVersion: 1,
    fps: profile.fps,
    duration,
    loop: true,
    baseScene: "board",
    scenes,
    probe: [".promo-ribbon__headline", ".promo-ribbon__tiers", ".item__name", ".board__rule .b1"],
  };
}

async function fontFacesCss(weights) {
  const blocks = [];
  for (const w of weights) {
    const file = path.join(SKILL_ROOT, "vendor", "fonts", `montserrat-latin-${w}.woff2`);
    let data;
    try {
      data = await readFile(file);
    } catch {
      throw Object.assign(new Error(`missing vendored font ${file} — run the vendoring step or check vendor/`), { code: EXIT.DEPENDENCY });
    }
    blocks.push(
      `@font-face { font-family: 'Montserrat'; font-style: normal; font-weight: ${w}; font-display: block;` +
        ` src: url(data:font/woff2;base64,${data.toString("base64")}) format('woff2'); }`
    );
  }
  return blocks.join("\n");
}


export async function compileScene({ content, brand, imageReport, tokensCss, profile, outDir, templatesRoot }) {
  const boardDir = path.join(templatesRoot, "menu-board");
  const promoDir = path.join(templatesRoot, "promo");
  const boardTpl = {
    html: await readFile(path.join(boardDir, "scene.html"), "utf8"),
    css: await readFile(path.join(boardDir, "scene.css"), "utf8"),
    config: await readJson(path.join(boardDir, "template.json")),
  };
  const promoTpl = {
    html: await readFile(path.join(promoDir, "scene.html"), "utf8"),
    css: await readFile(path.join(promoDir, "scene.css"), "utf8"),
    config: await readJson(path.join(promoDir, "template.json")),
  };

  const ctx = buildContext({ content, brand, imageReport });
  const plan = buildPlan({ profile, content, boardTemplate: boardTpl.config, promoTemplate: promoTpl.config });
  const planCheck = validatePlan(plan, { maxFlashingHz: (brand && brand.rules && brand.rules.maxFlashingHz) || 3 });

  if (ctx.items.length > boardTpl.config.capacity.hardMax) {
    planCheck.errors.push(`content has ${ctx.items.length} items, the ${boardTpl.config.id} template fits at most ${boardTpl.config.capacity.hardMax}`);
  }

  let promoHtml = "";
  let promoWarnings = [];
  if (content.promo) {
    promoHtml = renderTemplate(promoTpl.html, ctx.promo);
  }

  const weights = [...new Set([...(boardTpl.config.fonts?.weights || []), ...(content.promo ? promoTpl.config.fonts?.weights || [] : [])])];
  const components = (await Promise.all(
    ["price-lockup.css", "hero-frame.css", "promo-ribbon.css", "legal-strip.css"].map((f) =>
      readFile(path.join(SKILL_ROOT, "src", "components", f), "utf8")
    )
  )).join("\n");

  const gsap = await readFile(path.join(SKILL_ROOT, "vendor", "gsap.min.js"), "utf8");

  const full = {
    ...ctx,
    fontFacesCssHtml: await fontFacesCss(weights),
    tokensCssHtml: tokensCss,
    componentsCssHtml: components,
    sceneCssHtml: boardTpl.css + "\n" + (content.promo ? promoTpl.css : ""),
    promoSceneHtml: promoHtml,
    gsapScriptHtml: `<script>${gsap}</script>`,
    timelineScriptHtml: `<script>${compileTimeline(plan)}</script>`,
  };

  const html = renderTemplate(boardTpl.html, full);

  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "scene.html"), html);
  await writeFile(path.join(outDir, "plan.json"), JSON.stringify(plan, null, 2) + "\n");

  // assets the scene references: the menu-board hero and the promo subject
  const needed = new Set([content.items[0].id]);
  if (content.promo) needed.add(content.promo.image ? content.promo.image.replace(/\.[a-z]+$/i, "") : content.items[0].id);
  for (const id of needed) {
    const from = imageReport && imageReport.__dir ? path.join(imageReport.__dir, id) : null;
    if (!from) continue;
    try {
      await cp(from, path.join(outDir, "assets", id), { recursive: true });
    } catch (e) {
      promoWarnings.push(`could not copy assets for ${id}: ${e.message}`);
    }
  }

  return { html, plan, planCheck, outDir, assets: [...needed], warnings: promoWarnings };
}

async function main() {
  const { flags } = parseArgs();
  requireFlags(flags, ["content", "out"]);
  const content = await readJson(path.resolve(String(flags.content)));
  const brandPath = flags.brand ? path.resolve(String(flags.brand)) : null;
  const brand = brandPath ? await readJson(brandPath) : null;
  if (brand && brand.logo && !path.isAbsolute(brand.logo)) {
    brand.logo = path.resolve(path.dirname(brandPath), brand.logo);
  }
  let imageReport = null;
  if (flags.images) {
    const p = path.resolve(String(flags.images));
    imageReport = await readJson(p);
    imageReport.__dir = path.dirname(p);
  }
  const profile = await readJson(path.resolve(String(flags.profile || path.join(SKILL_ROOT, "profiles", "landscape-1080p.json"))));
  const tokensCss = flags.tokens ? await readFile(path.resolve(String(flags.tokens)), "utf8") : ":root{}\n";

  const result = await compileScene({
    content, brand, imageReport, tokensCss, profile,
    outDir: path.resolve(String(flags.out)),
    templatesRoot: path.join(SKILL_ROOT, "templates"),
  });

  for (const w of [...result.planCheck.warnings, ...result.warnings]) log.warn(w);
  if (result.planCheck.errors.length) {
    for (const e of result.planCheck.errors) log.fail(`plan: ${e}`);
    process.exit(EXIT.VALIDATION);
  }
  log.ok(`scene.html written to ${path.join(result.outDir, "scene.html")} (${result.html.length} bytes, plan ${result.plan.duration}s @ ${result.plan.fps}fps, ${result.plan.scenes.length} scene(s))`);
  log.info(`assets: ${result.assets.join(", ")}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
