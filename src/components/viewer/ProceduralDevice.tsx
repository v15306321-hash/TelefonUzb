"use client";

/**
 * Real-time procedural 3D smartphone / tablet model (three.js geometry, PBR materials).
 * Used when a product has no uploaded GLB/GLTF model. Proportions, camera module
 * layout and frame finish are configurable per product (Product.model3d).
 */

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Model3DConfig } from "@/lib/types";

type Dims = { w: number; h: number; d: number; r: number };

export const DEVICE_DIMS: Record<Model3DConfig["kind"], Dims> = {
  phone: { w: 0.78, h: 1.62, d: 0.084, r: 0.12 },
  tablet: { w: 1.18, h: 1.66, d: 0.058, r: 0.085 },
};

function roundedRectShape(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Shape geometry with UVs normalised to 0..1 across the bounding box (for textures). */
function flatRoundedRect(w: number, h: number, r: number) {
  const g = new THREE.ShapeGeometry(roundedRectShape(w, h, r), 24);
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / w + 0.5;
    uv[i * 2 + 1] = pos.getY(i) / h + 0.5;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

function extrudedRoundedRect(w: number, h: number, r: number, depth: number, bevel: number) {
  const g = new THREE.ExtrudeGeometry(roundedRectShape(w - bevel * 2, h - bevel * 2, Math.max(0.001, r - bevel)), {
    depth: Math.max(0.001, depth - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 5,
    curveSegments: 28,
  });
  g.translate(0, 0, -(depth - bevel * 2) / 2);
  g.computeVertexNormals();
  return g;
}

function shade(hex: string, amount: number) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, THREE.MathUtils.clamp(hsl.l + amount, 0, 1));
  return c;
}

/** Lock-screen wallpaper drawn on a canvas, tinted by the device colour. */
function makeScreenTexture(color: string, kind: Model3DConfig["kind"], island: boolean) {
  const W = kind === "tablet" ? 760 : 520;
  const H = kind === "tablet" ? 1070 : 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const base = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  const hue = Math.round(hsl.h * 360);
  const sat = Math.round(Math.max(0.35, hsl.s) * 100);

  ctx.fillStyle = "#050507";
  ctx.fillRect(0, 0, W, H);
  const blobs: [number, number, number, string][] = [
    [0.15, 0.25, 0.75, `hsla(${hue}, ${sat}%, 55%, 0.95)`],
    [0.9, 0.55, 0.7, `hsla(${(hue + 40) % 360}, ${sat}%, 45%, 0.85)`],
    [0.35, 0.95, 0.8, `hsla(${(hue + 330) % 360}, ${Math.min(90, sat + 10)}%, 35%, 0.9)`],
    [0.85, 0.05, 0.5, `hsla(4, 85%, 52%, 0.55)`],
  ];
  for (const [x, y, rr, col] of blobs) {
    const g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, rr * W * 0.9);
    g.addColorStop(0, col);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // subtle vignette
  const v = ctx.createLinearGradient(0, 0, 0, H);
  v.addColorStop(0, "rgba(0,0,0,0.25)");
  v.addColorStop(0.5, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.textAlign = "center";
  ctx.font = `600 ${Math.round(W * 0.05)}px Inter, system-ui, sans-serif`;
  ctx.fillText("TELEFON.UZB", W / 2, H * 0.155);
  ctx.font = `700 ${Math.round(W * 0.26)}px Inter, system-ui, sans-serif`;
  ctx.fillText("9:41", W / 2, H * 0.33);
  // dock-ish indicator
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  const barW = W * 0.34;
  ctx.beginPath();
  ctx.roundRect((W - barW) / 2, H * 0.965, barW, H * 0.007, H * 0.004);
  ctx.fill();

  // front camera: dynamic island pill or punch-hole
  ctx.fillStyle = "#000";
  if (kind === "phone") {
    if (island) {
      const pw = W * 0.24;
      ctx.beginPath();
      ctx.roundRect((W - pw) / 2, H * 0.018, pw, H * 0.034, H * 0.017);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(W / 2, H * 0.033, W * 0.024, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

type Lens = { x: number; y: number; r: number };

/** Camera module description in "back view" coordinates (x to the right when looking at the back). */
function cameraLayout(layout: Model3DConfig["layout"], dims: Dims) {
  const top = dims.h / 2;
  const left = -dims.w / 2;
  const lenses: Lens[] = [];
  const smalls: { x: number; y: number; r: number; flash?: boolean }[] = [];
  let plateau: { x: number; y: number; w: number; h: number; r: number; metal?: boolean } | null = null;

  switch (layout) {
    case "pro-triangle": {
      const s = dims.w * 0.47;
      const cx = left + 0.04 + s / 2;
      const cy = top - 0.04 - s / 2;
      plateau = { x: cx, y: cy, w: s, h: s, r: s * 0.26 };
      const lr = s * 0.21;
      lenses.push({ x: cx - s * 0.22, y: cy + s * 0.22, r: lr }, { x: cx - s * 0.22, y: cy - s * 0.22, r: lr }, { x: cx + s * 0.22, y: cy, r: lr });
      smalls.push({ x: cx + s * 0.24, y: cy + s * 0.3, r: s * 0.07, flash: true }, { x: cx + s * 0.24, y: cy - s * 0.3, r: s * 0.06 });
      break;
    }
    case "dual-diagonal": {
      const s = dims.w * 0.4;
      const cx = left + 0.045 + s / 2;
      const cy = top - 0.045 - s / 2;
      plateau = { x: cx, y: cy, w: s, h: s, r: s * 0.28 };
      const lr = s * 0.2;
      lenses.push({ x: cx - s * 0.2, y: cy + s * 0.2, r: lr }, { x: cx + s * 0.2, y: cy - s * 0.2, r: lr });
      smalls.push({ x: cx + s * 0.24, y: cy + s * 0.24, r: s * 0.07, flash: true });
      break;
    }
    case "vertical-trio": {
      const lr = dims.w * 0.085;
      const x = left + 0.13;
      for (let i = 0; i < 3; i++) lenses.push({ x, y: top - 0.16 - i * lr * 2.5, r: lr });
      smalls.push({ x: x + lr * 2.1, y: top - 0.16, r: lr * 0.35, flash: true }, { x: x + lr * 2.1, y: top - 0.16 - lr * 1.3, r: lr * 0.3 });
      break;
    }
    case "horizontal-bar": {
      const bh = dims.h * 0.13;
      const cy = top - 0.24;
      plateau = { x: 0, y: cy, w: dims.w + 0.006, h: bh, r: bh * 0.48, metal: true };
      const lr = bh * 0.3;
      lenses.push({ x: -dims.w * 0.28, y: cy, r: lr }, { x: -dims.w * 0.12, y: cy, r: lr }, { x: dims.w * 0.04, y: cy, r: lr });
      smalls.push({ x: dims.w * 0.2, y: cy, r: lr * 0.38, flash: true });
      break;
    }
    case "square-quad": {
      const s = dims.w * 0.5;
      const cx = left + 0.05 + s / 2;
      const cy = top - 0.05 - s / 2;
      plateau = { x: cx, y: cy, w: s, h: s, r: s * 0.22 };
      const lr = s * 0.19;
      for (const [dx, dy] of [[-1, 1], [1, 1], [-1, -1]] as const) lenses.push({ x: cx + dx * s * 0.22, y: cy + dy * s * 0.22, r: lr });
      smalls.push({ x: cx + s * 0.22, y: cy - s * 0.22, r: s * 0.08, flash: true });
      break;
    }
    case "round-module": {
      const R = dims.w * 0.3;
      const cy = top - 0.07 - R;
      plateau = { x: 0, y: cy, w: R * 2, h: R * 2, r: R };
      const lr = R * 0.33;
      for (const [dx, dy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) lenses.push({ x: dx * R * 0.4, y: cy + dy * R * 0.4, r: lr });
      smalls.push({ x: R * 1.25, y: cy + R * 0.6, r: R * 0.1, flash: true });
      break;
    }
    case "single":
    default: {
      const lr = dims.w * 0.06;
      lenses.push({ x: left + 0.1, y: top - 0.1, r: lr });
      smalls.push({ x: left + 0.1, y: top - 0.1 - lr * 2.2, r: lr * 0.35, flash: true });
    }
  }
  return { lenses, smalls, plateau };
}

export function ProceduralDevice({ config, color }: { config: Model3DConfig; color: string }) {
  const dims = DEVICE_DIMS[config.kind];
  const isApple = config.layout === "pro-triangle" || config.layout === "dual-diagonal";

  const geo = useMemo(() => {
    const { w, h, d, r } = dims;
    const bevel = Math.min(d * 0.28, 0.022);
    return {
      body: extrudedRoundedRect(w, h, r, d, bevel),
      back: flatRoundedRect(w - 0.012, h - 0.012, r - 0.006),
      frontGlass: flatRoundedRect(w - 0.01, h - 0.01, r - 0.005),
      screen: flatRoundedRect(w - (config.kind === "tablet" ? 0.08 : 0.05), h - (config.kind === "tablet" ? 0.08 : 0.05), r - 0.03),
    };
  }, [dims, config.kind]);

  const cam = useMemo(() => cameraLayout(config.layout, dims), [config.layout, dims]);

  const mats = useMemo(() => {
    const body = new THREE.Color(color);
    const frameColor =
      config.frame === "titanium"
        ? shade(color, 0.06).lerp(new THREE.Color("#8d8a86"), 0.55)
        : config.frame === "polished"
          ? shade(color, 0.1).lerp(new THREE.Color("#c9c9cc"), 0.3)
          : shade(color, 0.04).lerp(new THREE.Color("#a9a9ad"), 0.25);
    const frame = new THREE.MeshPhysicalMaterial({
      color: frameColor,
      metalness: 1,
      roughness: config.frame === "titanium" ? 0.36 : config.frame === "polished" ? 0.12 : 0.26,
      clearcoat: config.frame === "polished" ? 1 : 0.3,
      clearcoatRoughness: 0.2,
    });
    const back = new THREE.MeshPhysicalMaterial({
      color: body,
      metalness: 0.12,
      roughness: 0.34,
      clearcoat: 1,
      clearcoatRoughness: 0.18,
      sheen: 0.3,
      sheenColor: shade(color, 0.2),
    });
    const plateau = new THREE.MeshPhysicalMaterial({
      color: shade(color, -0.04),
      metalness: 0.15,
      roughness: 0.12,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
    });
    const ring = new THREE.MeshPhysicalMaterial({ color: frameColor, metalness: 1, roughness: 0.18 });
    const lens = new THREE.MeshPhysicalMaterial({
      color: "#06070b",
      metalness: 0.2,
      roughness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      iridescence: 1,
      iridescenceIOR: 1.6,
      iridescenceThicknessRange: [180, 520],
    });
    const lensInner = new THREE.MeshPhysicalMaterial({ color: "#243159", emissive: "#0d1430", metalness: 0.7, roughness: 0.1, clearcoat: 1, iridescence: 0.8, iridescenceIOR: 1.8 });
    const lensRing = new THREE.MeshStandardMaterial({ color: "#3a3f4a", metalness: 0.9, roughness: 0.25 });
    const glint = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.55, toneMapped: false });
    const flash = new THREE.MeshPhysicalMaterial({ color: "#f4eedd", emissive: "#3a3326", roughness: 0.35, clearcoat: 1 });
    const dark = new THREE.MeshPhysicalMaterial({ color: "#0b0b0d", roughness: 0.3, metalness: 0.4 });
    const frontGlass = new THREE.MeshPhysicalMaterial({ color: "#000000", roughness: 0.12, metalness: 0, specularIntensity: 0.4 });
    const barWindow = new THREE.MeshPhysicalMaterial({ color: "#050506", roughness: 0.05, clearcoat: 1 });
    return { frame, back, plateau, ring, lens, lensInner, lensRing, glint, flash, dark, frontGlass, barWindow };
  }, [color, config.frame]);

  const screenMat = useMemo(() => {
    // the display is self-lit: an unlit material keeps the wallpaper deep and vivid
    const tex = makeScreenTexture(color, config.kind, isApple);
    return new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  }, [color, config.kind, isApple]);

  // glass over the display: only adds reflections (additive), never washes out the picture
  const screenGlass = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#000000",
        roughness: 0.04,
        metalness: 0,
        specularIntensity: 0.3,
        clearcoat: 0.2,
        clearcoatRoughness: 0.03,
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
      screenMat.map?.dispose();
      screenMat.dispose();
    },
    [screenMat],
  );

  const { w, h, d } = dims;
  const zBack = -d / 2 - 0.0006;
  const zFront = d / 2 + 0.0006;
  const btn = (key: string, x: number, y: number, len: number) => (
    <mesh key={key} position={[x, y, 0]} material={mats.frame} castShadow>
      <boxGeometry args={[0.012, len, d * 0.42]} />
    </mesh>
  );

  return (
    <group>
      {/* body / frame */}
      <mesh geometry={geo.body} material={mats.frame} castShadow receiveShadow />

      {/* front glass + display */}
      <mesh geometry={geo.frontGlass} material={mats.frontGlass} position={[0, 0, zFront]} />
      <mesh geometry={geo.screen} material={screenMat} position={[0, 0, zFront + 0.0005]} />
      <mesh geometry={geo.frontGlass} material={screenGlass} position={[0, 0, zFront + 0.001]} />

      {/* back glass (rotated to face -Z); children use back-view coordinates */}
      <group position={[0, 0, zBack]} rotation={[0, Math.PI, 0]}>
        <mesh geometry={geo.back} material={mats.back} />
        {cam.plateau && (
          <PlateauMesh
            p={cam.plateau}
            depth={cam.plateau.metal ? 0.028 : 0.012}
            material={cam.plateau.metal ? mats.frame : mats.plateau}
            windowMat={cam.plateau.metal ? mats.barWindow : null}
          />
        )}
        {cam.lenses.map((l, i) => {
          const base = cam.plateau ? (cam.plateau.metal ? 0.028 : 0.012) : 0;
          return (
            <group key={i} position={[l.x, l.y, base]}>
              <mesh material={mats.ring} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.012]}>
                <cylinderGeometry args={[l.r, l.r * 1.03, 0.024, 40]} />
              </mesh>
              <mesh material={mats.lens} position={[0, 0, 0.0245]}>
                <circleGeometry args={[l.r * 0.8, 40]} />
              </mesh>
              <mesh material={mats.lensRing} position={[0, 0, 0.0247]}>
                <ringGeometry args={[l.r * 0.5, l.r * 0.56, 40]} />
              </mesh>
              <mesh material={mats.lensInner} position={[0, 0, 0.0248]}>
                <circleGeometry args={[l.r * 0.42, 32]} />
              </mesh>
              <mesh material={mats.dark} position={[0, 0, 0.025]}>
                <circleGeometry args={[l.r * 0.2, 24]} />
              </mesh>
              <mesh material={mats.glint} position={[l.r * 0.26, l.r * 0.26, 0.0252]}>
                <circleGeometry args={[l.r * 0.09, 16]} />
              </mesh>
            </group>
          );
        })}
        {cam.smalls.map((s, i) => {
          const base = cam.plateau ? (cam.plateau.metal ? 0.028 : 0.012) : 0;
          return (
            <mesh key={i} material={s.flash ? mats.flash : mats.dark} position={[s.x, s.y, base + 0.0012]}>
              <circleGeometry args={[s.r, 28]} />
            </mesh>
          );
        })}
      </group>

      {/* side buttons: power on the right, volume on the left (front view) */}
      {btn("power", w / 2 + 0.004, h * 0.12, h * 0.1)}
      {config.kind === "phone" && btn("vol-up", -w / 2 - 0.004, h * 0.2, h * 0.07)}
      {config.kind === "phone" && btn("vol-down", -w / 2 - 0.004, h * 0.1, h * 0.07)}
      {config.kind === "tablet" && btn("vol", w / 2 + 0.004, h * 0.28, h * 0.06)}
    </group>
  );
}

function PlateauMesh({
  p,
  depth,
  material,
  windowMat,
}: {
  p: { x: number; y: number; w: number; h: number; r: number };
  depth: number;
  material: THREE.Material;
  windowMat: THREE.Material | null;
}) {
  const geom = useMemo(() => {
    const bevel = Math.min(depth * 0.45, 0.008);
    const g = new THREE.ExtrudeGeometry(roundedRectShape(p.w - bevel * 2, p.h - bevel * 2, Math.max(0.001, p.r - bevel)), {
      depth: Math.max(0.0005, depth - bevel),
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 4,
      curveSegments: 32,
    });
    g.translate(0, 0, -0.001);
    return g;
  }, [p.w, p.h, p.r, depth]);
  const win = useMemo(
    () => (windowMat ? flatRoundedRect(p.w * 0.62, p.h * 0.72, p.h * 0.34) : null),
    [windowMat, p.w, p.h],
  );
  useEffect(() => () => geom.dispose(), [geom]);
  useEffect(() => () => win?.dispose(), [win]);
  return (
    <group position={[p.x, p.y, 0]}>
      <mesh geometry={geom} material={material} castShadow />
      {win && windowMat && <mesh geometry={win} material={windowMat} position={[-p.w * 0.12, 0, depth + 0.0004]} />}
    </group>
  );
}
