#!/usr/bin/env node
/**
 * validate-content.mjs — schema + policy validation for content.json / brand.json.
 *
 *   node scripts/validate-content.mjs --content examples/coffee-menu/content.json \
 *        [--brand examples/coffee-menu/brand.json] [--photos ./photos] [--json report.json]
 *
 * Exit codes: 0 valid (warnings allowed), 1 invalid, 3 unreadable input.
 *
 * Two kinds of rule:
 *   - schema rules   (Ajv, schemas/*.schema.json) — structure, ranges, enums.
 *   - policy rules   (this file) — things a schema cannot express: banned health
 *                    claims, placeholder text, fake "was/now" pricing, missing photos.
 * The generator NEVER invents prices, allergens or dietary claims. If a mandatory
 * value is missing it must fail here, loudly, with the exact field to fix.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { EXIT, log, parseArgs, readJson } from "./lib/util.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(HERE, "..");

// Phrases that assert a health effect. EU Regulation 1924/2006 (Health Claims):
// these are not permitted on food without an authorised claim.
const BANNED_CLAIMS = [
  /\bsuperfood\b/i, /\bdetox\b/i, /\bentgift\w*/i, /\bheilt\b/i, /\bheilend\w*/i,
  /\bkrebs\w*/i, /\bimmun\w*/i, /\banti-?oxid\w*/i, /\bgesund(er|heit)?\b/i,
  /\babnehm\w*/i, /\bbooster\b/i, /\bheals?\b/i, /\bcures?\b/i, /\bimmunity\b/i,
];

// "Was/now" price advertising is only lawful if the old price genuinely ran (UWG §5(5)).
const FAKE_DISCOUNT = [/\bstatt\b/i, /\bwar\s+\d/i, /\bnow only\b/i, /\bsave\s+\d/i, /\b%\s*(off|rabatt|billiger)/i, /\brabatt\b/i];

// Placeholders that must never reach a screen.
const PLACEHOLDER = [/–,–/, /€\s*–/, /\bTODO\b/, /\bXXX\b/, /lorem ipsum/i, /\bFIXME\b/, /\bTBD\b/];

function scanStrings(obj, pathPrefix, rules, label, errors, warnings) {
  if (typeof obj === "string") {
    for (const re of rules.banned || []) {
      if (re.test(obj)) errors.push({ path: pathPrefix, message: `${label}: "${obj}" matches banned claim ${re} — health claims are not permitted (Reg. 1924/2006). Remove it or attach an authorised claim.` });
    }
    for (const re of rules.discount || []) {
      if (re.test(obj)) errors.push({ path: pathPrefix, message: `${label}: "${obj}" looks like a discount/"was" claim (${re}). Only animate an old price when it genuinely ran (UWG §5(5)). Remove it or supply proof.` });
    }
    for (const re of rules.placeholder || []) {
      if (re.test(obj)) errors.push({ path: pathPrefix, message: `${label}: "${obj}" is placeholder text (${re}). Prices and copy must be the real values before publishing.` });
    }
    if (obj.length > 64) warnings.push({ path: pathPrefix, message: `${label}: ${obj.length} characters — check the wrap in the rendered frame.` });
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => scanStrings(v, `${pathPrefix}[${i}]`, rules, label, errors, warnings));
    return;
  }
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) scanStrings(v, pathPrefix ? `${pathPrefix}.${k}` : k, rules, label, errors, warnings);
  }
}

function formatAjvError(e) {
  const where = e.instancePath ? e.instancePath.replace(/^\//, "").replace(/\//g, ".") : "(root)";
  let msg = e.message || "invalid";
  if (e.keyword === "additionalProperties") msg = `unknown field ${e.params.additionalProperty} — remove it (the model is closed; unknown fields hide typos)`;
  if (e.keyword === "required") msg = `missing required field "${e.params.missingProperty}" — the generator never invents it`;
  if (e.keyword === "enum") msg = `must be one of: ${e.params.allowedValues.join(", ")}`;
  if (e.keyword === "pattern") msg = `must match ${e.params.pattern}`;
  return `${where}: ${msg}`;
}

async function compileSchema(name) {
  const schema = JSON.parse(await readFile(path.join(SKILL_ROOT, "schemas", name), "utf8"));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(schema);
}

export async function validate({ contentPath, brandPath, photosDir }) {
  const errors = [];
  const warnings = [];
  const validateContent = await compileSchema("content.schema.json");

  let content;
  try {
    content = await readJson(contentPath);
  } catch (e) {
    return { ok: false, errors: [{ path: contentPath, message: e.message }], warnings, content: null };
  }
  if (!validateContent(content)) {
    for (const e of validateContent.errors) errors.push({ path: e.instancePath || "(root)", message: formatAjvError(e) });
  }

  let brand = null;
  if (brandPath) {
    const validateBrand = await compileSchema("brand.schema.json");
    try {
      brand = await readJson(brandPath);
    } catch (e) {
      errors.push({ path: brandPath, message: e.message });
    }
    if (brand && !validateBrand(brand)) {
      for (const e of validateBrand.errors) errors.push({ path: `brand${e.instancePath || ""}`, message: formatAjvError(e) });
    }
  }

  // ---- policy scan -------------------------------------------------------
  if (content && typeof content === "object") {
    scanStrings(content, "", { banned: BANNED_CLAIMS }, "content", errors, warnings);
    scanStrings(content, "", { discount: FAKE_DISCOUNT }, "content", errors, warnings);
    scanStrings(content, "", { placeholder: PLACEHOLDER }, "content", errors, warnings);
  }
  if (brand && typeof brand === "object") {
    scanStrings(brand, "brand", { placeholder: PLACEHOLDER }, "brand", errors, warnings);
  }

  // ---- semantic checks ---------------------------------------------------
  if (content && Array.isArray(content.items)) {
    const seen = new Set();
    for (const [i, item] of content.items.entries()) {
      if (seen.has(item.id)) errors.push({ path: `items[${i}].id`, message: `duplicate id "${item.id}"` });
      seen.add(item.id);
      if (item.name && item.name.length > 34) {
        warnings.push({ path: `items[${i}].name`, message: `${item.name.length} characters — the menu-board template wraps at ~34; check the rendered frame.` });
      }
      if (item.allergens && item.allergens.length === 0) {
        warnings.push({ path: `items[${i}].allergens`, message: "declared as allergen-free — confirm with the operator that this is correct, it is a legal declaration" });
      }
      if (!item.diet) {
        warnings.push({ path: `items[${i}]`, message: "no diet labels — fine, but nothing will be claimed on screen" });
      }
      if (photosDir && item.image) {
        const p = path.resolve(photosDir, item.image);
        try {
          await readFile(p);
        } catch {
          errors.push({ path: `items[${i}].image`, message: `photo not found: ${p}` });
        }
      }
    }
    if (content.items.length > 4) {
      warnings.push({ path: "items", message: `${content.items.length} items — the landscape template is designed for 4 at full type size; the 5th may crowd the footer. Check the rendered frame.` });
    }
  }
  if (content && !content.hours) {
    warnings.push({ path: "hours", message: "no opening hours supplied — the board will omit the hours line rather than guess" });
  }
  if (content && content.promo && !content.promo.terms) {
    warnings.push({ path: "promo.terms", message: "no contract terms (minimum term / notice period / validity). Left off the screen on purpose; add them once the operator confirms." });
  }
  if (content && content.promo && content.promo.image && photosDir) {
    const p = path.resolve(photosDir, content.promo.image);
    try {
      await readFile(p);
    } catch {
      errors.push({ path: "promo.image", message: `photo not found: ${p}` });
    }
  }
  if (content && content.legal && !content.legal.allergenNote) {
    warnings.push({ path: "legal.allergenNote", message: "no allergen note — for non-prepacked food the board itself must carry the declaration (LMIV Art. 44(1)(a))" });
  }

  return { ok: errors.length === 0, errors, warnings, content, brand };
}

async function main() {
  const { flags } = parseArgs();
  if (!flags.content) {
    log.fail("usage: node scripts/validate-content.mjs --content <content.json> [--brand brand.json] [--photos dir] [--json out.json]");
    process.exit(EXIT.INPUT);
  }
  const result = await validate({
    contentPath: path.resolve(String(flags.content)),
    brandPath: flags.brand ? path.resolve(String(flags.brand)) : null,
    photosDir: flags.photos ? path.resolve(String(flags.photos)) : null,
  });

  for (const e of result.errors) log.fail(`${e.path}: ${e.message}`);
  for (const w of result.warnings) log.warn(`${w.path}: ${w.message}`);
  if (result.ok) log.ok(`content valid${result.warnings.length ? ` (${result.warnings.length} warning${result.warnings.length > 1 ? "s" : ""})` : ""}`);

  if (flags.json) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(String(flags.json), JSON.stringify({ ok: result.ok, errors: result.errors, warnings: result.warnings }, null, 2));
  }
  process.exit(result.ok ? EXIT.OK : EXIT.VALIDATION);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
