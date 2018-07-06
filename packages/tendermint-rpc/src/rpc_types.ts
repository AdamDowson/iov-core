export type RpcId = string;

// Base64String is just a note that the string should be base64 encoded bytes
export type Base64String = string;
export type HexString = string;

// these are strings with certains meanings that can be parsed
export type IpPort = string;
export type DateTimeString = string;

export interface JsonRpc {
  readonly jsonrpc: "2.0";
  readonly id: RpcId;
}

export type JsonRpcResponse = JsonRpcSuccess | JsonRpcError;

export interface JsonRpcSuccess extends JsonRpc {
  readonly result: Result;
}

export interface JsonRpcError extends JsonRpc {
  readonly error: {
    readonly code: number;
    readonly message: string;
    readonly data?: string;
  };
}

// union type of all possible methods?
export const enum Method {
  ABCI_INFO = "abci_info",
  ABCI_QUERY = "abci_query",
  BLOCK = "block",
  BLOCKCHAIN = "blockchain",
  BLOCK_RESULTS = "block_results",
  BROADCAST_TX_ASYNC = "broadcast_tx_async",
  BROADCAST_TX_SYNC = "broadcast_tx_sync",
  BROADCAST_TX_COMMIT = "broadcast_tx_commit",
  COMMIT = "commit",
  GENESIS = "genesis",
  HEALTH = "health",
  STATUS = "status",
  TX = "tx",
  TX_SEARCH = "tx_search",
  VALIDATORS = "validators",
  // TODO: subscribe, unsubscribe, random commands
}

/***** queries *****/

export type JsonRpcQuery =
  | AbciInfoQuery
  | AbciQueryQuery
  | BlockQuery
  | BlockchainQuery
  | BlockResultsQuery
  | BroadcastTxQuery
  | CommitQuery
  | GenesisQuery
  | HealthQuery
  | StatusQuery
  | TxQuery
  | TxSearchQuery
  | ValidatorsQuery;

export interface AbciInfoQuery extends JsonRpc {
  readonly method: Method.ABCI_INFO;
}

export interface AbciQueryQuery extends JsonRpc {
  readonly method: Method.ABCI_QUERY;
  readonly params: AbciQueryParams;
}
export interface AbciQueryParams {
  readonly path: string;
  readonly data: HexString;
  readonly height?: number;
  readonly trusted?: boolean;
}

export interface BlockQuery extends JsonRpc {
  readonly method: Method.BLOCK;
  readonly params: {
    readonly height?: number;
  };
}

export interface BlockchainQuery extends JsonRpc {
  readonly method: Method.BLOCKCHAIN;
  readonly params: {
    readonly minHeight?: number;
    readonly maxHeight?: number;
  };
}

export interface BlockResultsQuery extends JsonRpc {
  readonly method: Method.BLOCK_RESULTS;
  readonly params: {
    readonly height?: number;
  };
}

export interface BroadcastTxQuery {
  readonly method: Method.BROADCAST_TX_ASYNC | Method.BROADCAST_TX_SYNC | Method.BROADCAST_TX_COMMIT;
  readonly params: {
    readonly tx: Base64String;
  };
}

export interface CommitQuery extends JsonRpc {
  readonly method: Method.COMMIT;
  readonly params: {
    readonly height?: number;
  };
}

export interface GenesisQuery extends JsonRpc {
  readonly method: Method.GENESIS;
}

export interface HealthQuery extends JsonRpc {
  readonly method: Method.HEALTH;
}

export interface StatusQuery extends JsonRpc {
  readonly method: Method.STATUS;
}

export interface TxQuery {
  readonly method: Method.TX;
  readonly params: {
    readonly hash: Base64String;
    readonly prove?: boolean;
  };
}

// TODO: clarify this type
export type QueryString = string;
export interface TxSearchQuery {
  readonly method: Method.TX_SEARCH;
  readonly params: {
    readonly query: QueryString;
    readonly prove?: boolean;
    readonly page?: number;
    readonly per_page?: number;
  };
}

export interface ValidatorsQuery extends JsonRpc {
  readonly method: Method.VALIDATORS;
  readonly params: {
    readonly height?: number;
  };
}

/**** results *****/

export type Result =
  | AbciInfoResult
  | AbciQueryResult
  | BlockResult
  | BlockResultsResult
  | BlockchainResult
  | BroadcastTxAsyncResult
  | BroadcastTxSyncResult
  | BroadcastTxCommitResult
  | CommitResult
  | GenesisResult
  | HealthResult
  | StatusResult
  | TxResult
  | TxSearchResult
  | ValidatorsResult;

export interface AbciInfoResult {
  readonly response: {
    readonly data: string;
    readonly last_block_height: number;
    readonly last_block_app_hash: Base64String;
  };
}

export interface AbciQueryResult {
  readonly response: {
    readonly key: Base64String;
    readonly value: Base64String;
    readonly height: string; // (number encoded as string)
    readonly code: number; // only for errors
    readonly log: string;
  };
}

export interface BlockResult {
  readonly block_meta: BlockMeta;
  readonly block: Block;
}

export interface BlockResultsResult {
  readonly height: number;
  readonly results: ReadonlyArray<TxResponse>;
}

export interface BlockchainResult {
  readonly last_height: number;
  readonly block_metas: ReadonlyArray<BlockMeta>;
}

export type BroadcastTxAsyncResult = BroadcastTxSyncResult;
export interface BroadcastTxSyncResult extends TxResponse {
  readonly hash: HexString;
}

export interface BroadcastTxCommitResult {
  readonly height?: number;
  readonly hash: HexString;
  readonly check_tx: TxResponse;
  readonly deliver_tx?: TxResponse;
}

export interface CommitResult {
  readonly SignedHeader: {
    readonly header: Header;
    readonly commit: Commit;
  };
  readonly canonical: boolean;
}

export interface GenesisResult {
  readonly genesis: Genesis;
}
export interface Genesis {
  readonly genesis_time: DateTimeString;
  readonly chain_id: string; // ChainId;
  readonly consensus_params: ConsensusParams;
  readonly validators: ReadonlyArray<Validator>;
  readonly app_hash: string; // HexString, Base64String??
  readonly app_state: {};
}

export type HealthResult = null;

// status
export interface StatusResult {
  readonly response: StatusResponse;
}
export interface StatusResponse {
  readonly node_info: NodeInfo;
  readonly sync_info: SyncInfo;
  readonly validator_info: ValidatorInfo;
}

export interface TxResult {
  readonly tx: Base64String;
  readonly tx_result: TxResponse;
  readonly height: number;
  readonly index: number;
  readonly hash: HexString;
  readonly proof?: TxProof;
}

export interface TxSearchResult {
  readonly txs: ReadonlyArray<TxResult>;
  readonly total_count: number;
}

export interface ValidatorsResult {
  readonly block_height: number;
  readonly results: ReadonlyArray<ValidatorResponse>;
}

/**** Helper items used above ******/

export interface TxResponse {
  readonly code: number;
  readonly log: string;
  readonly data: Base64String;
  readonly hash: HexString;
}

export interface TxProof {
  readonly Data: Base64String;
  readonly RootHash: HexString;
  readonly Total: number;
  readonly Index: number;
  readonly Proof: {
    readonly aunts: ReadonlyArray<Base64String>;
  };
}

export interface BlockMeta {
  readonly block_id: BlockId;
  readonly header: Header;
}

export interface BlockId {
  readonly hash: HexString;
  readonly parts: {
    readonly total: number;
    readonly hash: HexString;
  };
}

export interface Block {
  readonly header: Header;
  readonly last_commit: Commit;
  readonly data: {
    readonly txs: ReadonlyArray<Base64String>; // TODO: HexString?
  };
  readonly evidence: {
    readonly evidence: ReadonlyArray<Evidence>;
  };
}

// TODO: what is this???
export type Evidence = any;

export interface Commit {
  readonly block_id: BlockId;
  readonly precommits: ReadonlyArray<Precommit>;
}

export const enum VoteType {
  PREVOTE = 1,
  PRECOMMIT = 2,
}

export interface Prevote extends Vote {
  readonly type: VoteType.PREVOTE;
}

export interface Precommit extends Vote {
  readonly type: VoteType.PRECOMMIT;
}

export interface Vote {
  readonly validator_address: HexString;
  readonly validator_index: number;
  readonly height: number;
  readonly round: number;
  readonly timestamp: DateTimeString;
  readonly block_id: BlockId;
  readonly signature: RpcSignature;
}

export interface Header {
  readonly chain_id: string; // ChainId
  readonly height: number;
  readonly time: DateTimeString;
  readonly num_txs: number;
  readonly last_block_id: BlockId;
  readonly total_txs: number;

  // merkle roots for proofs
  readonly app_hash: HexString;
  readonly consensus_hash: HexString;
  readonly data_hash: HexString;
  readonly evidence_hash: HexString;
  readonly last_commit_hash: HexString;
  readonly last_results_hash: HexString;
  readonly validators_hash: HexString;
}

export interface NodeInfo {
  readonly id: HexString;
  readonly listen_addr: IpPort;
  readonly network: string;
  readonly version: string;
  readonly channels: string; // ???
  readonly moniker: string;
  readonly other: ReadonlyArray<string>;
  // [
  //   "amino_version=0.9.9",
  //   "p2p_version=0.5.0",
  //   "consensus_version=v1/0.2.2",
  //   "rpc_version=0.7.0/3",
  //   "tx_index=on",
  //   "rpc_addr=tcp://0.0.0.0:46657"
  // ]
}

export interface SyncInfo {
  readonly latest_block_hash: HexString;
  readonly latest_app_hash: HexString;
  readonly latest_block_height: number;
  readonly latest_block_time: DateTimeString;
  readonly syncing: boolean;
}

// this is in genesis
export interface Validator {
  readonly pub_key: RpcPubKey;
  readonly power: number;
  readonly name: string;
}

// this is in status
export interface ValidatorInfo {
  readonly address: HexString;
  readonly pub_key: RpcPubKey;
  readonly voting_power: number;
}

export interface ValidatorResponse extends ValidatorInfo {
  readonly accum?: number;
}

export interface ConsensusParams {
  readonly block_size_params: BlockSizeParams;
  readonly tx_size_params: TxSizeParams;
  readonly block_gossip_params: BlockGossipParams;
  readonly evidence_params: EvidenceParams;
}

export interface BlockSizeParams {
  readonly max_bytes: number;
  readonly max_txs: number;
  readonly max_gas: number;
}

export interface TxSizeParams {
  readonly max_bytes: number;
  readonly max_gas: number;
}

export interface BlockGossipParams {
  readonly block_part_size_bytes: number;
}

export interface EvidenceParams {
  readonly max_age: number;
}

export interface RpcPubKey {
  readonly type: "AC26791624DE60"; // ed25519 public key
  readonly value: Base64String;
}

export interface RpcSignature {
  readonly type: "6BF5903DA1DB28"; // ed25519 signature
  readonly value: Base64String;
}
