import test from 'ava';

import { getBestMask, getDifficulty, hideReserve, solve } from './pow';

test('getDifficulty', (t) => {
  t.is(getDifficulty(BigInt(parseInt('10000000', 2))), 1);
  t.is(getDifficulty(BigInt(parseInt('10000101', 2))), 3);
  t.is(getDifficulty(BigInt(parseInt('11111111', 2))), 8);
});

test('getBestMask', (t) => {
  const difficulty = 11;
  const reserve0 = BigInt(parseInt('00000001111110000000000', 2));
  const besMask0 = BigInt(parseInt('00000011111000000000000', 2));
  const reserve1 = BigInt(parseInt('00000000011110000000000', 2));
  const besMask1 = BigInt(parseInt('00000000111111000000000', 2));
  const bestMask = (besMask0 << 112n) + besMask1;
  t.is(getBestMask(difficulty, reserve0, reserve1), bestMask);
});

const reserve0 = 8971234671621374n;
const reserve1 = 91234700182377911837n;
test('hide difficulty test', async (t) => {
  const { hReserve0, hReserve1 } = hideReserve(reserve0, reserve1, 0);
  t.is(hReserve0, reserve0);
  t.is(hReserve1, reserve1);
});

test('hide & solve - low difficulty', async (t) => {
  const { commitment, hReserve0, hReserve1, mask, salt } = hideReserve(
    reserve0,
    reserve1,
    8
  );
  console.time('solve');
  const result = await solve(commitment, hReserve0, hReserve1, mask, salt);
  console.timeEnd('solve');
  t.is(result.reserve0, reserve0);
  t.is(result.reserve1, reserve1);
  t.log(`Computed hash ${result.n} times`);
});

test.skip('hide & solve - high difficulty', async (t) => {
  const { commitment, hReserve0, hReserve1, mask, salt } = hideReserve(
    reserve0,
    reserve1,
    16
  );
  t.not(hReserve0, reserve0);
  t.not(hReserve1, reserve1);
  console.time('solve');
  const result = await solve(commitment, hReserve0, hReserve1, mask, salt);
  console.timeEnd('solve');
  t.is(result.reserve0, reserve0);
  t.is(result.reserve1, reserve1);
  t.log(`Computed hash ${result.n} times`);
});
