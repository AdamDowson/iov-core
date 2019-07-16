import BN from "bn.js";

import {
  Address,
  Algorithm,
  Amount,
  FullSignature,
  isTimestampTimeout,
  PubkeyBundle,
  SendTransaction,
  SignatureBytes,
  SignedTransaction,
  SwapAbortTransaction,
  SwapClaimTransaction,
  SwapOfferTransaction,
  UnsignedTransaction,
  WithCreator,
} from "@iov/bcp";
import { Encoding, Int53 } from "@iov/encoding";

import * as codecImpl from "./generated/codecimpl";
import {
  ChainAddressPair,
  CreateEscrowTx,
  CreateMultisignatureTx,
  CreateProposalTx,
  isBnsTx,
  isCreateTextResolution,
  isSetValidators,
  isUpdateElectorate,
  Participant,
  PrivkeyBundle,
  RegisterUsernameTx,
  ReleaseEscrowTx,
  ReturnEscrowTx,
  TallyTx,
  UpdateEscrowPartiesTx,
  UpdateMultisignatureTx,
  UpdateTargetsOfUsernameTx,
  Validators,
  VoteOption,
  VoteTx,
} from "./types";
import { decodeBnsAddress, identityToAddress } from "./util";

const { toUtf8 } = Encoding;

function encodeInt(intNumber: number): number | null {
  if (!Number.isInteger(intNumber)) {
    throw new Error("Received some kind of number that can't be encoded.");
  }

  // Normalizes the zero value to null as expected by weave
  return intNumber || null;
}

function encodeString(data: string | undefined): string | null {
  // Normalizes the empty string to null as expected by weave
  return data || null;
}

export function encodePubkey(publicKey: PubkeyBundle): codecImpl.crypto.IPublicKey {
  switch (publicKey.algo) {
    case Algorithm.Ed25519:
      return { ed25519: publicKey.data };
    default:
      throw new Error("unsupported algorithm: " + publicKey.algo);
  }
}

export function encodePrivkey(privateKey: PrivkeyBundle): codecImpl.crypto.IPrivateKey {
  switch (privateKey.algo) {
    case Algorithm.Ed25519:
      return { ed25519: privateKey.data };
    default:
      throw new Error("unsupported algorithm: " + privateKey.algo);
  }
}

export function encodeAmount(amount: Amount): codecImpl.coin.ICoin {
  if (amount.fractionalDigits !== 9) {
    throw new Error(`Fractional digits must be 9 but was ${amount.fractionalDigits}`);
  }

  const whole = Int53.fromString(amount.quantity.slice(0, -amount.fractionalDigits) || "0");
  const fractional = Int53.fromString(amount.quantity.slice(-amount.fractionalDigits) || "0");
  return {
    whole: encodeInt(whole.toNumber()),
    fractional: encodeInt(fractional.toNumber()),
    ticker: amount.tokenTicker,
  };
}

function encodeSignature(algo: Algorithm, bytes: SignatureBytes): codecImpl.crypto.ISignature {
  switch (algo) {
    case Algorithm.Ed25519:
      return { ed25519: bytes };
    default:
      throw new Error("unsupported algorithm: " + algo);
  }
}

export function encodeFullSignature(fullSignature: FullSignature): codecImpl.sigs.IStdSignature {
  return codecImpl.sigs.StdSignature.create({
    sequence: fullSignature.nonce,
    pubkey: encodePubkey(fullSignature.pubkey),
    signature: encodeSignature(fullSignature.pubkey.algo, fullSignature.signature),
  });
}

export function encodeParticipants(
  participants: readonly Participant[],
  // tslint:disable-next-line:readonly-array
): codecImpl.multisig.IParticipant[] {
  return participants.map(
    (participant): codecImpl.multisig.IParticipant => ({
      signature: decodeBnsAddress(participant.address).data,
      weight: participant.weight,
    }),
  );
}

function encodeNumericId(id: number): Uint8Array {
  return new BN(id).toArrayLike(Uint8Array, "be", 8);
}

// Token sends

function buildSendTransaction(tx: SendTransaction & WithCreator): codecImpl.bnsd.ITx {
  const { prefix: prefix1, data: data1 } = decodeBnsAddress(identityToAddress(tx.creator));
  const { prefix: prefix2, data: data2 } = decodeBnsAddress(tx.sender);
  if (prefix1 !== prefix2 || data1.length !== data2.length || data1.some((b, i) => b !== data2[i])) {
    throw new Error("Sender and creator do not match (currently unsupported)");
  }
  return {
    cashSendMsg: codecImpl.cash.SendMsg.create({
      metadata: { schema: 1 },
      source: decodeBnsAddress(identityToAddress(tx.creator)).data,
      destination: decodeBnsAddress(tx.recipient).data,
      amount: encodeAmount(tx.amount),
      memo: encodeString(tx.memo),
    }),
  };
}

// Atomic swaps

function buildSwapOfferTx(tx: SwapOfferTransaction & WithCreator): codecImpl.bnsd.ITx {
  if (!isTimestampTimeout(tx.timeout)) {
    throw new Error("Got unsupported timeout type");
  }

  return {
    aswapCreateMsg: codecImpl.aswap.CreateMsg.create({
      metadata: { schema: 1 },
      source: decodeBnsAddress(identityToAddress(tx.creator)).data,
      preimageHash: tx.hash,
      destination: decodeBnsAddress(tx.recipient).data,
      amount: tx.amounts.map(encodeAmount),
      timeout: encodeInt(tx.timeout.timestamp),
      memo: encodeString(tx.memo),
    }),
  };
}

function buildSwapClaimTx(tx: SwapClaimTransaction): codecImpl.bnsd.ITx {
  return {
    aswapReleaseMsg: codecImpl.aswap.ReleaseMsg.create({
      metadata: { schema: 1 },
      swapId: tx.swapId.data,
      preimage: tx.preimage,
    }),
  };
}

function buildSwapAbortTransaction(tx: SwapAbortTransaction): codecImpl.bnsd.ITx {
  return {
    aswapReturnMsg: codecImpl.aswap.ReturnSwapMsg.create({
      metadata: { schema: 1 },
      swapId: tx.swapId.data,
    }),
  };
}

// Usernames

function encodeChainAddressPair(pair: ChainAddressPair): codecImpl.username.IBlockchainAddress {
  return {
    blockchainId: pair.chainId,
    address: toUtf8(pair.address),
  };
}

function buildRegisterUsernameTx(tx: RegisterUsernameTx): codecImpl.bnsd.ITx {
  if (!tx.username.endsWith("*iov")) {
    throw new Error(
      "Starting with IOV-Core 0.16, the username property needs to be a full human readable address, including the namespace suffix (e.g. '*iov').",
    );
  }

  return {
    usernameRegisterTokenMsg: {
      metadata: { schema: 1 },
      username: tx.username,
      targets: tx.targets.map(encodeChainAddressPair),
    },
  };
}

function buildUpdateTargetsOfUsernameTx(tx: UpdateTargetsOfUsernameTx): codecImpl.bnsd.ITx {
  return {
    usernameChangeTokenTargetsMsg: {
      metadata: { schema: 1 },
      username: tx.username,
      newTargets: tx.targets.map(encodeChainAddressPair),
    },
  };
}

// Multisignature contracts

function buildCreateMultisignatureTx(tx: CreateMultisignatureTx): codecImpl.bnsd.ITx {
  return {
    multisigCreateMsg: {
      metadata: { schema: 1 },
      participants: encodeParticipants(tx.participants),
      activationThreshold: tx.activationThreshold,
      adminThreshold: tx.adminThreshold,
    },
  };
}

function buildUpdateMultisignatureTx(tx: UpdateMultisignatureTx): codecImpl.bnsd.ITx {
  return {
    multisigUpdateMsg: {
      metadata: { schema: 1 },
      contractId: tx.contractId,
      participants: encodeParticipants(tx.participants),
      activationThreshold: tx.activationThreshold,
      adminThreshold: tx.adminThreshold,
    },
  };
}

// Escrows

function buildCreateEscrowTx(tx: CreateEscrowTx): codecImpl.bnsd.ITx {
  return {
    escrowCreateMsg: {
      metadata: { schema: 1 },
      source: decodeBnsAddress(tx.sender).data,
      arbiter: decodeBnsAddress(tx.arbiter).data,
      destination: decodeBnsAddress(tx.recipient).data,
      amount: tx.amounts.map(encodeAmount),
      timeout: encodeInt(tx.timeout.timestamp),
      memo: encodeString(tx.memo),
    },
  };
}

function buildReleaseEscrowTx(tx: ReleaseEscrowTx): codecImpl.bnsd.ITx {
  return {
    escrowReleaseMsg: {
      metadata: { schema: 1 },
      escrowId: tx.escrowId,
      amount: tx.amounts.map(encodeAmount),
    },
  };
}

function buildReturnEscrowTx(tx: ReturnEscrowTx): codecImpl.bnsd.ITx {
  return {
    escrowReturnMsg: {
      metadata: { schema: 1 },
      escrowId: tx.escrowId,
    },
  };
}

function buildUpdateEscrowPartiesTx(tx: UpdateEscrowPartiesTx): codecImpl.bnsd.ITx {
  const numPartiesToUpdate = [tx.sender, tx.arbiter, tx.recipient].filter(Boolean).length;
  if (numPartiesToUpdate !== 1) {
    throw new Error(`Only one party can be updated at a time, got ${numPartiesToUpdate}`);
  }
  return {
    escrowUpdatePartiesMsg: {
      metadata: { schema: 1 },
      escrowId: tx.escrowId,
      source: tx.sender && decodeBnsAddress(tx.sender).data,
      arbiter: tx.arbiter && decodeBnsAddress(tx.arbiter).data,
      destination: tx.recipient && decodeBnsAddress(tx.recipient).data,
    },
  };
}

// Governance

// tslint:disable-next-line: readonly-array
function encodeValidators(validators: Validators): codecImpl.weave.IValidatorUpdate[] {
  return Object.entries(validators).map(([key, { power }]) => {
    const matches = key.match(/^ed25519_([0-9a-fA-F]{64})$/);
    if (!matches) {
      throw new Error("Got validators object key of unexpected format. Must be 'ed25519_<pubkey_hex>'");
    }

    return {
      pubKey: { data: Encoding.fromHex(matches[1]) },
      power: power,
    };
  });
}

function buildCreateProposalTx(tx: CreateProposalTx): codecImpl.bnsd.ITx {
  let option: codecImpl.bnsd.IProposalOptions;
  if (isCreateTextResolution(tx.action)) {
    option = {
      govCreateTextResolutionMsg: {
        metadata: { schema: 1 },
        resolution: tx.action.resolution,
      },
    };
  } else if (isSetValidators(tx.action)) {
    option = {
      validatorsApplyDiffMsg: {
        metadata: { schema: 1 },
        validatorUpdates: encodeValidators(tx.action.validatorUpdates),
      },
    };
  } else if (isUpdateElectorate(tx.action)) {
    option = {
      govUpdateElectorateMsg: {
        metadata: { schema: 1 },
        electorateId: encodeNumericId(tx.action.electorateId),
        diffElectors: Object.entries(tx.action.diffElectors).map(([address, { weight }]) => ({
          address: decodeBnsAddress(address as Address).data,
          weight: weight,
        })),
      },
    };
  } else {
    throw new Error("Got unsupported type of ProposalOption");
  }

  return {
    govCreateProposalMsg: {
      metadata: { schema: 1 },
      title: tx.title,
      rawOption: codecImpl.bnsd.ProposalOptions.encode(option).finish(),
      description: tx.description,
      electionRuleId: encodeNumericId(tx.electionRuleId),
      startTime: tx.startTime,
      author: decodeBnsAddress(tx.author).data,
    },
  };
}

function encodeVoteOption(option: VoteOption): codecImpl.gov.VoteOption {
  switch (option) {
    case VoteOption.Yes:
      return codecImpl.gov.VoteOption.VOTE_OPTION_YES;
    case VoteOption.No:
      return codecImpl.gov.VoteOption.VOTE_OPTION_NO;
    case VoteOption.Abstain:
      return codecImpl.gov.VoteOption.VOTE_OPTION_ABSTAIN;
  }
}

function buildVoteTx(tx: VoteTx): codecImpl.bnsd.ITx {
  return {
    govVoteMsg: {
      metadata: { schema: 1 },
      proposalId: encodeNumericId(tx.proposalId),
      selected: encodeVoteOption(tx.selection),
    },
  };
}

function buildTallyTx(tx: TallyTx): codecImpl.bnsd.ITx {
  return {
    govTallyMsg: {
      metadata: { schema: 1 },
      proposalId: encodeNumericId(tx.proposalId),
    },
  };
}

export function buildMsg(tx: UnsignedTransaction): codecImpl.bnsd.ITx {
  if (!isBnsTx(tx)) {
    throw new Error("Transaction is not a BNS transaction");
  }

  switch (tx.kind) {
    // BCP: Token sends
    case "bcp/send":
      return buildSendTransaction(tx);

    // BCP: Atomic swaps
    case "bcp/swap_offer":
      return buildSwapOfferTx(tx);
    case "bcp/swap_claim":
      return buildSwapClaimTx(tx);
    case "bcp/swap_abort":
      return buildSwapAbortTransaction(tx);

    // BNS: Usernames
    case "bns/register_username":
      return buildRegisterUsernameTx(tx);
    case "bns/update_targets_of_username":
      return buildUpdateTargetsOfUsernameTx(tx);

    // BNS: Multisignature contracts
    case "bns/create_multisignature_contract":
      return buildCreateMultisignatureTx(tx);
    case "bns/update_multisignature_contract":
      return buildUpdateMultisignatureTx(tx);

    // BNS: Escrows
    case "bns/create_escrow":
      return buildCreateEscrowTx(tx);
    case "bns/release_escrow":
      return buildReleaseEscrowTx(tx);
    case "bns/return_escrow":
      return buildReturnEscrowTx(tx);
    case "bns/update_escrow_parties":
      return buildUpdateEscrowPartiesTx(tx);

    // BNS: Governance
    case "bns/create_proposal":
      return buildCreateProposalTx(tx);
    case "bns/vote":
      return buildVoteTx(tx);
    case "bns/tally":
      return buildTallyTx(tx);

    default:
      throw new Error("Received transaction of unsupported kind.");
  }
}

export function buildUnsignedTx(tx: UnsignedTransaction): codecImpl.bnsd.ITx {
  const msg = buildMsg(tx);
  return codecImpl.bnsd.Tx.create({
    ...msg,
    fees:
      tx.fee && tx.fee.tokens
        ? {
            fees: encodeAmount(tx.fee.tokens),
            payer: decodeBnsAddress(identityToAddress(tx.creator)).data,
          }
        : null,
  });
}

export function buildSignedTx(tx: SignedTransaction): codecImpl.bnsd.ITx {
  const sigs: readonly FullSignature[] = [tx.primarySignature, ...tx.otherSignatures];
  const built = buildUnsignedTx(tx.transaction);
  return { ...built, signatures: sigs.map(encodeFullSignature) };
}
