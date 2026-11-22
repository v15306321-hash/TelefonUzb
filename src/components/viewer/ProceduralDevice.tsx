"use client";

/**
 * Real-time procedural 3D smartphone / tablet model (three.js geometry + physically based materials).
 * Used when a product has no uploaded GLB/GLTF model. Proportions, camera-module layout,
 * frame finish and colour are configurable per product (Product.model3d).
 *
 * Detail level: rounded unibody frame with antenna lines, frosted back glass, raised glass
 * camera plateau, multi-element lenses with coated optics, flash, mic, capsule buttons,
 * USB-C port and speaker grilles, thin bezels, Dynamic Island / punch-hole and a
 * high-resolution sculpted wallpaper.
 */

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Model3DConfig } from "@/lib/types";

type Dims = { w: number; h: number; d: number; r: number };

/** Units: 1 = 100 mm (phone ≈ 78 × 162 × 8.4 mm). */
export const DEVICE_DIMS: Record<Model3DConfig["kind"], Dims> = {
  phone: { w: 0.78, h: 1.62, d: 0.084, r: 0.125 },
  tablet: { w: 1.18, h: 1.66, d: 0.058, r: 0.09 },
};

/* ------------------------------------------------------------------ geometry helpers */

function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  // cubic corners approximate Apple-style "continuous" (squircle-like) curvature
  const k = 0.62;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.bezierCurveTo(x + w - r * (1 - k), y, x + w, y + r * (1 - k), x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.bezierCurveTo(x + w, y + h - r * (1 - k), x + w - r * (1 - k), y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.bezierCurveTo(x + r * (1 - k), y + h, x, y + h - r * (1 - k), x, y + h - r);
  s.lineTo(x, y + r);
  s.bezierCurveTo(x, y + r * (1 - k), x + r * (1 - k), y, x + r, y);
  return s;
}

/** Flat rounded rectangle with UVs normalised to its bounding box. */
function flatRoundedRect(w: number, h: number, r: number, segments = 40) {
  const g = new THREE.ShapeGeometry(roundedRectShape(w, h, r), segments);
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / w + 0.5;
    uv[i * 2 + 1] = pos.getY(i) / h + 0.5;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

function extrudedRoundedRect(w: number, h: number, r: number, depth: number, bevel: number, curveSegments = 48, bevelSegments = 10) {
  const g = new THREE.ExtrudeGeometry(roundedRectShape(w - bevel * 2, h - bevel * 2, Math.max(0.001, r - bevel)), {
    depth: Math.max(0.0005, depth - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments,
    curveSegments,
  });
  g.translate(0, 0, -(depth - bevel * 2) / 2);
  g.computeVertexNormals();
  return g;
}

function shade(hex: string, amount: number, satMul = 1) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, THREE.MathUtils.clamp(hsl.s * satMul, 0, 1), THREE.MathUtils.clamp(hsl.l + amount, 0, 1));
  return c;
}

/* ------------------------------------------------------------------ procedural textures */

function canvasTexture(canvas: HTMLCanvasElement, srgb = true) {
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

let lensTexCache: THREE.Texture | null = null;
/** Camera lens face: coated glass, concentric optical elements, reflections. */
function lensTexture() {
  if (lensTexCache) return lensTexCache;
  const S = 512;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const m = S / 2;
  g.fillStyle = "#020203";
  g.fillRect(0, 0, S, S);
  // inner barrel shading
  let grd = g.createRadialGradient(m, m, S * 0.05, m, m, S * 0.5);
  grd.addColorStop(0, "#080a18");
  grd.addColorStop(0.35, "#0b1026");
  grd.addColorStop(0.62, "#07080f");
  grd.addColorStop(1, "#000000");
  g.fillStyle = grd;
  g.beginPath();
  g.arc(m, m, S * 0.5, 0, Math.PI * 2);
  g.fill();
  // anti-reflective coating sheen (violet / green)
  grd = g.createRadialGradient(m * 0.86, m * 0.8, 0, m, m, S * 0.36);
  grd.addColorStop(0, "rgba(120,100,230,0.32)");
  grd.addColorStop(0.45, "rgba(50,70,170,0.14)");
  grd.addColorStop(0.8, "rgba(40,180,140,0.12)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.beginPath();
  g.arc(m, m, S * 0.36, 0, Math.PI * 2);
  g.fill();
  // optical element rings
  for (const [r, a, lw] of [
    [0.47, 0.22, 5],
    [0.4, 0.1, 3],
    [0.31, 0.16, 3],
    [0.22, 0.12, 2],
    [0.13, 0.2, 2],
  ] as const) {
    g.strokeStyle = `rgba(190,200,255,${a})`;
    g.lineWidth = lw;
    g.beginPath();
    g.arc(m, m, S * r, 0, Math.PI * 2);
    g.stroke();
  }
  // pupil
  grd = g.createRadialGradient(m, m, 0, m, m, S * 0.1);
  grd.addColorStop(0, "#000");
  grd.addColorStop(1, "#090b18");
  g.fillStyle = grd;
  g.beginPath();
  g.arc(m, m, S * 0.1, 0, Math.PI * 2);
  g.fill();
  // specular reflections
  g.strokeStyle = "rgba(255,255,255,0.55)";
  g.lineWidth = 10;
  g.lineCap = "round";
  g.beginPath();
  g.arc(m, m, S * 0.38, Math.PI * 1.1, Math.PI * 1.38);
  g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.18)";
  g.lineWidth = 6;
  g.beginPath();
  g.arc(m, m, S * 0.26, Math.PI * 0.1, Math.PI * 0.35);
  g.stroke();
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.beginPath();
  g.ellipse(m - S * 0.12, m - S * 0.14, S * 0.035, S * 0.022, -0.6, 0, Math.PI * 2);
  g.fill();
  lensTexCache = canvasTexture(c);
  return lensTexCache;
}

let flashTexCache: THREE.Texture | null = null;
function flashTexture() {
  if (flashTexCache) return flashTexCache;
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const m = S / 2;
  const grd = g.createRadialGradient(m, m, 0, m, m, m);
  grd.addColorStop(0, "#fdfcf6");
  grd.addColorStop(0.55, "#ece8dc");
  grd.addColorStop(1, "#b8b4a8");
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  g.strokeStyle = "rgba(120,110,80,0.35)";
  for (let r = 10; r < m; r += 9) {
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(m, m, r, 0, Math.PI * 2);
    g.stroke();
  }
  flashTexCache = canvasTexture(c);
  return flashTexCache;
}

let grainTexCache: THREE.Texture | null = null;
/** Fine noise used as roughness map → frosted / matte glass look. */
function grainTexture() {
  if (grainTexCache) return grainTexCache;
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const img = g.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    const v = 150 + Math.random() * 70;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = canvasTexture(c, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 12);
  grainTexCache = t;
  return t;
}

/** Organic blob path (closed, smooth) around (cx, cy). */
function blobPath(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, seed: number) {
  const n = 7;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + seed;
    const rr = r * (0.88 + 0.14 * Math.sin(seed * 3.1 + i * 1.7));
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % n];
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    if (i === 0) g.moveTo(mx, my);
    else g.quadraticCurveTo(x0, y0, mx, my);
  }
  const [x0, y0] = pts[0];
  const [x1, y1] = pts[1];
  g.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
  g.closePath();
}

const screenTexCache = new Map<string, THREE.Texture>();
/** Cached wallpaper per colour/kind (shared between instances, e.g. the studio pair). */
function screenTexture(color: string, kind: Model3DConfig["kind"], island: boolean) {
  const key = `${color}|${kind}|${island}`;
  let tex = screenTexCache.get(key);
  if (!tex) {
    tex = makeScreenTexture(color, kind, island);
    screenTexCache.set(key, tex);
    if (screenTexCache.size > 16) {
      const [oldKey, old] = screenTexCache.entries().next().value!;
      screenTexCache.delete(oldKey);
      old.dispose();
    }
  }
  return tex;
}

/** High-resolution lock-screen wallpaper: sculpted soft shapes tinted by the device colour. */
function makeScreenTexture(color: string, kind: Model3DConfig["kind"], island: boolean) {
  const W = kind === "tablet" ? 1400 : 1024;
  const H = kind === "tablet" ? 2016 : 2200;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const g = canvas.getContext("2d")!;
  const base = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  const hue = Math.round(hsl.h * 360);
  const sat = Math.round(Math.min(0.55, hsl.s * 0.75) * 100);

  g.fillStyle = `hsl(${hue}, ${Math.round(sat * 0.4)}%, 4%)`;
  g.fillRect(0, 0, W, H);

  const shapes: [number, number, number, number][] = [
    // cx, cy (fractions), radius (fraction of W), seed
    [0.98, 0.46, 0.62, 1.3],
    [0.22, 0.13, 0.3, 4.1],
    [-0.02, 0.47, 0.22, 2.2],
    [0.62, 0.98, 0.7, 5.7],
  ];
  for (const [fx, fy, fr, seed] of shapes) {
    const cx = fx * W;
    const cy = fy * H;
    const r = fr * W;
    g.save();
    g.shadowColor = "rgba(0,0,0,0.85)";
    g.shadowBlur = W * 0.08;
    g.shadowOffsetX = W * 0.02;
    g.shadowOffsetY = W * 0.03;
    blobPath(g, cx, cy, r, seed);
    // lit from the upper left
    const grd = g.createRadialGradient(cx - r * 0.45, cy - r * 0.5, r * 0.05, cx, cy, r * 1.15);
    grd.addColorStop(0, `hsl(${hue}, ${sat}%, 88%)`);
    grd.addColorStop(0.35, `hsl(${hue}, ${sat}%, 62%)`);
    grd.addColorStop(0.75, `hsl(${hue}, ${Math.round(sat * 0.9)}%, 24%)`);
    grd.addColorStop(1, `hsl(${hue}, ${Math.round(sat * 0.6)}%, 9%)`);
    g.fillStyle = grd;
    g.fill();
    g.restore();
  }
  // film grain for a photographic feel
  const img = g.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 10;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);

  // front camera
  if (kind === "phone") {
    g.fillStyle = "#000";
    if (island) {
      const pw = W * 0.3;
      const ph = W * 0.088;
      g.beginPath();
      g.roundRect((W - pw) / 2, H * 0.016, pw, ph, ph / 2);
      g.fill();
      const lx = W / 2 + pw * 0.3;
      const ly = H * 0.016 + ph / 2;
      const lg = g.createRadialGradient(lx - 3, ly - 3, 0, lx, ly, ph * 0.26);
      lg.addColorStop(0, "#3b4a8a");
      lg.addColorStop(0.5, "#141a33");
      lg.addColorStop(1, "#050507");
      g.fillStyle = lg;
      g.beginPath();
      g.arc(lx, ly, ph * 0.24, 0, Math.PI * 2);
      g.fill();
    } else {
      g.beginPath();
      g.arc(W / 2, H * 0.03, W * 0.03, 0, Math.PI * 2);
      g.fill();
    }
  }
  return canvasTexture(canvas);
}

/* ------------------------------------------------------------------ camera module layouts */

type Lens = { x: number; y: number; r: number };
type Small = { x: number; y: number; r: number; kind: "flash" | "mic" | "sensor" };
type Plateau = { x: number; y: number; w: number; h: number; r: number; metal?: boolean };

/** Camera module in "back view" coordinates (x to the right when looking at the back). */
function cameraLayout(layout: Model3DConfig["layout"], dims: Dims) {
  const top = dims.h / 2;
  const left = -dims.w / 2;
  const lenses: Lens[] = [];
  const smalls: Small[] = [];
  let plateau: Plateau | null = null;

  switch (layout) {
    case "pro-triangle": {
      const s = dims.w * 0.47;
      const cx = left + 0.035 + s / 2;
      const cy = top - 0.035 - s / 2;
      plateau = { x: cx, y: cy, w: s, h: s, r: s * 0.27 };
      const lr = s * 0.215;
      lenses.push({ x: cx - s * 0.225, y: cy + s * 0.225, r: lr }, { x: cx - s * 0.225, y: cy - s * 0.225, r: lr }, { x: cx + s * 0.235, y: cy, r: lr });
      smalls.push({ x: cx + s * 0.25, y: cy + s * 0.3, r: s * 0.07, kind: "flash" }, { x: cx + s * 0.25, y: cy - s * 0.3, r: s * 0.06, kind: "sensor" }, { x: cx + s * 0.02, y: cy, r: s * 0.018, kind: "mic" });
      break;
    }
    case "dual-diagonal": {
      const s = dims.w * 0.4;
      const cx = left + 0.04 + s / 2;
      const cy = top - 0.04 - s / 2;
      plateau = { x: cx, y: cy, w: s, h: s, r: s * 0.3 };
      const lr = s * 0.215;
      lenses.push({ x: cx - s * 0.2, y: cy + s * 0.2, r: lr }, { x: cx + s * 0.2, y: cy - s * 0.2, r: lr });
      smalls.push({ x: cx + s * 0.24, y: cy + s * 0.24, r: s * 0.085, kind: "flash" }, { x: cx - s * 0.27, y: cy - s * 0.27, r: s * 0.025, kind: "mic" });
      break;
    }
    case "vertical-trio": {
      const lr = dims.w * 0.088;
      const x = left + 0.135;
      for (let i = 0; i < 3; i++) lenses.push({ x, y: top - 0.165 - i * lr * 2.5, r: lr });
      smalls.push({ x: x + lr * 2.1, y: top - 0.165, r: lr * 0.34, kind: "flash" }, { x: x + lr * 2.1, y: top - 0.165 - lr * 1.25, r: lr * 0.22, kind: "sensor" });
      break;
    }
    case "horizontal-bar": {
      const bh = dims.h * 0.13;
      const cy = top - 0.24;
      plateau = { x: 0, y: cy, w: dims.w + 0.006, h: bh, r: bh * 0.48, metal: true };
      const lr = bh * 0.3;
      lenses.push({ x: -dims.w * 0.28, y: cy, r: lr }, { x: -dims.w * 0.12, y: cy, r: lr }, { x: dims.w * 0.04, y: cy, r: lr });
      smalls.push({ x: dims.w * 0.2, y: cy, r: lr * 0.38, kind: "flash" });
      break;
    }
    case "square-quad": {
      const s = dims.w * 0.5;
      const cx = left + 0.05 + s / 2;
      const cy = top - 0.05 - s / 2;
      plateau = { x: cx, y: cy, w: s, h: s, r: s * 0.24 };
      const lr = s * 0.19;
      for (const [dx, dy] of [[-1, 1], [1, 1], [-1, -1]] as const) lenses.push({ x: cx + dx * s * 0.22, y: cy + dy * s * 0.22, r: lr });
      smalls.push({ x: cx + s * 0.22, y: cy - s * 0.22, r: s * 0.08, kind: "flash" });
      break;
    }
    case "round-module": {
      const R = dims.w * 0.3;
      const cy = top - 0.07 - R;
      plateau = { x: 0, y: cy, w: R * 2, h: R * 2, r: R };
      const lr = R * 0.33;
      for (const [dx, dy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) lenses.push({ x: dx * R * 0.42, y: cy + dy * R * 0.42, r: lr });
      smalls.push({ x: R * 1.25, y: cy + R * 0.6, r: R * 0.1, kind: "flash" });
      break;
    }
    case "single":
    default: {
      const lr = dims.w * 0.055;
      lenses.push({ x: left + 0.1, y: top - 0.1, r: lr });
      smalls.push({ x: left + 0.1, y: top - 0.1 - lr * 2.3, r: lr * 0.35, kind: "flash" }, { x: left + 0.1 + lr * 2, y: top - 0.1, r: lr * 0.15, kind: "mic" });
    }
  }
  return { lenses, smalls, plateau };
}

/* ------------------------------------------------------------------ component */

export function ProceduralDevice({ config, color }: { config: Model3DConfig; color: string }) {
  const dims = DEVICE_DIMS[config.kind];
  const isApple = config.layout === "pro-triangle" || config.layout === "dual-diagonal";

  const geo = useMemo(() => {
    const { w, h, d, r } = dims;
    const bevel = Math.min(d * 0.3, 0.024);
    const bezel = config.kind === "tablet" ? 0.04 : 0.024;
    return {
      body: extrudedRoundedRect(w, h, r, d, bevel),
      back: flatRoundedRect(w - 0.014, h - 0.014, r - 0.007, 64),
      frontGlass: flatRoundedRect(w - 0.01, h - 0.01, r - 0.005, 64),
      screen: flatRoundedRect(w - bezel * 2, h - bezel * 2, r - bezel * 0.9, 64),
      port: flatRoundedRect(0.088, Math.min(0.03, d * 0.36), 0.015),
      hole: new THREE.CircleGeometry(1, 20),
      lensFace: new THREE.CircleGeometry(1, 64),
      ring: new THREE.CylinderGeometry(1, 1, 1, 64, 1, true),
      ringCap: new THREE.RingGeometry(0.8, 1, 64),
      capsule: new THREE.CapsuleGeometry(0.5, 1, 8, 16),
    };
  }, [dims, config.kind]);

  const cam = useMemo(() => cameraLayout(config.layout, dims), [config.layout, dims]);

  const mats = useMemo(() => {
    const body = new THREE.Color(color);
    const titanium = config.frame === "titanium";
    const polished = config.frame === "polished";
    // anodised aluminium frames follow the body colour; titanium/steel are more neutral
    const frameColor = titanium
      ? shade(color, 0.04, 0.5).lerp(new THREE.Color("#8e8b86"), 0.45)
      : polished
        ? shade(color, 0.06, 0.8).lerp(new THREE.Color("#c4c4c8"), 0.35)
        : shade(color, 0.02, 1.05).lerp(new THREE.Color("#9a9a9e"), 0.12);
    const grain = grainTexture();
    const frame = new THREE.MeshPhysicalMaterial({
      color: frameColor,
      metalness: 1,
      roughness: titanium ? 0.34 : polished ? 0.1 : 0.27,
      anisotropy: titanium ? 0.6 : 0.25,
      clearcoat: polished ? 0.8 : 0,
      clearcoatRoughness: 0.15,
    });
    const back = new THREE.MeshPhysicalMaterial({
      color: body,
      metalness: 0,
      roughness: 0.5,
      roughnessMap: grain,
      clearcoat: 0.55,
      clearcoatRoughness: 0.42,
      sheen: 0.5,
      sheenRoughness: 0.6,
      sheenColor: shade(color, 0.25),
      ior: 1.52,
    });
    const plateau = new THREE.MeshPhysicalMaterial({
      color: shade(color, -0.03, 1.15),
      metalness: 0,
      roughness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      ior: 1.6,
    });
    const ring = new THREE.MeshPhysicalMaterial({ color: shade(color, -0.02, 1.1).lerp(frameColor, 0.5), metalness: 1, roughness: 0.2 });
    const ringInner = new THREE.MeshStandardMaterial({ color: "#060607", metalness: 0.4, roughness: 0.5, side: THREE.DoubleSide });
    const lens = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      map: lensTexture(),
      metalness: 0,
      roughness: 0.05,
      clearcoat: 1,
      clearcoatRoughness: 0.01,
      iridescence: 0.6,
      iridescenceIOR: 1.7,
      iridescenceThicknessRange: [200, 480],
      envMapIntensity: 0.7,
    });
    const flash = new THREE.MeshPhysicalMaterial({ color: "#ffffff", map: flashTexture(), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 });
    const dark = new THREE.MeshStandardMaterial({ color: "#050506", roughness: 0.6, metalness: 0.2 });
    const sensor = new THREE.MeshPhysicalMaterial({ color: "#0b0c10", roughness: 0.15, clearcoat: 1 });
    const antenna = new THREE.MeshStandardMaterial({ color: shade(color, 0.08, 0.6), roughness: 0.65, metalness: 0 });
    const frontGlass = new THREE.MeshPhysicalMaterial({ color: "#000000", roughness: 0.1, metalness: 0, specularIntensity: 0.45 });
    const barWindow = new THREE.MeshPhysicalMaterial({ color: "#050506", roughness: 0.05, clearcoat: 1 });
    return { frame, back, plateau, ring, ringInner, lens, flash, dark, sensor, antenna, frontGlass, barWindow };
  }, [color, config.frame]);

  const screenMat = useMemo(() => {
    // the display is self-lit: an unlit material keeps the wallpaper deep and vivid
    return new THREE.MeshBasicMaterial({ map: screenTexture(color, config.kind, isApple), toneMapped: false });
  }, [color, config.kind, isApple]);

  // glass over the display: only adds reflections (additive), never washes out the picture
  const screenGlass = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#000000",
        roughness: 0.03,
        metalness: 0,
        specularIntensity: 0.35,
        clearcoat: 0.25,
        clearcoatRoughness: 0.02,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => () => screenGlass.dispose(), [screenGlass]);
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
    },
    [geo],
  );
  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
    },
    [mats],
  );
  useEffect(
    () => () => {
      screenMat.dispose(); // texture is cached & shared
    },
    [screenMat],
  );

  const { w, h, d } = dims;
  const zBack = -d / 2 - 0.0004;
  const zFront = d / 2 + 0.0004;
  const plateauDepth = cam.plateau ? (cam.plateau.metal ? 0.028 : 0.014) : 0;

  /** capsule-shaped side button; length along Y */
  const button = (key: string, side: 1 | -1, y: number, len: number) => (
    <mesh
      key={key}
      geometry={geo.capsule}
      material={mats.frame}
      position={[side * (w / 2 - 0.002), y, 0]}
      scale={[0.016, len / 2, d * 0.38]}
      castShadow
    />
  );

  /** antenna band: thin non-metal strip across the side of the frame */
  const antennaBand = (key: string, x: number, y: number, horizontal = false) => (
    <mesh key={key} material={mats.antenna} position={[x, y, 0]}>
      <boxGeometry args={horizontal ? [0.006, 0.0025, d * 0.6] : [0.0025, 0.006, d * 0.6]} />
    </mesh>
  );

  const bottomY = -h / 2 - 0.0004;
  const speakerHoles = useMemo(() => {
    const holes: number[] = [];
    for (let i = 0; i < 6; i++) holes.push(0.1 + i * 0.019);
    return holes;
  }, []);

  return (
    <group>
      {/* unibody frame */}
      <mesh geometry={geo.body} material={mats.frame} castShadow receiveShadow />

      {/* antenna lines */}
      {antennaBand("a1", w / 2 + 0.0006, h / 2 - 0.13)}
      {antennaBand("a2", -w / 2 - 0.0006, h / 2 - 0.13)}
      {antennaBand("a3", w / 2 + 0.0006, -h / 2 + 0.13)}
      {antennaBand("a4", -w / 2 - 0.0006, -h / 2 + 0.13)}

      {/* front: black glass, display, reflective cover */}
      <mesh geometry={geo.frontGlass} material={mats.frontGlass} position={[0, 0, zFront]} />
      <mesh geometry={geo.screen} material={screenMat} position={[0, 0, zFront + 0.0004]} />
      <mesh geometry={geo.frontGlass} material={screenGlass} position={[0, 0, zFront + 0.0008]} />

      {/* back glass (rotated to face -Z); children use back-view coordinates */}
      <group position={[0, 0, zBack]} rotation={[0, Math.PI, 0]}>
        <mesh geometry={geo.back} material={mats.back} receiveShadow />
        {cam.plateau && (
          <PlateauMesh
            p={cam.plateau}
            depth={plateauDepth}
            material={cam.plateau.metal ? mats.frame : mats.plateau}
            windowMat={cam.plateau.metal ? mats.barWindow : null}
          />
        )}
        {cam.lenses.map((l, i) => {
          const ringH = 0.026;
          return (
            <group key={i} position={[l.x, l.y, plateauDepth]}>
              {/* protruding metal ring */}
              <mesh geometry={geo.ring} material={mats.ring} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, ringH / 2]} scale={[l.r, ringH, l.r]} castShadow />
              <mesh geometry={geo.ringCap} material={mats.ring} position={[0, 0, ringH]} scale={[l.r, l.r, 1]} />
              {/* dark inner wall */}
              <mesh geometry={geo.ring} material={mats.ringInner} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, ringH - 0.006]} scale={[l.r * 0.8, 0.012, l.r * 0.8]} />
              {/* coated optics under sapphire */}
              <mesh geometry={geo.lensFace} material={mats.lens} position={[0, 0, ringH - 0.0035]} scale={[l.r * 0.8, l.r * 0.8, 1]} />
            </group>
          );
        })}
        {cam.smalls.map((s, i) => (
          <mesh
            key={i}
            geometry={geo.hole}
            material={s.kind === "flash" ? mats.flash : s.kind === "sensor" ? mats.sensor : mats.dark}
            position={[s.x, s.y, plateauDepth + 0.0008]}
            scale={[s.r, s.r, 1]}
          />
        ))}
      </group>

      {/* side buttons: power on the right, volume (+ action) on the left in front view */}
      {button("power", 1, h * 0.14, h * 0.12)}
      {config.kind === "phone" && button("action", -1, h * 0.3, h * 0.04)}
      {config.kind === "phone" && button("vol-up", -1, h * 0.2, h * 0.075)}
      {config.kind === "phone" && button("vol-down", -1, h * 0.1, h * 0.075)}
      {config.kind === "tablet" && button("vol", 1, h * 0.34, h * 0.06)}

      {/* bottom edge: USB-C port and speaker / microphone grilles */}
      <group position={[0, bottomY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh geometry={geo.port} material={mats.dark} />
        {speakerHoles.map((x) => (
          <mesh key={`r${x}`} geometry={geo.hole} material={mats.dark} position={[x, 0, 0]} scale={[0.0055, 0.0055, 1]} />
        ))}
        {config.kind === "phone" &&
          speakerHoles.slice(0, 4).map((x) => <mesh key={`l${x}`} geometry={geo.hole} material={mats.dark} position={[-x, 0, 0]} scale={[0.0055, 0.0055, 1]} />)}
      </group>
    </group>
  );
}

function PlateauMesh({
  p,
  depth,
  material,
  windowMat,
}: {
  p: Plateau;
  depth: number;
  material: THREE.Material;
  windowMat: THREE.Material | null;
}) {
  const geom = useMemo(() => {
    const bevel = Math.min(depth * 0.48, 0.0065);
    const g = new THREE.ExtrudeGeometry(roundedRectShape(p.w - bevel * 2, p.h - bevel * 2, Math.max(0.001, p.r - bevel)), {
      depth: Math.max(0.0005, depth - bevel),
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 6,
      curveSegments: 40,
    });
    g.translate(0, 0, -0.001);
    g.computeVertexNormals();
    return g;
  }, [p.w, p.h, p.r, depth]);
  const win = useMemo(() => (windowMat ? flatRoundedRect(p.w * 0.62, p.h * 0.72, p.h * 0.34) : null), [windowMat, p.w, p.h]);
  useEffect(() => () => geom.dispose(), [geom]);
  useEffect(() => () => win?.dispose(), [win]);
  return (
    <group position={[p.x, p.y, 0]}>
      <mesh geometry={geom} material={material} castShadow receiveShadow />
      {win && windowMat && <mesh geometry={win} material={windowMat} position={[-p.w * 0.12, 0, depth + 0.0004]} />}
    </group>
  );
}
