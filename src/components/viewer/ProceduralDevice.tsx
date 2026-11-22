"use client";

/**
 * Physically based procedural 3D model of a smartphone / tablet built from a DeviceSpec
 * (exact dimensions per model, see device-specs.ts).
 *
 * Construction (like the real device):
 *  - frame band swept along the continuous-corner outline with the model's edge profile
 *    (flat / rounded / contoured), antenna lines, capsule buttons, mute switch, ports, speaker holes, screws;
 *  - front cover glass slab with rounded edge, OLED panel (wallpaper, notch / Dynamic Island / punch-hole);
 *  - back glass slab (glossy or frosted) or aluminium unibody with a glass panel;
 *  - raised camera plateau; every lens is a lathed assembly (metal ring, black barrel,
 *    retaining ring, coated optical element under a transmissive sapphire cover); flash, LiDAR, mic.
 */

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { Model3DConfig } from "@/lib/types";
import { getDeviceSpec, MM, type DeviceSpec } from "./device-specs";
import { bandProfile, capsuleButton, latheZ, squircleFlat, squircleSlab, sweptBand } from "./geometry";

export { getDeviceSpec };

/** Height of the device in scene units (used by the canvas for framing/shadows). */
export function deviceSize(config: Model3DConfig) {
  const s = getDeviceSpec(config);
  return { w: s.w * MM, h: s.h * MM, d: s.d * MM };
}

/* ============================================================== colour helpers */

function mix(a: THREE.Color | string, b: THREE.Color | string, t: number) {
  return new THREE.Color(a).lerp(new THREE.Color(b), t);
}
function hslOf(hex: string) {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(hex).getHSL(hsl);
  return hsl;
}
function adjust(hex: string, dl: number, satMul = 1) {
  const { h, s, l } = hslOf(hex);
  return new THREE.Color().setHSL(h, THREE.MathUtils.clamp(s * satMul, 0, 1), THREE.MathUtils.clamp(l + dl, 0, 1));
}

/* ============================================================== textures */

function canvasTex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

let grainCache: { rough: THREE.Texture; normal: THREE.Texture } | null = null;
/** Fine frosted-glass micro texture (roughness + normal). */
function frostedMaps() {
  if (grainCache) return grainCache;
  const S = 256;
  const heights = new Float32Array(S * S);
  for (let i = 0; i < heights.length; i++) heights[i] = Math.random();
  // light blur for a less "digital" grain
  const hb = new Float32Array(S * S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      let acc = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) acc += heights[((y + dy + S) % S) * S + ((x + dx + S) % S)];
      hb[y * S + x] = acc / 9;
    }
  const rc = document.createElement("canvas");
  const nc = document.createElement("canvas");
  rc.width = rc.height = nc.width = nc.height = S;
  const rg = rc.getContext("2d")!;
  const ng = nc.getContext("2d")!;
  const ri = rg.createImageData(S, S);
  const ni = ng.createImageData(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const v = 170 + (hb[i] - 0.5) * 120;
      ri.data[i * 4] = ri.data[i * 4 + 1] = ri.data[i * 4 + 2] = v;
      ri.data[i * 4 + 3] = 255;
      const dx = hb[y * S + ((x + 1) % S)] - hb[y * S + ((x - 1 + S) % S)];
      const dy = hb[((y + 1) % S) * S + x] - hb[((y - 1 + S) % S) * S + x];
      const n = new THREE.Vector3(-dx * 2, -dy * 2, 1).normalize();
      ni.data[i * 4] = (n.x * 0.5 + 0.5) * 255;
      ni.data[i * 4 + 1] = (n.y * 0.5 + 0.5) * 255;
      ni.data[i * 4 + 2] = (n.z * 0.5 + 0.5) * 255;
      ni.data[i * 4 + 3] = 255;
    }
  rg.putImageData(ri, 0, 0);
  ng.putImageData(ni, 0, 0);
  const rough = canvasTex(rc, false);
  const normal = canvasTex(nc, false);
  for (const t of [rough, normal]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(10, 20);
  }
  grainCache = { rough, normal };
  return grainCache;
}

let flashCache: THREE.Texture | null = null;
function flashTexture() {
  if (flashCache) return flashCache;
  const S = 256;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const m = S / 2;
  const grd = g.createRadialGradient(m * 0.9, m * 0.85, 0, m, m, m);
  grd.addColorStop(0, "#fffdf2");
  grd.addColorStop(0.5, "#f0e7cc");
  grd.addColorStop(1, "#b9ad8c");
  g.fillStyle = grd;
  g.fillRect(0, 0, S, S);
  g.strokeStyle = "rgba(140,120,80,0.35)";
  g.lineWidth = 1.4;
  for (let r = 8; r < m; r += 7) {
    g.beginPath();
    g.arc(m, m, r, 0, Math.PI * 2);
    g.stroke();
  }
  flashCache = canvasTex(c);
  return flashCache;
}

/** Organic shape used by the wallpaper. */
function blob(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, seed: number) {
  const n = 9;
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + seed;
    const rr = r * (0.9 + 0.12 * Math.sin(seed * 2.3 + i * 1.9));
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const [x0, y0] = pts[i % n];
    const [x1, y1] = pts[(i + 1) % n];
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    if (i === 0) g.moveTo(mx, my);
    else g.quadraticCurveTo(x0, y0, mx, my);
  }
  g.closePath();
}

const wallpaperCache = new Map<string, THREE.Texture>();
/** High-resolution wallpaper in the style of the device's launch wallpaper, with the screen cut-out. */
function wallpaper(spec: DeviceSpec, color: string, screenW: number, screenH: number) {
  const key = `${spec.id}|${color}`;
  const hit = wallpaperCache.get(key);
  if (hit) return hit;
  const W = spec.kind === "tablet" ? 1400 : 1080;
  const H = Math.round((W * screenH) / screenW);
  const px = W / screenW; // pixels per mm
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const { h: hue, s, l } = hslOf(color);
  const H360 = Math.round(hue * 360);
  const S = Math.round(Math.min(0.55, s * 0.85) * 100);
  const light = l > 0.62;

  g.fillStyle = light ? `hsl(${H360}, ${Math.round(S * 0.25)}%, 96%)` : `hsl(${H360}, ${Math.round(S * 0.5)}%, 5%)`;
  g.fillRect(0, 0, W, H);
  const shapes: [number, number, number, number][] = [
    [0.27, 0.12, 0.33, 1.1],
    [1.05, 0.47, 0.6, 2.7],
    [-0.04, 0.53, 0.24, 4.4],
    [0.6, 1.02, 0.72, 5.2],
  ];
  for (const [fx, fy, fr, seed] of shapes) {
    const cx = fx * W;
    const cy = fy * H;
    const r = fr * W;
    g.save();
    g.shadowColor = light ? `hsla(${H360}, ${S}%, 30%, 0.45)` : "rgba(0,0,0,0.9)";
    g.shadowBlur = W * 0.07;
    g.shadowOffsetX = W * 0.025;
    g.shadowOffsetY = W * 0.035;
    blob(g, cx, cy, r, seed);
    const grd = g.createRadialGradient(cx - r * 0.5, cy - r * 0.55, r * 0.05, cx, cy, r * 1.2);
    if (light) {
      grd.addColorStop(0, `hsl(${H360}, ${S}%, 98%)`);
      grd.addColorStop(0.45, `hsl(${H360}, ${S}%, 86%)`);
      grd.addColorStop(1, `hsl(${H360}, ${Math.round(S * 0.9)}%, 64%)`);
    } else {
      grd.addColorStop(0, `hsl(${H360}, ${S}%, 84%)`);
      grd.addColorStop(0.4, `hsl(${H360}, ${S}%, 58%)`);
      grd.addColorStop(0.8, `hsl(${H360}, ${Math.round(S * 0.9)}%, 22%)`);
      grd.addColorStop(1, `hsl(${H360}, ${Math.round(S * 0.6)}%, 8%)`);
    }
    g.fillStyle = grd;
    g.fill();
    g.restore();
  }
  // photographic grain
  const img = g.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 9;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  g.putImageData(img, 0, 0);

  // screen cut-out
  const cw = (spec.screen.cutoutW ?? 0) * px;
  const ch = (spec.screen.cutoutH ?? 0) * px;
  g.fillStyle = "#000";
  const lensDot = (x: number, y: number, r: number) => {
    const lg = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    lg.addColorStop(0, "#3c4a86");
    lg.addColorStop(0.5, "#131933");
    lg.addColorStop(1, "#040406");
    g.fillStyle = lg;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };
  if (spec.screen.cutout === "notch") {
    const x0 = (W - cw) / 2;
    const rr = 2.6 * px;
    const ear = 1.2 * px;
    g.beginPath();
    g.moveTo(x0 - ear, 0);
    g.quadraticCurveTo(x0, 0, x0, ear);
    g.lineTo(x0, ch - rr);
    g.quadraticCurveTo(x0, ch, x0 + rr, ch);
    g.lineTo(x0 + cw - rr, ch);
    g.quadraticCurveTo(x0 + cw, ch, x0 + cw, ch - rr);
    g.lineTo(x0 + cw, ear);
    g.quadraticCurveTo(x0 + cw, 0, x0 + cw + ear, 0);
    g.closePath();
    g.fill();
    // earpiece slit + front camera
    g.fillStyle = "#1c1d21";
    g.beginPath();
    g.roundRect(W / 2 - 4.5 * px, 1.1 * px, 9 * px, 0.9 * px, 0.45 * px);
    g.fill();
    lensDot(W / 2 + cw * 0.27, ch * 0.5, 1.1 * px);
  } else if (spec.screen.cutout === "island") {
    const top = 3.0 * px;
    g.beginPath();
    g.roundRect((W - cw) / 2, top, cw, ch, ch / 2);
    g.fill();
    lensDot(W / 2 + cw * 0.32, top + ch / 2, ch * 0.26);
  } else if (spec.screen.cutout === "punch") {
    g.beginPath();
    g.arc(W / 2, 4 * px, 1.8 * px, 0, Math.PI * 2);
    g.fill();
  }
  const tex = canvasTex(c);
  wallpaperCache.set(key, tex);
  if (wallpaperCache.size > 24) {
    const [k, old] = wallpaperCache.entries().next().value!;
    wallpaperCache.delete(k);
    old.dispose();
  }
  return tex;
}

/* ============================================================== materials */

function useMaterials(spec: DeviceSpec, color: string) {
  return useMemo(() => {
    const frameColor =
      spec.frame === "steel"
        ? mix(adjust(color, 0.02, 0.9), "#d9d9dc", 0.42)
        : spec.frame === "titanium"
          ? mix(adjust(color, 0.03, 0.6), "#8e8b87", 0.5)
          : mix(adjust(color, -0.02, 1.15), "#b9b9bd", 0.12);
    const frame = new THREE.MeshPhysicalMaterial({
      color: frameColor,
      metalness: 1,
      roughness: spec.frame === "steel" ? 0.07 : spec.frame === "titanium" ? 0.33 : 0.27,
      anisotropy: spec.frame === "steel" ? 0 : spec.frame === "titanium" ? 0.75 : 0.35,
      envMapIntensity: 1.1,
    });
    const frost = frostedMaps();
    const back =
      spec.back === "gloss"
        ? new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.025, ior: 1.5 })
        : new THREE.MeshPhysicalMaterial({
            color,
            metalness: 0,
            roughness: 0.6,
            roughnessMap: frost.rough,
            normalMap: frost.normal,
            normalScale: new THREE.Vector2(0.22, 0.22),
            clearcoat: 0.12,
            clearcoatRoughness: 0.55,
            sheen: 0.25,
            sheenRoughness: 0.7,
            sheenColor: adjust(color, 0.2),
          });
    const plateauGlass = new THREE.MeshPhysicalMaterial({
      color: adjust(color, spec.back === "gloss" ? -0.01 : -0.035, 1.12),
      metalness: 0,
      roughness: 0.07,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      ior: 1.55,
    });
    const darkGlass = new THREE.MeshPhysicalMaterial({ color: "#0a0a0c", roughness: 0.1, clearcoat: 1, clearcoatRoughness: 0.03 });
    const ring = new THREE.MeshPhysicalMaterial({
      color: spec.frame === "steel" ? frameColor : mix(adjust(color, -0.04, 1.2), frameColor, 0.4),
      metalness: 1,
      roughness: spec.frame === "steel" ? 0.1 : 0.2,
      side: THREE.DoubleSide,
    });
    const barrel = new THREE.MeshStandardMaterial({ color: "#050506", roughness: 0.55, metalness: 0.2, side: THREE.DoubleSide });
    const retainer = new THREE.MeshStandardMaterial({ color: "#30333b", roughness: 0.28, metalness: 1, side: THREE.DoubleSide });
    const element = new THREE.MeshPhysicalMaterial({
      color: "#0c1230",
      metalness: 0.35,
      roughness: 0.04,
      clearcoat: 1,
      clearcoatRoughness: 0.01,
      iridescence: 1,
      iridescenceIOR: 1.75,
      iridescenceThicknessRange: [220, 520],
    });
    const sapphire = new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      metalness: 0,
      roughness: 0.02,
      transmission: 1,
      thickness: 0.003,
      ior: 1.77,
      specularIntensity: 1,
      envMapIntensity: 1.2,
    });
    const flash = new THREE.MeshPhysicalMaterial({ color: "#ffffff", map: flashTexture(), roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.04 });
    const black = new THREE.MeshStandardMaterial({ color: "#030304", roughness: 0.7, metalness: 0 });
    const lidar = new THREE.MeshPhysicalMaterial({ color: "#060608", roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.02 });
    const core = new THREE.MeshStandardMaterial({ color: "#0b0b0c", roughness: 0.8 });
    const antenna = new THREE.MeshStandardMaterial({ color: mix(adjust(color, 0.05, 0.5), "#9a9a9e", 0.3), roughness: 0.6, metalness: 0 });
    const frontGlass = new THREE.MeshPhysicalMaterial({ color: "#000000", roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, specularIntensity: 0.6 });
    const screenGlass = new THREE.MeshPhysicalMaterial({
      color: "#000000",
      roughness: 0.03,
      metalness: 0,
      specularIntensity: 0.4,
      clearcoat: 0.3,
      clearcoatRoughness: 0.02,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const screw = new THREE.MeshStandardMaterial({ color: mix(frameColor, "#777", 0.3), roughness: 0.35, metalness: 1 });
    return { frame, back, plateauGlass, darkGlass, ring, barrel, retainer, element, sapphire, flash, black, lidar, core, antenna, frontGlass, screenGlass, screw };
  }, [spec, color]);
}

/* ============================================================== component */

export function ProceduralDevice({ config, color }: { config: Model3DConfig; color: string }) {
  const spec = useMemo(() => getDeviceSpec(config), [config]);
  const mats = useMaterials(spec, color);

  const layout = useMemo(() => {
    const { w, h, d, r } = spec;
    const flat = spec.band === "flat";
    const topGap = flat ? 0.32 : 0.86;
    const glassInset = flat ? 0.8 : spec.band === "rounded" ? 0.85 : 0.45;
    const glassEdge = flat ? 0.32 : 0.55;
    const glassT = 0.9;
    const lip = Math.max(spec.edgeRadius + 0.35, 1.1);
    const screenMargin = Math.max(spec.screen.bezel, glassInset + 0.7);
    const sw = w - screenMargin * 2;
    const sh = h - screenMargin * 2;
    return { w, h, d, r, topGap, glassInset, glassEdge, glassT, lip, screenMargin, sw, sh };
  }, [spec]);

  const geo = useMemo(() => {
    const { w, h, d, r, topGap, glassInset, glassEdge, glassT, lip, screenMargin, sw, sh } = layout;
    const gw = w - glassInset * 2;
    const gh = h - glassInset * 2;
    const gr = Math.max(1, r - glassInset);
    const geoms: Record<string, THREE.BufferGeometry> = {
      band: sweptBand(w, h, r, bandProfile(d, spec.edgeRadius, spec.band, lip, topGap)),
      core: squircleSlab(w - lip * 2 + 0.6, h - lip * 2 + 0.6, Math.max(1, r - lip), d - 1.2, 0.2),
      glass: squircleSlab(gw, gh, gr, glassT, glassEdge),
      screen: squircleFlat(sw, sh, Math.max(1, r - screenMargin + 0.4)),
      hole: new THREE.CircleGeometry(MM, 24),
    };
    if (spec.unibody) {
      const pw = w - 9;
      const ph = h - spec.unibody.panelTop - 4.5;
      geoms.panel = squircleSlab(pw, ph, Math.max(2, r - 4.5), 0.22, 0.1);
    }
    const pl = spec.camera.plateau;
    if (pl) geoms.plateau = squircleSlab(pl.w, pl.h, pl.r, pl.depth, Math.min(0.55, pl.depth / 2.2), 24);
    return geoms;
  }, [layout, spec]);

  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  const screenMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: wallpaper(spec, color, layout.sw, layout.sh), toneMapped: false }),
    [spec, color, layout.sw, layout.sh],
  );
  useEffect(() => () => screenMat.dispose(), [screenMat]);

  const { w, h, d, glassT } = layout;
  const cam = spec.camera;
  /** back-view mm (from top-left) → back group local scene units */
  const bx = (x: number) => (-w / 2 + x) * MM;
  const by = (y: number) => (h / 2 - y) * MM;
  const mountZ = cam.plateau ? cam.plateau.depth : 0;
  const plateauMat = cam.plateau?.material === "frame" ? mats.frame : cam.plateau?.material === "dark" ? mats.darkGlass : mats.plateauGlass;

  return (
    <group>
      {/* ---------- frame band + internal core ---------- */}
      <mesh geometry={geo.band} material={mats.frame} castShadow receiveShadow />
      <mesh geometry={geo.core} material={mats.core} position={[0, 0, -(d - 1.2) * 0.5 * MM]} />

      {/* antenna lines on the band */}
      {spec.antennas &&
        [
          [w / 2, h / 2 - 15, 0],
          [-w / 2, h / 2 - 15, 0],
          [w / 2, -h / 2 + 15, 0],
          [-w / 2, -h / 2 + 15, 0],
        ].map(([x, y], i) => (
          <mesh key={`ant${i}`} material={mats.antenna} position={[x * MM, y * MM, 0]}>
            <boxGeometry args={[0.24 * MM, 0.9 * MM, (d - 2.2) * MM]} />
          </mesh>
        ))}
      {spec.antennas &&
        [-1, 1].map((sx) => (
          <mesh key={`antb${sx}`} material={mats.antenna} position={[sx * (w / 2 - 12) * MM, (-h / 2) * MM, 0]}>
            <boxGeometry args={[0.9 * MM, 0.24 * MM, (d - 2.2) * MM]} />
          </mesh>
        ))}

      {/* ---------- front: cover glass, OLED panel, reflections ---------- */}
      <group position={[0, 0, (d / 2 - glassT) * MM]}>
        <mesh geometry={geo.glass} material={mats.frontGlass} />
        <mesh geometry={geo.screen} material={screenMat} position={[0, 0, glassT * MM + 0.0001]} />
        <mesh geometry={geo.screen} material={mats.screenGlass} position={[0, 0, glassT * MM + 0.0002]} />
      </group>

      {/* ---------- back (rotated to face -Z), back-view coordinates ---------- */}
      <group position={[0, 0, (-d / 2) * MM]} rotation={[0, Math.PI, 0]}>
        <mesh geometry={geo.glass} material={spec.unibody ? mats.frame : mats.back} position={[0, 0, -glassT * MM]} receiveShadow />
        {spec.unibody && geo.panel && (
          <mesh geometry={geo.panel} material={mats.back} position={[0, by((spec.unibody.panelTop + h - 4.5) / 2), -0.06 * MM]} />
        )}

        {cam.plateau && (
          <mesh
            geometry={geo.plateau}
            material={plateauMat}
            position={[bx(cam.plateau.x + cam.plateau.w / 2), by(cam.plateau.y + cam.plateau.h / 2), -0.02 * MM]}
            castShadow
            receiveShadow
          />
        )}

        {cam.lenses.map((l, i) => (
          <Lens key={i} x={bx(l.x)} y={by(l.y)} z={mountZ * MM} d={l.d} ringH={cam.ringHeight} ringWidth={cam.ringWidth} mats={mats} />
        ))}

        {cam.flash && <Flash x={bx(cam.flash.x)} y={by(cam.flash.y)} z={mountZ * MM} d={cam.flash.d} mats={mats} />}
        {cam.lidar && (
          <mesh
            material={mats.lidar}
            position={[bx(cam.lidar.x), by(cam.lidar.y), mountZ * MM]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[(cam.lidar.d / 2) * MM, 0.3 * MM, (cam.lidar.d / 2) * MM]}
          >
            <sphereGeometry args={[1, 40, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        )}
        {cam.mic && (
          <mesh geometry={geo.hole} material={mats.black} position={[bx(cam.mic.x), by(cam.mic.y), mountZ * MM + 0.00002]} scale={[cam.mic.d / 2, cam.mic.d / 2, 1]} />
        )}
      </group>

      {/* ---------- side buttons (front view: +x is the right side) ---------- */}
      {spec.right.map((b, i) => (
        <SideButton key={`r${i}`} side={1} spec={spec} b={b} mats={mats} />
      ))}
      {spec.left.map((b, i) => (
        <SideButton key={`l${i}`} side={-1} spec={spec} b={b} mats={mats} />
      ))}

      {/* ---------- bottom edge: port, speaker & mic grilles, screws ---------- */}
      <BottomDetails spec={spec} mats={mats} />
    </group>
  );
}

type Mats = ReturnType<typeof useMaterials>;

function Lens({ x, y, z, d, ringH, ringWidth, mats }: { x: number; y: number; z: number; d: number; ringH: number; ringWidth: number; mats: Mats }) {
  const g = useMemo(() => {
    const ro = d / 2;
    const ri = ro - Math.max(0.55, d * ringWidth);
    const H = ringH;
    const depth = Math.max(0.6, H - 0.08);
    const ring = latheZ(
      [
        [ri, H - depth],
        [ri, H - 0.22],
        [ri + 0.16, H],
        [ro - 0.32, H],
        [ro - 0.06, H - 0.12],
        [ro, H - 0.38],
        [ro, 0.02],
        [ro + 0.12, 0],
      ],
      72,
    );
    const floor = new THREE.CircleGeometry(ri * MM, 48);
    const retainer = new THREE.RingGeometry(ri * 0.52 * MM, ri * 0.7 * MM, 48);
    const rc = ri * 0.72;
    const element = new THREE.SphereGeometry(rc * MM, 48, 10, 0, Math.PI * 2, 0, 0.55);
    element.rotateX(Math.PI / 2);
    const cover = new THREE.CircleGeometry((ri + 0.05) * MM, 64);
    const pupil = new THREE.CircleGeometry(ri * 0.16 * MM, 32);
    return { ring, floor, retainer, element, cover, pupil, ri, rc, H, depth };
  }, [d, ringH, ringWidth]);
  useEffect(() => () => Object.values(g).forEach((v) => typeof v === "object" && (v as THREE.BufferGeometry).dispose?.()), [g]);
  const base = g.H - g.depth;
  const elementTop = base + g.depth * 0.55;
  return (
    <group position={[x, y, z]}>
      <mesh geometry={g.ring} material={mats.ring} castShadow />
      <mesh geometry={g.floor} material={mats.barrel} position={[0, 0, (base + 0.01) * MM]} />
      <mesh geometry={g.retainer} material={mats.retainer} position={[0, 0, (base + g.depth * 0.32) * MM]} />
      <mesh geometry={g.element} material={mats.element} position={[0, 0, (elementTop - g.rc) * MM]} />
      <mesh geometry={g.pupil} material={mats.black} position={[0, 0, (elementTop + 0.01) * MM]} />
      <mesh geometry={g.cover} material={mats.sapphire} position={[0, 0, (g.H - 0.1) * MM]} />
    </group>
  );
}

function Flash({ x, y, z, d, mats }: { x: number; y: number; z: number; d: number; mats: Mats }) {
  return (
    <group position={[x, y, z]}>
      <mesh material={mats.ring} position={[0, 0, 0.12 * MM]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[(d / 2 + 0.35) * MM, (d / 2 + 0.4) * MM, 0.24 * MM, 48, 1, true]} />
      </mesh>
      <mesh material={mats.flash} position={[0, 0, 0.05 * MM]}>
        <circleGeometry args={[(d / 2) * MM, 48]} />
      </mesh>
      <mesh material={mats.sapphire} position={[0, 0, 0.24 * MM]}>
        <circleGeometry args={[(d / 2 + 0.35) * MM, 48]} />
      </mesh>
    </group>
  );
}

function SideButton({ side, spec, b, mats }: { side: 1 | -1; spec: DeviceSpec; b: { from: number; to: number; type: string }; mats: Mats }) {
  const geom = useMemo(() => {
    const len = b.to - b.from;
    const width = b.type === "switch" ? 2.3 : Math.min(2.6, spec.d * 0.36);
    const height = b.type === "flush" ? 0.25 : 0.55;
    const g = capsuleButton(len, width, height);
    // shape X → world Y (along the side), shape Y → world Z, extrusion → world ±X (outwards)
    const m = new THREE.Matrix4();
    if (side === 1) m.makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0));
    else m.makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(-1, 0, 0));
    g.applyMatrix4(m);
    return g;
  }, [b, side, spec.d]);
  useEffect(() => () => geom.dispose(), [geom]);
  const y = (spec.h / 2 - (b.from + b.to) / 2) * MM;
  const x = side * (spec.w / 2 - 0.1) * MM;
  if (b.type === "switch") {
    return (
      <group>
        <mesh material={mats.black} position={[side * (spec.w / 2 + 0.02) * MM, y, 0]} rotation={[0, (side * Math.PI) / 2, 0]}>
          <planeGeometry args={[2.6 * MM, (b.to - b.from) * MM]} />
        </mesh>
        <mesh geometry={geom} material={mats.frame} position={[x - side * 0.25 * MM, y + 1.2 * MM, 0]} scale={[1, 0.55, 0.8]} />
      </group>
    );
  }
  return <mesh geometry={geom} material={b.type === "flush" ? mats.darkGlass : mats.frame} position={[x, y, 0]} castShadow />;
}

function BottomDetails({ spec, mats }: { spec: DeviceSpec; mats: Mats }) {
  const y = (-spec.h / 2 - 0.03) * MM;
  const port = useMemo(() => {
    const pw = spec.port === "usbc" ? 8.9 : 7.7;
    // keep the port on the flat part of the band
    const flatPart = 2 * (spec.d / 2 - (spec.band === "flat" ? 0.32 : 0.86) - spec.edgeRadius);
    const ph = Math.min(spec.port === "usbc" ? 3.2 : 2.6, Math.max(1.8, flatPart + 0.5));
    return squircleFlat(pw, ph, ph / 2 - 0.05);
  }, [spec]);
  useEffect(() => () => port.dispose(), [port]);
  const holes: number[] = [];
  for (let i = 0; i < 6; i++) holes.push(8.5 + i * 2.3);
  return (
    // rotate so that +Z of the group faces -Y (bottom edge)
    <group position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh geometry={port} material={mats.black} />
      {holes.map((x) => (
        <mesh key={`r${x}`} material={mats.black} position={[x * MM, 0, 0]}>
          <circleGeometry args={[0.55 * MM, 16]} />
        </mesh>
      ))}
      {spec.kind === "phone" &&
        holes.map((x) => (
          <mesh key={`l${x}`} material={mats.black} position={[-x * MM, 0, 0]}>
            <circleGeometry args={[0.55 * MM, 16]} />
          </mesh>
        ))}
      {spec.kind === "phone" &&
        [-1, 1].map((s) => (
          <mesh key={`s${s}`} material={mats.screw} position={[s * 6.2 * MM, 0, 0.001 * MM]}>
            <circleGeometry args={[0.65 * MM, 16]} />
          </mesh>
        ))}
    </group>
  );
}
