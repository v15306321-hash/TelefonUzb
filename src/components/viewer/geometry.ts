/**
 * Geometry builders for the device viewer (all inputs in millimetres, output in scene units).
 */
import * as THREE from "three";
import type { BandProfile } from "./device-specs";
import { MM } from "./device-specs";

export type PerimeterPoint = { x: number; y: number; nx: number; ny: number };

/**
 * Outline of a rectangle with "continuous" (superellipse) corners, like Apple devices.
 * Returned counter-clockwise with outward normals, centred at the origin (mm).
 */
export function squirclePerimeter(w: number, h: number, r: number, cornerSegments = 40, exponent = 4.2): PerimeterPoint[] {
  const pts: { x: number; y: number }[] = [];
  const R = Math.min(r * 1.32, w / 2 - 0.01, h / 2 - 0.01); // superellipse needs a larger radius for the same visual corner
  const corners: [number, number, number][] = [
    [w / 2 - R, h / 2 - R, 0], // top-right, angles 0..90
    [-(w / 2 - R), h / 2 - R, 1], // top-left, 90..180
    [-(w / 2 - R), -(h / 2 - R), 2], // bottom-left
    [w / 2 - R, -(h / 2 - R), 3], // bottom-right
  ];
  for (const [cx, cy, q] of corners) {
    for (let i = 0; i <= cornerSegments; i++) {
      const t = (i / cornerSegments) * (Math.PI / 2) + (q * Math.PI) / 2;
      const c = Math.cos(t);
      const s = Math.sin(t);
      const x = cx + R * Math.sign(c) * Math.pow(Math.abs(c), 2 / exponent);
      const y = cy + R * Math.sign(s) * Math.pow(Math.abs(s), 2 / exponent);
      pts.push({ x, y });
    }
  }
  // outward normals from neighbouring points (tangent rotated by -90°)
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n];
    const b = pts[(i + 1) % n];
    let tx = b.x - a.x;
    let ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    return { x: p.x, y: p.y, nx: ty, ny: -tx };
  });
}

export function squircleShape(w: number, h: number, r: number, scale = MM, cornerSegments = 32) {
  const pts = squirclePerimeter(w, h, r, cornerSegments);
  const shape = new THREE.Shape();
  pts.forEach((p, i) => (i === 0 ? shape.moveTo(p.x * scale, p.y * scale) : shape.lineTo(p.x * scale, p.y * scale)));
  shape.closePath();
  return shape;
}

/** Flat squircle with UVs normalised to its bounding box. */
export function squircleFlat(w: number, h: number, r: number) {
  const g = new THREE.ShapeGeometry(squircleShape(w, h, r), 1);
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / (w * MM) + 0.5;
    uv[i * 2 + 1] = pos.getY(i) / (h * MM) + 0.5;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Glass/metal slab with rounded edges; bottom at z=0, top at z=thickness. */
export function squircleSlab(w: number, h: number, r: number, thickness: number, edge: number, cornerSegments = 32) {
  const e = Math.min(edge, thickness / 2 - 0.01, r - 0.1);
  const g = new THREE.ExtrudeGeometry(squircleShape(w - e * 2, h - e * 2, Math.max(0.2, r - e), MM, cornerSegments), {
    depth: Math.max(0.00001, (thickness - e * 2) * MM),
    bevelEnabled: true,
    bevelThickness: e * MM,
    bevelSize: e * MM,
    bevelSegments: 6,
    curveSegments: 1,
  });
  g.translate(0, 0, e * MM);
  g.computeVertexNormals();
  // planar UVs for textured faces
  const pos = g.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uv[i * 2] = pos.getX(i) / (w * MM) + 0.5;
    uv[i * 2 + 1] = pos.getY(i) / (h * MM) + 0.5;
  }
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return g;
}

type ProfilePoint = { o: number; z: number; no: number; nz: number };

/**
 * Cross-section of the side band (frame): outward offset `o` (≤0 is inside the outline) and height `z`.
 * flat (iPhone 12–14): straight sides with small radii; rounded (iPhone 11): large radii;
 * contoured (iPhone 15+): soft radiused edges.
 */
export function bandProfile(d: number, edgeRadius: number, profile: BandProfile, lip: number, topGap: number): ProfilePoint[] {
  const zt = d / 2 - topGap; // band top sits below the glass surface
  const re = Math.min(edgeRadius, zt - 0.05);
  const pts: ProfilePoint[] = [];
  const arcSeg = profile === "flat" ? 6 : 12;
  pts.push({ o: -lip, z: zt, no: 0, nz: 1 });
  // top arc: centre (-re, zt-re), from angle 90° to 0°
  for (let i = 0; i <= arcSeg; i++) {
    const a = Math.PI / 2 - (i / arcSeg) * (Math.PI / 2);
    pts.push({ o: -re + Math.cos(a) * re, z: zt - re + Math.sin(a) * re, no: Math.cos(a), nz: Math.sin(a) });
  }
  // bottom arc: centre (-re, -zt+re), from 0° to -90°
  for (let i = 0; i <= arcSeg; i++) {
    const a = -(i / arcSeg) * (Math.PI / 2);
    pts.push({ o: -re + Math.cos(a) * re, z: -zt + re + Math.sin(a) * re, no: Math.cos(a), nz: Math.sin(a) });
  }
  pts.push({ o: -lip, z: -zt, no: 0, nz: -1 });
  return pts;
}

/** Sweep a cross-section profile along the device outline → seamless, smooth frame band. */
export function sweptBand(w: number, h: number, r: number, profile: ProfilePoint[], cornerSegments = 48) {
  const outline = squirclePerimeter(w, h, r, cornerSegments);
  const N = outline.length;
  const M = profile.length;
  const pos = new Float32Array(N * M * 3);
  const nor = new Float32Array(N * M * 3);
  const uv = new Float32Array(N * M * 2);
  for (let i = 0; i < N; i++) {
    const p = outline[i];
    for (let j = 0; j < M; j++) {
      const q = profile[j];
      const k = i * M + j;
      pos[k * 3] = (p.x + p.nx * q.o) * MM;
      pos[k * 3 + 1] = (p.y + p.ny * q.o) * MM;
      pos[k * 3 + 2] = q.z * MM;
      const nx = p.nx * q.no;
      const ny = p.ny * q.no;
      const len = Math.hypot(nx, ny, q.nz) || 1;
      nor[k * 3] = nx / len;
      nor[k * 3 + 1] = ny / len;
      nor[k * 3 + 2] = q.nz / len;
      uv[k * 2] = i / N;
      uv[k * 2 + 1] = j / (M - 1);
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < N; i++) {
    const i2 = (i + 1) % N;
    for (let j = 0; j < M - 1; j++) {
      const a = i * M + j;
      const b = i2 * M + j;
      const c = i2 * M + j + 1;
      const d = i * M + j + 1;
      idx.push(a, d, b, b, d, c); // CCW when seen from outside
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Lathe around the Z axis (profile given as [radius, height] in mm). */
export function latheZ(profile: [number, number][], segments = 64) {
  const g = new THREE.LatheGeometry(
    profile.map(([r, z]) => new THREE.Vector2(r * MM, z * MM)),
    segments,
  );
  g.rotateX(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

/** Rounded rectangle extruded along +Z (used for buttons), dimensions in mm. */
export function capsuleButton(length: number, width: number, height: number) {
  const r = Math.min(width / 2, length / 2) - 0.01;
  const shape = new THREE.Shape();
  const x = -length / 2;
  const y = -width / 2;
  shape.moveTo((x + r) * MM, y * MM);
  shape.lineTo((x + length - r) * MM, y * MM);
  shape.absarc((x + length - r) * MM, 0, r * MM, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo((x + r) * MM, (y + width) * MM);
  shape.absarc((x + r) * MM, 0, r * MM, Math.PI / 2, (Math.PI * 3) / 2, false);
  const bevel = Math.min(0.28, height / 2);
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.00001, (height - bevel) * MM),
    bevelEnabled: true,
    bevelThickness: bevel * MM,
    bevelSize: Math.min(bevel, r * 0.6) * MM,
    bevelSegments: 5,
    curveSegments: 16,
  });
  g.computeVertexNormals();
  return g;
}
