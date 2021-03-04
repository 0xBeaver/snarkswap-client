/* eslint-disable functional/no-let */
import assert from 'assert';

import { encrypt } from 'chacha20';
import circomlib from 'circomlib';
import { groth16, Proof } from 'snarkjs';
import {
  hexToBytes,
  hexToNumberString,
  padLeft,
  randomHex,
  toHex,
} from 'web3-utils';

import swapVK from '../artifacts/swap.vk.json';

import { Note, hash as noteHash } from './note';
import { hideReserve } from './pow';
import { privToBuffer, privToPubKey } from './utils';

export enum SwapType {
  Token0In = '0In',
  Token0Out = '0Out',
  Token1In = '1In',
  Token1Out = '1Out',
}

export type FeeRatio = {
  readonly numerator: number;
  readonly denominator: number;
};

export const hideSwap = async (
  privKey: bigint,
  reserve0: bigint,
  reserve1: bigint,
  sourceA: Note,
  sourceB: Note,
  address0: bigint,
  address1: bigint,
  amount: bigint,
  swapType: SwapType,
  fee: FeeRatio,
  difficulty: number
): Promise<{
  readonly commitment: string;
  readonly hReserve0: bigint;
  readonly hReserve1: bigint;
  readonly mask: bigint;
  readonly salt: bigint;
  readonly cipher: Buffer;
  readonly proof: Proof;
}> => {
  const pubKey = privToPubKey(privKey);
  assert(difficulty <= 30, 'MAX difficulty is 30');
  assert(sourceA.pubKey[0] === pubKey[0], 'no ownership');
  assert(sourceA.pubKey[1] === pubKey[1], 'no ownership');
  assert(sourceB.pubKey[0] === pubKey[0], 'no ownership');
  assert(sourceB.pubKey[1] === pubKey[1], 'no ownership');
  assert(
    sourceA.address === address0 || sourceA.address === address1,
    'Invalid asset in Source A'
  );
  assert(
    sourceB.address === address0 || sourceB.address === address1,
    'Invalid asset in Source B'
  );
  let amount0In: bigint;
  let amount0Out: bigint;
  let amount1In: bigint;
  let amount1Out: bigint;

  const getAmountOut = (
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint
  ): bigint => {
    const amountInWithFee = amountIn * BigInt(fee.denominator - fee.numerator);
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * BigInt(fee.denominator) + amountInWithFee;
    return numerator / denominator;
  };

  const getAmountIn = (
    amountOut: bigint,
    reserveIn: bigint,
    reserveOut: bigint
  ): bigint => {
    const numerator = amountOut * reserveIn * BigInt(fee.denominator);
    const denominator =
      (reserveOut - amountOut) * BigInt(fee.denominator - fee.numerator);
    return numerator / denominator + 1n;
  };

  switch (swapType) {
    case SwapType.Token0In:
      amount0In = amount;
      amount0Out = 0n;
      amount1In = 0n;
      amount1Out = getAmountOut(amount, reserve0, reserve1);
      break;
    case SwapType.Token0Out:
      amount0In = 0n;
      amount0Out = amount;
      amount1In = getAmountIn(amount, reserve1, reserve0);
      amount1Out = 0n;
      break;
    case SwapType.Token1In:
      amount0In = 0n;
      amount0Out = getAmountOut(amount, reserve1, reserve0);
      amount1In = amount;
      amount1Out = 0n;
      break;
    case SwapType.Token1Out:
      amount0In = getAmountIn(amount, reserve0, reserve1);
      amount0Out = 0n;
      amount1In = 0n;
      amount1Out = amount;
      break;
  }
  const input0 = [sourceA, sourceB]
    .filter((note) => note.address === address0)
    .reduce((acc, note) => acc + note.amount, 0n);

  const input1 = [sourceA, sourceB]
    .filter((note) => note.address === address1)
    .reduce((acc, note) => acc + note.amount, 0n);

  const newBal0 = input0 + amount0Out - amount0In;
  const newBal1 = input1 + amount1Out - amount1In;

  const output0: Note = {
    address: address0,
    amount: newBal0,
    pubKey,
    salt: BigInt(hexToNumberString(randomHex(16))),
  };

  const output1: Note = {
    address: address1,
    amount: newBal1,
    pubKey,
    salt: BigInt(hexToNumberString(randomHex(16))),
  };

  const rand = Math.random();
  const outputA = rand < 0.5 ? output0 : output1;
  const outputB = rand < 0.5 ? output1 : output0;
  const sourceAHash = noteHash(sourceA);
  const sourceBHash = noteHash(sourceB);
  const outputAHash = noteHash(outputA);
  const outputBHash = noteHash(outputB);

  const secret = Buffer.concat([
    Buffer.from(hexToBytes(padLeft(toHex(outputA.amount.toString(10)), 64))),
    Buffer.from(hexToBytes(padLeft(toHex(outputA.salt.toString(10)), 32))),
    Buffer.from(hexToBytes(padLeft(toHex(outputB.amount.toString(10)), 64))),
    Buffer.from(hexToBytes(padLeft(toHex(outputB.salt.toString(10)), 32))),
  ]);
  const cipher = encrypt(privToBuffer(privKey), Buffer.from([]), secret);

  const newReserve0 = reserve0 + amount0In - amount0Out;
  const newReserve1 = reserve1 + amount1In - amount1Out;

  const { commitment, hReserve0, hReserve1, mask, salt, hRatio } = hideReserve(
    newReserve0,
    newReserve1,
    difficulty
  );
  const txHash = circomlib.poseidon([
    sourceAHash,
    sourceBHash,
    outputAHash,
    outputBHash,
    salt,
  ]);

  const signature = circomlib.eddsa.signPoseidon(privToBuffer(privKey), txHash);

  const noteAmountIn0 = [sourceA, sourceB].reduce(
    (acc, note) => acc + (note.address === address0 ? note.amount : 0n),
    0n
  );
  const noteAmountIn1 = [sourceA, sourceB].reduce(
    (acc, note) => acc + (note.address === address1 ? note.amount : 0n),
    0n
  );
  const noteAmountOut0 = [outputA, outputB].reduce(
    (acc, note) => acc + (note.address === address0 ? note.amount : 0n),
    0n
  );
  const noteAmountOut1 = [outputA, outputB].reduce(
    (acc, note) => acc + (note.address === address1 ? note.amount : 0n),
    0n
  );
  assert(
    newReserve0 + noteAmountOut0 === reserve0 + noteAmountIn0,
    'money printed'
  );
  assert(
    newReserve1 + noteAmountOut1 === reserve1 + noteAmountIn1,
    'money printed'
  );

  const result = await groth16.fullProve(
    {
      sourceA: sourceAHash,
      sourceB: sourceBHash,
      reserve0,
      reserve1,
      mask,
      hRatio,
      hReserve0,
      hReserve1,
      ratioSalt: salt,
      outputA: outputAHash,
      outputB: outputBHash,
      address0,
      address1,
      feeNumerator: BigInt(fee.numerator),
      feeDenominator: BigInt(fee.denominator),
      sourceADetails: [
        sourceA.address,
        sourceA.amount,
        sourceA.pubKey[0],
        sourceA.pubKey[1],
        sourceA.salt,
      ],
      sourceBDetails: [
        sourceB.address,
        sourceB.amount,
        sourceB.pubKey[0],
        sourceB.pubKey[1],
        sourceB.salt,
      ],
      outputADetails: [
        outputA.address,
        outputA.amount,
        outputA.pubKey[0],
        outputA.pubKey[1],
        outputA.salt,
      ],
      outputBDetails: [
        outputB.address,
        outputB.amount,
        outputB.pubKey[0],
        outputB.pubKey[1],
        outputB.salt,
      ],
      newReserve0,
      newReserve1,
      pubkey: pubKey,
      sigR8: signature.R8,
      sigS: signature.S,
    },
    `src/artifacts/swap.wasm`,
    'src/artifacts/swap.zkey'
  );
  const verifiResult = await groth16.verify(
    swapVK,
    result.publicSignals,
    result.proof
  );
  assert(verifiResult, 'generated false proof');
  return {
    commitment,
    hReserve0,
    hReserve1,
    mask,
    salt,
    cipher,
    proof: result.proof,
  };
};
