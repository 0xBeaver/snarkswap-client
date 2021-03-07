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

declare module 'snarkjs' {
  type SnarkjsProof = {
    readonly pi_a: readonly string[] | readonly bigint[];
    readonly pi_b: readonly (readonly (string | bigint)[])[];
    readonly pi_c: readonly string[] | readonly bigint[];
    readonly protocol: string;
  };

  type PublicSignals = readonly string[] | readonly bigint[];

  type SNARK = {
    readonly proof: SnarkjsProof;
    readonly publicSignals: PublicSignals;
  };

  type VK = {
    readonly nPublic: number;
    readonly curve: unknown;
    readonly vk_alpha_1: unknown;
    readonly vk_beta_2: unknown;
    readonly vk_gamma_2: unknown;
    readonly vk_delta_2: unknown;
    readonly IC: unknown;
  };

  const groth16: {
    readonly fullProve: (
      input: {
        readonly [key: string]:
          | bigint
          | readonly bigint[]
          | readonly (readonly bigint[])[];
      },
      wasmFile: string,
      zkeyFileName: string,
      logger?: unknown
    ) => Promise<SNARK>;
    readonly prove: (
      zkeyFileName: string,
      witnessFilename: string,
      logger?: unknown
    ) => Promise<SNARK>;
    readonly verify: (
      vkVerifier: VK,
      publicSignals: PublicSignals,
      proof: SnarkjsProof,
      logger?: unknown
    ) => Promise<boolean>;
  };
  export { SnarkjsProof, VK, groth16 };
}
