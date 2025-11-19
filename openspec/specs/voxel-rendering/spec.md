# voxel-rendering Specification

## Purpose
TBD - created by archiving change update-floating-transaction-voxels. Update Purpose after archive.
## Requirements
### Requirement: Transaction Voxels Hover Inside Blocks

Transaction voxels SHALL animate continuously inside the parent block shell using subtle, bounded offsets so the interior feels like a gelatinous "slime" containing all transactions.

#### Scenario: Floating motion loops

- **GIVEN** a block with two or more transactions rendered as voxels
- **WHEN** the scene idles for several seconds
- **THEN** every voxel oscillates with its own phase on the X/Y/Z axes, remains fully inside the glass cube, and never moves in lockstep with its neighbors.

#### Scenario: Ghost voxels retain motion

- **GIVEN** a block whose transaction details are unavailable and only placeholder voxels are shown
- **WHEN** the block is displayed in the scene
- **THEN** the placeholder voxels still float with a muted amplitude so the block does not appear frozen.

#### Scenario: Animation stops cleanly when removed

- **GIVEN** the camera pans far enough that the block leaves the 50-block window and is trimmed from state
- **WHEN** the block is removed from the scene graph
- **THEN** the animation loop stops without throwing errors or lingering references to the removed instanced mesh.

### Requirement: New blocks animate into the scene

Freshly fetched blocks SHALL play a distinct entrance animation the first time they appear so operators can visually identify the latest addition to the chain.

#### Scenario: Entrance animation triggers once

- **GIVEN** the polling loop fetches a new block height
- **WHEN** the corresponding voxel cube is spawned in the scene
- **THEN** the cube scales and/or slides into place over < 1 second while the rest of the chain remains steady, and the animation does not replay when the camera revisits the same block later.

#### Scenario: Animation respects performance guardrails

- **GIVEN** up to 50 blocks are visible with hover animations already active
- **WHEN** a new block entrance runs
- **THEN** frame rendering stays smooth (no frozen frames) and the animation completes without dropping other interactions.

### Requirement: Chain links look like interlocking segments

Connections between consecutive blocks SHALL render as chain-like segments (e.g., linked rings or capsules) rather than single straight lines to reinforce the blockchain metaphor.

#### Scenario: Chain visuals connect every adjacent pair

- **GIVEN** two consecutive blocks are visible
- **WHEN** the scene renders their connection
- **THEN** the link appears as a stylized chain segment aligned between their centers, inherits emissive coloring, and updates as blocks move.

#### Scenario: Chain links scale with history

- **GIVEN** the user scrolls left to load older blocks
- **WHEN** the additional cubes render
- **THEN** each new adjacent pair gets the same chain-style connector without gaps or overlapping geometry.

