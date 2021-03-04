import assert from 'assert';

import circomlib from 'circomlib';

export type Note = {
  readonly address: bigint;
  readonly amount: bigint;
  readonly pubKey: readonly bigint[];
  readonly salt: bigint;
};

export const hash = (note: Note): bigint => {
  assert(note.address.toString(2).length <= 160, 'invalid address');
  assert(note.amount.toString(2).length <= 239, 'invalid amount');
  assert(note.pubKey[0].toString(2).length <= 254, 'invalid pubkey');
  assert(note.pubKey[1].toString(2).length <= 254, 'invalid pubkey');
  assert(note.salt.toString(2).length <= 128, 'no need for too large salt');
  const noteHash = circomlib.poseidon([
    note.address,
    note.amount,
    note.pubKey[0],
    note.pubKey[1],
    note.salt,
  ]);
  return noteHash;
};
