import {
  Address,
  Algorithm,
  Amount,
  ChainId,
  Hash,
  Nonce,
  Preimage,
  PublicIdentity,
  PublicKeyBytes,
  SendTransaction,
  SignatureBytes,
  SignedTransaction,
  SwapClaimTransaction,
  SwapIdBytes,
  SwapOfferTransaction,
  TokenTicker,
} from "@iov/bcp";
import { ExtendedSecp256k1Signature } from "@iov/crypto";
import { Encoding } from "@iov/encoding";

import { Erc20Options } from "./erc20";
import { Serialization } from "./serialization";
import { testConfig } from "./testconfig.spec";

const { serializeSignedTransaction, serializeUnsignedTransaction } = Serialization;
const { fromHex } = Encoding;

describe("Serialization", () => {
  describe("serializeUnsignedTransaction", () => {
    it("can serialize transaction without memo", () => {
      const pubkey = fromHex(
        "044bc2a31265153f07e70e0bab08724e6b85e217f8cd628ceb62974247bb493382ce28cab79ad7119ee1ad3ebcdb98a16805211530ecc6cfefa1b88e6dff99232a",
      );

      const tx: SendTransaction = {
        kind: "bcp/send",
        creator: {
          chainId: "ethereum-eip155-5777" as ChainId,
          pubkey: {
            algo: Algorithm.Secp256k1,
            data: pubkey as PublicKeyBytes,
          },
        },
        amount: {
          quantity: "20000000000000000000",
          fractionalDigits: 18,
          tokenTicker: "ETH" as TokenTicker,
        },
        fee: {
          gasPrice: {
            quantity: "20000000000",
            fractionalDigits: 18,
            tokenTicker: "ETH" as TokenTicker,
          },
          gasLimit: "21000",
        },
        recipient: "0x43aa18FAAE961c23715735682dC75662d90F4DDe" as Address,
      };
      const nonce = 0 as Nonce;
      const serializedTx = serializeUnsignedTransaction(tx, nonce);
      expect(serializedTx).toEqual(
        fromHex(
          "ef808504a817c8008252089443aa18faae961c23715735682dc75662d90f4dde8901158e460913d00000808216918080",
        ),
      );
    });

    it("can serialize transaction with memo", () => {
      const pubkey = fromHex(
        "044bc2a31265153f07e70e0bab08724e6b85e217f8cd628ceb62974247bb493382ce28cab79ad7119ee1ad3ebcdb98a16805211530ecc6cfefa1b88e6dff99232a",
      );

      const tx: SendTransaction = {
        kind: "bcp/send",
        creator: {
          chainId: "ethereum-eip155-5777" as ChainId,
          pubkey: {
            algo: Algorithm.Secp256k1,
            data: pubkey as PublicKeyBytes,
          },
        },
        amount: {
          quantity: "20000000000000000000",
          fractionalDigits: 18,
          tokenTicker: "ETH" as TokenTicker,
        },
        fee: {
          gasPrice: {
            quantity: "20000000000",
            fractionalDigits: 18,
            tokenTicker: "ETH" as TokenTicker,
          },
          gasLimit: "21000",
        },
        recipient: "0x43aa18FAAE961c23715735682dC75662d90F4DDe" as Address,
        memo:
          "The nice memo I attach to that money for the whole world to read, And can encode as much data as you want, and unicode symbols like \u2764",
      };
      const nonce = 0 as Nonce;
      const serializedTx = serializeUnsignedTransaction(tx, nonce);
      expect(serializedTx).toEqual(
        fromHex(
          "f8b7808504a817c8008252089443aa18faae961c23715735682dc75662d90f4dde8901158e460913d00000b887546865206e696365206d656d6f20492061747461636820746f2074686174206d6f6e657920666f72207468652077686f6c6520776f726c6420746f20726561642c20416e642063616e20656e636f6465206173206d756368206461746120617320796f752077616e742c20616e6420756e69636f64652073796d626f6c73206c696b6520e29da48216918080",
        ),
      );
    });

    it("throws for unset gas price/limit", () => {
      const creator: PublicIdentity = {
        chainId: "ethereum-eip155-5777" as ChainId,
        pubkey: {
          algo: Algorithm.Secp256k1,
          data: fromHex(
            "044bc2a31265153f07e70e0bab08724e6b85e217f8cd628ceb62974247bb493382ce28cab79ad7119ee1ad3ebcdb98a16805211530ecc6cfefa1b88e6dff99232a",
          ) as PublicKeyBytes,
        },
      };
      const amount: Amount = {
        quantity: "20000000000000000000",
        fractionalDigits: 18,
        tokenTicker: "ETH" as TokenTicker,
      };
      const gasPrice: Amount = {
        quantity: "20000000000",
        fractionalDigits: 18,
        tokenTicker: "ETH" as TokenTicker,
      };
      const gasLimit = "21000";
      const nonce = 0 as Nonce;

      // gasPrice unset
      {
        const tx: SendTransaction = {
          kind: "bcp/send",
          creator: creator,
          amount: amount,
          fee: {
            gasPrice: undefined,
            gasLimit: gasLimit,
          },
          recipient: "0x43aa18FAAE961c23715735682dC75662d90F4DDe" as Address,
        };
        expect(() => serializeUnsignedTransaction(tx, nonce)).toThrowError(/gasPrice must be set/i);
      }

      // gasLimit unset
      {
        const tx: SendTransaction = {
          kind: "bcp/send",
          creator: creator,
          amount: amount,
          fee: {
            gasPrice: gasPrice,
            gasLimit: undefined,
          },
          recipient: "0x43aa18FAAE961c23715735682dC75662d90F4DDe" as Address,
        };
        expect(() => serializeUnsignedTransaction(tx, nonce)).toThrowError(/gasLimit must be set/i);
      }
    });

    it("throws for negative nonce", () => {
      const creator: PublicIdentity = {
        chainId: "ethereum-eip155-5777" as ChainId,
        pubkey: {
          algo: Algorithm.Secp256k1,
          data: fromHex(
            "044bc2a31265153f07e70e0bab08724e6b85e217f8cd628ceb62974247bb493382ce28cab79ad7119ee1ad3ebcdb98a16805211530ecc6cfefa1b88e6dff99232a",
          ) as PublicKeyBytes,
        },
      };
      const amount: Amount = {
        quantity: "20000000000000000000",
        fractionalDigits: 18,
        tokenTicker: "ETH" as TokenTicker,
      };
      const gasPrice: Amount = {
        quantity: "20000000000",
        fractionalDigits: 18,
        tokenTicker: "ETH" as TokenTicker,
      };
      const gasLimit = "21000";

      const tx: SendTransaction = {
        kind: "bcp/send",
        creator: creator,
        amount: amount,
        fee: {
          gasPrice: gasPrice,
          gasLimit: gasLimit,
        },
        recipient: "0x43aa18FAAE961c23715735682dC75662d90F4DDe" as Address,
      };
      expect(() => serializeUnsignedTransaction(tx, -1 as Nonce)).toThrowError(
        /not a unsigned safe integer/i,
      );
    });

    it("can serialize ERC20 token transfer", () => {
      // https://etherscan.io/getRawTx?tx=0x5d08a3cda172df9520f965549b4d7fc4b32baa026e8beff5293ba90c845c93b2
      // 266151.44240739 HOT from 0xc023d0f30ef630db4f4be6219608d6bcf99684f0 to 0x8fec1c262599f4169401ff48a9d63503ceaaf742
      const tx: SendTransaction = {
        kind: "bcp/send",
        creator: {
          chainId: "ethereum-eip155-1" as ChainId,
          pubkey: {
            algo: Algorithm.Secp256k1,
            data: fromHex("") as PublicKeyBytes,
          },
        },
        amount: {
          quantity: "266151442407390000000000",
          fractionalDigits: 18,
          tokenTicker: "HOT" as TokenTicker,
        },
        fee: {
          gasPrice: {
            quantity: "6000000000", // 6 Gwei
            fractionalDigits: 18,
            tokenTicker: "ETH" as TokenTicker,
          },
          gasLimit: "52669",
        },
        recipient: "0x8fec1c262599f4169401ff48a9d63503ceaaf742" as Address,
      };
      const nonce = 26 as Nonce;

      const expected = fromHex(
        // full length of list
        "f869" +
          // content from getRawTx with signatures stripped off
          "1a850165a0bc0082cdbd946c6ee5e31d828de241282b9606c8e98ea48526e280b844a9059cbb0000000000000000000000008fec1c262599f4169401ff48a9d63503ceaaf74200000000000000000000000000000000000000000000385c193e12be6d312c00" +
          // chain ID = 1
          "01" +
          // zero length r
          "80" +
          // zero length s
          "80",
      );
      const erc20Tokens = new Map<TokenTicker, Erc20Options>([
        [
          "HOT" as TokenTicker,
          {
            contractAddress: "0x6c6ee5e31d828de241282b9606c8e98ea48526e2" as Address,
            symbol: "HOT" as TokenTicker,
            decimals: 18,
          },
        ],
      ]);
      const serializedTx = serializeUnsignedTransaction(tx, nonce, erc20Tokens);
      expect(serializedTx).toEqual(expected);
    });

    it("can serialize Ether atomic swap offer", () => {
      const transaction: SwapOfferTransaction = {
        kind: "bcp/swap_offer",
        creator: {
          chainId: "ethereum-eip155-1" as ChainId,
          pubkey: {
            algo: Algorithm.Secp256k1,
            data: fromHex("") as PublicKeyBytes,
          },
        },
        amounts: [
          {
            quantity: "266151442407390000000000",
            fractionalDigits: 18,
            tokenTicker: "ETH" as TokenTicker,
          },
        ],
        fee: {
          gasPrice: {
            quantity: "6000000000", // 6 Gwei
            fractionalDigits: 18,
            tokenTicker: "ETH" as TokenTicker,
          },
          gasLimit: "52669",
        },
        swapId: Uint8Array.from([]) as SwapIdBytes,
        recipient: "0x8fec1c262599f4169401ff48a9d63503ceaaf742" as Address,
        hash: Uint8Array.from([]) as Hash,
        timeout: {
          height: 1,
        },
      };
      const nonce = 26 as Nonce;

      const expected = fromHex(
        "f8731a850165a0bc0082cdbd94e1c9ea25a621cf5c934a7e112ecab640ec7d8d188a385c193e12be6d312c00b8440eed85480000000000000000000000008fec1c262599f4169401ff48a9d63503ceaaf7420000000000000000000000000000000000000000000000000000000000000001018080",
      );
      const serializedTransaction = serializeUnsignedTransaction(
        transaction,
        nonce,
        undefined,
        testConfig.connectionOptions.atomicSwapEtherContractAddress,
      );
      expect(serializedTransaction).toEqual(expected);
    });

    it("can serialize Ether atomic swap claim", () => {
      const transaction: SwapClaimTransaction = {
        kind: "bcp/swap_claim",
        creator: {
          chainId: "ethereum-eip155-1" as ChainId,
          pubkey: {
            algo: Algorithm.Secp256k1,
            data: fromHex("") as PublicKeyBytes,
          },
        },
        fee: {
          gasPrice: {
            quantity: "6000000000", // 6 Gwei
            fractionalDigits: 18,
            tokenTicker: "ETH" as TokenTicker,
          },
          gasLimit: "52669",
        },
        swapId: Uint8Array.from([]) as SwapIdBytes,
        preimage: Uint8Array.from([]) as Preimage,
      };
      const nonce = 26 as Nonce;

      const expected = fromHex(
        "e81a850165a0bc0082cdbd94e1c9ea25a621cf5c934a7e112ecab640ec7d8d18808484cc9dfb018080",
      );
      const serializedTransaction = serializeUnsignedTransaction(
        transaction,
        nonce,
        undefined,
        testConfig.connectionOptions.atomicSwapEtherContractAddress,
      );
      expect(serializedTransaction).toEqual(expected);
    });
  });

  describe("serializeSignedTransaction", () => {
    it("can serialize pre-eip155 transaction compatible to external vectors", () => {
      // Data from
      // https://github.com/ethereum/tests/blob/v6.0.0-beta.3/TransactionTests/ttSignature/SenderTest.json
      // https://github.com/ethereum/tests/blob/v6.0.0-beta.3/src/TransactionTestsFiller/ttSignature/SenderTestFiller.json

      const signed: SignedTransaction<SendTransaction> = {
        transaction: {
          kind: "bcp/send",
          creator: {
            chainId: "ethereum-eip155-0" as ChainId,
            pubkey: {
              algo: Algorithm.Secp256k1,
              data: new Uint8Array([]) as PublicKeyBytes, // unused for serialization
            },
          },
          amount: {
            quantity: "10",
            fractionalDigits: 18,
            tokenTicker: "ETH" as TokenTicker,
          },
          fee: {
            gasPrice: {
              quantity: "1",
              fractionalDigits: 18,
              tokenTicker: "ETH" as TokenTicker,
            },
            gasLimit: "21000",
          },
          recipient: "0x095e7baea6a6c7c4c2dfeb977efac326af552d87" as Address,
        },
        primarySignature: {
          nonce: 0 as Nonce,
          pubkey: {
            algo: Algorithm.Secp256k1,
            data: new Uint8Array([]) as PublicKeyBytes, // unused for serialization
          },
          signature: new ExtendedSecp256k1Signature(
            fromHex("48b55bfa915ac795c431978d8a6a992b628d557da5ff759b307d495a36649353"),
            fromHex("1fffd310ac743f371de3b9f7f9cb56c0b28ad43601b4ab949f53faa07bd2c804"),
            0,
          ).toFixedLength() as SignatureBytes,
        },
        otherSignatures: [],
      };

      const serializedTx = serializeSignedTransaction(signed);
      expect(serializedTx).toEqual(
        fromHex(
          "f85f800182520894095e7baea6a6c7c4c2dfeb977efac326af552d870a801ba048b55bfa915ac795c431978d8a6a992b628d557da5ff759b307d495a36649353a01fffd310ac743f371de3b9f7f9cb56c0b28ad43601b4ab949f53faa07bd2c804",
        ),
      );
    });

    it("can serialize ERC20 token transfer", () => {
      // https://etherscan.io/getRawTx?tx=0x5d08a3cda172df9520f965549b4d7fc4b32baa026e8beff5293ba90c845c93b2
      // 266151.44240739 HOT from 0xc023d0f30ef630db4f4be6219608d6bcf99684f0 to 0x8fec1c262599f4169401ff48a9d63503ceaaf742
      const signed: SignedTransaction<SendTransaction> = {
        transaction: {
          kind: "bcp/send",
          creator: {
            chainId: "ethereum-eip155-1" as ChainId,
            pubkey: {
              algo: Algorithm.Secp256k1,
              data: fromHex("") as PublicKeyBytes,
            },
          },
          amount: {
            quantity: "266151442407390000000000",
            fractionalDigits: 18,
            tokenTicker: "HOT" as TokenTicker,
          },
          fee: {
            gasPrice: {
              quantity: "6000000000", // 6 Gwei
              fractionalDigits: 18,
              tokenTicker: "ETH" as TokenTicker,
            },
            gasLimit: "52669",
          },
          recipient: "0x8fec1c262599f4169401ff48a9d63503ceaaf742" as Address,
        },
        primarySignature: {
          nonce: 26 as Nonce,
          pubkey: {
            algo: Algorithm.Secp256k1,
            data: new Uint8Array([]) as PublicKeyBytes, // unused for serialization
          },
          signature: new ExtendedSecp256k1Signature(
            fromHex("6a6bbd9d45779c81a24172a1c90e9790033cce1fd6893a49ac31d972e436ee37"),
            fromHex("443fbc313ff9e4399da1b285bd3f9b9c776349b61d0334c83f4eb51ba67a0a7d"),
            0,
          ).toFixedLength() as SignatureBytes,
        },
        otherSignatures: [],
      };
      const expected = fromHex(
        "f8a91a850165a0bc0082cdbd946c6ee5e31d828de241282b9606c8e98ea48526e280b844a9059cbb0000000000000000000000008fec1c262599f4169401ff48a9d63503ceaaf74200000000000000000000000000000000000000000000385c193e12be6d312c0025a06a6bbd9d45779c81a24172a1c90e9790033cce1fd6893a49ac31d972e436ee37a0443fbc313ff9e4399da1b285bd3f9b9c776349b61d0334c83f4eb51ba67a0a7d",
      );

      const erc20Tokens = new Map<TokenTicker, Erc20Options>([
        [
          "HOT" as TokenTicker,
          {
            contractAddress: "0x6c6ee5e31d828de241282b9606c8e98ea48526e2" as Address,
            symbol: "HOT" as TokenTicker,
            decimals: 18,
          },
        ],
      ]);
      const serializedTx = serializeSignedTransaction(signed, erc20Tokens);
      expect(serializedTx).toEqual(expected);
    });

    it("can serialize Ether atomic swap offer", () => {
      const signed: SignedTransaction<SwapOfferTransaction> = {
        transaction: {
          kind: "bcp/swap_offer",
          creator: {
            chainId: "ethereum-eip155-1" as ChainId,
            pubkey: {
              algo: Algorithm.Secp256k1,
              data: fromHex("") as PublicKeyBytes,
            },
          },
          amounts: [
            {
              quantity: "266151442407390000000000",
              fractionalDigits: 18,
              tokenTicker: "ETH" as TokenTicker,
            },
          ],
          fee: {
            gasPrice: {
              quantity: "6000000000", // 6 Gwei
              fractionalDigits: 18,
              tokenTicker: "ETH" as TokenTicker,
            },
            gasLimit: "52669",
          },
          swapId: Uint8Array.from([]) as SwapIdBytes,
          recipient: "0x8fec1c262599f4169401ff48a9d63503ceaaf742" as Address,
          hash: Uint8Array.from([]) as Hash,
          timeout: {
            height: 1,
          },
        },
        primarySignature: {
          nonce: 26 as Nonce,
          pubkey: {
            algo: Algorithm.Secp256k1,
            data: new Uint8Array([]) as PublicKeyBytes, // unused for serialization
          },
          signature: new ExtendedSecp256k1Signature(
            fromHex("6a6bbd9d45779c81a24172a1c90e9790033cce1fd6893a49ac31d972e436ee37"),
            fromHex("443fbc313ff9e4399da1b285bd3f9b9c776349b61d0334c83f4eb51ba67a0a7d"),
            0,
          ).toFixedLength() as SignatureBytes,
        },
        otherSignatures: [],
      };
      const expected = fromHex(
        "f8b31a850165a0bc0082cdbd94e1c9ea25a621cf5c934a7e112ecab640ec7d8d188a385c193e12be6d312c00b8440eed85480000000000000000000000008fec1c262599f4169401ff48a9d63503ceaaf742000000000000000000000000000000000000000000000000000000000000000125a06a6bbd9d45779c81a24172a1c90e9790033cce1fd6893a49ac31d972e436ee37a0443fbc313ff9e4399da1b285bd3f9b9c776349b61d0334c83f4eb51ba67a0a7d",
      );

      const serializedTransaction = serializeSignedTransaction(
        signed,
        undefined,
        testConfig.connectionOptions.atomicSwapEtherContractAddress,
      );
      expect(serializedTransaction).toEqual(expected);
    });

    it("can serialize Ether atomic swap claim", () => {
      const signed: SignedTransaction<SwapClaimTransaction> = {
        transaction: {
          kind: "bcp/swap_claim",
          creator: {
            chainId: "ethereum-eip155-1" as ChainId,
            pubkey: {
              algo: Algorithm.Secp256k1,
              data: fromHex("") as PublicKeyBytes,
            },
          },
          fee: {
            gasPrice: {
              quantity: "6000000000", // 6 Gwei
              fractionalDigits: 18,
              tokenTicker: "ETH" as TokenTicker,
            },
            gasLimit: "52669",
          },
          swapId: Uint8Array.from([]) as SwapIdBytes,
          preimage: Uint8Array.from([]) as Preimage,
        },
        primarySignature: {
          nonce: 26 as Nonce,
          pubkey: {
            algo: Algorithm.Secp256k1,
            data: new Uint8Array([]) as PublicKeyBytes, // unused for serialization
          },
          signature: new ExtendedSecp256k1Signature(
            fromHex("6a6bbd9d45779c81a24172a1c90e9790033cce1fd6893a49ac31d972e436ee37"),
            fromHex("443fbc313ff9e4399da1b285bd3f9b9c776349b61d0334c83f4eb51ba67a0a7d"),
            0,
          ).toFixedLength() as SignatureBytes,
        },
        otherSignatures: [],
      };
      const expected = fromHex(
        "f8681a850165a0bc0082cdbd94e1c9ea25a621cf5c934a7e112ecab640ec7d8d18808484cc9dfb25a06a6bbd9d45779c81a24172a1c90e9790033cce1fd6893a49ac31d972e436ee37a0443fbc313ff9e4399da1b285bd3f9b9c776349b61d0334c83f4eb51ba67a0a7d",
      );

      const serializedTransaction = serializeSignedTransaction(
        signed,
        undefined,
        testConfig.connectionOptions.atomicSwapEtherContractAddress,
      );
      expect(serializedTransaction).toEqual(expected);
    });
  });
});
