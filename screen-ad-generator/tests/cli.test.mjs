import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

// The exit codes are a contract: a caller scripting this tool switches on them, and a
// thrown error that escapes main() would print a raw stack trace and exit 1 instead.
const SKILL = path.resolve(import.meta.dirname, "..");
const run = (args) =>
  spawnSync(process.execPath, [path.join(SKILL, "scripts/adkit.mjs"), ...args], { encoding: "utf8", cwd: SKILL });

const base = ["--content", "examples/ko-kitchen/content.json", "--brand", "examples/ko-kitchen/brand.json", "--photos", "examples/ko-kitchen/photos", "--out", "/tmp/adkit-cli-test", "--name", "x", "--matting", "none"];

test("a stub profile fails with its blockers, not a stack trace", () => {
  const r = run(["build", "--profile", "portrait-1080x1920", ...base]);
  assert.equal(r.status, 3, `expected EXIT.INPUT, got ${r.status}\n${r.stderr}`);
  assert.match(r.stderr, /is a documented stub and is not implemented/);
  assert.match(r.stderr, /Blockers:/);
  assert.ok(!r.stderr.includes("at async main"), "the user should not see a stack trace");
});

test("an unknown profile fails with the path it looked for", () => {
  const r = run(["build", "--profile", "nope-999", ...base]);
  assert.equal(r.status, 3);
  assert.match(r.stderr, /unknown profile "nope-999"/);
});

test("a missing required flag names it", () => {
  const r = run(["build", "--profile", "landscape-1080p", "--out", "/tmp/adkit-cli-test"]);
  assert.equal(r.status, 3);
  assert.match(r.stderr, /--content/);
});

test("invalid JSON in content.json is a validation failure, not a crash", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "adkit-cli-"));
  const bad = path.join(dir, "content.json");
  writeFileSync(bad, "{ not json");
  try {
    const r = run(["build", "--profile", "landscape-1080p", ...base.map((a) => (a === "examples/ko-kitchen/content.json" ? bad : a))]);
    assert.equal(r.status, 1, `expected EXIT.VALIDATION, got ${r.status}\n${r.stderr}`);
    assert.match(r.stderr, /not valid JSON/);
    assert.ok(!r.stderr.includes("at async main"), "the user should not see a stack trace");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
