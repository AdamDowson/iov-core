/// <reference lib="webworker" />

// A proof-of-work RPC server implementation for the out of process signer.
// This file belongs to the test code but is compiled separately to be usable in a WebWorker.

import { bnsConnector } from "@iov/bns";
import { ethereumConnector } from "@iov/ethereum";
import { Ed25519HdWallet, HdPaths, Secp256k1HdWallet, UserProfile } from "@iov/keycontrol";

import { JsonRpcSigningServer } from "../jsonrpcsigningserver";
import { MultiChainSigner } from "../multichainsigner";
import { SigningServerCore } from "../signingservercore";

const bnsdUrl = "ws://localhost:22345";
const bnsdFaucetMnemonic = "degree tackle suggest window test behind mesh extra cover prepare oak script";
const ethereumUrl = "http://localhost:8545";
const ganacheMnemonic = "oxygen fall sure lava energy veteran enroll frown question detail include maximum";

async function main(): Promise<void> {
  const profile = new UserProfile();
  const ed25519Wallet = profile.addWallet(Ed25519HdWallet.fromMnemonic(bnsdFaucetMnemonic));
  const secp256k1Wallet = profile.addWallet(Secp256k1HdWallet.fromMnemonic(ganacheMnemonic));
  const signer = new MultiChainSigner(profile);

  const bnsdConnection = (await signer.addChain(bnsConnector(bnsdUrl))).connection;
  const bnsdChainId = bnsdConnection.chainId();
  const ethereumConnection = (await signer.addChain(ethereumConnector(ethereumUrl, undefined))).connection;
  const ethereumChainId = ethereumConnection.chainId();

  // faucet identity
  await profile.createIdentity(ed25519Wallet.id, bnsdChainId, HdPaths.simpleAddress(0));
  // ganache second identity
  await profile.createIdentity(secp256k1Wallet.id, ethereumChainId, HdPaths.bip44(60, 0, 0, 1));

  const server = new JsonRpcSigningServer(new SigningServerCore(profile, signer));

  onmessage = async event => {
    // console.log("Received message", JSON.stringify(event));

    // filter out empty {"isTrusted":true} events
    if (!event.data) {
      return;
    }

    const response = await server.handleUnchecked(event.data);
    postMessage(response);
  };
}

main();