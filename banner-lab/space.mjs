/*
 * space.mjs — the design space: every axis value, and nothing that touches the filesystem.
 *
 * Split out of gen.mjs so the renderer can import the same constants the sampler used. If
 * these two ever disagreed, a banner would render as something other than what was sampled.
 */

// --------------------------------------------------------------------------- //
// axes
// --------------------------------------------------------------------------- //

// --------------------------------------------------------------------------- //

// Landscape 1080p only. Every banner is authored at exactly the size it will ship at, so
// the composition is judged at the real aspect ratio rather than at a preview scale.
export const WIDTH = 1920;
export const HEIGHT = 1080;

/**
 * KoKitchen tokens. Every colour below is one of these seven or a step of one, so the whole
 * deck stays inside the brand even when it is loud.
 */
export const KK = {
  olive: "#282F23", ink: "#1D231A", green: "#5F6F52", sage: "#B5BEA0",
  cream: "#FEFAE0", orange: "#FF7D00", odeep: "#C2410C", white: "#FFFFFF",
};

/**
 * A palette is not "a background" any more: it is the three colours that slide behind the
 * banner, the panel the copy sits on, and the text colours on that panel. `slide` is ordered
 * brightest-first where it matters, because the audit checks the panel against both ends.
 *
 * Contrast rules the palettes are built to, all computed with the WCAG formula:
 *   ink / muted / accent / accent2 on panel >= 4.5   onAccent on accent >= 4.5
 */
export const PALETTES = {
  // ---- dark grounds: a near-black or olive panel, cream or white type -------
  olive:   { mode: "dark",  panel: "#1D231A", ink: "#FEFAE0", accent: "#FF7D00", accent2: "#B5BEA0", muted: "#B5BEA0", onAccent: "#1D231A", slide: ["#282F23", "#5F6F52", "#282F23"] },
  ink:     { mode: "dark",  panel: "#0F130D", ink: "#FFFFFF", accent: "#FF7D00", accent2: "#B5BEA0", muted: "#B5BEA0", onAccent: "#1D231A", slide: ["#1D231A", "#3A4433", "#1D231A"] },
  green:   { mode: "dark",  panel: "#282F23", ink: "#FEFAE0", accent: "#FF7D00", accent2: "#B5BEA0", muted: "#B5BEA0", onAccent: "#1D231A", slide: ["#5F6F52", "#282F23", "#5F6F52"] },
  ember:   { mode: "dark",  panel: "#1D231A", ink: "#FEFAE0", accent: "#FF7D00", accent2: "#C2410C", muted: "#B5BEA0", onAccent: "#1D231A", slide: ["#C2410C", "#FF7D00", "#1D231A"] },
  citrus:  { mode: "dark",  panel: "#1D231A", ink: "#FEFAE0", accent: "#FF7D00", accent2: "#B5BEA0", muted: "#B5BEA0", onAccent: "#1D231A", slide: ["#FF7D00", "#FEFAE0", "#FF7D00"] },
  clay:    { mode: "dark",  panel: "#0F130D", ink: "#FEFAE0", accent: "#FF7D00", accent2: "#B5BEA0", muted: "#B5BEA0", onAccent: "#1D231A", slide: ["#C2410C", "#282F23", "#FF7D00"] },
  moss:    { mode: "dark",  panel: "#1D231A", ink: "#FEFAE0", accent: "#B5BEA0", accent2: "#FF7D00", muted: "#B5BEA0", onAccent: "#1D231A", slide: ["#5F6F52", "#B5BEA0", "#282F23"] },
  noir:    { mode: "dark",  panel: "#0F130D", ink: "#FFFFFF", accent: "#FF7D00", accent2: "#B5BEA0", muted: "#B5BEA0", onAccent: "#1D231A", slide: ["#1D231A", "#1D231A", "#3A4433"] },
  char:    { mode: "dark",  panel: "#1D231A", ink: "#FEFAE0", accent: "#FEFAE0", accent2: "#FF7D00", muted: "#B5BEA0", onAccent: "#1D231A", slide: ["#3A4433", "#1D231A", "#C2410C"] },
  sunbeam: { mode: "dark",  panel: "#282F23", ink: "#FEFAE0", accent: "#FF7D00", accent2: "#B5BEA0", muted: "#B5BEA0", onAccent: "#1D231A", slide: ["#FF7D00", "#B5BEA0", "#FF7D00"] },
  // ---- light grounds: a cream, white or sage panel, dark type --------------
  cream:   { mode: "light", panel: "#FFFFFF", ink: "#1D231A", accent: "#C2410C", accent2: "#5F6F52", muted: "#5F6F52", onAccent: "#FEFAE0", slide: ["#FEFAE0", "#B5BEA0", "#FEFAE0"] },
  sage:    { mode: "light", panel: "#FEFAE0", ink: "#282F23", accent: "#5F6F52", accent2: "#C2410C", muted: "#5F6F52", onAccent: "#FEFAE0", slide: ["#B5BEA0", "#5F6F52", "#B5BEA0"] },
  paper:   { mode: "light", panel: "#FEFAE0", ink: "#282F23", accent: "#C2410C", accent2: "#5F6F52", muted: "#5F6F52", onAccent: "#FEFAE0", slide: ["#FFFFFF", "#FEFAE0", "#B5BEA0"] },
  linen:   { mode: "light", panel: "#FFFFFF", ink: "#1D231A", accent: "#1D231A", accent2: "#C2410C", muted: "#5F6F52", onAccent: "#FEFAE0", slide: ["#FEFAE0", "#FFFFFF", "#FF7D00"] },
  grove:   { mode: "light", panel: "#B5BEA0", ink: "#1D231A", accent: "#282F23", accent2: "#5F6F52", muted: "#282F23", onAccent: "#FEFAE0", slide: ["#B5BEA0", "#FEFAE0", "#5F6F52"] },
  rust:    { mode: "light", panel: "#FEFAE0", ink: "#1D231A", accent: "#C2410C", accent2: "#5F6F52", muted: "#5F6F52", onAccent: "#FEFAE0", slide: ["#FF7D00", "#FEFAE0", "#C2410C"] },
};

export const LAYOUTS = ["productLeft", "productRight", "centerStack", "productBehind", "bottomBand", "diagonalSplit", "circleMask", "fullBleed", "cornerScrim", "topBanner"];
/**
 * Every background is the same idea — three oversized gradient sheets sliding past each
 * other — so the axis is how loud it is, not whether it moves.
 *
 * `dur` values must divide half the loop (6 s): an `alternate` animation returns to its
 * start after 2 x duration, so 1/2/3/6 s are the only speeds that close the 12 s loop.
 */
export const BACKGROUNDS = ["triSlide", "duoSlide", "quadSlide", "softSlide", "boldSlide", "blendSlide", "raySlide", "stripeSlide", "dotSlide", "meshSlide"];

export const BG_RECIPES = {
  triSlide:    { layers: 3, angle: -60, opacity: 0.50, dur: [3, 6, 2] },
  duoSlide:    { layers: 2, angle: -60, opacity: 0.64, dur: [4, 3] },
  quadSlide:   { layers: 4, angle: -45, opacity: 0.40, dur: [3, 4, 6, 2] },
  softSlide:   { layers: 3, angle: -60, opacity: 0.24, dur: [6, 4, 3] },
  boldSlide:   { layers: 2, angle: -60, opacity: 0.96, dur: [3, 6] },
  blendSlide:  { layers: 3, angle: -75, opacity: 0.62, dur: [4, 6, 3], blend: "overlay" },
  raySlide:    { layers: 3, angle: -60, opacity: 0.50, dur: [3, 6, 2], kind: "rays" },
  stripeSlide: { layers: 3, angle: -60, opacity: 0.50, dur: [3, 6, 2], kind: "stripes" },
  dotSlide:    { layers: 3, angle: -60, opacity: 0.50, dur: [3, 6, 2], kind: "dots" },
  meshSlide:   { layers: 3, angle: -60, opacity: 0.50, dur: [3, 6, 2], kind: "mesh" },
};
export const TYPES = ["whiteCaps", "twoTone", "outline", "ribbonKicker", "boxed", "mixedBox", "stacked", "shadowPop", "editorial", "ticket"];
export const BADGES = ["starburst", "circle", "ribbon", "pill", "corner", "seal", "none"];
export const CTAS = ["pill", "ribbon", "chipArrow", "boxed", "underline", "badgeSquare", "none"];
export const PRODUCTS = ["cutoutFloat", "framed", "circleMask", "tiltedCard", "bottomCrop", "polaroid", "arch"];
export const DECOR = ["none", "splash", "flames", "rings", "confetti", "leaves", "sparkles", "streaks", "bubbles", "doodles"];

/**
 * The loop is one story: the elements slam in, breathe while you read them, then get thrown
 * off the screen. `in` and `out` are directions and modifiers; `idle` is the breathing.
 * Travel is computed at runtime from the element's own box, so "left" always means fully
 * off the canvas, whatever the layout put there.
 */
export const MOTIONS = [
  "slamLeft", "slamRight", "slamTop", "slamBottom", "slamScale",
  "spinSlam", "flipSlam", "dropSlam", "riseSlam", "zoomSlam",
  "tiltSlam", "swingSlam", "orbitSlam", "wipeSlam", "maskSlam",
  "blurSlam", "cascade", "elasticPop",
];

export const MOTION_SPEC = {
  slamLeft:    { in: { dir: "left",  rot: -7, scale: 1.08 }, idle: "floatY", out: { dir: "left",  rot: 9,  scale: 0.92 } },
  slamRight:   { in: { dir: "right", rot: 7,  scale: 1.08 }, idle: "floatY", out: { dir: "right", rot: -9, scale: 0.92 } },
  slamTop:     { in: { dir: "top",   rot: -4, scale: 1.05 }, idle: "sway",   out: { dir: "top",   rot: 5,  scale: 0.95 } },
  slamBottom:  { in: { dir: "bottom",rot: 4,  scale: 1.05 }, idle: "sway",   out: { dir: "bottom",rot: -5, scale: 0.95 } },
  slamScale:   { in: { dir: "none",  scale: 2.1, rot: -3 },  idle: "breathe",out: { dir: "none",  scale: 0.1, rot: 4 } },
  spinSlam:    { in: { dir: "left",  rot: -150, scale: 0.4 }, idle: "floatY", out: { dir: "right", rot: 120, scale: 0.5 } },
  flipSlam:    { in: { dir: "top",   rot: 90,  scale: 0.7 }, idle: "sway",   out: { dir: "bottom", rot: -80, scale: 0.6 } },
  dropSlam:    { in: { dir: "top",   rot: -2, scale: 1.3 },  idle: "bob",    out: { dir: "bottom", rot: 2,  scale: 0.8 } },
  riseSlam:    { in: { dir: "bottom", rot: 2, scale: 1.3 },  idle: "bob",    out: { dir: "top",   rot: -2, scale: 0.8 } },
  zoomSlam:    { in: { dir: "none",  scale: 0.15, rot: 12 }, idle: "breathe",out: { dir: "none",  scale: 2.4, rot: -8 } },
  tiltSlam:    { in: { dir: "left",  rot: -28, scale: 1.1 }, idle: "sway",   out: { dir: "bottom", rot: 22, scale: 0.9 } },
  swingSlam:   { in: { dir: "top",   rot: -55, scale: 1.0 }, idle: "pendulum",out: { dir: "right", rot: 45, scale: 0.9 } },
  orbitSlam:   { in: { dir: "right", rot: 60, scale: 0.5 },  idle: "drift",  out: { dir: "left",  rot: -60, scale: 0.5 } },
  wipeSlam:    { in: { dir: "left",  clip: true, scale: 1 }, idle: "floatY", out: { dir: "right", clip: true, scale: 1 } },
  maskSlam:    { in: { dir: "bottom", clip: true, scale: 1 },idle: "floatY", out: { dir: "top",   clip: true, scale: 1 } },
  blurSlam:    { in: { dir: "left",  blur: 26, scale: 1.2 }, idle: "drift",  out: { dir: "right", blur: 22, scale: 1.15 } },
  cascade:     { in: { dir: "top",   rot: -12, scale: 0.86 },idle: "wave",   out: { dir: "bottom", rot: 14, scale: 0.86 } },
  elasticPop:  { in: { dir: "none",  scale: 0.05, rot: -18 },idle: "breathe",out: { dir: "none",  scale: 0.05, rot: 18 } },
};

export const COPY = [
  { key: "burger",    kicker: "EXCLUSIVE",  lines: ["LAYERS OF", "DELICIOUS"], sub: "UNEXPECTED FLAVOR", cta: "ORDER NOW",     badge: "TASTY BURGER" },
  { key: "menu",      kicker: "SUPER",      lines: ["DELICIOUS", "FOOD MENU"],  sub: "TODAY'S BEST DEAL", cta: "ORDER NOW",     badge: "24/7 DELIVERY" },
  { key: "fresh",     kicker: "NEW",        lines: ["FRESH FROM", "THE OVEN"],  sub: "MADE THIS MORNING", cta: "SEE THE MENU",  badge: "HOT & FRESH" },
  { key: "deal",      kicker: "TODAY ONLY", lines: ["BIG TASTE", "SMALL PRICE"],sub: "COME HUNGRY",       cta: "GRAB IT",       badge: "SPECIAL" },
  { key: "spicy",     kicker: "WARNING",    lines: ["SERIOUSLY", "SPICY"],      sub: "FOR THE BRAVE",     cta: "TRY IT",        badge: "HOT HOT" },
  { key: "veggie",    kicker: "PLANT BASED",lines: ["GREEN &", "GORGEOUS"],     sub: "FRESH EVERY DAY",   cta: "TASTE IT",      badge: "VEGGIE" },
  { key: "coffee",    kicker: "BREWED",     lines: ["WAKE UP", "WITH US"],      sub: "FRESH ROAST DAILY", cta: "ORDER AHEAD",   badge: "OPEN 7AM" },
  { key: "sweet",     kicker: "DESSERT",    lines: ["TOO GOOD", "TO SHARE"],    sub: "SWEET OBSESSION",   cta: "INDULGE",       badge: "SWEET" },
  { key: "pizza",     kicker: "STONE BAKED",lines: ["ONE MORE", "SLICE"],       sub: "STRAIGHT FROM THE OVEN", cta: "ORDER NOW", badge: "HOT" },
  { key: "breakfast", kicker: "GOOD MORNING",lines:["START YOUR", "DAY RIGHT"], sub: "SERVED FROM 7AM",   cta: "FIND US",       badge: "BREAKFAST" },
  { key: "lunch",     kicker: "LUNCH",      lines: ["READY IN", "FIVE"],        sub: "NO WAITING AROUND", cta: "ORDER NOW",     badge: "12–3 PM" },
  { key: "family",    kicker: "FOR EVERYONE",lines:["MADE TO", "SHARE"],        sub: "BIG TABLE ENERGY",  cta: "BOOK A TABLE",  badge: "FAMILY SIZE" },
  { key: "local",     kicker: "LOCAL",      lines: ["FROM THE", "NEIGHBOURHOOD"],sub:"SUPPORT LOCAL",     cta: "VISIT US",      badge: "OUR STREET" },
  { key: "chef",      kicker: "CHEF'S PICK",lines: ["OUR BEST", "SELLER"],      sub: "YOU ASKED FOR IT",  cta: "TRY IT TODAY",  badge: "TOP PICK" },
];

/**
 * Which photo subjects each copy block can honestly sit next to. A "VEGGIE" headline over
 * croissants is not a design experiment, it is a mistake, so the sampler pairs them.
 * Copy keys absent here take any photo.
 */
export const COPY_CATS = {
  burger:    ["burger", "cheeseburger", "barbecue", "steak", "sandwich"],
  fresh:     ["croissant", "salad bowl", "fruit", "smoothie bowl", "breakfast", "seafood"],
  spicy:     ["curry", "ramen", "noodles", "tacos", "fried chicken"],
  veggie:    ["salad bowl", "soup", "smoothie bowl", "fruit", "pasta"],
  coffee:    ["coffee latte", "breakfast", "croissant", "chocolate cake", "dessert"],
  sweet:     ["chocolate cake", "dessert", "doughnut", "ice cream", "croissant"],
  pizza:     ["pizza", "pasta", "sandwich"],
  breakfast: ["breakfast", "croissant", "doughnut", "coffee latte", "smoothie bowl"],
  lunch:     ["sandwich", "tacos", "soup", "noodles", "sushi", "pizza", "pasta"],
  family:    ["pizza", "pasta", "barbecue", "sushi", "noodles", "tacos", "seafood"],
  chef:      ["steak", "seafood", "sushi", "dumplings", "ramen"],
};
/** Layouts where the photo fills the whole canvas, so it cannot also be a framed object. */
export const FULL_CANVAS_LAYOUTS = new Set(["fullBleed", "cornerScrim"]);

/** Treatments that only look right with a real alpha cutout. */
export const NEEDS_CUTOUT = new Set(["cutoutFloat", "arch"]);

// --------------------------------------------------------------------------- //
// time
// --------------------------------------------------------------------------- //

/**
 * The five Phases of the loop, in seconds. This is the single source of truth: the GSAP
 * timeline in lab.js and the background-energy keyframes in lab.css are both derived from
 * these numbers, so a curve cannot drift away from the timeline it is meant to follow.
 *
 * The boundaries are design intent, not arithmetic. A Scene whose cast is small finishes
 * entering before the Reveal boundary and one with a big cast finishes just after it; the
 * background is allowed to be calm either way.
 */
export const PHASES = {
  intro:  [0, 1.5],     // the background has the stage to itself
  reveal: [1.5, 3.5],   // the panel wipes in and the elements enter
  hold:   [3.5, 9.5],   // settled and readable - the Settled Composition
  exit:   [9.5, 11.0],  // the elements are thrown back off the canvas
  tail:   [11.0, 12.0], // the background alone again, which is what the loop opens on
};

// --------------------------------------------------------------------------- //
// how the scene moves, and how hard the background pushes
// --------------------------------------------------------------------------- //

/**
 * How far the background travels during each Phase, as a fraction of the travel it would make
 * at full energy. The sheets always slide; this only decides how far. A quiet Hold is the
 * point - the copy should not have to fight its own background for six seconds.
 *
 * A curve is a list of [seconds, energy] stops, linearly joined, and it is driven by the same
 * GSAP timeline as the elements. That matters: a curve on the CSS clock could not be frozen
 * with `seek(t)`, so every contact sheet and motion strip would show whatever energy the wall
 * clock happened to be at rather than the energy of the Phase it was illustrating.
 *
 * `flat` is the control - no curve, full travel for the whole loop, which is what v2 shipped.
 */
const at = (phase, i) => PHASES[phase][i];
export const BG_ENERGY_CURVES = {
  flat: null,
  /* loud at the edges, quiet while you read */
  swell: [
    [0, 1], [at("reveal", 0), .78], [at("reveal", 1), .22],
    [at("exit", 0), .22], [at("exit", 1), 1], [at("tail", 1), 1],
  ],
  /* the same shape pushed much further: how quiet can the Hold get before the board dies? */
  swellHard: [
    [0, 1], [at("reveal", 0), .55], [at("reveal", 1), .07],
    [at("exit", 0), .07], [at("exit", 1), 1], [at("tail", 1), 1],
  ],
  /* two calm windows instead of one plateau */
  breathe: [
    [0, 1], [at("reveal", 0), .68], [at("reveal", 1), .28],
    [6.0, .78], [at("exit", 0), .28], [at("exit", 1), 1], [at("tail", 1), 1],
  ],
};
export const BG_ENERGY = Object.keys(BG_ENERGY_CURVES);

/** The parts of a Scene that can take their own share of the motion. Reading order. */
export const ROLES = ["copy", "media", "badge", "decor"];

/**
 * How much of the Scene's Motion family each Role takes. The family is decided once per Scene
 * so the board reads as a single gesture; this decides who carries it and who stays quiet.
 * `idle` scales the breathing for every Role at once.
 *
 * `uniform` is the control: every Role takes the family whole, which is what v2 shipped.
 */
export const ROLE_MOTION = {
  uniform:     { copy: 1.00, media: 1.00, badge: 1.00, decor: 1.00, idle: 1.00 },
  hierarchy:   { copy: 0.72, media: 1.05, badge: 1.30, decor: 1.40, idle: 1.00 },
  textLead:    { copy: 1.25, media: 0.85, badge: 0.95, decor: 0.70, idle: 0.90 },
  productLead: { copy: 0.62, media: 1.35, badge: 1.10, decor: 0.88, idle: 1.00 },
  hush:        { copy: 0.55, media: 0.80, badge: 1.10, decor: 1.15, idle: 0.40 },
};

/**
 * Every field a Banner carries, in display order. One list, imported by the build summary,
 * the gallery's filters and the analysis, so an axis can never show up in one and be missing
 * from another.
 */
export const AXES = [
  "paletteName", "layout", "bg", "bgEnergy", "type", "badge", "cta",
  "product", "decor", "motion", "roleMotion", "copy", "photo",
];
