/*
 * lab.js — renders one banner from its spec, animates it, and drives the gallery.
 *
 * One banner = one spec object from banners.json. The spec is also the feedback key, so a
 * verdict can always be traced back to the exact combination of axes that produced it.
 *
 * Motion model: one timeline of fixed duration LOOP that returns to its start state, so it
 * loops forever without a jump. That is the same constraint the video pipeline enforces
 * with the loop-seam check, which means a banner picked here can be exported to video with
 * the motion it was judged on.
 */
import { BG_RECIPES, MOTION_SPEC, NEEDS_CUTOUT, PHASES, ROLE_MOTION, BG_ENERGY_CURVES } from "./space.mjs";


// --------------------------------------------------------------------------- //
// helpers
// --------------------------------------------------------------------------- //

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

/** Deterministic per-banner RNG so a spec always renders identically. */
function rngFrom(id) {
  let a = 0;
  for (let i = 0; i < id.length; i++) a = (a * 31 + id.charCodeAt(i)) | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --------------------------------------------------------------------------- //
// decorations
// --------------------------------------------------------------------------- //

const DECOR_ART = {
  splash: (n, w, h) => Array.from({ length: n }, (_, i) => ({
    cls: "bn__splash", x: (i % 3) * 34 + 6, y: (i % 2) * 46 + 8,
    size: 10 + ((i * 7) % 9), rot: i * 23,
  })),
  flames: (n) => Array.from({ length: n }, (_, i) => ({
    cls: "bn__flame", x: i * 13 + 2, y: i % 2 ? 76 : 4, size: 7 + (i % 4) * 2.2, rot: i % 2 ? 8 : -6,
  })),
  rings: (n) => Array.from({ length: n }, (_, i) => ({
    cls: `bn__ring${i % 2 ? " bn__ring--dashed" : ""}`, x: 30 + i * 9, y: 18 + i * 11, size: 7 + i * 3,
  })),
  confetti: (n) => Array.from({ length: n }, (_, i) => ({
    cls: i % 3 === 0 ? "bn__dot" : "bn__streak", x: (i * 17) % 96, y: (i * 29) % 92, size: 1.6 + (i % 4) * .7, rot: i * 37,
  })),
  leaves: (n) => Array.from({ length: n }, (_, i) => ({
    cls: "bn__splash", x: (i * 23) % 90, y: (i * 31) % 84, size: 5 + (i % 3) * 2, rot: i * 61,
  })),
  sparkles: (n) => Array.from({ length: n }, (_, i) => ({
    cls: "bn__star", x: (i * 13) % 94, y: (i * 41) % 88, size: 2.4 + (i % 3) * 1.6,
  })),
  streaks: (n) => Array.from({ length: n }, (_, i) => ({
    cls: "bn__streak", x: (i * 19) % 92, y: (i * 27) % 90, size: 2 + (i % 4) * 1.1, w: 10 + (i % 3) * 7,
  })),
  bubbles: (n) => Array.from({ length: n }, (_, i) => ({
    cls: "bn__bubble", x: (i * 21) % 92, y: (i * 37) % 86, size: 3 + (i % 5) * 1.6,
  })),
  doodles: (n) => Array.from({ length: n }, (_, i) => ({
    cls: "bn__doodle", x: (i * 11) % 92, y: (i * 33) % 88, size: 6 + (i % 4) * 3,
  })),
};

function decorLayer(spec, rng) {
  const wrap = el("div", "bn__decor");
  if (spec.decor === "none") return wrap;
  const make = DECOR_ART[spec.decor];
  if (!make) return wrap;
  const n = 6 + Math.floor(rng() * 6);
  for (const d of make(n)) {
    const node = el("div", d.cls);
    const u = 19.2; // 1 unit at 1080p
    node.style.left = `${d.x}%`;
    node.style.top = `${d.y}%`;
    node.style.width = `${d.size * u}px`;
    node.style.height = `${d.w ? d.w * u : d.size * u}px`;
    if (d.rot) node.style.rotate = `${d.rot}deg`;
    wrap.appendChild(node);
  }
  return wrap;
}

/**
 * The background is three oversized gradient sheets sliding past each other, the trick from
 * the brief: a hard 50/50 split of two colours, thrown far past the edges, sliding on an
 * `alternate` ease. Three of them at different speeds and directions never settle into a
 * still image, which is the whole point.
 *
 * Each sheet's duration divides half the loop, so after LOOP seconds the composite is
 * exactly where it started and the video can loop without a jump.
 */
function bgLayers(spec, p) {
  const bg = el("div", "bn__bg");
  const recipe = BG_RECIPES[spec.bg] || BG_RECIPES.triSlide;
  const base = el("div", "bn__bgBase");
  base.style.background = p.slide[0];
  bg.appendChild(base);

  for (let i = 0; i < recipe.layers; i++) {
    const a = p.slide[i % p.slide.length];
    const b = p.slide[(i + 1) % p.slide.length];
    const sheet = el("div", "bn__slide");
    sheet.style.setProperty("--a", a);
    sheet.style.setProperty("--b", b);
    sheet.style.setProperty("--ang", `${recipe.angle - i * 18}deg`);
    sheet.style.setProperty("--op", recipe.opacity);
    sheet.style.setProperty("--dur", `${recipe.dur[i % recipe.dur.length]}s`);
    sheet.style.animationDirection = i % 2 ? "alternate-reverse" : "alternate";
    if (recipe.blend) sheet.style.mixBlendMode = recipe.blend;
    if (recipe.kind) sheet.classList.add(`bn__slide--${recipe.kind}`);
    bg.appendChild(sheet);
  }
  return bg;
}

// --------------------------------------------------------------------------- //
// render
// --------------------------------------------------------------------------- //

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

export function renderBanner(spec) {
  const rng = rngFrom(spec.id);
  const p = spec.palette;
  const bn = el("div", "bn");
  bn.dataset.id = spec.id;
  bn.style.cssText = [
    `--w:${spec.width}px`, `--h:${spec.height}px`,
    `--bg:${p.slide[0]}`, `--bg2:${p.slide[1]}`, `--panel:${p.panel}`, `--ink:${p.ink}`,
    `--accent:${p.accent}`, `--accent2:${p.accent2}`, `--muted:${p.muted}`, `--on-accent:${p.onAccent}`,
    `--u:${(Math.min(spec.width, spec.height * 1.78) / 100).toFixed(3)}px`,
  ].join(";");
  // A treatment that floats the product needs real alpha; without a cutout, show it framed.
  const treatment = NEEDS_CUTOUT.has(spec.product) && !spec.cut ? "framed" : spec.product;
  bn.dataset.treatment = treatment;
  bn.classList.add(
    `bn--bg-${spec.bg}`, `bn--lay-${spec.layout}`, `bn--type-${spec.type}`,
    `bn--badge-${spec.badge}`, `bn--cta-${spec.cta}`, `bn--prod-${treatment}`,
    `bn--energy-${spec.bgEnergy || "flat"}`, `bn--roles-${spec.roleMotion || "uniform"}`
  );
  if (p.mode === "light") bn.classList.add("bn--light");

  // where the glow sits: under the product, whichever side the layout put it
  const glowX = spec.layout.includes("Right") || spec.layout === "circleMask" || spec.layout === "topBanner" ? "72%" : spec.layout === "centerStack" ? "50%" : "30%";
  bn.style.setProperty("--glow-x", glowX);
  bn.style.setProperty("--glow-y", "48%");

  bn.appendChild(bgLayers(spec, p));
  bn.appendChild(el("div", "bn__vignette"));
  bn.appendChild(decorLayer(spec, rng));

  // ---- product ----
  const media = el("div", "bn__media");
  const img = el("img", "bn__img");
  img.src = `photos2/${NEEDS_CUTOUT.has(spec.product) && spec.cut ? spec.cut : spec.photo}`;
  img.alt = "";
  img.decoding = "sync";
  media.appendChild(img);
  bn.appendChild(media);

  // ---- copy ----
  const copy = el("div", "bn__copy");
  copy.appendChild(el("div", "bn__kicker", spec.copy.kicker));
  const headline = el("h2", "bn__headline");
  for (const line of spec.copy.lines) headline.appendChild(el("span", "bn__line", line));
  copy.appendChild(headline);
  copy.appendChild(el("div", "bn__sub", spec.copy.sub));
  copy.appendChild(el("div", "bn__cta", spec.copy.cta));
  bn.appendChild(copy);

  // ---- badge ----
  bn.appendChild(el("div", "bn__badge", spec.copy.badge));

  // a first pass so the banner is never shown unfitted; settle() does it properly once the
  // webfont is in, and refit() starts from the stylesheet so the two cannot compound
  fitType(bn);
  requestAnimationFrame(() => refit(bn));
  return bn;
}

// --------------------------------------------------------------------------- //
// motion
// --------------------------------------------------------------------------- //

const q = (root, sel) => [...root.querySelectorAll(sel)];

/**
 * One loop is one story, told in five Phases (see PHASES in space.mjs):
 *
 *   Intro   0.0 - 1.5   the background alone, already sliding
 *   Reveal  1.5 - 3.9   the panel wipes in and the elements slam into it, staggered
 *   Hold    3.9 - 9.5   everything breathes while you read it
 *   Exit    9.5 - 11.1  the elements are thrown back off the canvas
 *   Tail   11.1 - 12.0  the background alone again
 *
 * The Reveal and Exit boundaries move with the size of the cast, so the two interior numbers
 * are the timeline's own, not the design's. The phase boundaries themselves come from PHASES,
 * which is also what the background-energy curves in lab.css are drawn against.
 *
 * The timeline does NOT yoyo: at t=LOOP every element is back in exactly the pose it had at
 * t=0, because the exit ends on the same off-canvas pose the entrance started from. So the
 * loop closes without a jump and without a reversed copy of the entrance.
 */
export const LOOP = PHASES.tail[1];
const T_IN = PHASES.reveal[0];  // the background gets the stage to itself first
const IN_DUR = 0.60;
const IN_STAGGER = 0.08;
const HOLD_END = PHASES.exit[0]; // ~6s of settled, readable time for a typical cast
const OUT_DUR = 0.55;
const OUT_STAGGER = 0.045;
const EASE_IN = "back.out(2.2)"; // the overshoot is the impact
const EASE_OUT = "expo.in";

/** How each element breathes while it is on screen. Amplitudes are deliberately small. */
const IDLE = {
  floatY:   { y: -15 },
  bob:      { y: -24 },
  sway:     { y: -7, rot: 1.5 },
  breathe:  { scale: 1.035 },
  drift:    { y: -11, x: 13, rot: 0.9 },
  pendulum: { y: -5, rot: 2.8 },
  wave:     { y: -17, rot: -1.3, scale: 1.012 },
};

/**
 * How far an element has to move to be completely off the canvas. Measured from its own box,
 * so "left" is off the left edge whether the layout put the element at 5% or 70%.
 */
function offPose(node, root, dir, margin = 90) {
  const r = node.getBoundingClientRect();
  const b = root.getBoundingClientRect();
  if (!r.width && !r.height) return { x: 0, y: 0 };
  if (dir === "left") return { x: -(r.right - b.left) - margin, y: 0 };
  if (dir === "right") return { x: b.right - r.left + margin, y: 0 };
  if (dir === "top") return { x: 0, y: -(r.bottom - b.top) - margin };
  if (dir === "bottom") return { x: 0, y: b.bottom - r.top + margin };
  return { x: 0, y: 0 };
}

export function buildMotion(root, spec) {
  const m = MOTION_SPEC[spec.motion] || MOTION_SPEC.slamLeft;
  const tl = gsap.timeline({ repeat: -1, paused: true });

  // ---- the background's energy: how far the sheets travel during each Phase ----
  // Driven from THIS timeline rather than from CSS, so that seeking to a Phase shows the
  // energy that Phase actually has. `flat` has no curve and keeps full travel throughout.
  const bgEl = root.querySelector(".bn__bg");
  const curve = BG_ENERGY_CURVES[spec.bgEnergy];
  if (bgEl && curve) {
    let prev = 0;
    for (const [t, v] of curve) {
      tl.to(bgEl, { "--energy": v, duration: Math.max(0.001, t - prev), ease: "none" }, prev);
      prev = t;
    }
  }

  const panel = root.querySelector(".bn__copy");
  // One Motion family, shared by the whole cast, so the board reads as a single gesture.
  // `roleMotion` decides how much of that family each Role takes - ROLE_MOTION in space.mjs.
  const share = ROLE_MOTION[spec.roleMotion] || ROLE_MOTION.uniform;
  const of = (r) => share[r] ?? 1;
  const idleOf = share.idle ?? 1;

  // ---- the panel wipes in first: it is the ground the words land on ----
  if (panel) {
    const from = m.in.dir === "bottom" || m.in.dir === "top" ? "inset(100% 0 0 0)" : "inset(0 0 100% 0)";
    tl.fromTo(
      panel,
      { clipPath: from, opacity: 0.2 },
      { clipPath: "inset(0% 0 0 0)", opacity: 1, duration: 0.5, ease: "power4.out" },
      T_IN - 0.14
    );
  }

  // ---- the cast: words in reading order, then the badge, the photo, then the decor ----
  const cast = [
    ...q(root, ".bn__copy > *").map((node) => ({ node, role: "copy" })),
    ...q(root, ".bn__badge").map((node) => ({ node, role: "badge" })),
    ...q(root, ".bn__media").map((node) => ({ node, role: "media" })),
    ...q(root, ".bn__decor > *").map((node) => ({ node, role: "decor" })),
  ];
  for (const [i, { node, role }] of cast.entries()) {
    const f = of(role);
    const at = T_IN + i * IN_STAGGER;
    const off = offPose(node, root, m.in.dir);
    // every travel, rotation and scale below is the family's, scaled by the Role's share
    const start = { x: off.x * f, y: off.y * f, rotation: (m.in.rot || 0) * f, scale: 1 + ((m.in.scale ?? 1) - 1) * f, opacity: 0 };
    const settle = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: IN_DUR, ease: EASE_IN };
    if (m.in.blur) start.filter = `blur(${m.in.blur}px)`;
    if (m.in.blur) settle.filter = "blur(0px)";
    if (m.in.clip) {
      start.clipPath = m.in.dir === "bottom" ? "inset(100% 0 0 0)" : "inset(0 100% 0 0)";
      settle.clipPath = "inset(0% 0 0 0)";
    }
    tl.fromTo(node, start, settle, at);

    // ---- breathing: alternating half-cycles that end on the settled pose ----
    const amp = IDLE[m.idle] || IDLE.floatY;
    const ia = f * idleOf;
    const idleFrom = at + IN_DUR;
    const idleTo = HOLD_END - 0.34;
    const span = Math.max(0, idleTo - idleFrom);
    const steps = Math.max(1, Math.round(span / 1.6));
    const step = span / steps;
    for (let k = 0; k < steps; k++) {
      const up = k % 2 === 0;
      const tween = { duration: step, ease: "sine.inOut" };
      if (amp.y) tween.y = (up ? amp.y : -amp.y * 0.45) * ia;
      if (amp.x) tween.x = (up ? amp.x : -amp.x * 0.45) * ia;
      if (amp.rot) tween.rotation = (up ? amp.rot : -amp.rot) * ia;
      if (amp.scale) tween.scale = up ? 1 + (amp.scale - 1) * ia : 1;
      tl.to(node, tween, idleFrom + k * step);
    }
    tl.to(node, { x: 0, y: 0, rotation: 0, scale: 1, duration: 0.34, ease: "power2.out" }, idleTo);

    // ---- the exit: last in, first out, thrown the other way ----
    const outAt = HOLD_END + (cast.length - 1 - i) * OUT_STAGGER;
    const away = offPose(node, root, m.out.dir);
    const end = { x: away.x * f, y: away.y * f, rotation: (m.out.rot || 0) * f, scale: 1 + ((m.out.scale ?? 1) - 1) * f, opacity: 0, duration: OUT_DUR, ease: EASE_OUT };
    if (m.out.blur) end.filter = `blur(${m.out.blur}px)`;
    if (m.out.clip) end.clipPath = m.out.dir === "top" ? "inset(0 0 100% 0)" : "inset(0 0 0 100%)";
    tl.to(node, end, outAt);
  }

  if (panel) {
    // the wipe leaves the way it came in, not the way the elements leave
    const exitClip = m.out.dir === "bottom" ? "inset(100% 0 0 0)" : "inset(0 0 100% 0)";
    tl.to(panel, { clipPath: exitClip, opacity: 0.2, duration: 0.5, ease: "power3.in" }, HOLD_END + 0.35);
  }

  // The background keeps sliding on its own CSS animation for the whole 12s, so the quiet
  // stretch at the end is not empty - it is the background's own moment, and it is what the
  // loop opens on. This spacer pins the timeline's duration to LOOP: without it the timeline
  // would end when the last exit tween ends (~10.4s) and every caller that seeks to LOOP
  // would silently wrap back to frame zero.
  tl.to({ pad: 0 }, { pad: 1, duration: 0.01, ease: "none" }, LOOP - 0.01);

  tl.pause(0);
  return tl;
}

// --------------------------------------------------------------------------- //
// fitting
// --------------------------------------------------------------------------- //

/**
 * Display lines never wrap - a broken line is a design decision, not a wrap point. So a line
 * that does not fit its box is scaled down instead, which is what a designer would do.
 * Runs before the element is in the document as a no-op, and again on the next frame.
 */
/**
 * The width a child of `.bn__copy` can occupy: the panel's content box. `clientWidth`
 * includes the panel's own padding, and using it as the limit lets a headline run 130px into
 * the padding and out of the panel.
 */
function copyContentWidth(copy) {
  if (!copy) return 0;
  const cs = getComputedStyle(copy);
  return copy.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
}

/**
 * Drop every inline size the fit pass ever wrote. Both fit functions are shrink-only, so
 * without this a second run compounds the first one: render before the webfont loads, and the
 * fallback's wider metrics shrink the type, then the post-font run shrinks it again. The
 * result is a banner whose type has collapsed into a sliver.
 */
function clearFit(bn) {
  for (const n of bn.querySelectorAll(".bn__line, .bn__kicker, .bn__sub, .bn__cta")) n.style.fontSize = "";
}

/**
 * The rendered width of a text node, in layout px. A badge centres its label, so an
 * over-wide label overflows both edges and `scrollWidth` reports the box plus half the
 * overflow on each side -- a number that never drops below the limit, so a shrink loop
 * against it drives the type to the floor. Measure the glyphs instead.
 */
let measureCtx = null;
function textWidth(n) {
  measureCtx ||= document.createElement("canvas").getContext("2d");
  const cs = getComputedStyle(n);
  measureCtx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const text = n.textContent.trim().toUpperCase(); // the badge label is uppercased by CSS
  const track = (parseFloat(cs.letterSpacing) || 0) * Math.max(0, text.length - 1);
  return measureCtx.measureText(text).width + track;
}

export function fitType(bn) {
  const copy = bn.querySelector(".bn__copy");
  const copyW = copyContentWidth(copy);
  for (const n of bn.querySelectorAll(".bn__line, .bn__kicker, .bn__sub, .bn__cta, .bn__badge")) {
    // `.bn__copy` is a flex column with `align-items: flex-start`, so a nowrap line grows
    // past its parent rather than being clipped: the limit is the copy box, never the
    // element's own width, which is already the too-wide text width.
    //
    // A badge is the opposite case. It has a fixed box, and the shaped ones (starburst,
    // circle, seal) have no room at the corners, so the label has to fit the *inscribed*
    // area -- `--fit` is that fraction of the box. Without it a long label runs past the
    // star's points and the clip-path slices the last letter off.
    const cs = getComputedStyle(n);
    const isBadge = !n.closest(".bn__copy");
    const fit = parseFloat(cs.getPropertyValue("--fit")) || 1;
    const limit = isBadge
      ? (n.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) * fit
      : copyW;
    if (!limit) continue;
    let size = parseFloat(cs.fontSize);
    for (let i = 0; i < 8 && size > 6; i++) {
      const w = isBadge ? textWidth(n) : n.scrollWidth;
      if (!w || w <= limit) break;
      size *= limit / w;
      n.style.fontSize = `${size.toFixed(2)}px`;
    }
  }
}

/**
 * `fitType` fits each line to its own box; it cannot see that the stack as a whole is taller
 * than the canvas. The centred layouts put the copy at 50% with a translate, so a tall stack
 * runs off both edges. Shrink the whole stack until it clears, then re-fit the lines.
 */
/**
 * Shrink the stack until it fits the room its layout allows. The room is the panel's
 * `max-height` when the stylesheet sets one (the layouts that share the canvas with a photo
 * do), and 88% of the banner otherwise. Only the content counts: padding does not shrink.
 */
/**
 * How tall the copy stack actually is. `getBoundingClientRect()` is useless here: once the
 * panel hits its `max-height` the box stops growing and the text overflows instead, so the
 * rect reports "it fits" while the last line is off the panel. Measure the children instead.
 */
function stackHeight(copy) {
  // offsetTop/offsetHeight, not getBoundingClientRect: the gallery and the contact sheet both
  // preview a banner through `transform: scale()`, and a rect is reported in the scaled units
  // while the padding it is compared against is not. Mixing the two collapses the type.
  const kids = [...copy.children].filter((n) => n.offsetHeight || n.offsetWidth);
  if (!kids.length) return 0;
  const tops = kids.map((n) => n.offsetTop);
  const bottoms = kids.map((n) => n.offsetTop + n.offsetHeight);
  return Math.max(...bottoms) - Math.min(...tops);
}

export function fitCopy(bn) {
  const copy = bn.querySelector(".bn__copy");
  if (!copy) return;
  const cs = getComputedStyle(copy);
  const boxH = bn.offsetHeight;
  // Chrome hands back a percentage max-height verbatim, so `parseFloat("47%")` would read as
  // 47px and the loop below would shrink the type to nothing. Resolve it against the banner.
  const raw = cs.maxHeight;
  const maxH = raw.endsWith("%") ? (parseFloat(raw) / 100) * boxH : parseFloat(raw);
  const limit = Number.isFinite(maxH) && maxH > 0 ? maxH : boxH * 0.88;
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
  const room = Math.max(0, limit - padY);
  for (let i = 0; i < 8; i++) {
    const h = stackHeight(copy);
    if (!h || h <= room) break;
    const k = Math.max(0.5, room / h);
    for (const n of copy.querySelectorAll(".bn__line, .bn__kicker, .bn__sub, .bn__cta")) {
      n.style.fontSize = `${parseFloat(getComputedStyle(n).fontSize) * k}px`;
    }
    fitType(bn);
  }
}

/**
 * Decorations paint behind everything, so a solid blob under the copy or the badge drops the
 * text on it to about 1:1 without any element's own colours being wrong. Push any shape that
 * lands under a text box clear of it; a shape with nowhere to go is faded instead.
 */
export function dodgeCopy(bn) {
  const box = bn.getBoundingClientRect();
  if (!box.width) return;
  const shapes = [...bn.querySelectorAll(".bn__decor > *")];
  if (!shapes.length) return;
  // wide enough to survive the motion tweens, which move shapes by up to ~60px
  const pad = box.width * 0.045;

  for (const host of bn.querySelectorAll(".bn__copy, .bn__badge")) {
    const c = host.getBoundingClientRect();
    if (!c.width) continue;
    const top = c.top - box.top - pad;
    const bottom = c.bottom - box.top + pad;
    const left = c.left - box.left;
    const right = c.right - box.left;
    for (const d of shapes) {
      if (d.style.display === "none") continue;
      const dr = d.getBoundingClientRect();
      const r = { left: dr.left - box.left, right: dr.right - box.left, top: dr.top - box.top, bottom: dr.bottom - box.top, width: dr.width };
      if (r.right <= left || r.left >= right || r.bottom <= top || r.top >= bottom) continue;
      const w = r.width;
      const goLeft = r.left + w / 2 < (left + right) / 2;
      const target = goLeft ? left - w : right;
      if (target < -w * 0.5 || target + w > box.width + w * 0.5) {
        d.style.opacity = "0.08";
        continue;
      }
      d.style.left = `${((target / box.width) * 100).toFixed(3)}%`;
    }
  }
}

// --------------------------------------------------------------------------- //
// sanity measurement
// --------------------------------------------------------------------------- //

/** Flags a banner whose text does not fit its own box. Used to keep broken ones out of the way. */
/** The whole fit pass, from the stylesheet's sizes. */
export function refit(bn) {
  clearFit(bn);
  fitType(bn);
  fitCopy(bn);
  fitType(bn);
  dodgeCopy(bn);
}

/**
 * Resolve once the banner is laid out the way a viewer sees it: webfont loaded, fit applied,
 * decorations dodged. Every caller that is about to measure or animate a banner awaits this,
 * because everything downstream reads the geometry this produces.
 */
export function settle(bn) {
  return document.fonts.ready.then(() => new Promise((resolve) => {
    requestAnimationFrame(() => { refit(bn); resolve(bn); });
  }));
}

export function measure(bn) {
  refit(bn); // measure the settled state, not the state before the first fit pass
  const flags = [];
  // copy and product fighting for the same pixels is the single most common defect.
  // The composited layouts put the photo under the copy on purpose, so they are exempt.
  const composite = ["fullBleed", "cornerScrim", "productBehind"].some((l) => bn.classList.contains(`bn--lay-${l}`));
  const copyBox = bn.querySelector(".bn__copy")?.getBoundingClientRect();
  const mediaBox = bn.querySelector(".bn__media")?.getBoundingClientRect();
  if (!composite && copyBox && mediaBox) {
    const overlap = Math.max(0, Math.min(copyBox.right, mediaBox.right) - Math.max(copyBox.left, mediaBox.left)) *
                    Math.max(0, Math.min(copyBox.bottom, mediaBox.bottom) - Math.max(copyBox.top, mediaBox.top));
    if (overlap > copyBox.width * copyBox.height * 0.12) flags.push("collide");
  }
  const copyW = copyContentWidth(bn.querySelector(".bn__copy"));
  for (const n of bn.querySelectorAll(".bn__line, .bn__kicker, .bn__sub, .bn__cta, .bn__badge")) {
    const limit = n.closest(".bn__copy") ? copyW : bn.clientWidth * 0.9;
    if (limit && n.scrollWidth > limit + 2) flags.push("overflow");
  }
  for (const n of bn.querySelectorAll(".bn__copy > *")) {
    if (!n.getClientRects().length) continue; // cta:none and friends are display:none
    const r = n.getBoundingClientRect();
    const b = bn.getBoundingClientRect();
    const pad = b.width * 0.05;
    if (r.left < b.left + pad * 0.4 || r.right > b.right - pad * 0.4 || r.top < b.top || r.bottom > b.bottom) flags.push("safe");
  }
  return [...new Set(flags)];
}
