/*
 * gallery.js — the lab UI.
 *
 * Cards are created for every banner, but the banner DOM and its GSAP timeline only exist
 * while the card is near the viewport, so a thousand banners stay usable on one page.
 *
 * A verdict is posted with the banner's full axis vector, never just the id: that is what
 * makes "which combination is good" answerable instead of a memory test.
 */
import { renderBanner, animate, measure, settle } from "./lab.js";
import { AXES, MODES, MODE_NAMES, variesIn } from "./space.mjs";

const VERDICTS = [
  { key: "love", label: "🔥", title: "love it" },
  { key: "good", label: "✓", title: "good" },
  { key: "maybe", label: "~", title: "maybe" },
  { key: "no", label: "✗", title: "no" },
];

const state = {
  banners: [],
  feedback: new Map(), // id -> verdict
  filters: {},
  mode: MODE_NAMES[0], // the workflow starts at composition and works up to the whole scene
  onlyFlagged: false,
  hideRejected: false,
  paused: false,
  sort: "shuffle",
  shuffleSeed: 20261001,
  limit: 120,
  live: new Map(), // id -> { tl, bn }
};

const $ = (s) => document.querySelector(s);

// ------------------------------------------------------------------ data

async function boot() {
  // the banner type is a webfont, and every measurement below depends on its metrics
  await document.fonts.ready;
  state.banners = await fetch("banners.json").then((r) => r.json());
  try {
    const txt = await fetch("/feedback").then((r) => r.text());
    for (const line of txt.split("\n").filter(Boolean)) {
      const rec = JSON.parse(line);
      state.feedback.set(rec.id, rec.verdict);
    }
  } catch { /* no feedback yet */ }

  buildModes();
  buildFilters();
  buildGrid();
  $("#modes").addEventListener("click", (e) => {
    const btn = e.target.closest(".mode");
    if (btn) setMode(btn.dataset.mode);
  });
  $("#legend").textContent =
    "Each card shows its full axis vector. Vote on any you have an opinion about; " +
    "the votes are written to feedback.jsonl with the axes and the mode, so the next wave can be biased toward what works.";
}

// ------------------------------------------------------------------ modes

/**
 * The mode bar: the question each Mode asks, in workflow order.
 *
 * The mode is not a view setting, it is the experiment. A vote cast in `composition` and a vote
 * cast in `motion` are answers to different questions, so the mode travels with the vote and the
 * analysis keeps the two apart.
 */
function buildModes() {
  const wrap = $("#modes");
  wrap.innerHTML = MODE_NAMES.map((m, i) => {
    const n = state.banners.filter((b) => b.mode === m).length;
    return `<button class="mode" data-mode="${m}">
      <b>${i + 1}. ${MODES[m].label}</b>
      <span>${MODES[m].question}</span>
      <em>${n} banners &middot; varies ${variesIn(m).size} of ${AXES.length} axes</em>
    </button>`;
  }).join("");
  for (const btn of wrap.querySelectorAll(".mode")) btn.classList.toggle("on", btn.dataset.mode === state.mode);
}

function setMode(mode) {
  if (!MODES[mode] || mode === state.mode) return;
  state.mode = mode;
  state.filters = {};
  state.limit = 120;
  buildModes();
  buildFilters();
  buildGrid();
}

/**
 * The axis vector of a Banner, as shown on the card and recorded with every vote.
 *
 * Derived from AXES rather than hand-listed. A hand-written copy of this list here silently
 * dropped `bgEnergy` and `roleMotion` from every card and every vote the moment those axes were
 * added, and nothing failed - the card just printed "undefined" and the vote stored a vector
 * that was missing two fields. There is one list, and this reads it.
 */
function axesOf(b) {
  return Object.fromEntries(AXES.map((k) => [k, k === "copy" ? b.copy.key : b[k]]));
}

// ------------------------------------------------------------------ filters

function buildFilters() {
  const wrap = $("#filters");
  wrap.textContent = "";
  // Only the axes this Mode varies. A filter for an axis the Mode holds still could never do
  // anything - every banner in the deck has the same value for it - and offering it would
  // suggest a variable that is not being tested.
  for (const axis of AXES.filter((a) => variesIn(state.mode).has(a))) {
    const values = [...new Set(state.banners.map((b) => axesOf(b)[axis]))].sort();
    const sel = document.createElement("select");
    sel.dataset.axis = axis;
    sel.innerHTML = `<option value="">${axis}: any</option>` + values.map((v) => `<option value="${v}">${axis}: ${v}</option>`).join("");
    sel.addEventListener("change", () => {
      state.filters[axis] = sel.value;
      buildGrid();
    });
    wrap.appendChild(sel);
  }
}

// ------------------------------------------------------------------ grid

function visible(b) {
  if (b.mode !== state.mode) return false;
  const a = axesOf(b);
  for (const [axis, v] of Object.entries(state.filters)) if (v && a[axis] !== v) return false;
  if (state.hideRejected && state.feedback.get(b.id) === "no") return false;
  return true;
}

/** Deterministic shuffle, so "reshuffle" is reproducible from its seed. */
function shuffled(list, seed) {
  const out = [...list];
  let s = seed >>> 0 || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function ordered() {
  let list = state.banners.filter(visible);
  if (state.onlyFlagged) list = list.filter((b) => measureKnown(b).length);
  if (state.sort === "shuffle") return shuffled(list, state.shuffleSeed);
  if (state.sort === "unseen") return list.sort((a, b) => (state.feedback.has(a.id) ? 1 : 0) - (state.feedback.has(b.id) ? 1 : 0));
  if (state.sort === "liked") return list.sort((a, b) => (state.feedback.get(b.id) === "love" ? 1 : 0) - (state.feedback.get(a.id) === "love" ? 1 : 0));
  return list;
}

let observer;

function buildGrid() {
  for (const { tl } of state.live.values()) tl?.kill();
  state.live.clear();
  if (observer) observer.disconnect();

  const grid = $("#grid");
  grid.textContent = "";
  const full = ordered();
  const list = full.slice(0, state.limit);

  observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const id = e.target.dataset.id;
      if (e.isIntersecting) mount(e.target, state.banners.find((b) => b.id === id));
      else unmount(id);
    }
  }, { rootMargin: "600px 0px" });

  for (const b of list) {
    grid.appendChild(cardShell(b));
  }
  for (const shell of grid.querySelectorAll(".card")) observer.observe(shell);

  if (full.length > list.length) {
    const more = document.createElement("button");
    more.id = "more";
    more.textContent = `show ${Math.min(120, full.length - list.length)} more of ${full.length - list.length}`;
    more.addEventListener("click", () => {
      state.limit += 120;
      buildGrid();
    });
    grid.appendChild(more);
  }
  $("#count").textContent = `${list.length} of ${full.length} matching · ${state.banners.length} total`;
}

function cardShell(b) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.id = b.id;

  const stage = document.createElement("div");
  stage.className = "card__stage";
  card.appendChild(stage);

  const meta = document.createElement("div");
  meta.className = "card__meta";

  const flags = measureKnown(b);
  const idRow = document.createElement("div");
  idRow.className = "card__id";
  idRow.innerHTML = `<code>${b.id}</code>` + flags.map((f) => `<span class="flag flag--${f === "overflow" ? "bad" : "warn"}">${f}</span>`).join("");
  meta.appendChild(idRow);

  const axes = document.createElement("div");
  axes.className = "card__axes";
  const a = axesOf(b);
  axes.innerHTML = AXES.map((k) => `<span class="axis"><b>${k}</b> ${a[k]}</span>`).join("");
  meta.appendChild(axes);

  const verdicts = document.createElement("div");
  verdicts.className = "card__verdicts";
  for (const v of VERDICTS) {
    const btn = document.createElement("button");
    btn.textContent = v.label;
    btn.title = v.title;
    btn.dataset.verdict = v.key;
    btn.addEventListener("click", () => vote(b, v.key, card, btn));
    verdicts.appendChild(btn);
  }
  meta.appendChild(verdicts);

  const note = document.createElement("input");
  note.className = "card__note";
  note.placeholder = "why? (optional, saved with the vote)";
  note.addEventListener("change", () => vote(b, state.feedback.get(b.id) || "note", card, null, note.value));
  meta.appendChild(note);

  card.appendChild(meta);
  paintVerdict(card, state.feedback.get(b.id));
  return card;
}

/** Static flags we can compute without the DOM, so they survive unmounting. */
const KNOWN = new WeakMap();
function measureKnown(b) {
  return KNOWN.get(b) || [];
}

function mount(shell, b) {
  if (!b || state.live.has(b.id)) return;
  const stage = shell.querySelector(".card__stage");
  const bn = renderBanner(b);
  const scale = stage.clientWidth / b.width;
  const inner = document.createElement("div");
  inner.className = "card__inner";
  inner.style.transform = `scale(${scale})`;
  inner.appendChild(bn);
  stage.textContent = "";
  stage.appendChild(inner);

  // everything below reads geometry, so wait for the webfont and the fit pass that depends on it
  settle(bn).then(() => {
    // Switching Mode rebuilds the grid, so this card may have been unmounted and re-mounted
    // while the fit pass was still running. Registering the timeline then would animate a banner
    // that is no longer in the DOM and leave the card that IS in the DOM with no timeline at all,
    // stuck at its settled pose. Check that this mount is still the one on screen.
    if (!shell.isConnected || stage.firstElementChild !== inner || state.live.has(b.id)) return;
    const flags = measure(bn);
    KNOWN.set(b, flags);
    const idRow = shell.querySelector(".card__id");
    idRow.innerHTML = `<code>${b.id}</code>` + flags.map((f) => `<span class="flag flag--${f === "overflow" ? "bad" : "warn"}">${f}</span>`).join("");
    shell.classList.toggle("card--flagged", flags.length > 0);

    // `animate` returns null for a Mode that has no Timeline: composition and background are
    // settled stills, and composition also freezes the background sheets.
    const tl = animate(bn, b);
    if (tl && !state.paused) tl.play();
    state.live.set(b.id, { tl, bn, shell });
  });
}

function unmount(id) {
  const live = state.live.get(id);
  if (!live) return;
  live.tl?.kill();
  live.shell.querySelector(".card__stage").textContent = "";
  state.live.delete(id);
}

// ------------------------------------------------------------------ feedback

function paintVerdict(card, verdict) {
  card.classList.toggle("card--liked", verdict === "love");
  card.classList.toggle("card--rejected", verdict === "no");
  for (const btn of card.querySelectorAll(".card__verdicts button")) {
    btn.classList.toggle("on", btn.dataset.verdict === verdict);
  }
}

async function vote(b, verdict, card, btn, comment) {
  state.feedback.set(b.id, verdict);
  paintVerdict(card, verdict);
  try {
    await fetch("/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: b.id, mode: b.mode, verdict, comment: comment || undefined, axes: axesOf(b), palette: b.palette, copy: b.copy }),
    });
  } catch (e) {
    console.warn("feedback not saved", e);
  }
  if (btn) btn.blur();
}

// ------------------------------------------------------------------ controls

document.addEventListener("change", (e) => {
  if (e.target.id === "only-flagged") { state.onlyFlagged = e.target.checked; buildGrid(); }
  if (e.target.id === "hide-rejected") { state.hideRejected = e.target.checked; buildGrid(); }
  if (e.target.id === "sort") { state.sort = e.target.value; state.limit = 120; buildGrid(); }
  if (e.target.id === "pause") {
    state.paused = e.target.checked;
    for (const { tl } of state.live.values()) if (tl) state.paused ? tl.pause() : tl.play();
  }
});

$("#reshuffle").addEventListener("click", () => {
  state.shuffleSeed = (state.shuffleSeed * 1103515245 + 12345) >>> 0;
  state.limit = 120;
  buildGrid();
});

$("#export").addEventListener("click", async () => {
  const txt = await fetch("/feedback").then((r) => r.text());
  const box = $("#export-box");
  box.hidden = false;
  box.value = txt || "(no feedback yet)";
  box.select();
});

boot();
