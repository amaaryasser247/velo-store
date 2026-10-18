/**
 * Photo-backdrop check: product photos must meet their `chalk` frame with no
 * visible seam. The app blends them with `multiply`, so a studio shot whose
 * border composites to pure white lands exactly on the frame tint, and a
 * transparent border simply shows the plate through. What must NOT happen is
 * a photo with an opaque, uniform non-white backdrop (a light grey studio
 * backdrop): multiply renders it as a slightly darker rectangle against the
 * frame.
 *
 * Full-bleed lifestyle shots (no alpha, high-variance border) are allowed:
 * they cover their whole tile, so no backdrop meets the frame.
 *
 *   npx tsx scripts/check-backdrops.ts
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const ROOT = "public/images/products";
/** Width of the border ring that is sampled. */
const RING = 6;
/** Ring pixels at/above this on every channel composite to white. */
const WHITE_FLOOR = 250;
/** A low p10..p90 spread means the border is a deliberate backdrop. */
const UNIFORM_SPREAD = 40;

function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)));
  return sorted[index] ?? 255;
}

type Row = {
  sku: string;
  file: string;
  alpha: string;
  p10: number;
  p90: number;
  spread: number;
  status: string;
};

const rows: Row[] = [];
const dirs = await readdir(ROOT, { withFileTypes: true });
for (const dir of dirs) {
  if (!dir.isDirectory()) continue;
  const files = await readdir(join(ROOT, dir.name));
  for (const file of files.filter((f) => f.endsWith(".webp")).sort()) {
    const buf = await readFile(join(ROOT, dir.name, file));
    const meta = await sharp(buf).metadata();
    // Composite over white first: that is what the browser shows wherever the
    // photo is transparent (over the plate), and what multiply uses otherwise.
    const { data, info } = await sharp(buf)
      .flatten({ background: "#ffffff" })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;
    const mins: number[] = [];
    for (let y = 0; y < height; y++) {
      const edgeY = y < RING || y >= height - RING;
      for (let x = 0; x < width; x++) {
        if (!edgeY && x >= RING && x < width - RING) continue;
        const i = (y * width + x) * channels;
        mins.push(Math.min(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0));
      }
    }
    const p10 = percentile(mins, 0.1);
    const p90 = percentile(mins, 0.9);
    const spread = p90 - p10;
    const alpha = meta.hasAlpha === true;
    let status: string;
    if (p10 >= WHITE_FLOOR) status = "ok (white/transparent edge)";
    else if (spread < UNIFORM_SPREAD) status = "FAIL (uniform non-white backdrop)";
    else if (!alpha) status = "note (full-bleed photo, covers its tile)";
    else status = "FAIL (opaque non-white edge)";
    rows.push({
      sku: dir.name,
      file,
      alpha: alpha ? "yes" : "-",
      p10,
      p90,
      spread,
      status,
    });
  }
}

console.table(rows);
const failures = rows.filter((row) => row.status.startsWith("FAIL"));
console.log(
  `\ncheck-backdrops: ${rows.length} photos -> ${failures.length} with a backdrop that would show a rectangle on the frame`,
);
if (failures.length > 0) process.exitCode = 1;
