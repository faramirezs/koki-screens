# Banner lab

A design-space search. It renders Banners so a human can vote on them, then joins the votes
back to the axis values that produced them. It never ships anything.

Shared terms — Banner, Scene, Element, Role, Placement, Motion, Motion family, Choreography,
Timeline, Preset, Blueprint — are defined in the [glossary map](../GLOSSARY-MAP.md).

## The design space

**Mode**: the question a Deck asks, expressed as the axes it is allowed to vary. There are four,
always in this order: **Composition** (does this design work as a still?), **Background** (does the
background support the content, or compete with it?), **Motion** (does the choreography read, and
does it suit each Role?), **Scene** (does the whole thing work together?). One renderer serves all
four; a Mode decides only whether a Timeline is built and whether the background sheets run.
_Avoid_: tab, view, filter, variant, test mode

**Reference Scene**: the one axis vector every Mode holds fixed while it studies something else.
It is declared in `space.mjs` rather than derived from Votes, because the lab had none when the
Modes were introduced, and it is the thing to re-point once Composition mode has some.
_Avoid_: baseline, default, control (a control is a *value within* an axis — `flat`, `uniform` —
not the whole vector around it)

**Design space**: the set of axes the sampler draws from, and the values each axis may take.
_Avoid_: option space, parameter space, config

**Axis**: one independent dimension of the design space. A Banner is exactly one value per axis.
_Avoid_: dimension, parameter, variable, field

**Deck**: the whole set of Banners built in one sampling run, after the coverage rules have been
applied.
_Avoid_: set, batch, collection, export

**Coverage**: the sampler's guarantee that every value of every axis appears in the Deck at
least a minimum number of times, and that no axis is starved by the ones drawn before it.
_Avoid_: balance, distribution

**Photo**: one image the deck may place. Photos are pooled, never chosen per Banner.
_Avoid_: image, asset, picture

**Cutout**: a Photo with its background removed, so the subject can float over the background
treatment instead of sitting in a frame.
_Avoid_: matte, mask, alpha, transparent png

## Motion and time

**Phase**: a named stretch of the loop. There are five, always in this order: **Intro**
(background alone), **Reveal** (the panel and its Elements enter), **Hold** (the readable
stretch), **Exit** (the Elements leave), **Tail** (background alone again).
_Avoid_: stage, step, segment

**Enter**: an Element travelling from outside the composition to its Placement. Enter ends the
moment the Element is settled — overshoot and spring are part of Enter, not a phase after it.
_Avoid_: intro, entrance animation, build

**Idle**: the small movement an Element makes between Enter and Exit. Never enough to take it
off its Placement.
_Avoid_: hold, float, breathing, wait

**Exit**: an Element leaving the composition.
_Avoid_: outro, teardown

**Settled composition**: the whole composition during Hold, once every Element has finished
Entering. It is the state a viewer actually reads, and the only state worth judging on
legibility.
_Avoid_: final state, rest state, assembled screen

**Role motion**: how much of the Motion family each Role takes. The family is decided once per
Scene so the board reads as a single gesture; Role motion decides who carries it.
_Avoid_: per-element animation, hierarchy

**Background energy**: how far the background treatment travels during a Phase. High energy
suits Intro and Tail; low energy stops the background competing with the copy during Hold.
_Avoid_: background speed, intensity

**Energy timeline**: the Timeline that drives Background energy. It is separate from the
Choreography timeline because Background mode varies `bgEnergy` and nothing else — a Mode that
builds no Choreography must still build this, or all four energy values render identically.
_Avoid_: background animation

**Choreography timeline**: the Timeline that drives the panel and the cast: Enter, Idle, Exit.
_Avoid_: motion timeline, element timeline

## Judging

**Vote**: one judgement of a Banner — love, good, maybe or no — stored together with the
Banner's full axis vector, never against the Banner's id alone.
_Avoid_: rating, score, like

**Report**: the per-axis and per-pair ranking derived from the Votes, ranked by the Wilson lower
bound so a well-liked combination with three votes cannot outrank a good one with forty.
_Avoid_: results, analysis, summary
