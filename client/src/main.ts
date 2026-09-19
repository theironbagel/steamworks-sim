import "./style.css";
import { FIELD_WIDTH_IN, FIELD_LENGTH_IN } from "sim";

// This page doesn't do anything yet — it exists to prove the pipeline works
// end to end: sim/ (game data) -> client/ (rendering) -> Vite build -> Vercel,
// and now to preview the art-style-guide.md palette/fonts on something real.
// Real field geometry (walls, airship, boilers, hoppers) comes later in
// Stage 0, once it's transcribed into data/field/.

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <h1>STEAMWORKS SIM</h1>
  <canvas id="field"></canvas>
  <p>Stage 0 placeholder — field shown at real proportions (27ft x 54ft4in).</p>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#field")!;
const ctx = canvas.getContext("2d")!;

// Read the palette straight from style.css's CSS variables, so this file
// never hardcodes a color the style guide doesn't already define.
const style = getComputedStyle(document.documentElement);
const color = (name: string) => style.getPropertyValue(name).trim();

// The field is longer than it is wide, so draw it "landscape": length along
// the x-axis, width along the y-axis.
const scale = 4; // pixels per inch, arbitrary for now
canvas.width = FIELD_LENGTH_IN / scale;
canvas.height = FIELD_WIDTH_IN / scale;

ctx.fillStyle = color("--color-field");
ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.strokeStyle = color("--color-field-line");
ctx.lineWidth = 2;
ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

// A center line, just so the rectangle doesn't look like an accident.
ctx.beginPath();
ctx.moveTo(canvas.width / 2, 0);
ctx.lineTo(canvas.width / 2, canvas.height);
ctx.stroke();

// A red/blue swatch at each end, previewing the alliance colors against the
// field green — this is the kind of thing that's easy to get wrong (too
// saturated, clashes with the green) and cheap to check now.
const swatchWidth = 14;
ctx.fillStyle = color("--color-blue");
ctx.fillRect(0, 0, swatchWidth, canvas.height);
ctx.fillStyle = color("--color-red");
ctx.fillRect(canvas.width - swatchWidth, 0, swatchWidth, canvas.height);
