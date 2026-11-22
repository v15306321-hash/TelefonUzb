/**
 * Rotation state machine for the product viewer.
 *
 *  auto      — continuous 360° turn around the vertical axis; speed eases in (no jumps)
 *  drag      — user rotates freely (Y unlimited, X clamped); auto rotation paused
 *  hold      — short pause after release
 *  returning — critically-damped spring back to the initial pose, then → auto
 *
 * Pure logic (no React / three imports) so it is easy to test and reuse.
 */

export const TAU = Math.PI * 2;

export type RotationOptions = {
  /** seconds per full revolution in auto mode */
  revolutionSeconds: number;
  /** vertical tilt limit (radians) */
  maxTilt: number;
  /** delay after release before returning (seconds) */
  holdSeconds: number;
  /** initial pose */
  baseX: number;
  baseY: number;
};

export const defaultRotationOptions: RotationOptions = {
  revolutionSeconds: 14,
  maxTilt: 0.55,
  holdSeconds: 0.7,
  baseX: 0,
  baseY: 0,
};

export type RotationState = {
  mode: "auto" | "drag" | "hold" | "returning";
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  speed: number;
  holdLeft: number;
  returnToY: number;
};

export function createRotationState(o: RotationOptions = defaultRotationOptions): RotationState {
  return { mode: "auto", x: o.baseX, y: o.baseY, targetX: o.baseX, targetY: o.baseY, vx: 0, vy: 0, speed: 0, holdLeft: 0, returnToY: o.baseY };
}

const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

export function beginDrag(s: RotationState) {
  s.mode = "drag";
  s.targetX = s.x;
  s.targetY = s.y;
  s.vx = 0;
  s.vy = 0;
  s.speed = 0;
}

/** dx/dy are normalised pointer deltas (fraction of viewer width). */
export function dragBy(s: RotationState, dx: number, dy: number, o: RotationOptions = defaultRotationOptions) {
  if (s.mode !== "drag") beginDrag(s);
  s.targetY += dx * Math.PI * 1.6;
  s.targetX = Math.max(o.baseX - o.maxTilt, Math.min(o.baseX + o.maxTilt, s.targetX + dy * Math.PI * 1.1));
}

export function endDrag(s: RotationState, o: RotationOptions = defaultRotationOptions) {
  if (s.mode !== "drag") return;
  s.mode = "hold";
  s.holdLeft = o.holdSeconds;
}

export function step(s: RotationState, rawDt: number, o: RotationOptions = defaultRotationOptions, reducedMotion = false) {
  const dt = Math.min(rawDt, 1 / 20); // avoid jumps after tab switches / frame drops
  const autoSpeed = (TAU / o.revolutionSeconds) * (reducedMotion ? 0.5 : 1);

  switch (s.mode) {
    case "auto":
      s.speed = damp(s.speed, autoSpeed, 1.6, dt); // smooth ease-in of rotation speed
      s.y += s.speed * dt;
      s.x = damp(s.x, o.baseX, 4, dt);
      if (s.y - o.baseY > TAU * 1000) s.y -= TAU * 1000; // keep numbers small
      break;
    case "drag":
    case "hold": {
      s.y = damp(s.y, s.targetY, 14, dt);
      s.x = damp(s.x, s.targetX, 14, dt);
      if (s.mode === "hold") {
        s.holdLeft -= dt;
        if (s.holdLeft <= 0) {
          s.mode = "returning";
          // nearest equivalent of the initial pose → shortest way back to the front
          s.returnToY = o.baseY + Math.round((s.y - o.baseY) / TAU) * TAU;
          s.vx = 0;
          s.vy = 0;
        }
      }
      break;
    }
    case "returning": {
      // critically damped spring (no overshoot), integrated semi-implicitly
      const k = 26;
      const c = 2 * Math.sqrt(k);
      s.vy += (k * (s.returnToY - s.y) - c * s.vy) * dt;
      s.vx += (k * (o.baseX - s.x) - c * s.vx) * dt;
      s.y += s.vy * dt;
      s.x += s.vx * dt;
      if (Math.abs(s.returnToY - s.y) < 0.0015 && Math.abs(o.baseX - s.x) < 0.0015 && Math.abs(s.vy) < 0.02) {
        s.y = o.baseY + (s.returnToY - o.baseY) - Math.round((s.returnToY - o.baseY) / TAU) * TAU; // == baseY, visually identical
        s.x = o.baseX;
        s.vx = s.vy = 0;
        s.speed = 0;
        s.mode = "auto";
      }
      break;
    }
  }
}
