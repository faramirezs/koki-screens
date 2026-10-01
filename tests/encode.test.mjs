import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";

const SKILL = path.resolve(import.meta.dirname, "..");
const SCRIPT = path.join(SKILL, "scripts", "encode-video.sh");

function haveFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
const ready = existsSync(SCRIPT) && haveFfmpeg();

test("encode-video.sh encodes a frame sequence and writes the poster", { skip: !ready }, async () => {
  const sharp = (await import("sharp")).default;
  const dir = mkdtempSync(path.join(tmpdir(), "adkit-encode-"));
  try {
    const frames = path.join(dir, "frames");
    mkdirSync(frames, { recursive: true });
    for (let i = 0; i < 5; i++) {
      await sharp({ create: { width: 64, height: 64, channels: 3, background: { r: i * 40, g: 20, b: 60 } } })
        .png()
        .toFile(path.join(frames, `frame-${String(i).padStart(4, "0")}.png`));
    }
    const out = path.join(dir, "out.mp4");
    const poster = path.join(dir, "poster.jpg");
    // A glob of ~5 files never fills the pipe buffer, so `ls | head -1` used to pass here
    // and fail on a real 375-frame run (SIGPIPE + `set -o pipefail` aborts the script).
    // The script now uses an array glob, so the count and the first frame are exact.
    const stdout = execFileSync("bash", [SCRIPT, "--frames", frames, "--out", out, "--fps", "25"], {
      encoding: "utf8",
      env: { ...process.env, POSTER: poster },
    });
    assert.match(stdout, /encoding 5 frames/);
    assert.ok(statSync(out).size > 0, "the mp4 is empty");
    assert.ok(existsSync(poster), "the poster was not written");
    assert.match(stdout, /poster written/);

    const probe = JSON.parse(
      execFileSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", "-show_format", out], { encoding: "utf8" })
    );
    const v = probe.streams.find((s) => s.codec_type === "video");
    assert.equal(v.codec_name, "h264");
    assert.equal(v.profile, "Main");
    assert.equal(v.pix_fmt, "yuv420p");
    assert.equal(probe.streams.filter((s) => s.codec_type === "audio").length, 0, "there must be no audio track");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("encode-video.sh refuses an empty frames directory", { skip: !ready }, () => {
  const dir = mkdtempSync(path.join(tmpdir(), "adkit-encode-"));
  try {
    const frames = path.join(dir, "frames");
    mkdirSync(frames, { recursive: true });
    assert.throws(
      () => execFileSync("bash", [SCRIPT, "--frames", frames, "--out", path.join(dir, "o.mp4")], { stdio: "pipe" }),
      (err) => err.status === 3
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
