#!/usr/bin/env node
/**
 * download-shopify-images.mjs
 *
 * One-time script to decouple from Shopify's CDN.
 *
 * What it does:
 *   1. Reads src/data/products.ts and extracts every cdn.shopify.com URL
 *   2. Downloads each image to /public/products/{product-id}-{idx}.{ext}
 *   3. Rewrites src/data/products.ts to point at the local paths
 *
 * Run from project root:   node scripts/download-shopify-images.mjs
 * Or via npm:              npm run download-images
 *
 * Safe to re-run — skips files that already exist. Pass --force to redownload.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Resolve project root via fileURLToPath so folder names with spaces
// (e.g. "Pournogravy Website Build.") get decoded properly. Using
// URL.pathname leaves spaces percent-encoded as %20 and breaks fs.readFile.
const PROJECT_ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const PRODUCTS_TS = path.join(PROJECT_ROOT, 'src/data/products.ts');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public/products');
const FORCE = process.argv.includes('--force');

const CDN_REGEX = /https:\/\/cdn\.shopify\.com\/[^\s"']+/g;

function extFromUrl(url) {
  const cleanUrl = url.split('?')[0];
  const match = cleanUrl.match(/\.(png|jpg|jpeg|gif|webp)$/i);
  return match ? match[1].toLowerCase() : 'png';
}

async function download(url, destPath) {
  if (!FORCE && existsSync(destPath)) {
    return { status: 'skipped', url, destPath };
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buf);
  return { status: 'downloaded', url, destPath, size: buf.length };
}

async function main() {
  const tsSrc = await fs.readFile(PRODUCTS_TS, 'utf8');
  await fs.mkdir(PUBLIC_DIR, { recursive: true });

  // Parse products to map URLs → product id + index (so filenames are stable & meaningful).
  // We use a simple regex walk over the TS source rather than importing it — safer & no TS deps.
  const urlToLocal = new Map();
  const productBlocks = tsSrc.split(/\n  \{\n/).slice(1);
  for (const block of productBlocks) {
    const idMatch = block.match(/id:\s*"([^"]+)"/);
    if (!idMatch) continue;
    const pid = idMatch[1];
    const urls = [...block.matchAll(CDN_REGEX)].map(m => m[0]);
    // Dedupe while preserving order
    const uniq = [...new Set(urls)];
    uniq.forEach((url, i) => {
      if (urlToLocal.has(url)) return;
      const ext = extFromUrl(url);
      const local = `/products/${pid}-${i}.${ext}`;
      urlToLocal.set(url, local);
    });
  }

  console.log(`Found ${urlToLocal.size} unique Shopify image URLs to download.`);
  console.log(`Target: ${PUBLIC_DIR}`);
  console.log(FORCE ? '(--force: re-downloading everything)' : '(skipping files that already exist)');
  console.log();

  let downloaded = 0, skipped = 0, failed = 0;
  const failures = [];

  // Download in parallel batches of 8 to be polite
  const entries = [...urlToLocal.entries()];
  const BATCH = 8;
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(([url, local]) => {
        const destPath = path.join(PROJECT_ROOT, 'public', local);
        return download(url, destPath);
      })
    );
    results.forEach((r, idx) => {
      const [url] = batch[idx];
      if (r.status === 'fulfilled') {
        if (r.value.status === 'downloaded') {
          downloaded++;
          process.stdout.write('.');
        } else {
          skipped++;
          process.stdout.write('s');
        }
      } else {
        failed++;
        failures.push({ url, error: r.reason?.message || String(r.reason) });
        process.stdout.write('x');
      }
    });
  }
  console.log(`\n\nDownloaded: ${downloaded}  Skipped: ${skipped}  Failed: ${failed}`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach(f => console.log(`  ${f.url}\n    ${f.error}`));
    process.exit(1);
  }

  // Rewrite products.ts — replace every Shopify URL with its local path
  let rewritten = tsSrc;
  for (const [url, local] of urlToLocal) {
    // Escape special regex chars in URL
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    rewritten = rewritten.replace(new RegExp(escaped, 'g'), local);
  }
  await fs.writeFile(PRODUCTS_TS, rewritten);

  const beforeCount = (tsSrc.match(CDN_REGEX) || []).length;
  const afterCount = (rewritten.match(CDN_REGEX) || []).length;
  console.log(`\nRewrote ${PRODUCTS_TS}`);
  console.log(`Shopify URLs before: ${beforeCount}   after: ${afterCount}`);

  if (afterCount > 0) {
    console.warn('WARNING: some Shopify URLs remain in products.ts. Inspect manually.');
  } else {
    console.log('\n✓ All images decoupled from Shopify CDN. You can now unpublish the Shopify store if desired.');
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
