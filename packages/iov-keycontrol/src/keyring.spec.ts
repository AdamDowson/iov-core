import { Ed25519, Ed25519Keypair, Random } from "@iov/crypto";
import { Encoding } from "@iov/encoding";

import { HdPaths } from "./hdpaths";
import { Keyring, KeyringSerializationString } from "./keyring";
import { Ed25519HdWallet, Ed25519Wallet, Secp256k1HdWallet } from "./keyring-entries";

const { fromHex } = Encoding;

async function makeRandomEd25519Keypair(): Promise<Ed25519Keypair> {
  return Ed25519.makeKeypair(await Random.getBytes(32));
}

describe("Keyring", () => {
  it("can be constructed", () => {
    const keyring = new Keyring();
    expect(keyring).toBeTruthy();
  });

  it("is empty after construction", () => {
    const keyring = new Keyring();
    expect(keyring.getEntries().length).toEqual(0);
  });

  it("can add one entry", () => {
    const keyring = new Keyring();
    const entry = Ed25519HdWallet.fromEntropy(fromHex("065a823769888cbc84e8455522f0e1a066447cb1120aa92e6ee251b74257a7bf"));

    keyring.add(entry);

    expect(keyring.getEntries().length).toEqual(1);
    // Ensure added entry is the same object, no copy of it
    expect(keyring.getEntries()[0]).toBe(entry);
  });

  it("can add multiple entries", () => {
    const keyring = new Keyring();
    const entry1 = Ed25519HdWallet.fromEntropy(fromHex("f7e7f1bbb327113a46fd3fa1020413de"));
    const entry2 = Ed25519HdWallet.fromMnemonic("flip hunt behind absorb blush proof hurry embody quantum start pencil rapid");
    // Entry 3 and 4 have the same seed. This is stupid but not the Keyring's problem
    const entry3 = Ed25519HdWallet.fromEntropy(fromHex("3275a0acb9f697875d829119e4eda0f799afe5e8fb0bc7199c75ae19df610949"));
    const entry4 = Ed25519HdWallet.fromEntropy(fromHex("3275a0acb9f697875d829119e4eda0f799afe5e8fb0bc7199c75ae19df610949"));

    keyring.add(entry1);
    keyring.add(entry2);
    keyring.add(entry3);
    keyring.add(entry4);

    expect(keyring.getEntries().length).toEqual(4);
    expect(keyring.getEntries()[0]).toBe(entry1);
    expect(keyring.getEntries()[1]).toBe(entry2);
    expect(keyring.getEntries()[2]).toBe(entry3);
    expect(keyring.getEntries()[3]).toBe(entry4);
  });

  it("can serialize empty", () => {
    const keyring = new Keyring();
    expect(keyring.serialize()).toEqual('{"entries":[]}');
  });

  it("can serialize one entry", () => {
    const keyring = new Keyring();
    const entry = Ed25519HdWallet.fromEntropy(fromHex("c7f74844892fd7b707e74fc9b6c8ef917c13ddbb380cadbc"));
    keyring.add(entry);

    expect(keyring.serialize()).toMatch(/^{\"entries\":\[{\"implementationId\":\"ed25519-hd\",\"data\":\"{.*}\"}\]}$/);
  });

  it("can serialize many entries", () => {
    const keyring = new Keyring();
    const entry1 = Ed25519HdWallet.fromEntropy(fromHex("c7f74844892fd7b707e74fc9b6c8ef917c13ddbb380cadbc"));
    const entry2 = Ed25519HdWallet.fromEntropy(fromHex("2a7e3f902279af82138f14f871badf8d92b33713eb6c7193"));
    const entry3 = Ed25519HdWallet.fromEntropy(fromHex("602c79484cf098bd4445ad45b5e6557d83ec743cebddb4cd"));
    const entry4 = Ed25519HdWallet.fromEntropy(fromHex("1124ef7ab681387eba8fdd93a0a88ec2f3326f2a6e5e967d"));
    const entry5 = Ed25519HdWallet.fromEntropy(fromHex("cd0e346ae5c714a1514562cb8ad5d4b5a2443dbbc5dd2b5b"));
    const entry6 = Ed25519HdWallet.fromEntropy(fromHex("e38dd5c066406668b51be00e8ad0276ed9dec967d95c2248"));
    keyring.add(entry1);
    keyring.add(entry2);
    keyring.add(entry3);
    keyring.add(entry4);
    keyring.add(entry5);
    keyring.add(entry6);

    expect(keyring.serialize()).toMatch(/^{\"entries\":\[{\"implementationId\":\"ed25519-hd\",\"data\":\"{.*}\"}(,{\"implementationId\":\"ed25519-hd\",\"data\":\"{.*}\"}){5}\]}$/);
  });

  it("can deserialize empty", () => {
    const keyring = new Keyring('{"entries":[]}' as KeyringSerializationString);
    expect(keyring).toBeTruthy();
    expect(keyring.getEntries().length).toEqual(0);
  });

  it("can deserialize one ed25519-hd entry", () => {
    const keyring = new Keyring(`
      {
        "entries": [
          {
            "implementationId": "ed25519-hd",
            "data": "{\\"secret\\":\\"side ripple bachelor banner word swear buzz try situate rent desk carry scorpion uphold undo account pumpkin throw\\",\\"curve\\":\\"ed25519 seed\\",\\"identities\\":[]}"
          }
        ]
      }` as KeyringSerializationString);

    expect(keyring.getEntries().length).toEqual(1);
    expect(keyring.getEntries()[0]).toEqual(jasmine.any(Ed25519HdWallet));
  });

  it("can deserialize one ed25519 entry", () => {
    const keyring = new Keyring('{"entries":[{"implementationId":"ed25519","data":"{ \\"identities\\":[{\\"localIdentity\\": { \\"pubkey\\": { \\"algo\\": \\"ed25519\\", \\"data\\": \\"aabbccdd\\" }, \\"nickname\\": \\"foo\\" }, \\"privkey\\": \\"223322112233aabb\\"}] }"}]}' as KeyringSerializationString);

    expect(keyring.getEntries().length).toEqual(1);
    expect(keyring.getEntries()[0]).toEqual(jasmine.any(Ed25519Wallet));
  });

  it("can serialize and deserialize multiple entries", async () => {
    const entry1 = Ed25519HdWallet.fromEntropy(fromHex("c7f74844892fd7b707e74fc9b6c8ef917c13ddbb380cadbc"));
    const i1a = await entry1.createIdentity(HdPaths.simpleAddress(0));
    const entry2 = new Ed25519Wallet();
    const i2a = await entry2.createIdentity(await makeRandomEd25519Keypair());
    const i2b = await entry2.createIdentity(await makeRandomEd25519Keypair());
    const entry3 = Ed25519HdWallet.fromEntropy(fromHex("2a7e3f902279af82138f14f871badf8d92b33713eb6c7193"));
    const i3a = await entry3.createIdentity(HdPaths.simpleAddress(0));
    const i3b = await entry3.createIdentity(HdPaths.simpleAddress(1));
    const i3c = await entry3.createIdentity(HdPaths.simpleAddress(2));
    const entry4 = new Ed25519Wallet();
    const i4a = await entry4.createIdentity(await makeRandomEd25519Keypair());
    const i4b = await entry4.createIdentity(await makeRandomEd25519Keypair());
    const i4c = await entry4.createIdentity(await makeRandomEd25519Keypair());
    const i4d = await entry4.createIdentity(await makeRandomEd25519Keypair());

    const keyring = new Keyring();
    keyring.add(entry1);
    keyring.add(entry2);
    keyring.add(entry3);
    keyring.add(entry4);

    const serialized = keyring.serialize();

    const restored = new Keyring(serialized);
    expect(restored).toBeTruthy();

    // compare keyring entries

    expect(restored.getEntries().length).toEqual(4);
    expect(keyring.getEntries()[0]).toEqual(jasmine.any(Ed25519HdWallet));
    expect(keyring.getEntries()[0].getIdentities().length).toEqual(1);
    expect(keyring.getEntries()[1]).toEqual(jasmine.any(Ed25519Wallet));
    expect(keyring.getEntries()[1].getIdentities().length).toEqual(2);
    expect(keyring.getEntries()[2]).toEqual(jasmine.any(Ed25519HdWallet));
    expect(keyring.getEntries()[2].getIdentities().length).toEqual(3);
    expect(keyring.getEntries()[3]).toEqual(jasmine.any(Ed25519Wallet));
    expect(keyring.getEntries()[3].getIdentities().length).toEqual(4);

    // compare keyring entry content (via LocalIdentity equality)

    expect(keyring.getEntries()[0].getIdentities()[0]).toEqual(i1a);

    expect(keyring.getEntries()[1].getIdentities()[0]).toEqual(i2a);
    expect(keyring.getEntries()[1].getIdentities()[1]).toEqual(i2b);

    expect(keyring.getEntries()[2].getIdentities()[0]).toEqual(i3a);
    expect(keyring.getEntries()[2].getIdentities()[1]).toEqual(i3b);
    expect(keyring.getEntries()[2].getIdentities()[2]).toEqual(i3c);

    expect(keyring.getEntries()[3].getIdentities()[0]).toEqual(i4a);
    expect(keyring.getEntries()[3].getIdentities()[1]).toEqual(i4b);
    expect(keyring.getEntries()[3].getIdentities()[2]).toEqual(i4c);
    expect(keyring.getEntries()[3].getIdentities()[3]).toEqual(i4d);
  });

  it("supports all basic entry types by default", () => {
    const keyring = new Keyring();
    keyring.add(new Ed25519Wallet());
    keyring.add(Ed25519HdWallet.fromMnemonic("melt wisdom mesh wash item catalog talk enjoy gaze hat brush wash"));
    keyring.add(Secp256k1HdWallet.fromMnemonic("melt wisdom mesh wash item catalog talk enjoy gaze hat brush wash"));

    expect(() => {
      const serialized = keyring.serialize();
      // tslint:disable-next-line:no-unused-expression
      new Keyring(serialized);
    }).not.toThrow();
  });

  it("can be cloned", () => {
    const original = new Keyring();
    const entry = Ed25519HdWallet.fromEntropy(fromHex("c7f74844892fd7b707e74fc9b6c8ef917c13ddbb380cadbc"));
    original.add(entry);

    const clone = original.clone();
    expect(clone).not.toBe(original);
    expect(clone.serialize()).toEqual(original.serialize());
  });
});
