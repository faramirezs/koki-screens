# Roadmap (deferred): banner corpus → blueprint library

**Status: not implemented. v1 ships with exactly the hand-designed `menu-board` template
plus the `promo` template.** This file records the intended work so a future run can pick
it up without re-deriving the design.

`corpus/` is an empty, git-ignored folder reserved for this work.

## Steps

1. **Collect 30–50 landscape screen/ad references.** Owned creatives first. Public ad
   libraries may be used for **visual analysis only** — no third-party artwork is copied,
   redistributed or shipped in this repository.
2. **Annotate each reference:** normalized element boxes (0–1 coordinates), hierarchy,
   reading order, timing of each element, safe areas actually used, asset counts, type
   sizes, contrast.
3. **Extract patterns:** components (price lockups, badges, rules, tier rows, legal
   strips), composition rules (grids, ratios, margins), motion presets (entrances, holds,
   exits) — normalized, not copied.
4. **Promote to blueprints** only when a pattern passes all of:
   - it appears across multiple independent campaigns, not once;
   - it can be expressed without copying anyone's artwork (structure, not surface);
   - it adapts to at least three aspect classes (landscape, portrait, square);
   - it survives text stress tests (long German dish names, 3 tiers, two-line legal).
5. **Target structure once done:** `src/patterns/{components,compositions,motion}` and
   `templates/blueprints/`.

## Why it is deferred

The generator's value is in the guarantees (no invented prices, legible type, exact loop
seam, deterministic frames), and those are already encoded in the two templates. A
blueprint library only pays off once there is a corpus to derive it from, and that
requires real creatives rather than synthetic ones. Shipping unvalidated blueprints would
mean shipping guesses with a design-system label on them.

## Licence hygiene for step 1

- Store only annotations (boxes, timings, notes) in the repository, never the images.
- Record provenance per reference: source, date, campaign, licence.
- Do not train, fine-tune or redistribute on the corpus.
