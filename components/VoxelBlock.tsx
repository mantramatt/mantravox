import React, { useMemo, useRef, useState, useLayoutEffect } from "react";
import * as THREE from "three";
import { Text, Edges, Line } from "@react-three/drei";
import { BlockData } from "../types";
import { useChainStore } from "../store/useChainStore";
import { useFrame } from "@react-three/fiber";

interface VoxelBlockProps {
  block: BlockData;
  position: [number, number, number];
  prevBlockPosition?: [number, number, number];
}

const BLOCK_SIZE = 8;

// Helper to strictly disable raycasting on visual objects
const ignoreRaycast = (obj: any) => {
  if (obj) obj.raycast = () => null;
};

type TxVoxel = {
  pos: [number, number, number];
  size: number;
  color: THREE.Color;
  data: BlockData["txs"][number] | null;
  isGhost: boolean;
  amplitude: number;
  phase: { x: number; y: number; z: number };
  speed: number;
};

// Deterministic hash helper used to seed animation offsets
const hashStringToUint = (str: string) => {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash +=
      (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
};

const seededRandom = (seed: number, offset: number) => {
  const value = Math.sin(seed + offset * 374761.0) * 10000;
  return value - Math.floor(value);
};

// Generate a consistent color palette (Hex strings)
const getColorFromHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);

  const c = new THREE.Color();

  c.setHSL(hue / 360, 0.7, 0.5);
  const main = "#" + c.getHexString();

  c.setHSL(hue / 360, 0.9, 0.6);
  const glow = "#" + c.getHexString();

  c.setHSL(hue / 360, 0.3, 0.2);
  const dim = "#" + c.getHexString();

  return { main, glow, dim };
};

const VoxelBlock: React.FC<VoxelBlockProps> = ({
  block,
  position,
  prevBlockPosition,
}) => {
  const selectObject = useChainStore((state) => state.selectObject);
  const contentRef = useRef<THREE.Group>(null);
  const visualMeshRef = useRef<THREE.InstancedMesh>(null);
  const hitboxMeshRef = useRef<THREE.InstancedMesh>(null);
  const [hovered, setHovered] = useState(false);

  // Reusable vector for animation to avoid GC
  const vec3 = useMemo(() => new THREE.Vector3(), []);
  const tempVisual = useMemo(() => new THREE.Object3D(), []);
  const tempHitbox = useMemo(() => new THREE.Object3D(), []);

  const colors = useMemo(
    () => getColorFromHash(block.proposer || block.hash),
    [block.proposer, block.hash]
  );

  const threeColors = useMemo(
    () => ({
      main: new THREE.Color(colors.main),
      white: new THREE.Color("#ffffff"),
      dim: new THREE.Color(colors.dim),
    }),
    [colors.main, colors.dim]
  );

  // Calculate positions and sizes for inner transaction voxels
  const txVoxels = useMemo<TxVoxel[]>(() => {
    const displayCount =
      block.txs && block.txs.length > 0 ? block.txs.length : block.txCount;

    if (displayCount === 0) return [];

    const gridDim = Math.ceil(Math.pow(displayCount, 1 / 3));
    const availableSpace = 5;
    const cellSpace = availableSpace / Math.max(gridDim, 1);
    const centerOffset = -((gridDim - 1) * cellSpace) / 2;

    const voxels: TxVoxel[] = [];
    for (let i = 0; i < displayCount; i++) {
      const x = i % gridDim;
      const y = Math.floor(i / gridDim) % gridDim;
      const z = Math.floor(i / (gridDim * gridDim));

      const pos: [number, number, number] = [
        centerOffset + x * cellSpace,
        centerOffset + y * cellSpace,
        centerOffset + z * cellSpace,
      ];

      const txData = block.txs && block.txs[i] ? block.txs[i] : null;
      const isGhost = !txData;

      let size = cellSpace * 0.6;
      if (txData) {
        const gasRatio = Math.min(txData.gasUsed / 2000000, 1);
        size = cellSpace * 0.4 + gasRatio * cellSpace * 0.5;
      }

      let color = new THREE.Color("#444444");
      if (txData) {
        color = new THREE.Color(txData.success ? "#00F0FF" : "#FF2A2A");
      }

      const seed = hashStringToUint(
        `${block.hash}-${block.height}-${i}-${txData ? txData.hash : "ghost"}`
      );
      const baseAmplitude = Math.min(0.45, cellSpace * 0.45);
      const amplitude = (txData ? 1 : 0.6) * baseAmplitude;
      voxels.push({
        pos,
        size,
        color,
        data: txData,
        isGhost,
        amplitude,
        phase: {
          x: seededRandom(seed, 1) * Math.PI * 2,
          y: seededRandom(seed, 2) * Math.PI * 2,
          z: seededRandom(seed, 3) * Math.PI * 2,
        },
        speed: 0.6 + seededRandom(seed, 4) * 0.8,
      });
    }
    return voxels;
  }, [block]);

  // Update InstancedMeshes layout
  useLayoutEffect(() => {
    if (txVoxels.length === 0) return;
    if (!visualMeshRef.current || !hitboxMeshRef.current) return;

    txVoxels.forEach((voxel, i) => {
      // Update Visual Mesh Instance
      tempVisual.position.set(voxel.pos[0], voxel.pos[1], voxel.pos[2]);
      tempVisual.scale.set(voxel.size, voxel.size, voxel.size);
      tempVisual.updateMatrix();
      visualMeshRef.current!.setMatrixAt(i, tempVisual.matrix);
      visualMeshRef.current!.setColorAt(i, voxel.color);

      // Update Hitbox Mesh Instance (Larger)
      tempHitbox.position.set(voxel.pos[0], voxel.pos[1], voxel.pos[2]);
      tempHitbox.scale.set(
        voxel.size * 1.5,
        voxel.size * 1.5,
        voxel.size * 1.5
      );
      tempHitbox.updateMatrix();
      hitboxMeshRef.current!.setMatrixAt(i, tempHitbox.matrix);
    });

    visualMeshRef.current.instanceMatrix.needsUpdate = true;
    if (visualMeshRef.current.instanceColor)
      visualMeshRef.current.instanceColor.needsUpdate = true;

    hitboxMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [txVoxels, tempVisual, tempHitbox]);

  useFrame((state) => {
    if (contentRef.current) {
      // Idle floating animation for the outer block
      contentRef.current.position.y =
        Math.sin(state.clock.elapsedTime * 0.5 + position[0] * 0.1) * 0.2;
      const targetScale = hovered ? 1.05 : 1;
      vec3.set(targetScale, targetScale, targetScale);
      contentRef.current.scale.lerp(vec3, 0.1);
    }

    if (!visualMeshRef.current || txVoxels.length === 0) return;

    const elapsed = state.clock.elapsedTime;
    txVoxels.forEach((voxel, i) => {
      const time = elapsed * voxel.speed;
      const offsetX = Math.sin(time + voxel.phase.x) * voxel.amplitude;
      const offsetY = Math.sin(time * 1.1 + voxel.phase.y) * voxel.amplitude;
      const offsetZ = Math.sin(time * 0.9 + voxel.phase.z) * voxel.amplitude;

      tempVisual.position.set(
        voxel.pos[0] + offsetX,
        voxel.pos[1] + offsetY,
        voxel.pos[2] + offsetZ
      );
      tempVisual.scale.set(voxel.size, voxel.size, voxel.size);
      tempVisual.updateMatrix();
      visualMeshRef.current!.setMatrixAt(i, tempVisual.matrix);

      if (hitboxMeshRef.current) {
        tempHitbox.position.copy(tempVisual.position);
        tempHitbox.scale.set(
          voxel.size * 1.5,
          voxel.size * 1.5,
          voxel.size * 1.5
        );
        tempHitbox.updateMatrix();
        hitboxMeshRef.current.setMatrixAt(i, tempHitbox.matrix);
      }
    });

    visualMeshRef.current.instanceMatrix.needsUpdate = true;
    if (hitboxMeshRef.current) {
      hitboxMeshRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  const areGhosts = txVoxels.length > 0 && txVoxels[0].isGhost;

  const handleBlockClick = (e: any) => {
    // We do NOT use stopPropagation here because this is the fallback layer
    selectObject({ type: "block", data: block });
  };

  return (
    <group position={position}>
      {/* Connection Wire - Visual Only */}
      {prevBlockPosition && (
        <Line
          points={[
            [-(position[0] - prevBlockPosition[0]) + BLOCK_SIZE / 2, 0, 0],
            [-BLOCK_SIZE / 2, 0, 0],
          ]}
          color={threeColors.main}
          lineWidth={2}
          transparent
          opacity={0.4}
          onUpdate={ignoreRaycast}
        />
      )}

      {/* Text Labels - Visual Only */}
      <group position={[0, BLOCK_SIZE / 2 + 1.5, 0]}>
        <Text
          fontSize={1}
          color="white"
          anchorX="center"
          anchorY="bottom"
          outlineWidth={0.05}
          outlineColor="#000000"
          onUpdate={ignoreRaycast}
        >
          #{block.height}
        </Text>
        <Text
          position={[0, -0.8, 0]}
          fontSize={0.5}
          color={colors.glow}
          anchorX="center"
          anchorY="bottom"
          onUpdate={ignoreRaycast}
        >
          {block.txCount} TXs
        </Text>
      </group>

      <group ref={contentRef}>
        {/* 1. Visual Glass Shell (Strictly Visual) */}
        <group>
          <mesh onUpdate={ignoreRaycast}>
            <boxGeometry args={[BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE]} />
            <meshPhysicalMaterial
              color={threeColors.dim}
              emissive={threeColors.main}
              emissiveIntensity={hovered ? 0.4 : 0.1}
              roughness={0.1}
              metalness={0.1}
              transmission={0.6}
              thickness={2}
              transparent
              opacity={0.15}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <Edges
            scale={1.0}
            threshold={15}
            color={hovered ? threeColors.white : threeColors.main}
            linewidth={hovered ? 2 : 1}
            onUpdate={ignoreRaycast}
          />
        </group>

        {/* 2. Inner Transaction Cubes (Instanced for Performance) */}
        {txVoxels.length > 0 && (
          <group>
            {/* Visual Instances */}
            <instancedMesh
              ref={visualMeshRef}
              args={[undefined, undefined, txVoxels.length]}
              onUpdate={ignoreRaycast}
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshStandardMaterial
                emissiveIntensity={areGhosts ? 0.2 : 2.0}
                toneMapped={false}
                transparent={areGhosts}
                opacity={areGhosts ? 0.3 : 1.0}
                vertexColors={true}
              />
            </instancedMesh>

            {/* Hitbox Instances */}
            <instancedMesh
              ref={hitboxMeshRef}
              args={[undefined, undefined, txVoxels.length]}
              visible={true}
              onClick={(e) => {
                e.stopPropagation();
                const idx = e.instanceId;
                // InstancedMesh gives us instanceId, which corresponds to our txVoxels array index
                if (typeof idx === "number") {
                  const voxel = txVoxels[idx];
                  if (voxel && !voxel.isGhost) {
                    selectObject({ type: "tx", data: voxel.data });
                  } else {
                    selectObject({ type: "block", data: block });
                  }
                }
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                document.body.style.cursor = "auto";
              }}
            >
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial
                transparent
                opacity={0}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </instancedMesh>
          </group>
        )}

        {/* 3. Block Interaction Volume */}
        {/* Uses BackSide so rays from outside hit the 'back' wall of the cube (furthest point).
            This ensures that transaction cubes (inside) are hit FIRST by the raycaster.
        */}
        <mesh
          onClick={handleBlockClick}
          onPointerOver={() => {
            setHovered(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = "auto";
          }}
        >
          <boxGeometry args={[BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE]} />
          <meshBasicMaterial
            color="black"
            transparent
            opacity={0}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>

        {/* Fallback for empty blocks visual */}
        {block.txCount === 0 && (
          <mesh onUpdate={ignoreRaycast}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial
              color={threeColors.dim}
              wireframe
              transparent
              opacity={0.2}
            />
          </mesh>
        )}
      </group>
    </group>
  );
};

export default VoxelBlock;
