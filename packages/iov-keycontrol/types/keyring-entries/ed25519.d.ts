import { PrehashType, SignableBytes } from "@iov/bcp-types";
import { ValueAndUpdates } from "@iov/stream";
import { ChainId, SignatureBytes } from "@iov/tendermint-types";
import { LocalIdentity, PublicIdentity, Wallet, WalletId, WalletImplementationIdString, WalletSerializationString } from "../keyring";
export declare class Ed25519Wallet implements Wallet {
    private static readonly idsPrng;
    private static generateId;
    private static identityId;
    private static algorithmFromString;
    readonly label: ValueAndUpdates<string | undefined>;
    readonly canSign: ValueAndUpdates<boolean>;
    readonly implementationId: WalletImplementationIdString;
    readonly id: WalletId;
    private readonly identities;
    private readonly privkeys;
    private readonly labelProducer;
    constructor(data?: WalletSerializationString);
    setLabel(label: string | undefined): void;
    createIdentity(options: unknown): Promise<LocalIdentity>;
    setIdentityLabel(identity: PublicIdentity, label: string | undefined): void;
    getIdentities(): ReadonlyArray<LocalIdentity>;
    createTransactionSignature(identity: PublicIdentity, transactionBytes: SignableBytes, prehashType: PrehashType, _: ChainId): Promise<SignatureBytes>;
    serialize(): WalletSerializationString;
    clone(): Ed25519Wallet;
    private privateKeyForIdentity;
    private buildLocalIdentity;
}
