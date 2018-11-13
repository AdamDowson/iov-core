import { Amount, BaseTx, SignedTransaction, UnsignedTransaction } from "@iov/bcp-types";
import { ChainId } from "@iov/tendermint-types";
import * as codecImpl from "./generated/codecimpl";
export declare function decodeAmount(coin: codecImpl.x.ICoin): Amount;
export declare const parseTx: (tx: codecImpl.app.ITx, chainId: ChainId) => SignedTransaction<UnsignedTransaction>;
export declare function parseMsg(base: BaseTx, tx: codecImpl.app.ITx): UnsignedTransaction;
