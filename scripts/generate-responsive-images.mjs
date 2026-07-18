// Generate responsive WebP variants for local product images.
//
// For every /public/products/*.webp it writes <name>-320w.webp, <name>-640w.webp,
// <name>-960w.webp (skipping any width >= the source width, i.e. no upscaling), and
// emits src/data/imageVariants.json mapping each base path to the widths that exist.
// The runtime helper (src/lib/responsiveImage.ts) reads that manifest so it only ever
// emits a srcset for images that actually have variants — remote/DB images fall through
// untouched.
//
// Run: node scripts/generate-responsive-images.mjs
// Re-run after adding new local product images.

import sharp from "sharp";
import { readdir, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PRODUCTS_DIR = path.join(ROOT, "public", "products");
const MANIFEST_PATH = path.join(ROOT, "src", "data", "imageVariants.json");

const WIDTHS = [320, 640, 960];
// Skip files that are themselves already a generated variant.
const VARIANT_SUFFIX = /-(\d+)w\.webp$/;

async function main() {
  if (!existsSync(PRODUCTS_DIR)) {
    console.error(`No products dir at ${PRODUCTS_DIR}`);
    process.exit(1);
  }

  const files = (await readdir(PRODUCTS_DIR))
    .filter((f) => f.endsWith(".webp") && !VARIANT_SUFFIX.test(f));

  const manifest = {}; // "name" (without .webp) -> [widths]
  let generated = 0;
  let skipped = 0;

  for (const file of files) {
    const base = file.replace(/\.webp$/, "");
    const srcPath = path.join(PRODUCTS_DIR, file);
    const meta = await sharp(srcPath).metadata();
    const srcWidth = meta.width ?? 0;

    const available = [];
    for (const w of WIDTHS) {
      // No upscaling: skip a width the source can't satisfy (with 10% tolerance).
      if (w > srcWidth * 1.1) continue;
      const outPath = path.join(PRODUCTS_DIR, `${base}-${w}w.webp`);
      if (existsSync(outPath)) {
        available.push(w);
        skipped++;
        continue;
      }
      await sharp(srcPath)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(outPath);
      available.push(w);
      generated++;
    }

    if (available.length > 0) manifest[base] = available;
  }

  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 0) + "\n");

  console.log(
    `Responsive images: ${generated} generated, ${skipped} already present, ` +
      `${Object.keys(manifest).length} base images in manifest.`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
