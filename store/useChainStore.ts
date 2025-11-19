import { create } from "zustand";
import { BlockData, CameraMode } from "../types";
import {
  fetchBlockDetails,
  fetchLatestBlockHeight,
  fetchBlockGas,
  fetchBaseFee,
} from "../services/mantraService";

interface ChainState {
  blocks: BlockData[];
  latestKnownHeight: number;
  isLoading: boolean;
  cameraMode: CameraMode;
  selectedObject: { type: "block" | "tx"; data: any } | null;
  sessionGasBurned: number;
  gasPrice: number;

  // Actions
  init: () => Promise<void>;
  poll: () => Promise<void>;
  loadOlderBlocks: () => Promise<void>;
  setCameraMode: (mode: CameraMode) => void;
  selectObject: (obj: { type: "block" | "tx"; data: any } | null) => void;
}

export const useChainStore = create<ChainState>((set, get) => ({
  blocks: [],
  latestKnownHeight: 0,
  isLoading: false,
  cameraMode: CameraMode.LIVE,
  selectedObject: null,
  sessionGasBurned: 0,
  gasPrice: 0,

  init: async () => {
    set({ isLoading: true });
    try {
      const height = await fetchLatestBlockHeight();
      const initialBatchSize = 10;

      // Fetch last N blocks
      const promises = [];
      for (let h = height; h > height - initialBatchSize; h--) {
        promises.push(fetchBlockDetails(h));
      }

      const results = await Promise.all(promises);
      // Sort ascending (old -> new)
      const sorted = results
        .sort((a, b) => a.height - b.height)
        .map((block) => ({
          ...block,
          justArrived: false,
        }));
      const baseFee = await fetchBaseFee();
      const blockGasSamples = await Promise.all(
        sorted.map((block) => fetchBlockGas(block.height))
      );
      const initialGas = blockGasSamples.reduce(
        (acc, gas) => acc + gas * baseFee,
        0
      );

      set({
        latestKnownHeight: height,
        blocks: sorted,
        isLoading: false,
        sessionGasBurned: initialGas,
        gasPrice: baseFee,
      });
    } catch (e) {
      console.error("Init failed", e);
      set({ isLoading: false });
    }
  },

  poll: async () => {
    const { latestKnownHeight, blocks, cameraMode } = get();

    try {
      const currentNetworkHeight = await fetchLatestBlockHeight();

      if (currentNetworkHeight > latestKnownHeight) {
        const newBlocks: BlockData[] = [];
        // Fetch gaps
        for (let h = latestKnownHeight + 1; h <= currentNetworkHeight; h++) {
          // Limit catch-up to avoid flooding
          if (h > latestKnownHeight + 5) break;
          const b = await fetchBlockDetails(h);
          newBlocks.push({ ...b, justArrived: true });
        }

        if (newBlocks.length > 0) {
          const updatedBlocks = [
            ...blocks.map((b) => ({ ...b, justArrived: false })),
            ...newBlocks,
          ];
          // Keep window size reasonable (e.g., 50 blocks) to prevent memory leak in WebGL
          const MAX_BLOCKS = 50;
          const trimmedBlocks = updatedBlocks.slice(
            Math.max(0, updatedBlocks.length - MAX_BLOCKS)
          );

          const baseFee = await fetchBaseFee();
          const feeToUse = baseFee || get().gasPrice;
          const blockGasSamples = await Promise.all(
            newBlocks.map((block) => fetchBlockGas(block.height))
          );
          const newGas = blockGasSamples.reduce(
            (acc, gas) => acc + gas * feeToUse,
            0
          );

          set({
            latestKnownHeight: currentNetworkHeight,
            blocks: trimmedBlocks,
            sessionGasBurned: get().sessionGasBurned + newGas,
            gasPrice: feeToUse,
          });
        }
      }
    } catch (e) {
      // Silent fail on poll
    }
  },

  loadOlderBlocks: async () => {
    const { blocks, isLoading } = get();
    if (isLoading || blocks.length === 0) return;

    set({ isLoading: true });
    const oldestHeight = blocks[0].height;
    const batchSize = 10;
    const promises = [];

    for (
      let h = oldestHeight - 1;
      h >= Math.max(1, oldestHeight - batchSize);
      h--
    ) {
      promises.push(fetchBlockDetails(h));
    }

    const olderBlocks = await Promise.all(promises);
    const sortedOlder = olderBlocks
      .sort((a, b) => a.height - b.height)
      .map((block) => ({
        ...block,
        justArrived: false,
      }));

    set({
      blocks: [...sortedOlder, ...blocks],
      isLoading: false,
    });
  },

  setCameraMode: (mode) => set({ cameraMode: mode }),
  selectObject: (obj) => set({ selectedObject: obj }),
}));
