
const wasmUrl = new URL('./dist/add.wasm', import.meta.url);

// This should be ignored
const otherUrl = new URL('/api/stuff.json', import.meta.url);

export {
  wasmUrl,
  otherUrl
};