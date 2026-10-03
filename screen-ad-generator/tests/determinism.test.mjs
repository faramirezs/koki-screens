import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync, readdirSync, readFileSync } from "node:fs";

// Determinism is a property of two runs, so it cannot be checked inside a single build.
// Point SCREEN_AD_FRAME_DIRS at two `work/frames` directories from two renders of the
// same scene.html (e.g. `adkit build --keep-frames` twice) to compare them frame by frame.
//
//   node scripts/render-frames.mjs --scene <run>/work/scene/scene.html --out /tmp/a --fps 25 --duration 15
//   node scripts/render-frames.mjs --scene <run>/work/scene/scene.html --out /tmp/b --fps 25 --duration 15
//   SCREEN_AD_FRAME_DIRS=/tmp/a/frames,/tmp/b/frames node --test tests/determinism.test.mjs
//
// Measured on the reference machine: 375/375 identical. See D32 in docs/DECISIONS.md.
const dirs = (process.env.SCREEN_AD_FRAME_DIRS || "").split(",").map((d) => d.trim()).filter(Boolean);

test("two renders of the same scene produce byte-identical frames", { skip: dirs.length !== 2 }, () => {
  const [a, b] = dirs;
  assert.ok(existsSync(a), `${a} missing`);
  assert.ok(existsSync(b), `${b} missing`);
  const names = readdirSync(a).filter((n) => n.endsWith(".png")).sort();
  assert.ok(names.length > 0, `${a} has no PNG frames`);
  const other = new Set(readdirSync(b));
  const differing = [];
  for (const n of names) {
    if (!other.has(n)) {
      differing.push(`${n} (missing from the second render)`);
      continue;
    }
    if (!readFileSync(path.join(a, n)).equals(readFileSync(path.join(b, n)))) differing.push(n);
  }
  assert.deepEqual(differing, [], `${differing.length} of ${names.length} frames differ between the two renders`);
});

test("the determinism check reports how to run it", { skip: dirs.length === 2 }, () => {
  assert.ok(true, "set SCREEN_AD_FRAME_DIRS=<dirA>,<dirB> to compare two renders");
});
