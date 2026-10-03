#!/usr/bin/env node
/**
 * adkit — the orchestrator.
 *
 *   adkit doctor
 *   adkit build --profile landscape-1080p \
 *               --content examples/ko-kitchen/content.json \
 *               [--brand examples/ko-kitchen/brand.json] \
 *               --photos  examples/ko-kitchen/photos \
 *               --out     out/ko-kitchen \
 *               [--name ko-kitchen] [--matting auto|rembg|alpha|none] \
 *               [--skip-images] [--keep-frames] [--allow-violations] [--json]
 *
 * Stages: validate -> images (python/rembg) -> palette -> compile -> render -> encode
 *         -> validate -> report.
 *
 * Everything a run produces stays under --out:
 *   out/<name>/screen.mp4      the deliverable
 *   out/<name>/poster.jpg      frame 0, for still-image players
 *   out/<name>/report.json     every stage's result, warnings and uncertainties
 *   out/<name>/work/**         scene.html, plan.json, frames, checks, tokens
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { EXIT, log, parseArgs, readJson, requireFlags } from "./lib/util.mjs";
import { validate } from "./validate-content.mjs";
import { buildPalette, tokensToCss, DEFAULT_THEME } from "./palette.mjs";
import { compileScene, SKILL_ROOT } from "./compile-scene.mjs";
import { renderFrames, summariseChecks } from "./render-frames.mjs";
import { doctor } from "./doctor.mjs";

const execFileAsync = promisify(execFile);
const run = async (cmd, args, opts = {}) => {
  try {
    const { stdout, stderr } = await execFileAsync(cmd, args, { maxBuffer: 32 * 1024 * 1024, ...opts });
    return { ok: true, stdout, stderr };
  } catch (e) {
    return { ok: false, stdout: e.stdout || "", stderr: e.stderr || e.message, code: e.code };
  }
};

function pythonBin() {
  const venv = path.join(SKILL_ROOT, ".venv", "bin", "python3");
  return existsSync(venv) ? venv : "python3";
}

async function stageReport(name, fn) {
  const started = Date.now();
  log.step(name);
  try {
    const value = await fn();
    return { name, ok: true, seconds: Number(((Date.now() - started) / 1000).toFixed(2)), value };
  } catch (e) {
    return { name, ok: false, seconds: Number(((Date.now() - started) / 1000).toFixed(2)), error: e.message, code: e.code ?? EXIT.RENDER };
  }
}

export async function build({ profileId, contentPath, brandPath, photosDir, outRoot, name, matting, skipImages, keepFrames, allowViolations }) {
  const report = {
    schemaVersion: 1,
    generator: "screen-ad-generator",
    profile: profileId,
    inputs: { content: contentPath, brand: brandPath, photos: photosDir, out: outRoot },
    stages: [],
    artifacts: {},
    warnings: [],
    uncertainties: [],
  };

  const profilePath = path.join(SKILL_ROOT, "profiles", `${profileId}.json`);
  if (!existsSync(profilePath)) throw Object.assign(new Error(`unknown profile "${profileId}" (no profiles/${profileId}.json)`), { code: EXIT.INPUT });
  const profile = await readJson(profilePath);
  if (profile.notImplemented) {
    throw Object.assign(
      new Error(`profile "${profileId}" is a documented stub and is not implemented: ${profile.description}\nBlockers:\n - ${(profile.blockers || profile.intended?.blockers || []).join("\n - ")}`),
      { code: EXIT.INPUT }
    );
  }

  const work = path.join(outRoot, "work");
  await mkdir(work, { recursive: true });

  // ---- 1. validate ------------------------------------------------------
  const v = await stageReport("validate content", async () => {
    const result = await validate({ contentPath, brandPath, photosDir });
    for (const w of result.warnings) log.warn(`${w.path}: ${w.message}`);
    if (!result.ok) {
      for (const e of result.errors) log.fail(`${e.path}: ${e.message}`);
      throw Object.assign(new Error(`${result.errors.length} validation error(s)`), { code: EXIT.VALIDATION });
    }
    return { warnings: result.warnings.length };
  });
  report.stages.push(v);
  if (!v.ok) return report;

  const content = await readJson(contentPath);
  const brand = brandPath ? await readJson(brandPath) : null;
  if (brand && brand.logo && !path.isAbsolute(brand.logo)) brand.logo = path.resolve(path.dirname(brandPath), brand.logo);

  // ---- 2. images --------------------------------------------------------
  const imagesOut = path.join(work, "images");
  const imagesReportPath = path.join(imagesOut, "report.json");
  // A supplied cutout (--matting alpha/auto) is flattened onto the board surface for
  // flat.jpg, so the hero frame shows the dish on the brand colour, not on black.
  const flatBackdrop =
    brand?.colors?.surface || DEFAULT_THEME[brand?.theme === "light" ? "light" : "dark"].surface;
  const imgStage = await stageReport(`process images (${matting})`, async () => {
    if (skipImages && existsSync(imagesReportPath)) {
      log.info("--skip-images: reusing the existing image report");
      return { reused: true };
    }
    const args = [
      path.join(SKILL_ROOT, "scripts", "process_images.py"),
      "--photos", photosDir,
      "--content", contentPath,
      "--out", imagesOut,
      "--model-cache", process.env.SCREEN_AD_MODEL_CACHE || path.join(process.env.HOME || "", ".cache", "screen-ad-generator", "models"),
      "--matting", matting,
      "--flat-backdrop", flatBackdrop,
    ];
    const r = await run(pythonBin(), args);
    if (!r.ok) {
      if (r.code === 2) throw Object.assign(new Error(`image pipeline missing a dependency:\n${r.stderr}`), { code: EXIT.DEPENDENCY });
      throw Object.assign(new Error(`image pipeline failed:\n${r.stderr || r.stdout}`), { code: EXIT.INPUT });
    }
    log.raw(r.stdout.trim().split("\n").slice(-6).join("\n"));
    return { reused: false };
  });
  report.stages.push(imgStage);
  if (!imgStage.ok) return report;

  const imageReport = existsSync(imagesReportPath) ? await readJson(imagesReportPath) : null;
  imageReport && (imageReport.__dir = imagesOut);
  if (imageReport) {
    report.imagePipeline = { matting: imageReport.matting, warnings: imageReport.warnings || [], items: (imageReport.items || []).map((i) => ({ id: i.id, alphaSource: i.alphaSource, coverage: i.alpha?.coverage, touchesBorder: i.alpha?.edge?.touchesBorder, focal: i.focal, warnings: i.warnings })) };
    for (const item of report.imagePipeline.items) {
      if (item.alphaSource === "none") continue; // --matting none: the whole frame is the "subject"
      if (item.touchesBorder) report.warnings.push(`${item.id}: the subject touches the source image border — the photo is cropped off, ask for a wider shot`);
      if (item.coverage !== undefined && (item.coverage < 0.05 || item.coverage > 0.95)) report.warnings.push(`${item.id}: alpha coverage ${item.coverage} is outside the useful range — check the cutout`);
    }
  }

  // ---- 3. palette -------------------------------------------------------
  const tokensPath = path.join(work, "tokens.css");
  const pal = await stageReport("palette", async () => {
    const result = await buildPalette({
      imagesReport: imageReport,
      brand,
      theme: (brand && brand.theme) || "dark",
      minContrast: (brand && brand.rules && brand.rules.minContrast) || 4.5,
    });
    await writeFile(tokensPath, tokensToCss(result));
    await writeFile(path.join(work, "palette.json"), JSON.stringify({ tokens: result.tokens, audit: result.audit, source: result.source }, null, 2));
    for (const a of result.audit) {
      if (!a.preferred && a.pass) report.warnings.push(`${a.pair} contrast ${a.ratio}:1 — above the ${a.min}:1 floor, below the ${a.target}:1 preferred`);
      else if (a.adjusted) log.warn(`${a.pair}: repaired to ${a.ratio}:1`);
    }
    if (result.errors.length) throw Object.assign(new Error(result.errors.join("; ")), { code: EXIT.POLICY });
    return { source: result.source, audit: result.audit };
  });
  report.stages.push(pal);
  if (!pal.ok) return report;
  report.palette = pal.value;

  // ---- 4. compile -------------------------------------------------------
  const sceneDir = path.join(work, "scene");
  const comp = await stageReport("compile scene", async () => {
    const result = await compileScene({
      content, brand, imageReport,
      tokensCss: await readFile(tokensPath, "utf8"),
      profile,
      outDir: sceneDir,
      templatesRoot: path.join(SKILL_ROOT, "templates"),
    });
    for (const w of [...result.planCheck.warnings, ...result.warnings]) log.warn(w);
    if (result.planCheck.errors.length) throw Object.assign(new Error(result.planCheck.errors.join("; ")), { code: EXIT.VALIDATION });
    return { bytes: result.html.length, scenes: result.plan.scenes.length, duration: result.plan.duration };
  });
  report.stages.push(comp);
  if (!comp.ok) return report;
  report.scene = comp.value;
  report.artifacts.sceneHtml = path.join(sceneDir, "scene.html");
  report.artifacts.plan = path.join(sceneDir, "plan.json");

  // ---- 5. render --------------------------------------------------------
  const render = await stageReport("render frames", async () => {
    const r = await renderFrames({
      scenePath: path.join(sceneDir, "scene.html"),
      outDir: work,
      fps: profile.fps,
      duration: profile.duration,
      width: profile.width,
      height: profile.height,
      seamFrame: !!profile.artifacts?.seamFrame,
      safeAreaPct: (brand && brand.rules && brand.rules.safeAreaPct) || profile.safeAreaPct,
      minTextPx: (brand && brand.rules && brand.rules.minTextPx) || 32,
    });
    const checks = JSON.parse(await readFile(r.checksPath, "utf8"));
    const summary = summariseChecks(checks);
    report.checks = { errors: summary.errors, warnings: summary.warnings, path: r.checksPath };
    for (const w of summary.warnings) log.warn(w);
    for (const e of summary.errors) log.fail(e);
    if (summary.errors.length && !allowViolations) {
      throw Object.assign(new Error(`${summary.errors.length} screen-rule violation(s) — see ${r.checksPath}`), { code: EXIT.POLICY });
    }
    return { framesDir: r.framesDir, seam: r.seamPath, violations: summary.errors.length };
  });
  report.stages.push(render);
  if (!render.ok) return report;

  // ---- 6. encode --------------------------------------------------------
  const mp4 = path.join(outRoot, `${name}.mp4`);
  const poster = path.join(outRoot, `${name}.jpg`);
  const enc = await stageReport("encode", async () => {
    const r = await run("bash", [
      path.join(SKILL_ROOT, "scripts", "encode-video.sh"),
      "--frames", path.join(work, "frames"),
      "--out", mp4,
      "--fps", String(profile.fps),
      "--crf", String(profile.video.crf ?? 18),
      "--preset", String(profile.video.preset ?? "medium"),
      "--level", String(profile.video.level ?? "4.0"),
    ], { env: { ...process.env, POSTER: profile.artifacts?.poster === false ? "" : poster } });
    if (!r.ok) throw Object.assign(new Error(`ffmpeg failed:\n${r.stderr}`), { code: EXIT.ENCODE });
    return { stdout: r.stdout.trim().split("\n").slice(-2).join(" ") };
  });
  report.stages.push(enc);
  if (!enc.ok) return report;
  report.artifacts.video = mp4;
  report.artifacts.poster = profile.artifacts?.poster === false ? null : poster;

  // ---- 7. validate the file --------------------------------------------
  const val = await stageReport("validate video", async () => {
    const r = await run("bash", [
      path.join(SKILL_ROOT, "scripts", "validate-video.sh"),
      "--video", mp4,
      "--width", String(profile.width),
      "--height", String(profile.height),
      "--fps", String(profile.fps),
      "--duration", String(profile.duration),
    ]);
    log.raw((r.stdout || "").trim());
    if (!r.ok) throw Object.assign(new Error("the encoded file does not match the output profile"), { code: EXIT.ENCODE });
    return { ok: true };
  });
  report.stages.push(val);

  // ---- 8. loop seam -----------------------------------------------------
  if (render.value.seam && profile.loop) {
    const seam = await stageReport("loop seam", async () => {
      const sharp = (await import("sharp")).default;
      const first = path.join(work, "frames", "frame-0000.png");
      const a = await sharp(first).raw().toBuffer();
      const b = await sharp(render.value.seam).raw().toBuffer();
      if (a.length !== b.length) throw new Error("frame 0 and the seam frame differ in size");
      let diff = 0;
      let maxDelta = 0;
      for (let i = 0; i < a.length; i++) {
        const d = Math.abs(a[i] - b[i]);
        if (d > 2) diff++;
        if (d > maxDelta) maxDelta = d;
      }
      const ratio = diff / a.length;
      log.info(`pixel delta: ${(ratio * 100).toFixed(4)}% of samples differ by more than 2/255 (max ${maxDelta})`);
      if (ratio > 0.005) throw Object.assign(new Error(`the last frame does not match frame 0 (${(ratio * 100).toFixed(3)}% of samples differ) — the loop is not seamless`), { code: EXIT.POLICY });
      return { mismatchRatio: Number(ratio.toFixed(6)), maxDelta };
    });
    report.stages.push(seam);
    report.loopSeam = seam.ok ? seam.value : { error: seam.error };
  }

  if (!keepFrames) {
    await rm(path.join(work, "frames"), { recursive: true, force: true });
    log.info("frames removed (--keep-frames to keep them)");
  }

  // Uncertainties are what the build cannot verify. They are reported, not hidden: a
  // consumer must be able to tell a verified fact from an assumption. See docs/DECISIONS.md.
  const usedMatting = imageReport?.matting || matting;
  report.uncertainties.push(
    `the cutouts came from the "${usedMatting}" backend` +
      (usedMatting === "none"
        ? " — the promo overlay shows the flat photo, not a cutout (--matting alpha with a cutout PNG or --matting rembg fixes this)"
        : "")
  );
  if (usedMatting.startsWith("rembg")) {
    report.uncertainties.push("the BiRefNet checkpoint's redistribution terms are unresolved; the weights are cached outside this repository, never committed (UNCERTAIN-1)");
  }
  report.uncertainties.push("contrast is measured on the rendered DOM, not on the encoded H.264 (4:2:0 chroma subsampling can shift a glyph edge slightly) (UNCERTAIN-5)");
  if ((report.checks?.warnings || []).some((w) => w.includes("sits over a photo"))) {
    report.uncertainties.push("text over a photo cannot be checked automatically — the frame was flagged for a human to look at (UNCERTAIN-6)");
  }
  report.uncertainties.push("the output was validated with ffprobe and played locally, not on physical signage hardware (UNCERTAIN-9)");
  if (photosDir.startsWith(SKILL_ROOT)) {
    report.uncertainties.push("the photos are the synthetic stand-ins shipped with this skill (tests/make-fixtures.py), not real photography; example prices are illustrative (UNCERTAIN-3, UNCERTAIN-4)");
  }

  return report;
}

async function main() {
  const { flags, positionals } = parseArgs();
  const command = positionals[0] || "build";

  if (command === "doctor") {
    const r = await doctor();
    process.exit(r.ok ? EXIT.OK : EXIT.DEPENDENCY);
  }

  if (command === "validate") {
    requireFlags(flags, ["content"]);
    const r = await validate({
      contentPath: path.resolve(String(flags.content)),
      brandPath: flags.brand ? path.resolve(String(flags.brand)) : null,
      photosDir: flags.photos ? path.resolve(String(flags.photos)) : null,
    });
    for (const e of r.errors) log.fail(`${e.path}: ${e.message}`);
    for (const w of r.warnings) log.warn(`${w.path}: ${w.message}`);
    process.exit(r.ok ? EXIT.OK : EXIT.VALIDATION);
  }

  if (command !== "build") {
    log.fail(`unknown command "${command}". Commands: doctor, validate, build`);
    process.exit(EXIT.INPUT);
  }

  requireFlags(flags, ["content", "photos", "out"]);
  const contentPath = path.resolve(String(flags.content));
  const outRoot = path.resolve(String(flags.out));
  const name = String(flags.name || path.basename(path.dirname(contentPath)) || "screen");
  const matting = String(flags.matting || "auto");
  if (!["auto", "rembg", "alpha", "none"].includes(matting)) {
    log.fail(`--matting must be auto, rembg, alpha or none (got "${matting}")`);
    process.exit(EXIT.INPUT);
  }

  const report = await build({
    profileId: String(flags.profile || "landscape-1080p"),
    contentPath,
    brandPath: flags.brand ? path.resolve(String(flags.brand)) : null,
    photosDir: path.resolve(String(flags.photos)),
    outRoot,
    name,
    matting,
    skipImages: flags["skip-images"] !== undefined,
    keepFrames: flags["keep-frames"] !== undefined,
    allowViolations: flags["allow-violations"] !== undefined,
  });

  const failed = report.stages.filter((s) => !s.ok);
  report.ok = failed.length === 0;
  await mkdir(outRoot, { recursive: true });
  await writeFile(path.join(outRoot, "report.json"), JSON.stringify(report, null, 2) + "\n");

  log.step("summary");
  for (const s of report.stages) {
    if (s.ok) log.ok(`${s.name} (${s.seconds}s)`);
    else log.fail(`${s.name}: ${s.error}`);
  }
  if (report.ok) {
    log.ok(`video: ${report.artifacts.video}`);
    if (report.artifacts.poster) log.ok(`poster: ${report.artifacts.poster}`);
    if (report.loopSeam) log.ok(`loop seam: ${(report.loopSeam.mismatchRatio * 100).toFixed(4)}% mismatch`);
    log.info(`report: ${path.join(outRoot, "report.json")}`);
    process.exit(EXIT.OK);
  }
  log.fail(`build failed at "${failed[0].name}" — full report: ${path.join(outRoot, "report.json")}`);
  // err.code can be a Node error code string (ERR_INVALID_ARG_TYPE) — never pass that to
  // process.exit, which requires an integer.
  process.exit(Number.isInteger(failed[0].code) ? failed[0].code : EXIT.RENDER);
}

// Errors raised before the stage runner (an unknown or stubbed profile, a content file that
// is not valid JSON) are not wrapped by runStage, so they need a handler here. Without one,
// Node printed a raw stack trace and exited 1 instead of the documented code.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    log.fail(e.message);
    if (process.env.SCREEN_AD_DEBUG) console.error(e.stack);
    else log.info("re-run with SCREEN_AD_DEBUG=1 for the stack trace");
    process.exit(Number.isInteger(e.code) ? e.code : EXIT.INPUT);
  });
}
