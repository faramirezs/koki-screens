import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { validate } from "../scripts/validate-content.mjs";

const FIX = path.join(import.meta.dirname, "fixtures");
const CONTENT = path.join(FIX, "content");
const cases = [
  ["invalid-missing-price.json", "missing required field"],
  ["invalid-missing-allergens.json", "missing required field"],
  ["invalid-missing-vatnote.json", "missing required field"],
  ["invalid-health-claim.json", "banned claim"],
  ["invalid-placeholder-price.json", "placeholder text"],
  ["invalid-discount.json", "discount"],
  ["invalid-unknown-field.json", "unknown field"],
  ["invalid-duplicate-id.json", "duplicate id"],
  ["invalid-bad-allergen.json", "must be one of"],
  ["invalid-zero-price.json", "must be > 0"],
];

test("valid German content passes with only warnings", async () => {
  const r = await validate({ contentPath: path.join(CONTENT, "valid-de.json"), photosDir: FIX });
  assert.equal(r.ok, true, JSON.stringify(r.errors));
});

test("valid English content passes", async () => {
  const r = await validate({ contentPath: path.join(CONTENT, "valid-en.json"), photosDir: FIX });
  assert.equal(r.ok, true, JSON.stringify(r.errors));
});

for (const [file, needle] of cases) {
  test(`${file} is rejected with an actionable message`, async () => {
    const r = await validate({ contentPath: path.join(CONTENT, file), photosDir: FIX });
    assert.equal(r.ok, false, `${file} was accepted but must be rejected`);
    assert.ok(
      r.errors.some((e) => e.message.includes(needle)),
      `expected an error mentioning "${needle}", got: ${JSON.stringify(r.errors)}`
    );
    for (const e of r.errors) assert.ok(e.path !== undefined, "every error names the field to fix");
  });
}

test("a missing photo file is a hard error, not a warning", async () => {
  const r = await validate({ contentPath: path.join(CONTENT, "valid-de.json"), photosDir: "/tmp/definitely-not-here" });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.message.includes("photo not found")));
});

test("an empty allergens array warns (legal declaration) but passes", async () => {
  const r = await validate({ contentPath: path.join(CONTENT, "valid-de.json"), photosDir: FIX });
  assert.ok(r.warnings.some((w) => w.message.includes("allergen-free")));
});
