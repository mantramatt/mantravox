# MANTRA Voxel Explorer

> A cinematic, real-time block explorer for MANTRA Chain rendered entirely in voxels.

[Live Site ↗](https://mantravox.pages.dev)

MANTRA Voxel Explorer streams fresh MANTRA Chain blocks, converts them into animated voxel sculptures, and links them together with reactive chain geometry so you can literally watch the ledger grow. Hover and click to inspect blocks and transactions, follow the live camera as it glides toward the head of the chain, and keep tabs on total session gas burned in real time.

## ✨ Highlights

- **Live Cosmos data** – Polls MANTRA RPC + fee market endpoints, tagging each block with proposer, tx payloads, and true gas burn.
- **React Three Fiber scene** – Instanced voxel blocks, neon connectors, and depth-star backgrounds for GPU-friendly visuals.
- **Adaptive camera/UI** – LIVE/FREE camera modes, persistent block detail drawer, and session telemetry kept in sync via Zustand.
- **OpenSpec workflow** – Feature proposals, specs, and archives are tracked in `openspec/` to keep contributions auditable.

## 🧱 Tech Stack

| Layer          | Tools                                          |
| -------------- | ---------------------------------------------- |
| Frontend       | React 19, TypeScript, Vite                     |
| 3D / Rendering | Three.js, React Three Fiber, @react-three/drei |
| State          | Zustand                                        |
| Styling / UI   | Tailwind (via CDN), lucide-react               |
| Data           | MANTRA Chain RPC + Fee Market APIs             |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (or any runtime supported by Vite 6)

### Installation & Local Dev

```bash
git clone https://github.com/mantramatt/mantravox.git
cd mantravox
npm install
npm run dev
```

This will launch Vite's dev server (default: <http://localhost:5173>) with hot-module reloads and live Cosmos polling.

### Production Build

```bash
npm run build
npm run preview
```

The static bundle can be deployed anywhere that serves HTML/JS (Cloudflare Pages runs the public instance at `mantravox.pages.dev`).

## 🗂️ Project Structure

```text
mantravox/
├─ components/         # Scene, voxel block, and UI primitives
├─ services/           # Cosmos + fee market API clients
├─ store/              # Zustand chain store (blocks, camera, telemetry)
├─ openspec/           # Specs, change proposals, archives
├─ public/             # Static assets
├─ vite.config.ts      # Vite + React config
└─ README.md           # You're here
```

## ⚙️ Configuration

The explorer talks to the public MANTRA archive endpoints by default; no secrets are required. If you run your own RPC or tweak polling cadence, wire those overrides into `services/mantraService.ts` or inject env vars via Vite (e.g., `VITE_MANTRA_API_BASE`).

## 🤝 Contributing

Contributions are very welcome! If you'd like to help:

1. **Discuss first** – Open an issue describing the feature or bug so we can scope it together. For larger work, draft an OpenSpec change (see `openspec/AGENTS.md`).
2. **Fork & branch** – Use meaningful branch names (`feature/cinematic-camera`, `fix/gas-panel`).
3. **Keep scope tight** – Follow the existing spec/tasks when they exist; otherwise, document your plan in the PR.
4. **Lint/test** – Run `npm run build` (and any relevant checks) before pushing.
5. **Submit PR** – Reference the issue/spec, describe testing notes, and include screenshots or clips for visual tweaks.

New to the project? Check `openspec/changes` for active proposals and pick up an unassigned task. Pair-programming style contributions or documentation improvements are just as valuable.

## 📜 License

Distributed under the [MIT License](LICENSE). By contributing you agree that your submissions will be licensed under the same terms.

---

Questions, ideas, or show-and-tell clips? Open an issue or ping us on your favorite validator community channel—let's make the voxel frontier even more immersive.
