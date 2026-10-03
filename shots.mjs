/**
 * shots.mjs — screenshot the lab with Puppeteer.
 *
 *   node shots.mjs gallery [--out shots/gallery.png]
 *   node shots.mjs sheet   [--from 0 --to 24 --cols 4 --freeze 1.4 --out shots/sheet-0.png]
 *   node shots.mjs axis    --axis layout --value productLeft --out shots/axis-layout.png
 *   node shots.mjs strip   --id s1-b0001 --n 12 --cols 4 --out shots/strip.png
 *
 * Uses the same Chromium the shipping pipeline uses, so what is captured here is what the
 * video pipeline will render.
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (n, d) => (argv.indexOf(`--${n}`) >= 0 ? argv[argv.indexOf(`--${n}`) + 1] : d);
const mode = argv[0] || "gallery";

function resolveBrowser() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    path.join(process.env.HOME || "", ".cache/ms-playwright/chromium-1234/chrome-linux/chrome"),
  ];
  for (const c of candidates) if (c && existsSync(c)) return c;
  const dir = path.join(process.env.HOME || "", ".cache/ms-playwright");
  if (existsSync(dir)) {
    for (const entry of require("node:fs").readdirSync(dir)) {
      const p = path.join(dir, entry, "chrome-linux", "chrome");
      if (existsSync(p)) return p;
    }
  }
  return null;
}

const browser = resolveBrowser();
if (!browser) throw new Error("no Chromium found; set PUPPETEER_EXECUTABLE_PATH");

const puppeteer = (await import("puppeteer-core")).default;
const out = arg("out", path.join(HERE, "shots", `${mode}.png`));
mkdirSync(path.dirname(out), { recursive: true });

const instance = await puppeteer.launch({
  executablePath: browser,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--hide-scrollbars", "--force-color-profile=srgb", "--allow-file-access-from-files"],
  protocolTimeout: 300000,
});
try {
  const page = await instance.newPage();
  const page_ = { gallery: "gallery.html", strip: "strip.html" }[mode] || "sheet.html";
  const url = new URL(`http://127.0.0.1:${arg("port", 7788)}/${page_}`);
  for (const k of ["from", "to", "cols", "freeze", "axis", "value", "hideflags", "id", "n", "ids"]) {
    if (argv.includes(`--${k}`)) url.searchParams.set(k, arg(k, ""));
  }
  await page.setViewport({ width: Number(arg("vw", 1600)), height: Number(arg("vh", 1000)), deviceScaleFactor: Number(arg("dpr", 1)) });
  await page.goto(url.toString(), { waitUntil: "networkidle0", timeout: 120000 });
  // the page reports its own failure; without this a broken module just times out
  await page.waitForFunction(
    "window.__ready === true || window.__error || document.querySelectorAll('.card').length > 0",
    { timeout: 120000 }
  );
  const err = await page.evaluate(() => window.__error || null);
  if (err) throw new Error(`${page_} failed: ${err}`);
  void 0;
  await new Promise((r) => setTimeout(r, Number(arg("settle", 1200))));
  await page.screenshot({ path: out, fullPage: argv.includes("--full") });
  const stats = await page.evaluate(() => ({
    cards: document.querySelectorAll(".card").length,
    cells: document.querySelectorAll(".cell").length,
    flagged: document.querySelectorAll(".card--flagged").length,
  }));
  console.log(`${out}  ${JSON.stringify(stats)}`);
} finally {
  await instance.close();
}
