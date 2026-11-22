/**
 * Batch-renders studio product images from the procedural 3D models (headless Chromium + WebGL)
 * into prisma/seed-assets/<slug>-1.webp (front+back composition) and <slug>-2.webp (back 3/4 view).
 * Then `npm run db:seed` attaches them to products that have no photos yet.
 *
 * Requires a running app (npm run dev / start) and admin credentials:
 *   BASE_URL=http://localhost:3000 ADMIN_USERNAME=admin ADMIN_PASSWORD=... npm run render:images
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.join(process.cwd(), "prisma", "seed-assets");
const force = process.argv.includes("--force");
mkdirSync(OUT, { recursive: true });

// seed-data.ts is TypeScript — load it through tsx
const { register } = await import("tsx/esm/api");
register();
const { products } = await import("../prisma/seed-data.ts");

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });

await page.goto(`${BASE}/admin/login`);
await page.fill('input[name="username"]', process.env.ADMIN_USERNAME ?? "admin");
await page.fill('input[name="password"]', process.env.ADMIN_PASSWORD ?? "");
await Promise.all([page.waitForURL(`${BASE}/admin`), page.click('button[type="submit"]')]);

for (const p of products) {
  const jobs = [
    { file: `${p.slug}-1.webp`, mode: "pair", color: p.colors[0].hex },
    { file: `${p.slug}-2.webp`, mode: "back", color: (p.colors[1] ?? p.colors[0]).hex },
  ];
  for (const job of jobs) {
    const target = path.join(OUT, job.file);
    if (existsSync(target) && !force) continue;
    const qs = new URLSearchParams({ ...p.model3d, color: job.color, mode: job.mode });
    let result;
    let error;
    for (let attempt = 1; attempt <= 3 && !result; attempt++) {
      try {
        await page.goto(`${BASE}/admin/studio?${qs}`, { timeout: 120000 });
        await page.waitForFunction(() => window.__studioResult || window.__studioError, null, { timeout: 120000 });
        ({ result, error } = await page.evaluate(() => ({ result: window.__studioResult, error: window.__studioError })));
      } catch (e) {
        error = e.message.split("\n")[0];
        console.warn(`  retry ${job.file} (${attempt}): ${error}`);
      }
    }
    if (error || !result) {
      console.error(`✗ ${job.file}: ${error}`);
      continue;
    }
    const png = Buffer.from(result.split(",")[1], "base64");
    const webp = await sharp(png).webp({ quality: 88, alphaQuality: 92 }).toBuffer();
    writeFileSync(target, webp);
    console.log(`✓ ${job.file} (${Math.round(webp.length / 1024)} KB)`);
  }
}
await browser.close();
