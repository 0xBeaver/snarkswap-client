import test from 'ava';
import { Wallet } from 'ethers';

import { genEdDSAPrivKey } from './utils';

test('genEdDSAPrivKey', async (t) => {
  const ecdsaPrivKey = '0xabcd';
  const wallet = new Wallet(ecdsaPrivKey);
  const eddsaPriv = genEdDSAPrivKey(Buffer.from('abcd', 'hex'), wallet);
  t.not(eddsaPriv, undefined);
});
