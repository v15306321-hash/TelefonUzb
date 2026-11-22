/**
 * Idempotent seed: creates the admin account (from ADMIN_USERNAME / ADMIN_PASSWORD),
 * initial categories, brands, demo catalog and site settings. Existing records are
 * never overwritten, so it is safe to run on every deploy.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createPrisma } from "../src/lib/prisma-factory";
import bcrypt from "bcryptjs";
import sharp from "sharp";
import { brands, categories, products } from "./seed-data";
import { defaultSiteContent } from "../src/lib/types";

const prisma = createPrisma();
const PHOTO_DIR = path.join(__dirname, "seed-assets", "photos");

async function main() {
  // --- admin ---
  const username = (process.env.ADMIN_USERNAME ?? "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if ((await prisma.adminUser.count()) === 0) {
    if (!username || password.length < 10) {
      console.warn("⚠  No admin created: set ADMIN_USERNAME and ADMIN_PASSWORD (min 10 chars) and run the seed again.");
    } else {
      await prisma.adminUser.create({ data: { username, passwordHash: await bcrypt.hash(password, 12) } });
      console.log(`✓ admin "${username}" created`);
    }
  }

  // --- taxonomy ---
  for (const c of categories) await prisma.category.upsert({ where: { slug: c.slug }, create: c, update: {} });
  for (const b of brands) await prisma.brand.upsert({ where: { slug: b.slug }, create: b, update: {} });
  const catId = Object.fromEntries((await prisma.category.findMany()).map((c) => [c.slug, c.id]));
  const brandId = Object.fromEntries((await prisma.brand.findMany()).map((b) => [b.slug, b.id]));

  // --- products ---
  let created = 0;
  for (const [i, p] of products.entries()) {
    let product = await prisma.product.findUnique({ where: { slug: p.slug }, include: { images: true } });
    if (!product) {
      product = await prisma.product.create({
        data: {
          slug: p.slug,
          nameRu: p.nameRu,
          nameUz: p.nameUz ?? p.nameRu,
          descriptionRu: p.descriptionRu,
          descriptionUz: p.descriptionUz,
          price: p.price,
          specialPrice: p.specialPrice ?? null,
          inStock: p.inStock ?? true,
          isHidden: p.hidden ?? false,
          isFeatured: p.isFeatured ?? false,
          sortOrder: i * 10,
          storageOptions: p.storage,
          colors: p.colors,
          specs: p.specs,
          brandId: brandId[p.brand],
          categoryId: catId[p.category],
          createdAt: new Date(Date.now() - p.daysAgo * 86400_000),
        },
        include: { images: true },
      });
      created++;
    }
    if (!product) continue;
    // upgrade seeded colour lists that the admin has not changed
    // compare ignoring JSON key order (PostgreSQL jsonb reorders keys)
    const sig = (list: unknown) =>
      JSON.stringify((Array.isArray(list) ? list : []).map((c: { nameRu?: string; nameUz?: string; hex?: string }) => [c.nameRu, c.nameUz, c.hex?.toLowerCase()]));
    const currentColors = sig(product.colors);
    if (p.previousColors?.some((prev) => sig(prev) === currentColors)) {
      product = await prisma.product.update({ where: { id: product.id }, data: { colors: p.colors }, include: { images: true } });
      console.log(`  ~ colours updated for ${p.slug}`);
    }
    await syncPhotos(product.id, p.slug, p.photos ?? [], p.colors.map((c) => c.hex.toLowerCase()));
  }
  console.log(`✓ products: ${created} created, ${products.length - created} already existed`);

  // --- settings ---
  await prisma.siteSettings.upsert({ where: { id: 1 }, create: { id: 1, content: defaultSiteContent }, update: {} });
  if ((await prisma.activityLog.count()) === 0) {
    await prisma.activityLog.create({ data: { action: "create", entity: "catalog", summary: "Каталог заполнен начальными данными" } });
  }
  console.log("✓ seed complete");
}

/**
 * Attach seed photos to a product: adds missing photos, links existing ones to their colour.
 * Every attached photo is recorded in the activity log, so a photo the admin deleted is never re-added.
 */
async function syncPhotos(productId: string, slug: string, photos: NonNullable<(typeof products)[number]["photos"]>, hexes: string[]) {
  if (!photos.length) return;
  const images = await prisma.productImage.findMany({ where: { productId }, include: { asset: { select: { filename: true } } }, orderBy: { sortOrder: "asc" } });
  let order = images.reduce((m, i) => Math.max(m, i.sortOrder), -1) + 1;
  let added = 0;
  for (const [idx, entry] of photos.entries()) {
    const file = typeof entry === "string" ? entry : entry.file;
    const colorIdx = typeof entry === "string" ? idx : entry.color;
    const colorKey = hexes[colorIdx] ?? null;
    const filename = `${file}.webp`;
    const marker = `${slug}/${file}`;
    const existing = images.find((i) => i.asset.filename === filename);
    if (existing) {
      if (existing.colorKey !== colorKey) await prisma.productImage.update({ where: { id: existing.id }, data: { colorKey } });
      if (!(await prisma.activityLog.findFirst({ where: { action: "seed-photo", summary: marker } }))) {
        await prisma.activityLog.create({ data: { action: "seed-photo", entity: "product", entityId: productId, summary: marker } });
      }
      continue;
    }
    if (await prisma.activityLog.findFirst({ where: { action: "seed-photo", summary: marker } })) continue; // removed by admin
    const path_ = path.join(PHOTO_DIR, filename);
    if (!existsSync(path_)) continue;
    const buf = readFileSync(path_);
    const meta = await sharp(buf).metadata();
    const asset = await prisma.asset.create({
      data: { filename, mimeType: "image/webp", size: buf.length, driver: "db", data: new Uint8Array(buf), width: meta.width ?? null, height: meta.height ?? null },
    });
    await prisma.productImage.create({ data: { productId, assetId: asset.id, sortOrder: order++, colorKey } });
    await prisma.activityLog.create({ data: { action: "seed-photo", entity: "product", entityId: productId, summary: marker } });
    added++;
  }
  if (added) console.log(`  + ${added} photo(s) for ${slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
