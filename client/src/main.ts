import "./style.css";
import { FIELD_WIDTH_IN, FIELD_LENGTH_IN } from "sim";

// This page doesn't do anything yet — it exists to prove the pipeline works
// end to end: sim/ (game data) -> client/ (rendering) -> Vite build -> Vercel.
// It draws the FRC field's actual proportions (27 ft x 54 ft 4 in) as a
// plain rectangle. Real field geometry (walls, airship, boilers, hoppers)
// comes later in Stage 0, once it's transcribed into data/field/.

const app = document.querySelector<HTMLDivElement>("#app")!;
app.innerHTML = `
  <canvas id="field"></canvas>
  <p>Steamworks Sim — Stage 0 placeholder. Field shown at real proportions (27ft x 54ft4in).</p>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#field")!;
const ctx = canvas.getContext("2d")!;

// The field is longer than it is wide, so draw it "landscape": length along
// the x-axis, width along the y-axis.
const scale = 4; // pixels per inch, arbitrary for now
canvas.width = FIELD_LENGTH_IN / scale;
canvas.height = FIELD_WIDTH_IN / scale;

ctx.fillStyle = "#2f6b3a"; // green carpet
ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.strokeStyle = "#e8e8e8";
ctx.lineWidth = 2;
ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);

// A center line, just so the rectangle doesn't look like an accident.
ctx.beginPath();
ctx.moveTo(canvas.width / 2, 0);
ctx.lineTo(canvas.width / 2, canvas.height);
ctx.stroke();
