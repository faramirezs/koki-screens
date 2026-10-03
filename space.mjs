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
