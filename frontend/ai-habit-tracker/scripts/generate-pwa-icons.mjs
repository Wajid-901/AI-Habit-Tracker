// Generates the placeholder PWA PNG icons (pure JS, no native deps).
// Indigo brand background (#6366F1) with a centered white circle that stays
// inside the maskable safe zone. Does not touch the existing favicon.svg.
import { PNG } from "pngjs";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "..", "public");

const BG = [99, 102, 241, 255]; // #6366F1 indigo
const FG = [255, 255, 255, 255]; // white circle

function makeIcon(size) {
  const png = new PNG({ width: size, height: size });
  const cx = size / 2;
  const cy = size / 2;
  // ~32% radius stays inside the maskable 40% safe zone.
  const radius = size * 0.32;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // Anti-aliased edge blended over ~1px.
      const coverage = Math.max(0, Math.min(1, radius - dist + 0.5));

      png.data[idx] = Math.round(BG[0] * (1 - coverage) + FG[0] * coverage);
      png.data[idx + 1] = Math.round(BG[1] * (1 - coverage) + FG[1] * coverage);
      png.data[idx + 2] = Math.round(BG[2] * (1 - coverage) + FG[2] * coverage);
      png.data[idx + 3] = 255; // fully opaque background
    }
  }

  return PNG.sync.write(png);
}

const targets = [
  "pwa-64x64.png",
  "pwa-192x192.png",
  "pwa-512x512.png",
  "maskable-icon-512x512.png",
];

mkdirSync(publicDir, { recursive: true });

for (const name of targets) {
  const size = parseInt(name.match(/(\d+)x\d+/)[1], 10);
  writeFileSync(join(publicDir, name), makeIcon(size));
  console.log(`generated ${name} (${size}x${size})`);
}

console.log("PWA icons generated in public/");
