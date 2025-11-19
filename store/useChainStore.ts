import { create } from 'zustand';
import { BlockData, CameraMode } from '../types';
import { fetchBlockDetails, fetchLatestBlockHeight } from '../services/mantraService';

interface ChainState {
  blocks: BlockData[];
  latestKnownHeight: number;
  isLoading: boolean;
  cameraMode: CameraMode;
  selectedObject: { type: 'block' | 'tx'; data: any } | null;
  sessionGasBurned: number;
  
  // Actions
  init: () => Promise<void>;
  poll: () => Promise<void>;
  loadOlderBlocks: () => Promise<void>;
  setCameraMode: (mode: CameraMode) => void;
  selectObject: (obj: { type: 'block' | 'tx'; data: any } | null) => void;
}

export const useChainStore = create<ChainState>((set, get) => ({
  blocks: [],
  latestKnownHeight: 0,
  isLoading: false,
  cameraMode: CameraMode.LIVE,
  selectedObject: null,
  sessionGasBurned: 0,

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
      const sorted = results.sort((a, b) => a.height - b.height);

      // Calculate initial gas burned from the loaded batch
      const initialGas = sorted.reduce((acc, block) => {
        const blockGas = block.txs ? block.txs.reduce((tAcc, tx) => tAcc + tx.gasUsed, 0) : 0;
        return acc + blockGas;
      }, 0);
      
      set({ 
        latestKnownHeight: height, 
        blocks: sorted,
        isLoading: false,
        sessionGasBurned: initialGas
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
           newBlocks.push(b);
        }

        if (newBlocks.length > 0) {
            const updatedBlocks = [...blocks, ...newBlocks];
            // Keep window size reasonable (e.g., 50 blocks) to prevent memory leak in WebGL
            const MAX_BLOCKS = 50;
            const trimmedBlocks = updatedBlocks.slice(Math.max(0, updatedBlocks.length - MAX_BLOCKS));

            // Calculate gas from new blocks
            const newGas = newBlocks.reduce((acc, block) => {
                const blockGas = block.txs ? block.txs.reduce((tAcc, tx) => tAcc + tx.gasUsed, 0) : 0;
                return acc + blockGas;
            }, 0);
            
            set({ 
                latestKnownHeight: currentNetworkHeight,
                blocks: trimmedBlocks,
                sessionGasBurned: get().sessionGasBurned + newGas
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
    
    for (let h = oldestHeight - 1; h >= Math.max(1, oldestHeight - batchSize); h--) {
        promises.push(fetchBlockDetails(h));
    }
    
    const olderBlocks = await Promise.all(promises);
    const sortedOlder = olderBlocks.sort((a, b) => a.height - b.height);
    
    set({
        blocks: [...sortedOlder, ...blocks],
        isLoading: false
    });
  },

  setCameraMode: (mode) => set({ cameraMode: mode }),
  selectObject: (obj) => set({ selectedObject: obj }),
}));