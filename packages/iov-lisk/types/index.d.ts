export { liskCodec } from "./liskcodec";
export { generateNonce, LiskConnection } from "./liskconnection";
export { createLiskConnector } from "./liskconnector";
import { Derivation } from "./derivation";
/**
 * Lisk-specific passphrase to Ed25519 keypair derivation
 *
 * "passphrase" is Lisk's word for an autogenerated 12 word english BIP39 mnemonic
 * encoded as a string. Since the BIP39 property is not used for anything but validation
 * in the user interface we work with plain strings here.
 */
export declare const passphraseToKeypair: typeof Derivation.passphraseToKeypair;
