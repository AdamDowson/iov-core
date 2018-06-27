export interface HashFunction {
    readonly blockSize: number;
    readonly update: (_: Uint8Array) => HashFunction;
    readonly digest: () => Uint8Array;
}
export declare class Sha1 implements HashFunction {
    readonly blockSize: number;
    private readonly impl;
    constructor(firstData?: Uint8Array);
    update(data: Uint8Array): Sha1;
    digest(): Uint8Array;
}
export declare class Sha256 implements HashFunction {
    static digest(data: Uint8Array): Promise<Uint8Array>;
    readonly blockSize: number;
    private readonly impl;
    constructor(firstData?: Uint8Array);
    update(data: Uint8Array): Sha256;
    digest(): Uint8Array;
}
export declare class Sha512 implements HashFunction {
    readonly blockSize: number;
    private readonly impl;
    constructor(firstData?: Uint8Array);
    update(data: Uint8Array): Sha512;
    digest(): Uint8Array;
}
