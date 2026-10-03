# Lab modes split the deck, not the renderer

The scene deck varies thirteen axes at once. That is the right instrument for finding a Banner you
like and the wrong one for finding out *why* you like it: a preference expressed over that deck
cannot be attributed to any single axis, because every axis is different in every pair of Banners.

So the deck is now split into four **Modes**. A Mode is the question a deck asks, expressed as the
axes it is allowed to vary. Everything it does not vary is pinned to the **Reference Scene**, so
Banners within a Mode vary only the axes belonging to the subsystem under study, and every axis
outside that subsystem stays fixed:

| Mode | varies | holds |
|---|---|---|
| composition | palette, layout, type, badge, cta, product, decor | background, energy, motion, role motion, copy, photo |
| background | background, energy | the other eleven |
| motion | motion, role motion | the other eleven |
| scene | everything | nothing |

This is not a one-variable A/B test and does not claim to be. Composition mode varies **seven** axes
at once — it is the design problem cut into subsystems, each judged with the others held still, not
seven separate experiments. What makes a Mode readable is that nothing *outside* its subsystem
moves, so a preference expressed in it is about that subsystem and not about the other six.

**There is still one renderer.** A Mode does not select a different code path through `lab.js`; it
decides which of two Timelines to build, and whether the background sheets run. The two Timelines
are the background's energy and the cast's choreography, and they are independent: Background mode
builds the first and not the second, Motion and Scene build both, Composition builds neither. This
split is load-bearing rather than tidy. `bgEnergy` is a curve on `--energy` driven by the energy
Timeline, so while both lived in one builder, Background mode — which builds no cast — rendered all
four energy values identically and measured nothing.

**"Show the settled Composition" is not a feature, it is the absence of one.** Every Element already
sits at its settled pose in CSS. The Timeline is only ever what moves it *away* from that pose. So
Composition mode builds no Timeline and gets the settled frame for free, and it cannot drift out of
agreement with the other Modes, because there is nothing to keep in agreement.

**The Reference Scene is declared, not derived.** Background and Motion mode can only isolate their
own axis if the Composition behind it holds still — but the lab has no validated Composition to
point at, because no Votes have been cast. So `REFERENCE` in `space.mjs` names one axis vector
outright, and every Mode reads it without knowing which values are in it. Re-point it at the winner
of Composition mode once that mode has Votes; nothing else changes.

**A Mode that pins most of its axes has a small space, and is covered completely.** Background mode
varies two of thirteen, which is forty Banners in total, and the deck contains all forty. Covering
it completely is the difference between "we looked at some backgrounds" and "we looked at the
backgrounds".

The trade-off is that a Vote in one Mode is not comparable with a Vote in another: they answer
different questions, and averaging them produces a number that answers neither. `analyze.mjs`
therefore reports per Mode and never pools, and a Vote carries the Mode it was cast in.

Reversing this means re-sampling the deck and discarding every Vote, because the Mode is part of
what a Vote is about.
