import test from 'ava';

import { signEdDSA, verifyEdDSA } from './eddsa';
import { privToPubKey } from './utils';

test('signEdDSA & verifyEdDSA', async (t) => {
  const msg = '1234';
  const privKey =
    '1020304050607080900010203040506070809000102030405060708090001';
  const pubKey = privToPubKey(privKey);
  const proof = await signEdDSA(msg, privKey);
  const verified = await verifyEdDSA(msg, pubKey, proof);
  t.is(verified, true);
});
