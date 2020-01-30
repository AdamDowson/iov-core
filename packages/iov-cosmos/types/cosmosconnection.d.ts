import {
  Account,
  AccountQuery,
  AddressQuery,
  BlockchainConnection,
  BlockHeader,
  ChainId,
  ConfirmedAndSignedTransaction,
  ConfirmedTransaction,
  FailedTransaction,
  Fee,
  Nonce,
  PostableBytes,
  PostTxResponse,
  PubkeyQuery,
  Token,
  TokenTicker,
  TransactionId,
  TransactionQuery,
  UnsignedTransaction,
} from "@iov/bcp";
import { Stream } from "xstream";
export declare class CosmosConnection implements BlockchainConnection {
  static establish(url: string): Promise<CosmosConnection>;
  readonly chainId: ChainId;
  private readonly restClient;
  private readonly primaryToken;
  private readonly supportedTokens;
  private get prefix();
  private constructor();
  disconnect(): void;
  height(): Promise<number>;
  getToken(searchTicker: TokenTicker): Promise<Token | undefined>;
  getAllTokens(): Promise<readonly Token[]>;
  getAccount(query: AccountQuery): Promise<Account | undefined>;
  watchAccount(_account: AccountQuery): Stream<Account | undefined>;
  getNonce(query: AddressQuery | PubkeyQuery): Promise<Nonce>;
  getNonces(query: AddressQuery | PubkeyQuery, count: number): Promise<readonly Nonce[]>;
  getBlockHeader(height: number): Promise<BlockHeader>;
  watchBlockHeaders(): Stream<BlockHeader>;
  getTx(id: TransactionId): Promise<ConfirmedAndSignedTransaction<UnsignedTransaction> | FailedTransaction>;
  postTx(tx: PostableBytes): Promise<PostTxResponse>;
  searchTx(
    query: TransactionQuery,
  ): Promise<readonly (ConfirmedTransaction<UnsignedTransaction> | FailedTransaction)[]>;
  listenTx(_query: TransactionQuery): Stream<ConfirmedTransaction<UnsignedTransaction> | FailedTransaction>;
  liveTx(_query: TransactionQuery): Stream<ConfirmedTransaction<UnsignedTransaction> | FailedTransaction>;
  getFeeQuote(tx: UnsignedTransaction): Promise<Fee>;
  withDefaultFee<T extends UnsignedTransaction>(tx: T): Promise<T>;
  private parseAndPopulateTxResponse;
}
