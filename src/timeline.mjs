/**
 * timeline.mjs — the motion layer.
 *
 * An LLM never writes raw GSAP. It writes a timeline **plan** (plain JSON, see
 * references/timeline-model.md); this file turns that plan into a GSAP timeline that
 * runs inside headless Chromium.
 *
 * The browser runtime lives in RUNTIME below and is emitted **verbatim** into
 * scene.html — there is exactly one implementation of every preset, and the Node side
 * never re-implements it. `PRESET_NAMES` is the only duplication and it is asserted
 * against the runtime in tests/timeline.test.mjs.
 *
 * Hard rules enforced here:
 *   - only `opacity`, `transform` (x/y/scale/rotation) and `clip-path` animate;
 *     everything else is a layout-thrashing property and is rejected by validatePlan
 *   - no randomness, no rAF timing: the timeline is paused and driven by `seek(t)`,
 *     so a frame captured on a slow CPU is identical to one captured on a fast one
 *   - no flashing faster than `maxFlashingHz` (photosensitivity)
 */

/** Preset names the runtime implements. Keep in sync with RUNTIME.presets. */
export const PRESET_NAMES = [
  "none",
  "fadeIn",
  "riseIn",
  "dropIn",
  "slideInLeft",
  "slideInRight",
  "popIn",
  "wipeIn",
  "sweep",
  "breath",
  "driftUp",
  "fadeOut",
];

/** Properties a preset may touch. Anything else breaks the compositor-only rule. */
export const ALLOWED_PROPS = ["opacity", "x", "y", "scale", "scaleX", "rotation", "clipPath", "transformOrigin"];

/**
 * Presets that change opacity, i.e. the ones that can flash. Derived from RUNTIME
 * below; `tests/timeline.test.mjs` asserts every name here really does set opacity in
 * the runtime, so this list cannot drift.
 */
export const OPACITY_PRESETS = new Set([
  "fadeIn",
  "riseIn",
  "dropIn",
  "slideInLeft",
  "slideInRight",
  "popIn",
  "fadeOut",
]);

/**
 * The browser runtime. `buildTimeline(plan)` returns
 * `{ ok, tl, duration, fps, plan, sceneAt(t), stateAt(t) }`.
 */
export const RUNTIME = String.raw`
(function () {
  "use strict";

  // ---- presets -----------------------------------------------------------
  // "in" presets define a start state and an end state. The runtime writes the start
  // state at t=0 with tl.set() so the element is already hidden before its beat.
  var presets = {
    none:        { kind: "none" },
    fadeIn:      { kind: "in",  from: { opacity: 0 },                        to: {} },
    riseIn:      { kind: "in",  from: { opacity: 0, y: 28 },                 to: { y: 0 } },
    dropIn:      { kind: "in",  from: { opacity: 0, y: -24 },                to: { y: 0 } },
    slideInLeft: { kind: "in",  from: { opacity: 0, x: -56 },                to: { x: 0 } },
    slideInRight:{ kind: "in",  from: { opacity: 0, x: 56 },                 to: { x: 0 } },
    popIn:       { kind: "in",  from: { opacity: 0, scale: 0.94 },           to: { scale: 1 } },
    wipeIn:      { kind: "in",  from: { clipPath: "inset(0% 100% 0% 0%)" },  to: { clipPath: "inset(0% 0% 0% 0%)" } },
    sweep:       { kind: "in",  from: { scaleX: 0, transformOrigin: "0% 50%" }, to: { scaleX: 1 } },
    breath:      { kind: "pulse", a: { scale: 1 }, b: { scale: 1.022 } },
    driftUp:     { kind: "pulse", a: { y: 0 }, b: { y: -10 } },
    fadeOut:     { kind: "out", to: { opacity: 0 } }
  };

  var warned = [];

  function buildTimeline(plan) {
    if (!window.gsap) {
      return { ok: false, reason: "gsap-missing", duration: plan.duration, fps: plan.fps, plan: plan };
    }
    var gsap = window.gsap;
    var tl = gsap.timeline({ paused: true, repeat: 0 });
    var dur = plan.duration;

    plan.scenes.forEach(function (scene, sceneIndex) {
      var root = document.querySelector(scene.selector);
      if (!root) { warned.push("scene not found: " + scene.selector); return; }

      // A scene after the base scene is an overlay: it starts invisible, fades in at
      // fadeIn, fades out at fadeOut. The base scene is always on screen.
      if (scene.fadeIn) {
        // gsap.set() applies the start state to the DOM immediately. The tl.set() alone is
        // not enough: GSAP does not render a zero-duration tween that sits exactly at the
        // current playhead position on the initial render, so frame 0 (seek(0)) would show
        // the overlay at full opacity (measured 1 at t=0 vs 0 at t=0.001) and the loop
        // seam would break. tests/scene-runtime.test.mjs guards this.
        gsap.set(root, { opacity: 0 });
        tl.set(root, { opacity: 0 }, 0);
        tl.to(root, { opacity: 1, duration: scene.fadeIn.duration, ease: "power1.inOut" }, scene.fadeIn.at);
      }
      if (scene.fadeOut) {
        tl.to(root, { opacity: 0, duration: scene.fadeOut.duration, ease: "power1.inOut" }, scene.fadeOut.at);
      }
      if (scene.fadeOut && scene.fadeOut.at + scene.fadeOut.duration < dur - 1e-6) {
        // stays hidden until the loop restarts
        tl.set(root, { opacity: 0 }, dur - 1e-6);
      }

      (scene.beats || []).forEach(function (beat) {
        var preset = presets[beat.preset];
        if (!preset) { warned.push("unknown preset: " + beat.preset); return; }
        var targets = root.querySelectorAll(beat.selector);
        if (!targets.length) { warned.push("no elements for " + scene.id + " " + beat.selector); return; }
        var d = beat.duration == null ? 0.5 : beat.duration;
        var ease = beat.ease || "power2.out";
        var stagger = beat.stagger == null ? 0 : beat.stagger;
        var at = beat.at;

        if (preset.kind === "in") {
          // See the overlay note above: the immediate gsap.set() is what makes frame 0 correct.
          gsap.set(targets, Object.assign({}, preset.from));
          tl.set(targets, Object.assign({}, preset.from), 0);
          tl.to(targets, Object.assign({}, preset.to, { opacity: 1, duration: d, ease: ease, stagger: stagger }), at);
        } else if (preset.kind === "out") {
          tl.to(targets, Object.assign({}, preset.to, { duration: d, ease: ease, stagger: stagger }), at);
        } else if (preset.kind === "pulse") {
          var half = d / 2;
          tl.to(targets, Object.assign({}, preset.b, { duration: half, ease: "power1.inOut", stagger: stagger }), at);
          tl.to(targets, Object.assign({}, preset.a, { duration: half, ease: "power1.inOut", stagger: stagger }), at + half);
        }
      });
    });

    tl.pause(0);

    // ---- introspection used by the capture + test harness ----------------
    function stateAt(t) {
      var saved = tl.time();
      tl.pause();
      tl.seek(t, false);
      var out = {};
      plan.scenes.forEach(function (scene) {
        var root = document.querySelector(scene.selector);
        if (!root) return;
        var cs = getComputedStyle(root);
        out[scene.id] = { opacity: Number(cs.opacity) };
      });
      var probe = plan.probe || [];
      probe.forEach(function (sel) {
        var el = document.querySelector(sel);
        if (!el) { out[sel] = null; return; }
        var cs2 = getComputedStyle(el);
        out[sel] = { opacity: Number(cs2.opacity), transform: cs2.transform };
      });
      tl.seek(saved, false);
      return out;
    }

    function sceneAt(t) {
      var active = plan.baseScene || (plan.scenes[0] && plan.scenes[0].id);
      plan.scenes.forEach(function (scene) {
        if (!scene.fadeIn) return;
        if (t >= scene.fadeIn.at && (!scene.fadeOut || t < scene.fadeOut.at)) active = scene.id;
      });
      return active;
    }

    return {
      ok: true, tl: tl, duration: dur, fps: plan.fps, plan: plan,
      warnings: warned, stateAt: stateAt, sceneAt: sceneAt
    };
  }

  window.__buildTimeline = buildTimeline;
})();
`;

/** Emits the runtime plus the call that builds this plan. */
export function compileTimeline(plan) {
  return `${RUNTIME}\nwindow.__timeline = window.__buildTimeline(${JSON.stringify(plan, null, 2)});\n`;
}

/**
 * Static validation of a plan. Returns `{ errors, warnings }`; an error is always a
 * build failure, a warning is something a human must look at in the rendered frame.
 */
export function validatePlan(plan, { maxFlashingHz = 3 } = {}) {
  const errors = [];
  const warnings = [];
  const dur = plan.duration;

  if (!(dur > 0)) errors.push(`duration must be > 0, got ${plan.duration}`);
  if (!(plan.fps > 0)) errors.push(`fps must be > 0, got ${plan.fps}`);
  if (!Array.isArray(plan.scenes) || plan.scenes.length === 0) errors.push("plan needs at least one scene");

  const ids = new Set();
  for (const [si, scene] of (plan.scenes || []).entries()) {
    const where = `scenes[${si}](${scene.id})`;
    if (ids.has(scene.id)) errors.push(`${where}: duplicate scene id`);
    ids.add(scene.id);
    if (!scene.selector) errors.push(`${where}: missing selector`);

    if (si > 0 && !scene.fadeIn) errors.push(`${where}: an overlay scene needs fadeIn, otherwise it covers the base scene from frame 0 and the loop seam breaks`);
    if (scene.fadeIn && scene.fadeOut && scene.fadeOut.at < scene.fadeIn.at) errors.push(`${where}: fadeOut before fadeIn`);

    const win = [scene.fadeIn ? scene.fadeIn.at : 0, scene.fadeOut ? scene.fadeOut.at + scene.fadeOut.duration : dur];
    for (const [bi, beat] of (scene.beats || []).entries()) {
      const bw = `${where}.beats[${bi}](${beat.selector})`;
      if (!PRESET_NAMES.includes(beat.preset)) errors.push(`${bw}: unknown preset "${beat.preset}" (allowed: ${PRESET_NAMES.join(", ")})`);
      if (!(beat.at >= 0)) errors.push(`${bw}: missing or negative "at"`);
      const beatEnd = beat.at + (beat.duration ?? 0.5) + (beat.stagger ?? 0);
      if (beatEnd > dur + 1e-6) errors.push(`${bw}: ends at ${beatEnd.toFixed(2)}s, after the ${dur}s loop`);
      if (beat.at < win[0] - 1e-6 || beat.at > win[1] + 1e-6) {
        warnings.push(`${bw}: starts at ${beat.at}s outside its scene window ${win[0]}..${win[1]}s — it will be invisible or animate off-screen`);
      }
      if (beat.stagger && beat.stagger > 0 && beat.at + (beat.duration ?? 0.5) + beat.stagger * 4 > dur) {
        warnings.push(`${bw}: the stagger may push the last element past the ${dur}s loop (assumes up to 5 staggered elements)`);
      }
    }
  }

  // Photosensitivity: the hazard is a *rapid* luminance change, so the test is the
  // shortest gap between two consecutive opacity transitions on one element, not the
  // average over the loop. Counting beats / duration would let a 5 Hz flicker in one
  // second pass as 0.33 Hz. Only presets that actually change opacity count: the
  // pulses (breath, driftUp) and the clip/scale presets (wipeIn, sweep) do not.
  const transitions = new Map();
  for (const scene of plan.scenes || []) {
    for (const beat of scene.beats || []) {
      if (!OPACITY_PRESETS.has(beat.preset)) continue;
      const key = `${scene.id} ${beat.selector}`;
      transitions.set(key, [...(transitions.get(key) || []), beat.at]);
    }
  }
  const minGap = 1 / maxFlashingHz;
  for (const [key, times] of transitions) {
    times.sort((a, b) => a - b);
    for (let i = 1; i < times.length; i += 1) {
      const gap = times[i] - times[i - 1];
      if (gap < minGap - 1e-9) {
        errors.push(`${key}: two opacity changes ${gap.toFixed(2)}s apart = ${(1 / gap).toFixed(2)} Hz, above the ${maxFlashingHz} Hz photosensitivity limit`);
      }
    }
  }

  return { errors, warnings };
}
