import { As } from "type-tagger";
/**
 * A raw tendermint transaction hash, currently 20 bytes
 */
export declare type TxHash = Uint8Array & As<"tx-hash">;
export declare type IpPortString = string & As<"ipport">;
export interface ValidatorEd25519Pubkey {
    readonly algorithm: "ed25519";
    readonly data: Uint8Array;
}
/**
 * Union type for different possible pubkeys.
 * Currently only Ed25519 supported.
 */
export declare type ValidatorPubkey = ValidatorEd25519Pubkey;
export interface ValidatorEd25519Signature {
    readonly algorithm: "ed25519";
    readonly data: Uint8Array;
}
/**
 * Union type for different possible voting signatures.
 * Currently only Ed25519 supported.
 */
export declare type ValidatorSignature = ValidatorEd25519Signature;
