import assert from 'assert';
import path from 'path';

import { eddsa } from 'circomlib';
import { BigNumber, BigNumberish } from 'ethers';
import { keccak256, solidityPack } from 'ethers/lib/utils';
import { groth16 } from 'snarkjs';

import eddsaVK from '../snarkfiles/eddsa.vk.json';

import {
  PRIME_Q,
  privToBuffer,
  privToPubKey,
  Proof,
  proofToSnarkjsProof,
  snarkjsProofToContractArg,
} from './utils';

export const signWithdrawal = async (
  noteHash: BigNumberish,
  to: BigNumberish,
  privKey: BigNumberish
): Promise<Proof> => {
  const msg = BigNumber.from(
    keccak256(solidityPack(['uint256', 'address'], [noteHash, to]))
  ).mod(BigNumber.from(PRIME_Q));
  const proof = await signEdDSA(msg, privKey);
  return proof;
};

export const signEdDSA = async (
  message: BigNumberish,
  privKey: BigNumberish
): Promise<Proof> => {
  const privKeyBuff = privToBuffer(privKey);
  const pubKey = privToPubKey(privKey);
  const signature = eddsa.signPoseidon(
    privKeyBuff,
    BigInt(BigNumber.from(message))
  );
  const result = await groth16.fullProve(
    {
      note: BigInt(BigNumber.from(message)),
      pubKey: pubKey.map((bn) => BigInt(BigNumber.from(bn))),
      R8x: signature.R8[0],
      R8y: signature.R8[1],
      s: signature.S,
    },
    `${path.join(__dirname, '../snarkfiles/eddsa.wasm')}`,
    `${path.join(__dirname, '../snarkfiles/eddsa.zkey')}`
  );
  const verifyResult = await groth16.verify(
    eddsaVK,
    result.publicSignals,
    result.proof
  );
  assert(verifyResult, 'generated false proof');
  const proof = snarkjsProofToContractArg(result.proof);
  return proof;
};

export const verifyEdDSA = async (
  message: BigNumberish,
  pubKey: readonly BigNumberish[],
  proof: Proof
): Promise<boolean> => {
  const publicSignals = [message, pubKey[0], pubKey[1]].map((bn) =>
    BigInt(BigNumber.from(bn))
  );

  const result = await groth16.verify(
    eddsaVK,
    publicSignals,
    proofToSnarkjsProof(proof)
  );
  return result;
};
