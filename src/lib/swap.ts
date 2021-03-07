/* eslint-disable functional/no-let */
import assert from 'assert';
import path from 'path';

import { encrypt } from 'chacha20';
import circomlib from 'circomlib';
import { BigNumber, BigNumberish } from 'ethers';
import { arrayify, hexConcat, hexZeroPad } from 'ethers/lib/utils';
import { groth16 } from 'snarkjs';
import { hexToNumberString, randomHex } from 'web3-utils';

import swapVK from '../snarkfiles/swap.vk.json';

import { getNoteHash, Note } from './note';
import { hideReserve } from './pow';
import {
  FeeRatio,
  getAmountIn,
  getAmountOut,
  privToBuffer,
  privToPubKey,
  Proof,
  snarkjsProofToContractArg,
} from './utils';

export enum SwapType {
  Token0In = '0In',
  Token0Out = '0Out',
  Token1In = '1In',
  Token1Out = '1Out',
}

const Zero = BigNumber.from(0);

export const hideSwap = async (
  privKey: BigNumberish,
  reserve0: BigNumberish,
  reserve1: BigNumberish,
  sourceA: Note,
  sourceB: Note,
  address0: BigNumberish,
  address1: BigNumberish,
  amount: BigNumberish,
  swapType: SwapType,
  fee: FeeRatio,
  difficulty: number
): Promise<{
  readonly commitment: string;
  readonly hReserve0: BigNumber;
  readonly hReserve1: BigNumber;
  readonly mask: BigNumber;
  readonly salt: BigNumber;
  readonly cipher: Buffer;
  readonly proof: Proof;
}> => {
  const pubKey = privToPubKey(privKey);
  assert(difficulty <= 30, 'MAX difficulty is 30');
  assert(BigNumber.from(sourceA.pubKey[0]).eq(pubKey[0]), 'no ownership');
  assert(BigNumber.from(sourceA.pubKey[1]).eq(pubKey[1]), 'no ownership');
  assert(BigNumber.from(sourceB.pubKey[0]).eq(pubKey[0]), 'no ownership');
  assert(BigNumber.from(sourceB.pubKey[1]).eq(pubKey[1]), 'no ownership');
  assert(
    BigNumber.from(sourceA.address).eq(address0) ||
      BigNumber.from(sourceA.address).eq(address1),
    'Invalid asset in Source A'
  );
  assert(
    BigNumber.from(sourceB.address).eq(address0) ||
      BigNumber.from(sourceB.address).eq(address1),
    'Invalid asset in Source B'
  );
  let amount0In: BigNumber;
  let amount0Out: BigNumber;
  let amount1In: BigNumber;
  let amount1Out: BigNumber;
  const _amount = BigNumber.from(amount);
  const _reserve0 = BigNumber.from(reserve0);
  const _reserve1 = BigNumber.from(reserve1);

  switch (swapType) {
    case SwapType.Token0In:
      amount0In = _amount;
      amount0Out = Zero;
      amount1In = Zero;
      amount1Out = getAmountOut(amount, reserve0, reserve1);
      break;
    case SwapType.Token0Out:
      amount0In = Zero;
      amount0Out = _amount;
      amount1In = getAmountIn(amount, reserve1, reserve0);
      amount1Out = Zero;
      break;
    case SwapType.Token1In:
      amount0In = Zero;
      amount0Out = getAmountOut(amount, reserve1, reserve0);
      amount1In = _amount;
      amount1Out = Zero;
      break;
    case SwapType.Token1Out:
      amount0In = getAmountIn(amount, reserve0, reserve1);
      amount0Out = Zero;
      amount1In = Zero;
      amount1Out = _amount;
      break;
  }
  const input0 = [sourceA, sourceB]
    .filter((note) => note.address === address0)
    .reduce((acc, note) => acc.add(note.amount), Zero);

  const input1 = [sourceA, sourceB]
    .filter((note) => note.address === address1)
    .reduce((acc, note) => acc.add(note.amount), Zero);

  const newBal0 = input0.add(amount0Out).sub(amount0In);
  const newBal1 = input1.add(amount1Out).sub(amount1In);

  const output0: Note = {
    address: address0,
    amount: newBal0,
    pubKey,
    salt: BigNumber.from(hexToNumberString(randomHex(16))),
  };

  const output1: Note = {
    address: address1,
    amount: newBal1,
    pubKey,
    salt: BigNumber.from(hexToNumberString(randomHex(16))),
  };

  const rand = Math.random();
  const outputA = rand < 0.5 ? output0 : output1;
  const outputB = rand < 0.5 ? output1 : output0;
  const sourceAHash = getNoteHash(sourceA);
  const sourceBHash = getNoteHash(sourceB);
  const outputAHash = getNoteHash(outputA);
  const outputBHash = getNoteHash(outputB);

  const secret = Buffer.from(
    arrayify(
      hexConcat([
        hexZeroPad(BigNumber.from(outputA.amount).toHexString(), 32),
        hexZeroPad(BigNumber.from(outputA.salt).toHexString(), 16),
        hexZeroPad(BigNumber.from(outputB.amount).toHexString(), 32),
        hexZeroPad(BigNumber.from(outputB.salt).toHexString(), 16),
      ])
    )
  );
  const cipher = encrypt(privToBuffer(privKey), Buffer.from([]), secret);

  const newReserve0 = _reserve0.add(amount0In).sub(amount0Out);
  const newReserve1 = _reserve1.add(amount1In).sub(amount1Out);

  const { commitment, hReserve0, hReserve1, mask, salt, hRatio } = hideReserve(
    newReserve0,
    newReserve1,
    difficulty
  );
  const txHash = circomlib.poseidon([
    BigInt(sourceAHash),
    BigInt(sourceBHash),
    BigInt(outputAHash),
    BigInt(outputBHash),
    BigInt(salt),
  ]);

  const signature = circomlib.eddsa.signPoseidon(privToBuffer(privKey), txHash);

  const noteAmountIn0 = [sourceA, sourceB].reduce(
    (acc, note) => acc.add(note.address === address0 ? note.amount : Zero),
    Zero
  );
  const noteAmountIn1 = [sourceA, sourceB].reduce(
    (acc, note) => acc.add(note.address === address1 ? note.amount : Zero),
    Zero
  );
  const noteAmountOut0 = [outputA, outputB].reduce(
    (acc, note) => acc.add(note.address === address0 ? note.amount : Zero),
    Zero
  );
  const noteAmountOut1 = [outputA, outputB].reduce(
    (acc, note) => acc.add(note.address === address1 ? note.amount : Zero),
    Zero
  );
  assert(
    newReserve0.add(noteAmountOut0).eq(_reserve0.add(noteAmountIn0)),
    'money printed'
  );
  assert(
    newReserve1.add(noteAmountOut1).eq(_reserve1.add(noteAmountIn1)),
    'money printed'
  );

  const result = await groth16.fullProve(
    {
      sourceA: BigInt(sourceAHash),
      sourceB: BigInt(sourceBHash),
      reserve0: BigInt(reserve0),
      reserve1: BigInt(reserve1),
      mask: BigInt(mask),
      hRatio: BigInt(hRatio),
      hReserve0: BigInt(hReserve0),
      hReserve1: BigInt(hReserve1),
      ratioSalt: BigInt(salt),
      outputA: BigInt(outputAHash),
      outputB: BigInt(outputBHash),
      address0: BigInt(address0),
      address1: BigInt(address1),
      feeNumerator: BigInt(fee.numerator),
      feeDenominator: BigInt(fee.denominator),
      sourceADetails: [
        sourceA.address,
        sourceA.amount,
        sourceA.pubKey[0],
        sourceA.pubKey[1],
        sourceA.salt,
      ].map((bn) => BigInt(bn)),
      sourceBDetails: [
        sourceB.address,
        sourceB.amount,
        sourceB.pubKey[0],
        sourceB.pubKey[1],
        sourceB.salt,
      ].map((bn) => BigInt(bn)),
      outputADetails: [
        outputA.address,
        outputA.amount,
        outputA.pubKey[0],
        outputA.pubKey[1],
        outputA.salt,
      ].map((bn) => BigInt(bn)),
      outputBDetails: [
        outputB.address,
        outputB.amount,
        outputB.pubKey[0],
        outputB.pubKey[1],
        outputB.salt,
      ].map((bn) => BigInt(bn)),
      newReserve0: BigInt(newReserve0),
      newReserve1: BigInt(newReserve1),
      pubkey: pubKey.map((bn) => BigInt(bn)),
      sigR8: signature.R8,
      sigS: signature.S,
    },
    `${path.join(__dirname, '../snarkfiles/swap.wasm')}`,
    `${path.join(__dirname, '../snarkfiles/swap.zkey')}`
  );
  const verifyResult = await groth16.verify(
    swapVK,
    result.publicSignals,
    result.proof
  );
  assert(verifyResult, 'generated false proof');
  return {
    commitment,
    hReserve0,
    hReserve1,
    mask,
    salt,
    cipher,
    proof: snarkjsProofToContractArg(result.proof),
  };
};
