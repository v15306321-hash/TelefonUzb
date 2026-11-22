/**
 * Physical specifications of devices rendered by the procedural 3D viewer.
 * All measurements are in millimetres (as published in manufacturers' spec sheets);
 * camera coordinates are measured on the BACK of the device from its top-left corner.
 *
 * Adding a new model = adding one spec object here (no changes to rendering code).
 */
import { devicePresets, type Model3DConfig } from "@/lib/types";

export type BandProfile = "flat" | "rounded" | "contoured";
export type FrameFinish = "aluminium" | "steel" | "titanium";
export type BackFinish = "gloss" | "matte";

export type LensSpec = { x: number; y: number; d: number };
export type CameraSpec = {
  plateau?: { x: number; y: number; w: number; h: number; r: number; depth: number; material?: "glass" | "frame" | "dark" };
  lenses: LensSpec[];
  /** lens ring protrusion above the plateau / back, mm */
  ringHeight: number;
  /** ring width relative to lens diameter (pro models have thicker rings) */
  ringWidth: number;
  flash?: { x: number; y: number; d: number };
  lidar?: { x: number; y: number; d: number };
  mic?: { x: number; y: number; d: number };
};
export type ButtonSpec = { from: number; to: number; type: "button" | "switch" | "flush" };

export type DeviceSpec = {
  id: string;
  kind: "phone" | "tablet";
  w: number;
  h: number;
  d: number;
  /** corner radius (continuous/squircle corners) */
  r: number;
  band: BandProfile;
  /** radius of the rounded transition between band side and glass */
  edgeRadius: number;
  frame: FrameFinish;
  back: BackFinish;
  /** back made of frame material with a glass panel (iPhone 17 Pro style) */
  unibody?: { panelTop: number };
  screen: { bezel: number; cutout: "notch" | "island" | "punch" | "none"; cutoutW?: number; cutoutH?: number };
  camera: CameraSpec;
  /** buttons measured from the top edge, in FRONT view */
  left: ButtonSpec[];
  right: ButtonSpec[];
  port: "lightning" | "usbc";
  antennas: boolean;
};

export { devicePresets };
export type DevicePreset = (typeof devicePresets)[number];

const IPHONE_BUTTONS_LEFT: ButtonSpec[] = [
  { from: 21, to: 28.5, type: "switch" },
  { from: 37, to: 47, type: "button" },
  { from: 50.5, to: 60.5, type: "button" },
];

export const PRESETS: Record<DevicePreset, DeviceSpec> = {
  "iphone-11": {
    id: "iphone-11",
    kind: "phone",
    w: 75.7,
    h: 150.9,
    d: 8.3,
    r: 13.5,
    band: "rounded",
    edgeRadius: 2.7,
    frame: "aluminium",
    back: "gloss",
    screen: { bezel: 4.3, cutout: "notch", cutoutW: 34, cutoutH: 5.6 },
    camera: {
      plateau: { x: 3.6, y: 3.6, w: 26.6, h: 26.6, r: 7.4, depth: 1.0 },
      lenses: [
        { x: 11.0, y: 10.9, d: 11.4 },
        { x: 11.0, y: 23.4, d: 11.4 },
      ],
      ringHeight: 1.1,
      ringWidth: 0.07,
      flash: { x: 23.4, y: 19.6, d: 4.4 },
      mic: { x: 23.4, y: 10.8, d: 1.4 },
    },
    left: IPHONE_BUTTONS_LEFT,
    right: [{ from: 40, to: 57, type: "button" }],
    port: "lightning",
    antennas: true,
  },
  "iphone-13": {
    id: "iphone-13",
    kind: "phone",
    w: 71.5,
    h: 146.7,
    d: 7.65,
    r: 12.2,
    band: "flat",
    edgeRadius: 0.75,
    frame: "aluminium",
    back: "gloss",
    screen: { bezel: 2.6, cutout: "notch", cutoutW: 26.8, cutoutH: 5.4 },
    camera: {
      plateau: { x: 3.6, y: 3.6, w: 26.4, h: 26.4, r: 7.6, depth: 1.05 },
      lenses: [
        { x: 11.2, y: 11.2, d: 11.6 },
        { x: 22.4, y: 22.4, d: 11.6 },
      ],
      ringHeight: 1.3,
      ringWidth: 0.07,
      flash: { x: 23.0, y: 10.7, d: 4.6 },
      mic: { x: 10.7, y: 23.0, d: 1.4 },
    },
    left: IPHONE_BUTTONS_LEFT,
    right: [{ from: 40, to: 57, type: "button" }],
    port: "lightning",
    antennas: true,
  },
  "iphone-13-pro": {
    id: "iphone-13-pro",
    kind: "phone",
    w: 71.5,
    h: 146.7,
    d: 7.65,
    r: 12.2,
    band: "flat",
    edgeRadius: 0.6,
    frame: "steel",
    back: "matte",
    screen: { bezel: 2.4, cutout: "notch", cutoutW: 26.8, cutoutH: 5.4 },
    camera: {
      plateau: { x: 3.4, y: 3.4, w: 36.4, h: 36.4, r: 9.8, depth: 1.1 },
      lenses: [
        { x: 12.0, y: 12.2, d: 14.6 },
        { x: 12.0, y: 30.6, d: 14.6 },
        { x: 29.0, y: 21.4, d: 14.6 },
      ],
      ringHeight: 1.75,
      ringWidth: 0.085,
      flash: { x: 30.6, y: 8.2, d: 4.8 },
      lidar: { x: 30.6, y: 34.6, d: 4.9 },
      mic: { x: 23.0, y: 21.4, d: 0.8 },
    },
    left: IPHONE_BUTTONS_LEFT,
    right: [{ from: 40, to: 57, type: "button" }],
    port: "lightning",
    antennas: true,
  },
  "iphone-15": {
    id: "iphone-15",
    kind: "phone",
    w: 71.6,
    h: 147.6,
    d: 7.8,
    r: 12.6,
    band: "contoured",
    edgeRadius: 2.0,
    frame: "aluminium",
    back: "matte",
    screen: { bezel: 2.1, cutout: "island", cutoutW: 20.4, cutoutH: 5.9 },
    camera: {
      plateau: { x: 3.4, y: 3.4, w: 27.4, h: 27.4, r: 8.2, depth: 1.15 },
      lenses: [
        { x: 11.4, y: 11.4, d: 12.0 },
        { x: 23.3, y: 23.3, d: 12.0 },
      ],
      ringHeight: 1.4,
      ringWidth: 0.075,
      flash: { x: 23.5, y: 10.9, d: 4.6 },
      mic: { x: 10.9, y: 23.5, d: 1.4 },
    },
    left: IPHONE_BUTTONS_LEFT,
    right: [{ from: 40, to: 57, type: "button" }],
    port: "usbc",
    antennas: true,
  },
  "iphone-17-pro": {
    id: "iphone-17-pro",
    kind: "phone",
    w: 78.0,
    h: 163.4,
    d: 8.75,
    r: 14.0,
    band: "contoured",
    edgeRadius: 1.8,
    frame: "aluminium",
    back: "matte",
    unibody: { panelTop: 47 },
    screen: { bezel: 1.6, cutout: "island", cutoutW: 20.4, cutoutH: 5.9 },
    camera: {
      plateau: { x: 1.6, y: 1.6, w: 74.8, h: 42.4, r: 12, depth: 1.6, material: "frame" },
      lenses: [
        { x: 13.2, y: 12.4, d: 15.4 },
        { x: 13.2, y: 31.6, d: 15.4 },
        { x: 30.6, y: 22.0, d: 15.4 },
      ],
      ringHeight: 1.8,
      ringWidth: 0.08,
      flash: { x: 63.4, y: 11.0, d: 5.4 },
      lidar: { x: 63.4, y: 32.4, d: 5.4 },
      mic: { x: 56.6, y: 22.0, d: 0.9 },
    },
    left: [
      { from: 24, to: 31, type: "button" },
      { from: 38, to: 48, type: "button" },
      { from: 52, to: 62, type: "button" },
    ],
    right: [
      { from: 42, to: 59, type: "button" },
      { from: 96, to: 113, type: "flush" },
    ],
    port: "usbc",
    antennas: true,
  },
};

/** Generic specs for the legacy "layout" configuration (other brands, tablets). */
function genericSpec(config: Model3DConfig): DeviceSpec {
  const frame: FrameFinish = config.frame === "polished" ? "steel" : config.frame === "titanium" ? "titanium" : "aluminium";
  if (config.kind === "tablet") {
    return {
      id: "tablet",
      kind: "tablet",
      w: 178.5,
      h: 247.6,
      d: 5.6,
      r: 18,
      band: "flat",
      edgeRadius: 0.7,
      frame,
      back: "matte",
      screen: { bezel: 9.5, cutout: "none" },
      camera: {
        plateau: { x: 4.5, y: 4.5, w: 13, h: 13, r: 6.5, depth: 0.6, material: "dark" },
        lenses: [{ x: 11, y: 11, d: 7.6 }],
        ringHeight: 0.9,
        ringWidth: 0.08,
        flash: { x: 11, y: 22, d: 3.2 },
      },
      left: [],
      right: [{ from: 20, to: 42, type: "button" }],
      port: "usbc",
      antennas: false,
    };
  }
  const base = {
    kind: "phone" as const,
    w: 77.6,
    h: 162.8,
    d: 8.2,
    r: 11,
    band: "flat" as BandProfile,
    edgeRadius: 1.2,
    frame,
    back: "matte" as BackFinish,
    screen: { bezel: 1.8, cutout: "punch" as const },
    left: [] as ButtonSpec[],
    right: [
      { from: 36, to: 58, type: "button" as const },
      { from: 64, to: 76, type: "button" as const },
    ],
    port: "usbc" as const,
    antennas: true,
  };
  let camera: CameraSpec;
  switch (config.layout) {
    case "vertical-trio":
      camera = {
        lenses: [0, 1, 2].map((i) => ({ x: 14, y: 15 + i * 17.5, d: 13.6 })),
        ringHeight: 1.4,
        ringWidth: 0.09,
        flash: { x: 28, y: 13, d: 4.2 },
        lidar: { x: 28, y: 24, d: 3.4 },
      };
      break;
    case "horizontal-bar":
      camera = {
        plateau: { x: -0.4, y: 26, w: 78.4, h: 22, r: 10.5, depth: 2.6, material: "frame" },
        lenses: [12, 27, 42].map((x) => ({ x, y: 37, d: 11.5 })),
        ringHeight: 0.6,
        ringWidth: 0.06,
        flash: { x: 58, y: 37, d: 4.4 },
      };
      break;
    case "square-quad":
      camera = {
        plateau: { x: 4, y: 4, w: 40, h: 40, r: 9.5, depth: 1.4 },
        lenses: [
          { x: 14, y: 14, d: 14 },
          { x: 34, y: 14, d: 14 },
          { x: 14, y: 34, d: 14 },
        ],
        ringHeight: 1.2,
        ringWidth: 0.08,
        flash: { x: 34, y: 34, d: 5 },
      };
      break;
    case "round-module":
      camera = {
        plateau: { x: 15, y: 5, w: 48, h: 48, r: 24, depth: 2.2, material: "dark" },
        lenses: [
          { x: 29.5, y: 19.5, d: 14.5 },
          { x: 48.5, y: 19.5, d: 14.5 },
          { x: 29.5, y: 38.5, d: 14.5 },
          { x: 48.5, y: 38.5, d: 14.5 },
        ],
        ringHeight: 0.8,
        ringWidth: 0.06,
        flash: { x: 68, y: 10, d: 4.6 },
      };
      break;
    case "dual-vertical":
      return { ...PRESETS["iphone-11"], frame, id: "generic-dual-vertical" };
    case "dual-diagonal":
      return { ...PRESETS["iphone-15"], frame, id: "generic-dual-diagonal" };
    case "pro-triangle":
      return { ...PRESETS["iphone-13-pro"], frame, back: "matte", id: "generic-pro-triangle" };
    case "single":
    default:
      camera = { lenses: [{ x: 12, y: 12, d: 10 }], ringHeight: 1, ringWidth: 0.08, flash: { x: 12, y: 24, d: 3.4 } };
  }
  return { ...base, id: `generic-${config.layout}`, camera };
}

export function getDeviceSpec(config: Model3DConfig): DeviceSpec {
  if (config.preset && config.preset in PRESETS) return PRESETS[config.preset as DevicePreset];
  return genericSpec(config);
}

/** scene units per millimetre: 1 unit = 100 mm */
export const MM = 0.01;
