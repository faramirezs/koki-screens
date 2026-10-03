/** End-to-end check of the gallery: mount, vote, and confirm the axes reach feedback.jsonl. */
import puppeteer from "puppeteer-core";
const inst = await puppeteer.launch({ executablePath: process.env.HOME + "/.cache/ms-playwright/chromium-1234/chrome-linux/chrome", headless: true, args: ["--no-sandbox","--disable-gpu"] });
const page = await inst.newPage();
page.on("pageerror", (e) => console.log("PAGEERROR", String(e).slice(0, 200)));
await page.setViewport({ width: 1500, height: 950 });
await page.goto("http://127.0.0.1:7788/", { waitUntil: "networkidle0", timeout: 60000 });
await page.waitForSelector(".card", { timeout: 30000 });
await new Promise((r) => setTimeout(r, 2500));
const mounted = await page.evaluate(() => ({
  cards: document.querySelectorAll(".card").length,
  banners: document.querySelectorAll(".card .bn").length,
  first: document.querySelector(".card code")?.textContent,
  count: document.querySelector("#count")?.textContent,
  more: document.querySelector("#more")?.textContent,
}));
console.log("mounted", JSON.stringify(mounted));
// vote "love" on the first card, and write a note on it
const before = await page.evaluate(() => document.querySelector(".card code").textContent);
await page.evaluate(() => document.querySelector("#more")?.click());
await new Promise((r) => setTimeout(r, 600));
console.log("after show more:", await page.evaluate(() => document.querySelectorAll(".card").length));
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
await inst.close();
