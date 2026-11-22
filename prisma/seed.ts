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
          model3d: p.model3d,
          brandId: brandId[p.brand],
          categoryId: catId[p.category],
          createdAt: new Date(Date.now() - p.daysAgo * 86400_000),
        },
        include: { images: true },
      });
      created++;
    }
    // attach real product photos if the product has none yet
    if (product.images.length === 0 && p.photos?.length) {
      const files = p.photos.map((n) => path.join(PHOTO_DIR, `${n}.webp`)).filter((f) => existsSync(f));
      for (const [idx, file] of files.entries()) {
        const buf = readFileSync(file);
        const meta = await sharp(buf).metadata();
        const asset = await prisma.asset.create({
          data: { filename: path.basename(file), mimeType: "image/webp", size: buf.length, driver: "db", data: new Uint8Array(buf), width: meta.width ?? null, height: meta.height ?? null },
        });
        await prisma.productImage.create({ data: { productId: product.id, assetId: asset.id, sortOrder: idx } });
      }
      if (files.length) console.log(`  + ${files.length} photo(s) for ${p.slug}`);
    }
  }
  console.log(`✓ products: ${created} created, ${products.length - created} already existed`);

  // --- settings ---
  await prisma.siteSettings.upsert({ where: { id: 1 }, create: { id: 1, content: defaultSiteContent }, update: {} });
  if ((await prisma.activityLog.count()) === 0) {
    await prisma.activityLog.create({ data: { action: "create", entity: "catalog", summary: "Каталог заполнен начальными данными" } });
  }
  console.log("✓ seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
