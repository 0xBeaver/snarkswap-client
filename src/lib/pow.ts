/* eslint-disable functional/no-throw-statement */
/* eslint-disable functional/no-loop-statement */
/* eslint-disable functional/no-let */
import circomlib from 'circomlib';
import { BigNumber, BigNumberish } from 'ethers';
import {
  hexZeroPad,
  keccak256,
  randomBytes,
  solidityPack,
} from 'ethers/lib/utils';

const RIGHT_112_BITS = (1n << 112n) - 1n;

export const solve = async (
  darkness: string,
  hReserve0: BigNumberish,
  hReserve1: BigNumberish,
  mask: BigNumberish,
  salt: BigNumberish
): Promise<{
  readonly reserve0: BigNumber;
  readonly reserve1: BigNumber;
  readonly n: number;
}> => {
  const _hReserve0 = BigInt(BigNumber.from(hReserve0));
  const _hReserve1 = BigInt(BigNumber.from(hReserve1));
  const _mask = BigInt(BigNumber.from(mask));
  const _salt = BigInt(BigNumber.from(salt));
  const maskHex = hexZeroPad(BigNumber.from(mask).toHexString(), 28);
  return new Promise((resolve) => {
    // concatenated
    const concatHReserve = (_hReserve0 << 112n) | _hReserve1;
    const unknownBits = [...Array(224).keys()]
      .filter((i) => (_mask & (1n << BigInt(i))) !== 0n)
      .map((i) => BigInt(i))
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .sort((_a, _b) => {
        return 0.5 - Math.random();
      });

    const numOfCases = 1 << unknownBits.length;
    let hRatio: BigNumber;
    for (let i = 0; i < numOfCases; i += 1) {
      let flipper = 0n;
      for (let j = 0; j < unknownBits.length; j += 1) {
        flipper |= (i & (1 << j)) === 0 ? 0n : 1n << unknownBits[j];
      }
      const guessedReserve = concatHReserve ^ flipper;

      const reserve0 = guessedReserve >> 112n;
      const reserve1 = guessedReserve & RIGHT_112_BITS;
      hRatio = BigNumber.from(circomlib.poseidon([reserve0, reserve1, _salt]));
      const computedDarkness = keccak256(
        solidityPack(
          ['uint256', 'uint112', 'uint112', 'uint224'],
          [hRatio, hReserve0, hReserve1, maskHex]
        )
      );
      if (BigNumber.from(darkness).eq(computedDarkness)) {
        resolve({
          reserve0: BigNumber.from(reserve0),
          reserve1: BigNumber.from(reserve1),
          n: i,
        });
      }
    }
    throw Error('Failed to solve the PoW puzzle. Verify SNARK');
  });
};

export const hideReserve = (
  reserve0: BigNumberish,
  reserve1: BigNumberish,
  difficulty: number
): {
  readonly darkness: string;
  readonly hReserve0: BigNumber;
  readonly hReserve1: BigNumber;
  readonly mask: BigNumber;
  readonly salt: BigNumber;
  readonly hRatio: BigNumber;
} => {
  if (difficulty > 30) throw Error('Difficulty is too large');

  const _reserve0 = BigInt(BigNumber.from(reserve0));
  const _reserve1 = BigInt(BigNumber.from(reserve1));
  const mask = getBestMask(difficulty, reserve0, reserve1);
  // reserve0FirstBit
  // reserve1FirstBit
  let concatReserve = (_reserve0 << 112n) | _reserve1;
  for (let i = 0n; i < 224n; i += 1n) {
    if (((1n << i) & BigInt(mask)) !== 0n) {
      concatReserve |= Math.random() < 0.5 ? 1n << i : 0n;
    }
  }
  const hReserve0 = BigNumber.from(concatReserve >> 112n);
  const hReserve1 = BigNumber.from(concatReserve & RIGHT_112_BITS);
  const salt = BigNumber.from(randomBytes(16));
  const hRatio = BigNumber.from(
    circomlib.poseidon([_reserve0, _reserve1, BigInt(salt)])
  );
  const darkness = keccak256(
    solidityPack(
      ['uint256', 'uint112', 'uint112', 'uint224'],
      [hRatio, hReserve0, hReserve1, mask]
    )
  );
  return {
    darkness,
    hReserve0,
    hReserve1,
    mask,
    salt,
    hRatio,
  };
};

export const getDifficulty = (mask: BigNumberish): number => {
  return BigInt(BigNumber.from(mask)).toString(2).replace(/0/g, '').length;
};

export const getBestMask = (
  difficulty: number,
  reserve0: BigNumberish,
  reserve1: BigNumberish
): BigNumber => {
  if (difficulty === 0) return BigNumber.from(0);
  const reserve0FirstBit = BigInt(BigNumber.from(reserve0)).toString(2).length;
  const reserve1FirstBit = BigInt(BigNumber.from(reserve1)).toString(2).length;
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

  const mask = BigNumber.from((mask0 << 112n) | mask1);
  if (getDifficulty(mask) > difficulty) throw Error('difficulty error');
  return mask;
};
