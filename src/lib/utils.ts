import assert from 'assert';

import { decrypt } from 'chacha20';
import { eddsa } from 'circomlib';
import { BigNumber, BigNumberish, Bytes, Signer } from 'ethers';
import { arrayify, BytesLike, keccak256 } from 'ethers/lib/utils';
import { SnarkjsProof } from 'snarkjs';

import { getNoteHash, Note } from './note';

export const PRIME_Q = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;

export type Proof = {
  readonly a: readonly BigNumber[];
  readonly b: readonly (readonly BigNumber[])[];
  readonly c: readonly BigNumber[];
};

export const privToBuffer = (privKey: BigNumberish): Buffer => {
  const buff = Buffer.from(arrayify(BigNumber.from(privKey).toHexString()));
  return buff;
};

export const privToPubKey = (privKey: BigNumberish): readonly BigNumber[] => {
  const privKeyBuff = privToBuffer(privKey);
  const pubKey = eddsa.prv2pub(privKeyBuff);
  return pubKey.map((n) => BigNumber.from(n));
};

export const snarkjsProofToContractArg = (proof: SnarkjsProof): Proof => {
  return {
    a: proof.pi_a.map((n) => BigNumber.from(n)),
    b: [
      [...proof.pi_b[0]].reverse().map((n) => BigNumber.from(n)),
      [...proof.pi_b[1]].reverse().map((n) => BigNumber.from(n)),
    ],
    c: proof.pi_c.map((n) => BigNumber.from(n)),
  };
};

export const proofToSnarkjsProof = (proof: Proof): SnarkjsProof => {
  return {
    pi_a: proof.a.map((bn) => BigInt(bn)),
    pi_b: [
      [...proof.b[0]].reverse().map((bn) => BigInt(bn)),
      [...proof.b[1]].reverse().map((bn) => BigInt(bn)),
    ],
    pi_c: proof.c.map((bn) => BigInt(bn)),
    protocol: 'groth16',
  };
};

export const genEdDSAPrivKey = async (
  message: string | Bytes,
  signer: Signer
): Promise<BigNumber> => {
  const ecdsa = await signer.signMessage(message);
  const privKey = BigNumber.from(keccak256(ecdsa)).mod(BigNumber.from(PRIME_Q));
  return privKey;
};

export type FeeRatio = {
  readonly numerator: number;
  readonly denominator: number;
};

export const getAmountOut = (
  amountIn: BigNumberish,
  reserveIn: BigNumberish,
  reserveOut: BigNumberish,
  feeRatio?: FeeRatio
): BigNumber => {
  const _feeNumerator = feeRatio?.numerator || 3;
  const _feeDeonminator = feeRatio?.denominator || 1000;

  const _amountIn = BigNumber.from(amountIn);
  const _reserveIn = BigNumber.from(reserveIn);
  const amountInWithFee = _amountIn.mul(_feeDeonminator - _feeNumerator);
  const numerator = amountInWithFee.mul(reserveOut);
  const denominator = _reserveIn.mul(_feeDeonminator).add(amountInWithFee);
  return numerator.div(denominator);
};

export const getAmountIn = (
  amountOut: BigNumberish,
  reserveIn: BigNumberish,
  reserveOut: BigNumberish,
  feeRatio?: FeeRatio
): BigNumber => {
  const _feeNumerator = feeRatio?.numerator || 3;
  const _feeDeonminator = feeRatio?.denominator || 1000;
  const _amountOut = BigNumber.from(amountOut);
  const _reserveOut = BigNumber.from(reserveOut);
  const numerator = _amountOut.mul(reserveIn).mul(_feeDeonminator);
  const denominator = _reserveOut
    .sub(amountOut)
    .mul(_feeDeonminator - _feeNumerator);
  return numerator.div(denominator.add(1));
};

export const decryptTransaction = (
  privKey: BigNumberish,
  outputA: BigNumberish,
  outputB: BigNumberish,
  address0: string,
  address1: string,
  secret: BytesLike
) => {
  const privBuff = privToBuffer(privKey);
  const pubKey = privToPubKey(privKey);
  const decrypted = decrypt(
    privBuff,
    Buffer.from([]),
    Buffer.from(arrayify(secret))
  );
  const amountA = BigNumber.from(decrypted.slice(0, 32));
  const saltA = BigNumber.from(decrypted.slice(32, 48));
  const amountB = BigNumber.from(decrypted.slice(48, 80));
  const saltB = BigNumber.from(decrypted.slice(80, 96));
  const output0a: Note = {
    address: BigNumber.from(address0),
    amount: amountA,
    salt: saltA,
    pubKey,
  };
  const output0b: Note = {
    address: BigNumber.from(address0),
    amount: amountB,
    salt: saltB,
    pubKey,
  };
  const output1a: Note = {
    address: BigNumber.from(address1),
    amount: amountA,
    salt: saltA,
    pubKey,
  };
  const output1b: Note = {
    address: BigNumber.from(address1),
    amount: amountB,
    salt: saltB,
    pubKey,
  };
  if (getNoteHash(output0a).eq(outputA)) {
    assert(getNoteHash(output1b).eq(outputB));
    return [output0a, output1b];
  } else {
    assert(getNoteHash(output0b).eq(outputB));
    assert(getNoteHash(output1a).eq(outputA));
    return [output0b, output1a];
  }
};
