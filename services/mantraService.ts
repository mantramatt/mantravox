
import { BlockData, BlockResponse, Transaction, TxSearchResponse } from '../types';

const API_BASE = 'https://api.archive.mantrachain.io';

export const fetchLatestBlockHeight = async (): Promise<number> => {
  try {
    const res = await fetch(`${API_BASE}/cosmos/base/tendermint/v1beta1/blocks/latest`);
    if (!res.ok) throw new Error('Failed to fetch latest block');
    const data: BlockResponse = await res.json();
    return parseInt(data.block.header.height, 10);
  } catch (error) {
    console.error('Error fetching latest height:', error);
    throw error;
  }
};

export const fetchBlockDetails = async (height: number): Promise<BlockData> => {
  try {
    // 1. Fetch Block Metadata
    const blockRes = await fetch(`${API_BASE}/cosmos/base/tendermint/v1beta1/blocks/${height}`);
    if (!blockRes.ok) throw new Error(`Failed to fetch block ${height}`);
    const blockData: BlockResponse = await blockRes.json();
    
    const rawTxs = blockData.block.data.txs || [];
    const txCount = rawTxs.length;
    let transactions: Transaction[] = [];

    // 2. Fetch Transactions if present
    if (txCount > 0) {
        try {
            // Use standard Cosmos SDK query format. Note: some nodes strictly require quotes for values.
            const txRes = await fetch(`${API_BASE}/cosmos/tx/v1beta1/txs?events=tx.height='${height}'`);
            
            if (txRes.ok) {
                const txData: TxSearchResponse = await txRes.json();
                if (txData.tx_responses && Array.isArray(txData.tx_responses)) {
                    transactions = txData.tx_responses.map(tx => ({
                        hash: tx.txhash,
                        height: tx.height,
                        // Gas is returned as string in Cosmos SDK
                        gasUsed: tx.gas_used ? parseInt(tx.gas_used, 10) : 0,
                        gasWanted: tx.gas_wanted ? parseInt(tx.gas_wanted, 10) : 0,
                        success: tx.code === 0
                    }));
                }
            } else {
                console.warn(`Failed to fetch txs for block ${height}: ${txRes.status}`);
            }
        } catch (err) {
            console.warn("Error fetching transactions detail:", err);
            // Continue without detailed txs, allowing the block to render with ghosts
        }
    }

    return {
      height: parseInt(blockData.block.header.height, 10),
      hash: blockData.block_id.hash,
      time: blockData.block.header.time,
      proposer: blockData.block.header.proposer_address,
      txCount,
      txs: transactions
    };
  } catch (error) {
    console.error(`Error processing block ${height}:`, error);
    // Return a partial block if full fetch fails, to keep the chain visual intact
    return {
        height,
        hash: 'ERROR_FETCHING',
        time: new Date().toISOString(),
        proposer: 'UNKNOWN',
        txCount: 0,
        txs: []
    };
  }
};
