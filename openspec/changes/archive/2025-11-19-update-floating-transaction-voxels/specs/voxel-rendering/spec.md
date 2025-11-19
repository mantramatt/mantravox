# Capability: Voxel Rendering

## ADDED Requirements

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
