import { Slip10RawIndex } from "@iov/crypto";

import { HdPaths } from "./hdpaths";

describe("HdPaths", () => {
  it("has working simple address implementation", () => {
    expect(HdPaths.simpleAddress(0)).toEqual([Slip10RawIndex.hardened(4804438), Slip10RawIndex.hardened(0)]);
    expect(HdPaths.simpleAddress(1)).toEqual([Slip10RawIndex.hardened(4804438), Slip10RawIndex.hardened(1)]);
    expect(HdPaths.simpleAddress(2)).toEqual([Slip10RawIndex.hardened(4804438), Slip10RawIndex.hardened(2)]);
  });

  it("has working bip44 implementation", () => {
    // m/44'/1'/2'/3/4
    expect(HdPaths.bip44(1, 2, 3, 4)).toEqual([
      Slip10RawIndex.hardened(44),
      Slip10RawIndex.hardened(1),
      Slip10RawIndex.hardened(2),
      Slip10RawIndex.normal(3),
      Slip10RawIndex.normal(4),
    ]);
  });

  it("has working bip44Like implementation", () => {
    // m/44'/33'/22'
    expect(HdPaths.bip44Like(33, 22)).toEqual([
      Slip10RawIndex.hardened(44),
      Slip10RawIndex.hardened(33),
      Slip10RawIndex.hardened(22),
    ]);
  });

  it("has working iov implementation", () => {
    // m/44'/234'/0'
    expect(HdPaths.iov(0)).toEqual([
      Slip10RawIndex.hardened(44),
      Slip10RawIndex.hardened(234),
      Slip10RawIndex.hardened(0),
    ]);
    // m/44'/234'/1'
    expect(HdPaths.iov(1)).toEqual([
      Slip10RawIndex.hardened(44),
      Slip10RawIndex.hardened(234),
      Slip10RawIndex.hardened(1),
    ]);
  });

  it("has working Ethereum implementation", () => {
    // m/44'/60'/0'/0/0
    expect(HdPaths.ethereum(0)).toEqual([
      Slip10RawIndex.hardened(44),
      Slip10RawIndex.hardened(60),
      Slip10RawIndex.hardened(0),
      Slip10RawIndex.normal(0),
      Slip10RawIndex.normal(0),
    ]);
    // m/44'/60'/0'/0/123
    expect(HdPaths.ethereum(123)).toEqual([
      Slip10RawIndex.hardened(44),
      Slip10RawIndex.hardened(60),
      Slip10RawIndex.hardened(0),
      Slip10RawIndex.normal(0),
      Slip10RawIndex.normal(123),
    ]);
  });

  it("has working MetaMask 'HD Key Tree' implementation", () => {
    // m/44'/60'/0'/0/0
    expect(HdPaths.metamaskHdKeyTree(0)).toEqual([
      Slip10RawIndex.hardened(44),
      Slip10RawIndex.hardened(60),
      Slip10RawIndex.hardened(0),
      Slip10RawIndex.normal(0),
      Slip10RawIndex.normal(0),
    ]);
    // m/44'/60'/0'/0/123
    expect(HdPaths.metamaskHdKeyTree(123)).toEqual([
      Slip10RawIndex.hardened(44),
      Slip10RawIndex.hardened(60),
      Slip10RawIndex.hardened(0),
      Slip10RawIndex.normal(0),
      Slip10RawIndex.normal(123),
    ]);
  });
});
