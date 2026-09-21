import * as THREE from "three";
import {
  allFieldShapes,
  wallVisuals,
  hopperVisuals,
  hexPoints,
  keyTriangle,
  airshipLiftFaces,
  type FieldShape,
  type BoxShape,
  type Alliance,
  FIELD_LENGTH_IN,
  FIELD_WIDTH_IN,
  FIELD_MID_X_IN,
  FIELD_MID_Y_IN,
  BOILER_HEIGHT_IN,
  BOILER_SIZE_IN,
  BOILER_HIGH_GOAL_DIAMETER_IN,
  AIRSHIP_PORT_WIDTH_IN,
  AIRSHIP_PORT_HEIGHT_IN,
  BOILER_LOW_GOAL_OPENING_WIDTH_IN,
  BOILER_LOW_GOAL_OPENING_HEIGHT_IN,
  BOILER_LOW_GOAL_HEIGHT_ABOVE_CARPET_IN,
  BOILER_NET_WIDTH_IN,
  BOILER_NET_HEIGHT_IN,
  AIRSHIP_DECK_HEIGHT_IN,
  AIRSHIP_CIRCUMRADIUS_IN,
  AIRSHIP_RAIL_HEIGHT_ABOVE_DECK_IN,
  AIRSHIP_RAIL_CIRCUMRADIUS_IN,
  LIFT_PEG_HEIGHT_IN,
  LIFT_PEG_PROTRUSION_IN,
  LIFT_PEG_DIAMETER_IN,
  LIFT_BARRIER_HEIGHT_IN,
  LIFT_BARRIER_EXTENT_IN,
  STEAM_TANK_HEIGHT_IN,
  STEAM_TANK_DIAGONAL_IN,
  TOUCHPAD_HEIGHT_IN,
  TOUCHPAD_SIZE_IN,
  ROTOR_CENTRAL_HEIGHT_ABOVE_DECK_IN,
  ROTOR_SMALL_HEIGHT_ABOVE_DECK_IN,
  ROTOR_CENTRAL_BLADE_LENGTH_IN,
  ROTOR_SMALL_BLADE_LENGTH_IN,
  ROTOR_SMALL_ARM_RADIUS_IN,
  BOILER_BODY_TOP_IN,
  BOILER_SHOULDER_TOP_IN,
  BOILER_NECK_TOP_IN,
  BOILER_BASE_WIDTH_IN,
  BOILER_NECK_WIDTH_IN,
  BOILER_PLINTH_HEIGHT_IN,
  RETURN_PANEL_HEIGHT_IN,
  OVERFLOW_PANEL_HEIGHT_IN,
  LOADING_OPENING_WIDTH_IN,
  LOADING_OPENING_HEIGHT_IN,
  LOADING_OPENING_HEIGHT_ABOVE_CARPET_IN,
  LOADING_SHELF_WIDTH_IN,
  LOADING_SHELF_LENGTH_IN,
  LOADING_SHELF_HEIGHT_IN,
  LOADING_SHELF_ANGLE_RAD,
  HOPPER_HEIGHT_IN,
  HOPPER_FLOOR_HEIGHT_IN,
  HOPPER_PLATE_HEIGHT_IN,
  HOPPER_PLATE_WIDTH_IN,
  HOPPER_PLATE_ABOVE_CARPET_IN,
  GUARDRAIL_HEIGHT_IN,
  BASE_LINE_FROM_WALL_IN,
  STARTING_LINE_FROM_WALL_IN,
  LAUNCHPAD_LINE_FROM_WALL_IN,
  FIELD_LINE_WIDTH_IN,
} from "sim";
import { fieldToThree, inToFt } from "./coords.ts";

// =====================================================================
// Why this file changed shape in the third review pass
// =====================================================================
// The previous version drew every structure with MeshBasicMaterial --
// an *unlit* material. That is why the field "looked flat": with no
// lighting, every face of a solid renders the identical RGB value, so a
// 79-inch-tall airship and a hexagon painted on the carpet produce
// pixel-identical silhouettes. Nothing about the sizes was wrong; there
// was simply no shading to communicate depth. Everything here now uses
// MeshLambertMaterial with flatShading, which keeps the low-poly
// faceted look the style guide asks for while letting each face catch a
// different amount of light. main.ts adds the lights.
//
// It also fixes a real bug: rotated shapes were drawn with
// `rotation.y = shape.rotation - PI/2`, borrowing the conversion from
// coords.ts's fieldHeadingToThreeRotY. That conversion is for a
// *heading* (a facing direction, for a mesh whose local +X is forward).
// These box meshes are already built with field-Y on three-X and
// field-X on three-Z, so what they need is a plain coordinate rotation,
// which works out to `rotation.y = shape.rotation` exactly. The extra
// -90deg was tipping the tall, thin boiler and loading-station panels
// over so they read as slabs lying on the carpet.

export interface FieldPalette {
  red: number;
  blue: number;
  /** Amber accent -- goals, fuel, the steam tank. */
  accent: number;
  /** Near-black, for openings that should read as holes rather than panels. */
  background: number;
  /** Painted line color. */
  line: number;
}

const STEEL = 0x8b8f96;
const DARK_STEEL = 0x5a5f66;
const MESH_GREY = 0x9aa0a8;
// STEAMWORKS' field elements are steampunk copper, not alliance colors --
// both airships and both boilers are the same weathered copper on the
// real field, with alliance identity carried by trim, plinths and the
// gauge stripe. Keeping the copper is most of what makes a render of
// this field read as *this* season rather than a generic arena.
const COPPER = 0xb5673f;
const COPPER_DARK = 0x8a4a2c;
const COPPER_LIGHT = 0xcf8353;
const DECK_DARK = 0x33373c;

function solid(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color, flatShading: true });
}

/** Two-sided, for the hand-built prisms whose triangle winding isn't guaranteed outward. */
function solidTwoSided(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color, flatShading: true, side: THREE.DoubleSide });
}

function glass(color: number, opacity: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
}

function allianceOf(id: string): Alliance {
  return id.endsWith("-red") ? "red" : "blue";
}

/** Rotates a local (dx, dy) field-space offset by a field rotation (radians, CCW). */
function rotateOffset(dx: number, dy: number, rotationRad: number): { dx: number; dy: number } {
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);
  return { dx: dx * cos - dy * sin, dy: dx * sin + dy * cos };
}

/**
 * For a mesh whose local +X should point along a field-space angle.
 * Same derivation as coords.ts's fieldHeadingToThreeRotY -- kept
 * separate here because it applies to meshes built directly in
 * three-space axes, not to the field-mapped boxes boxMeshFor builds.
 */
function fieldAngleToRotY(angleRad: number): number {
  return angleRad - Math.PI / 2;
}

/** A regular polygon's vertices as three-space offsets from a center; radius in inches. */
function polyLocal(sides: number, radiusIn: number, phase = 0): Array<{ x: number; z: number }> {
  const r = inToFt(radiusIn);
  const out: Array<{ x: number; z: number }> = [];
  for (let i = 0; i < sides; i++) {
    const a = phase + (i * 2 * Math.PI) / sides;
    out.push({ x: r * Math.cos(a), z: r * Math.sin(a) });
  }
  return out;
}

export function buildFieldGroup(palette: FieldPalette): THREE.Group {
  const group = new THREE.Group();

  addFloorMarkings(group, palette);
  addPerimeter(group, palette);

  for (const shape of allFieldShapes()) {
    if (shape.id.startsWith("wall-")) continue; // drawn by addPerimeter
    const alliance = allianceOf(shape.id);
    const color = alliance === "red" ? palette.red : palette.blue;

    if (shape.kind === "polygon") {
      addAirship(group, shape, alliance, color, palette);
    } else if (shape.id.startsWith("boiler-")) {
      addBoiler(group, shape, alliance, color, palette);
    } else {
      addLoadingStation(group, shape, color, palette);
    }
  }

  for (const hopper of hopperVisuals()) {
    addHopper(group, hopper, palette);
  }

  return group;
}

// =====================================================================
// Floor markings
// =====================================================================
// Painted carpet, no collision. Each sits at a slightly different tiny
// height so overlapping marks don't z-fight with each other or the
// carpet plane at y=0.

function addFloorMarkings(group: THREE.Group, palette: FieldPalette): void {
  const alliances: Alliance[] = ["blue", "red"];

  for (const alliance of alliances) {
    const color = alliance === "red" ? palette.red : palette.blue;
    const wallX = alliance === "blue" ? 0 : FIELD_LENGTH_IN;
    const inward = alliance === "blue" ? 1 : -1;

    // The KEY: painted triangle in the boiler's corner.
    addFloorPolygon(group, keyTriangle(alliance), color, 0.38, 0.012);

    // Base line and starting line: full-width stripes across the field.
    addFloorStripeAcrossY(group, wallX + inward * BASE_LINE_FROM_WALL_IN, palette.line, 0.85, 0.02);
    addFloorStripeAcrossY(group, wallX + inward * STARTING_LINE_FROM_WALL_IN, color, 0.8, 0.02);
    // Launchpad line: where legal fuel launching starts, collinear with
    // the airship deck's field-center edge.
    addFloorStripeAcrossY(group, wallX + inward * LAUNCHPAD_LINE_FROM_WALL_IN, palette.accent, 0.65, 0.018);
  }
}

/** A full-field-width painted stripe at a given field X. */
function addFloorStripeAcrossY(group: THREE.Group, xIn: number, color: number, opacity: number, yFt: number): void {
  addFloorPolygon(
    group,
    [
      [xIn - FIELD_LINE_WIDTH_IN / 2, 0],
      [xIn + FIELD_LINE_WIDTH_IN / 2, 0],
      [xIn + FIELD_LINE_WIDTH_IN / 2, FIELD_WIDTH_IN],
      [xIn - FIELD_LINE_WIDTH_IN / 2, FIELD_WIDTH_IN],
    ],
    color,
    opacity,
    yFt
  );
}

/** A flat filled polygon lying on the carpet, given in field inches. */
function addFloorPolygon(group: THREE.Group, pointsIn: Array<[number, number]>, color: number, opacity: number, yFt: number): void {
  const positions: number[] = [];
  const pts = pointsIn.map(([px, py]) => fieldToThree(px, py));
  // Fan triangulation -- every polygon passed here is convex.
  for (let i = 1; i < pts.length - 1; i++) {
    positions.push(pts[0].x, 0, pts[0].z);
    positions.push(pts[i].x, 0, pts[i].z);
    positions.push(pts[i + 1].x, 0, pts[i + 1].z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false })
  );
  mesh.position.y = yFt;
  group.add(mesh);
}

// =====================================================================
// Perimeter: guardrails all round, taller alliance walls at each end
// =====================================================================

function addPerimeter(group: THREE.Group, palette: FieldPalette): void {
  // Deliberately SOLID and low. The real field has clear polycarbonate
  // standing ~6ft above the rail, and modelling it faithfully was a
  // mistake: whichever wall sits between the camera and the field gets
  // drawn over everything behind it, so a full-height translucent panel
  // fogs out half the view in both camera modes. A low solid rail reads
  // as the field's edge without ever being in the way.
  for (const wall of wallVisuals()) {
    const isAllianceEnd = wall.id === "wall-blue" || wall.id === "wall-red";
    const color = isAllianceEnd ? (wall.id === "wall-red" ? palette.red : palette.blue) : DARK_STEEL;
    // The alliance walls get a little extra height over the side rails so
    // each end reads as "this is blue's end" at a glance, but nothing
    // like ALLIANCE_WALL_HEIGHT_IN's real 78in -- a full-height wall
    // running the field's whole width turns into a huge leaning wedge
    // across a third of the frame in the full-field view.
    const heightIn = isAllianceEnd ? 30 : GUARDRAIL_HEIGHT_IN;
    group.add(boxMeshFor(wall, heightIn, 0, solid(color)));
  }
}

// =====================================================================
// Airship
// =====================================================================

function addAirship(
  group: THREE.Group,
  shape: Extract<FieldShape, { kind: "polygon" }>,
  alliance: Alliance,
  color: number,
  palette: FieldPalette
): void {
  const center = fieldToThree(shape.x, shape.y);
  const deckIn = AIRSHIP_DECK_HEIGHT_IN;
  const deckFt = inToFt(deckIn);
  const railTopFt = inToFt(deckIn + AIRSHIP_RAIL_HEIGHT_ABOVE_DECK_IN);

  // 1. Hull: a copper cone widening from a narrow foot up to the deck.
  //    The reference render's airship is clearly waisted like this, not
  //    a straight-sided drum -- it reads as a gondola slung under the
  //    deck rather than a hexagonal bucket.
  const deckPts = localHex(shape, AIRSHIP_CIRCUMRADIUS_IN);
  const footPts = localHex(shape, AIRSHIP_CIRCUMRADIUS_IN * 0.58);
  const hull = taperedPrism(footPts, deckPts, 0, deckFt, solidTwoSided(COPPER), false);
  hull.position.set(center.x, 0, center.z);
  group.add(hull);

  // A darker skirt at the very bottom, where the real airship's base
  // framing and the lift machinery sit.
  const skirt = prism(footPts, 0, inToFt(10), solidTwoSided(DECK_DARK));
  skirt.position.set(center.x, 0, center.z);
  group.add(skirt);

  // 2. Deck: the platform the pilots stand on, slightly overhanging the
  //    hull, in alliance color so you can tell the airships apart at a
  //    glance (the real ones are both copper and rely on position).
  const deckSlab = prism(localHex(shape, AIRSHIP_CIRCUMRADIUS_IN * 1.05), deckFt, deckFt + inToFt(4), solidTwoSided(color));
  deckSlab.position.set(center.x, 0, center.z);
  group.add(deckSlab);

  // 3. Railing: six posts leaning out to the rail hexagon (the manual's
  //    75-degree flare), with a faint glazed panel between them.
  const railPts = localHex(shape, AIRSHIP_RAIL_CIRCUMRADIUS_IN);
  const postMaterial = solid(color);
  for (let i = 0; i < deckPts.length; i++) {
    group.add(strut(
      new THREE.Vector3(center.x + deckPts[i].x, deckFt, center.z + deckPts[i].z),
      new THREE.Vector3(center.x + railPts[i].x, railTopFt, center.z + railPts[i].z),
      inToFt(2.5),
      postMaterial
    ));
  }
  const glazing = taperedPrism(deckPts, railPts, deckFt, railTopFt, glass(0xbfd6ec, 0.13), false);
  glazing.position.set(center.x, 0, center.z);
  group.add(glazing);

  // 4. Rail cap: six bars around the rim, NOT a filled hex -- the
  //    airship is open on top, the pilots work inside it.
  for (let i = 0; i < railPts.length; i++) {
    const a = railPts[i];
    const b = railPts[(i + 1) % railPts.length];
    group.add(strut(
      new THREE.Vector3(center.x + a.x, railTopFt, center.z + a.z),
      new THREE.Vector3(center.x + b.x, railTopFt, center.z + b.z),
      inToFt(3),
      postMaterial
    ));
  }

  // 5. Steam tank: the copper column standing on the deck, 6ft tall and
  //    2ft across per the manual, carrying the alliance-colored pressure
  //    gauge stripe that is the airship's most recognizable marking.
  const tankTopIn = deckIn + STEAM_TANK_HEIGHT_IN;
  const tankPts = polyLocal(6, STEAM_TANK_DIAGONAL_IN / 2);
  const tank = prism(tankPts, deckFt, inToFt(tankTopIn), solidTwoSided(COPPER_LIGHT));
  tank.position.set(center.x, 0, center.z);
  group.add(tank);

  // Pressure gauge stripe down the tank -- the airship's most
  // recognizable marking. Put on both long faces so it's readable from
  // either end of the field rather than only from this alliance's side.
  for (const side of [-1, 1]) {
    const gaugeP = fieldToThree(shape.x + side * (STEAM_TANK_DIAGONAL_IN / 2), shape.y);
    const gauge = new THREE.Mesh(
      new THREE.BoxGeometry(inToFt(2), inToFt(STEAM_TANK_HEIGHT_IN * 0.78), inToFt(10)),
      solid(color)
    );
    gauge.position.set(gaugeP.x, inToFt(deckIn + STEAM_TANK_HEIGHT_IN * 0.5), gaugeP.z);
    group.add(gauge);
    // Graduation ticks up the gauge, as on the real tank.
    for (let t = 0; t < 5; t++) {
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(inToFt(2.6), inToFt(1.4), inToFt(6)),
        solid(0xe8eef2)
      );
      tick.position.set(gaugeP.x, inToFt(deckIn + 12 + t * 12), gaugeP.z);
      group.add(tick);
    }
  }
  const cap = prism(polyLocal(6, STEAM_TANK_DIAGONAL_IN / 2 + 1.5), inToFt(tankTopIn), inToFt(tankTopIn + 5), solidTwoSided(palette.accent));
  cap.position.set(center.x, 0, center.z);
  group.add(cap);

  // 6. Mast + the four ROTORS. This is the airship's silhouette: one
  //    big helical rotor high on the central mast and three smaller
  //    propellers on arms around it. Heights are the manual's; blade
  //    sizes are scaled off the reference render (see field.ts).
  const centralRotorFt = inToFt(deckIn + ROTOR_CENTRAL_HEIGHT_ABOVE_DECK_IN);
  group.add(strut(
    new THREE.Vector3(center.x, inToFt(tankTopIn), center.z),
    new THREE.Vector3(center.x, centralRotorFt + inToFt(3), center.z),
    inToFt(3.5),
    solid(COPPER_DARK)
  ));
  addHelixRotor(group, center, centralRotorFt, ROTOR_CENTRAL_BLADE_LENGTH_IN, palette);

  const smallRotorFt = inToFt(deckIn + ROTOR_SMALL_HEIGHT_ABOVE_DECK_IN);
  const armBase = alliance === "blue" ? Math.PI : 0;
  for (const deg of [-60, 60, 180]) {
    const a = armBase + (deg * Math.PI) / 180;
    const rIn = ROTOR_SMALL_ARM_RADIUS_IN;
    const footP = fieldToThree(shape.x + Math.cos(a) * rIn * 0.5, shape.y + Math.sin(a) * rIn * 0.5);
    const headP = fieldToThree(shape.x + Math.cos(a) * rIn, shape.y + Math.sin(a) * rIn);
    // Masts lean outward as they rise, as they do on the real airship.
    group.add(strut(
      new THREE.Vector3(footP.x, deckFt, footP.z),
      new THREE.Vector3(headP.x, smallRotorFt, headP.z),
      inToFt(2),
      solid(COPPER_DARK)
    ));
    addPropeller(group, headP, smallRotorFt, ROTOR_SMALL_BLADE_LENGTH_IN, a, palette);
  }

  // 7. The three LIFTs on the wall-facing faces: a barrier strip on the
  //    carpet and the gear peg sticking out of the airship.
  const pegMaterial = solid(palette.accent);
  const barrierMaterial = solid(DARK_STEEL);
  for (const face of airshipLiftFaces(alliance)) {
    const out = { x: Math.cos(face.angleRad), y: Math.sin(face.angleRad) };
    const pegInner = fieldToThree(face.x * 0.98 + shape.x * 0.02, face.y * 0.98 + shape.y * 0.02);
    const pegOuter = fieldToThree(face.x + out.x * LIFT_PEG_PROTRUSION_IN, face.y + out.y * LIFT_PEG_PROTRUSION_IN);
    group.add(strut(
      new THREE.Vector3(pegInner.x, inToFt(LIFT_PEG_HEIGHT_IN), pegInner.z),
      new THREE.Vector3(pegOuter.x, inToFt(LIFT_PEG_HEIGHT_IN), pegOuter.z),
      inToFt(LIFT_PEG_DIAMETER_IN * 2),
      pegMaterial
    ));

    // The port the gear is lifted through, on the hull above the peg.
    const portP = fieldToThree(face.x * 0.99 + shape.x * 0.01, face.y * 0.99 + shape.y * 0.01);
    const port = new THREE.Mesh(
      new THREE.BoxGeometry(inToFt(AIRSHIP_PORT_WIDTH_IN), inToFt(AIRSHIP_PORT_HEIGHT_IN), inToFt(2)),
      solid(palette.background)
    );
    port.position.set(portP.x, inToFt(deckIn * 0.55), portP.z);
    // Thin axis (geometry Z) lies along the face normal, so this one
    // is a plain field angle, not the local-+X conversion above.
    port.rotation.y = face.angleRad;
    group.add(port);

    const barrier = new THREE.Mesh(
      new THREE.BoxGeometry(inToFt(LIFT_BARRIER_EXTENT_IN), inToFt(LIFT_BARRIER_HEIGHT_IN), inToFt(3)),
      barrierMaterial
    );
    const bCenter = fieldToThree(face.x + out.x * (LIFT_BARRIER_EXTENT_IN / 2), face.y + out.y * (LIFT_BARRIER_EXTENT_IN / 2));
    barrier.position.set(bCenter.x, inToFt(LIFT_BARRIER_HEIGHT_IN) / 2, bCenter.z);
    barrier.rotation.y = fieldAngleToRotY(face.angleRad);
    group.add(barrier);
  }

  // 8. Ropes from the rail to the carpet on the three faces away from
  //    the alliance wall, with a touchpad above each.
  const ropeMaterial = solid(0xd8c9a8);
  const padMaterial = solid(palette.background);
  const base = alliance === "blue" ? 0 : Math.PI;
  for (const deg of [-60, 0, 60]) {
    const a = base + (deg * Math.PI) / 180;
    const rIn = AIRSHIP_RAIL_CIRCUMRADIUS_IN * 0.85;
    const p = fieldToThree(shape.x + Math.cos(a) * rIn, shape.y + Math.sin(a) * rIn);
    group.add(strut(
      new THREE.Vector3(p.x, 0, p.z),
      new THREE.Vector3(p.x, railTopFt, p.z),
      inToFt(1.5),
      ropeMaterial
    ));
    const pad = new THREE.Mesh(
      new THREE.BoxGeometry(inToFt(TOUCHPAD_SIZE_IN), inToFt(TOUCHPAD_SIZE_IN), inToFt(1.5)),
      padMaterial
    );
    pad.position.set(p.x, inToFt(TOUCHPAD_HEIGHT_IN), p.z);
    pad.rotation.y = a;
    group.add(pad);
  }
}

/**
 * The big central rotor. Four long blades radiating from a hub, each
 * pitched and stepped slightly in height so the set reads as the helix
 * it is on the real airship rather than a flat plus-sign.
 */
function addHelixRotor(
  group: THREE.Group,
  center: { x: number; z: number },
  heightFt: number,
  bladeLengthIn: number,
  palette: FieldPalette
): void {
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(inToFt(4), inToFt(4), inToFt(5), 10),
    solid(COPPER_DARK)
  );
  hub.position.set(center.x, heightFt, center.z);
  group.add(hub);

  const bladeMaterial = solid(STEEL);
  const blades = 4;
  for (let i = 0; i < blades; i++) {
    const a = (i * 2 * Math.PI) / blades;
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(inToFt(bladeLengthIn), inToFt(1.2), inToFt(bladeLengthIn * 0.42)),
      bladeMaterial
    );
    // Offset each blade out along its own axis, stepped in height and
    // pitched about that axis -- that stagger is what makes it a helix.
    blade.position.set(
      center.x + Math.cos(a) * inToFt(bladeLengthIn / 2),
      heightFt + inToFt(i * 1.6 - 2.4),
      center.z + Math.sin(a) * inToFt(bladeLengthIn / 2)
    );
    blade.rotation.y = -a;
    blade.rotateZ(0.22);
    group.add(blade);
  }
  void palette;
}

/** One of the three smaller rotors: a two-blade propeller on its mast head. */
function addPropeller(
  group: THREE.Group,
  at: { x: number; z: number },
  heightFt: number,
  bladeLengthIn: number,
  facingRad: number,
  palette: FieldPalette
): void {
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(inToFt(2.2), inToFt(2.2), inToFt(3.5), 8),
    solid(COPPER_DARK)
  );
  hub.position.set(at.x, heightFt, at.z);
  group.add(hub);

  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(inToFt(bladeLengthIn * 2), inToFt(1), inToFt(bladeLengthIn * 0.5)),
    solid(STEEL)
  );
  blade.position.set(at.x, heightFt + inToFt(1.5), at.z);
  blade.rotation.y = facingRad;
  blade.rotateZ(0.2);
  group.add(blade);
  void palette;
}


/** The hex vertices of `shape` at a given circumradius, as three-space offsets from its center. */
function localHex(shape: Extract<FieldShape, { kind: "polygon" }>, circumradius: number): Array<{ x: number; z: number }> {
  const center = fieldToThree(shape.x, shape.y);
  return hexPoints(circumradius).map(([px, py]) => {
    const a = fieldToThree(shape.x + px, shape.y + py);
    return { x: a.x - center.x, z: a.z - center.z };
  });
}

// =====================================================================
// Boiler
// =====================================================================

function addBoiler(
  group: THREE.Group,
  shape: BoxShape,
  alliance: Alliance,
  color: number,
  palette: FieldPalette
): void {
  const rotation = shape.rotation ?? 0;
  const center = fieldToThree(shape.x, shape.y);

  // The boiler is NOT a box. The reference render shows a copper vessel
  // like an old steam still: a wide tapering body, a sharp shoulder, a
  // narrow neck, and a flared funnel mouth -- and that mouth IS the high
  // goal you shoot into. Drawing it as a plain 42in box (which is only
  // its footprint) threw away the most recognizable object on the field.
  // Built as a stack of octagonal sections so it reads as a round vessel
  // while staying flat-shaded and cheap.

  // Alliance-colored plinth, so you can still tell whose boiler it is --
  // the real ones are both copper and rely on position alone.
  group.add(boxMeshFor(shape, BOILER_PLINTH_HEIGHT_IN, 0, solid(color)));

  const bodyLow = polyLocal(8, BOILER_BASE_WIDTH_IN / 2);
  const bodyHigh = polyLocal(8, (BOILER_BASE_WIDTH_IN / 2) * 0.9);
  const neck = polyLocal(8, BOILER_NECK_WIDTH_IN / 2);
  const mouth = polyLocal(8, BOILER_HIGH_GOAL_DIAMETER_IN / 2 + 2);

  const sections: Array<[Array<{ x: number; z: number }>, Array<{ x: number; z: number }>, number, number, number]> = [
    [bodyLow, bodyHigh, BOILER_PLINTH_HEIGHT_IN, BOILER_BODY_TOP_IN, COPPER],
    [bodyHigh, neck, BOILER_BODY_TOP_IN, BOILER_SHOULDER_TOP_IN, COPPER_DARK],
    [neck, neck, BOILER_SHOULDER_TOP_IN, BOILER_NECK_TOP_IN, COPPER],
    [neck, mouth, BOILER_NECK_TOP_IN, BOILER_HEIGHT_IN, COPPER_LIGHT],
  ];
  for (const [low, high, fromIn, toIn, col] of sections) {
    const mesh = taperedPrism(low, high, inToFt(fromIn), inToFt(toIn), solidTwoSided(col), false);
    mesh.position.set(center.x, 0, center.z);
    group.add(mesh);
  }

  // The high goal: a dark mouth sunk into the top of the funnel.
  const goalR = inToFt(BOILER_HIGH_GOAL_DIAMETER_IN / 2);
  const goal = new THREE.Mesh(
    new THREE.CylinderGeometry(goalR, goalR * 0.8, inToFt(5), 12, 1, true),
    solidTwoSided(palette.background)
  );
  goal.position.set(center.x, inToFt(BOILER_HEIGHT_IN - 2), center.z);
  group.add(goal);

  // Riveted bands around the body -- cheap, but they're what make a
  // copper drum look like a boiler rather than a traffic cone.
  for (const bandIn of [BOILER_PLINTH_HEIGHT_IN + 9, BOILER_BODY_TOP_IN - 8]) {
    const band = prism(polyLocal(8, BOILER_BASE_WIDTH_IN / 2 + 0.8), inToFt(bandIn), inToFt(bandIn + 2.5), solidTwoSided(COPPER_DARK));
    band.position.set(center.x, 0, center.z);
    group.add(band);
  }

  // Retroreflective vision bands on the neck -- the targets every
  // shooter robot in 2017 aimed at.
  const ringMaterial = solid(0xdfe8ee);
  for (const [upIn, thickIn] of [[BOILER_NECK_TOP_IN + 2, 4], [BOILER_SHOULDER_TOP_IN + 4, 2]] as const) {
    const ring = prism(polyLocal(8, BOILER_NECK_WIDTH_IN / 2 + 0.7), inToFt(upIn), inToFt(upIn + thickIn), solidTwoSided(ringMaterial.color.getHex()));
    ring.position.set(center.x, 0, center.z);
    group.add(ring);
  }

  // Low goal: the slot down at 18in on the face pointing into the field.
  // Geometry Z is the along-the-face axis under this file's convention
  // (see boxMeshFor): the opening's WIDTH goes there and its thin axis
  // on X, or the slot ends up a 25in-deep spike driven into the vessel
  // instead of a slot across its face.
  const lowGoal = new THREE.Mesh(
    new THREE.BoxGeometry(inToFt(3), inToFt(BOILER_LOW_GOAL_OPENING_HEIGHT_IN), inToFt(BOILER_LOW_GOAL_OPENING_WIDTH_IN)),
    solid(palette.background)
  );
  const lgLocal = rotateOffset(0, -BOILER_BASE_WIDTH_IN / 2 - 1, rotation);
  const lg = fieldToThree(shape.x + lgLocal.dx, shape.y + lgLocal.dy);
  lowGoal.position.set(lg.x, inToFt(BOILER_LOW_GOAL_HEIGHT_ABOVE_CARPET_IN), lg.z);
  lowGoal.rotation.y = rotation;
  group.add(lowGoal);

  // Catch net behind the boiler, tucked into the corner, with a visible
  // frame -- faint, because it's 10ft tall and would otherwise dominate.
  //
  // The manual's full 58in net width does NOT fit here: the boiler sits
  // diagonally across a corner with its own corners already tangent to
  // both walls, so a 58in panel behind it at 45 degrees runs about 11in
  // past the far wall and juts out of the field. (It did exactly that in
  // the first pass of this render.) The panel is narrowed to what the
  // corner can actually hold; on the real field the backstop is carried
  // on the field border rather than standing inside the carpet.
  const netWidthIn = 40;
  const netBackIn = BOILER_SIZE_IN / 2 - 1;
  const netLocal = rotateOffset(0, netBackIn, rotation);
  const np = fieldToThree(shape.x + netLocal.dx, shape.y + netLocal.dy);
  const net = new THREE.Mesh(
    new THREE.BoxGeometry(inToFt(netWidthIn), inToFt(BOILER_NET_HEIGHT_IN), inToFt(1)),
    glass(MESH_GREY, 0.16)
  );
  net.position.set(np.x, inToFt(BOILER_NET_HEIGHT_IN) / 2, np.z);
  net.rotation.y = rotation;
  group.add(net);
  for (const side of [-1, 1]) {
    const postLocal = rotateOffset((side * netWidthIn) / 2, netBackIn, rotation);
    const pp = fieldToThree(shape.x + postLocal.dx, shape.y + postLocal.dy);
    group.add(strut(
      new THREE.Vector3(pp.x, 0, pp.z),
      new THREE.Vector3(pp.x, inToFt(BOILER_NET_HEIGHT_IN), pp.z),
      inToFt(2),
      solid(DARK_STEEL)
    ));
  }
  void BOILER_NET_WIDTH_IN;

  void alliance;
}

// =====================================================================
// Loading stations
// =====================================================================

function addLoadingStation(group: THREE.Group, shape: BoxShape, color: number, palette: FieldPalette): void {
  const rotation = shape.rotation ?? 0;
  const isReturn = shape.id.startsWith("loading-return-");
  const heightIn = isReturn ? RETURN_PANEL_HEIGHT_IN : OVERFLOW_PANEL_HEIGHT_IN;

  group.add(boxMeshFor(shape, heightIn, 0, solid(color)));

  // A darker frame around the panel and a kick plate at its foot, so the
  // station reads as a built wall rather than a coloured billboard --
  // these were the last flat slabs left on the field.
  const frame: BoxShape = { ...shape, width: shape.width + 5, depth: shape.depth + 1 };
  group.add(boxMeshFor(frame, 5, heightIn - 5, solid(DARK_STEEL)));
  group.add(boxMeshFor(frame, 8, 0, solid(DARK_STEEL)));
  for (const side of [-1, 1]) {
    const postLocal = rotateOffset((side * shape.width) / 2, 0, rotation);
    const pp = fieldToThree(shape.x + postLocal.dx, shape.y + postLocal.dy);
    group.add(strut(
      new THREE.Vector3(pp.x, 0, pp.z),
      new THREE.Vector3(pp.x, inToFt(heightIn), pp.z),
      inToFt(4),
      solid(DARK_STEEL)
    ));
  }

  // Feed openings: the return station has two (one near each edge), the
  // overflow station one.
  const openingMaterial = solid(palette.background);
  const offsets = isReturn ? [-shape.width / 4, shape.width / 4] : [0];
  for (const along of offsets) {
    // Width on geometry Z (along the panel face), thin on X -- see the
    // boiler's low goal for why this way round.
    const opening = new THREE.Mesh(
      new THREE.BoxGeometry(inToFt(3), inToFt(LOADING_OPENING_HEIGHT_IN), inToFt(LOADING_OPENING_WIDTH_IN)),
      openingMaterial
    );
    const local = rotateOffset(along, shape.depth / 2 + 0.5, rotation);
    const p = fieldToThree(shape.x + local.dx, shape.y + local.dy);
    opening.position.set(p.x, inToFt(LOADING_OPENING_HEIGHT_ABOVE_CARPET_IN), p.z);
    opening.rotation.y = rotation;
    group.add(opening);
  }

  // The angled feed shelf the human player slides fuel down. It mounts
  // on the PANEL'S OUTER (player) face, not the field face -- the human
  // player loads fuel from outside the arena, not from on the carpet --
  // so its offset runs opposite the panel normal used for the openings
  // above. The manual's "72 deg. angle" reads as 72 degrees off
  // vertical (measured from the panel it's bolted to), i.e. 18 degrees
  // off horizontal: a gentle ramp, not a steep chute. That reading
  // checks out arithmetically -- a 36in shelf tipped 18 degrees off
  // horizontal drops 36*sin(18deg) =~ 11.1in from its 43.375in mount
  // height, landing at ~32.3in, matching the loading opening's top edge
  // at 25 + 7.5 = 32.5in, i.e. the shelf feeds straight down into the
  // opening below it.
  const shelf = new THREE.Mesh(
    new THREE.BoxGeometry(inToFt(LOADING_SHELF_LENGTH_IN), inToFt(1.5), inToFt(LOADING_SHELF_WIDTH_IN)),
    solid(STEEL)
  );
  const shelfLocal = rotateOffset(0, -(shape.depth / 2 + LOADING_SHELF_LENGTH_IN / 3), rotation);
  const sp = fieldToThree(shape.x + shelfLocal.dx, shape.y + shelfLocal.dy);
  shelf.position.set(sp.x, inToFt(LOADING_SHELF_HEIGHT_IN * 0.7), sp.z);
  shelf.rotation.y = rotation;
  shelf.rotateZ(Math.PI / 2 - LOADING_SHELF_ANGLE_RAD); // 18deg off horizontal, per the manual
  group.add(shelf);
}

// =====================================================================
// Hoppers
// =====================================================================

function addHopper(group: THREE.Group, hopper: BoxShape, palette: FieldPalette): void {
  const rotation = hopper.rotation ?? 0;

  // A hopper is NOT a box sitting on the carpet -- it's a clear
  // polycarbonate bin held up on four slender legs, floor at
  // HOPPER_FLOOR_HEIGHT_IN so fuel spills out at robot-intake height,
  // with a separate yellow strike plate that's the part a robot
  // actually pushes. A grounded solid block read as just another
  // crate against the wall.
  //
  // Built as its own local group (position + rotation.y set once) so
  // the legs, frame posts and fuel scatter can be placed in plain
  // local (x, z) offsets rather than re-deriving fieldToThree for each
  // one. This file's axis convention (see boxMeshFor) has shape.depth
  // (field Y) along local X and shape.width (field X) along local Z --
  // matching that keeps a bare `rotation.y = rotation` correct here
  // exactly like it is for every boxMeshFor-built shape in this file.
  const hopperGroup = new THREE.Group();
  const center = fieldToThree(hopper.x, hopper.y);
  hopperGroup.position.set(center.x, 0, center.z);
  hopperGroup.rotation.y = rotation;
  group.add(hopperGroup);

  const hd = inToFt(hopper.depth) / 2; // local X half-extent
  const hw = inToFt(hopper.width) / 2; // local Z half-extent
  const floorFt = inToFt(HOPPER_FLOOR_HEIGHT_IN);
  const topFt = inToFt(HOPPER_HEIGHT_IN);
  const legMat = solid(STEEL);
  const frameMat = solid(DARK_STEEL);

  // Four legs, one per corner, with low cross-bracing as in the
  // reference photos.
  const inset = inToFt(1);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      hopperGroup.add(strut(
        new THREE.Vector3(sx * (hd - inset), 0, sz * (hw - inset)),
        new THREE.Vector3(sx * (hd - inset), floorFt, sz * (hw - inset)),
        inToFt(1.4),
        legMat
      ));
    }
  }
  for (const sz of [-1, 1]) {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(hd * 2 - inset * 2, inToFt(1), inToFt(1)), legMat);
    brace.position.set(0, floorFt * 0.3, sz * (hw - inset));
    hopperGroup.add(brace);
  }

  // Deposit floor, then the clear bin above it (open-topped -- no lid).
  const floor = new THREE.Mesh(new THREE.BoxGeometry(hd * 2, inToFt(1.2), hw * 2), legMat);
  floor.position.y = floorFt;
  hopperGroup.add(floor);

  const bin = new THREE.Mesh(new THREE.BoxGeometry(hd * 2, topFt - floorFt, hw * 2), glass(0xcfd8e0, 0.16));
  bin.position.y = floorFt + (topFt - floorFt) / 2;
  hopperGroup.add(bin);

  // Frame posts at the bin's corners and a rim bar at its top, so the
  // bin reads as built tubing-and-glass rather than a tinted slab.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      hopperGroup.add(strut(
        new THREE.Vector3(sx * hd, floorFt, sz * hw),
        new THREE.Vector3(sx * hd, topFt, sz * hw),
        inToFt(1),
        frameMat
      ));
    }
  }
  const rim = new THREE.Mesh(new THREE.BoxGeometry(hd * 2 + inToFt(2), inToFt(1.2), hw * 2 + inToFt(2)), frameMat);
  rim.position.y = topFt;
  hopperGroup.add(rim);

  // A visible scatter of fuel inside the bin -- visual only (Stage 2
  // replaces this with real simulated fuel), but an empty glass box
  // reads as broken rather than "full of ~100 fuel."
  const fuelDia = inToFt(5);
  const fuelGeo = new THREE.SphereGeometry(fuelDia / 2, 8, 6);
  const fuelMat = solid(palette.accent);
  const cols = 3;
  const rows = 3;
  for (let l = 0; l < 2; l++) {
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const jitter = ((c * 7 + r * 13 + l * 19) % 5) / 10 - 0.2;
        const fuel = new THREE.Mesh(fuelGeo, fuelMat);
        fuel.position.set(
          -hd + fuelDia * (0.5 + c) + jitter * fuelDia * 0.4,
          floorFt + inToFt(1.5) + fuelDia / 2 + l * fuelDia * 0.85,
          -hw + fuelDia * (0.5 + r) + jitter * fuelDia * 0.4
        );
        hopperGroup.add(fuel);
      }
    }
  }

  // Strike plate: the panel a robot pushes to dump the hopper, on the
  // same local-+X face the original flat offset used (matching
  // rotateOffset(0, +depth/2, rotation)'s convention elsewhere in this
  // file). Amber so it reads as the interactive part.
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(inToFt(2), inToFt(HOPPER_PLATE_HEIGHT_IN), inToFt(HOPPER_PLATE_WIDTH_IN)),
    solid(palette.accent)
  );
  plate.position.set(hd + inToFt(1), inToFt(HOPPER_PLATE_ABOVE_CARPET_IN + HOPPER_PLATE_HEIGHT_IN / 2), 0);
  hopperGroup.add(plate);
  const lip = new THREE.Mesh(
    new THREE.BoxGeometry(inToFt(6), inToFt(1.2), inToFt(HOPPER_PLATE_WIDTH_IN)),
    solid(palette.accent)
  );
  lip.position.set(hd + inToFt(4), inToFt(1.4), 0);
  lip.rotation.z = THREE.MathUtils.degToRad(14);
  hopperGroup.add(lip);
}

// =====================================================================
// Primitive builders
// =====================================================================

/**
 * A box for a field BoxShape, of a given height, with its base at
 * `baseIn` above the carpet.
 *
 * shape.width is the extent along field X, which coords.ts maps to
 * three Z; shape.depth is along field Y, mapped to three X. Because the
 * geometry is already built in that orientation, a field rotation maps
 * to `rotation.y = shape.rotation` directly -- see this file's header
 * for why the old `- PI/2` was wrong.
 */
function boxMeshFor(shape: BoxShape, heightIn: number, baseIn: number, material: THREE.Material): THREE.Mesh {
  const heightFt = inToFt(heightIn);
  const geometry = new THREE.BoxGeometry(inToFt(shape.depth), heightFt, inToFt(shape.width));
  const mesh = new THREE.Mesh(geometry, material);
  const { x, z } = fieldToThree(shape.x, shape.y);
  mesh.position.set(x, inToFt(baseIn) + heightFt / 2, z);
  if (shape.rotation) mesh.rotation.y = shape.rotation;
  return mesh;
}

/** A convex prism between two heights, built in world-aligned local (x, z). */
function prism(points: Array<{ x: number; z: number }>, bottomFt: number, topFt: number, material: THREE.Material): THREE.Mesh {
  return taperedPrism(points, points, bottomFt, topFt, material, true);
}

/** A convex prism whose cross-section changes from `bottom` to `top` (used for the airship's 75deg wall flare). */
function taperedPrism(
  bottom: Array<{ x: number; z: number }>,
  top: Array<{ x: number; z: number }>,
  bottomFt: number,
  topFt: number,
  material: THREE.Material,
  caps = true
): THREE.Mesh {
  const n = bottom.length;
  const positions: number[] = [];
  for (const p of bottom) positions.push(p.x, bottomFt, p.z);
  for (const p of top) positions.push(p.x, topFt, p.z);

  const indices: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = i;
    const b = (i + 1) % n;
    indices.push(a, b, b + n, a, b + n, a + n);
  }
  if (caps) {
    for (let i = 1; i < n - 1; i++) {
      indices.push(n, n + i, n + i + 1); // top cap
      indices.push(0, i + 1, i); // bottom cap, opposite winding
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

/** A cylinder spanning two arbitrary points -- used for posts, pegs and ropes. */
function strut(from: THREE.Vector3, to: THREE.Vector3, diameterFt: number, material: THREE.Material): THREE.Mesh {
  const delta = new THREE.Vector3().subVectors(to, from);
  const length = delta.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(diameterFt / 2, diameterFt / 2, length, 8), material);
  mesh.position.copy(from).addScaledVector(delta, 0.5);
  // CylinderGeometry runs along +Y; rotate that onto the strut's axis.
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
  return mesh;
}

/** Exported for main.ts so the carpet and center line stay consistent with this file's units. */
export const FIELD_EXTENTS_FT = {
  width: inToFt(FIELD_WIDTH_IN),
  length: inToFt(FIELD_LENGTH_IN),
  midX: FIELD_MID_X_IN,
  midY: FIELD_MID_Y_IN,
};
