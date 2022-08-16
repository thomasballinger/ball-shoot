
const encode = function encode(s) {
  return s.split('').map(c => c.charCodeAt(0))
};
const codeAsString = '\x00asm\x01\x00\x00\x00\x01\x07\x01`\x02\x7F\x7F\x01\x7F\x03\x02\x01\x00\x05\x03\x01\x00\x11\x07\x10\x02\x06memory\x02\x00\x03add\x00\x00\n' +
  '\t\x01\x07\x00 \x00 \x01j\x0B\x00{\tproducers\x02\blanguage\x01\x04Rust\x00\fprocessed-by\x03\x05rustc\x1D1.60.0 (7737e0b5c 2022-04-04)\x06walrus\x060.19.0\fwasm-bindgen\x120.2.82 (59883eaca)';
const code = encode(codeAsString);

const linearBuffer = new Uint8Array(code);
const module = await WebAssembly.compile(linearBuffer);
export const instance = await WebAssembly.instantiate(module);

