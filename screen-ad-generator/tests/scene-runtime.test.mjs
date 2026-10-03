import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { compileScene } from "../scripts/compile-scene.mjs";
import { resolveBrowser } from "../scripts/render-frames.mjs";

const SKILL = path.resolve(import.meta.dirname, "..");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

async function compileExample(outDir) {
  return compileScene({
    content: readJson(path.join(SKILL, "examples/ko-kitchen/content.json")),
    brand: readJson(path.join(SKILL, "examples/ko-kitchen/brand.json")),
    imageReport: null,
    tokensCss: readFileSync(path.join(SKILL, "out/ko-kitchen/work/tokens.css"), "utf8"),
    profile: readJson(path.join(SKILL, "profiles/landscape-1080p.json")),
    outDir,
    templatesRoot: path.join(SKILL, "templates"),
  });
}

const browserPath = resolveBrowser();

test("frame 0 shows the base scene only — the overlay is invisible", { skip: !browserPath }, async () => {
  const puppeteer = (await import("puppeteer-core")).default;
  const dir = mkdtempSync(path.join(tmpdir(), "adkit-runtime-"));
  const browser = await puppeteer.launch({ executablePath: browserPath, headless: true, args: ["--no-sandbox", "--disable-gpu", "--allow-file-access-from-files"], timeout: 120000 });
  try {
    await compileExample(dir);
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(`file://${path.join(dir, "scene.html")}`, { waitUntil: "load" });
    await page.waitForFunction("window.__timeline && window.__timeline.ok === true", { timeout: 30000 });

    const state = await page.evaluate(() => ({
      at0: window.__timeline.stateAt(0),
      atEnd: window.__timeline.stateAt(window.__timeline.duration),
      atMid: window.__timeline.stateAt(12.8),
    }));

    // The loop seam depends on this: at t=0 (and at t=duration) the overlay must be gone.
    // GSAP does not render a zero-duration .set() sitting exactly at the playhead on the
    // initial render, so the runtime applies the start state with gsap.set() as well.
    assert.equal(state.at0.promo.opacity, 0, "the promo overlay is visible at frame 0");
    assert.equal(state.at0.board.opacity, 1, "the base scene must be on screen at frame 0");
    assert.equal(state.at0[".promo-ribbon__headline"].opacity, 0, "an 'in' beat on the overlay is not at its start state at t=0");
    assert.equal(state.atEnd.promo.opacity, 0, "the promo overlay is still visible at t=duration");
    assert.ok(state.atMid.promo.opacity > 0.9, "the promo overlay should be fully visible mid-loop");
  } finally {
    await browser.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the legal strip renders markup as markup, not as visible tags", { skip: !browserPath }, async () => {
  const puppeteer = (await import("puppeteer-core")).default;
  const dir = mkdtempSync(path.join(tmpdir(), "adkit-runtime-"));
  const browser = await puppeteer.launch({ executablePath: browserPath, headless: true, args: ["--no-sandbox", "--disable-gpu", "--allow-file-access-from-files"], timeout: 120000 });
  try {
    await compileExample(dir);
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.goto(`file://${path.join(dir, "scene.html")}`, { waitUntil: "load" });
    const legal = await page.evaluate(() => {
      const strip = document.querySelector(".board__legal");
      return {
        text: strip.innerText,
        keys: strip.querySelectorAll(".legal-strip__key").length,
        seps: strip.querySelectorAll(".legal-strip__sep").length,
      };
    });
    assert.ok(!legal.text.includes("<span"), `raw HTML leaked into the legal strip: ${legal.text.slice(0, 120)}`);
    assert.ok(!legal.text.includes("class="), "raw attributes leaked into the legal strip");
    assert.ok(legal.keys >= 1, "the ALLERGENE key is not styled");
    assert.ok(legal.seps >= 1, "the separators are not styled");
    assert.ok(legal.text.includes("Preise inkl. MwSt."), "the VAT note is missing from the legal strip");
  } finally {
    await browser.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
