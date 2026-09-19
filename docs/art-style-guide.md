# Art style guide (draft — needs your approval)

Note up front: I couldn't actually see screenshots of rebuildsim.com (its
site blocks automated fetches, and text search of discussion threads didn't
turn up a real visual description) — so this is my own proposal for a
"retro pixel-art" look fitting STEAMWORKS' steampunk theme, not a traced
copy of REBUILD's actual palette. If you can send me a screenshot or two of
REBUILD, I'll adjust this to match it more closely.

## Direction

Top-down 2D pixel art (not vector/flat-shaded, not 3D/WebGL) — sprites and
tiles snapped to a grid, in the style of retro arcade/strategy games. This
also happens to be cheap to render, which matters given the plan's target
of 6 players + spectators on school Wi-Fi.

**Grid unit:** 8px sprite grid (a robot sprite is a multiple of 8px, e.g.
32x32 or 40x40 for wider robots) so field art, robots, and fuel line up
without sub-pixel blur.

## Palette

Steampunk-leaning: warm brass/copper accents against dark backgrounds, kept
to a small, deliberate set of colors (a hallmark of good pixel art — avoid
gradients).

| Role | Color | Hex |
|---|---|---|
| UI background | charcoal | `#1a1a2e` |
| Field carpet | field green | `#2f6b3a` |
| Field lines / carpet detail | pale line | `#e8e8e0` |
| Brass / copper accent (boiler, gears, UI trim) | brass | `#b8823c` |
| Steel accent (airship structure) | steel blue-grey | `#5b7a94` |
| Red alliance | red | `#c8433f` |
| Blue alliance | blue | `#3b6ea5` |
| Fuel (game piece) | warm orange | `#e8944a` |
| Gear (game piece) | brass, darker | `#8a6a3a` |
| Warning / low-goal glow | amber | `#f0c419` |
| Body text | warm off-white (never pure white) | `#f0ead6` |

## Fonts (both free, on Google Fonts)

- **Headings / HUD numbers:** [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) — the classic blocky
  arcade look. Used sparingly (titles, score, timer) since it's hard to
  read at small sizes or in long lines.
- **Body / UI text:** [VT323](https://fonts.google.com/specimen/VT323) — a pixel-style font that stays
  readable in menus, tooltips, and instructions.

## What's already applied

`client/`'s placeholder page now uses this palette and these fonts, so you
can see it live on the deployed site rather than judging it from hex codes.

## Still open (for later, not blocking Stage 0)

- Actual robot/fuel/gear sprites — placeholder shapes for now, real pixel
  art once the drive slice (Stage 1) needs something to render.
- Field texture (carpet weave, wear marks) vs. flat fill — flat fill for
  now, texture is a nice-to-have polish pass.
