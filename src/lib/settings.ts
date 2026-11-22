import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "./db";
import { assetUrl } from "./storage";
import { defaultSiteContent, siteContentSchema, type SiteContent } from "./types";

export const SETTINGS_TAG = "settings";

export async function readSiteContent(): Promise<SiteContent> {
  const row = await prisma.siteSettings.findUnique({ where: { id: 1 } });
  const merged = { ...defaultSiteContent, ...((row?.content as object | null) ?? {}) };
  const parsed = siteContentSchema.safeParse(merged);
  return parsed.success ? parsed.data : defaultSiteContent;
}

export const getSiteContent = unstable_cache(readSiteContent, ["site-content-v1"], {
  tags: [SETTINGS_TAG],
  revalidate: 3600,
});

export type SiteMedia = { logo: string; heroVideo: string; heroVideoMobile: string; heroPoster: string; heroPosterMobile: string };

/** Resolve uploaded media with bundled defaults as fallback. */
export function resolveMedia(c: SiteContent): SiteMedia {
  const heroVideo = assetUrl(c.heroVideoAssetId) ?? "/media/hero.mp4";
  return {
    logo: assetUrl(c.logoAssetId) ?? "/media/logo.webp",
    heroVideo,
    // a custom uploaded video replaces both desktop and mobile versions unless a mobile one is provided
    heroVideoMobile: assetUrl(c.heroVideoMobileAssetId) ?? (c.heroVideoAssetId ? heroVideo : "/media/hero-mobile-43.mp4"),
    heroPoster: assetUrl(c.heroPosterAssetId) ?? (c.heroVideoAssetId ? "" : "/media/hero-poster.webp"),
    heroPosterMobile: assetUrl(c.heroPosterAssetId) ?? (c.heroVideoAssetId ? "" : "/media/hero-poster-mobile-43.webp"),
  };
}
