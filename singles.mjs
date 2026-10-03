/** Renders a few banners at full size so the type and spacing can be judged at 100%. */
import { existsSync, mkdirSync } from "node:fs";
const ids = process.argv.slice(2);
import puppeteer from "puppeteer-core";
const browser = process.env.HOME + "/.cache/ms-playwright/chromium-1234/chrome-linux/chrome";
mkdirSync("shots", { recursive: true });
const inst = await puppeteer.launch({ executablePath: browser, headless: true, args: ["--no-sandbox","--disable-gpu","--allow-file-access-from-files"], protocolTimeout: 120000 });
const page = await inst.newPage();
await page.setViewport({ width: 1920, height: 1080 });
for (const id of ids) {
  await page.goto(`http://127.0.0.1:7788/one.html?id=${id}`, { waitUntil: "networkidle0", timeout: 60000 });
  await page.waitForFunction("window.__ready === true || window.__error", { timeout: 60000 });
  const err = await page.evaluate(() => window.__error || null);
  if (err) throw new Error(`${id} failed: ${err}`);
  await page.screenshot({ path: `shots/${id}.png` });
  console.log(`shots/${id}.png`);
}
await inst.close();
