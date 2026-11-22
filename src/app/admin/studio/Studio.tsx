"use client";

import { useCallback } from "react";
import RenderFromModel from "@/components/admin/RenderFromModel";
import type { Model3DConfig } from "@/lib/types";

declare global {
  interface Window {
    __studioResult?: string;
    __studioError?: string;
  }
}

export default function Studio({ config, color, mode }: { config: Model3DConfig; color: string; mode: "pair" | "back" | "front" }) {
  const onDone = useCallback((blob: Blob) => {
    const r = new FileReader();
    r.onload = () => (window.__studioResult = String(r.result));
    r.readAsDataURL(blob);
  }, []);
  const onError = useCallback((e: Error) => (window.__studioError = e.message), []);
  return <RenderFromModel config={config} color={color} mode={mode} onDone={onDone} onError={onError} />;
}
