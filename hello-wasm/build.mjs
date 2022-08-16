#!/usr/bin/env node

import fs from 'fs';
import util from 'util';
const s = fs.readFileSync('./pkg/hello_wasm_bg.wasm', {encoding: 'latin1'})

function encode(s) {
  return s.split('').map(c => c.charCodeAt(0))
}
const code = `
const encode = ${encode.toString()};
const codeAsString = ${util.inspect(s)};
const code = encode(codeAsString);

const linearBuffer = new Uint8Array(code);
const module = await WebAssembly.compile(linearBuffer);
export const instance = await WebAssembly.instantiate(module);
`

console.log(code);
