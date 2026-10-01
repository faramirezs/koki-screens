import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { tmpdir } from "node:os";
import { readFile } from "node:fs/promises";
import { mkdtempSync, rmSync } from "node:fs";
import { buildContext, buildPlan, renderTemplate, LABELS } from "../scripts/compile-scene.mjs";
import { validatePlan } from "../src/timeline.mjs";

const SKILL = path.resolve(import.meta.dirname, "..");
const readJson = async (p) => JSON.parse(await readFile(p, "utf8"));
const ko = () => readJson(path.join(SKILL, "examples/ko-kitchen/content.json"));
const koBrand = () => readJson(path.join(SKILL, "examples/ko-kitchen/brand.json"));
const profile = () => readJson(path.join(SKILL, "profiles/landscape-1080p.json"));
const boardTemplate = () => readJson(path.join(SKILL, "templates/menu-board/template.json"));
const promoTemplate = () => readJson(path.join(SKILL, "templates/promo/template.json"));

test("scalars are escaped, keys ending in Html are raw", () => {
  assert.equal(renderTemplate("{{a}}", { a: "<b>&" }), "&lt;b&gt;&amp;");
  assert.equal(renderTemplate("{{aHtml}}", { aHtml: "<b>" }), "<b>");
});

test("a block repeats once per element and reads element fields", () => {
  const out = renderTemplate("{{*items}}[{{n}}]{{/items}}", { items: [{ n: 1 }, { n: 2 }, { n: 3 }] });
  assert.equal(out, "[1][2][3]");
});

test("a block falls back to the enclosing scope for missing fields", () => {
  const out = renderTemplate("{{*items}}{{label}}:{{n}} {{/items}}", { label: "x", items: [{ n: 1 }, { n: 2 }] });
  assert.equal(out, "x:1 x:2 ");
});

test("an empty array renders nothing (optional blocks)", () => {
  assert.equal(renderTemplate("a{{*maybe}}!{{/maybe}}b", { maybe: [] }), "ab");
});

test("an unknown placeholder throws instead of rendering empty", () => {
  assert.throws(() => renderTemplate("{{nope}}", {}), /unknown placeholder/);
  assert.throws(() => renderTemplate("{{*nope}}{{/nope}}", {}), /needs an array/);
});

test("nested blocks work", () => {
  const out = renderTemplate("{{*tiers}}{{label}}{{*units}}{{u}}{{/units}};{{/tiers}}", {
    tiers: [{ label: "A", units: [{ u: "1" }, { u: "2" }] }, { label: "B", units: [] }],
  });
  assert.equal(out, "A12;B;");
});

test("prices are formatted per language and never invented", () => {
  const de = buildContext({ content: { ...{ items: [{ id: "x", name: "X", price: 9.9, allergens: [], image: "x.jpg" }], language: "de", legal: { vatNote: "v" } }, ...{} }, brand: null, imageReport: null, labels: {} });
  assert.equal(de.items[0].price, "9,90 €");
  const en = buildContext({ content: { language: "en", items: [{ id: "x", name: "X", price: 12.5, allergens: [], image: "x.jpg" }], legal: { vatNote: "v" } }, brand: null, imageReport: null });
  assert.equal(en.items[0].price, "12,50 €".replace(",", ".").replace(".", ",").replace("12,50", "12.50"));
});

test("the ko-kitchen context carries the real membership offer and the EU-14 legend", async () => {
  const content = await ko();
  const ctx = buildContext({ content, brand: await koBrand(), imageReport: null });
  assert.equal(ctx.theme, "dark");
  assert.equal(ctx.items.length, 4);
  assert.equal(ctx.items[0].price, "9,90 €");
  assert.equal(ctx.items[0].allergens, "A · C · G");
  assert.ok(ctx.legal.lines[0].bodyHtml.includes("Gluten"), "the allergen legend lists the EU-14 names");
  assert.ok(ctx.legal.lines[0].bodyHtml.includes("Ei"), "only the codes actually used are listed");
  assert.ok(!ctx.legal.lines[0].bodyHtml.includes("Weichtiere"), "unused codes are not listed");
  assert.ok(ctx.legal.lines[1].bodyHtml.includes("Preise inkl. MwSt."));
  assert.equal(ctx.promo.tiers[0].price, "47,00 €".replace("47,00", "47"));
  assert.equal(ctx.promo.tiers[1].price, "69 €");
  assert.equal(ctx.promo.tiers[1].highlightClass, " is-highlight");
  assert.deepEqual(ctx.promo.terms, [], "no contract terms are invented");
});

test("the promo overlay window is computed from the profile and leaves a seamless tail", async () => {
  const plan = buildPlan({ profile: await profile(), content: await ko(), boardTemplate: await boardTemplate(), promoTemplate: await promoTemplate() });
  assert.equal(plan.scenes.length, 2);
  const promo = plan.scenes[1];
  assert.equal(promo.fadeIn.at, 8);
  assert.equal(promo.fadeOut.at, 13);
  assert.equal(promo.fadeOut.at + promo.fadeOut.duration, 13.6, "the overlay is fully hidden before the loop restarts");
  assert.deepEqual(validatePlan(plan).errors, []);
});

test("without a promo there is exactly one scene and no overlay", async () => {
  const content = await ko();
  delete content.promo;
  const plan = buildPlan({ profile: await profile(), content, boardTemplate: await boardTemplate(), promoTemplate: await promoTemplate() });
  assert.equal(plan.scenes.length, 1);
  assert.deepEqual(validatePlan(plan).errors, []);
});

test("the menu-board template uses no in/out presets on the base scene", async () => {
  const tpl = await boardTemplate();
  for (const beat of tpl.beats) {
    assert.ok(!["fadeIn", "fadeOut", "riseIn", "dropIn", "popIn", "slideInLeft", "slideInRight", "wipeIn", "sweep"].includes(beat.preset),
      `${beat.selector} uses ${beat.preset}: the base scene must be settled at frame 0`);
  }
});

test("the promo subject image is part of the compiled asset set", async () => {
  const content = await ko();
  const plan = buildPlan({ profile: await profile(), content, boardTemplate: await boardTemplate(), promoTemplate: await promoTemplate() });
  assert.equal(plan.scenes.length, 2, "the ko-kitchen example has a promo overlay");
  // The promo shows its own photo (promo.image), which is not a menu item, so
  // compile-scene must copy assets/<promo stem>/ and not only assets/<items[0].id>/.
  const { compileScene } = await import("../scripts/compile-scene.mjs");
  const dir = path.join(mkdtempSync(path.join(tmpdir(), "adkit-compile-")), "scene");
  const out = await compileScene({
    content,
    brand: await koBrand(),
    imageReport: null,
    tokensCss: ":root { --x: 1; }",
    profile: await profile(),
    outDir: dir,
    templatesRoot: path.join(SKILL, "templates"),
  });
  assert.ok(out.assets.includes("membership"), `promo asset missing from the asset set: ${JSON.stringify(out.assets)}`);
  assert.ok(out.html.includes("assets/membership/flat.jpg"), "the scene does not reference the promo image");
  rmSync(path.dirname(dir), { recursive: true, force: true });
});

test("LABELS cover both shipped languages", () => {
  assert.deepEqual(Object.keys(LABELS).sort(), ["de", "en"]);
});
