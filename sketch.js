const canvas = document.querySelector("#field");
const context = canvas.getContext("2d", { alpha: false });
const swatches = document.querySelector("#swatches");

const palettes = [
  ["#fa745f", "#ffb46e", "#d56da3", "#9d8eea", "#f7d888"],
  ["#68b8d5", "#7897ef", "#a9d8ca", "#d2a9eb", "#e7d9bb"],
  ["#ff8059", "#f2c34e", "#d9e27a", "#faad84", "#d77ac1"],
  ["#70d6c1", "#76aedf", "#b4d994", "#b7a4ef", "#e7d3b1"],
  ["#ee6fb2", "#a36ff0", "#5da5ed", "#f19572", "#d5a5ef"],
  ["#c4d48a", "#e7aa65", "#e97f68", "#81b7a5", "#d9ca9f"],
  ["#f486a3", "#ffd16d", "#8ce0d4", "#9c92ef", "#f2a4d5"]
];

const randomBetween = (min, max) => min + Math.random() * (max - min);

let width = 0;
let height = 0;
let pixelRatio = 1;
let lines = [];
let ripples = [];
let paletteIndex = -1;
let elapsed = 0;
let lastFrame = 0;

function resizeCanvas() {
  const bounds = canvas.getBoundingClientRect();
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  width = bounds.width;
  height = bounds.height;
  canvas.width = Math.round(width * pixelRatio);
  canvas.height = Math.round(height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  createLines();
}

function createLines() {
  const spacing = width < 700 ? 9 : 8;
  lines = Array.from({ length: Math.ceil(height / spacing) + 2 }, (_, index) => ({
    y: index * spacing - spacing,
    amplitude: randomBetween(10, width < 700 ? 24 : 30),
    frequency: randomBetween(0.016, 0.042),
    phase: randomBetween(0, Math.PI * 2),
    speed: randomBetween(0.2, 0.78) * (Math.random() < 0.5 ? -1 : 1),
    sharpness: randomBetween(6, 10),
    sway: randomBetween(0.12, 0.28),
    color: paletteIndex >= 0
      ? palettes[paletteIndex][Math.floor(Math.random() * palettes[paletteIndex].length)]
      : "#ffffff",
    alpha: randomBetween(0.32, 0.82),
    thickness: randomBetween(0.65, 1.45)
  }));
}

function choosePalette() {
  let nextIndex = Math.floor(Math.random() * palettes.length);
  if (palettes.length > 1 && nextIndex === paletteIndex) {
    nextIndex = (nextIndex + 1 + Math.floor(Math.random() * (palettes.length - 1))) % palettes.length;
  }
  paletteIndex = nextIndex;
  const palette = palettes[paletteIndex];
  swatches.replaceChildren(...palette.map((color) => {
    const swatch = document.createElement("i");
    swatch.style.backgroundColor = color;
    swatch.style.color = color;
    swatch.setAttribute("aria-label", color);
    return swatch;
  }));
}

function generateField() {
  choosePalette();
  createLines();
}

function addRipple(event) {
  const bounds = canvas.getBoundingClientRect();
  ripples.push({
    x: (event.clientX - bounds.left) * (width / bounds.width),
    y: (event.clientY - bounds.top) * (height / bounds.height),
    start: elapsed
  });
  if (ripples.length > 6) ripples.shift();
  generateField();
}

function draw(time) {
  const delta = lastFrame ? Math.min((time - lastFrame) / 1000, 0.05) : 0;
  lastFrame = time;
  elapsed += delta;

  context.clearRect(0, 0, width, height);
  const wash = context.createRadialGradient(width * 0.7, height * 0.48, 0, width * 0.7, height * 0.48, width * 0.75);
  wash.addColorStop(0, "rgba(35, 18, 30, 0.31)");
  wash.addColorStop(1, "rgba(9, 10, 13, 0)");
  context.fillStyle = "#090a0d";
  context.fillRect(0, 0, width, height);
  context.fillStyle = wash;
  context.fillRect(0, 0, width, height);

  const step = width < 700 ? 3.5 : 4.5;
  const revealProgress = Math.min(elapsed / 3.2, 1);
  const revealDistance = (width / 2 + step) * (1 - (1 - revealProgress) ** 3);
  ripples = ripples.filter((ripple) => elapsed - ripple.start < 6);
  for (const line of lines) {
    const phase = line.phase + elapsed * line.speed;
    const path = new Path2D();
    let drawingSegment = false;
    for (let x = -step; x <= width + step; x += step) {
      const visible = x <= revealDistance || x >= width - revealDistance;
      if (!visible) {
        drawingSegment = false;
        continue;
      }

      const wave = Math.sin(x * line.frequency + phase);
      const spike = Math.sign(wave) * Math.pow(Math.abs(wave), line.sharpness);
      const drift = Math.sin(x * line.frequency * 0.46 - phase * 0.72) * line.sway;
      const detail = Math.sin(x * line.frequency * 2.8 + phase * 1.3) * 0.12;
      let rippleOffset = 0;
      for (const ripple of ripples) {
        const age = elapsed - ripple.start;
        const distance = Math.hypot(x - ripple.x, line.y - ripple.y);
        const radius = age * 280;
        const ring = Math.exp(-(((distance - radius) / 220) ** 2));
        rippleOffset += Math.sin((distance - radius) * 0.055) * ring * Math.exp(-age * 0.45);
      }
      const y = line.y + line.amplitude * (spike + drift + detail) + rippleOffset * 34;
      if (!drawingSegment) {
        path.moveTo(x, y);
        drawingSegment = true;
      } else {
        path.lineTo(x, y);
      }
    }

    context.globalAlpha = line.alpha * 0.16;
    context.strokeStyle = line.color;
    context.lineWidth = line.thickness * 4;
    context.stroke(path);
    context.globalAlpha = line.alpha;
    context.lineWidth = line.thickness;
    context.stroke(path);
  }
  context.globalAlpha = 1;
  window.requestAnimationFrame(draw);
}

canvas.addEventListener("click", addRipple);
window.addEventListener("resize", resizeCanvas);
resizeCanvas();
generateField();
window.requestAnimationFrame(draw);
