
export interface Transaction {
  hash: string;
  height: string;
  gasUsed: number;
  gasWanted: number;
  success: boolean;
}

export interface BlockData {
  height: number;
  hash: string;
  time: string;
  proposer: string;
  txs: Transaction[];
  txCount: number;
}

export interface BlockResponse {
  block_id: {
    hash: string;
  };
  block: {
    header: {
      height: string;
      time: string;
      proposer_address: string;
    };
    data: {
      txs: string[]; // Base64 encoded txs
    };
  };
}

export interface TxResponse {
  height: string;
  txhash: string;
  gas_wanted: string;
  gas_used: string;
  code: number; // 0 is success
  timestamp?: string;
}

export interface TxSearchResponse {
  tx_responses: TxResponse[];
  pagination: {
    next_key: string | null;
    total: string;
  };
}

export enum CameraMode {
  LIVE = 'LIVE',
  FREE = 'FREE',
}
