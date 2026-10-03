import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { resolveBrowser } from "../scripts/render-frames.mjs";

const SKILL = path.resolve(import.meta.dirname, "..");
const VENDOR = path.join(SKILL, "vendor");

test("gsap.min.js is present, intact and the expected version", async () => {
  const file = path.join(VENDOR, "gsap.min.js");
  assert.ok(existsSync(file), "vendor/gsap.min.js is missing");
  const src = await readFile(file, "utf8");
  assert.ok(src.length > 40000, "gsap.min.js looks truncated");
  assert.ok(/GSAP 3\.15\.0/.test(src), "the GSAP banner does not report 3.15.0");
  assert.ok(!/<\/script/i.test(src), "the bundle contains a closing script tag — inlining it would break the scene");
});

test("all five Montserrat weights are present and are real woff2 files", async () => {
  const dir = path.join(VENDOR, "fonts");
  const files = (await readdir(dir)).filter((f) => f.endsWith(".woff2")).sort();
  assert.equal(files.length, 5, `expected 5 woff2 files, found ${files.length}`);
  for (const f of files) {
    const buf = await readFile(path.join(dir, f));
    assert.equal(buf.subarray(0, 4).toString("latin1"), "wOF2", `${f} is not a woff2 file`);
    assert.ok(buf.length > 8000 && buf.length < 60000, `${f} is ${buf.length} bytes`);
  }
});

test("fonts.css references only files that exist", async () => {
  const css = await readFile(path.join(VENDOR, "fonts.css"), "utf8");
  const refs = [...css.matchAll(/url\('([^']+)'\)/g)].map((m) => m[1]);
  assert.equal(refs.length, 5);
  for (const r of refs) assert.ok(existsSync(path.join(VENDOR, r)), `${r} is referenced but missing`);
});

test("the five weights render at distinct widths in Chromium", { skip: !resolveBrowser() }, async () => {
  const puppeteer = (await import("puppeteer-core")).default;
  const browser = await puppeteer.launch({ executablePath: resolveBrowser(), headless: true, args: ["--no-sandbox", "--disable-gpu"], timeout: 120000 });
  try {
    const page = await browser.newPage();
    const faces = (await readdir(path.join(VENDOR, "fonts")))
      .filter((f) => f.endsWith(".woff2"))
      .map((f) => ({ weight: f.match(/(\d{3})/)[1], b64: null }));
    const css = await readFile(path.join(VENDOR, "fonts.css"), "utf8");
    const inlined = [];
    for (const m of css.matchAll(/font-weight:\s*(\d+);[\s\S]*?url\('([^']+)'\)/g)) {
      const data = await readFile(path.join(VENDOR, m[2]));
      inlined.push(`@font-face{font-family:M;font-weight:${m[1]};font-display:block;src:url(data:font/woff2;base64,${data.toString("base64")}) format('woff2')}`);
    }
    const html = `<!doctype html><meta charset="utf-8"><style>${inlined.join("\n")}span{font-family:M;font-size:100px;display:inline-block;white-space:nowrap}</style>` +
      [400, 500, 600, 700, 800].map((w) => `<div><span id="w${w}" style="font-weight:${w}">Wochenkarte</span></div>`).join("");
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    const widths = await page.evaluate(() => [400, 500, 600, 700, 800].map((w) => document.getElementById("w" + w).getBoundingClientRect().width));
    for (let i = 1; i < widths.length; i++) {
      assert.ok(widths[i] > widths[i - 1], `weight ${[400, 500, 600, 700, 800][i]} is not wider than the previous one: ${JSON.stringify(widths)}`);
    }
    assert.ok(widths[0] > 400, `the font did not apply at all: ${JSON.stringify(widths)}`);
  } finally {
    await browser.close();
  }
});
