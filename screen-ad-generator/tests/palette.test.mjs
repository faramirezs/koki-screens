import test from "node:test";
import assert from "node:assert/strict";
import { buildPalette } from "../scripts/palette.mjs";

// WCAG AA is 4.5:1; 7:1 (AAA) is preferred for body copy. The two are different numbers
// and the palette stage must not enforce the preferred one as a floor: doing so failed a
// legitimate extraction palette at 6.87:1 (see D34).
const brand = (minContrast) => ({
  theme: "dark",
  colors: { bg: "#595B56", surface: "#595B56", text: "#FFFFFF", textHero: "#FFFFFF", textMuted: "#FFFFFF", legal: "#FFFFFF", accent: "#FF7D00", price: "#FF7D00", onAccent: "#FFFFFF" },
  ...(minContrast ? { rules: { minContrast } } : {}),
});

test("a pair between the floor and the preferred ratio passes with a warning, not an error", async () => {
  const r = await buildPalette({ brand: brand(4.5), theme: "dark", minContrast: 4.5 });
  const pair = r.audit.find((a) => a.pair === "text/surface");
  assert.ok(pair.ratio >= 4.5 && pair.ratio < 7, `expected 4.5..7, got ${pair.ratio}`);
  assert.equal(pair.pass, true, "4.5:1 is the floor and this pair clears it");
  assert.equal(pair.preferred, false, "…but it is below the preferred 7:1");
  assert.equal(pair.min, 4.5, "min reports the floor");
  assert.equal(pair.target, 7, "target reports the preferred ratio");
  assert.deepEqual(r.errors, [], "a passing pair must not fail the build");
});

test("the same pair is an error when the brand raises the floor to 7", async () => {
  const r = await buildPalette({ brand: brand(7), theme: "dark", minContrast: 7 });
  assert.ok(r.errors.length > 0, "a brand that declares a 7:1 floor should not get 6.87:1 silently");
  assert.match(r.errors.join(" "), /text\/surface|text on surface/);
});

test("the audit never reports a pair as passing below the floor", async () => {
  for (const mc of [4.5, 7]) {
    const r = await buildPalette({ brand: brand(mc), theme: "dark", minContrast: mc });
    for (const a of r.audit) {
      if (a.pass) assert.ok(a.ratio >= a.min, `${a.pair} reports pass at ${a.ratio}:1 below its own floor ${a.min}`);
      else assert.ok(a.ratio < a.min, `${a.pair} reports failure at ${a.ratio}:1 above its own floor ${a.min}`);
    }
  }
});

test("repair never makes a pair worse than it already was", async () => {
  const r = await buildPalette({ brand: brand(4.5), theme: "dark", minContrast: 4.5 });
  for (const a of r.audit) {
    if (a.before !== undefined) assert.ok(a.ratio >= a.before, `${a.pair} went from ${a.before}:1 to ${a.ratio}:1`);
  }
});
