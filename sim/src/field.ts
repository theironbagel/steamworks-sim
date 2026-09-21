// Field collision geometry (2017 FIRST STEAMWORKS).
//
// Everything here is inches, in the coordinate system data/field/'s JSON
// defines: origin at the blue alliance wall's near-side (low-Y) corner,
// +X along the long axis toward the red wall, +Y along the short axis.
// This file turns dimensions into concrete 2D shapes (rectangles, one
// hexagon per alliance) that sim/physics.ts feeds to Rapier2D as static
// colliders, and that client/ uses to draw the matching 3D structures.
//
// ---------------------------------------------------------------------
// SOURCING (third review pass -- read this before changing a number)
// ---------------------------------------------------------------------
// Nathan supplied a SolidWorks part file of the field. It could not be
// used: it's a ~100MB proprietary binary with no OLE container, no
// embedded STEP/Parasolid/mesh, and no readable feature names (only
// "BREP_n-surfaceN" placeholders, i.e. an imported dumb solid), so
// nothing in this project's toolchain can read its geometry. If that
// file is ever exported to STEP or STL, it becomes the best source for
// this file and should supersede the numbers below.
//
// Instead, every dimension below is now transcribed from the official
// 2017 Game Manual, Section 3 (Arena) -- the authoritative text source.
// That pass CONFIRMED most of what earlier estimate-driven passes had
// already guessed, and the confirmations are worth recording so nobody
// re-litigates them:
//
//   CONFIRMED against the manual, do not "fix" these:
//     - field 27ft x 54ft4in (324 x 652)
//     - boiler base 3ft6in x 3ft6in x 8ft1in tall (42 x 42 x 97)
//     - high goal 1ft9.5in dia (21.5) at 8ft1in (97), offset 1ft5.5in (17.5)
//     - low goal 2ft1in x 8.75in (25 x 8.75) at 1ft6in (18) up
//     - airship deck 5ft10.5in (70.5) wide, 3ft0.5in (36.5) above carpet
//     - airship rail hex 8ft5in (101) wide, 3ft6.5in (42.5) above the deck
//     - airship wall flare 75 degrees; ports 13in x 19.5in
//     - hoppers 2ft2.5in x 1ft11.25in x 3ft10in (26.5 x 23.25 x 46)
//     - hopper offsets 13ft9.5in (165.5) and 6ft6.5in (78.5) from the walls
//     - return panel 6ft3.5in x 6ft6in tall (75.5 x 78)
//     - overflow panel 2ft6in x 6ft6in tall (30 x 78)
//     - loading openings 2ft x 7.5in at 2ft1in up (24 x 7.5 at 25)
//     - base line 7ft9.25in (93.25) from the alliance wall
//     - starting line 2ft6in (30) from the alliance wall
//     - key far edge 4ft4in (52) from the boiler's front face
//     - retrieval zone far edge 3ft6in (42) from the loading station face
//     - touchpad 4ft10in (58) up; steam tank 6ft tall, 2ft diagonal
//
//   DERIVED, with the derivation shown so it can be checked:
//     - AIRSHIP_CENTER_X_FROM_WALL_IN (198). The manual never states this
//       directly, but it does define the LAUNCHPAD line as "collinear
//       with the edge of the AIRSHIP deck that is closest to the center
//       of the FIELD." With the deck modelled flat-face-toward-the-wall
//       (see AIRSHIP_* below), that edge is 35.25in (half of the 70.5in
//       flat-to-flat) past the deck's center, so launchpad = center +
//       35.25. An earlier pass measuring a reference photo put the
//       center at ~198, which puts the launchpad lines at 233.25 and
//       leaves a neutral zone of 652 - 2*233.25 = 185.5in -- and 185.3
//       is one of the unexplained dimension callouts an earlier pass
//       pulled out of 2017FieldAssembly.pdf's text. Two independent
//       routes landing within 0.2in of each other is good enough to
//       promote this from "estimate" to "derived."
//
//   STILL AN ESTIMATE (flagged honestly):
//     - Which corner the loading stations occupy. The manual says the
//       return station is in "the corner opposite the boiler" with no
//       coordinates. We read that as the same alliance end, on the
//       scoring-table (y=0) side, and angle it across the corner. The
//       45-degree corner placement of both the boiler and the return
//       station matches the reference photos Nathan supplied.
//     - OVERFLOW_OFFSET_FROM_CORNER_IN: no numeric station pitch is
//       given anywhere, so this is still a rough offset along the wall.

export const FIELD_WIDTH_IN = 27 * 12; // 324 -- short axis (Y)
export const FIELD_LENGTH_IN = 54 * 12 + 4; // 652 -- long axis (X)
export const FIELD_MID_X_IN = FIELD_LENGTH_IN / 2; // 326
export const FIELD_MID_Y_IN = FIELD_WIDTH_IN / 2; // 162

/** Which long edge (Y=0 or Y=FIELD_WIDTH_IN) the scoring table sits on. Arbitrary but fixed. */
export const SCORING_TABLE_Y_IN = 0;
export const FAR_SIDE_Y_IN = FIELD_WIDTH_IN;

export const WALL_THICKNESS_IN = 2;

export type Alliance = "blue" | "red";

/** A 2D box collider, given as a center point + full extents, both in inches. */
export interface BoxShape {
  kind: "box";
  id: string;
  /** Field X/Y of the box's center, inches. */
  x: number;
  y: number;
  /** Full width along X (before rotation), inches. */
  width: number;
  /** Full depth along Y (before rotation), inches. */
  depth: number;
  /** Rotation about Z (field-normal) in radians, CCW. 0 = axis-aligned. */
  rotation?: number;
}

/** A convex polygon collider (used for the airship's hex deck). */
export interface PolygonShape {
  kind: "polygon";
  id: string;
  x: number;
  y: number;
  /** Vertices relative to (x, y), in inches, wound consistently. */
  points: Array<[number, number]>;
}

export type FieldShape = BoxShape | PolygonShape;

// =====================================================================
// Floor markings (paint on the carpet -- no collision, client/ draws them)
// =====================================================================

/** "7 ft. 9.25 in. from the ALLIANCE WALL diamond plate." */
export const BASE_LINE_FROM_WALL_IN = 93.25;
/** "2 ft. 6 in. behind the ALLIANCE WALL diamond plate." */
export const STARTING_LINE_FROM_WALL_IN = 30;
/** "far edge is 4 ft. 4 in. from the front face of the BOILER." */
export const KEY_DEPTH_FROM_BOILER_FACE_IN = 52;
/** "far edge is 3 ft. 6 in. from the front face of the LOADING STATION." */
export const RETRIEVAL_ZONE_DEPTH_IN = 42;
/** Painted line width -- not a manual number, just a legible stripe. */
export const FIELD_LINE_WIDTH_IN = 2;

// =====================================================================
// Boiler
// =====================================================================
// 3ft6in x 3ft6in base, 8ft1in tall, in the corner "opposite the scoring
// table" on the alliance's own end, angled 45 degrees across that corner
// so its goal face points diagonally into the field (matches the
// reference photos, and is what makes the KEY a corner triangle rather
// than a rectangular band).

export const BOILER_SIZE_IN = 42;
export const BOILER_HEIGHT_IN = 97;
export const BOILER_HIGH_GOAL_DIAMETER_IN = 21.5;
export const BOILER_HIGH_GOAL_HORIZONTAL_OFFSET_IN = 17.5;
export const BOILER_LOW_GOAL_OPENING_WIDTH_IN = 25;
export const BOILER_LOW_GOAL_OPENING_HEIGHT_IN = 8.75;
export const BOILER_LOW_GOAL_HEIGHT_ABOVE_CARPET_IN = 18;
/** "approximately 4 ft. 10 in. wide by 9 ft. 11 in. tall" net behind the goal. */
export const BOILER_NET_WIDTH_IN = 58;
export const BOILER_NET_HEIGHT_IN = 119;

// Rotating a square 45deg puts its 4 corners on the cardinal directions
// from its center at half-diagonal distance. Placing the center that far
// in from each of the corner's two walls makes two corners exactly
// tangent to those walls -- snug, not poking through.
export const BOILER_HALF_DIAGONAL_IN = (BOILER_SIZE_IN / 2) * Math.SQRT2;
export const BOILER_ROTATION_RAD = Math.PI / 4;

/** Unit vector pointing from the boiler's corner diagonally into the field. */
export function boilerFaceNormal(alliance: Alliance): { x: number; y: number } {
  return { x: alliance === "blue" ? Math.SQRT1_2 : -Math.SQRT1_2, y: -Math.SQRT1_2 };
}

function boilerShape(alliance: Alliance): BoxShape {
  const x = alliance === "blue" ? BOILER_HALF_DIAGONAL_IN : FIELD_LENGTH_IN - BOILER_HALF_DIAGONAL_IN;
  const y = FAR_SIDE_Y_IN - BOILER_HALF_DIAGONAL_IN;
  // Blue's corner is (-X, +Y) from the boiler center, so the goal face
  // (local -Y before rotation) must end up facing (+X, -Y): a +45deg
  // turn. Red mirrors.
  const rotation = alliance === "blue" ? BOILER_ROTATION_RAD : -BOILER_ROTATION_RAD;
  return { kind: "box", id: `boiler-${alliance}`, x, y, width: BOILER_SIZE_IN, depth: BOILER_SIZE_IN, rotation };
}

/**
 * The KEY: the painted triangle in the boiler's corner, bounded by the
 * two walls and a line parallel to the boiler's front face,
 * KEY_DEPTH_FROM_BOILER_FACE_IN past it. Returned as the triangle's
 * three field-space corners so client/ can draw it directly.
 */
export function keyTriangle(alliance: Alliance): Array<[number, number]> {
  const boiler = boilerShape(alliance);
  const n = boilerFaceNormal(alliance);
  // A point on the key's far edge: boiler center, out to the front face,
  // then out again by the key's depth.
  const reach = BOILER_SIZE_IN / 2 + KEY_DEPTH_FROM_BOILER_FACE_IN;
  const px = boiler.x + n.x * reach;
  const py = boiler.y + n.y * reach;
  // That edge runs at 45deg, so in field terms it is the line
  // (x - px) * n.x + (y - py) * n.y = 0. Intersect it with the far wall
  // (y = FAR_SIDE_Y_IN) and with this alliance's own wall (x = 0 or 652).
  const cornerX = alliance === "blue" ? 0 : FIELD_LENGTH_IN;
  const dot = px * n.x + py * n.y;
  const xAtFarWall = (dot - FAR_SIDE_Y_IN * n.y) / n.x;
  const yAtOwnWall = (dot - cornerX * n.x) / n.y;
  return [
    [cornerX, FAR_SIDE_Y_IN],
    [xAtFarWall, FAR_SIDE_Y_IN],
    [cornerX, yAtOwnWall],
  ];
}

// =====================================================================
// Airship
// =====================================================================
// Regular hexagon with a FLAT edge facing the alliance wall. That
// orientation is not arbitrary: it puts three of the six faces on the
// wall-facing side (the front face plus the two at +/-60deg), which is
// where the manual's three LIFTs live. The manual's "width" figures are
// applied as flat-to-flat (depth into the field).

export const AIRSHIP_DECK_HEIGHT_IN = 36.5;
export const AIRSHIP_FLAT_TO_FLAT_IN = 70.5;
export const AIRSHIP_CIRCUMRADIUS_IN = AIRSHIP_FLAT_TO_FLAT_IN / Math.sqrt(3); // ~40.7
export const AIRSHIP_WIDTH_IN = AIRSHIP_CIRCUMRADIUS_IN * 2; // ~81.4 vertex-to-vertex

export const AIRSHIP_RAIL_HEIGHT_ABOVE_DECK_IN = 42.5;
export const AIRSHIP_RAIL_FLAT_TO_FLAT_IN = 101;
export const AIRSHIP_RAIL_CIRCUMRADIUS_IN = AIRSHIP_RAIL_FLAT_TO_FLAT_IN / Math.sqrt(3); // ~58.3

/** "ports are 13 in. wide by 19.5 in. holes" in the airship's walls. */
export const AIRSHIP_PORT_WIDTH_IN = 13;
export const AIRSHIP_PORT_HEIGHT_IN = 19.5;
/** Lift peg: "1 ft. 1 in. from the FIELD carpet", "protrudes 10.5 in." */
export const LIFT_PEG_HEIGHT_IN = 13;
export const LIFT_PEG_PROTRUSION_IN = 10.5;
export const LIFT_PEG_DIAMETER_IN = 1.375;
/** Lift barriers: "6.25 in. tall and extend 2 ft. 0.75 in. out." */
export const LIFT_BARRIER_HEIGHT_IN = 6.25;
export const LIFT_BARRIER_EXTENT_IN = 24.75;
/** Steam tank: hexagonal, "6 ft. tall", "diagonal dimension of 2 ft." */
export const STEAM_TANK_HEIGHT_IN = 72;
export const STEAM_TANK_DIAGONAL_IN = 24;
/** Touchpads sit "4 ft. 10 in. above the carpet"; 10 in. plates. */
export const TOUCHPAD_HEIGHT_IN = 58;
export const TOUCHPAD_SIZE_IN = 10;

// --- Rotors -------------------------------------------------------
// The four ROTORS are the airship's signature silhouette: one large
// helical rotor on a central mast, plus three smaller propellers on
// arms around it. Heights ARE from the manual ("the central ROTOR
// starts 8 ft. 5 in. above the deck", "the smaller ROTORS [are] 8 ft.
// 0.75 in. above the deck"); the blade sizes are NOT stated anywhere
// and are scaled off the official isometric field render, so they're
// flagged estimates like the overflow-station offset.
export const ROTOR_CENTRAL_HEIGHT_ABOVE_DECK_IN = 101;
export const ROTOR_SMALL_HEIGHT_ABOVE_DECK_IN = 96.75;
/** Estimated from the reference render, not the manual. */
export const ROTOR_CENTRAL_BLADE_LENGTH_IN = 32;
export const ROTOR_SMALL_BLADE_LENGTH_IN = 15;
/** How far the three small rotors' masts sit out from the airship's center. */
export const ROTOR_SMALL_ARM_RADIUS_IN = 34;

// --- Boiler profile ------------------------------------------------
// The boiler is not a box: the reference render shows a copper vessel
// with a wide tapering body, a sharp shoulder, a narrow neck and a
// flared funnel mouth (the high goal you shoot into). The manual only
// fixes the overall envelope -- 42in square base, 97in tall, high goal
// 21.5in across at the top -- so the intermediate section heights below
// are proportions read off the render within that envelope.
export const BOILER_BODY_TOP_IN = 52; // where the shoulder taper starts
export const BOILER_SHOULDER_TOP_IN = 70; // where the neck begins
export const BOILER_NECK_TOP_IN = 86; // where the funnel flares out
export const BOILER_BASE_WIDTH_IN = 38; // slightly inset from the 42in footprint
export const BOILER_NECK_WIDTH_IN = 19;
export const BOILER_PLINTH_HEIGHT_IN = 7;

/**
 * See the header's DERIVED note: this places the launchpad line at
 * 233.25in from each wall and leaves a 185.5in neutral zone, matching a
 * 185.3 callout from the field assembly drawing.
 */
export const AIRSHIP_CENTER_X_FROM_WALL_IN = 198;

/** "collinear with the edge of the AIRSHIP deck closest to the center of the FIELD." */
export const LAUNCHPAD_LINE_FROM_WALL_IN = AIRSHIP_CENTER_X_FROM_WALL_IN + AIRSHIP_FLAT_TO_FLAT_IN / 2; // 233.25

/** Regular hexagon vertices; the 30deg start puts flat edges perpendicular to X (flat face toward each alliance wall). */
export function hexPoints(circumradius: number): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (30 + i * 60);
    points.push([circumradius * Math.cos(angle), circumradius * Math.sin(angle)]);
  }
  return points;
}

export function airshipCenterX(alliance: Alliance): number {
  return alliance === "blue" ? AIRSHIP_CENTER_X_FROM_WALL_IN : FIELD_LENGTH_IN - AIRSHIP_CENTER_X_FROM_WALL_IN;
}

function airshipShape(alliance: Alliance): PolygonShape {
  return {
    kind: "polygon",
    id: `airship-${alliance}`,
    x: airshipCenterX(alliance),
    y: FIELD_MID_Y_IN,
    points: hexPoints(AIRSHIP_CIRCUMRADIUS_IN),
  };
}

/**
 * The three wall-facing faces of the airship hex, as {midpoint, outward
 * normal angle} -- where the three LIFTs sit. Face index 0 is the flat
 * face squarely toward the alliance wall; 1 and 2 are its neighbours.
 */
export function airshipLiftFaces(alliance: Alliance): Array<{ x: number; y: number; angleRad: number }> {
  const cx = airshipCenterX(alliance);
  const apothem = AIRSHIP_FLAT_TO_FLAT_IN / 2;
  // Outward normal of the face pointing at this alliance's own wall.
  const base = alliance === "blue" ? Math.PI : 0;
  return [-60, 0, 60].map((deg) => {
    const angleRad = base + (deg * Math.PI) / 180;
    return {
      x: cx + Math.cos(angleRad) * apothem,
      y: FIELD_MID_Y_IN + Math.sin(angleRad) * apothem,
      angleRad,
    };
  });
}

// =====================================================================
// Loading stations
// =====================================================================

export const RETURN_PANEL_WIDTH_IN = 75.5;
export const RETURN_PANEL_DEPTH_IN = 6;
export const RETURN_PANEL_HEIGHT_IN = 78;

export const OVERFLOW_PANEL_WIDTH_IN = 30;
export const OVERFLOW_PANEL_DEPTH_IN = 6;
export const OVERFLOW_PANEL_HEIGHT_IN = 78;

export const LOADING_OPENING_WIDTH_IN = 24;
export const LOADING_OPENING_HEIGHT_IN = 7.5;
export const LOADING_OPENING_HEIGHT_ABOVE_CARPET_IN = 25;
/** Feed shelves: "2 ft. wide by 3 ft. long, at a 72 deg. angle, 3 ft. 7.375 in. from the carpet." */
export const LOADING_SHELF_WIDTH_IN = 24;
export const LOADING_SHELF_LENGTH_IN = 36;
export const LOADING_SHELF_HEIGHT_IN = 43.375;
export const LOADING_SHELF_ANGLE_RAD = (72 * Math.PI) / 180;

// No numeric station pitch is given anywhere in the manual, so this is
// an estimate -- but it is now a constrained one. At its first value
// (160) the 30in-wide overflow panel sat right on top of the hopper
// whose 165.5in offset IS manual-confirmed; a top-down render of the
// field showed the two interpenetrating. 105 clears the return station
// (which reaches ~56in along this wall) and the hopper (152-179in) with
// room on both sides.
const OVERFLOW_OFFSET_FROM_CORNER_IN = 105;

// Same corner-tangent idea as the boiler, but a 75.5 x 6 rectangle's
// corners aren't all equidistant from its center, so this offset along
// the corner diagonal was solved numerically (smallest D for which all
// four rotated corners stay inside both walls) and rounded.
const RETURN_PANEL_CORNER_OFFSET_IN = 41;
export const RETURN_PANEL_ROTATION_RAD = Math.PI / 4;

function returnStationShape(alliance: Alliance): BoxShape {
  const dir = alliance === "blue" ? 1 : -1;
  const cornerX = alliance === "blue" ? 0 : FIELD_LENGTH_IN;
  const x = cornerX + dir * RETURN_PANEL_CORNER_OFFSET_IN * Math.SQRT1_2;
  const y = SCORING_TABLE_Y_IN + RETURN_PANEL_CORNER_OFFSET_IN * Math.SQRT1_2;
  // Unrotated the panel's face points +Y; blue needs it on the (+X,+Y)
  // diagonal (-45deg), red mirrors.
  const rotation = alliance === "blue" ? -RETURN_PANEL_ROTATION_RAD : RETURN_PANEL_ROTATION_RAD;
  return { kind: "box", id: `loading-return-${alliance}`, x, y, width: RETURN_PANEL_WIDTH_IN, depth: RETURN_PANEL_DEPTH_IN, rotation };
}

function overflowStationShape(alliance: Alliance): BoxShape {
  const cornerX = alliance === "blue" ? 0 : FIELD_LENGTH_IN;
  const dir = alliance === "blue" ? 1 : -1;
  const x = cornerX + dir * OVERFLOW_OFFSET_FROM_CORNER_IN;
  const y = SCORING_TABLE_Y_IN + OVERFLOW_PANEL_DEPTH_IN / 2;
  return { kind: "box", id: `loading-overflow-${alliance}`, x, y, width: OVERFLOW_PANEL_WIDTH_IN, depth: OVERFLOW_PANEL_DEPTH_IN };
}

// =====================================================================
// Outer walls
// =====================================================================

/** Guardrail height -- the real field's is a ~20in rail with clear polycarbonate above it. */
export const GUARDRAIL_HEIGHT_IN = 20;
export const ALLIANCE_WALL_HEIGHT_IN = 78;

function wallShapes(): BoxShape[] {
  const t = WALL_THICKNESS_IN;
  return [
    { kind: "box", id: "wall-scoring-table", x: FIELD_MID_X_IN, y: -t / 2, width: FIELD_LENGTH_IN + t * 2, depth: t },
    { kind: "box", id: "wall-far", x: FIELD_MID_X_IN, y: FIELD_WIDTH_IN + t / 2, width: FIELD_LENGTH_IN + t * 2, depth: t },
    { kind: "box", id: "wall-blue", x: -t / 2, y: FIELD_MID_Y_IN, width: t, depth: FIELD_WIDTH_IN },
    { kind: "box", id: "wall-red", x: FIELD_LENGTH_IN + t / 2, y: FIELD_MID_Y_IN, width: t, depth: FIELD_WIDTH_IN },
  ];
}

export const FIELD_ASPECT_RATIO = FIELD_WIDTH_IN / FIELD_LENGTH_IN;

/** Every static collision shape on the field, in the shared field coordinate system. */
export function allFieldShapes(): FieldShape[] {
  const alliances: Alliance[] = ["blue", "red"];
  return [
    ...wallShapes(),
    ...alliances.map(boilerShape),
    ...alliances.map(airshipShape),
    ...alliances.map(returnStationShape),
    ...alliances.map(overflowStationShape),
  ];
}

/** The four wall shapes on their own, so client/ can draw guardrails without re-deriving them. */
export function wallVisuals(): BoxShape[] {
  return wallShapes();
}

// =====================================================================
// Hoppers (visual only -- colliders are Stage 2, with the rest of scoring)
// =====================================================================

export const HOPPER_WIDTH_IN = 26.5; // along the wall (field X)
export const HOPPER_DEPTH_IN = 23.25; // out from the wall (field Y)
export const HOPPER_HEIGHT_IN = 46;
/** A hopper is a clear bin held up on four legs, not a box sitting on the
 * carpet -- the floor sits at fuel-intake height, per the reference photos. */
export const HOPPER_FLOOR_HEIGHT_IN = 24.625;
/** Strike plate: "1 ft. 3 in. high, 1 ft. 10 in. long, 2 in. above the carpet." */
export const HOPPER_PLATE_HEIGHT_IN = 15;
export const HOPPER_PLATE_WIDTH_IN = 22;
export const HOPPER_PLATE_ABOVE_CARPET_IN = 2;

const HOPPER_SCORING_TABLE_OFFSET_IN = 165.5;
const HOPPER_FAR_SIDE_OFFSET_IN = 78.5;

/**
 * The 5 hoppers as simple boxes for client/ to draw. Two per alliance
 * (one on the scoring-table wall at 165.5in, one on the far wall at
 * 78.5in) plus one centered on the far wall between the two airships.
 */
export function hopperVisuals(): BoxShape[] {
  // "There are five (5) hoppers located alongside and OUTSIDE the
  // GUARDRAIL" (manual, Section 3). Earlier passes placed these flush
  // against the INNER wall face (y = wall +/- depth/2, biased into the
  // carpet) -- backwards. They belong on the far side of the wall from
  // the field, biased away from the carpet by the same offset.
  const alliances: Alliance[] = ["blue", "red"];
  const scoringTable: BoxShape[] = alliances.map((alliance) => {
    const x = alliance === "blue" ? HOPPER_SCORING_TABLE_OFFSET_IN : FIELD_LENGTH_IN - HOPPER_SCORING_TABLE_OFFSET_IN;
    return { kind: "box", id: `hopper-scoring-${alliance}`, x, y: SCORING_TABLE_Y_IN - HOPPER_DEPTH_IN / 2, width: HOPPER_WIDTH_IN, depth: HOPPER_DEPTH_IN };
  });
  const farSide: BoxShape[] = alliances.map((alliance) => {
    const x = alliance === "blue" ? HOPPER_FAR_SIDE_OFFSET_IN : FIELD_LENGTH_IN - HOPPER_FAR_SIDE_OFFSET_IN;
    return { kind: "box", id: `hopper-far-${alliance}`, x, y: FAR_SIDE_Y_IN + HOPPER_DEPTH_IN / 2, width: HOPPER_WIDTH_IN, depth: HOPPER_DEPTH_IN, rotation: Math.PI };
  });
  const centered: BoxShape = {
    kind: "box",
    id: "hopper-far-center",
    x: FIELD_MID_X_IN,
    y: FAR_SIDE_Y_IN + HOPPER_DEPTH_IN / 2,
    width: HOPPER_WIDTH_IN,
    depth: HOPPER_DEPTH_IN,
    rotation: Math.PI,
  };
  return [...scoringTable, ...farSide, centered];
}
