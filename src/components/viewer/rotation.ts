/**
 * Interaction state machine for the product viewer (orientation as a quaternion → free 360°
 * rotation around both axes without gimbal flips).
 *
 *  auto      — continuous turntable rotation around the vertical axis; speed eases in
 *  drag      — the user rotates freely (trackball: horizontal drag → vertical axis,
 *              vertical drag → horizontal axis); auto rotation paused
 *  hold      — short pause after release (longer when zoomed in, to inspect details)
 *  returning — smooth slerp back to the initial pose (and zoom 1×), then → auto
 */
import * as THREE from "three";

export const TAU = Math.PI * 2;

export type RotationOptions = {
  revolutionSeconds: number;
  holdSeconds: number;
  holdSecondsZoomed: number;
  minZoom: number;
  maxZoom: number;
};

export const defaultRotationOptions: RotationOptions = {
  revolutionSeconds: 14,
  holdSeconds: 0.9,
  holdSecondsZoomed: 4,
  minZoom: 0.8,
  maxZoom: 2.6,
};

export type RotationState = {
  mode: "auto" | "drag" | "hold" | "returning";
  /** rendered orientation */
  q: THREE.Quaternion;
  /** orientation the drag is heading to (q follows it smoothly) */
  target: THREE.Quaternion;
  speed: number;
  holdLeft: number;
  zoom: number;
  zoomTarget: number;
  /** camera pan (scene units) — zoom aims at the point under the cursor / fingers */
  pan: THREE.Vector2;
  panTarget: THREE.Vector2;
  /** pending zoom request: previous zoom and focus point in normalised viewport coords (-1..1) */
  zoomRequest: { from: number; u: number; v: number } | null;
};

const IDENTITY = new THREE.Quaternion();
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_X = new THREE.Vector3(1, 0, 0);
const tmp = new THREE.Quaternion();

export function createRotationState(): RotationState {
  return {
    mode: "auto",
    q: new THREE.Quaternion(),
    target: new THREE.Quaternion(),
    speed: 0,
    holdLeft: 0,
    zoom: 1,
    zoomTarget: 1,
    pan: new THREE.Vector2(),
    panTarget: new THREE.Vector2(),
    zoomRequest: null,
  };
}

export function beginDrag(s: RotationState) {
  s.mode = "drag";
  s.target.copy(s.q);
  s.speed = 0;
}

/** dx/dy: pointer movement as a fraction of the viewer width */
export function dragBy(s: RotationState, dx: number, dy: number) {
  if (s.mode !== "drag") beginDrag(s);
  // rotations about the camera (world) axes, pre-multiplied → intuitive trackball
  s.target.premultiply(tmp.setFromAxisAngle(AXIS_Y, dx * Math.PI * 1.6));
  s.target.premultiply(tmp.setFromAxisAngle(AXIS_X, dy * Math.PI * 1.6));
  s.target.normalize();
}

export function endDrag(s: RotationState, o: RotationOptions = defaultRotationOptions) {
  if (s.mode !== "drag") return;
  s.mode = "hold";
  s.holdLeft = s.zoomTarget > 1.05 ? o.holdSecondsZoomed : o.holdSeconds;
}

/** u/v: focus point in normalised viewport coordinates (-1..1, y up); default = centre of the view */
export function zoomBy(s: RotationState, factor: number, u = 0, v = 0, o: RotationOptions = defaultRotationOptions) {
  s.zoomRequest = { from: s.zoomRequest?.from ?? s.zoomTarget, u, v };
  s.zoomTarget = THREE.MathUtils.clamp(s.zoomTarget * factor, o.minZoom, o.maxZoom);
  if (s.mode === "auto" || s.mode === "returning") {
    // inspecting: stop the turntable, return later
    s.target.copy(s.q);
    s.mode = "hold";
    s.speed = 0;
  }
  if (s.mode === "hold") s.holdLeft = Math.max(s.holdLeft, o.holdSecondsZoomed);
}

const damp = (lambda: number, dt: number) => 1 - Math.exp(-lambda * dt);

/**
 * Resolve a pending zoom request so that the point under the cursor stays in place.
 * halfH: half of the visible height at zoom 1 on the device plane; bounds: max pan (half device size).
 */
export function applyZoomFocus(s: RotationState, halfH: number, aspect: number, boundX: number, boundY: number) {
  const r = s.zoomRequest;
  if (!r) return;
  s.zoomRequest = null;
  if (s.zoomTarget <= 1.001) {
    s.panTarget.set(0, 0);
    return;
  }
  const hOld = halfH / r.from;
  const hNew = halfH / s.zoomTarget;
  const wx = s.panTarget.x + r.u * hOld * aspect;
  const wy = s.panTarget.y + r.v * hOld;
  s.panTarget.set(
    THREE.MathUtils.clamp(wx - r.u * hNew * aspect, -boundX, boundX),
    THREE.MathUtils.clamp(wy - r.v * hNew, -boundY, boundY),
  );
}

export function step(s: RotationState, rawDt: number, o: RotationOptions = defaultRotationOptions, reducedMotion = false) {
  const dt = Math.min(rawDt, 1 / 20); // no jumps after frame drops / tab switches
  const autoSpeed = (TAU / o.revolutionSeconds) * (reducedMotion ? 0.5 : 1);
  s.zoom += (s.zoomTarget - s.zoom) * damp(10, dt);
  s.pan.lerp(s.panTarget, damp(10, dt));

  switch (s.mode) {
    case "auto":
      s.speed += (autoSpeed - s.speed) * damp(1.6, dt); // ease-in, no sudden start
      s.q.premultiply(tmp.setFromAxisAngle(AXIS_Y, s.speed * dt)).normalize();
      break;
    case "drag":
    case "hold":
      s.q.slerp(s.target, damp(14, dt));
      if (s.mode === "hold") {
        s.holdLeft -= dt;
        if (s.holdLeft <= 0) {
          s.mode = "returning";
          s.zoomTarget = 1;
          s.panTarget.set(0, 0);
        }
      }
      break;
    case "returning": {
      s.q.slerp(IDENTITY, damp(3.2, dt));
      if (s.q.angleTo(IDENTITY) < 0.0015 && Math.abs(s.zoom - 1) < 0.003 && s.pan.lengthSq() < 1e-8) {
        s.q.identity();
        s.zoom = 1;
        s.pan.set(0, 0);
        s.speed = 0;
        s.mode = "auto";
      }
      break;
    }
  }
}
