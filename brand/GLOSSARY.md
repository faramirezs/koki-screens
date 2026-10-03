# Brand

The source of truth for how KoKitchen looks on a screen. Both the banner lab and the screen ad
generator read this context; neither may define a colour of its own.

**Identity**: the adopted palette, type and voice for KoKitchen screens. Defined in
`identity.md`, and deliberately narrower than the colours that appear in the supplied source
files.
_Avoid_: style guide, design system, brand book

**Palette**: a named set of colour tokens that a Banner or a Screen ad draws from. A palette is
a complete set — no Banner mixes tokens from two.
_Avoid_: theme, colour scheme, swatch

**Token**: one named CSS custom property in `tokens.css`. The only legal way to name a colour.
_Avoid_: variable, constant, colour

**Ground**: the surface a colour is actually painted on. Contrast is always measured against the
Ground, never against white by default.
_Avoid_: background, base, surface

**Contrast floor**: 4.5:1 — the minimum a text pair may have. 7:1 is preferred, never required.
Orange `#FF7D00` fails the floor on any light Ground and is legal there only as a fill behind
dark text.
_Avoid_: minimum, threshold, AA
