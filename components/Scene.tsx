import React, { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Environment } from "@react-three/drei";
import * as THREE from "three";
import VoxelBlock from "./VoxelBlock";
import { getColorFromHash } from "./VoxelBlock";
import { useChainStore } from "../store/useChainStore";
import { CameraMode } from "../types";

const BLOCK_SPACING = 15;
const BLOCK_SIZE = 8;
const LIVE_VIEW_OFFSET = BLOCK_SPACING * 1.2;
const CHAIN_CONFIG = {
  ringRadius: 0.7,
  tubeRadius: 0.1,
  emissive: "#e8327e",
  opacity: 0.35,
  emissiveIntensity: 0.25,
};

const ignoreRaycast = (obj: any) => {
  if (obj) obj.raycast = () => null;
};

interface ChainLinkProps {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
}

const ChainLink: React.FC<ChainLinkProps> = ({ start, end, color }) => {
  const startVec = useMemo(() => new THREE.Vector3(...start), [start]);
  const endVec = useMemo(() => new THREE.Vector3(...end), [end]);
  const direction = useMemo(
    () => endVec.clone().sub(startVec),
    [startVec, endVec]
  );
  const length = direction.length();
  const midpoint = useMemo(
    () => startVec.clone().addScaledVector(direction, 0.5),
    [direction, startVec]
  );
  const quaternion = useMemo(() => {
    const quat = new THREE.Quaternion();
    const basis = new THREE.Vector3(1, 0, 0);
    if (direction.lengthSq() === 0) return quat;
    quat.setFromUnitVectors(basis, direction.clone().normalize());
    return quat;
  }, [direction]);

  const linkCount = Math.max(3, Math.round(length / 3));
  const spacing = length / (linkCount + 1);
  const materialColor = useMemo(() => {
    const base = new THREE.Color(color);
    const dark = new THREE.Color("#0b0b10");
    return base.clone().lerp(dark, 0.55);
  }, [color]);

  return (
    <group position={midpoint.toArray()} quaternion={quaternion}>
      {Array.from({ length: linkCount }).map((_, idx) => (
        <mesh
          key={`chain-ring-${idx}`}
          position={[-length / 2 + (idx + 1) * spacing, 0, 0]}
          rotation={[0, 0, idx % 2 === 0 ? 0 : Math.PI / 2]}
          onUpdate={ignoreRaycast}
        >
          <torusGeometry
            args={[CHAIN_CONFIG.ringRadius, CHAIN_CONFIG.tubeRadius, 16, 32]}
          />
          <meshStandardMaterial
            color={materialColor}
            emissive={CHAIN_CONFIG.emissive}
            emissiveIntensity={CHAIN_CONFIG.emissiveIntensity}
            transparent
            opacity={CHAIN_CONFIG.opacity}
            metalness={0.35}
            roughness={0.45}
          />
        </mesh>
      ))}
    </group>
  );
};

const Background = () => {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      // Keep background centered on camera X to prevent it from running out
      groupRef.current.position.x = camera.position.x;
    }
  });

  return (
    <group ref={groupRef}>
      <Stars
        radius={120}
        depth={70}
        count={6500}
        factor={6}
        saturation={0}
        fade
        speed={0.8}
      />
    </group>
  );
};

const CameraController: React.FC = () => {
  const { camera, gl } = useThree();
  const { blocks, cameraMode, isLoading } = useChainStore();
  const targetX = useRef(0);
  const lastBlockCount = useRef(0);
  const liveCatchupOffset = useRef(0);

  // Drag state
  const isDragging = useRef(false);
  const previousMouseX = useRef(0);
  const [cursor, setCursor] = useState("grab");

  useEffect(() => {
    // Initialize target to current cam pos to avoid jump
    targetX.current = camera.position.x;
  }, []);

  // Handle Scroll / Keys / Drag
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        useChainStore.getState().setCameraMode(CameraMode.FREE);
        targetX.current -= 5;
      }
      if (e.key === "ArrowRight") {
        useChainStore.getState().setCameraMode(CameraMode.FREE);
        targetX.current += 5;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      useChainStore.getState().setCameraMode(CameraMode.FREE);
      targetX.current += e.deltaY * 0.05;
    };

    const handlePointerDown = (e: PointerEvent) => {
      // Only drag on main canvas, ignore if clicking UI
      isDragging.current = true;
      previousMouseX.current = e.clientX;
      setCursor("grabbing");
      useChainStore.getState().setCameraMode(CameraMode.FREE);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - previousMouseX.current;
      previousMouseX.current = e.clientX;
      // Invert direction: Drag left to move camera right (pan scene left)
      // Scale factor determines drag speed
      targetX.current -= deltaX * 0.1;
    };

    const handlePointerUp = () => {
      isDragging.current = false;
      setCursor("grab");
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel);
    gl.domElement.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
      gl.domElement.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [gl]);

  // Sync cursor style
  useEffect(() => {
    document.body.style.cursor = cursor;
  }, [cursor]);

  useFrame((state, delta) => {
    if (blocks.length === 0) return;

    const latestBlockIdx = blocks.length - 1;
    const latestX = latestBlockIdx * BLOCK_SPACING;

    if (lastBlockCount.current !== blocks.length) {
      // Create a short-lived lag when a live block arrives to show the camera chasing the head
      if (
        cameraMode === CameraMode.LIVE &&
        blocks.length > lastBlockCount.current
      ) {
        liveCatchupOffset.current = Math.min(
          liveCatchupOffset.current + BLOCK_SPACING * 0.6,
          BLOCK_SPACING * 2
        );
      }
      lastBlockCount.current = blocks.length;
    }

    if (liveCatchupOffset.current > 0) {
      liveCatchupOffset.current = Math.max(
        0,
        liveCatchupOffset.current - delta * BLOCK_SPACING * 0.8
      );
    }

    if (cameraMode === CameraMode.LIVE) {
      // Bias toward the latest block while keeping prior cubes in frame
      const catchUp = liveCatchupOffset.current;
      const desiredLiveTarget = Math.max(
        0,
        latestX - LIVE_VIEW_OFFSET - catchUp
      );
      targetX.current = desiredLiveTarget;
    }

    // Smooth lerp camera position
    const currentX = camera.position.x;
    const dist = targetX.current - currentX;

    // Apply movement
    camera.position.x += dist * delta * 2;

    // Constraints & Infinite Scroll
    if (camera.position.x < 0 && !isLoading) {
      useChainStore.getState().loadOlderBlocks();
    }

    // Look slightly ahead
    camera.lookAt(camera.position.x + 10, 0, 0);
  });

  return null;
};

const SceneContent: React.FC = () => {
  const blocks = useChainStore((state) => state.blocks);

  return (
    <>
      <CameraController />
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      <Environment preset="city" />

      <Background />

      {blocks.map((block, idx) => (
        <React.Fragment key={block.height}>
          {idx > 0 && (
            <ChainLink
              start={[(idx - 1) * BLOCK_SPACING + BLOCK_SIZE / 2, 0, 0]}
              end={[idx * BLOCK_SPACING - BLOCK_SIZE / 2, 0, 0]}
              color={getColorFromHash(block.proposer || block.hash).main}
            />
          )}
          <VoxelBlock block={block} position={[idx * BLOCK_SPACING, 0, 0]} />
        </React.Fragment>
      ))}

      <gridHelper
        args={[1000, 100, 0x222222, 0x111111]}
        position={[0, -10, 0]}
        scale={[1, 1, 1]}
      />
    </>
  );
};

const Scene: React.FC = () => {
  return (
    <div className="w-full h-full absolute top-0 left-0 z-0">
      <Canvas
        camera={{ position: [0, 5, 30], fov: 45 }}
        gl={{ antialias: true }}
        dpr={[1, 2]}
      >
        <SceneContent />
        <fog attach="fog" args={["#0f0f13", 30, 150]} />
      </Canvas>
    </div>
  );
};

export default Scene;
