import { As } from "type-tagger";
import { PrehashType, SignableBytes } from "@iov/bcp-types";
import { Slip10RawIndex } from "@iov/crypto";
import { ValueAndUpdates } from "@iov/stream";
import { ChainId, PublicKeyBundle, SignatureBytes } from "@iov/tendermint-types";
import { Ed25519Wallet } from "./wallets";
export declare type KeyringSerializationString = string & As<"keyring-serialization">;
export declare type WalletImplementationIdString = string & As<"wallet-implementation-id">;
export declare type WalletSerializationString = string & As<"wallet-serialization">;
export declare type LocalIdentityId = string & As<"local-identity-id">;
export declare type WalletId = string & As<"wallet-id">;
export interface PublicIdentity {
    readonly pubkey: PublicKeyBundle;
}
export interface LocalIdentity extends PublicIdentity {
    readonly id: LocalIdentityId;
    readonly label?: string;
}
export declare type WalletDeserializer = (data: WalletSerializationString) => Wallet;
/**
 * A collection of wallets
 */
export declare class Keyring {
    static registerWalletType(implementationId: WalletImplementationIdString, deserializer: WalletDeserializer): void;
    private static readonly deserializationRegistry;
    private static deserializeWallet;
    private readonly wallets;
    constructor(data?: KeyringSerializationString);
    add(wallet: Wallet): void;
    getEntries(): ReadonlyArray<Wallet>;
    getEntryById(id: string): Wallet | undefined;
    getEntryByIndex(n: number): Wallet | undefined;
    serialize(): KeyringSerializationString;
    clone(): Keyring;
}
/**
 * A is a generic interface for managing a set of keys and signing
 * data with them.
 *
 * A Wallet is responsible for storing private keys securely and
 * signing with them. Wallet can be implemented in software or as
 * a bridge to a hardware wallet.
 */
export interface Wallet {
    readonly label: ValueAndUpdates<string | undefined>;
    readonly id: WalletId;
    readonly setLabel: (label: string | undefined) => void;
    readonly createIdentity: (options: Ed25519Wallet | ReadonlyArray<Slip10RawIndex> | number) => Promise<LocalIdentity>;
    readonly setIdentityLabel: (identity: PublicIdentity, label: string | undefined) => void;
    readonly getIdentities: () => ReadonlyArray<LocalIdentity>;
    readonly canSign: ValueAndUpdates<boolean>;
    readonly implementationId: WalletImplementationIdString;
    readonly createTransactionSignature: (identity: PublicIdentity, transactionBytes: SignableBytes, prehash: PrehashType, chainId: ChainId) => Promise<SignatureBytes>;
    readonly serialize: () => WalletSerializationString;
    readonly clone: () => Wallet;
}
