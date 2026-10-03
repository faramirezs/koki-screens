#!/usr/bin/env node
/**
 * doctor.mjs — report every dependency the pipeline needs, with the exact command to
 * install what is missing. Run this first on a fresh clone.
 *
 *   node scripts/doctor.mjs [--json]
 *
 * Exit codes: 0 everything required is present, 2 something required is missing.
 * The BiRefNet checkpoint is downloaded on first use into the model cache; doctor only
 * reports whether it is already there, it never downloads silently.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { EXIT, log, parseArgs } from "./lib/util.mjs";
import { SKILL_ROOT } from "./compile-scene.mjs";
import { resolveBrowser } from "./render-frames.mjs";

const MODEL_CACHE = process.env.SCREEN_AD_MODEL_CACHE || path.join(os.homedir(), ".cache", "screen-ad-generator", "models");
const VENV = path.join(SKILL_ROOT, ".venv");

function run(cmd, args) {
  try {
    return { ok: true, out: execFileSync(cmd, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim() };
  } catch (e) {
    return { ok: false, out: (e.stderr || e.message || "").toString().trim() };
  }
}

function pythonBin() {
  const venvPy = path.join(VENV, "bin", "python3");
  return existsSync(venvPy) ? venvPy : "python3";
}

function findModelCache() {
  if (!existsSync(MODEL_CACHE)) return { path: MODEL_CACHE, exists: false, files: [] };
  const walk = (dir, depth = 0) => {
    if (depth > 3) return [];
    let out = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) out = out.concat(walk(p, depth + 1));
      else out.push({ path: p, size: statSync(p).size });
    }
    return out;
  };
  const files = walk(MODEL_CACHE).filter((f) => /\.(onnx|pth|pt)$/i.test(f.path));
  return { path: MODEL_CACHE, exists: true, files };
}

export async function doctor() {
  const checks = [];
  const add = (name, ok, detail, fix = null, required = true) => checks.push({ name, ok, detail, fix, required });

  const major = Number(process.versions.node.split(".")[0]);
  add("node >= 20", major >= 20, `node ${process.versions.node}`, "install Node 20 or newer: https://nodejs.org");

  const py = run(pythonBin(), ["-V"]);
  add("python3", py.ok, py.ok ? py.out : "not found", "apt-get install -y python3 python3-pip");

  const rembg = py.ok ? run(pythonBin(), ["-c", "import rembg, onnxruntime; print('rembg', rembg.__version__ if hasattr(rembg,'__version__') else 'ok', '| onnxruntime', onnxruntime.__version__)"]) : { ok: false, out: "python missing" };
  add(
    "rembg + onnxruntime (matting)",
    rembg.ok,
    rembg.ok ? rembg.out : "not installed in this interpreter",
    `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # then re-run doctor`,
    false
  );

  const ff = run("ffmpeg", ["-version"]);
  add("ffmpeg", ff.ok, ff.ok ? ff.out.split("\n")[0] : "not found", "apt-get install -y ffmpeg   (or: brew install ffmpeg)");
  const enc = run("ffmpeg", ["-hide_banner", "-encoders"]);
  const has264 = enc.ok && /libx264/.test(enc.out);
  add("ffmpeg libx264 encoder", has264, has264 ? "libx264 present" : "libx264 NOT in this ffmpeg build", "install a build with --enable-libx264 (distro packages have it)", true);
  const fp = run("ffprobe", ["-version"]);
  add("ffprobe", fp.ok, fp.ok ? fp.out.split("\n")[0] : "not found", "apt-get install -y ffmpeg");

  const browser = resolveBrowser();
  add("chromium", !!browser, browser || "no Chromium found", "npx puppeteer browsers install chrome   (then export PUPPETEER_EXECUTABLE_PATH=...)", true);

  const gsap = path.join(SKILL_ROOT, "vendor", "gsap.min.js");
  add("vendor/gsap.min.js", existsSync(gsap), existsSync(gsap) ? `${(statSync(gsap).size / 1024).toFixed(0)} KB` : "missing", "restore vendor/ from the repository (it is committed, not downloaded at runtime)");

  const fontDir = path.join(SKILL_ROOT, "vendor", "fonts");
  const fonts = existsSync(fontDir) ? readdirSync(fontDir).filter((f) => f.endsWith(".woff2")) : [];
  add("vendor/fonts (Montserrat)", fonts.length >= 4, fonts.length ? `${fonts.length} woff2 files` : "missing", "restore vendor/fonts/ from the repository");

  const nodeModules = path.join(SKILL_ROOT, "node_modules");
  add("node_modules", existsSync(nodeModules), existsSync(nodeModules) ? "installed" : "missing", "npm ci");

  const models = findModelCache();
  const modelMb = models.files.reduce((s, f) => s + f.size, 0) / 1048576;
  add(
    "BiRefNet checkpoint (model cache)",
    models.files.length > 0,
    models.files.length ? `${models.files.length} file(s), ${modelMb.toFixed(1)} MB in ${models.path}` : `empty (${models.path})`,
    "downloaded automatically on the first `adkit build` (rembg fetches it into the cache; weights are never committed to the repo)",
    false
  );

  const required = checks.filter((c) => c.required);
  const failedRequired = required.filter((c) => !c.ok);
  return { checks, ok: failedRequired.length === 0, missingRequired: failedRequired.map((c) => c.name), modelCache: models, venv: existsSync(VENV) ? VENV : null };
}

async function main() {
  const { flags } = parseArgs();
  const result = await doctor();
  log.step("screen-ad-generator doctor");
  for (const c of result.checks) {
    const label = `${c.name}${c.required ? "" : " (optional)"}`;
    if (c.ok) log.ok(`${label}: ${c.detail}`);
    else if (c.required) {
      log.fail(`${label}: ${c.detail}`);
      if (c.fix) log.info(`fix: ${c.fix}`);
    } else {
      log.warn(`${label}: ${c.detail}`);
      if (c.fix) log.info(`fix: ${c.fix}`);
    }
  }
  if (flags.json) {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(String(flags.json), JSON.stringify(result, null, 2) + "\n");
  }
  if (!result.ok) {
    log.fail(`missing required dependencies: ${result.missingRequired.join(", ")}`);
    process.exit(EXIT.DEPENDENCY);
  }
  log.ok("all required dependencies present");
  process.exit(EXIT.OK);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
