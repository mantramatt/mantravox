# Change: Animate block arrival and chain links

## Why

The scene currently snaps new blocks into the voxel chain with no entrance animation, making it hard for operators to notice fresh blocks. The thin straight line between cubes also fails to convey the "chain" metaphor. Adding a short entrance animation and chain-like links will create clearer motion cues and reinforce the blockchain mental model.

## What Changes

- Trigger a scripted entrance animation whenever a block first appears (e.g., scale/position lerp from a spawn point) so users can immediately identify the newest block.
- Replace the simple line connecting consecutive cubes with a stylized chain segment (dual cylinders or interlocking rings) that continuously links blocks and inherits emissive colors.
- Ensure animations run efficiently for up to 50 visible blocks without degrading frame time.

## Impact

- Affected specs: `voxel-rendering` (new requirements for block arrival animation and chain visuals)
- Affected code: `components/VoxelBlock.tsx`, `components/Scene.tsx` (connection rendering), and potentially helper utilities for animation timing.
