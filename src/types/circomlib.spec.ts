import test from 'ava';
import circomlib from 'circomlib';

test('poseidon', (t) => {
  t.is(
    circomlib.poseidon([1234n, 4321n]),
    12384503409460211275296730302116273884825946305305235951279779955197099791503n
  );
  t.not(
    circomlib.poseidon([1234n, 4321n]),
    12384503409460211275296730302116273884825946305305235951279779955197099791500n
  );
});

test('eddsa', (t) => {
  const passcode = 'password';
  const pubKey = circomlib.eddsa.prv2pub(passcode);
  const message = 1234n;
  const signature = circomlib.eddsa.signPoseidon(passcode, message);
  t.is(circomlib.eddsa.verifyPoseidon(message, signature, pubKey), true);
  t.is(circomlib.eddsa.verifyPoseidon(message + 1n, signature, pubKey), false);
});
