/**
 * If you import a dependency which does not include its own type definitions,
 * TypeScript will try to find a definition for it by following the `typeRoots`
 * compiler option in tsconfig.json. For this project, we've configured it to
 * fall back to this folder if nothing is found in node_modules/@types.
 *
 * Often, you can install the DefinitelyTyped
 * (https://github.com/DefinitelyTyped/DefinitelyTyped) type definition for the
 * dependency in question. However, if no one has yet contributed definitions
 * for the package, you may want to declare your own. (If you're using the
 * `noImplicitAny` compiler options, you'll be required to declare it.)
 *
 * This is an example type definition which allows import from `module-name`,
 * e.g.:
 * ```ts
 * import something from 'module-name';
 * something();
 * ```
 */

declare module 'circomlib' {
  type EdDSASignature = {
    readonly R8: readonly bigint[];
    readonly S: bigint;
  };
  const poseidon: (values: readonly bigint[]) => bigint;
  const eddsa: {
    readonly sign: (
      privKey: string | Buffer,
      message: bigint
    ) => EdDSASignature;
    readonly signMiMC: (
      privKey: string | Buffer,
      message: bigint
    ) => EdDSASignature;
    readonly signMiMCSponge: (
      privKey: string | Buffer,
      message: bigint
    ) => EdDSASignature;
    readonly signPoseidon: (
      privKey: string | Buffer,
      message: bigint
    ) => EdDSASignature;
    readonly verify: (
      message: bigint,
      signature: EdDSASignature,
      publicKey: readonly bigint[]
    ) => boolean;
    readonly verifyPoseidon: (
      message: bigint,
      signature: EdDSASignature,
      publicKey: readonly bigint[]
    ) => boolean;
    readonly verifyMiMC: (
      message: bigint,
      signature: EdDSASignature,
      publicKey: readonly bigint[]
    ) => boolean;
    readonly verifyMiMCSponge: (
      message: bigint,
      signature: EdDSASignature,
      publicKey: readonly bigint[]
    ) => boolean;
    readonly packSignature: (signature: EdDSASignature) => Buffer;
    readonly unpackSignature: (signature: Buffer) => EdDSASignature;
    readonly prv2pub: (privKey: string | Buffer) => readonly bigint[];
    readonly pruneBuffer: (buff: Buffer) => Buffer;
  };
  export { EdDSASignature, poseidon, eddsa };
}
