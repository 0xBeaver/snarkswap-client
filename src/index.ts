import circomlib from 'circomlib';
import snarkjs from 'snarkjs';

import * as pow from './lib/pow';
import * as eddsa from './lib/eddsa';
const lib = { circomlib, snarkjs };
export { lib, pow, eddsa };
