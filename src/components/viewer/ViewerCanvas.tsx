"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import type { Model3DConfig } from "@/lib/types";
import { deviceSize, ProceduralDevice } from "./ProceduralDevice";
import { applyZoomFocus, defaultRotationOptions, step, type RotationState } from "./rotation";

export type ViewerCanvasProps = {
  config: Model3DConfig;
  color: string;
  modelUrl?: string | null;
  stateRef: MutableRefObject<RotationState>;
  active: boolean;
  reducedMotion?: boolean;
  onReady?: () => void;
  onError?: () => void;
  /** Studio mode: fixed pose & composition, used for generating product images */
  studio?: "pair" | "back" | "front" | null;
};

const DRACO_PATH = "/draco/";
const VIEW_FOV = 28;

/** Studio pair composition (as on product photos): back view on the left, front view overlapping on the right. */
function pairLayout(config: Model3DConfig) {
  const d = deviceSize(config);
  const offset = d.w * 0.32;
  const span = Math.max(d.h, 2 * offset + d.w);
  const fov = 14;
  const distance = span / 0.84 / 2 / Math.tan(THREE.MathUtils.degToRad(fov / 2));
  return { offset, fov, distance };
}

/** Camera distance so the device fills ~78% of the viewer height. */
function viewDistance(config: Model3DConfig) {
  const { h } = deviceSize(config);
  return h / 0.78 / 2 / Math.tan(THREE.MathUtils.degToRad(VIEW_FOV / 2));
}

export default function ViewerCanvas(props: ViewerCanvasProps) {
  const { active, studio } = props;
  const size = deviceSize(props.config);
  const pair = pairLayout(props.config);
  const baseDistance = studio === "pair" ? pair.distance : viewDistance(props.config) * (studio ? 1.05 : 1);
  const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
  return (
    <Canvas
      frameloop={active || studio ? "always" : "never"}
      dpr={studio ? 2 : [1, 2]}
      camera={{ position: [0, 0, baseDistance], fov: studio === "pair" ? pair.fov : VIEW_FOV, near: 0.05, far: 60 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: !!studio, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping; // Khronos PBR Neutral: true-to-swatch product colours
        gl.toneMappingExposure = 1;
        gl.setClearColor(0x000000, 0);
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          props.onError?.();
        });
      }}
      style={{ touchAction: "none" }}
      aria-hidden
    >
      <StudioEnvironment resolution={mobile ? 256 : 512} />
      <Suspense key={props.modelUrl ?? "procedural"} fallback={null}>
        {studio === "pair" ? (
          <>
            <group position={[-pair.offset, 0, -0.06]} rotation={[0, Math.PI, 0]}>
              <Model {...props} />
            </group>
            <group position={[pair.offset, 0, 0.06]}>
              <Model {...props} />
            </group>
            <ReadySignal onReady={props.onReady} />
          </>
        ) : (
          <Rig stateRef={props.stateRef} reducedMotion={props.reducedMotion} studio={studio} baseDistance={baseDistance} bounds={[size.w / 2, size.h / 2]}>
            <Model {...props} />
            <ReadySignal onReady={props.onReady} />
          </Rig>
        )}
      </Suspense>
      {!studio && (
        <ContactShadows position={[0, -size.h / 2 - 0.12, 0]} opacity={0.55} scale={size.h * 2.6} blur={2.8} far={size.h} resolution={512} color="#000000" />
      )}
    </Canvas>
  );
}

/**
 * Photographic studio: a dark room lit by large softboxes and vertical strip lights.
 * Their reflections produce the long, soft highlights typical of professional product
 * renders on glass and polished metal. Built procedurally — no HDR download needed.
 */
function StudioEnvironment({ resolution }: { resolution: number }) {
  return (
    <>
      <ambientLight intensity={0.08} />
      <directionalLight position={[-2, 3, 4]} intensity={0.9} />
      <directionalLight position={[3, 1, -3]} intensity={0.5} color="#eef2ff" />
      <Environment resolution={resolution} frames={1} environmentIntensity={1}>
        <color attach="background" args={["#151518"]} />
        {/* key: large overhead softbox, slightly in front */}
        <Lightformer form="rect" intensity={2.2} position={[0, 5, 1.5]} rotation={[Math.PI / 2.2, 0, 0]} scale={[10, 5, 1]} />
        {/* large side softboxes … */}
        <Lightformer form="rect" intensity={1.1} position={[-5, 0.5, 1]} rotation={[0, Math.PI / 2.4, 0]} scale={[4, 9, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#f2f4ff" position={[5, 0.5, 1]} rotation={[0, -Math.PI / 2.4, 0]} scale={[4, 9, 1]} />
        {/* … with bright vertical strips → long crisp highlights on the frame and glass */}
        <Lightformer form="rect" intensity={6} position={[-3.4, 0.5, 2]} rotation={[0, Math.PI / 2.6, 0]} scale={[0.5, 8, 1]} />
        <Lightformer form="rect" intensity={4.5} position={[3.4, 0.5, 2.2]} rotation={[0, -Math.PI / 2.6, 0]} scale={[0.4, 8, 1]} />
        {/* front fill (behind the camera) */}
        <Lightformer form="rect" intensity={0.8} position={[0, 0.5, 6]} rotation={[0, Math.PI, 0]} scale={[8, 4, 1]} />
        {/* rim lights from behind */}
        <Lightformer form="rect" intensity={2.4} position={[-2.6, 1.2, -4]} rotation={[0, Math.PI / 7, 0]} scale={[2, 8, 1]} />
        <Lightformer form="rect" intensity={1.8} position={[2.8, -0.5, -4]} rotation={[0, -Math.PI / 7, 0]} scale={[2, 8, 1]} />
        {/* floor bounce */}
        <Lightformer form="rect" intensity={0.5} color="#e4e6ec" position={[0, -5, 0.5]} rotation={[-Math.PI / 2, 0, 0]} scale={[10, 6, 1]} />
      </Environment>
    </>
  );
}

function Rig({
  stateRef,
  reducedMotion,
  studio,
  baseDistance,
  bounds,
  children,
}: {
  stateRef: MutableRefObject<RotationState>;
  reducedMotion?: boolean;
  studio?: ViewerCanvasProps["studio"];
  baseDistance: number;
  bounds?: [number, number];
  children: React.ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  const { camera } = useThree();
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    if (studio === "back") {
      g.rotation.set(0.06, Math.PI + 0.5, 0);
      return;
    }
    if (studio === "front") {
      g.rotation.set(0.04, -0.45, 0);
      return;
    }
    const s = stateRef.current;
    const persp = camera as THREE.PerspectiveCamera;
    const halfH = baseDistance * Math.tan(THREE.MathUtils.degToRad(persp.fov / 2));
    applyZoomFocus(s, halfH, persp.aspect || 1, bounds?.[0] ?? 0.4, bounds?.[1] ?? 0.8);
    step(s, dt, defaultRotationOptions, reducedMotion);
    g.quaternion.copy(s.q);
    const z = baseDistance / s.zoom;
    const p = camera.position;
    if (Math.abs(p.z - z) > 1e-6 || Math.abs(p.x - s.pan.x) > 1e-6 || Math.abs(p.y - s.pan.y) > 1e-6) {
      camera.position.set(s.pan.x, s.pan.y, z);
      camera.lookAt(s.pan.x, s.pan.y, 0);
    }
  });
  return <group ref={group}>{children}</group>;
}

function ReadySignal({ onReady }: { onReady?: () => void }) {
  const done = useRef(false);
  const frames = useRef(0);
  useFrame(() => {
    if (done.current) return;
    frames.current += 1;
    if (frames.current > 3) {
      done.current = true;
      onReady?.();
    }
  });
  return null;
}

function Model({ config, color, modelUrl }: ViewerCanvasProps) {
  if (modelUrl) return <GLBModel url={modelUrl} targetHeight={deviceSize(config).h} />;
  return <ProceduralDevice config={config} color={color} />;
}

/** Any GLB/GLTF is centred and scaled to the same on-screen size as procedural devices. */
function GLBModel({ url, targetHeight }: { url: string; targetHeight: number }) {
  const gltf = useGLTF(url, DRACO_PATH, true);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  const ref = useRef<THREE.Group>(null);
  const { invalidate } = useThree();

  useLayoutEffect(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = targetHeight / Math.max(size.x, size.y, size.z, 1e-6);
    scene.position.sub(center);
    if (ref.current) ref.current.scale.setScalar(scale);
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    invalidate();
  }, [scene, targetHeight, invalidate]);

  useEffect(() => () => void useGLTF.clear(url), [url]);

  return (
    <group ref={ref}>
      <primitive object={scene} />
    </group>
  );
}
