import * as bip39 from "bip39";
// tslint:disable-next-line:no-submodule-imports
import bip39WordlistEnglish from "bip39/wordlists/english.json";

export class EnglishMnemonic {
  // list of space separated lower case words (1 or more)
  private static readonly mnemonicMatcher = /^[a-z]+( [a-z]+)*$/;

  private readonly data: string;

  public constructor(mnemonic: string) {
    if (!EnglishMnemonic.mnemonicMatcher.test(mnemonic)) {
      throw new Error("Invalid mnemonic format");
    }

    const words = mnemonic.split(" ");
    const allowedWordsLengths: readonly number[] = [12, 15, 18, 21, 24];
    if (allowedWordsLengths.indexOf(words.length) === -1) {
      throw new Error(
        `Invalid word count in mnemonic (allowed: ${allowedWordsLengths} got: ${words.length})`,
      );
    }

    for (const word of words) {
      if ((bip39WordlistEnglish as readonly string[]).indexOf(word) === -1) {
        throw new Error("Mnemonic contains invalid word");
      }
    }

    // Throws with informative error message if mnemonic is not valid
    // tslint:disable-next-line:no-unused-expression
    bip39.mnemonicToEntropy(mnemonic);

    this.data = mnemonic;
  }

  public asString(): string {
    return this.data;
  }
}
