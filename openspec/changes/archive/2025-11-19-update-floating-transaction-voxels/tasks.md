# Tasks

## 1. Implementation

- [x] 1.1 Review `components/VoxelBlock.tsx` instancing layout to understand how tx voxels are positioned and colored today.
- [x] 1.2 Introduce deterministic per-voxel seeds (derived from tx hash + index fallback) that drive sine-based offsets along X/Y/Z while clamping motion inside the block shell.
- [x] 1.3 Update the render loop (`useFrame`) to recompute instanced matrices each tick so voxels hover/bounce smoothly without reallocations.
- [x] 1.4 Ensure ghost voxels animate with a muted amplitude/intensity and that animation state resets cleanly when blocks are trimmed or replaced.
- [x] 1.5 Validate manually via `npm run dev`: observe multiple blocks to confirm staggered motion, no voxel escapes the shell, and performance remains stable (<1 ms frame cost increase).
