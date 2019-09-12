import BN from "bn.js";

/**
 * A type for arbitrary precision, non-negative decimals.
 *
 * Instances of this class are immutable.
 */
export class Decimal {
  public static fromUserInput(input: string, fractionalDigits: number): Decimal {
    if (!Number.isInteger(fractionalDigits)) throw new Error("Fractional digits is not an integer");
    if (fractionalDigits < 0) throw new Error("Fractional digits must not be negative");

    for (let index = 0; index < input.length; index++) {
      if (!input[index].match(/^[0-9.]$/)) {
        throw new Error(`Invalid character at position ${index + 1}`);
      }
    }

    const parts = input.split(".");
    if (parts.length > 2) throw new Error("More than one separator found");

    const whole = parts[0] || "";
    const fractional = (parts[1] || "").replace(/0+$/, "");

    if (fractional.length > fractionalDigits) {
      throw new Error("Got more fractional digits than supported");
    }

    const quantity = `${whole}${fractional.padEnd(fractionalDigits, "0")}`;

    return new Decimal(quantity, fractionalDigits);
  }

  public get atomics(): string {
    return this.data.atomics.toString();
  }

  private readonly data: {
    readonly atomics: BN;
    readonly fractionalDigits: number;
  };

  private constructor(atomics: string, fractionalDigits: number) {
    this.data = {
      atomics: new BN(atomics),
      fractionalDigits: fractionalDigits,
    };
  }
}
