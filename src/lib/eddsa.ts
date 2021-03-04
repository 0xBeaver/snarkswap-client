import { assert } from 'console';

import { eddsa } from 'circomlib';
import { groth16, Proof } from 'snarkjs';

import eddsaVK from '../artifacts/eddsa.vk.json';

import { privToBuffer, privToPubKey } from './utils';

export const signEdDSA = async (
  message: bigint,
  privKey: bigint
): Promise<Proof> => {
  const privKeyBuff = privToBuffer(privKey);
  const pubKey = privToPubKey(privKey);
  const signature = eddsa.signPoseidon(privKeyBuff, message);
  const result = await groth16.fullProve(
    {
      note: message,
      pubKey,
      R8x: signature.R8[0],
      R8y: signature.R8[1],
      s: signature.S,
    },
    `src/artifacts/eddsa.wasm`,
    'src/artifacts/eddsa.zkey'
  );
  const verifiResult = await groth16.verify(
    eddsaVK,
    result.publicSignals,
    result.proof
  );
  assert(verifiResult, 'generated false proof');
  return result.proof;
};

export const verifyEdDSA = async (
  message: bigint,
  pubKey: readonly bigint[],
  proof: Proof
): Promise<boolean> => {
  const publicSignals = [message, pubKey[0], pubKey[1]];
  const result = await groth16.verify(eddsaVK, publicSignals, proof);
  return result;
};
