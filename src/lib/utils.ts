import { eddsa } from 'circomlib';
import { BigNumber, BigNumberish, Bytes, Signer } from 'ethers';
import { arrayify, keccak256 } from 'ethers/lib/utils';
import { SnarkjsProof } from 'snarkjs';

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
