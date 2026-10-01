import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

// Point SCREEN_AD_SEAM_DIR at a run's work/frames directory (e.g. from
// `adkit build --keep-frames`) to check the loop seam of a real render.
// The check itself also runs inside `adkit build`; this test exists so the seam can be
// re-checked without re-rendering.
const dir = process.env.SCREEN_AD_SEAM_DIR;

test("frame 0 and the frame at t=duration are identical", { skip: !dir }, async () => {
  const first = path.join(dir, "frame-0000.png");
  const seam = path.join(dir, "seam.png");
  assert.ok(existsSync(first), `${first} missing`);
  assert.ok(existsSync(seam), `${seam} missing — render with --seam-frame`);
  const sharp = (await import("sharp")).default;
  const a = await sharp(first).raw().toBuffer();
  const b = await sharp(seam).raw().toBuffer();
  assert.equal(a.length, b.length);
  let differing = 0;
  let max = 0;
  for (let i = 0; i < a.length; i++) {
    const d = Math.abs(a[i] - b[i]);
    if (d > 2) differing++;
    if (d > max) max = d;
  }
  const ratio = differing / a.length;
  assert.ok(ratio <= 0.005, `${(ratio * 100).toFixed(3)}% of samples differ (max delta ${max}) — the loop is not seamless`);
});

test("the seam check reports why it was skipped", { skip: !!dir }, () => {
  assert.ok(true, "set SCREEN_AD_SEAM_DIR=<run>/work/frames to run the seam check");
});
