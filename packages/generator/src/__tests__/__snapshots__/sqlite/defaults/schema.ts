import * as autoInts from './auto-ints';
import * as autoBigInts from './auto-big-ints';
import * as generateds from './generateds';
import * as literals from './literals';

export const schema = { ...autoInts, ...autoBigInts, ...generateds, ...literals };