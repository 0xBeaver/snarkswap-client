import { eddsa } from 'circomlib';
import { SnarkjsProof } from 'snarkjs';
import { hexToBytes, toHex } from 'web3-utils';

export type Proof = {
  readonly a: readonly string[] | readonly bigint[];
  readonly b: readonly (readonly (string | bigint)[])[];
  readonly c: readonly string[] | readonly bigint[];
};

export const privToBuffer = (privKey: bigint): Buffer => {
  const buff = Buffer.from(hexToBytes(toHex(privKey.toString(10))));
  return buff;
};

export const privToPubKey = (privKey: bigint): readonly bigint[] => {
  const privKeyBuff = privToBuffer(privKey);
  const pubKey = eddsa.prv2pub(privKeyBuff);
  return pubKey;
};

export const snarkjsProofToContractArg = (proof: SnarkjsProof): Proof => {
  return {
    a: proof.pi_a,
    b: [[...proof.pi_b[0]].reverse(), [...proof.pi_b[1]].reverse()],
    c: proof.pi_c,
  };
};

export const proofToSnarkjsProof = (proof: Proof): SnarkjsProof => {
  return {
    pi_a: proof.a,
    pi_b: [[...proof.b[0]].reverse(), [...proof.b[1]].reverse()],
    pi_c: proof.c,
    protocol: 'groth16',
  };
};
