declare module 'chacha20' {
  const encrypt: (privKey: Buffer, nonce: Buffer, data: Buffer) => Buffer;
  const decrypt: (privKey: Buffer, nonce: Buffer, data: Buffer) => Buffer;
  export { encrypt, decrypt };
}
