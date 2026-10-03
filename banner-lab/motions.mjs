/**
 * motions.mjs — check every motion in the lab.
 *
 *   node motions.mjs [--out shots/motion.png]
 *
 * A signage banner loops forever, so the state at the end of the timeline has to equal the
 * state at the start or the loop jumps. This asserts three things per motion: it builds, it
 * has a real duration, and its last frame matches its first frame.
 */
import puppeteer from "puppeteer-core";

const browser = process.env.HOME + "/.cache/ms-playwright/chromium-1234/chrome-linux/chrome";
const inst = await puppeteer.launch({
  executablePath: browser,
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--allow-file-access-from-files"],
  protocolTimeout: 120000,
});
const page = await inst.newPage();
await page.setViewport({ width: 1920, height: 1080 });
await page.goto("http://127.0.0.1:7788/motions.html", { waitUntil: "networkidle0", timeout: 120000 });
await page.waitForFunction("window.__ready === true", { timeout: 180000 });
const report = await page.evaluate(() => window.__report);
console.log(report.text);
await inst.close();
process.exit(report.failures ? 1 : 0);
