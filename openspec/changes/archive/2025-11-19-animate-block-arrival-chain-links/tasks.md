# Tasks

## 1. Implementation

- [x] 1.1 Audit `components/VoxelBlock.tsx` and `store/useChainStore.ts` to determine where new blocks first appear so we can hook an entrance animation flag/state.
- [x] 1.2 Implement a deterministic spawn animation for freshly added blocks (e.g., scale from 0.4→1 and glide in from a slight Z offset) without disturbing existing hover behavior.
- [x] 1.3 Replace the existing `Line` connector with a chain-like mesh (interlocking torus/capsule segments or textured instanced geometry) that links each block pair while respecting performance constraints.
- [x] 1.4 Expose configuration (duration, easing, chain color) via constants so future tuning does not require deep code changes.
- [x] 1.5 Validate visually via `npm run dev`: confirm new blocks animate once, links look like chain segments, and frame time stays stable on a 50-block scene.
