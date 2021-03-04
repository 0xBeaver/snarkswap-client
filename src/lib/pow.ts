/* eslint-disable functional/no-throw-statement */
/* eslint-disable functional/no-loop-statement */
/* eslint-disable functional/no-let */
import circomlib from 'circomlib';
import {
  encodePacked,
  hexToNumberString,
  keccak256,
  padLeft,
  randomHex,
  toBN,
} from 'web3-utils';

const RIGHT_112_BITS = (1n << 112n) - 1n;

/**
 * Multiplies a value by 2. (Also a full example of TypeDoc's functionality.)
 *
 * ### Example (es module)
 * ```js
 * import { double } from 'typescript-starter'
 * console.log(double(4))
 * // => 8
 * ```
 *
 * ### Example (commonjs)
 * ```js
 * var double = require('typescript-starter').double;
 * console.log(double(4))
 * // => 8
 * ```
 *
 * @param value - Comment describing the `value` parameter.
 * @returns Comment describing the return type.
 * @anotherNote Some other value.
 */
export const solve = async (
  commitment: string,
  hReserve0: bigint,
  hReserve1: bigint,
  mask: bigint,
  salt: bigint
): Promise<{
  readonly reserve0: bigint;
  readonly reserve1: bigint;
  readonly n: number;
}> => {
  return new Promise((resolve) => {
    // concatenated
    const concatHReserve = (hReserve0 << 112n) | hReserve1;
    //

    const unknownBits = [...Array(224).keys()]
      .filter((i) => (mask & (1n << BigInt(i))) !== 0n)
      .map((i) => BigInt(i))
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .sort((_a, _b) => {
        return 0.5 - Math.random();
      });

    const numOfCases = 1 << unknownBits.length;
    let hRatio: bigint;
    for (let i = 0; i < numOfCases; i += 1) {
      let flipper = 0n;
      for (let j = 0; j < unknownBits.length; j += 1) {
        flipper |= (i & (1 << j)) === 0 ? 0n : 1n << unknownBits[j];
      }
      const guessedReserve = concatHReserve ^ flipper;

      const reserve0 = guessedReserve >> 112n;
      const reserve1 = guessedReserve & RIGHT_112_BITS;
      hRatio = circomlib.poseidon([reserve0, reserve1, salt]);
      const computedCommitment = keccak256(
        encodePacked(
          `0x${padLeft(hRatio.toString(16), 64)}`,
          `0x${padLeft(hReserve0.toString(16), 28)}`,
          `0x${padLeft(hReserve1.toString(16), 28)}`,
          `0x${padLeft(mask.toString(16), 56)}`
        )
      );
      if (toBN(commitment).eq(toBN(computedCommitment))) {
        resolve({
          reserve0,
          reserve1,
          n: i,
        });
      }
    }
    throw Error('Failed to solve the PoW puzzle. Verify SNARK');
  });
};

export const hideReserve = (
  reserve0: bigint,
  reserve1: bigint,
  difficulty: number
): {
  readonly commitment: string;
  readonly hReserve0: bigint;
  readonly hReserve1: bigint;
  readonly mask: bigint;
  readonly salt: bigint;
  readonly hRatio: bigint;
} => {
  if (difficulty > 30) throw Error('Difficulty is too large');

  const mask = getBestMask(difficulty, reserve0, reserve1);
  // reserve0FirstBit
  // reserve1FirstBit
  let concatReserve = (reserve0 << 112n) | reserve1;
  for (let i = 0n; i < 224n; i += 1n) {
    if (((1n << i) & mask) !== 0n) {
      concatReserve |= Math.random() < 0.5 ? 1n << i : 0n;
    }
  }
  const hReserve0 = concatReserve >> 112n;
  const hReserve1 = concatReserve & RIGHT_112_BITS;
  const salt = BigInt(hexToNumberString(randomHex(16)));
  const hRatio = circomlib.poseidon([reserve0, reserve1, salt]);
  const commitment = keccak256(
    encodePacked(
      `0x${padLeft(hRatio.toString(16), 64)}`,
      `0x${padLeft(hReserve0.toString(16), 28)}`,
      `0x${padLeft(hReserve1.toString(16), 28)}`,
      `0x${padLeft(mask.toString(16), 56)}`
    )
  );
  return {
    commitment,
    hReserve0,
    hReserve1,
    mask,
    salt,
    hRatio,
  };
};

export const getDifficulty = (mask: bigint): number => {
  return mask.toString(2).replace(/0/g, '').length;
};

export const getBestMask = (
  difficulty: number,
  reserve0: bigint,
  reserve1: bigint
): bigint => {
  if (difficulty === 0) return 0n;
  const reserve0FirstBit = reserve0.toString(2).length;
  const reserve1FirstBit = reserve1.toString(2).length;
  const difficulty0 = Math.floor(difficulty / 2);
  const difficulty1 = difficulty - difficulty0;
  let mask0Shift = reserve0FirstBit - difficulty0 + 1;
  mask0Shift = mask0Shift > 0 ? mask0Shift : 0;
  const mask0 =
    ((1n << 112n) - 1n) &
    (BigInt(parseInt(new Array(difficulty0).fill('1').join(''), 2)) <<
      BigInt(mask0Shift));
  let mask1Shift = reserve1FirstBit - difficulty1 + 1;
  mask1Shift = mask1Shift > 0 ? mask1Shift : 0;
  const mask1 =
    ((1n << 112n) - 1n) &
    (BigInt(parseInt(new Array(difficulty1).fill('1').join(''), 2)) <<
      BigInt(mask1Shift));

  const mask = (mask0 << 112n) | mask1;
  if (getDifficulty(mask) > difficulty) throw Error('difficulty error');
  return mask;
};
