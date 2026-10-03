#!/usr/bin/env node
/**
 * render-frames.mjs — deterministic frame capture.
 *
 *   node scripts/render-frames.mjs --scene work/x/scene/scene.html --out work/x/frames \
 *        [--fps 25] [--duration 15] [--width 1920] [--height 1080] [--seam-frame]
 *
 * How: the GSAP timeline is built paused, then for every frame n the page is asked to
 * `seek(n / fps)` and a screenshot is taken. Nothing depends on wall-clock time, so a
 * 2-vCPU box and a 32-core box produce the same bytes. MediaRecorder is deliberately
 * not used: it drops frames under load and its output is not reproducible.
 *
 * Also writes `checks.json` next to the frames: text overflow, safe-area violations,
 * type-size floor and the effective contrast of every text leaf.
 *
 * Exit codes: 0 ok, 2 no browser found, 4 the scene or the timeline did not load,
 *             6 a hard screen rule was violated (see --allow-violations).
 */
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer-core";
import { EXIT, log, parseArgs, requireFlags } from "./lib/util.mjs";

/** Find a Chromium. Explicit env wins, then the Playwright cache, then the system. */
export function resolveBrowser() {
  const candidates = [];
  if (process.env.PUPPETEER_EXECUTABLE_PATH) candidates.push(process.env.PUPPETEER_EXECUTABLE_PATH);
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = path.join(os.homedir(), ".cache", "ms-playwright");
  if (existsSync(cache)) {
    for (const dir of readdirSync(cache).filter((d) => d.startsWith("chromium-"))) {
      candidates.push(path.join(cache, dir, "chrome-linux", "chrome"));
      candidates.push(path.join(cache, dir, "chrome-linux", "headless_shell"));
    }
  }
  candidates.push("/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/snap/bin/chromium");
  for (const c of candidates) if (c && existsSync(c)) return c;
  return null;
}

/** The in-page audit: overflow, safe area, type floor, effective contrast. */
const AUDIT_SRC = `(() => {
  const MIN_PX = __MIN_PX__;
  const stage = document.getElementById('stage').getBoundingClientRect();
  const safe = __SAFE_PCT__ * Math.min(stage.width, stage.height);
  const describe = (el) => {
    const cls = (el.className && String(el.className).trim().split(/\\s+/).filter(c => c && !c.startsWith('theme-')).slice(0, 2).join('.')) || '';
    return el.tagName.toLowerCase() + (cls ? '.' + cls : '');
  };
  const opaqueBg = (el) => {
    let cur = el;
    while (cur && cur !== document.documentElement) {
      const cs = getComputedStyle(cur);
      const bg = cs.backgroundColor;
      const m = bg.match(/rgba?\\(([^)]+)\\)/);
      if (m) {
        const parts = m[1].split(',').map(s => parseFloat(s));
        if (parts.length < 4 || parts[3] > 0.85) return { color: bg, from: describe(cur), image: cs.backgroundImage !== 'none' };
      }
      if (cs.backgroundImage !== 'none') return { color: 'rgba(0,0,0,0)', from: describe(cur), image: true };
      cur = cur.parentElement;
    }
    return null;
  };
  const parse = (c) => { const m = String(c).match(/rgba?\\(([^)]+)\\)/); return m ? m[1].split(',').map(parseFloat) : null; };
  const lum = (rgb) => { const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); }; return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]); };
  const ratio = (a, b) => { const la = lum(a), lb = lum(b); const hi = Math.max(la, lb), lo = Math.min(la, lb); return (hi + 0.05) / (lo + 0.05); };

  // Text overflow. \`scrollHeight > clientHeight\` alone is not a clipping test: a tight
  // line-height (line-height:1 on a display heading) makes the font's ink box taller than
  // the line box, so the heuristic fires on every heading even though nothing is hidden.
  // Report only real clipping:
  //   A) the element clips its own content (overflow != visible) and the content is bigger
  //   B) a line box escapes the nearest clipping ancestor
  const clipsOwn = (el) => { const s = getComputedStyle(el); return s.overflowX !== 'visible' || s.overflowY !== 'visible'; };
  const clippingAncestor = (el) => {
    let n = el;
    while (n && n !== document.documentElement) { if (clipsOwn(n)) return n; n = n.parentElement; }
    return null;
  };
  const lineBoxes = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()];
    return rects.length ? rects : [el.getBoundingClientRect()];
  };
  // Montserrat's font box is 1.22em; a smaller line box is a typographic risk (ink can
  // collide with the next line), not a clipping error, so it is reported as a warning.
  const inkRatio = (el) => {
    const cs = getComputedStyle(el);
    const lh = cs.lineHeight === 'normal' ? parseFloat(cs.fontSize) * 1.22 : parseFloat(cs.lineHeight);
    return parseFloat(cs.fontSize) ? lh / parseFloat(cs.fontSize) : 1;
  };

  const report = { time: null, overflow: [], tightLeading: [], safeArea: [], typeFloor: [], contrast: [], overPhoto: [] };
  for (const el of document.querySelectorAll('.stage *')) {
    if (el.children.length > 0) continue;
    const text = (el.textContent || '').trim();
    if (!text) continue;
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true })) continue;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const fs = parseFloat(cs.fontSize);
    const name = describe(el);
    if (fs < MIN_PX) report.typeFloor.push({ el: name, px: fs, text: text.slice(0, 40) });

    if (clipsOwn(el)) {
      if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) {
        report.overflow.push({ el: name, how: 'clipped by itself', scrollW: el.scrollWidth, clientW: el.clientWidth, scrollH: el.scrollHeight, clientH: el.clientHeight, text: text.slice(0, 40) });
      }
    } else {
      const clipper = clippingAncestor(el);
      if (clipper) {
        const c = clipper.getBoundingClientRect();
        for (const box of lineBoxes(el)) {
          const out = Math.max(c.left - box.left, c.top - box.top, box.right - c.right, box.bottom - c.bottom);
          if (out > 1) {
            report.overflow.push({ el: name, how: 'escapes ' + describe(clipper), scrollW: Math.round(box.width), clientW: Math.round(c.width), scrollH: Math.round(box.height), clientH: Math.round(c.height), text: text.slice(0, 40) });
            break;
          }
        }
      }
    }
    if (fs >= MIN_PX && inkRatio(el) < 1.2) {
      report.tightLeading.push({ el: name, lineHeight: cs.lineHeight, fontSize: cs.fontSize, ratio: Number(inkRatio(el).toFixed(3)), text: text.slice(0, 40) });
    }
    const margins = {
      left: Math.round(rect.left - stage.left), top: Math.round(rect.top - stage.top),
      right: Math.round(stage.right - rect.right), bottom: Math.round(stage.bottom - rect.bottom),
    };
    if (Math.min(margins.left, margins.top, margins.right, margins.bottom) < safe - 1) {
      report.safeArea.push({ el: name, margins, needed: Math.round(safe), text: text.slice(0, 40) });
    }
    const fg = parse(cs.color);
    const bg = opaqueBg(el);
    if (fg && bg && !bg.image) {
      const b = parse(bg.color);
      if (b) report.contrast.push({ el: name, fg: cs.color, bg: bg.color, bgFrom: bg.from, ratio: Number(ratio(fg, b).toFixed(2)), text: text.slice(0, 40) });
    } else {
      report.overPhoto.push({ el: name, fg: cs.color, bgFrom: bg ? bg.from : 'unknown', text: text.slice(0, 40) });
    }
  }
  return report;
})()`;

/** Wait for a painted frame after a seek. rAF fires from the compositor, so two of them
 *  mean the seeked state has actually been rastered; without this, ~2% of frames came out
 *  with a few hundred pixels of the hero photo rastered differently between runs. */
const SETTLE_SRC = `new Promise((resolve) => {
  let done = false;
  const finish = () => { if (!done) { done = true; resolve(); } };
  requestAnimationFrame(() => requestAnimationFrame(finish));
  setTimeout(finish, 500);
})`;

export async function renderFrames({ scenePath, outDir, fps, duration, width, height, seamFrame, safeAreaPct, minTextPx, browserPath }) {
  const browser = browserPath || resolveBrowser();
  if (!browser) {
    throw Object.assign(
      new Error(
        "no Chromium found. Install one and point PUPPETEER_EXECUTABLE_PATH at it, e.g.\n" +
          "  npx puppeteer browsers install chrome\n" +
          "  export PUPPETEER_EXECUTABLE_PATH=$(node -e \"console.log(require('puppeteer-core').executablePath?.() || '')\")\n" +
          "or install the Playwright Chromium (this repo was built against ~/.cache/ms-playwright)."
      ),
      { code: EXIT.DEPENDENCY }
    );
  }

  const framesDir = path.join(outDir, "frames");
  await mkdir(framesDir, { recursive: true });

  const launchArgs = [
    "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
    "--hide-scrollbars", "--force-color-profile=srgb", "--font-render-hinting=none",
    "--disable-lcd-text", "--disable-features=PaintHolding",
    "--allow-file-access-from-files",
  ];
  let seam = null;
  const instance = await puppeteer.launch({ executablePath: browser, headless: true, args: launchArgs, protocolTimeout: 300000, timeout: 120000 });

  try {
    const page = await instance.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    page.on("pageerror", (e) => log.warn(`page error: ${e.message}`));
    await page.goto(pathToFileURL(scenePath).href, { waitUntil: "load", timeout: 60000 });

    await page.waitForFunction("window.__timeline && window.__timeline.ok === true", { timeout: 30000 }).catch(() => {
      throw Object.assign(new Error("the scene never exposed window.__timeline — check the generated scene.html for a GSAP or plan error"), { code: EXIT.RENDER });
    });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => {
      await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((res) => { img.onload = img.onerror = res; }))));
      await Promise.all([...document.images].map((img) => (img.decode ? img.decode().catch(() => {}) : null)));
    });

    const warnings = await page.evaluate(() => (window.__timeline.warnings || []).slice());
    for (const w of warnings) log.warn(`timeline: ${w}`);

    const total = Math.round(duration * fps);
    const t0 = Date.now();
    for (let n = 0; n < total; n++) {
      const t = n / fps;
      await page.evaluate((tt) => { window.__timeline.tl.pause(); window.__timeline.tl.seek(tt, false); }, t);
      await page.evaluate(SETTLE_SRC);
      await page.screenshot({ path: path.join(framesDir, `frame-${String(n).padStart(4, "0")}.png`), type: "png", optimizeForSpeed: true });
      if (n % 50 === 0) log.info(`frame ${n}/${total}`);
    }
    log.ok(`${total} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s (${((Date.now() - t0) / total).toFixed(0)} ms/frame)`);

    if (seamFrame) {
      await page.evaluate((tt) => { window.__timeline.tl.pause(); window.__timeline.tl.seek(tt, false); }, duration);
      await page.evaluate(SETTLE_SRC);
      await page.screenshot({ path: path.join(framesDir, "seam.png"), type: "png", optimizeForSpeed: true });
      seam = path.join(framesDir, "seam.png");
      log.ok("seam frame captured at t = duration");
    }

    // ---- audit at three moments: start, promo peak, before the loop restarts ----
    const plan = await page.evaluate(() => window.__timeline.plan);
    const promoScaled = plan.scenes.find((s) => s.fadeOut);
    const auditTimes = [0, promoScaled ? Number((promoScaled.fadeOut.at - 0.2).toFixed(2)) : duration / 2, Number((duration - 0.05).toFixed(2))];
    const checks = { fps, duration, width, height, auditTimes, typeFloorPx: minTextPx, safeAreaPx: Math.round(safeAreaPct * Math.min(width, height)), findings: [] };
    for (const t of auditTimes) {
      await page.evaluate((tt) => { window.__timeline.tl.pause(); window.__timeline.tl.seek(tt, false); }, t);
      const auditSrc = AUDIT_SRC.replace("__MIN_PX__", String(minTextPx)).replace("__SAFE_PCT__", String(safeAreaPct));
      const r = await page.evaluate(auditSrc);
      r.time = t;
      checks.findings.push(r);
    }
    await writeFile(path.join(outDir, "checks.json"), JSON.stringify(checks, null, 2) + "\n");
  } finally {
    await instance.close();
  }

  return { framesDir, checksPath: path.join(outDir, "checks.json"), seamPath: seam ? path.join(framesDir, "seam.png") : null };
}

/** Summarise checks.json into hard errors and warnings a human must look at. */
export function summariseChecks(checks) {
  // Findings are collected at three moments in the loop, so the same element is reported
  // up to three times with a different time prefix. Deduplicate on the message and keep
  // the earliest time, otherwise a consumer sees 49 warnings where there are 17 problems.
  const errors = new Map();
  const warnings = new Map();
  const add = (map, time, msg) => {
    const prev = map.get(msg);
    if (prev === undefined || time < prev) map.set(msg, time);
  };
  for (const f of checks.findings) {
    for (const o of f.overflow) add(errors, f.time, `text overflows its box (${o.how}): ${o.el} (${o.scrollW}x${o.scrollH} in ${o.clientW}x${o.clientH}) "${o.text}"`);
    for (const t of f.tightLeading || []) add(warnings, f.time, `${t.el} line-height ${t.lineHeight} is ${t.ratio}x the font-size — tighter than the font's 1.22x ink box, check the frame for colliding lines "${t.text}"`);
    for (const s of f.safeArea) add(errors, f.time, `${s.el} breaks the ${s.needed}px safe area (margins l${s.margins.left} t${s.margins.top} r${s.margins.right} b${s.margins.bottom}) "${s.text}"`);
    for (const s of f.typeFloor) add(errors, f.time, `${s.el} renders at ${s.px}px, below the ${checks.typeFloorPx}px floor "${s.text}"`);
    for (const c of f.contrast) {
      if (c.ratio < 4.5) add(errors, f.time, `${c.el} contrast ${c.ratio}:1 (${c.fg} on ${c.bg} from ${c.bgFrom}) "${c.text}"`);
      else if (c.ratio < 7) add(warnings, f.time, `${c.el} contrast ${c.ratio}:1 — above the 4.5 floor, below the 7:1 preferred for body copy`);
    }
    for (const p of f.overPhoto) add(warnings, f.time, `${p.el} sits over a photo/gradient (${p.bgFrom}) — contrast cannot be checked automatically, look at the frame "${p.text}"`);
  }
  const render = (map) => [...map.entries()].sort((a, b) => a[1] - b[1]).map(([msg, time]) => `t=${time}s ${msg}`);
  return { errors: render(errors), warnings: render(warnings) };
}

async function main() {
  const { flags } = parseArgs();
  requireFlags(flags, ["scene", "out"]);
  const fps = Number(flags.fps || 25);
  const duration = Number(flags.duration || 15);
  const result = await renderFrames({
    scenePath: path.resolve(String(flags.scene)),
    outDir: path.resolve(String(flags.out)),
    fps,
    duration,
    width: Number(flags.width || 1920),
    height: Number(flags.height || 1080),
    seamFrame: flags["seam-frame"] !== undefined || flags.seam === true || flags.seam === "true",
    safeAreaPct: Number(flags["safe-area"] || 0.05),
    minTextPx: Number(flags["min-text"] || 32),
    browserPath: flags.browser ? String(flags.browser) : null,
  });

  const { readFile } = await import("node:fs/promises");
  const checks = JSON.parse(await readFile(result.checksPath, "utf8"));
  const { errors, warnings } = summariseChecks(checks);
  for (const w of warnings) log.warn(w);
  for (const e of errors) log.fail(e);
  if (errors.length && flags["allow-violations"] === undefined) {
    log.fail(`${errors.length} screen-rule violation(s) — see ${result.checksPath}`);
    process.exit(EXIT.POLICY);
  }
  log.ok(`checks: ${errors.length} error(s), ${warnings.length} warning(s)`);
  process.exit(EXIT.OK);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
