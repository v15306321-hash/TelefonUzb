import "server-only";
import { prisma } from "../db";
import { deleteAsset } from "../storage";
import { readSiteContent } from "../settings";

/** Asset ids referenced from site settings (logo, video, banners...). */
export async function settingsAssetIds(): Promise<Set<string>> {
  const c = await readSiteContent();
  return new Set(
    [c.logoAssetId, c.heroVideoAssetId, c.heroVideoMobileAssetId, c.heroPosterAssetId, ...c.banners.map((b) => b.imageAssetId)].filter(
      (x): x is string => !!x,
    ),
  );
}

/** Delete given assets if nothing references them anymore. */
export async function deleteIfUnreferenced(ids: string[]) {
  if (!ids.length) return;
  const keep = await settingsAssetIds();
  for (const id of ids) {
    if (keep.has(id)) continue;
    const refs = await prisma.asset.findUnique({
      where: { id },
      select: { _count: { select: { productImages: true, productModels: true } } },
    });
    if (refs && refs._count.productImages === 0 && refs._count.productModels === 0) await deleteAsset(id);
  }
}

/** Remove uploads that were never attached to anything (older than 24h). */
export async function cleanupOrphanAssets() {
  const keep = await settingsAssetIds();
  const orphans = await prisma.asset.findMany({
    where: {
      createdAt: { lt: new Date(Date.now() - 24 * 3600 * 1000) },
      productImages: { none: {} },
      productModels: { none: {} },
    },
    select: { id: true },
    take: 200,
  });
  for (const o of orphans) if (!keep.has(o.id)) await deleteAsset(o.id);
}
