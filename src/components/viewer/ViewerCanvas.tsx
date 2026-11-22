"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, useGLTF } from "@react-three/drei";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
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

/** Studio pair composition (as on product photos): back view on the left, front view overlapping on the right. */
function pairLayout(kind: Model3DConfig["kind"]) {
  const d = DEVICE_DIMS[kind];
  const offset = d.w * 0.32;
  const span = Math.max(d.h, 2 * offset + d.w);
  const fov = 14;
  const distance = span / 0.84 / 2 / Math.tan(THREE.MathUtils.degToRad(fov / 2));
  return { offset, fov, distance };
}

export default function ViewerCanvas(props: ViewerCanvasProps) {
  const { active, studio } = props;
  const height = DEVICE_DIMS[props.config.kind].h;
  const pair = pairLayout(props.config.kind);
  const camera =
    studio === "pair"
      ? { position: [0, 0, pair.distance] as [number, number, number], fov: pair.fov }
      : { position: [0, 0, studio ? 3.9 : 4.15] as [number, number, number], fov: 30 };
  return (
    <Canvas
      frameloop={active || studio ? "always" : "never"}
      dpr={studio ? 2 : [1, 2]}
      shadows={!studio}
      camera={{ ...camera, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true, preserveDrawingBuffer: !!studio, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        // Khronos PBR Neutral: keeps product colours true to the swatches
        gl.toneMapping = THREE.NeutralToneMapping;
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
      <StudioLights />
      <Suspense key={props.modelUrl ?? "procedural"} fallback={null}>
        {studio === "pair" ? (
          <>
            <group position={[-pair.offset, 0, -0.08]} rotation={[0, Math.PI, 0]}>
              <Model {...props} />
            </group>
            <group position={[pair.offset, 0, 0.08]}>
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
        <ContactShadows position={[0, -height / 2 - 0.16, 0]} opacity={0.6} scale={4} blur={2.4} far={1.4} resolution={512} color="#000000" />
      )}
    </Canvas>
  );
}

/** Photographic studio lighting: PMREM-filtered room environment + soft key / rim lights. */
function StudioLights() {
  const { gl, scene } = useThree();
  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const rt = pmrem.fromScene(room, 0.035);
    scene.environment = rt.texture;
    scene.environmentIntensity = 0.85;
    return () => {
      scene.environment = null;
      rt.dispose();
      pmrem.dispose();
      room.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((mt) => mt.dispose());
        }
      });
    };
  }, [gl, scene]);
  return (
    <>
      <ambientLight intensity={0.12} />
      <directionalLight position={[-2.5, 3.5, 4]} intensity={1.1} />
      <directionalLight position={[3, 1.5, -4]} intensity={0.8} color="#e9eeff" />
      <directionalLight position={[2.5, -2, 3]} intensity={0.25} />
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
      g.rotation.set(0.06, Math.PI + 0.5, 0);
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
