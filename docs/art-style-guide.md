# Art style guide

**Revised** after Nathan sent real REBUILD Sim screenshots — the original
version of this doc guessed at a 2D pixel-art style with no way to verify
it (rebuildsim.com blocks automated fetches). That guess was wrong. This
version is based on actually looking at the reference.

## What REBUILD actually looks like

Not 2D pixel art. It's **flat-shaded, low-poly 3D** (this matches the
Chief Delphi thread's mention that it "requires WebGL2"):

- Near-black background outside the field — not a dark navy/charcoal UI
  color, closer to true black.
- The field itself is a **plain grey plane with white boundary/court
  lines** — no green carpet. Closer to a real FRC field's grey tile than
  a stylized "grass" look.
- Alliance structures (boiler, human player station, rotor towers) are
  **solid-color extruded rectangular prisms** — deep red / deep blue,
  no texture, no gradient, no outline detail. Reads like an architectural
  massing model, not a detailed robot render.
- Fuel = small **gold/yellow spheres**, rendered as real 3D spheres
  (hundreds of them scattered/bouncing), not sprites.
- Robots = simple **layered boxes** (a base chassis + a smaller box on
  top), alliance-colored.
- The gameplay camera is a **fixed oblique perspective camera** (not
  isometric, not top-down) — real perspective projection, which is why
  the field reads as a trapezoid on screen (far edge narrower than near
  edge). It appears to follow the player's robot while keeping this same
  angle, matching the master plan's own "full-field and follow modes"
  camera item.
- UI chrome (menus, HUD, stat bars) is plain 2D — flat dark panels, thin
  borders, a blocky/segmented font for big titles ("REBUILD" logo, screen
  headings) and a clean monospace for body text and stats (SPEED,
  ACCELERATION, FIRE RATE, etc., each with a horizontal bar meter).

## What this changes

**The master plan's tech stack listed rendering as "HTML Canvas 2D, or
PixiJS if effects are needed... top-down 2D."** That's the wrong tool for
this look — Canvas 2D can't cheaply do the perspective/depth that makes
REBUILD's field read as a 3D diorama. This project now uses **Three.js**
(WebGL) with flat/unlit materials (`MeshBasicMaterial` — no lighting
gradients, matching the reference exactly) and simple box/sphere
primitives instead.

This does **not** change the architecture rule that `sim/` stays pure 2D
game logic (field is still a flat plane in inches/feet, physics still
happens in 2D). `client/` is the only thing that knows those 2D positions
become a 3D scene — it lifts them into Three.js objects with a fixed
height per object type. That boundary is proven out in
`client/src/main.ts` already: `sim/` still only exports 2D field
dimensions, and 100% of the 3D-specific code lives in `client/`.

## Palette

| Role | Color | Hex |
|---|---|---|
| Background (void) | near-black | `#0a0a0a` |
| Field carpet | neutral grey | `#2a2a2a` |
| Field lines | off-white | `#e0e0e0` |
| Red alliance | red | `#c8433f` |
| Blue alliance | blue | `#3b6ea5` |
| Fuel (game piece) | gold | `#e8b23a` |
| Gear (game piece) | grey | `#8a8a8a` |
| Accent / robot turret / logo | amber | `#f0c419` |
| Body text | light grey | `#d8d8d8` |

No brass/copper/steampunk accent colors — the reference doesn't use them
despite the game's steampunk theme; it stays deliberately minimal.

## Fonts (both free, on Google Fonts)

- **Big titles / logo:** [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) — closest free match to
  REBUILD's blocky title lettering. Used sparingly, same as before.
- **Body / UI / stats:** [Space Mono](https://fonts.google.com/specimen/Space+Mono) — closer to REBUILD's clean
  technical monospace than the previous pick (VT323, which was too
  "typewriter" and not a good match once the actual reference was visible).

## What's already applied

`client/`'s placeholder page is now a real Three.js scene: a to-scale
field plane (27ft x 54ft4in) with boundary/center lines, viewed through a
fixed oblique camera, with a placeholder layered-box robot in alliance
red + amber. Verified with a real screenshot before shipping — see the
image sent alongside this update.

## Still open (for later, not blocking Stage 0)

- Exact camera distance/angle/follow behavior — current values were tuned
  just to frame the whole field; Stage 1 will tune this against an actual
  driving robot.
- Real robot/fuel/gear geometry beyond placeholder boxes/spheres.
- Whether REBUILD uses any lighting at all (this build currently uses
  none, matching the visibly flat shading in the screenshots) — worth
  a second look once real geometry exists and flat shading either does
  or doesn't feel right.
- HUD/menu chrome (title screen, lobby, stat bars) — not started; this
  pass was only the in-field 3D look.
