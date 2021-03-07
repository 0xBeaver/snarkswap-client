import assert from 'assert';

import circomlib from 'circomlib';
import { BigNumber, BigNumberish } from 'ethers';

export type Note = {
  readonly address: BigNumberish;
  readonly amount: BigNumberish;
  readonly pubKey: readonly BigNumberish[];
  readonly salt: BigNumberish;
};

const One = BigNumber.from(1);

export const getNoteHash = (note: Note): BigNumber => {
  assert(One.shl(160).gt(note.address), 'invalid address');
  assert(One.shl(239).gt(note.amount), 'invalid amount');
  assert(One.shl(254).gt(note.pubKey[0]), 'invalid pubkey');
  assert(One.shl(254).gt(note.pubKey[1]), 'invalid pubkey');
  assert(One.shl(128).gt(note.salt), 'no need for too large salt ');
  const noteHash = circomlib.poseidon([
    BigInt(BigNumber.from(note.address)),
    BigInt(BigNumber.from(note.amount)),
    BigInt(BigNumber.from(note.pubKey[0])),
    BigInt(BigNumber.from(note.pubKey[1])),
    BigInt(BigNumber.from(note.salt)),
  ]);
  return BigNumber.from(noteHash);
};
