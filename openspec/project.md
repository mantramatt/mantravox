# Project Context

## Purpose
MANTRA Voxel Explorer is a real-time, browser-based visualization of the MANTRA Chain L1. It renders recent blocks and their transactions as interactive voxel clusters so operators can monitor throughput, gas burn, and block health without combing through conventional explorer tables. The viewer polls the chain every ~3.5 seconds, streams in newly forged blocks, and lets users inspect per-block and per-transaction details while free-roaming through the 3D scene.

## Tech Stack

- TypeScript + React 19 rendered via Vite 6 (ESM, JSX `react-jsx` runtime)
- React Three Fiber, Drei, and raw Three.js for the WebGL scene, fog, lights, instanced voxels, and HUD text
- Zustand (v5) store for polling orchestration, camera state, selections, and derived telemetry such as session gas burned
- Tailwind CSS (loaded from CDN) plus a minimal global stylesheet for layout + scrollbars; lucide-react supplies UI glyphs
- Vite plugin React, `tsconfig` bundler resolution, and `.env.local` for `GEMINI_API_KEY` wiring even if unused locally


## Project Conventions

### Code Style

- All UI code is TypeScript-first; define shared shapes in `types.ts` and keep components typed with `React.FC`.
- Favor functional, hook-driven React components; colocate per-component helpers (e.g., `getColorFromHash`) and keep `useMemo`/`useLayoutEffect` tuned to avoid extraneous allocations in the render loop.
- Use Tailwind utility classes for layout/typography and inline styles only when Tailwind lacks coverage; avoid bespoke CSS unless necessary for canvas-global concerns.
- Keep scene math and Three.js-only logic inside `components/Scene.tsx`/`components/VoxelBlock.tsx`, leaving DOM/UI concerns to `components/UI.tsx`.


### Architecture Patterns

- **Three-layer split**: `services/` encapsulates Cosmos/Mantra RPC fetchers; `store/useChainStore.ts` centralizes derived state + polling; `components/` consume store slices to render the WebGL scene and HUD.
- **Polling pipeline**: `App.tsx` kicks off `init()` and schedules `poll()` every 3.5s. The store limits history to 50 blocks to bound GPU memory and ensures older blocks stream in on demand when the camera pans left.
- **Interaction model**: Camera control, block linking, and transaction selection live in dedicated hooks/components so adding new gestures or inspector panels does not require touching rendering internals.
- **Config via env**: Runtime secrets like `GEMINI_API_KEY` are surfaced through Vite `define` for any future AI integrations without leaking them into the bundle by default.


### Testing Strategy

- Current project verification is manual (run `npm run dev`, inspect the scene, validate polling). The next step is to add Vitest + React Testing Library for store/service units (mock fetch + ensure window trimming, gas accumulation) and shallow UI assertions.
- For rendering/pointer regressions, rely on storybook-style smoke scenes or Cypress component tests that can validate camera mode toggles and selection flows.
- When integrating new APIs, add contract tests around `mantraService` to detect schema drift (height as string, gas fields as strings) before it breaks rendering.


### Git Workflow

- Default branch is `main`; create short-lived feature branches named `feat/<topic>` or `fix/<topic>` and rebase before merging.
- Use conventional commits (`feat:`, `fix:`, `chore:`, `docs:`) so automation and release notes stay consistent.
- Keep OpenSpec proposals/changes in sync with code by landing spec updates in the same PR whenever behavior changes.


## Domain Context

- MANTRA Chain is a Cosmos-SDK blockchain; blocks, transactions, and gas values arrive via the Tendermint gRPC-gateway (`/cosmos/base/tendermint/v1beta1`) and `/cosmos/tx/v1beta1` endpoints.
- Blocks are represented as voxels spaced 15 units apart along the X axis; each transaction becomes an inner cube sized by gas used and colored teal/red for success/failure. Empty blocks surface as ghost cubes.
- `sessionGasBurned` aggregates gas from every block fetched during the current browser session and drives the HUD counter; this is not persisted server-side.
- Users can toggle between `LIVE` (camera auto-follows the newest block) and `FREE` (manual scrolling/dragging) to inspect historical data.


## Important Constraints

- Poll interval is fixed at ~3.5s to balance freshness with API rate limits; catching up fetches at most 5 new blocks per cycle.
- GPU/CPU safety: store retains only the newest 50 blocks; older batches are fetched lazily when panning to avoid unbounded instanced meshes.
- Network resiliency: service calls fall back to placeholder block shells when APIs fail so the scene never collapses; transaction lookups are best-effort.
- Environment secrets (e.g., `GEMINI_API_KEY`) must be provided via `.env.local` but are not hard requirements unless AI features are enabled.


## External Dependencies

- `https://api.archive.mantrachain.io` — primary Cosmos REST endpoint for block/tx data.
- `https://mantrascan.io/mainnet` — outbound explorer deeplinks for blocks/transactions from the HUD.
- Tailwind CDN + AI Studio import maps — deliver CSS utilities and ESM dependencies when hosted inside AI Studio without local node_modules.

