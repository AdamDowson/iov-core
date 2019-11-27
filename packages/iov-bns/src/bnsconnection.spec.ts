import {
  Address,
  Algorithm,
  Amount,
  ChainId,
  Identity,
  isBlockInfoPending,
  Nonce,
  PubkeyBundle,
  PubkeyBytes,
  SendTransaction,
  TokenTicker,
  UnsignedTransaction,
  WithCreator,
} from "@iov/bcp";
import { Random } from "@iov/crypto";
import { Encoding } from "@iov/encoding";
import { Ed25519HdWallet, HdPaths, UserProfile, WalletId } from "@iov/keycontrol";
import { toListPromise } from "@iov/stream";

import { bnsCodec } from "./bnscodec";
import { BnsConnection } from "./bnsconnection";
import { ActionKind, CreateProposalTx, CreateTextResolutionAction, RegisterUsernameTx } from "./types";
import { encodeBnsAddress, identityToAddress } from "./util";

const { fromHex } = Encoding;

function pendingWithoutBnsd(): void {
  if (!process.env.BNSD_ENABLED) {
    pending("Set BNSD_ENABLED to enable bnsd-based tests");
  }
}

async function randomBnsAddress(): Promise<Address> {
  return encodeBnsAddress("tiov", Random.getBytes(20));
}

const bash = "BASH" as TokenTicker;
const cash = "CASH" as TokenTicker;
const blockTime = 1000;

fdescribe("BnsConnection (basic class methods)", () => {
  const defaultAmount: Amount = {
    quantity: "1000000001",
    fractionalDigits: 9,
    tokenTicker: cash,
  };

  // this is enough money in an account that registers names... twice the cost of one name registration product fee
  const registerAmount: Amount = {
    quantity: "10000000000",
    fractionalDigits: 9,
    tokenTicker: cash,
  };

  // Generated using https://github.com/nym-zone/bech32
  // bech32 -e -h tiov 010101020202030303040404050505050A0A0A0A
  const unusedAddress = "tiov1qyqszqszqgpsxqcyqszq2pg9q59q5zs2fx9n6s" as Address;

  const unusedPubkey: PubkeyBundle = {
    algo: Algorithm.Ed25519,
    data: fromHex("bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb") as PubkeyBytes,
  };

  // Dev faucet
  // path: m/1229936198'/1'/0'/0'
  // pubkey: e05f47e7639b47625c23738e2e46d092819abd6039c5fc550d9aa37f1a2556a1
  // IOV address: tiov1q5lyl7asgr2dcweqrhlfyexqpkgcuzrm4e0cku
  // This account has money in the genesis file (see scripts/bnsd/README.md).
  const faucetMnemonic = "degree tackle suggest window test behind mesh extra cover prepare oak script";
  const faucetPath = HdPaths.iovFaucet();
  // Dev admin
  // path: m/44'/234'/0'
  // pubkey: 418f88ff4876d33a3d6e2a17d0fe0e78dc3cb5e4b42c6c156ed1b8bfce5d46d1
  // IOV address: tiov15nuhg3l8ma2mdmcdvgy7hme20v3xy5mkxcezea
  // Same mnemonic as faucet.
  // This account has money in the genesis file (see scripts/bnsd/README.md).
  const adminPath = HdPaths.iov(0);

  const bnsdTendermintUrl = "ws://localhost:23456";
  const bnsdTendermintHttpUrl = "http://localhost:23456";

  async function userProfileWithFaucet(
    chainId: ChainId,
  ): Promise<{
    readonly profile: UserProfile;
    readonly walletId: WalletId;
    readonly faucet: Identity;
    readonly admin: Identity;
  }> {
    const profile = new UserProfile();
    const wallet = profile.addWallet(Ed25519HdWallet.fromMnemonic(faucetMnemonic));
    const faucet = await profile.createIdentity(wallet.id, chainId, faucetPath);
    const admin = await profile.createIdentity(wallet.id, chainId, adminPath);
    return { profile: profile, walletId: wallet.id, faucet: faucet, admin: admin };
  }

  async function ensureNonceNonZero(
    connection: BnsConnection,
    profile: UserProfile,
    identity: Identity,
  ): Promise<void> {
    const sendTx = await connection.withDefaultFee<SendTransaction & WithCreator>({
      kind: "bcp/send",
      creator: identity,
      sender: bnsCodec.identityToAddress(identity),
      recipient: await randomBnsAddress(),
      amount: defaultAmount,
    });
    const nonce = await connection.getNonce({ pubkey: identity.pubkey });
    const signed = await profile.signTransaction(sendTx, bnsCodec, nonce);
    const response = await connection.postTx(bnsCodec.bytesToPost(signed));
    await response.blockInfo.waitFor(info => !isBlockInfoPending(info));
  }

  async function sendTokensFromFaucet(
    connection: BnsConnection,
    recipient: Address,
    amount: Amount = defaultAmount,
  ): Promise<void> {
    const { profile, faucet } = await userProfileWithFaucet(connection.chainId());

    const sendTx = await connection.withDefaultFee<SendTransaction & WithCreator>({
      kind: "bcp/send",
      creator: faucet,
      sender: bnsCodec.identityToAddress(faucet),
      recipient: recipient,
      amount: amount,
    });
    const nonce = await connection.getNonce({ pubkey: faucet.pubkey });
    const signed = await profile.signTransaction(sendTx, bnsCodec, nonce);
    const response = await connection.postTx(bnsCodec.bytesToPost(signed));
    await response.blockInfo.waitFor(info => !isBlockInfoPending(info));
  }

  it("can connect to tendermint via WS", async () => {
    pendingWithoutBnsd();
    const connection = await BnsConnection.establish(bnsdTendermintUrl);

    const chainId = await connection.chainId();
    expect(chainId).toMatch(/^[a-zA-Z0-9-]{7,25}$/);

    const height = await connection.height();
    expect(height).toBeGreaterThan(1);

    connection.disconnect();
  });

  it("can connect to tendermint via HTTP", async () => {
    pendingWithoutBnsd();
    const connection = await BnsConnection.establish(bnsdTendermintHttpUrl);

    const chainId = await connection.chainId();
    expect(chainId).toMatch(/^[a-zA-Z0-9-]{7,25}$/);

    const height = await connection.height();
    expect(height).toBeGreaterThan(1);

    connection.disconnect();
  });

  describe("getToken", () => {
    it("can get existing token", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);

      const token = await connection.getToken("MASH" as TokenTicker);
      expect(token).toEqual({
        tokenTicker: "MASH" as TokenTicker,
        tokenName: "The mashed coin",
        fractionalDigits: 9,
      });

      connection.disconnect();
    });

    it("produces empty result for non-existing token", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);

      const token = await connection.getToken("ETH" as TokenTicker);
      expect(token).toBeUndefined();

      connection.disconnect();
    });
  });

  describe("getAllTokens", () => {
    it("can query all tokens", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);

      const tokens = await connection.getAllTokens();
      expect(tokens).toEqual([
        {
          tokenTicker: "BASH" as TokenTicker,
          tokenName: "Another token of this chain",
          fractionalDigits: 9,
        },
        {
          tokenTicker: "CASH" as TokenTicker,
          tokenName: "Main token of this chain",
          fractionalDigits: 9,
        },
        {
          tokenTicker: "MASH" as TokenTicker,
          tokenName: "The mashed coin",
          fractionalDigits: 9,
        },
      ]);

      connection.disconnect();
    });
  });

  describe("getAccount", () => {
    it("can get account by address and pubkey", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);
      const { profile, faucet } = await userProfileWithFaucet(connection.chainId());
      await ensureNonceNonZero(connection, profile, faucet);
      const faucetAddress = identityToAddress(faucet);

      // can get the faucet by address (there is money)
      const responseFromAddress = await connection.getAccount({ address: faucetAddress });
      expect(responseFromAddress).toBeDefined();
      {
        const account = responseFromAddress!;
        expect(account.address).toEqual(faucetAddress);
        expect(account.pubkey).toEqual(faucet.pubkey);
        expect(account.balance.length).toEqual(2);
        const bashAccount = account.balance.find(({ tokenTicker }) => tokenTicker === bash);
        expect(bashAccount).toBeDefined();
        expect(Number.parseInt(bashAccount!.quantity, 10)).toBeGreaterThan(990000_000000000);
        const cashAccount = account.balance.find(({ tokenTicker }) => tokenTicker === cash);
        expect(cashAccount).toBeDefined();
        expect(Number.parseInt(cashAccount!.quantity, 10)).toBeGreaterThan(990000_000000000);
      }

      // can get the faucet by publicKey, same result
      const responseFromPubkey = await connection.getAccount({ pubkey: faucet.pubkey });
      expect(responseFromPubkey).toBeDefined();
      {
        const account = responseFromPubkey!;
        expect(account.address).toEqual(faucetAddress);
        expect(account.pubkey).toEqual(faucet.pubkey);
        expect(account.balance.length).toEqual(2);
        const bashAccount = account.balance.find(({ tokenTicker }) => tokenTicker === bash);
        expect(bashAccount).toBeDefined();
        expect(Number.parseInt(bashAccount!.quantity, 10)).toBeGreaterThan(990000_000000000);
        const cashAccount = account.balance.find(({ tokenTicker }) => tokenTicker === cash);
        expect(cashAccount).toBeDefined();
        expect(Number.parseInt(cashAccount!.quantity, 10)).toBeGreaterThan(990000_000000000);
      }

      connection.disconnect();
    });

    it("returns empty pubkey and name when getting an account with no outgoing transactions", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);
      const newAddress = await randomBnsAddress();
      await sendTokensFromFaucet(connection, newAddress);

      const response = await connection.getAccount({ address: newAddress });
      expect(response).toBeDefined();
      {
        const account = response!;
        expect(account.address).toEqual(newAddress);
        expect(account.pubkey).toBeUndefined();
      }

      connection.disconnect();
    });

    it("returns empty list when getting an unused account", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);

      // by address
      const response1 = await connection.getAccount({ address: unusedAddress });
      expect(response1).toBeUndefined();

      // by pubkey
      const response2 = await connection.getAccount({ pubkey: unusedPubkey });
      expect(response2).toBeUndefined();

      connection.disconnect();
    });
  });

  describe("getNonce", () => {
    it("can query empty nonce from unused account by address and pubkey", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);

      // by address
      const nonce1 = await connection.getNonce({ address: unusedAddress });
      expect(nonce1).toEqual(0 as Nonce);

      // by pubkey
      const nonce2 = await connection.getNonce({ pubkey: unusedPubkey });
      expect(nonce2).toEqual(0 as Nonce);

      connection.disconnect();
    });

    it("can query nonce from faucet by address and pubkey", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);
      const { profile, faucet } = await userProfileWithFaucet(connection.chainId());
      await ensureNonceNonZero(connection, profile, faucet);

      // by address
      const faucetAddress = identityToAddress(faucet);
      const nonce1 = await connection.getNonce({ address: faucetAddress });
      expect(nonce1).toBeGreaterThan(0);

      // by pubkey
      const nonce2 = await connection.getNonce({ pubkey: faucet.pubkey });
      expect(nonce2).toBeGreaterThan(0);

      connection.disconnect();
    });
  });

  describe("getNonces", () => {
    it("can get 0/1/2 nonces", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);
      const { faucet } = await userProfileWithFaucet(connection.chainId());
      const faucetAddress = identityToAddress(faucet);

      // by address, 0 nonces
      {
        const nonces = await connection.getNonces({ address: faucetAddress }, 0);
        expect(nonces.length).toEqual(0);
      }

      // by address, 1 nonces
      {
        const nonces = await connection.getNonces({ address: faucetAddress }, 1);
        expect(nonces.length).toEqual(1);
      }

      // by address, 2 nonces
      {
        const nonces = await connection.getNonces({ address: faucetAddress }, 2);
        expect(nonces.length).toEqual(2);
        expect(nonces[1]).toEqual((nonces[0] + 1) as Nonce);
      }

      // by pubkey, 0 nonces
      {
        const nonces = await connection.getNonces({ pubkey: faucet.pubkey }, 0);
        expect(nonces.length).toEqual(0);
      }

      // by pubkey, 1 nonces
      {
        const nonces = await connection.getNonces({ pubkey: faucet.pubkey }, 1);
        expect(nonces.length).toEqual(1);
      }

      // by pubkey, 2 nonces
      {
        const nonces = await connection.getNonces({ pubkey: faucet.pubkey }, 2);
        expect(nonces.length).toEqual(2);
        expect(nonces[1]).toEqual((nonces[0] + 1) as Nonce);
      }

      connection.disconnect();
    });
  });

  describe("getBlockHeader", () => {
    it("can get a valid header", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);
      const header = await connection.getBlockHeader(3);
      expect(header.height).toEqual(3);
      // as of tendermint v0.26.0, hashes are 32-bytes, previously 20 bytes
      expect(header.id).toMatch(/^[0-9A-F]{64}$/);
      connection.disconnect();
    });

    it("throws if it cannot get header", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);

      await connection
        .getBlockHeader(-3)
        .then(() => fail("must not resolve"))
        .catch(error => expect(error).toMatch(/height must be a non-negative safe integer/i));
      await connection
        .getBlockHeader(123_000000)
        .then(() => fail("must not resolve"))
        .catch(error => expect(error).toMatch(/header 123000000 doesn't exist yet/i));

      connection.disconnect();
    });
  });

  describe("watchBlockHeaders", () => {
    it("watches headers with same data as getBlockHeader", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);

      const headers = await toListPromise(connection.watchBlockHeaders(), 2);

      const lastHeight = headers[headers.length - 1].height;
      const headerFromGet = await connection.getBlockHeader(lastHeight);

      // first header
      expect(headers[0].id).not.toEqual(headerFromGet.id);
      expect(headers[0].height).toEqual(headerFromGet.height - 1);
      expect(headers[0].transactionCount).toBeGreaterThanOrEqual(0);
      expect(headers[0].time.getTime()).toBeGreaterThan(headerFromGet.time.getTime() - blockTime - 200);
      expect(headers[0].time.getTime()).toBeLessThan(headerFromGet.time.getTime() - blockTime + 200);

      // second header
      expect(headers[1].id).toEqual(headerFromGet.id);
      expect(headers[1].height).toEqual(headerFromGet.height);
      expect(headers[1].transactionCount).toEqual(headerFromGet.transactionCount);
      expect(headers[1].time).toEqual(headerFromGet.time);

      connection.disconnect();
    });
  });

  describe("getValidators", () => {
    it("works", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);

      const validators = await connection.getValidators();
      expect(validators.length).toEqual(1);
      expect(validators[0].pubkey.algo).toEqual(Algorithm.Ed25519);
      expect(validators[0].pubkey.data.length).toEqual(32);
      expect(validators[0].power).toEqual(10);

      connection.disconnect();
    });
  });

  describe("getElectorates", () => {
    it("can query electorates set in genesis", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);

      const electorates = await connection.getElectorates();
      expect(electorates.length).toBeGreaterThanOrEqual(1);
      expect(electorates[0]).toEqual({
        id: 1,
        version: 1,
        admin: "tiov1qkz3ujh7fwpjy88tc3xnc70xr8xfh703pm8r85" as Address,
        title: "Default electorate",
        electors: {
          tiov15nuhg3l8ma2mdmcdvgy7hme20v3xy5mkxcezea: { weight: 9 },
          tiov12shyht3pvvacvyee36w5844jkfh5s0mf4gszp9: { weight: 10 },
          tiov18mgvcwg4339w40ktv0hmmln80ttvza2n6hjaxh: { weight: 11 },
        },
        totalWeight: 30,
      });

      connection.disconnect();
    });
  });

  describe("getElectionRules", () => {
    it("can query election rules set in genesis", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);

      const rules = await connection.getElectionRules();
      expect(rules.length).toEqual(3);
      expect(rules[0]).toEqual({
        id: 1,
        version: 1,
        admin: "tiov1qkz3ujh7fwpjy88tc3xnc70xr8xfh703pm8r85" as Address,
        electorateId: 1,
        title: "fooo",
        votingPeriod: 1 * 3600,
        threshold: {
          numerator: 2,
          denominator: 3,
        },
        quorum: null,
      });
      expect(rules[1]).toEqual({
        id: 2,
        version: 1,
        admin: "tiov1k0dp2fmdunscuwjjusqtk6mttx5ufk3z0mmp0z" as Address,
        electorateId: 2,
        title: "barr",
        votingPeriod: 10,
        threshold: {
          numerator: 1,
          denominator: 2,
        },
        quorum: {
          numerator: 2,
          denominator: 3,
        },
      });
      expect(rules[2]).toEqual({
        id: 3,
        version: 1,
        admin: "tiov1k0dp2fmdunscuwjjusqtk6mttx5ufk3z0mmp0z" as Address,
        electorateId: 2,
        title: "frontend",
        votingPeriod: 10 * 3600,
        threshold: {
          numerator: 1,
          denominator: 2,
        },
        quorum: {
          numerator: 2,
          denominator: 3,
        },
      });

      connection.disconnect();
    });
  });

  describe("getProposals", () => {
    it("can get list of proposals", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);
      const proposals = await connection.getProposals(); // empty list for fresh chains
      expect(proposals.length).toBeGreaterThanOrEqual(0);
      connection.disconnect();
    });

    it("can create a proposal and find it in list", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);
      const chainId = connection.chainId();

      const { profile, admin: author } = await userProfileWithFaucet(chainId);
      const authorAddress = identityToAddress(author);

      const someElectionRule = (await connection.getElectionRules()).find(() => true);
      if (!someElectionRule) {
        throw new Error("No election rule found");
      }
      const startTime = Math.floor(Date.now() / 1000) + 3;

      const title = `Hello ${Math.random()}`;
      const description = `Hello ${Math.random()}`;
      const action: CreateTextResolutionAction = {
        kind: ActionKind.CreateTextResolution,
        resolution: `The winner is Alice ${Math.random()}`,
      };

      const createProposal = await connection.withDefaultFee<CreateProposalTx & WithCreator>({
        kind: "bns/create_proposal",
        creator: author,
        title: title,
        description: description,
        author: authorAddress,
        electionRuleId: someElectionRule.id,
        action: action,
        startTime: startTime,
      });

      const nonce = await connection.getNonce({ pubkey: author.pubkey });
      const signed = await profile.signTransaction(createProposal, bnsCodec, nonce);
      {
        const response = await connection.postTx(bnsCodec.bytesToPost(signed));
        await response.blockInfo.waitFor(info => !isBlockInfoPending(info));
      }

      const proposals = await connection.getProposals();
      expect(proposals.length).toBeGreaterThanOrEqual(1);

      const myProposal = proposals.find(p => p.author === authorAddress && p.votingStartTime === startTime);
      expect(myProposal).toBeDefined();
      expect(myProposal!.title).toEqual(title);
      expect(myProposal!.description).toEqual(description);
      expect(myProposal!.action).toEqual(action);

      connection.disconnect();
    });
  });

  describe("getUsernames", () => {
    it("can query usernames by name", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);
      const registryChainId = connection.chainId();

      const profile = new UserProfile();
      const wallet = profile.addWallet(Ed25519HdWallet.fromEntropy(Random.getBytes(32)));
      const identity = await profile.createIdentity(wallet.id, registryChainId, HdPaths.iov(0));
      const identityAddress = identityToAddress(identity);
      await sendTokensFromFaucet(connection, identityAddress, registerAmount);

      // Register username
      const username = `testuser_${Math.random()}*iov`;
      const targets = [{ chainId: "foobar" as ChainId, address: identityAddress }] as const;
      const registration = await connection.withDefaultFee<RegisterUsernameTx & WithCreator>({
        kind: "bns/register_username",
        creator: identity,
        username: username,
        targets: targets,
      });
      const nonce = await connection.getNonce({ pubkey: identity.pubkey });
      const signed = await profile.signTransaction(registration, bnsCodec, nonce);
      {
        const response = await connection.postTx(bnsCodec.bytesToPost(signed));
        await response.blockInfo.waitFor(info => !isBlockInfoPending(info));
      }

      // Query by existing name
      {
        const results = await connection.getUsernames({ username: username });
        expect(results.length).toEqual(1);
        expect(results[0]).toEqual({
          id: username,
          owner: identityAddress,
          targets: targets,
        });
      }

      // Query by non-existing name
      {
        const results = await connection.getUsernames({ username: "user_we_dont_have*iov" });
        expect(results.length).toEqual(0);
      }

      connection.disconnect();
    });

    it("can query usernames owner", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);
      const registryChainId = connection.chainId();

      const profile = new UserProfile();
      const wallet = profile.addWallet(Ed25519HdWallet.fromEntropy(Random.getBytes(32)));
      const identity = await profile.createIdentity(wallet.id, registryChainId, HdPaths.iov(0));
      const identityAddress = identityToAddress(identity);
      await sendTokensFromFaucet(connection, identityAddress, registerAmount);

      // Register username
      const username = `testuser_${Math.random()}*iov`;
      const targets = [{ chainId: "foobar" as ChainId, address: identityAddress }] as const;
      const registration = await connection.withDefaultFee<RegisterUsernameTx & WithCreator>({
        kind: "bns/register_username",
        creator: identity,
        username: username,
        targets: targets,
      });
      const nonce = await connection.getNonce({ pubkey: identity.pubkey });
      const signed = await profile.signTransaction(registration, bnsCodec, nonce);
      {
        const response = await connection.postTx(bnsCodec.bytesToPost(signed));
        await response.blockInfo.waitFor(info => !isBlockInfoPending(info));
      }

      // Query by existing owner
      {
        const results = await connection.getUsernames({ owner: identityAddress });
        expect(results.length).toBeGreaterThanOrEqual(1);
      }

      // Query by non-existing owner
      {
        const results = await connection.getUsernames({ owner: await randomBnsAddress() });
        expect(results.length).toEqual(0);
      }

      connection.disconnect();
    });
  });

  describe("getFeeQuote", () => {
    it("works for send transaction", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);

      const sendTransaction = {
        kind: "bcp/send",
        creator: {
          chainId: connection.chainId(),
          pubkey: {
            algo: Algorithm.Ed25519,
            data: fromHex("aabbccdd") as PubkeyBytes,
          },
        },
        recipient: await randomBnsAddress(),
        memo: `We ❤️ developers – iov.one`,
        amount: defaultAmount,
      };
      const result = await connection.getFeeQuote(sendTransaction);
      // anti-spam gconf fee from genesis
      expect(result.tokens!.quantity).toEqual("10000000");
      expect(result.tokens!.fractionalDigits).toEqual(9);
      expect(result.tokens!.tokenTicker).toEqual("CASH" as TokenTicker);

      expect(result.gasPrice).toBeUndefined();
      expect(result.gasLimit).toBeUndefined();

      connection.disconnect();
    });

    it("works for other BNS transaction", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);

      const username = `testuser_${Math.random()}`;
      const usernameRegistration = {
        kind: "bns/register_username",
        creator: {
          chainId: connection.chainId(),
          pubkey: {
            algo: Algorithm.Ed25519,
            data: fromHex("aabbccdd") as PubkeyBytes,
          },
        },
        addresses: [
          {
            address: "12345678912345W" as Address,
            chainId: "somechain" as ChainId,
          },
        ],
        username: username,
      };

      const result = await connection.getFeeQuote(usernameRegistration);
      // 5 CASH product fee
      expect(result.tokens!.quantity).toEqual("5000000000");
      expect(result.tokens!.fractionalDigits).toEqual(9);
      expect(result.tokens!.tokenTicker).toEqual("CASH" as TokenTicker);

      expect(result.gasPrice).toBeUndefined();
      expect(result.gasLimit).toBeUndefined();

      connection.disconnect();
    });

    it("throws for unsupported transaction kind", async () => {
      pendingWithoutBnsd();
      const connection = await BnsConnection.establish(bnsdTendermintUrl);

      const otherTransaction: UnsignedTransaction = {
        kind: "other/kind",
        creator: {
          chainId: connection.chainId(),
          pubkey: {
            algo: Algorithm.Ed25519,
            data: fromHex("aabbccdd") as PubkeyBytes,
          },
        },
      };
      await connection
        .getFeeQuote(otherTransaction)
        .then(() => fail("must not resolve"))
        .catch(error => expect(error).toMatch(/transaction of unsupported kind/i));

      connection.disconnect();
    });
  });
});
