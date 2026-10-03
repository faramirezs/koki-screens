import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";

const SKILL = path.resolve(import.meta.dirname, "..");
const SCRIPT = path.join(SKILL, "scripts/process_images.py");
const CUTOUTS = path.join(SKILL, "tests/fixtures/cutouts");
const VENV = path.join(SKILL, ".venv/bin/python");
const PY = existsSync(VENV) ? VENV : "python3";

function havePillowNumpy() {
  try {
    execFileSync(PY, ["-c", "import PIL, numpy"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const ready = existsSync(SCRIPT) && existsSync(CUTOUTS) && havePillowNumpy();

function sandbox({ photos, content }) {
  const dir = mkdtempSync(path.join(tmpdir(), "adkit-images-"));
  const photoDir = path.join(dir, "photos");
  mkdirSync(photoDir, { recursive: true });
  for (const [name, from] of Object.entries(photos)) cpSync(from, path.join(photoDir, name));
  writeFileSync(path.join(photoDir, "content.json"), JSON.stringify(content));
  return { dir, photoDir };
}

function runPipeline(photoDir, out, { matting = "alpha" } = {}) {
  try {
    const stdout = execFileSync(
      PY,
      [SCRIPT, "--photos", photoDir, "--content", path.join(photoDir, "content.json"), "--out", out,
        "--model-cache", path.join(out, "_models"), "--matting", matting],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
    return { code: 0, stdout };
  } catch (err) {
    return { code: err.status, stdout: String(err.stdout || ""), stderr: String(err.stderr || "") };
  }
}

const content = {
  language: "de",
  items: [
    { id: "dish", name: "Teller", price: 9.9, allergens: [], image: "dish-plate.png" },
    { id: "glass", name: "Glas", price: 4.5, allergens: [], image: "drink-glass.png" },
  ],
};

test("--matting alpha uses the supplied cutout: no model, no cost", { skip: !ready }, () => {
  const { dir, photoDir } = sandbox({
    photos: { "dish-plate.png": path.join(CUTOUTS, "dish-plate.png"), "drink-glass.png": path.join(CUTOUTS, "drink-glass.png") },
    content,
  });
  try {
    const out = path.join(dir, "out");
    const r = runPipeline(photoDir, out);
    assert.equal(r.code, 0, r.stderr);
    const report = JSON.parse(readFileSync(path.join(out, "report.json"), "utf8"));
    assert.equal(report.matting, "alpha:input");
    assert.equal(report.items.length, 2);
    for (const item of report.items) {
      assert.equal(item.alphaSource, "input");
      assert.ok(item.alpha.coverage >= 0.05 && item.alpha.coverage <= 0.95, `${item.id} coverage ${item.alpha.coverage}`);
      assert.equal(item.alpha.edge.touchesBorder, false, `${item.id} touches the border`);
      assert.equal(item.warnings.includes("matting-disabled"), false);
      for (const f of ["cutout.png", "mask.png", "flat.jpg", "preview.png"]) {
        assert.ok(existsSync(path.join(out, item.id, f)), `${item.id}/${f} missing`);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--matting alpha is byte-deterministic across runs", { skip: !ready }, () => {
  const { dir, photoDir } = sandbox({
    photos: { "dish-plate.png": path.join(CUTOUTS, "dish-plate.png"), "drink-glass.png": path.join(CUTOUTS, "drink-glass.png") },
    content,
  });
  const hash = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");
  try {
    const a = path.join(dir, "a");
    const b = path.join(dir, "b");
    assert.equal(runPipeline(photoDir, a).code, 0);
    assert.equal(runPipeline(photoDir, b).code, 0);
    for (const rel of ["dish/cutout.png", "dish/mask.png", "dish/flat.jpg", "dish/preview.png"]) {
      assert.equal(hash(path.join(a, rel)), hash(path.join(b, rel)), `${rel} differs between runs`);
    }
    // report.json carries the absolute --model-cache path, so compare it with that
    // one volatile field removed.
    const strip = (p) => {
      const r = JSON.parse(readFileSync(p, "utf8"));
      delete r.modelCache;
      return JSON.stringify(r);
    };
    assert.equal(strip(path.join(a, "report.json")), strip(path.join(b, "report.json")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--matting alpha refuses photos without an alpha channel, and names them", { skip: !ready }, () => {
  const { dir, photoDir } = sandbox({
    photos: { "dish-plate.jpg": path.join(SKILL, "tests/fixtures/dish-plate.jpg") },
    content: { language: "de", items: [{ id: "dish", name: "Teller", price: 9.9, allergens: [], image: "dish-plate.jpg" }] },
  });
  try {
    const r = runPipeline(photoDir, path.join(dir, "out"));
    assert.equal(r.code, 3);
    assert.match(r.stderr, /dish-plate\.jpg/);
    assert.match(r.stderr, /alpha channel/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the promo image is processed as an asset, not only the menu items", { skip: !ready }, () => {
  const { dir, photoDir } = sandbox({
    photos: {
      "dish-plate.png": path.join(CUTOUTS, "dish-plate.png"),
      "promo-board.png": path.join(CUTOUTS, "drink-glass.png"),
    },
    content: {
      language: "de",
      items: [{ id: "dish", name: "Teller", price: 9.9, allergens: [], image: "dish-plate.png" }],
      promo: { kind: "membership", headline: "X", image: "promo-board.png", tiers: [{ label: "a", price: 47 }] },
    },
  });
  try {
    const out = path.join(dir, "out");
    const r = runPipeline(photoDir, out);
    assert.equal(r.code, 0, r.stderr);
    const report = JSON.parse(readFileSync(path.join(out, "report.json"), "utf8"));
    const promo = report.items.find((i) => i.role === "promo");
    assert.ok(promo, `no promo asset in the report: ${JSON.stringify(report.items.map((i) => [i.id, i.role]))}`);
    assert.equal(promo.id, "promo-board");
    assert.ok(existsSync(path.join(out, "promo-board/flat.jpg")), "the promo asset was not written");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a promo image that does not exist is a hard error", { skip: !ready }, () => {
  const { dir, photoDir } = sandbox({
    photos: { "dish-plate.png": path.join(CUTOUTS, "dish-plate.png") },
    content: {
      language: "de",
      items: [{ id: "dish", name: "Teller", price: 9.9, allergens: [], image: "dish-plate.png" }],
      promo: { kind: "membership", headline: "X", image: "nope.png", tiers: [{ label: "a", price: 47 }] },
    },
  });
  try {
    const r = runPipeline(photoDir, path.join(dir, "out"));
    assert.equal(r.code, 3);
    assert.match(r.stderr, /promo\.image not found/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("--matting none still produces the full layout", { skip: !ready }, () => {
  const { dir, photoDir } = sandbox({
    photos: { "dish-plate.jpg": path.join(SKILL, "tests/fixtures/dish-plate.jpg") },
    content: { language: "de", items: [{ id: "dish", name: "Teller", price: 9.9, allergens: [], image: "dish-plate.jpg" }] },
  });
  try {
    const out = path.join(dir, "out");
    const r = runPipeline(photoDir, out, { matting: "none" });
    assert.equal(r.code, 0, r.stderr);
    const report = JSON.parse(readFileSync(path.join(out, "report.json"), "utf8"));
    assert.equal(report.matting, "none");
    assert.equal(report.items[0].alphaSource, "none");
    assert.ok(report.items[0].warnings.includes("matting-disabled"));
    assert.ok(existsSync(path.join(out, "dish/cutout.png")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
