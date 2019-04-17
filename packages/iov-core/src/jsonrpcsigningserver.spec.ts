import {
  Address,
  Algorithm,
  Amount,
  ChainId,
  isConfirmedTransaction,
  isPublicIdentity,
  PublicIdentity,
  PublicKeyBytes,
  SendTransaction,
  TokenTicker,
  TransactionId,
} from "@iov/bcp";
import { bnsCodec, bnsConnector } from "@iov/bns";
import { Ed25519, Random } from "@iov/crypto";
import { Encoding } from "@iov/encoding";
import { ethereumConnector } from "@iov/ethereum";
import { isJsonRpcErrorResponse } from "@iov/jsonrpc";
import { Ed25519HdWallet, HdPaths, Secp256k1HdWallet, UserProfile } from "@iov/keycontrol";
import { firstEvent } from "@iov/stream";

import { MultiChainSigner } from "./multichainsigner";
import { GetIdentitiesAuthorization, SignAndPostAuthorization, SigningServerCore } from "./signingservercore";

const { fromHex } = Encoding;

function pendingWithoutBnsd(): void {
  if (!process.env.BNSD_ENABLED) {
    pending("Set BNSD_ENABLED to enable bnsd-based tests");
  }
}

function pendingWithoutEthereum(): void {
  if (!process.env.ETHEREUM_ENABLED) {
    pending("Set ETHEREUM_ENABLED to enable ethereum-based tests");
  }
}

async function randomBnsAddress(): Promise<Address> {
  const rawKeypair = await Ed25519.makeKeypair(await Random.getBytes(32));
  const randomIdentity: PublicIdentity = {
    chainId: "some-testnet" as ChainId,
    pubkey: {
      algo: Algorithm.Ed25519,
      data: rawKeypair.pubkey as PublicKeyBytes,
    },
  };
  return bnsCodec.identityToAddress(randomIdentity);
}

const bnsdUrl = "ws://localhost:23456";
const bnsdFaucetMnemonic = "degree tackle suggest window test behind mesh extra cover prepare oak script";
const ethereumUrl = "http://localhost:8545";
const ethereumChainId = "ethereum-eip155-5777" as ChainId;
const ganacheMnemonic = "oxygen fall sure lava energy veteran enroll frown question detail include maximum";

const defaultGetIdentitiesCallback: GetIdentitiesAuthorization = async (_, matching) => matching;
const defaultSignAndPostCallback: SignAndPostAuthorization = async (_1, _2) => true;

async function makeBnsEthereumSigningServer(): Promise<JsonRpcSigningServer> {
  const profile = new UserProfile();
  const ed25519Wallet = profile.addWallet(Ed25519HdWallet.fromMnemonic(bnsdFaucetMnemonic));
  const secp256k1Wallet = profile.addWallet(Secp256k1HdWallet.fromMnemonic(ganacheMnemonic));
  const signer = new MultiChainSigner(profile);

  // connect to chains
  const bnsConnection = (await signer.addChain(bnsConnector(bnsdUrl))).connection;
  const ethereumConnection = (await signer.addChain(ethereumConnector(ethereumUrl, {}))).connection;

  // faucet identity
  await profile.createIdentity(ed25519Wallet.id, bnsConnection.chainId(), HdPaths.simpleAddress(0));
  // ganache second identity
  await profile.createIdentity(secp256k1Wallet.id, ethereumConnection.chainId(), HdPaths.bip44(60, 0, 0, 1));

  const core = new SigningServerCore(
    profile,
    signer,
    defaultGetIdentitiesCallback,
    defaultSignAndPostCallback,
  );
  return new JsonRpcSigningServer(core);
}

import { JsonRpcSigningServer } from "./jsonrpcsigningserver";

const { fromJson, toJson } = JsonRpcSigningServer;

describe("JsonRpcSigningServer", () => {
  describe("toJson", () => {
    it("works for numbers", () => {
      expect(toJson(0)).toEqual(0);
      expect(toJson(1)).toEqual(1);
      expect(toJson(-1)).toEqual(-1);
      expect(toJson(Number.POSITIVE_INFINITY)).toEqual(Number.POSITIVE_INFINITY);
      expect(toJson(Number.NaN)).toEqual(Number.NaN);
    });

    it("works for booleans", () => {
      expect(toJson(true)).toEqual(true);
      expect(toJson(false)).toEqual(false);
    });

    it("works for null", () => {
      expect(toJson(null)).toEqual(null);
    });

    it("works for arrays", () => {
      expect(toJson([])).toEqual([]);
      expect(toJson([1, 2, 3])).toEqual([1, 2, 3]);
      expect(toJson([1, [2, 3]])).toEqual([1, [2, 3]]);
    });

    it("works for dicts", () => {
      expect(toJson({})).toEqual({});
      expect(toJson({ foo: 1 })).toEqual({ foo: 1 });
      expect(toJson({ foo: 1, bar: 2 })).toEqual({ foo: 1, bar: 2 });
      expect(toJson({ foo: { bar: 1 } })).toEqual({ foo: { bar: 1 } });
    });

    it("fails for unsupported objects", () => {
      expect(() => toJson(() => 0)).toThrowError(/Cannot encode type to JSON/i);
      expect(() => toJson(/[0-9]+/)).toThrowError(/Cannot encode type to JSON/i);
      expect(() => toJson(new Uint32Array())).toThrowError(/Cannot encode type to JSON/i);
      expect(() => toJson(undefined)).toThrowError(/Cannot encode type to JSON/i);
    });

    it("prefixes strings", () => {
      expect(toJson("")).toEqual("string:");
      expect(toJson("abc")).toEqual("string:abc");
      expect(toJson("\0")).toEqual("string:\0");
    });

    it("prefixes and hex encodes Uint8Array", () => {
      expect(toJson(new Uint8Array([]))).toEqual("bytes:");
      expect(toJson(new Uint8Array([0x12]))).toEqual("bytes:12");
      expect(toJson(new Uint8Array([0x12, 0xab]))).toEqual("bytes:12ab");
    });

    // Encoding recursive objects is explicitly undefined behavior. Just use this
    // test to play around.
    xit("fails for recursive objects", () => {
      const a: any = {};
      const b: any = {};
      // tslint:disable-next-line: no-object-mutation
      b.neighbour = a;
      // tslint:disable-next-line: no-object-mutation
      a.neighbour = b;
      expect(() => toJson(a)).toThrowError(/Maximum call stack size exceeded/i);
    });
  });

  describe("fromJson", () => {
    it("works for numbers", () => {
      expect(fromJson(0)).toEqual(0);
      expect(fromJson(1)).toEqual(1);
      expect(fromJson(-1)).toEqual(-1);
      expect(fromJson(Number.POSITIVE_INFINITY)).toEqual(Number.POSITIVE_INFINITY);
      expect(fromJson(Number.NaN)).toEqual(Number.NaN);
    });

    it("works for booleans", () => {
      expect(fromJson(true)).toEqual(true);
      expect(fromJson(false)).toEqual(false);
    });

    it("works for null", () => {
      expect(fromJson(null)).toEqual(null);
    });

    it("works for arrays", () => {
      expect(fromJson([])).toEqual([]);
      expect(fromJson([1, 2, 3])).toEqual([1, 2, 3]);
      expect(fromJson([1, [2, 3]])).toEqual([1, [2, 3]]);
    });

    it("works for dicts", () => {
      expect(fromJson({})).toEqual({});
      expect(fromJson({ foo: 1 })).toEqual({ foo: 1 });
      expect(fromJson({ foo: 1, bar: 2 })).toEqual({ foo: 1, bar: 2 });
      expect(fromJson({ foo: { bar: 1 } })).toEqual({ foo: { bar: 1 } });
    });

    it("works for strings", () => {
      // "string:" prefix
      expect(fromJson("string:")).toEqual("");
      expect(fromJson("string:abc")).toEqual("abc");
      expect(fromJson("string:\0")).toEqual("\0");

      // "bytes:" prefix
      expect(fromJson("bytes:")).toEqual(new Uint8Array([]));
      expect(fromJson("bytes:12")).toEqual(new Uint8Array([0x12]));
      expect(fromJson("bytes:aabb")).toEqual(new Uint8Array([0xaa, 0xbb]));

      // other prefixes
      expect(() => fromJson("")).toThrowError(/Found string with unknown prefix/i);
      expect(() => fromJson("abc")).toThrowError(/Found string with unknown prefix/i);
      expect(() => fromJson("Integer:123")).toThrowError(/Found string with unknown prefix/i);
    });

    it("decodes a full send transaction", () => {
      const original: SendTransaction = {
        kind: "bcp/send",
        creator: {
          chainId: "testchain" as ChainId,
          pubkey: {
            algo: Algorithm.Ed25519,
            data: Encoding.fromHex("aabbccdd") as PublicKeyBytes,
          },
        },
        memo: "Hello hello",
        amount: {
          quantity: "123",
          tokenTicker: "CASH" as TokenTicker,
          fractionalDigits: 2,
        },
        recipient: "aabbcc" as Address,
        fee: {
          tokens: {
            quantity: "1",
            tokenTicker: "ASH" as TokenTicker,
            fractionalDigits: 2,
          },
        },
      };

      const restored = fromJson(toJson(original));
      expect(restored).toEqual(original);
      expect(isPublicIdentity(restored.creator)).toEqual(true);
    });
  });

  const ganacheSecondIdentity: PublicIdentity = {
    chainId: ethereumChainId,
    pubkey: {
      algo: Algorithm.Secp256k1,
      data: Encoding.fromHex(
        "041d4c015b00cbd914e280b871d3c6ae2a047ca650d3ecea4b5246bb3036d4d74960b7feb09068164d2b82f1c7df9e95839b29ae38e90d60578b2318a54e108cf8",
      ) as PublicKeyBytes,
    },
  };

  const defaultAmount: Amount = {
    quantity: "1",
    fractionalDigits: 9,
    tokenTicker: "CASH" as TokenTicker,
  };

  it("can get bnsd identities", async () => {
    pendingWithoutBnsd();
    pendingWithoutEthereum();

    const bnsConnection = await bnsConnector(bnsdUrl).client();

    const server = await makeBnsEthereumSigningServer();

    const response = await server.handleUnchecked({
      jsonrpc: "2.0",
      id: 123,
      method: "getIdentities",
      params: {
        reason: "Who are you?",
        chainIds: [bnsConnection.chainId()],
      },
    });
    expect(response.id).toEqual(123);
    if (isJsonRpcErrorResponse(response)) {
      throw new Error(`Response must not be an error, but got '${response.error.message}'`);
    }
    const result = JsonRpcSigningServer.fromJson(response.result);
    expect(result).toEqual(jasmine.any(Array));
    expect((result as ReadonlyArray<any>).length).toEqual(1);
    expect(result[0].chainId).toEqual(bnsConnection.chainId());
    expect(result[0].pubkey).toEqual({
      algo: Algorithm.Ed25519,
      data: fromHex("533e376559fa551130e721735af5e7c9fcd8869ddd54519ee779fce5984d7898"),
    });

    server.shutdown();
    bnsConnection.disconnect();
  });

  it("can get ethereum identities", async () => {
    pendingWithoutBnsd();
    pendingWithoutEthereum();

    const server = await makeBnsEthereumSigningServer();

    const response = await server.handleChecked({
      jsonrpc: "2.0",
      id: 123,
      method: "getIdentities",
      params: {
        reason: "Who are you?",
        chainIds: [ethereumChainId],
      },
    });
    expect(response.id).toEqual(123);
    if (isJsonRpcErrorResponse(response)) {
      throw new Error(`Response must not be an error, but got '${response.error.message}'`);
    }
    const result = JsonRpcSigningServer.fromJson(response.result);
    expect(result).toEqual(jasmine.any(Array));
    expect((result as ReadonlyArray<any>).length).toEqual(1);
    expect(result[0]).toEqual(ganacheSecondIdentity);

    server.shutdown();
  });

  it("can get BNS or Ethereum identities", async () => {
    pendingWithoutBnsd();
    pendingWithoutEthereum();

    const bnsConnection = await bnsConnector(bnsdUrl).client();

    const server = await makeBnsEthereumSigningServer();

    const response = await server.handleChecked({
      jsonrpc: "2.0",
      id: 123,
      method: "getIdentities",
      params: {
        reason: "Who are you?",
        chainIds: [ethereumChainId, bnsConnection.chainId()],
      },
    });
    expect(response.id).toEqual(123);
    if (isJsonRpcErrorResponse(response)) {
      throw new Error(`Response must not be an error, but got '${response.error.message}'`);
    }
    const result = JsonRpcSigningServer.fromJson(response.result);
    expect(result).toEqual(jasmine.any(Array));
    expect((result as ReadonlyArray<any>).length).toEqual(2);
    expect(result[0].chainId).toEqual(bnsConnection.chainId());
    expect(result[0].pubkey).toEqual({
      algo: Algorithm.Ed25519,
      data: fromHex("533e376559fa551130e721735af5e7c9fcd8869ddd54519ee779fce5984d7898"),
    });
    expect(result[1]).toEqual(ganacheSecondIdentity);

    server.shutdown();
    bnsConnection.disconnect();
  });

  it("send a signing request to service", async () => {
    pendingWithoutBnsd();
    pendingWithoutEthereum();

    const bnsConnection = await bnsConnector(bnsdUrl).client();

    const server = await makeBnsEthereumSigningServer();

    const identitiesResponse = await server.handleChecked({
      jsonrpc: "2.0",
      id: 1,
      method: "getIdentities",
      params: {
        reason: "Who are you?",
        chainIds: [bnsConnection.chainId()],
      },
    });
    if (isJsonRpcErrorResponse(identitiesResponse)) {
      throw new Error(`Response must not be an error, but got '${identitiesResponse.error.message}'`);
    }
    expect(identitiesResponse.result).toEqual(jasmine.any(Array));
    expect((identitiesResponse.result as ReadonlyArray<any>).length).toEqual(1);
    const signer = JsonRpcSigningServer.fromJson(identitiesResponse.result[0]);
    if (!isPublicIdentity(signer)) {
      throw new Error("Identity element is not valid");
    }

    const send: SendTransaction = {
      kind: "bcp/send",
      creator: signer,
      memo: `Hello ${Math.random()}`,
      amount: defaultAmount,
      recipient: await randomBnsAddress(),
    };

    const signAndPostResponse = await server.handleChecked({
      jsonrpc: "2.0",
      id: 2,
      method: "signAndPost",
      params: {
        reason: "Please sign",
        transaction: JsonRpcSigningServer.toJson(send),
      },
    });
    if (isJsonRpcErrorResponse(signAndPostResponse)) {
      throw new Error(`Response must not be an error, but got '${signAndPostResponse.error.message}'`);
    }
    const transactionId: TransactionId = JsonRpcSigningServer.fromJson(signAndPostResponse.result);
    expect(transactionId).toMatch(/^[0-9A-F]+$/);

    const result = await firstEvent(bnsConnection.liveTx({ id: transactionId }));
    if (!isConfirmedTransaction(result)) {
      throw new Error("Confirmed transaction extected");
    }
    expect(result.transactionId).toEqual(transactionId);
    expect(result.transaction).toEqual(send);

    server.shutdown();
    bnsConnection.disconnect();
  });
});
