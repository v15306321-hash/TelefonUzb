"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import type { Model3DConfig } from "@/lib/types";
import { createRotationState } from "@/components/viewer/rotation";

const ViewerCanvas = dynamic(() => import("@/components/viewer/ViewerCanvas"), { ssr: false });

/**
 * Off-screen renderer that produces a studio product shot (transparent PNG)
 * from the 3D model — used to create catalog photos when no real photos exist.
 */
export default function RenderFromModel({
  config,
  color,
  modelUrl,
  mode = "pair",
  size = 1200,
  onDone,
  onError,
}: {
  config: Model3DConfig;
  color: string;
  modelUrl?: string | null;
  mode?: "pair" | "back" | "front";
  size?: number;
  onDone: (blob: Blob) => void;
  onError: (e: Error) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const stateRef = useRef(createRotationState());
  const done = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => !done.current && onError(new Error("Не удалось отрисовать модель")), 20000);
    return () => clearTimeout(t);
  }, [onError]);

  const capture = () => {
    if (done.current) return;
    // wait a couple of frames so environment lighting is fully applied
    setTimeout(() => {
      const canvas = wrap.current?.querySelector("canvas");
      if (!canvas) return onError(new Error("Canvas не найден"));
      canvas.toBlob((blob) => {
        if (!blob) return onError(new Error("Не удалось получить изображение"));
        done.current = true;
        onDone(blob);
      }, "image/png");
    }, 350);
  };

  return (
    <div ref={wrap} aria-hidden style={{ position: "fixed", left: -10000, top: 0, width: size / 2, height: (size / 2) * 1.25, pointerEvents: "none" }}>
      <ViewerCanvas config={config} color={color} modelUrl={modelUrl} stateRef={stateRef} active studio={mode} onReady={capture} onError={() => onError(new Error("WebGL недоступен"))} />
    </div>
  );
}
