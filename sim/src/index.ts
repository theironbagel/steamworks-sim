// sim/ holds pure, deterministic game logic — field geometry, physics, and
// (later) scoring rules. It has no rendering code and no dependency on the
// browser or a server, so the exact same code can eventually run inside the
// client (for a solo match) and on a multiplayer server (as the referee),
// per the "keep sim/ separate from net/" rule in the master plan.

// --- Field geometry (2017 FIRST STEAMWORKS) ---
// Source: game manual, section "Field" — 27 ft x 54 ft 4 in.
// Exact drawing-derived geometry (walls, airship, boilers, hoppers) will
// replace/extend this in data/field/ during the rest of Stage 0.
export const FIELD_WIDTH_IN = 27 * 12; // 324 in
export const FIELD_LENGTH_IN = 54 * 12 + 4; // 652 in
export const FIELD_ASPECT_RATIO = FIELD_WIDTH_IN / FIELD_LENGTH_IN;
