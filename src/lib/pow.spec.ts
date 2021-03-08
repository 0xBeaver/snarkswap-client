import test from 'ava';
import { BigNumber } from 'ethers';

import { getBestMask, getDifficulty, hideReserve, solve } from './pow';

test('getDifficulty', (t) => {
  t.is(getDifficulty(parseInt('10000000', 2)), 1);
  t.is(getDifficulty(parseInt('10000101', 2)), 3);
  t.is(getDifficulty(parseInt('11111111', 2)), 8);
});

test('getBestMask', (t) => {
  const difficulty = 11;
  const reserve0 = BigNumber.from(parseInt('00000001111110000000000', 2));
  const besMask0 = BigNumber.from(parseInt('00000011111000000000000', 2));
  const reserve1 = BigNumber.from(parseInt('00000000011110000000000', 2));
  const besMask1 = BigNumber.from(parseInt('00000000111111000000000', 2));
  const bestMask = besMask0.shl(112).add(besMask1);
  t.true(getBestMask(difficulty, reserve0, reserve1).eq(bestMask));
});

const reserve0 = '8971234671621374';
const reserve1 = '91234700182377911837';
test('hide difficulty test', async (t) => {
  const { hReserve0, hReserve1 } = hideReserve(reserve0, reserve1, 0);
  t.true(hReserve0.eq(reserve0));
  t.true(hReserve1.eq(reserve1));
});

test('hide & solve - low difficulty', async (t) => {
  const { darkness: commitment, hReserve0, hReserve1, mask, salt } = hideReserve(
    reserve0,
    reserve1,
    8
  );
  console.time('solve');
  const result = await solve(commitment, hReserve0, hReserve1, mask, salt);
  console.timeEnd('solve');
  t.true(result.reserve0.eq(reserve0));
  t.true(result.reserve1.eq(reserve1));
  t.log(`Computed hash ${result.n} times`);
});

test.skip('hide & solve - high difficulty', async (t) => {
  const { darkness: commitment, hReserve0, hReserve1, mask, salt } = hideReserve(
    reserve0,
    reserve1,
    16
  );
  t.false(hReserve0.eq(reserve0));
  t.false(hReserve1.eq(reserve1));
  console.time('solve');
  const result = await solve(commitment, hReserve0, hReserve1, mask, salt);
  console.timeEnd('solve');
  t.true(result.reserve0.eq(reserve0));
  t.true(result.reserve1.eq(reserve1));
  t.log(`Computed hash ${result.n} times`);
});
