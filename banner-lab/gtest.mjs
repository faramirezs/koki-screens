/**
 * End-to-end check of the gallery: mount, switch Mode, vote, and confirm the axes and the Mode
 * reach feedback.jsonl.
 *
 * The axis assertion is the important one. A hand-written copy of the axis list in gallery.js once
 * silently dropped two axes from every card and every vote, and nothing failed: the vote was
 * still written, it was just missing fields. Asserting the shape is what makes that fail loudly.
 *
 *   node gtest.mjs   &&   rm -f feedback.jsonl
 */
import { readFileSync } from "node:fs";
import puppeteer from "puppeteer-core";
import { AXES, MODES, MODE_NAMES, variesIn } from "./space.mjs";

const inst = await puppeteer.launch({ executablePath: process.env.HOME + "/.cache/ms-playwright/chromium-1234/chrome-linux/chrome", headless: true, args: ["--no-sandbox", "--disable-gpu"] });
const page = await inst.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 200)));
await page.setViewport({ width: 1500, height: 950 });
await page.goto("http://127.0.0.1:7788/", { waitUntil: "networkidle0", timeout: 60000 });
await page.waitForSelector(".card", { timeout: 30000 });
await new Promise((r) => setTimeout(r, 2500));

const fail = [];
const check = (ok, msg) => { console.log(`${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) fail.push(msg); };

const mounted = await page.evaluate(() => ({
  cards: document.querySelectorAll(".card").length,
  banners: document.querySelectorAll(".card .bn").length,
  first: document.querySelector(".card code")?.textContent,
  count: document.querySelector("#count")?.textContent,
}));
console.log("mounted", JSON.stringify(mounted));
check(mounted.cards > 0 && mounted.banners > 0, "the grid mounts cards and banners");

/**
 * The first card's copy poses, keyed by class.
 *
 * Keyed, because the grid mounts and unmounts cards as you scroll: comparing the joined transforms
 * of "whatever the first card is" compares two different cards the moment one of them changes, and
 * reports that as motion. The id is checked alongside, so a comparison is about movement and not
 * about identity.
 */
const sample = () => page.evaluate(() => {
  const card = document.querySelector(".card");
  return {
    id: card.querySelector("code").textContent,
    poses: [...card.querySelectorAll(".bn__copy > *")].map((el) => `${el.className}=${getComputedStyle(el).transform}`).join(" | "),
  };
});

/** A Mode with no Timeline must not move the copy: same card, same poses, a second apart. */
async function assertStill(label) {
  const a = await sample();
  await new Promise((r) => setTimeout(r, 900));
  const b = await sample();
  check(a.id === b.id, `${label} keeps the same card mounted (${a.id})`);
  check(a.poses === b.poses, `${label} does not move the copy`);
}

// ---- the mode bar, and what each Mode does to the frame ----
const modeBar = await page.evaluate(() => [...document.querySelectorAll(".mode")].map((m) => m.dataset.mode));
check(JSON.stringify(modeBar) === JSON.stringify(MODE_NAMES), `the mode bar lists every Mode: ${modeBar.join(", ")}`);

async function enterMode(mode) {
  await page.evaluate((m) => [...document.querySelectorAll(".mode")].find((x) => x.dataset.mode === m).click(), mode);
  await page.waitForSelector(".card", { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 2500));
  return page.evaluate(() => {
    const stage = document.querySelector(".card .card__stage");
    const slides = [...stage.querySelectorAll(".bn__slide")];
    const copy = [...stage.querySelectorAll(".bn__copy > *")];
    return {
      active: document.querySelector(".mode.on")?.dataset.mode,
      filters: document.querySelectorAll("#filters select").length,
      paused: slides.length > 0 && slides.every((s) => s.getAnimations().every((a) => a.playState === "paused")),
      // Where a held sheet is held. `pause()` alone freezes wherever the wall clock happened to be
      // at mount time, which is a different point for every card.
      frozenAt: slides.length ? Math.max(...slides.flatMap((s) => s.getAnimations().map((a) => Math.round(a.currentTime ?? -1)))) : -1,
      copy: copy.map((el) => getComputedStyle(el).transform).join(" "),
    };
  });
}

// composition is a still: the sheets are held where they are, and nothing in the copy moves
const comp = await enterMode("composition");
check(comp.active === "composition", "composition mode is active and marked");
check(comp.filters === variesIn("composition").size, `composition offers only its own axes (${comp.filters} filters)`);
check(comp.paused, "composition holds the background sheets still");
check(comp.frozenAt === 0, `composition freezes the sheets at the start of their cycle (t=${comp.frozenAt}ms)`);
await assertStill("composition");

// background is not a still: the sheets run, and the copy still does not move
const bg = await enterMode("background");
check(bg.active === "background", "background mode is active and marked");
check(!bg.paused, "background lets the sheets run");
await assertStill("background");

/**
 * Background Mode varies `bgEnergy`, and `bgEnergy` is a curve on `--energy` driven by the
 * Timeline. Background Mode builds no cast Timeline, so while the energy curve lived inside that
 * Timeline all four values rendered identically and the Mode measured nothing at all: 40 Banners
 * were 10 backgrounds repeated four times. This is the check that was missing.
 */
const bgIds = {};
for (const b of JSON.parse(readFileSync("banners.json", "utf8"))) {
  if (b.mode === "background" && !bgIds[b.bgEnergy]) bgIds[b.bgEnergy] = b.id;
}
const energies = {};
for (const [curve, id] of Object.entries(bgIds)) {
  const p = await inst.newPage();
  await p.goto(`http://127.0.0.1:7788/one.html?id=${id}`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 500));
  energies[curve] = await p.evaluate(() => getComputedStyle(document.querySelector(".bn__bg")).getPropertyValue("--energy").trim());
  await p.close();
}
check(new Set(Object.values(energies)).size > 1, `background mode shows the bgEnergy curve, not one value four times (${JSON.stringify(energies)})`);
check(energies.flat === "1", `the curveless energy keeps full travel (flat=${energies.flat})`);

// motion moves the copy, and only its own two axes are on offer
const mo = await enterMode("motion");
check(mo.filters === variesIn("motion").size, `motion offers only its own axes (${mo.filters} filters)`);
let moved = false;
for (let i = 0; i < 12 && !moved; i++) {
  await new Promise((r) => setTimeout(r, 250));
  const now = await page.evaluate(() => [...document.querySelectorAll(".card .bn__copy > *")].map((el) => getComputedStyle(el).transform).join(" "));
  if (now !== mo.copy) moved = true;
}
check(moved, "motion moves the copy");

const sc = await enterMode("scene");
check(sc.filters === AXES.length, `scene offers every axis (${sc.filters} filters)`);

// ---- vote, in composition mode, and check what lands in feedback.jsonl ----
await enterMode("composition");
const before = await page.evaluate(() => document.querySelector(".card code").textContent);
await page.click(".card .card__verdicts button[data-verdict=love]");
await new Promise((r) => setTimeout(r, 400));
await page.type(".card .card__note", "warm palette, big type");
await page.evaluate(() => document.querySelector(".card .card__note").dispatchEvent(new Event("change")));
await new Promise((r) => setTimeout(r, 700));
const second = await page.evaluate(() => document.querySelectorAll(".card")[1]?.querySelector("code")?.textContent);
await page.evaluate((id) => {
  const card = [...document.querySelectorAll(".card")].find((c) => c.querySelector("code").textContent === id);
  card.querySelector("button[data-verdict=no]").click();
}, second);
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: "shots/gallery.png" });
console.log("voted on", before, "and", second);

const records = readFileSync("feedback.jsonl", "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const love = records.find((r) => r.id === before && r.verdict === "love");
check(!!love, `the vote for ${before} was written`);
if (love) {
  const keys = Object.keys(love.axes || {});
  check(AXES.every((a) => keys.includes(a)), "the vote carries every axis in AXES");
  check(keys.length === AXES.length, `the vote carries no extra axes (${keys.length} of ${AXES.length})`);
  check(AXES.every((a) => love.axes[a] !== undefined), "no axis in the vote is undefined");
  check(love.mode === "composition", `the vote records the Mode it was cast in (${love.mode})`);
  check(MODES[love.mode] && variesIn(love.mode).size < AXES.length, "a vote in a Mode is a vote about that Mode's axes");
}
check(records.some((r) => r.id === second && r.verdict === "no"), "the second vote was written");

await inst.close();
if (fail.length) { console.log(`\n${fail.length} FAILED`); process.exit(1); }
console.log("\nall gallery checks passed");
