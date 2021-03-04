import { eddsa } from 'circomlib';
import { hexToBytes, toHex } from 'web3-utils';

export const privToBuffer = (privKey: bigint): Buffer => {
  const buff = Buffer.from(hexToBytes(toHex(privKey.toString(10))));
  return buff;
};

export const privToPubKey = (privKey: bigint): readonly bigint[] => {
  const privKeyBuff = privToBuffer(privKey);
  const pubKey = eddsa.prv2pub(privKeyBuff);
  return pubKey;
};
