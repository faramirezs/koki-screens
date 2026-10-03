/**
 * analyze.mjs — join the votes in feedback.jsonl to the axis vector of every banner.
 *
 *   node analyze.mjs [--banners banners.json] [--feedback feedback.jsonl] [--out report.md] [--min 4]
 *
 * Each vote is scored love=1, good=.6, maybe=.3, no=0. Every axis value and every pair of
 * axis values gets a mean score and a Wilson lower bound, so a value that won 2 of 2 does
 * not outrank one that won 30 of 40. The bound is what the tables are ranked by.
 *
 * Output: a report.md plus the same tables on stdout.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AXES } from "./space.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const arg = (n, d) => (argv.indexOf(`--${n}`) >= 0 ? argv[argv.indexOf(`--${n}`) + 1] : d);

const bannersPath = arg("banners", path.join(HERE, "banners.json"));
const feedbackPath = arg("feedback", path.join(HERE, "feedback.jsonl"));
const outPath = arg("out", path.join(HERE, "report.md"));
const MIN = Number(arg("min", 4));
const MIN_PAIR = Number(arg("min-pair", 2));

const SCORE = { love: 1, good: 0.6, maybe: 0.3, no: 0 };

const banners = JSON.parse(readFileSync(bannersPath, "utf8"));
const byId = new Map(banners.map((b) => [b.id, b]));
const axisOf = (b) => Object.fromEntries(AXES.map((k) => [k, k === "copy" ? b.copy.key : String(b[k])]));

// feedback.jsonl is append-only, so the last line for an id is the current verdict
const votes = new Map();
if (existsSync(feedbackPath)) {
  for (const line of readFileSync(feedbackPath, "utf8").split("\n")) {
    if (!line.trim()) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    if (rec.verdict in SCORE) votes.set(rec.id, rec);
  }
}

/** Wilson score interval lower bound at ~95%, which is what stops n=2 from winning. */
function lowerBound(wins, n, z = 1.96) {
  if (!n) return 0;
  const p = wins / n;
  const d = 1 + (z * z) / n;
  return (p + (z * z) / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
}

function tally(keyFn) {
  const groups = new Map();
  for (const rec of votes.values()) {
    const b = byId.get(rec.id);
    if (!b) continue;
    for (const key of keyFn(b, axisOf(b))) {
      if (!groups.has(key)) groups.set(key, { n: 0, sum: 0, loves: 0, nos: 0 });
      const g = groups.get(key);
      g.n++;
      g.sum += SCORE[rec.verdict];
      if (rec.verdict === "love") g.loves++;
      if (rec.verdict === "no") g.nos++;
    }
  }
  return [...groups.entries()]
    .map(([key, g]) => ({ key, n: g.n, mean: g.sum / g.n, loves: g.loves, nos: g.nos, lb: lowerBound(g.sum, g.n) }))
    .sort((a, b) => b.lb - a.lb || b.n - a.n);
}

const fmt = (r) => `| ${r.key} | ${r.n} | ${(r.mean * 100).toFixed(0)}% | ${(r.lb * 100).toFixed(0)}% | ${r.loves} | ${r.nos} |`;

const lines = [];
lines.push("# Banner lab — what the votes say", "");
lines.push(`Banners: ${banners.length}. Votes: ${votes.size}. Scoring: love=1, good=.6, maybe=.3, no=0.`);
lines.push(`Ranked by Wilson lower bound, so a 2-vote fluke cannot outrank a 40-vote result. Tables need n ≥ ${MIN}.`, "");

if (!votes.size) {
  lines.push("No votes yet. Open the gallery, vote on banners, then run this again.", "");
}

for (const axis of AXES) {
  const rows = tally((b, a) => [a[axis]]).filter((r) => r.n >= MIN);
  if (!rows.length) continue;
  lines.push(`## ${axis}`, "", "| value | n | mean | lower bound | 🔥 | ✗ |", "|---|---|---|---|---|---|");
  lines.push(...rows.map(fmt));
  lines.push("");
}

// the pairs are the point: a single axis rarely decides a design on its own
const PAIRS = [];
for (let i = 0; i < AXES.length; i++) {
  for (let j = i + 1; j < AXES.length; j++) PAIRS.push([AXES[i], AXES[j]]);
}
const pairRows = [];
for (const [x, y] of PAIRS) {
  for (const r of tally((b, a) => [`${a[x]} × ${a[y]}`]).filter((r) => r.n >= MIN_PAIR)) pairRows.push({ ...r, x, y });
}
pairRows.sort((a, b) => b.lb - a.lb || b.n - a.n);

lines.push(`## combinations (${pairRows.length} with n ≥ ${MIN_PAIR})`, "");
if (pairRows.length) {
  lines.push("### best", "", "| combination | n | mean | lower bound | 🔥 | ✗ |", "|---|---|---|---|---|---|");
  lines.push(...pairRows.slice(0, 40).map(fmt));
  lines.push("", "### worst", "", "| combination | n | mean | lower bound | 🔥 | ✗ |", "|---|---|---|---|---|---|");
  lines.push(...pairRows.slice(-25).reverse().map(fmt));
} else {
  lines.push(`Nothing yet — no combination has ${MIN_PAIR} votes. Vote on more banners, or lower --min-pair.`);
}
lines.push("");

// how much of the design space has actually been seen, so an axis is not judged on its
// two most-voted values
const seen = new Map();
for (const rec of votes.values()) {
  const b = byId.get(rec.id);
  if (!b) continue;
  for (const k of AXES) seen.set(k, (seen.get(k) || 0) + 1);
}
lines.push("## coverage", "", "| axis | distinct values voted | banners available |", "|---|---|---|");
for (const k of AXES) {
  const distinct = new Set([...votes.values()].map((r) => byId.get(r.id)).filter(Boolean).map((b) => (k === "copy" ? b.copy.key : String(b[k])))).size;
  const total = new Set(banners.map((b) => (k === "copy" ? b.copy.key : String(b[k])))).size;
  lines.push(`| ${k} | ${distinct} | ${total} |`);
}
lines.push("");

// the whole axis vector of the best and worst banners, so the winner is reproducible
const scored = [...votes.values()]
  .map((rec) => ({ rec, b: byId.get(rec.id) }))
  .filter((s) => s.b)
  .map((s) => ({ ...s, score: SCORE[s.rec.verdict] }));
scored.sort((a, b) => b.score - a.score);

const describe = (b) => AXES.map((k) => `${k}=${k === "copy" ? b.copy.key : b[k]}`).join(" ");
lines.push("## individual banners", "");
lines.push("### loved", "");
for (const s of scored.filter((s) => s.rec.verdict === "love")) {
  lines.push(`- \`${s.b.id}\` ${describe(s.b)}${s.rec.comment ? ` — _${s.rec.comment}_` : ""}`);
}
lines.push("", "### rejected", "");
for (const s of scored.filter((s) => s.rec.verdict === "no")) {
  lines.push(`- \`${s.b.id}\` ${describe(s.b)}${s.rec.comment ? ` — _${s.rec.comment}_` : ""}`);
}
lines.push("");

const text = lines.join("\n");
writeFileSync(outPath, text);
console.log(text);
console.log(`-> ${outPath}`);
