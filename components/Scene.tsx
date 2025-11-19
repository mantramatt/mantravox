
import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Environment } from '@react-three/drei';
import * as THREE from 'three';
import VoxelBlock from './VoxelBlock';
import { useChainStore } from '../store/useChainStore';
import { CameraMode } from '../types';

const BLOCK_SPACING = 15;

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
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
    </group>
  );
};

const CameraController: React.FC = () => {
  const { camera, gl } = useThree();
  const { blocks, cameraMode, isLoading } = useChainStore();
  const targetX = useRef(0);
  
  // Drag state
  const isDragging = useRef(false);
  const previousMouseX = useRef(0);
  const [cursor, setCursor] = useState('grab');

  useEffect(() => {
    // Initialize target to current cam pos to avoid jump
    targetX.current = camera.position.x;
  }, []);
  
  // Handle Scroll / Keys / Drag
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        useChainStore.getState().setCameraMode(CameraMode.FREE);
        targetX.current -= 5;
      }
      if (e.key === 'ArrowRight') {
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
        setCursor('grabbing');
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
        setCursor('grab');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel);
    gl.domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
      gl.domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
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

    if (cameraMode === CameraMode.LIVE) {
        // Smoothly fly to the latest block
        targetX.current = latestX;
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
        <VoxelBlock
          key={block.height}
          block={block}
          position={[idx * BLOCK_SPACING, 0, 0]}
          prevBlockPosition={idx > 0 ? [(idx - 1) * BLOCK_SPACING, 0, 0] : undefined}
        />
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
        <fog attach="fog" args={['#0f0f13', 30, 150]} />
      </Canvas>
    </div>
  );
};

export default Scene;
