import {
  Address,
  Algorithm,
  Amount,
  ChainId,
  FullSignature,
  Hash,
  Nonce,
  Preimage,
  PubkeyBundle,
  PubkeyBytes,
  SendTransaction,
  SignatureBytes,
  SignedTransaction,
  SwapAbortTransaction,
  SwapClaimTransaction,
  SwapIdBytes,
  SwapOfferTransaction,
  Token,
  TokenTicker,
  UnsignedTransaction,
  WithCreator,
} from "@iov/bcp";
import { Encoding } from "@iov/encoding";
import BN from "bn.js";
import * as Long from "long";

import * as codecImpl from "./generated/codecimpl";
import {
  ActionKind,
  BnsUsernameNft,
  CashConfiguration,
  ChainAddressPair,
  CreateEscrowTx,
  CreateMultisignatureTx,
  CreateProposalTx,
  ElectionRule,
  Electorate,
  ElectorProperties,
  Electors,
  Fraction,
  Keyed,
  Participant,
  PrivkeyBundle,
  PrivkeyBytes,
  Proposal,
  ProposalAction,
  ProposalExecutorResult,
  ProposalResult,
  ProposalStatus,
  RegisterUsernameTx,
  ReleaseEscrowTx,
  ReturnEscrowTx,
  TallyTx,
  UpdateEscrowPartiesTx,
  UpdateMultisignatureTx,
  UpdateTargetsOfUsernameTx,
  VersionedId,
  VoteOption,
  VoteTx,
} from "./types";
import { addressPrefix, encodeBnsAddress, identityToAddress } from "./util";

const { fromUtf8 } = Encoding;

function decodeString(input: string | null | undefined): string {
  // weave encodes empty strings as null
  return input || "";
}

/**
 * Decodes a protobuf int field (int32/uint32/int64/uint64) into a JavaScript
 * number.
 */
export function asIntegerNumber(maybeLong: Long | number | null | undefined): number {
  if (!maybeLong) {
    return 0;
  } else if (typeof maybeLong === "number") {
    if (!Number.isInteger(maybeLong)) {
      throw new Error("Number is not an integer.");
    }
    return maybeLong;
  } else {
    return maybeLong.toInt();
  }
}

export function ensure<T>(maybe: T | null | undefined, msg?: string): T {
  if (maybe === null || maybe === undefined) {
    throw new Error("missing " + (msg || "field"));
  }
  return maybe;
}

function decodeNumericId(id: Uint8Array): number {
  return new BN(id).toNumber();
}

function decodeVersionedId(versionedId: codecImpl.orm.IVersionedIDRef): VersionedId {
  return {
    id: decodeNumericId(ensure(versionedId.id, "id")),
    version: ensure(versionedId.version, "version"),
  };
}

function decodeChainAddressPair(pair: codecImpl.username.IBlockchainAddress): ChainAddressPair {
  return {
    chainId: ensure(pair.blockchainId, "blockchainId") as ChainId,
    address: fromUtf8(ensure(pair.address, "address")) as Address,
  };
}

export function decodeUsernameNft(
  nft: codecImpl.username.IToken & Keyed,
  registryChainId: ChainId,
): BnsUsernameNft {
  const rawOwnerAddress = ensure(nft.owner, "owner");
  return {
    id: fromUtf8(nft._id),
    owner: encodeBnsAddress(addressPrefix(registryChainId), rawOwnerAddress),
    targets: ensure(nft.targets, "targets").map(decodeChainAddressPair),
  };
}

export function decodeNonce(sequence: Long | number | null | undefined): Nonce {
  return asIntegerNumber(sequence) as Nonce;
}

export function decodeUserData(userData: codecImpl.sigs.IUserData): { readonly nonce: Nonce } {
  return { nonce: decodeNonce(userData.sequence) };
}

export function decodePubkey(publicKey: codecImpl.crypto.IPublicKey): PubkeyBundle {
  if (publicKey.ed25519) {
    return {
      algo: Algorithm.Ed25519,
      data: publicKey.ed25519 as PubkeyBytes,
    };
  } else {
    throw new Error("Unknown public key algorithm");
  }
}

export function decodePrivkey(privateKey: codecImpl.crypto.IPrivateKey): PrivkeyBundle {
  if (privateKey.ed25519) {
    return {
      algo: Algorithm.Ed25519,
      data: privateKey.ed25519 as PrivkeyBytes,
    };
  } else {
    throw new Error("Unknown private key algorithm");
  }
}

export function decodeSignature(signature: codecImpl.crypto.ISignature): SignatureBytes {
  if (signature.ed25519) {
    return signature.ed25519 as SignatureBytes;
  } else {
    throw new Error("Unknown private key algorithm");
  }
}

export function decodeFullSig(sig: codecImpl.sigs.IStdSignature): FullSignature {
  return {
    nonce: decodeNonce(sig.sequence),
    pubkey: decodePubkey(ensure(sig.pubkey)),
    signature: decodeSignature(ensure(sig.signature)),
  };
}

export function decodeToken(data: codecImpl.currency.ITokenInfo & Keyed): Token {
  return {
    tokenTicker: Encoding.fromAscii(data._id) as TokenTicker,
    tokenName: ensure(data.name),
    fractionalDigits: 9, // fixed for all weave tokens
  };
}

export function decodeAmount(coin: codecImpl.coin.ICoin): Amount {
  const fractionalDigits = 9; // fixed for all tokens in BNS

  const wholeNumber = asIntegerNumber(coin.whole);
  if (wholeNumber < 0) {
    throw new Error("Component `whole` must not be negative");
  }

  const fractionalNumber = asIntegerNumber(coin.fractional);
  if (fractionalNumber < 0) {
    throw new Error("Component `fractional` must not be negative");
  }

  const quantity = new BN(wholeNumber)
    .imul(new BN(10 ** fractionalDigits))
    .iadd(new BN(fractionalNumber))
    .toString();

  return {
    quantity: quantity,
    fractionalDigits: fractionalDigits,
    tokenTicker: (coin.ticker || "") as TokenTicker,
  };
}

export function decodeCashConfiguration(config: codecImpl.cash.Configuration): CashConfiguration {
  const minimalFee = decodeAmount(ensure(config.minimalFee, "minimalFee"));
  return {
    minimalFee: minimalFee,
  };
}

export function decodeParticipants(
  prefix: "iov" | "tiov",
  // tslint:disable-next-line:readonly-array
  maybeParticipants?: codecImpl.multisig.IParticipant[] | null,
): readonly Participant[] {
  const participants = ensure(maybeParticipants, "participants");
  return participants.map((participant, i) => ({
    weight: ensure(participant.weight, `participants.$${i}.weight`),
    address: encodeBnsAddress(prefix, ensure(participant.signature, `participants.$${i}.signature`)),
  }));
}

export function decodeElectorate(
  prefix: "iov" | "tiov",
  electorate: codecImpl.gov.IElectorate & Keyed,
): Electorate {
  const { id } = decodeVersionedId(codecImpl.orm.VersionedIDRef.decode(electorate._id));

  // tslint:disable-next-line: readonly-keyword
  const electors: { [index: string]: ElectorProperties } = {};
  ensure(electorate.electors).forEach((elector, i) => {
    const address = encodeBnsAddress(prefix, ensure(elector.address, `electors.$${i}.address`));
    // tslint:disable-next-line: no-object-mutation
    electors[address] = {
      weight: ensure(elector.weight, `electors.$${i}.weight`),
    };
  });

  return {
    id: id,
    version: asIntegerNumber(ensure(electorate.version, "version")),
    admin: encodeBnsAddress(prefix, ensure(electorate.admin, "admin")),
    title: ensure(electorate.title, "title"), // must not be an empty string
    electors: electors,
    totalWeight: asIntegerNumber(electorate.totalElectorateWeight),
  };
}

function decodeFraction(fraction: codecImpl.gov.IFraction): Fraction {
  const numerator = asIntegerNumber(fraction.numerator);
  const denominator = asIntegerNumber(fraction.denominator);
  if (denominator === 0) {
    throw new Error("Denominator must not be 0");
  }
  return { numerator: numerator, denominator: denominator };
}

export function decodeElectionRule(
  prefix: "iov" | "tiov",
  rule: codecImpl.gov.IElectionRule & Keyed,
): ElectionRule {
  const { id } = decodeVersionedId(codecImpl.orm.VersionedIDRef.decode(rule._id));
  return {
    id: id,
    version: asIntegerNumber(ensure(rule.version, "version")),
    admin: encodeBnsAddress(prefix, ensure(rule.admin, "admin")),
    electorateId: decodeNumericId(ensure(rule.electorateId, "electorateId")),
    title: ensure(rule.title, "title"), // must not be an empty string
    votingPeriod: asIntegerNumber(ensure(rule.votingPeriod, "votingPeriod")),
    threshold: decodeFraction(ensure(rule.threshold, "threshold")),
    quorum: rule.quorum ? decodeFraction(rule.quorum) : null,
  };
}

function decodeElectors(prefix: "iov" | "tiov", electors: readonly codecImpl.gov.IElector[]): Electors {
  const map: Electors = {};
  return electors.reduce((accumulator, elector) => {
    const address = encodeBnsAddress(prefix, ensure(elector.address, "address"));
    return {
      ...accumulator,
      [address]: { weight: ensure(elector.weight, "weight") },
    };
  }, map);
}

function decodeProposalExecutorResult(result: codecImpl.gov.Proposal.ExecutorResult): ProposalExecutorResult {
  switch (result) {
    case codecImpl.gov.Proposal.ExecutorResult.PROPOSAL_EXECUTOR_RESULT_INVALID:
      throw new Error("PROPOSAL_EXECUTOR_RESULT_INVALID is not allowed");
    case codecImpl.gov.Proposal.ExecutorResult.PROPOSAL_EXECUTOR_RESULT_NOT_RUN:
      return ProposalExecutorResult.NotRun;
    case codecImpl.gov.Proposal.ExecutorResult.PROPOSAL_EXECUTOR_RESULT_SUCCESS:
      return ProposalExecutorResult.Succeeded;
    case codecImpl.gov.Proposal.ExecutorResult.PROPOSAL_EXECUTOR_RESULT_FAILURE:
      return ProposalExecutorResult.Failed;
    default:
      throw new Error("Received unknown value for proposal executor result");
  }
}

function decodeProposalResult(result: codecImpl.gov.Proposal.Result): ProposalResult {
  switch (result) {
    case codecImpl.gov.Proposal.Result.PROPOSAL_RESULT_INVALID:
      throw new Error("PROPOSAL_RESULT_INVALID is not allowed");
    case codecImpl.gov.Proposal.Result.PROPOSAL_RESULT_UNDEFINED:
      return ProposalResult.Undefined;
    case codecImpl.gov.Proposal.Result.PROPOSAL_RESULT_ACCEPTED:
      return ProposalResult.Accepted;
    case codecImpl.gov.Proposal.Result.PROPOSAL_RESULT_REJECTED:
      return ProposalResult.Rejected;
    default:
      throw new Error("Received unknown value for proposal result");
  }
}

function decodeProposalStatus(status: codecImpl.gov.Proposal.Status): ProposalStatus {
  switch (status) {
    case codecImpl.gov.Proposal.Status.PROPOSAL_STATUS_INVALID:
      throw new Error("PROPOSAL_STATUS_INVALID is not allowed");
    case codecImpl.gov.Proposal.Status.PROPOSAL_STATUS_SUBMITTED:
      return ProposalStatus.Submitted;
    case codecImpl.gov.Proposal.Status.PROPOSAL_STATUS_CLOSED:
      return ProposalStatus.Closed;
    case codecImpl.gov.Proposal.Status.PROPOSAL_STATUS_WITHDRAWN:
      return ProposalStatus.Withdrawn;
    default:
      throw new Error("Received unknown value for proposal status");
  }
}

function decodeRawProposalOption(prefix: "iov" | "tiov", rawOption: Uint8Array): ProposalAction {
  const option = codecImpl.bnsd.ProposalOptions.decode(rawOption);
  if (option.govCreateTextResolutionMsg) {
    return {
      kind: ActionKind.CreateTextResolution,
      resolution: decodeString(option.govCreateTextResolutionMsg.resolution),
    };
  } else if (option.govUpdateElectorateMsg) {
    return {
      kind: ActionKind.UpdateElectorate,
      electorateId: decodeNumericId(ensure(option.govUpdateElectorateMsg.electorateId, "electorateId")),
      diffElectors: decodeElectors(
        prefix,
        ensure(option.govUpdateElectorateMsg.diffElectors, "diffElectors"),
      ),
    };
  } else {
    throw new Error("Unsupported ProposalOptions");
  }
}

export function decodeProposal(prefix: "iov" | "tiov", proposal: codecImpl.gov.IProposal & Keyed): Proposal {
  const voteState = ensure(proposal.voteState, "voteState");
  return {
    id: decodeNumericId(proposal._id),
    title: ensure(proposal.title, "title"),
    action: decodeRawProposalOption(prefix, ensure(proposal.rawOption, "rawOption")),
    description: ensure(proposal.description, "description"),
    electionRule: decodeVersionedId(ensure(proposal.electionRuleRef, "electionRuleRef")),
    electorate: decodeVersionedId(ensure(proposal.electorateRef, "electorateRef")),
    votingStartTime: asIntegerNumber(ensure(proposal.votingStartTime, "votinStartTime")),
    votingEndTime: asIntegerNumber(ensure(proposal.votingEndTime, "votingEndTime")),
    submissionTime: asIntegerNumber(ensure(proposal.submissionTime, "submissionTime")),
    author: encodeBnsAddress(prefix, ensure(proposal.author, "author")),
    state: {
      totalYes: asIntegerNumber(voteState.totalYes),
      totalNo: asIntegerNumber(voteState.totalNo),
      totalAbstain: asIntegerNumber(voteState.totalAbstain),
      totalElectorateWeight: asIntegerNumber(voteState.totalElectorateWeight),
    },
    status: decodeProposalStatus(ensure(proposal.status, "status")),
    result: decodeProposalResult(ensure(proposal.result, "result")),
    executorResult: decodeProposalExecutorResult(ensure(proposal.executorResult, "executorResult")),
  };
}

// Token sends

function parseSendTransaction(
  base: UnsignedTransaction,
  msg: codecImpl.cash.ISendMsg,
): SendTransaction & WithCreator {
  const prefix = addressPrefix(base.creator.chainId);
  return {
    ...base,
    kind: "bcp/send",
    sender: identityToAddress(base.creator),
    recipient: encodeBnsAddress(prefix, ensure(msg.destination, "destination")),
    amount: decodeAmount(ensure(msg.amount)),
    memo: msg.memo || undefined,
  };
}

// Atomic swaps

function parseSwapOfferTx(
  base: UnsignedTransaction,
  msg: codecImpl.aswap.ICreateMsg,
): SwapOfferTransaction & WithCreator {
  const hash = ensure(msg.preimageHash, "preimageHash");
  if (hash.length !== 32) {
    throw new Error("Hash must be 32 bytes (sha256)");
  }
  const prefix = addressPrefix(base.creator.chainId);
  return {
    ...base,
    kind: "bcp/swap_offer",
    hash: hash as Hash,
    recipient: encodeBnsAddress(prefix, ensure(msg.destination, "destination")),
    timeout: { timestamp: asIntegerNumber(ensure(msg.timeout, "timeout")) },
    amounts: (msg.amount || []).map(decodeAmount),
  };
}

function parseSwapClaimTx(
  base: UnsignedTransaction,
  msg: codecImpl.aswap.IReleaseMsg,
): SwapClaimTransaction & WithCreator {
  return {
    ...base,
    kind: "bcp/swap_claim",
    swapId: {
      data: ensure(msg.swapId) as SwapIdBytes,
    },
    preimage: ensure(msg.preimage) as Preimage,
  };
}

function parseSwapAbortTransaction(
  base: UnsignedTransaction,
  msg: codecImpl.aswap.IReturnSwapMsg,
): SwapAbortTransaction & WithCreator {
  return {
    ...base,
    kind: "bcp/swap_abort",
    swapId: {
      data: ensure(msg.swapId) as SwapIdBytes,
    },
  };
}

// Usernames

function parseRegisterUsernameTx(
  base: UnsignedTransaction,
  msg: codecImpl.username.IRegisterTokenMsg,
): RegisterUsernameTx & WithCreator {
  const targets = ensure(msg.targets, "targets").map(decodeChainAddressPair);
  return {
    ...base,
    kind: "bns/register_username",
    username: ensure(msg.username, "username"),
    targets: targets,
  };
}

function parseUpdateTargetsOfUsernameTx(
  base: UnsignedTransaction,
  msg: codecImpl.username.IChangeTokenTargetsMsg,
): UpdateTargetsOfUsernameTx & WithCreator {
  const targets = ensure(msg.newTargets, "newTargets").map(decodeChainAddressPair);
  return {
    ...base,
    kind: "bns/update_targets_of_username",
    username: ensure(msg.username, "username"),
    targets: targets,
  };
}

// Multisignature contracts

function parseCreateMultisignatureTx(
  base: UnsignedTransaction,
  msg: codecImpl.multisig.ICreateMsg,
): CreateMultisignatureTx & WithCreator {
  const prefix = addressPrefix(base.creator.chainId);
  return {
    ...base,
    kind: "bns/create_multisignature_contract",
    participants: decodeParticipants(prefix, msg.participants),
    activationThreshold: ensure(msg.activationThreshold, "activationThreshold"),
    adminThreshold: ensure(msg.adminThreshold, "adminThreshold"),
  };
}

function parseUpdateMultisignatureTx(
  base: UnsignedTransaction,
  msg: codecImpl.multisig.IUpdateMsg,
): UpdateMultisignatureTx & WithCreator {
  const prefix = addressPrefix(base.creator.chainId);
  return {
    ...base,
    kind: "bns/update_multisignature_contract",
    contractId: ensure(msg.contractId, "contractId"),
    participants: decodeParticipants(prefix, msg.participants),
    activationThreshold: ensure(msg.activationThreshold, "activationThreshold"),
    adminThreshold: ensure(msg.adminThreshold, "adminThreshold"),
  };
}

// Escrows

function parseCreateEscrowTx(
  base: UnsignedTransaction,
  msg: codecImpl.escrow.ICreateMsg,
): CreateEscrowTx & WithCreator {
  const prefix = addressPrefix(base.creator.chainId);
  return {
    ...base,
    kind: "bns/create_escrow",
    sender: encodeBnsAddress(prefix, ensure(msg.source, "source")),
    arbiter: encodeBnsAddress(prefix, ensure(msg.arbiter, "arbiter")),
    recipient: encodeBnsAddress(prefix, ensure(msg.destination, "destination")),
    amounts: ensure(msg.amount, "amount").map(decodeAmount),
    timeout: { timestamp: asIntegerNumber(ensure(msg.timeout, "timeout")) },
    memo: msg.memo !== null ? msg.memo : undefined,
  };
}

function parseReleaseEscrowTx(
  base: UnsignedTransaction,
  msg: codecImpl.escrow.IReleaseMsg,
): ReleaseEscrowTx & WithCreator {
  return {
    ...base,
    kind: "bns/release_escrow",
    escrowId: ensure(msg.escrowId, "escrowId"),
    amounts: ensure(msg.amount, "amount").map(decodeAmount),
  };
}

function parseReturnEscrowTx(
  base: UnsignedTransaction,
  msg: codecImpl.escrow.IReturnMsg,
): ReturnEscrowTx & WithCreator {
  return {
    ...base,
    kind: "bns/return_escrow",
    escrowId: ensure(msg.escrowId, "escrowId"),
  };
}

function parseUpdateEscrowPartiesTx(
  base: UnsignedTransaction,
  msg: codecImpl.escrow.IUpdatePartiesMsg,
): UpdateEscrowPartiesTx & WithCreator {
  const prefix = addressPrefix(base.creator.chainId);
  return {
    ...base,
    kind: "bns/update_escrow_parties",
    escrowId: ensure(msg.escrowId, "escrowId"),
    sender: msg.source ? encodeBnsAddress(prefix, msg.source) : undefined,
    arbiter: msg.arbiter ? encodeBnsAddress(prefix, msg.arbiter) : undefined,
    recipient: msg.destination ? encodeBnsAddress(prefix, msg.destination) : undefined,
  };
}

// Governance

function parseCreateProposalTx(
  base: UnsignedTransaction,
  msg: codecImpl.gov.ICreateProposalMsg,
): CreateProposalTx & WithCreator {
  const prefix = addressPrefix(base.creator.chainId);
  return {
    ...base,
    kind: "bns/create_proposal",
    title: ensure(msg.title, "title"),
    action: decodeRawProposalOption(prefix, ensure(msg.rawOption, "rawOption")),
    description: ensure(msg.description, "description"),
    electionRuleId: decodeNumericId(ensure(msg.electionRuleId, "electionRuleId")),
    startTime: asIntegerNumber(ensure(msg.startTime, "startTime")),
    author: encodeBnsAddress(prefix, ensure(msg.author, "author")),
  };
}

function decodeVoteOption(option: codecImpl.gov.VoteOption): VoteOption {
  switch (option) {
    case codecImpl.gov.VoteOption.VOTE_OPTION_INVALID:
      throw new Error("VOTE_OPTION_INVALID is not allowed");
    case codecImpl.gov.VoteOption.VOTE_OPTION_YES:
      return VoteOption.Yes;
    case codecImpl.gov.VoteOption.VOTE_OPTION_NO:
      return VoteOption.No;
    case codecImpl.gov.VoteOption.VOTE_OPTION_ABSTAIN:
      return VoteOption.Abstain;
    default:
      throw new Error("Received unknown value for vote option");
  }
}

function parseVoteTx(base: UnsignedTransaction, msg: codecImpl.gov.IVoteMsg): VoteTx & WithCreator {
  return {
    ...base,
    kind: "bns/vote",
    proposalId: decodeNumericId(ensure(msg.proposalId, "proposalId")),
    selection: decodeVoteOption(ensure(msg.selected, "selected")),
  };
}

function parseTallyTx(base: UnsignedTransaction, msg: codecImpl.gov.ITallyMsg): TallyTx & WithCreator {
  return {
    ...base,
    kind: "bns/tally",
    proposalId: decodeNumericId(ensure(msg.proposalId, "proposalId")),
  };
}

export function parseMsg(base: UnsignedTransaction, tx: codecImpl.bnsd.ITx): UnsignedTransaction {
  // Token sends
  if (tx.cashSendMsg) return parseSendTransaction(base, tx.cashSendMsg);

  // Atomic swaps
  if (tx.aswapCreateMsg) return parseSwapOfferTx(base, tx.aswapCreateMsg);
  if (tx.aswapReleaseMsg) return parseSwapClaimTx(base, tx.aswapReleaseMsg);
  if (tx.aswapReturnMsg) return parseSwapAbortTransaction(base, tx.aswapReturnMsg);

  // Usernames
  if (tx.usernameRegisterTokenMsg) return parseRegisterUsernameTx(base, tx.usernameRegisterTokenMsg);
  if (tx.usernameChangeTokenTargetsMsg) {
    return parseUpdateTargetsOfUsernameTx(base, tx.usernameChangeTokenTargetsMsg);
  }

  // Multisignature contracts
  if (tx.multisigCreateMsg) return parseCreateMultisignatureTx(base, tx.multisigCreateMsg);
  if (tx.multisigUpdateMsg) return parseUpdateMultisignatureTx(base, tx.multisigUpdateMsg);

  // Escrows
  if (tx.escrowCreateMsg) return parseCreateEscrowTx(base, tx.escrowCreateMsg);
  if (tx.escrowReleaseMsg) return parseReleaseEscrowTx(base, tx.escrowReleaseMsg);
  if (tx.escrowReturnMsg) return parseReturnEscrowTx(base, tx.escrowReturnMsg);
  if (tx.escrowUpdatePartiesMsg) return parseUpdateEscrowPartiesTx(base, tx.escrowUpdatePartiesMsg);

  // Governance
  if (tx.govCreateProposalMsg) return parseCreateProposalTx(base, tx.govCreateProposalMsg);
  if (tx.govVoteMsg) return parseVoteTx(base, tx.govVoteMsg);
  if (tx.govTallyMsg) return parseTallyTx(base, tx.govTallyMsg);

  throw new Error("unknown message type in transaction");
}

function parseBaseTx(tx: codecImpl.bnsd.ITx, sig: FullSignature, chainId: ChainId): UnsignedTransaction {
  const base: UnsignedTransaction = {
    kind: "",
    creator: {
      chainId: chainId,
      pubkey: sig.pubkey,
    },
  };
  if (tx.fees && tx.fees.fees) {
    return { ...base, fee: { tokens: decodeAmount(tx.fees.fees) } };
  }
  return base;
}

export function parseTx(tx: codecImpl.bnsd.ITx, chainId: ChainId): SignedTransaction {
  const sigs = ensure(tx.signatures, "signatures").map(decodeFullSig);
  const sig = ensure(sigs[0], "first signature");
  return {
    transaction: parseMsg(parseBaseTx(tx, sig, chainId), tx),
    primarySignature: sig,
    otherSignatures: sigs.slice(1),
  };
}
