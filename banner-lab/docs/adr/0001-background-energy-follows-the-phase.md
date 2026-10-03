# Background energy follows the Phase, not a constant speed

Every Banner's background is a set of oversized gradient sheets sliding past each other. The
distance they travel is scaled by a Phase-aware `--energy`: loud during Intro and Tail, quiet
during Hold. The alternative — one constant speed for all twelve seconds, which is what v2
shipped — kept the board feeling alive but left the copy competing with its own background for
the whole readable stretch. The trade-off is deliberate: the background stops being a metronome,
and a Banner whose energy curve is wrong now reads as *dead* during Hold rather than merely busy.

Reversing this means re-sampling the deck and discarding every Vote cast against `bgEnergy`,
because the axis is recorded in each Vote's vector.
