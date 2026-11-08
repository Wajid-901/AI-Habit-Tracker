/**
 * Generates PWA PNG icons that match the AI Habit Tracker brand mark:
 *   - Dark rounded-square background  (#1c1408)
 *   - Amber habit-loop ring arc        (#fbbf24 → #b45309)
 *   - White checkmark inside the ring
 *   - Two amber spark dots (top-right)
 *
 * Pure JS — no native deps (pngjs only).
 * Run: node scripts/generate-pwa-icons.mjs
 */

import { PNG } from "pngjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");
mkdirSync(publicDir, { recursive: true });

// ── Colour helpers ──────────────────────────────────────────────────────────

function hex(h) {
  const n = parseInt(h.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

function lerp(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

// Amber gradient: position 0 = #fbbf24, position 1 = #b45309
function amberAt(t) {
  return lerp(hex("#fbbf24"), hex("#b45309"), t);
}

// ── Low-level rasteriser helpers ─────────────────────────────────────────────

function setPixel(png, x, y, col, alpha = 1) {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= png.width || yi >= png.height) return;
  const idx = (png.width * yi + xi) << 2;
  if (alpha >= 1) {
    png.data[idx]     = col[0];
    png.data[idx + 1] = col[1];
    png.data[idx + 2] = col[2];
    png.data[idx + 3] = 255;
  } else {
    // Alpha-blend over existing pixel
    const a = alpha;
    png.data[idx]     = Math.round(png.data[idx]     * (1 - a) + col[0] * a);
    png.data[idx + 1] = Math.round(png.data[idx + 1] * (1 - a) + col[1] * a);
    png.data[idx + 2] = Math.round(png.data[idx + 2] * (1 - a) + col[2] * a);
    png.data[idx + 3] = 255;
  }
}

// Filled rounded rectangle (background)
function fillRoundRect(png, col, radius) {
  const w = png.width;
  const h = png.height;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Distance from nearest corner centre
      const cx = x < radius ? radius : x > w - 1 - radius ? w - 1 - radius : x;
      const cy = y < radius ? radius : y > h - 1 - radius ? h - 1 - radius : y;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const coverage = Math.max(0, Math.min(1, radius - dist + 0.5));
      if (coverage > 0) setPixel(png, x, y, col, coverage);
    }
  }
}

// Thick anti-aliased arc
function drawArc(png, cx, cy, r, startDeg, endDeg, thickness, colorFn) {
  const steps = Math.ceil(2 * Math.PI * r * 4); // plenty of steps
  const startR = (startDeg * Math.PI) / 180;
  const endR   = (endDeg   * Math.PI) / 180;
  const range  = endR - startR;

  for (let i = 0; i <= steps; i++) {
    const t    = i / steps;
    const ang  = startR + t * range;
    const bx   = cx + r * Math.cos(ang);
    const by   = cy + r * Math.sin(ang);
    const col  = colorFn(t);

    // Paint a filled disk of radius = thickness/2 at each arc point
    const half = thickness / 2;
    for (let dy = -Math.ceil(half); dy <= Math.ceil(half); dy++) {
      for (let dx = -Math.ceil(half); dx <= Math.ceil(half); dx++) {
        const d = Math.sqrt(dx * dx + dy * dy);
        const alpha = Math.max(0, Math.min(1, half - d + 0.5));
        if (alpha > 0) setPixel(png, bx + dx, by + dy, col, alpha);
      }
    }
  }
}

// Anti-aliased line segment (for checkmark strokes)
function drawLine(png, x0, y0, x1, y1, thickness, col) {
  const dx  = x1 - x0;
  const dy  = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(len * 3);
  const half  = thickness / 2;

  for (let i = 0; i <= steps; i++) {
    const t  = i / steps;
    const bx = x0 + dx * t;
    const by = y0 + dy * t;

    for (let oy = -Math.ceil(half); oy <= Math.ceil(half); oy++) {
      for (let ox = -Math.ceil(half); ox <= Math.ceil(half); ox++) {
        const d = Math.sqrt(ox * ox + oy * oy);
        const alpha = Math.max(0, Math.min(1, half - d + 0.5));
        if (alpha > 0) setPixel(png, bx + ox, by + oy, col, alpha);
      }
    }
  }
}

// Filled circle (for spark dots)
function fillCircle(png, cx, cy, r, col) {
  for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
    for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
      const d = Math.sqrt(dx * dx + dy * dy);
      const alpha = Math.max(0, Math.min(1, r - d + 0.5));
      if (alpha > 0) setPixel(png, cx + dx, cy + dy, col, alpha);
    }
  }
}

// ── Icon builder ─────────────────────────────────────────────────────────────

function makeIcon(size) {
  const png = new PNG({ width: size, height: size });

  // 1. Background — dark (#1c1408), corner radius ~22% of size
  const bg = hex("#1c1408");
  const cornerR = size * 0.218;
  fillRoundRect(png, bg, cornerR);

  // Scale factor (design drawn on a 64×64 grid)
  const s = size / 64;

  // 2. Habit-loop ring arc (~270°, gap at bottom-right)
  //    Centre (32,32) → radius 20, stroke 5 on the 64px grid
  const ringCx     = 32 * s;
  const ringCy     = 32 * s;
  const ringR      = 20 * s;
  const ringW      = Math.max(2, 5 * s);
  // Arc from -210° to 60° (270° sweep, gap at bottom-right ~60°→150°)
  drawArc(png, ringCx, ringCy, ringR, -210, 60, ringW, (t) => amberAt(t));

  // 3. Checkmark  M22,32 L29,39 L43,25  (on 64px grid)
  const ckW  = Math.max(1.5, 3.5 * s);
  const ckCol = hex("#fffbeb"); // very light amber-white
  drawLine(png, 22*s, 32*s, 29*s, 39*s, ckW, ckCol);
  drawLine(png, 29*s, 39*s, 43*s, 25*s, ckW, ckCol);

  // 4. Spark dots  (48,17) r=3  and  (54,23) r=2
  fillCircle(png, 48*s, 17*s, 3*s, hex("#fde68a"));
  fillCircle(png, 54*s, 23*s, 2*s, hex("#f59e0b"));

  return PNG.sync.write(png);
}

// ── Generate all sizes ────────────────────────────────────────────────────────

const targets = [
  { name: "pwa-64x64.png",           size: 64  },
  { name: "pwa-192x192.png",         size: 192 },
  { name: "pwa-512x512.png",         size: 512 },
  { name: "maskable-icon-512x512.png", size: 512 },
];

for (const { name, size } of targets) {
  writeFileSync(join(publicDir, name), makeIcon(size));
  console.log(`✓ ${name} (${size}×${size})`);
}

console.log("\nPWA icons generated in public/");
