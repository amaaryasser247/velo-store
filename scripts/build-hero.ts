/**
 * Hero photo build: crops and resizes assets-src/hero/nike-just-do-it.jpg into
 * public/images/hero/ at the widths the <picture> sources need, in AVIF, WebP
 * and JPEG. Below 768px the hero shows a dedicated portrait crop of the
 * middle of the frame, so the head, the bucket hat and one shoe stay in view.
 *
 *   npm run hero:build
 *
 * The generated files are committed; the source photo lives under assets-src/
 * (never under public/). Budgets: largest AVIF/WebP <= 180 KB, JPEG <= 250 KB.
 */
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const SRC = join("assets-src", "hero", "nike-just-do-it.jpg");
const OUT = join("public", "images", "hero");
const SRC_WIDTH = 1793;
const SRC_HEIGHT = 945;

/** Full-frame widths; 1793 is the native source width (never upscale). */
const FULL_WIDTHS = [640, 960, 1440, SRC_WIDTH];
/** Portrait crop for below-768px screens: ~35% to ~75% of the frame width. */
const CROP_LEFT = Math.round(SRC_WIDTH * 0.35);
const CROP_WIDTH = Math.round(SRC_WIDTH * 0.75) - CROP_LEFT;
const MOBILE_WIDTHS = [640, CROP_WIDTH];

const BUDGET: Record<Ext, number> = {
  avif: 180 * 1024,
  webp: 180 * 1024,
  jpg: 250 * 1024,
};

type Ext = "avif" | "webp" | "jpg";

function encode(width: number, ext: Ext, input: sharp.Sharp): Promise<Buffer> {
  const pipeline = input.resize({ width, withoutEnlargement: true });
  if (ext === "avif") return pipeline.avif({ quality: 55, effort: 6 }).toBuffer();
  if (ext === "webp") return pipeline.webp({ quality: 80, effort: 5 }).toBuffer();
  return pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
}

async function main(): Promise<void> {
  const meta = await sharp(SRC).metadata();
  if (meta.format !== "jpeg" || meta.width !== SRC_WIDTH || meta.height !== SRC_HEIGHT) {
    throw new Error(
      `Unexpected hero source: ${meta.format} ${meta.width}x${meta.height} (want jpeg ${SRC_WIDTH}x${SRC_HEIGHT})`,
    );
  }

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const full = sharp(SRC);
  const mobile = sharp(SRC).extract({ left: CROP_LEFT, top: 0, width: CROP_WIDTH, height: SRC_HEIGHT });
  const targets: Array<{ prefix: string; source: sharp.Sharp; widths: number[] }> = [
    { prefix: "hero", source: full, widths: FULL_WIDTHS },
    { prefix: "hero-mobile", source: mobile, widths: MOBILE_WIDTHS },
  ];

  const biggest: Record<Ext, { name: string; bytes: number }> = {
    avif: { name: "", bytes: 0 },
    webp: { name: "", bytes: 0 },
    jpg: { name: "", bytes: 0 },
  };

  for (const target of targets) {
    for (const width of target.widths) {
      if (width > SRC_WIDTH) continue; // never upscale
      for (const ext of ["avif", "webp", "jpg"] as Ext[]) {
        const name = `${target.prefix}-${width}.${ext}`;
        const buffer = await encode(width, ext, target.source.clone());
        await writeFile(join(OUT, name), buffer);
        if (buffer.byteLength > biggest[ext].bytes) biggest[ext] = { name, bytes: buffer.byteLength };
        console.log(`${name.padEnd(24)} ${String(Math.round(buffer.byteLength / 1024)).padStart(4)} KB`);
      }
    }
  }

  for (const ext of Object.keys(BUDGET) as Ext[]) {
    if (biggest[ext].bytes > BUDGET[ext]) {
      throw new Error(
        `${ext} budget blown: ${biggest[ext].name} is ${Math.round(biggest[ext].bytes / 1024)} KB (limit ${Math.round(BUDGET[ext] / 1024)} KB)`,
      );
    }
  }

  const files = await Promise.all(
    ["hero-1793.avif", "hero-1793.jpg", "hero-mobile-640.avif", `hero-mobile-${CROP_WIDTH}.jpg`].map(
      async (name) => {
        const info = await stat(join(OUT, name));
        return `${name} ${Math.round(info.size / 1024)} KB`;
      },
    ),
  );
  console.log(`\nhero:build OK - mobile crop x ${CROP_LEFT}..${CROP_LEFT + CROP_WIDTH} (${CROP_WIDTH}x${SRC_HEIGHT})`);
  console.log(`largest avif ${Math.round(biggest.avif.bytes / 1024)} KB, webp ${Math.round(biggest.webp.bytes / 1024)} KB, jpg ${Math.round(biggest.jpg.bytes / 1024)} KB`);
  console.log(files.join(" | "));
}

await main();
