import test from "node:test";
import assert from "node:assert/strict";
import { OPACITY_PRESETS, PRESET_NAMES, RUNTIME, compileTimeline, validatePlan } from "../src/timeline.mjs";

const okPlan = () => ({
  schemaVersion: 1, fps: 25, duration: 15, loop: true, baseScene: "board",
  scenes: [
    { id: "board", selector: "#scene-board", start: 0, beats: [{ selector: ".a", preset: "breath", at: 1.5, duration: 2 }] },
    { id: "promo", selector: "#scene-promo", start: 8, fadeIn: { at: 8, duration: 0.6 }, fadeOut: { at: 13, duration: 0.6 },
      beats: [{ selector: ".b", preset: "riseIn", at: 8.7, duration: 0.5 }] },
  ],
});

test("PRESET_NAMES matches the presets actually implemented in the runtime", () => {
  const body = RUNTIME.slice(RUNTIME.indexOf("var presets = {"), RUNTIME.indexOf("var warned"));
  const implemented = [...body.matchAll(/^\s{4}([a-zA-Z]+):\s*\{/gm)].map((m) => m[1]);
  assert.deepEqual(implemented.sort(), [...PRESET_NAMES].sort(), "the Node-side preset list drifted from the runtime");
});

test("the runtime stays compositor-only and seek-driven", () => {
  assert.ok(!/\bMath\.random\b/.test(RUNTIME), "the runtime must not use randomness");
  assert.ok(!/\bDate\.now\b|\bperformance\.now\b/.test(RUNTIME), "the runtime must not read the clock — frames are captured by seek()");
  for (const banned of ["width", "height", "top", "left", "margin", "padding", "fontSize"]) {
    assert.ok(!new RegExp(`["']${banned}["']\\s*:`).test(RUNTIME), `presets must not animate ${banned}`);
  }
});

test("a valid plan passes", () => {
  const { errors, warnings } = validatePlan(okPlan());
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test("an overlay scene without fadeIn is rejected", () => {
  const p = okPlan();
  delete p.scenes[1].fadeIn;
  assert.ok(validatePlan(p).errors.some((e) => e.includes("needs fadeIn")));
});

test("an unknown preset is rejected", () => {
  const p = okPlan();
  p.scenes[0].beats[0].preset = "explode";
  assert.ok(validatePlan(p).errors.some((e) => e.includes("unknown preset")));
});

test("a beat that ends after the loop is rejected", () => {
  const p = okPlan();
  p.scenes[0].beats[0].at = 14.8;
  assert.ok(validatePlan(p).errors.some((e) => e.includes("after the 15s loop")));
});

test("flashing faster than the limit is rejected", () => {
  const p = okPlan();
  // four opacity changes 0.2s apart = 5 Hz, even though the average over the 15s loop is
  // only 0.27 Hz — the hazard is the gap, not the average.
  p.scenes[0].beats = Array.from({ length: 4 }, (_, i) => ({ selector: ".flash", preset: "fadeIn", at: 1 + i * 0.2, duration: 0.1 }));
  const errs = validatePlan(p, { maxFlashingHz: 3 }).errors;
  assert.ok(errs.some((e) => e.includes("photosensitivity")), JSON.stringify(errs));
});

test("beats spaced further apart than the limit pass", () => {
  const p = okPlan();
  p.scenes[0].beats = Array.from({ length: 4 }, (_, i) => ({ selector: ".flash", preset: "fadeIn", at: 1 + i * 0.5, duration: 0.2 }));
  assert.deepEqual(validatePlan(p, { maxFlashingHz: 3 }).errors, []);
});

test("scale-only presets are not treated as flashing", () => {
  const p = okPlan();
  p.scenes[0].beats = Array.from({ length: 6 }, (_, i) => ({ selector: ".pulse", preset: "breath", at: 1 + i * 0.1, duration: 0.05 }));
  assert.deepEqual(validatePlan(p, { maxFlashingHz: 3 }).errors, []);
});

test("OPACITY_PRESETS matches the runtime: those presets set opacity, the others do not", () => {
  const body = RUNTIME.slice(RUNTIME.indexOf("var presets = {"), RUNTIME.indexOf("var warned"));
  for (const m of body.matchAll(/^\s{4}([a-zA-Z]+):\s*\{([\s\S]*?)\},?$/gm)) {
    const [, name, def] = m;
    const setsOpacity = /opacity/.test(def);
    assert.equal(
      OPACITY_PRESETS.has(name),
      setsOpacity,
      `${name}: OPACITY_PRESETS says ${OPACITY_PRESETS.has(name)} but the runtime ${setsOpacity ? "does" : "does not"} set opacity`
    );
  }
});

test("compileTimeline emits the runtime plus the plan", () => {
  const src = compileTimeline(okPlan());
  assert.ok(src.includes("window.__buildTimeline"));
  assert.ok(src.includes('"duration": 15'));
});
