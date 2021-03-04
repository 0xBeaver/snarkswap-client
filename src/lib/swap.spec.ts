import test from 'ava';
import { toWei } from 'web3-utils';

import { Note } from './note';
import { hideSwap, SwapType } from './swap';
import { privToPubKey } from './utils';

test('hideSwap & verifySwap', async (t) => {
  const privKey = 1020304050607080900010203040506070809000102030405060708090001n;
  const pubKey = privToPubKey(privKey);

  const DAI = BigInt('0x6b175474e89094c44da98b954eedeac495271d0f');
  const WETH = BigInt('0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2');

  // value @ 1614930738
  const reserve0 = 63639638836841424649744903n;
  const reserve1 = 43372742079468723273929n;

  const sourceA: Note = {
    address: WETH,
    amount: BigInt(toWei('50000')),
    pubKey,
    salt: 1n,
  };
  const sourceB: Note = {
    address: DAI,
    amount: BigInt(toWei('10000000')),
    pubKey,
    salt: 2n,
  };
  const result = await hideSwap(
    privKey,
    reserve0,
    reserve1,
    sourceA,
    sourceB,
    DAI,
    WETH,
    BigInt(toWei('5000000')),
    SwapType.Token0In,
    { numerator: 3, denominator: 1000 },
    16
  );
  t.log(result);
  t.not(result, undefined);
});
