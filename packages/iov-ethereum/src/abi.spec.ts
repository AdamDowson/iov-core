import { Address } from "@iov/bcp";
import { Encoding } from "@iov/encoding";

import { Abi } from "./abi";

const { fromHex } = Encoding;

describe("Abi", () => {
  describe("encodeAddress", () => {
    it("works", () => {
      {
        const address = "0x0000000000000000000000000000000000000000" as Address;
        expect(Abi.encodeAddress(address)).toEqual(
          fromHex("0000000000000000000000000000000000000000000000000000000000000000"),
        );
      }
      {
        const address = "0x43aa18FAAE961c23715735682dC75662d90F4DDe" as Address;
        expect(Abi.encodeAddress(address)).toEqual(
          fromHex("00000000000000000000000043aa18faae961c23715735682dc75662d90f4dde"),
        );
      }
    });

    it("throws for invalid address", () => {
      // wrong prefix missing
      expect(() => Abi.encodeAddress("0000000000000000000000000000000000000000" as Address)).toThrowError(
        /invalid address/i,
      );
      expect(() => Abi.encodeAddress("0X0000000000000000000000000000000000000000" as Address)).toThrowError(
        /invalid address/i,
      );
      // wrong length
      expect(() => Abi.encodeAddress("0x" as Address)).toThrowError(/invalid address/i);
      expect(() => Abi.encodeAddress("0x00000000000000000000000000000000000000" as Address)).toThrowError(
        /invalid address/i,
      );
      expect(() => Abi.encodeAddress("0x000000000000000000000000000000000000000000" as Address)).toThrowError(
        /invalid address/i,
      );
      // wrong checksum
      expect(() => Abi.encodeAddress("0x43aa18FAAE961c23715735682dC75662d90F4DDE" as Address)).toThrowError(
        /invalid address/i,
      );
    });
  });

  describe("decodeHeadTail", () => {
    it("works for single string", () => {
      const data = fromHex(
        `
        0000000000000000000000000000000000000000000000000000000000000020
        0000000000000000000000000000000000000000000000000000000000000003
        4153480000000000000000000000000000000000000000000000000000000000
      `.replace(/\s+/g, ""),
      );
      const result = Abi.decodeHeadTail(data);
      expect(result).toEqual({
        head: [32],
        tail: [
          fromHex(
            "00000000000000000000000000000000000000000000000000000000000000034153480000000000000000000000000000000000000000000000000000000000",
          ),
        ],
      });
    });

    it("works for multiple numbers", () => {
      // data from https://medium.com/@hayeah/how-to-decipher-a-smart-contract-method-call-8ee980311603
      const data = fromHex(
        `
          0000000000000000000000000000000000000000000000000000000000000060
          00000000000000000000000000000000000000000000000000000000000000e0
          0000000000000000000000000000000000000000000000000000000000000160
          0000000000000000000000000000000000000000000000000000000000000003
          00000000000000000000000000000000000000000000000000000000000000a1
          00000000000000000000000000000000000000000000000000000000000000a2
          00000000000000000000000000000000000000000000000000000000000000a3
          0000000000000000000000000000000000000000000000000000000000000003
          00000000000000000000000000000000000000000000000000000000000000b1
          00000000000000000000000000000000000000000000000000000000000000b2
          00000000000000000000000000000000000000000000000000000000000000b3
          0000000000000000000000000000000000000000000000000000000000000003
          00000000000000000000000000000000000000000000000000000000000000c1
          00000000000000000000000000000000000000000000000000000000000000c2
          00000000000000000000000000000000000000000000000000000000000000c3
        `.replace(/\s+/g, ""),
      );
      const result = Abi.decodeHeadTail(data);
      expect(result).toEqual({
        head: [96, 224, 352],
        tail: [
          fromHex(
            "000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000a100000000000000000000000000000000000000000000000000000000000000a200000000000000000000000000000000000000000000000000000000000000a3",
          ),
          fromHex(
            "000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000b100000000000000000000000000000000000000000000000000000000000000b200000000000000000000000000000000000000000000000000000000000000b3",
          ),
          fromHex(
            "000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000c100000000000000000000000000000000000000000000000000000000000000c200000000000000000000000000000000000000000000000000000000000000c3",
          ),
        ],
      });
    });

    it("throws for empty input", () => {
      expect(() => Abi.decodeHeadTail(new Uint8Array([]))).toThrowError(/input data empty/i);
    });

    it("throws for input not divisible by 32", () => {
      // 1, 31, 33
      expect(() => Abi.decodeHeadTail(fromHex("00"))).toThrowError(/input data length not divisible by 32/i);
      expect(() =>
        Abi.decodeHeadTail(fromHex("00000000000000000000000000000000000000000000000000000000000000")),
      ).toThrowError(/input data length not divisible by 32/i);
      expect(() =>
        Abi.decodeHeadTail(fromHex("000000000000000000000000000000000000000000000000000000000000000000")),
      ).toThrowError(/input data length not divisible by 32/i);
    });

    it("throws for invalid head length", () => {
      // 0
      expect(() =>
        Abi.decodeHeadTail(fromHex("0000000000000000000000000000000000000000000000000000000000000000")),
      ).toThrowError(/invalid head length/i);
      // not divisible by 32
      expect(() =>
        Abi.decodeHeadTail(fromHex("0000000000000000000000000000000000000000000000000000000000000000")),
      ).toThrowError(/invalid head length/i);
      expect(() =>
        Abi.decodeHeadTail(fromHex("0000000000000000000000000000000000000000000000000000000000000001")),
      ).toThrowError(/invalid head length/i);
      expect(() =>
        Abi.decodeHeadTail(fromHex("0000000000000000000000000000000000000000000000000000000000000019")),
      ).toThrowError(/invalid head length/i);
      // outside of content
      expect(() =>
        Abi.decodeHeadTail(fromHex("0000000000000000000000000000000000000000000000000000000000000020")),
      ).toThrowError(/invalid head length/i);
      expect(() =>
        Abi.decodeHeadTail(
          fromHex(
            "00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000000",
          ),
        ),
      ).toThrowError(/invalid head length/i);
    });

    it("throws for start position inside of header", () => {
      // Second start position 32 (0x20) lower than first argument start position 64 (0x40)
      expect(() =>
        Abi.decodeHeadTail(
          fromHex(
            "000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000",
          ),
        ),
      ).toThrowError(/start position inside the header/i);
    });
  });

  describe("decodeVariableLength", () => {
    it("works for a three byte string", () => {
      const data = fromHex(
        `
        0000000000000000000000000000000000000000000000000000000000000003
        4153480000000000000000000000000000000000000000000000000000000000
      `.replace(/\s+/g, ""),
      );
      const result = Abi.decodeVariableLength(data);
      expect(result).toEqual(fromHex("415348"));
    });

    it("works for 48 byte string", () => {
      const data = fromHex(
        `
        0000000000000000000000000000000000000000000000000000000000000030
        6161616161616161616161616161616161616161616161616161616161616161
        6161616161616161616161616161616100000000000000000000000000000000
      `.replace(/\s+/g, ""),
      );
      const result = Abi.decodeVariableLength(data);
      expect(result).toEqual(
        fromHex(
          "616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161616161",
        ),
      );
    });

    it("works for 0 byte string", () => {
      const data = fromHex(
        `
        0000000000000000000000000000000000000000000000000000000000000000
      `.replace(/\s+/g, ""),
      );
      const result = Abi.decodeVariableLength(data);
      expect(result).toEqual(fromHex(""));
    });
  });
});