import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { buildPalette, tokensToCss, TYPE_TOKENS, DEFAULT_THEME, CONTRAST_PAIRS } from "../scripts/palette.mjs";
import { contrast } from "../scripts/lib/util.mjs";

const SKILL = path.resolve(import.meta.dirname, "..");

async function allCss() {
  const files = [
    ...(await readdir(path.join(SKILL, "src/components"))).map((f) => path.join(SKILL, "src/components", f)),
    ...(await readdir(path.join(SKILL, "templates/menu-board"))).map((f) => path.join(SKILL, "templates/menu-board", f)),
    ...(await readdir(path.join(SKILL, "templates/promo"))).map((f) => path.join(SKILL, "templates/promo", f)),
  ].filter((f) => f.endsWith(".css"));
  return Promise.all(files.map(async (f) => ({ file: path.relative(SKILL, f), css: await readFile(f, "utf8") })));
}

test("generated tokens contain no nested CSS comments", async () => {
  const result = await buildPalette({ imagesReport: null, brand: { name: "x" }, theme: "dark" });
  const css = tokensToCss(result);
  // A /* inside a /* closes the outer comment early and the parser then eats the :root rule.
  assert.ok(!/\/\*[^]*?\/\*/.test(css.replace(/^\/\*.*?\*\//s, "")), "nested comment detected");
  assert.equal((css.match(/\/\*/g) || []).length, (css.match(/\*\//g) || []).length);
  assert.ok(css.includes(":root {"));
});

test("every var(--token) used in any stylesheet is defined by the token set", async () => {
  const result = await buildPalette({ imagesReport: null, brand: { name: "x" }, theme: "dark" });
  const defined = new Set(Object.keys(result.tokens));
  const used = new Set();
  for (const { css } of await allCss()) {
    for (const m of css.matchAll(/var\((--[a-z0-9-]+)/g)) used.add(m[1]);
  }
  const missing = [...used].filter((v) => !defined.has(v));
  assert.deepEqual(missing, [], `these custom properties are used but never defined: ${missing.join(", ")}`);
});

test("every defined token is actually used somewhere", async () => {
  const result = await buildPalette({ imagesReport: null, brand: { name: "x" }, theme: "dark" });
  const used = new Set();
  for (const { css } of await allCss()) for (const m of css.matchAll(/var\((--[a-z0-9-]+)/g)) used.add(m[1]);
  const orphans = Object.keys(result.tokens).filter((k) => !used.has(k) && !["--font", "--safe", "--hairline", "--row-fill"].includes(k));
  assert.deepEqual(orphans, [], `dead tokens (declare them only when a stylesheet uses them): ${orphans.join(", ")}`);
});

test("the default themes pass their own contrast pairs", () => {
  for (const [theme, colors] of Object.entries(DEFAULT_THEME)) {
    for (const [fg, bg, need] of CONTRAST_PAIRS) {
      const ratio = contrast(colors[fg], colors[bg]);
      assert.ok(ratio >= need, `${theme}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs ${need}:1`);
    }
  }
});

test("declared brand colours are used verbatim and not repaired", async () => {
  const brand = { name: "t", theme: "dark", colors: { bg: "#282F23", surface: "#1D231A", accent: "#FF7D00", accentFill: "#FF7D00", price: "#FF7D00", text: "#FFFFFF", textMuted: "#B5BEA0", legal: "#B5BEA0" } };
  const result = await buildPalette({ imagesReport: null, brand, theme: "dark" });
  assert.equal(result.tokens["--bg"], "#282F23");
  assert.equal(result.tokens["--accent"], "#FF7D00");
  assert.equal(result.audit.filter((a) => a.adjusted).length, 0, "declared colours must not be silently changed");
});

test("a brand colour that fails contrast is repaired and reported, never ignored", async () => {
  const brand = { name: "t", theme: "dark", colors: { bg: "#1D231A", surface: "#1D231A", accent: "#333333", accentFill: "#333333", price: "#333333", text: "#FFFFFF", textMuted: "#B5BEA0", legal: "#B5BEA0" } };
  const result = await buildPalette({ imagesReport: null, brand, theme: "dark" });
  const accent = result.audit.find((a) => a.pair === "accent/surface");
  assert.equal(accent.pass, true);
  assert.equal(accent.adjusted, true);
  assert.notEqual(result.tokens["--accent"], "#333333");
});

test("the type floor is 32px everywhere in the token set", () => {
  for (const [k, v] of Object.entries(TYPE_TOKENS)) {
    if (!k.startsWith("--fs-")) continue;
    assert.ok(parseInt(v, 10) >= 32, `${k} is ${v}, below the 32px floor`);
  }
});
