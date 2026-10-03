/** Measures every banner in banners.json and reports how many carry a defect flag. */
import puppeteer from "puppeteer-core";
const inst = await puppeteer.launch({ executablePath: process.env.HOME + "/.cache/ms-playwright/chromium-1234/chrome-linux/chrome", headless: true, args: ["--no-sandbox","--disable-gpu"] });
const page = await inst.newPage();
await page.setViewport({ width: 1920, height: 1080 });
await page.goto("http://127.0.0.1:7788/audit.html", { waitUntil: "networkidle0", timeout: 120000 });
await page.waitForFunction("window.__ready === true", { timeout: 180000 });
console.log(await page.evaluate(() => window.__report));
await inst.close();
