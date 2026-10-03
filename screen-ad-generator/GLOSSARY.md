# Screen ad generator

Turns a content spec and a brand file into a finished Screen ad, with guarantees: no invented
prices, legible type, an exact loop seam, and frames that are identical on every machine.

Shared terms — Screen ad, Scene, Element, Role, Placement, Motion, Preset, Choreography,
Timeline, Blueprint — are defined in the [glossary map](../GLOSSARY-MAP.md).

## Authoring

**Plan**: the plain JSON that describes a timeline. Compiled into a GSAP timeline; raw GSAP is
never hand-written.
_Avoid_: script, config, timeline file

**Beat**: one Preset applied to one selector at an absolute time inside a Scene.
_Avoid_: step, cue, keyframe, event

**Base scene**: the Scene that is on screen from t=0 and must already be settled at t=0, so a
customer walking up mid-loop never sees a half-built board.
_Avoid_: background scene, primary scene

**Overlay**: any later Scene. It must declare when it fades in and must finish fading out before
the loop ends.
_Avoid_: layer, popup, insert

**Template**: a hand-designed Scene implementation — currently `menu-board` and `promo`.
_Avoid_: theme, skin, layout

## Inputs

**Content spec**: `content.json` — the items, prices, allergen codes and promo copy a build
renders. The only source of what may appear on a screen.
_Avoid_: data, content, payload

**Brand file**: `brand.json` — the colours, fonts and logo a build renders with. Derived from
`brand/tokens.css`.
_Avoid_: theme, style, skin

**Profile**: a file that fixes output geometry and encoder settings. Never edited to make a
variant; add a file.
_Avoid_: preset, mode, format, setting

## Guarantees

**Report**: the build's audit output. It is read before anything is handed over, not after.
_Avoid_: log, output, summary

**Policy**: a rule the validator enforces that a schema cannot express — a price may not be
invented, a legal strip may not animate, nothing may flash faster than 3 Hz.
_Avoid_: rule, constraint, lint

**Loop seam**: the property that the last frame and the first frame are identical, so the ad can
repeat forever without a visible jump.
_Avoid_: cycle, wrap, boundary
