"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import type { Model3DConfig } from "@/lib/types";
import { DEVICE_DIMS, ProceduralDevice } from "./ProceduralDevice";
import { defaultRotationOptions, step, type RotationState } from "./rotation";

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

export default function ViewerCanvas(props: ViewerCanvasProps) {
  const { active, studio } = props;
  const height = DEVICE_DIMS[props.config.kind].h;
  const pairScale = DEVICE_DIMS[props.config.kind].w / DEVICE_DIMS.phone.w;
  return (
    <Canvas
      frameloop={active || studio ? "always" : "never"}
      dpr={studio ? 2 : [1, 1.75]}
      camera={{ position: [0, 0, studio === "pair" ? (props.config.kind === "tablet" ? 7.8 : 5.1) : studio ? 4.3 : 4.15], fov: 30, near: 0.1, far: 50 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: !!studio, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.setClearColor(0x000000, 0);
        gl.domElement.addEventListener("webglcontextlost", (e) => {
          e.preventDefault();
          props.onError?.();
        });
      }}
      style={{ touchAction: "none" }}
      aria-hidden
    >
      <StudioLights />
      <Suspense key={props.modelUrl ?? "procedural"} fallback={null}>
        {studio === "pair" ? (
          <>
            <group position={[-0.54 * pairScale, 0.02, -0.25]} rotation={[0.02, Math.PI + 0.42, 0]}>
              <Model {...props} />
            </group>
            <group position={[0.58 * pairScale, -0.04, 0.2]} rotation={[0.02, -0.3, 0]}>
              <Model {...props} />
            </group>
            <ReadySignal onReady={props.onReady} />
          </>
        ) : (
          <Rig stateRef={props.stateRef} reducedMotion={props.reducedMotion} studio={studio}>
            <Model {...props} />
            <ReadySignal onReady={props.onReady} />
          </Rig>
        )}
      </Suspense>
      {!studio && (
        <ContactShadows position={[0, -height / 2 - 0.16, 0]} opacity={0.55} scale={4} blur={2.6} far={1.2} resolution={256} color="#000000" />
      )}
    </Canvas>
  );
}

function StudioLights() {
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} castShadow={false} />
      <directionalLight position={[-4, 2, -3]} intensity={0.9} color="#dfe6ff" />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={["#0a0a0c"]} />
        <Lightformer form="rect" intensity={3} position={[0, 4, 3]} scale={[8, 2, 1]} rotation={[Math.PI / 3, 0, 0]} />
        <Lightformer form="rect" intensity={2.2} position={[-5, 1, 1]} scale={[2, 6, 1]} rotation={[0, Math.PI / 2, 0]} />
        <Lightformer form="rect" intensity={2.2} position={[5, 1, -1]} scale={[2, 6, 1]} rotation={[0, -Math.PI / 2, 0]} />
        <Lightformer form="rect" intensity={1.2} position={[0, -3, 4]} scale={[6, 1, 1]} rotation={[-Math.PI / 3, 0, 0]} />
        <Lightformer form="ring" intensity={1.6} color="#ff3b30" position={[3, 3, -5]} scale={1.5} />
        <Lightformer form="rect" intensity={1.5} position={[0, 0, -6]} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={0.7} position={[-3, 1.5, 6]} scale={[3, 8, 1]} rotation={[0, Math.PI, 0]} />
        <Lightformer form="rect" intensity={0.3} position={[3, -1, 6]} scale={[6, 3, 1]} rotation={[0, Math.PI, 0]} />
      </Environment>
    </>
  );
}

function Rig({
  stateRef,
  reducedMotion,
  studio,
  children,
}: {
  stateRef: MutableRefObject<RotationState>;
  reducedMotion?: boolean;
  studio?: ViewerCanvasProps["studio"];
  children: React.ReactNode;
}) {
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    if (studio === "back") {
      g.rotation.set(0.08, Math.PI + 0.55, 0);
      return;
    }
    if (studio === "front") {
      g.rotation.set(0.04, -0.45, 0);
      return;
    }
    const s = stateRef.current;
    step(s, dt, defaultRotationOptions, reducedMotion);
    g.rotation.set(s.x, s.y, 0, "YXZ");
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
  if (modelUrl) return <GLBModel url={modelUrl} targetHeight={DEVICE_DIMS[config.kind].h} />;
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
