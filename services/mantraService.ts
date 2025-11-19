import {
  BlockData,
  BlockResponse,
  Transaction,
  TxSearchResponse,
} from "../types";

const API_BASE = "https://api.archive.mantrachain.io";

interface BlockGasResponse {
  gas: string;
}

interface BaseFeeResponse {
  base_fee: string;
}

export const fetchLatestBlockHeight = async (): Promise<number> => {
  try {
    const res = await fetch(
      `${API_BASE}/cosmos/base/tendermint/v1beta1/blocks/latest`
    );
    if (!res.ok) throw new Error("Failed to fetch latest block");
    const data: BlockResponse = await res.json();
    return parseInt(data.block.header.height, 10);
  } catch (error) {
    console.error("Error fetching latest height:", error);
    throw error;
  }
};

const hydrateTransactions = (txData: TxSearchResponse): Transaction[] => {
  if (!txData.tx_responses || !Array.isArray(txData.tx_responses)) return [];
  return txData.tx_responses.map((tx) => ({
    hash: tx.txhash,
    height: tx.height,
    gasUsed: tx.gas_used ? parseInt(tx.gas_used, 10) : 0,
    gasWanted: tx.gas_wanted ? parseInt(tx.gas_wanted, 10) : 0,
    success: tx.code === 0,
  }));
};

const fetchTransactionsForBlock = async (height: number) => {
  const expressions = [`tx.height=${height}`, `tx.height='${height}'`];

  for (const expr of expressions) {
    let paginationKey: string | null = "";
    const transactions: Transaction[] = [];

    try {
      do {
        const params = new URLSearchParams();
        params.append("query", expr);
        params.set("pagination.limit", "200");
        if (paginationKey) params.set("pagination.key", paginationKey);

        const url = `${API_BASE}/cosmos/tx/v1beta1/txs?${params.toString()}`;
        const txRes = await fetch(url);
        if (!txRes.ok) {
          console.warn(`Failed tx query ${url}: ${txRes.status}`);
          break;
        }

        const txData: TxSearchResponse = await txRes.json();
        transactions.push(...hydrateTransactions(txData));
        paginationKey = txData.pagination?.next_key ?? null;
      } while (paginationKey);

      if (transactions.length > 0) {
        return transactions;
      }
    } catch (err) {
      console.warn(`Error fetching txs for block ${height} using ${expr}`, err);
    }
  }

  return [];
};

export const fetchBlockDetails = async (height: number): Promise<BlockData> => {
  try {
    // 1. Fetch Block Metadata
    const blockRes = await fetch(
      `${API_BASE}/cosmos/base/tendermint/v1beta1/blocks/${height}`
    );
    if (!blockRes.ok) throw new Error(`Failed to fetch block ${height}`);
    const blockData: BlockResponse = await blockRes.json();

    const rawTxs = blockData.block.data.txs || [];
    const txCount = rawTxs.length;
    let transactions: Transaction[] = [];

    // 2. Fetch Transactions if present
    if (txCount > 0) {
      const txDetails = await fetchTransactionsForBlock(height);
      if (txDetails.length > 0) {
        transactions = txDetails;
      } else {
        console.warn(`No tx details available for block ${height}`);
      }
    }

    return {
      height: parseInt(blockData.block.header.height, 10),
      hash: blockData.block_id.hash,
      time: blockData.block.header.time,
      proposer: blockData.block.header.proposer_address,
      txCount,
      txs: transactions,
    };
  } catch (error) {
    console.error(`Error processing block ${height}:`, error);
    // Return a partial block if full fetch fails, to keep the chain visual intact
    return {
      height,
      hash: "ERROR_FETCHING",
      time: new Date().toISOString(),
      proposer: "UNKNOWN",
      txCount: 0,
      txs: [],
    };
  }
};

export const fetchBlockGas = async (height: number): Promise<number> => {
  try {
    const res = await fetch(
      `${API_BASE}/cosmos/evm/feemarket/v1/block_gas?tx.height=${height}`
    );
    if (!res.ok) throw new Error(`Failed to fetch block gas for ${height}`);
    const data: BlockGasResponse = await res.json();
    return parseFloat(data.gas ?? "0") || 0;
  } catch (error) {
    console.warn(`Block gas request failed for height ${height}`, error);
    return 0;
  }
};

export const fetchBaseFee = async (): Promise<number> => {
  try {
    const res = await fetch(`${API_BASE}/cosmos/evm/feemarket/v1/base_fee`);
    if (!res.ok) throw new Error("Failed to fetch base fee");
    const data: BaseFeeResponse = await res.json();
    return parseFloat(data.base_fee ?? "0") || 0;
  } catch (error) {
    console.warn("Base fee request failed", error);
    return 0;
  }
};
