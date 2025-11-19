
import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { Text, Edges, Line } from '@react-three/drei';
import { BlockData } from '../types';
import { useChainStore } from '../store/useChainStore';
import { useFrame } from '@react-three/fiber';

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

// Generate a consistent color palette (Hex strings)
const getColorFromHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  
  const c = new THREE.Color();
  
  c.setHSL(hue / 360, 0.7, 0.5);
  const main = '#' + c.getHexString();
  
  c.setHSL(hue / 360, 0.9, 0.6);
  const glow = '#' + c.getHexString();
  
  c.setHSL(hue / 360, 0.3, 0.2);
  const dim = '#' + c.getHexString();

  return { main, glow, dim };
};

const VoxelBlock: React.FC<VoxelBlockProps> = ({ block, position, prevBlockPosition }) => {
  const selectObject = useChainStore((state) => state.selectObject);
  const contentRef = useRef<THREE.Group>(null);
  const visualMeshRef = useRef<THREE.InstancedMesh>(null);
  const hitboxMeshRef = useRef<THREE.InstancedMesh>(null);
  const [hovered, setHovered] = useState(false);
  
  // Reusable vector for animation to avoid GC
  const vec3 = useMemo(() => new THREE.Vector3(), []);

  const colors = useMemo(() => getColorFromHash(block.proposer || block.hash), [block.proposer, block.hash]);

  const threeColors = useMemo(() => ({
    main: new THREE.Color(colors.main),
    white: new THREE.Color('#ffffff'),
    dim: new THREE.Color(colors.dim)
  }), [colors.main, colors.dim]);

  useFrame((state) => {
    if (contentRef.current) {
        // Idle floating animation
        contentRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5 + position[0] * 0.1) * 0.2;
        
        // Smooth scale on hover
        const targetScale = hovered ? 1.05 : 1;
        vec3.set(targetScale, targetScale, targetScale);
        contentRef.current.scale.lerp(vec3, 0.1);
    }
  });

  // Calculate positions and sizes for inner transaction voxels
  const txVoxels = useMemo(() => {
    const displayCount = (block.txs && block.txs.length > 0) ? block.txs.length : block.txCount;
    
    if (displayCount === 0) return [];

    const gridDim = Math.ceil(Math.pow(displayCount, 1/3));
    const availableSpace = 5;
    const cellSpace = availableSpace / Math.max(gridDim, 1);
    const centerOffset = -((gridDim - 1) * cellSpace) / 2;

    const voxels = [];
    for (let i = 0; i < displayCount; i++) {
        const x = i % gridDim;
        const y = Math.floor(i / gridDim) % gridDim;
        const z = Math.floor(i / (gridDim * gridDim));

        const pos: [number, number, number] = [
            centerOffset + x * cellSpace,
            centerOffset + y * cellSpace,
            centerOffset + z * cellSpace
        ];

        const txData = block.txs && block.txs[i] ? block.txs[i] : null;
        const isGhost = !txData;

        let size = cellSpace * 0.6; 
        if (txData) {
            const gasRatio = Math.min(txData.gasUsed / 2000000, 1); 
            size = (cellSpace * 0.4) + (gasRatio * cellSpace * 0.5);
        }

        let color = new THREE.Color('#444444'); 
        if (txData) {
            color = new THREE.Color(txData.success ? '#00F0FF' : '#FF2A2A'); 
        }

        voxels.push({ pos, size, color, data: txData, isGhost });
    }
    return voxels;
  }, [block.txs, block.txCount]);

  // Update InstancedMeshes layout
  useLayoutEffect(() => {
    if (txVoxels.length === 0) return;
    if (!visualMeshRef.current || !hitboxMeshRef.current) return;

    const tempObj = new THREE.Object3D();

    txVoxels.forEach((voxel, i) => {
        // Update Visual Mesh Instance
        tempObj.position.set(voxel.pos[0], voxel.pos[1], voxel.pos[2]);
        tempObj.scale.set(voxel.size, voxel.size, voxel.size);
        tempObj.updateMatrix();
        visualMeshRef.current!.setMatrixAt(i, tempObj.matrix);
        visualMeshRef.current!.setColorAt(i, voxel.color);

        // Update Hitbox Mesh Instance (Larger)
        tempObj.scale.set(voxel.size * 1.5, voxel.size * 1.5, voxel.size * 1.5);
        tempObj.updateMatrix();
        hitboxMeshRef.current!.setMatrixAt(i, tempObj.matrix);
    });

    visualMeshRef.current.instanceMatrix.needsUpdate = true;
    if (visualMeshRef.current.instanceColor) visualMeshRef.current.instanceColor.needsUpdate = true;
    
    hitboxMeshRef.current.instanceMatrix.needsUpdate = true;

  }, [txVoxels]);

  const areGhosts = txVoxels.length > 0 && txVoxels[0].isGhost;

  const handleBlockClick = (e: any) => {
    // We do NOT use stopPropagation here because this is the fallback layer
    selectObject({ type: 'block', data: block });
  };

  return (
    <group position={position}>
      {/* Connection Wire - Visual Only */}
      {prevBlockPosition && (
        <Line
          points={[
            [-(position[0] - prevBlockPosition[0]) + BLOCK_SIZE/2, 0, 0], 
            [-BLOCK_SIZE/2, 0, 0]
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
                        if (typeof idx === 'number') {
                            const voxel = txVoxels[idx];
                             if (voxel && !voxel.isGhost) {
                                selectObject({ type: 'tx', data: voxel.data });
                            } else {
                                selectObject({ type: 'block', data: block });
                            }
                        }
                    }}
                    onPointerOver={(e) => { 
                        e.stopPropagation();
                        document.body.style.cursor = 'pointer'; 
                    }}
                    onPointerOut={(e) => {
                        e.stopPropagation();
                        document.body.style.cursor = 'auto';
                    }}
                 >
                    <boxGeometry args={[1, 1, 1]} />
                    <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
                 </instancedMesh>
            </group>
        )}

        {/* 3. Block Interaction Volume */}
        {/* Uses BackSide so rays from outside hit the 'back' wall of the cube (furthest point).
            This ensures that transaction cubes (inside) are hit FIRST by the raycaster.
        */}
        <mesh 
            onClick={handleBlockClick}
            onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
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
                <meshBasicMaterial color={threeColors.dim} wireframe transparent opacity={0.2} />
             </mesh>
        )}

      </group>
    </group>
  );
};

export default VoxelBlock;
