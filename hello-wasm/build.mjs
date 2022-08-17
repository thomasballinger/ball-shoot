#!/usr/bin/env node



import { basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import fs from 'fs';
import path from 'path';
import util from 'util';
const s = fs.readFileSync(path.join(__dirname, './pkg/hello_wasm_bg.wasm'), {encoding: 'latin1'})

function encode(s) {
  return s.split('').map(c => c.charCodeAt(0))
}
const codeEncoded = encode(s);
const codeAsString = "[" + codeEncoded.map((n) => n.toString()).join(", ") + "]";
//const encode = ${encode.toString()};
//const codeAsString = ${util.inspect(s)};

const code = `
const code = ${codeAsString};

const linearBuffer = new Uint8Array(code);
const module = await WebAssembly.compile(linearBuffer);
export const instance = await WebAssembly.instantiate(module);
`
util.inspect()


console.log(code);
