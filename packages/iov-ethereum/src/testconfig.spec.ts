import {
  Address,
  Algorithm,
  Amount,
  BcpCoin,
  BcpTicker,
  ChainId,
  Nonce,
  PublicKeyBundle,
  PublicKeyBytes,
  TokenTicker,
} from "@iov/bcp";
import { Encoding } from "@iov/encoding";

import { Erc20Options } from "./erc20";

const { fromHex } = Encoding;

export interface EthereumNetworkConfig {
  readonly env: string;
  readonly base: string;
  readonly wsUrl: string;
  readonly chainId: ChainId;
  readonly minHeight: number;
  readonly accountStates: {
    /** An account with ETH and ERC20 balance */
    readonly full: {
      readonly pubkey: PublicKeyBundle;
      readonly address: Address;
      /** expected balance for the `address` */
      readonly expectedBalance: ReadonlyArray<BcpCoin>;
      /** expected nonce for the `address` */
      readonly expectedNonce: Nonce;
    };
    /** An account with ERC20 balances but no ETH */
    readonly noEth: {
      readonly address: Address;
      /** expected balance for the `address` */
      readonly expectedBalance: ReadonlyArray<BcpCoin>;
    };
    /** An account not used on this network */
    readonly unused: {
      readonly pubkey: PublicKeyBundle;
      readonly address: Address;
    };
  };
  readonly gasPrice: Amount;
  readonly gasLimit: Amount;
  readonly waitForTx: number;
  readonly scraper:
    | {
        readonly apiUrl: string;
        /** Account to query using the above API URL */
        readonly address: Address;
      }
    | undefined;
  readonly expectedErrorMessages: {
    readonly insufficientFunds: RegExp;
    readonly invalidSignature: RegExp;
    readonly gasLimitTooLow: RegExp;
  };
  readonly erc20Tokens: Map<TokenTicker, Erc20Options>;
  readonly tokens: ReadonlyArray<BcpTicker>;
}

// Set environment variable ETHEREUM_NETWORK to "local" (default), "ropsten", "rinkeby"
const env = process.env.ETHEREUM_NETWORK || "local";

const local: EthereumNetworkConfig = {
  env: "local",
  base: "http://localhost:8545",
  wsUrl: "ws://localhost:8545/ws",
  chainId: "ethereum-eip155-5777" as ChainId,
  minHeight: 0, // ganache does not auto-generate a genesis block
  accountStates: {
    full: {
      pubkey: {
        algo: Algorithm.Secp256k1,
        data: fromHex(
          "041d4c015b00cbd914e280b871d3c6ae2a047ca650d3ecea4b5246bb3036d4d74960b7feb09068164d2b82f1c7df9e95839b29ae38e90d60578b2318a54e108cf8",
        ) as PublicKeyBytes,
      },
      address: "0x0A65766695A712Af41B5cfECAaD217B1a11CB22A" as Address,
      expectedBalance: [
        {
          quantity: "1234567890987654321",
          fractionalDigits: 18,
          tokenTicker: "ETH" as TokenTicker,
          tokenName: "Ether",
        },
        {
          tokenTicker: "ASH" as TokenTicker,
          fractionalDigits: 12,
          quantity: "33445566",
          tokenName: "Ash Token",
        },
        {
          tokenTicker: "TRASH" as TokenTicker,
          fractionalDigits: 9,
          quantity: "33445566",
          tokenName: "Trash Token",
        },
      ],
      expectedNonce: 0 as Nonce,
    },
    noEth: {
      address: "0x0000000000111111111122222222223333333333" as Address,
      expectedBalance: [
        // ETH balance should be listed anyway
        {
          quantity: "0",
          fractionalDigits: 18,
          tokenTicker: "ETH" as TokenTicker,
          tokenName: "Ether",
        },
        {
          tokenTicker: "ASH" as TokenTicker,
          fractionalDigits: 12,
          quantity: "38",
          tokenName: "Ash Token",
        },
        {
          tokenTicker: "TRASH" as TokenTicker,
          fractionalDigits: 9,
          quantity: "38",
          tokenName: "Trash Token",
        },
      ],
    },
    unused: {
      pubkey: {
        algo: Algorithm.Secp256k1,
        data: fromHex(
          "049555be4c5136102e1645f9ce53475b2fed172078de78d3b7d0befed14f5471a077123dd459624055c93f85c0d8f99d9178b79b151f597f714ac759bca9dd3cb1",
        ) as PublicKeyBytes,
      },
      address: "0x52dF0e01583E12978B0885C5836c9683f22b0618" as Address,
    },
  },
  gasPrice: {
    quantity: "20000000000",
    fractionalDigits: 18,
    tokenTicker: "ETH" as TokenTicker,
  },
  gasLimit: {
    quantity: "2100000",
    fractionalDigits: 18,
    tokenTicker: "ETH" as TokenTicker,
  },
  waitForTx: 100, // by default, ganache will instantly mine a new block for every transaction
  scraper: undefined,
  expectedErrorMessages: {
    insufficientFunds: /sender doesn't have enough funds to send tx/i,
    invalidSignature: /invalid signature/i,
    gasLimitTooLow: /base fee exceeds gas limit/i,
  },
  erc20Tokens: new Map([
    [
      "ASH" as TokenTicker,
      {
        contractAddress: "0xCb642A87923580b6F7D07D1471F93361196f2650" as Address,
      },
    ],
    [
      "TRASH" as TokenTicker,
      {
        contractAddress: "0x9768ae2339B48643d710B11dDbDb8A7eDBEa15BC" as Address,
        decimals: 9,
        symbol: "TRASH",
        name: "Trash Token",
      },
    ],
  ]),
  tokens: [
    {
      tokenTicker: "ETH" as TokenTicker,
      tokenName: "Ether",
      fractionalDigits: 18,
    },
    {
      tokenTicker: "ASH" as TokenTicker,
      tokenName: "Ash Token",
      fractionalDigits: 12,
    },
    {
      tokenTicker: "TRASH" as TokenTicker,
      tokenName: "Trash Token",
      fractionalDigits: 9,
    },
  ],
};

/** Ropsten config is not well maintained and probably outdated. Use at your won risk. */
const ropsten: EthereumNetworkConfig = {
  env: "ropsten",
  base: "https://ropsten.infura.io/",
  wsUrl: "wss://ropsten.infura.io/ws",
  chainId: "ethereum-eip155-3" as ChainId,
  minHeight: 4284887,
  accountStates: {
    full: {
      pubkey: {
        algo: Algorithm.Secp256k1,
        data: fromHex(
          "04965fb72aad79318cd8c8c975cf18fa8bcac0c091605d10e89cd5a9f7cff564b0cb0459a7c22903119f7a42947c32c1cc6a434a86f0e26aad00ca2b2aff6ba381",
        ) as PublicKeyBytes,
      },
      address: "0x88F3b5659075D0E06bB1004BE7b1a7E66F452284" as Address,
      expectedBalance: [
        {
          quantity: "2999979000000000000",
          fractionalDigits: 18,
          tokenTicker: "ETH" as TokenTicker,
          tokenName: "Ether",
        },
      ],
      expectedNonce: 1 as Nonce,
    },
    noEth: {
      address: "0x0000000000000000000000000000000000000000" as Address,
      expectedBalance: [
        // ETH balance should be listed anyway
        {
          quantity: "0",
          fractionalDigits: 18,
          tokenTicker: "ETH" as TokenTicker,
          tokenName: "Ether",
        },
      ],
    },
    unused: {
      pubkey: {
        algo: Algorithm.Secp256k1,
        data: fromHex(
          "049555be4c5136102e1645f9ce53475b2fed172078de78d3b7d0befed14f5471a077123dd459624055c93f85c0d8f99d9178b79b151f597f714ac759bca9dd3cb1",
        ) as PublicKeyBytes,
      },
      address: "0x52dF0e01583E12978B0885C5836c9683f22b0618" as Address,
    },
  },
  gasPrice: {
    quantity: "1000000000",
    fractionalDigits: 18,
    tokenTicker: "ETH" as TokenTicker,
  },
  gasLimit: {
    quantity: "141000",
    fractionalDigits: 18,
    tokenTicker: "ETH" as TokenTicker,
  },
  waitForTx: 4000,
  scraper: {
    apiUrl: "https://api-ropsten.etherscan.io/api",
    address: "0x0A65766695A712Af41B5cfECAaD217B1a11CB22A" as Address,
  },
  expectedErrorMessages: {
    insufficientFunds: /insufficient funds for gas \* price \+ value/i,
    invalidSignature: /invalid sender/i,
    gasLimitTooLow: /intrinsic gas too low/i,
  },
  erc20Tokens: new Map([]),
  tokens: [
    {
      tokenTicker: "ETH" as TokenTicker,
      tokenName: "Ether",
      fractionalDigits: 18,
    },
  ],
};

const rinkeby: EthereumNetworkConfig = {
  env: "rinkeby",
  base: "https://rinkeby.infura.io",
  wsUrl: "wss://rinkeby.infura.io/ws",
  chainId: "ethereum-eip155-4" as ChainId,
  minHeight: 3211058,
  accountStates: {
    full: {
      // Second account (m/44'/60'/0'/0/1) of
      // "retire bench island cushion panther noodle cactus keep danger assault home letter"
      pubkey: {
        algo: Algorithm.Secp256k1,
        data: fromHex(
          "045a977cdfa082bd486755a440b1e411a14c690fd9ac0bb6d866070f63911c54af75ae8f0f40c7069ce2df65c6facc45902d462f39e8812421502e0216da7ef51e",
        ) as PublicKeyBytes,
      },
      address: "0x2eF42084759d67CA34aA910DFE22d78bbb66964f" as Address,
      expectedBalance: [
        {
          quantity: "1775182474000000000",
          fractionalDigits: 18,
          tokenTicker: "ETH" as TokenTicker,
          tokenName: "Ether",
        },
        {
          quantity: "1123344550000000000",
          fractionalDigits: 18,
          tokenTicker: "WETH" as TokenTicker,
          tokenName: "Wrapped Ether",
        },
      ],
      expectedNonce: 3 as Nonce,
    },
    noEth: {
      address: "0x2244224422448877887744444444445555555555" as Address,
      expectedBalance: [
        // ETH balance should be listed anyway
        {
          quantity: "0",
          fractionalDigits: 18,
          tokenTicker: "ETH" as TokenTicker,
          tokenName: "Ether",
        },
        {
          tokenTicker: "WETH" as TokenTicker,
          fractionalDigits: 18,
          quantity: "100000000000000000",
          tokenName: "Wrapped Ether",
        },
      ],
    },
    unused: {
      pubkey: {
        algo: Algorithm.Secp256k1,
        data: fromHex(
          "049555be4c5136102e1645f9ce53475b2fed172078de78d3b7d0befed14f5471a077123dd459624055c93f85c0d8f99d9178b79b151f597f714ac759bca9dd3cb1",
        ) as PublicKeyBytes,
      },
      address: "0x52dF0e01583E12978B0885C5836c9683f22b0618" as Address,
    },
  },
  gasPrice: {
    quantity: "1000000000",
    fractionalDigits: 18,
    tokenTicker: "ETH" as TokenTicker,
  },
  gasLimit: {
    quantity: "141000",
    fractionalDigits: 18,
    tokenTicker: "ETH" as TokenTicker,
  },
  waitForTx: 4000,
  scraper: {
    apiUrl: "https://api-rinkeby.etherscan.io/api",
    // recipient address with no known keypair
    address: "0x7C14eF21979996A49551a16c7a96899e9C485eb4" as Address,
  },
  expectedErrorMessages: {
    insufficientFunds: /insufficient funds for gas \* price \+ value/i,
    invalidSignature: /invalid sender/i,
    gasLimitTooLow: /intrinsic gas too low/i,
  },
  erc20Tokens: new Map<TokenTicker, Erc20Options>([
    ["WETH" as TokenTicker, { contractAddress: "0xc778417e063141139fce010982780140aa0cd5ab" as Address }],
  ]),
  tokens: [
    {
      tokenTicker: "ETH" as TokenTicker,
      tokenName: "Ether",
      fractionalDigits: 18,
    },
    {
      tokenTicker: "WETH" as TokenTicker,
      tokenName: "Wrapped Ether",
      fractionalDigits: 18,
    },
  ],
};

const config = new Map<string, EthereumNetworkConfig>();
config.set("local", local);
config.set("ropsten", ropsten);
config.set("rinkeby", rinkeby);

export const testConfig = config.get(env)!;
