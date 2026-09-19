# data/field/

`steamworks-2017.json` — field geometry transcribed from the official 2017
FIRST STEAMWORKS Game Manual (Section 3: Arena) and cross-referenced against
the field drawing PDFs FIRST publishes for teams. See the file's own
`_source` block for links.

**Status:** sizes, heights, and distances-from-reference (e.g. "13 ft 9.5 in
from the alliance wall") are transcribed directly from the manual and are
reliable. Exact X/Y placement of the airship and boiler within the field
(the `coords` blocks) is a first-pass draft based on the field's symmetry,
not yet checked pixel-for-pixel against the dimensioned drawings — that
check happens naturally once Stage 1 needs real collision boxes, since
getting a robot to bounce off a wall in the wrong spot will surface any
placement error immediately.

`sim/src/index.ts` currently only reads the outer field dimensions from
here (324in x 652in). It will read the rest once Stage 1 (field collision)
starts.
