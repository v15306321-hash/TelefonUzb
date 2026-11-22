import { requireAdmin } from "@/lib/auth/server";
import { model3dSchema } from "@/lib/types";
import Studio from "./Studio";

export const dynamic = "force-dynamic";

/** Internal page used by scripts/render-product-images.mjs to batch-render catalog images. */
export default async function StudioPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const config = model3dSchema.parse({ kind: sp.kind, layout: sp.layout, frame: sp.frame, preset: sp.preset || undefined });
  const color = /^#[0-9a-f]{6}$/i.test(sp.color ?? "") ? sp.color! : "#1d1d1f";
  const mode = sp.mode === "back" || sp.mode === "front" ? sp.mode : "pair";
  return <Studio config={config} color={color} mode={mode} />;
}
