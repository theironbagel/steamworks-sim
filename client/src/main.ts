import "./style.css";
import * as THREE from "three";
import { FIELD_WIDTH_IN, FIELD_LENGTH_IN } from "sim";

// Stage 0 placeholder, take 2. Nathan sent real REBUILD Sim screenshots and
// it's not 2D pixel art at all: it's flat-shaded low-poly 3D (boxes and
// spheres, no lighting gradients) viewed through a fixed oblique camera,
// over a near-black background with a plain grey/white-lined field. See
// docs/art-style-guide.md for the full writeup. This file proves that look
// works in our stack before Stage 1 builds anything real on top of it.
//
// sim/ still only knows 2D field dimensions in inches -- this file is the
// only place that knows those numbers become a 3D scene, and it converts
// inches -> feet -> Three.js units (1 unit = 1 ft) purely for its own
// readability. That boundary matters: when Stage 1 adds real physics, sim/
// still reasons in a flat 2D plane, and client/ is still the only thing
// that draws it as a 3D diorama.

const INCHES_PER_FOOT = 12;
const fieldWidthFt = FIELD_WIDTH_IN / INCHES_PER_FOOT; // 27
const fieldLengthFt = FIELD_LENGTH_IN / INCHES_PER_FOOT; // 54.33

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <h1>STEAMWORKS SIM</h1>
  <div id="scene"></div>
  <p>Stage 0 placeholder -- field shown at real proportions (27ft x 54ft4in), REBUILD-style camera/shading.</p>
`;

const style = getComputedStyle(document.documentElement);
const color = (name: string) => style.getPropertyValue(name).trim();

const sceneEl = document.querySelector<HTMLDivElement>("#scene")!;
const width = Math.min(window.innerWidth * 0.9, 900);
const height = width * 0.55;

const scene = new THREE.Scene();
scene.background = new THREE.Color(color("--color-bg"));

const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 500);
// Elevated, off to one side, looking at the field center -- this is what
// produces the trapezoid field shape in the reference screenshots, not an
// isometric projection.
camera.position.set(0, fieldLengthFt * 0.8, fieldLengthFt * 1.0);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(width, height);
sceneEl.appendChild(renderer.domElement);

// Flat, unlit materials -- the reference has no lighting gradient on any
// face, just a single flat color per surface. One soft light so pure
// MeshBasicMaterial doesn't look *completely* flat is a later call; for
// now we match the reference literally and skip lighting entirely.

// Field carpet: plain dark grey plane, not green -- REBUILD's field reads
// as a neutral court surface, closer to a real FRC field's grey tile.
const carpet = new THREE.Mesh(
  new THREE.PlaneGeometry(fieldWidthFt, fieldLengthFt),
  new THREE.MeshBasicMaterial({ color: 0x2a2a2a })
);
carpet.rotation.x = -Math.PI / 2;
scene.add(carpet);

// Boundary + center line, drawn as thin white geometry sitting just above
// the carpet (avoids z-fighting with the plane).
const lineMaterial = new THREE.LineBasicMaterial({ color: color("--color-field-line") });
const halfW = fieldWidthFt / 2;
const halfL = fieldLengthFt / 2;
const boundaryPoints = [
  new THREE.Vector3(-halfW, 0.01, -halfL),
  new THREE.Vector3(halfW, 0.01, -halfL),
  new THREE.Vector3(halfW, 0.01, halfL),
  new THREE.Vector3(-halfW, 0.01, halfL),
  new THREE.Vector3(-halfW, 0.01, -halfL),
];
scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(boundaryPoints), lineMaterial));
const centerLinePoints = [new THREE.Vector3(0, 0.01, -halfL), new THREE.Vector3(0, 0.01, halfL)];
scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(centerLinePoints), lineMaterial));

// A single placeholder robot: a layered box, alliance-red, sitting on the
// red starting line -- stands in for real robot geometry until Stage 1.
const robotGroup = new THREE.Group();
const chassis = new THREE.Mesh(
  new THREE.BoxGeometry(2.5, 0.8, 2.8),
  new THREE.MeshBasicMaterial({ color: color("--color-red") })
);
chassis.position.y = 0.4;
const turret = new THREE.Mesh(
  new THREE.BoxGeometry(1.4, 0.6, 1.4),
  new THREE.MeshBasicMaterial({ color: color("--color-amber") })
);
turret.position.y = 1.1;
robotGroup.add(chassis, turret);
robotGroup.position.set(0, 0, halfL - 3);
scene.add(robotGroup);

renderer.render(scene, camera);
