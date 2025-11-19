# Change: Animate floating transaction voxels inside each block

## Why

Current transaction voxels render as static cubes frozen at their grid coordinates. The user experience brief calls for a "slime block" effect where every transaction cube hovers within the block volume, giving the sense of motion and energy. Without this animation, the visualization feels lifeless and makes it harder to read activity at a glance.

## What Changes

- Add a per-voxel idle animation that keeps every transaction cube hovering within the containing block shell using subtle sinusoidal offsets on all axes.
- Stagger voxel motion with deterministic seeds so adjacent cubes do not move in lockstep while staying constrained inside the glass cube.
- Ensure ghost voxels (no tx details) still pulse gently, and that hover motion pauses cleanly if a block is removed from the scene (e.g., when trimming history).

## Impact

- Affected specs: `voxel-rendering` (new capability describing block + transaction visualization rules)
- Affected code: `components/VoxelBlock.tsx`, potentially shared math helpers under `components/` if extracted
