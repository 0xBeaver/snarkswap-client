import { eddsa } from 'circomlib';
import { SnarkjsProof } from 'snarkjs';
import { hexToBytes, keccak256, toBN, toHex } from 'web3-utils';
import { Signer, Bytes } from 'ethers';

export const PRIME_Q: bigint = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;

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

export const genEdDSAPrivKey = (
  message: string | Bytes,
  signer: Signer
): bigint => {
  const ecdsa = signer.signMessage(message);
  const privKey = toBN(keccak256(ecdsa)).mod(PRIME_Q);
  return privKey;
};
