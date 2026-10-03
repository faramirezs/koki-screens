# Glossary Map

Three contexts, each with its own vocabulary. The **shared language** below is authoritative
for the words more than one context uses — when a context glossary and this file disagree,
this file wins.

## Contexts

- [Brand](./brand/GLOSSARY.md) — the palette, type and voice the other two draw from.
- [Banner lab](./banner-lab/GLOSSARY.md) — explores the design space and judges what works.
- [Screen ad generator](./screen-ad-generator/GLOSSARY.md) — produces the ads that ship.

## Shared language

**Screen ad**: one finished, exported ad at a profile's geometry, ready for a player. Only the
generator makes these.
_Avoid_: creative, banner, asset, output

**Banner**: one animated 1920×1080 composition rendered by the banner lab so a human can judge
it. A candidate. Never shipped.
_Avoid_: creative, ad, design

**Scene**: one timed visual composition. The unit a timeline is built for.
_Avoid_: slide, frame, screen, board

**Element**: an independently animated visual object inside a Scene.
_Avoid_: actor, layer, node, item

**Role**: what an Element is *for* — copy, media, badge, decor, panel. A Role carries hierarchy;
it is not the Element itself.
_Avoid_: type, kind, category, slot

**Placement**: where an Element comes to rest. Owned by the layout. A motion never decides a
Placement, and a Placement is never expressed as a motion.
_Avoid_: position, coordinates, destination

**Motion**: the umbrella for everything an Element does over time. Three states, always in this
order: Enter, Idle, Exit.
_Avoid_: animation, transition, effect

**Preset**: one reusable named movement for **one** Element — `riseIn`, `popIn`, `breath`,
`driftUp`. A Preset belongs to the generator.
_Avoid_: animation, effect, transition, **motion preset**

**Motion family**: the single gesture a Scene imposes on **every** Element at once — a
direction, a travel and an ease. The lab's `motion` axis holds these (`slamLeft`, `spinSlam`).
A Motion family is not a Preset: a Preset moves one Element, a family moves the whole Scene.
_Avoid_: motion preset, animation style

**Choreography**: how the Motion family is assigned and ordered across the Elements of one
Scene — who enters when, and who leaves first.
_Avoid_: motion, animation, sequence

**Timeline**: when things happen in a Scene.
_Avoid_: schedule, sequence, program

**Blueprint**: a pattern promoted from a corpus of **real** creatives, once it repeats across
independent campaigns, can be expressed as structure rather than surface, adapts to three
aspect classes, and survives text stress tests. A winner in the banner lab is **not** a
Blueprint — see `screen-ad-generator/references/corpus-roadmap.md`.
_Avoid_: template, recipe, pattern, winner

**Mode**: the question a deck of Banners asks, expressed as the axes it is allowed to vary while
it holds everything else fixed. Four, in workflow order: **Composition**, **Background**,
**Motion**, **Scene**. A Mode is a property of the lab's deck, not of a Scene.
_Avoid_: tab, view, filter, variant, test

## Relationships

- **Brand → both**: `brand/tokens.css` is the palette seam. A change there changes both
  contexts, so a palette question is a brand question, not a lab question.
- **Banner lab → screen ad generator**: one direction only. The lab discovers which
  combinations work; the generator ships. Nothing the lab renders is a deliverable.
- **Blueprint boundary**: a lab Banner is synthetic, so it can never satisfy the corpus
  roadmap's promotion rule. Lab findings become *evidence for a blueprint*, never a blueprint.
- **Mode order is a dependency order**: a Composition is judged before a Background is chosen for
  it, and a Background before choreography is judged over it, because each later question assumes
  the earlier answer. Judging Motion over an unsettled Composition measures the Composition.
- **Votes do not cross Modes.** A Vote is about the axes its Mode varies; pooling a Composition
  Vote with a Motion Vote averages two different questions into one answer that means neither.
