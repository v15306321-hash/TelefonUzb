"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type { Model3DConfig } from "@/lib/types";
import { beginDrag, createRotationState, dragBy, endDrag, zoomBy } from "./rotation";

const ViewerCanvas = dynamic(() => import("./ViewerCanvas"), { ssr: false });

type Props = {
  config: Model3DConfig;
  color: string;
  modelUrl?: string | null;
  fallbackImage?: { url: string; width: number | null; height: number | null } | null;
  alt: string;
  labels: { dragHint: string; loading: string; fallback: string; zoomIn?: string; zoomOut?: string };
};

function detectWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Very weak devices / data saver get the photo instead of the real-time renderer. */
function isLowEndDevice(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return true;
  if (typeof nav.deviceMemory === "number" && nav.deviceMemory < 2) return true;
  return typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency < 2;
}

/** Pointer position → normalised viewport coordinates (-1..1, y up). */
function focusOf(el: HTMLElement, x: number, y: number): [number, number] {
  const r = el.getBoundingClientRect();
  return [((x - r.left) / r.width) * 2 - 1, -(((y - r.top) / r.height) * 2 - 1)];
}

class ViewerErrorBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("[3D viewer] falling back to image:", error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function ProductViewer({ config, color, modelUrl, fallbackImage, alt, labels }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(createRotationState());
  const [support, setSupport] = useState<"unknown" | "webgl" | "none">("unknown");
  const [inView, setInView] = useState(false);
  const [everInView, setEverInView] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);

  useEffect(() => {
    setSupport(detectWebGL() && !isLowEndDevice() ? "webgl" : "none");
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onMq = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onMq);
    const onVis = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mq.removeEventListener("change", onMq);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // Load three.js + model only when the viewer is (nearly) visible; pause rendering off-screen.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setEverInView(true);
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => setReady(false), [modelUrl]);

  // Ctrl/⌘ + wheel and trackpad pinch (reported as ctrl+wheel) zoom; plain wheel keeps scrolling the page.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || support !== "webgl") return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const [u, v] = focusOf(el, e.clientX, e.clientY);
      zoomBy(stateRef.current, Math.exp(-e.deltaY * 0.01), u, v);
      setInteracted(true);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [support]);

  const pinchCenter = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : { x: 0, y: 0 };
  };
  const pinchDistance = () => {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture(e.pointerId);
    if (pointers.current.size === 2) {
      pinch.current = pinchDistance();
    } else {
      beginDrag(stateRef.current);
      setDragging(true);
    }
    setInteracted(true);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    const prev = { ...p };
    p.x = e.clientX;
    p.y = e.clientY;
    if (pointers.current.size >= 2) {
      const dist = pinchDistance();
      if (pinch.current && dist > 0 && wrapRef.current) {
        const c = pinchCenter();
        const [u, v] = focusOf(wrapRef.current, c.x, c.y);
        zoomBy(stateRef.current, dist / pinch.current, u, v);
      }
      pinch.current = dist;
      return;
    }
    const w = e.currentTarget.clientWidth || 1;
    dragBy(stateRef.current, (p.x - prev.x) / w, (p.y - prev.y) / w);
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 1) {
      beginDrag(stateRef.current); // continue rotating with the remaining finger
      return;
    }
    if (pointers.current.size === 0) {
      endDrag(stateRef.current);
      setDragging(false);
    }
  }, []);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const map: Record<string, [number, number]> = { ArrowLeft: [-0.06, 0], ArrowRight: [0.06, 0], ArrowUp: [0, -0.06], ArrowDown: [0, 0.06] };
    if (e.key === "+" || e.key === "=") return zoomBy(stateRef.current, 1.2);
    if (e.key === "-") return zoomBy(stateRef.current, 1 / 1.2);
    const d = map[e.key];
    if (!d) return;
    e.preventDefault();
    dragBy(stateRef.current, d[0], d[1]);
    endDrag(stateRef.current);
  }, []);

  const show3d = support === "webgl" && !failed;
  const showImage = !show3d || !ready;

  return (
    <div
      ref={wrapRef}
      className={`viewer relative h-full w-full select-none ${show3d ? (dragging ? "cursor-grabbing" : "cursor-grab") : ""}`}
      style={{ touchAction: show3d ? "none" : "auto" }}
      onPointerDown={show3d ? onPointerDown : undefined}
      onPointerMove={show3d ? onPointerMove : undefined}
      onPointerUp={show3d ? onPointerUp : undefined}
      onPointerCancel={show3d ? onPointerUp : undefined}
      onLostPointerCapture={show3d ? onPointerUp : undefined}
      onKeyDown={show3d ? onKeyDown : undefined}
      tabIndex={show3d ? 0 : -1}
      role={show3d ? "img" : undefined}
      aria-label={alt}
    >
      {/* soft studio floor glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_60%,rgba(255,255,255,0.08),transparent_62%)]" />

      {showImage && fallbackImage && (
        <div className={`absolute inset-0 flex items-center justify-center p-6 transition-opacity duration-700 ${show3d && !ready ? "opacity-30" : "opacity-100"}`}>
          <Image
            src={fallbackImage.url}
            alt={alt}
            width={fallbackImage.width ?? 1200}
            height={fallbackImage.height ?? 1200}
            sizes="(max-width: 1024px) 90vw, 50vw"
            className="h-full w-auto max-w-full rounded-3xl object-contain"
            priority
          />
        </div>
      )}

      {show3d && everInView && (
        <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
          <ViewerErrorBoundary onError={() => setFailed(true)}>
            <ViewerCanvas
              config={config}
              color={color}
              modelUrl={modelUrl}
              stateRef={stateRef}
              active={inView && pageVisible}
              reducedMotion={reducedMotion}
              onReady={() => setReady(true)}
              onError={() => setFailed(true)}
            />
          </ViewerErrorBoundary>
        </div>
      )}

      {show3d && !ready && (
        <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
          <span className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs text-white/60 backdrop-blur">
            <span className="h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />
            {labels.loading}
          </span>
        </div>
      )}

      {show3d && ready && (
        <>
          <div className="absolute right-3 top-3 flex flex-col gap-2 sm:right-4 sm:top-4">
            {[
              { k: "in", label: labels.zoomIn ?? "+", f: 1.35, icon: "M12 6v12M6 12h12" },
              { k: "out", label: labels.zoomOut ?? "−", f: 1 / 1.35, icon: "M6 12h12" },
            ].map((b) => (
              <button
                key={b.k}
                type="button"
                aria-label={b.label}
                title={b.label}
                onClick={() => {
                  zoomBy(stateRef.current, b.f);
                  setInteracted(true);
                }}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/45 text-white/80 backdrop-blur-md transition hover:border-white/30 hover:text-white"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d={b.icon} />
                </svg>
              </button>
            ))}
          </div>
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4 transition-opacity duration-500 ${interacted ? "opacity-0" : "opacity-100"}`}
          >
            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-center text-xs text-white/70 backdrop-blur-md">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                <path d="M7 12a5 5 0 0 1 10 0M4 12a8 8 0 0 1 16 0" strokeLinecap="round" />
                <path d="m17 9 3 3 3-3M7 9l-3 3-3-3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {labels.dragHint}
            </span>
          </div>
        </>
      )}

      {support === "none" && <p className="absolute inset-x-0 bottom-3 text-center text-xs text-white/45">{labels.fallback}</p>}
    </div>
  );
}
