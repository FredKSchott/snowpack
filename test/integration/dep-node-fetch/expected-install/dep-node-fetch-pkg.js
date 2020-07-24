// native patch for: node-fetch, whatwg-fetch
// ref: https://github.com/tc39/proposal-global
var getGlobal = function () {
  if (typeof self !== 'undefined') { return self; }
  if (typeof window !== 'undefined') { return window; }
  if (typeof global !== 'undefined') { return global; }
  throw new Error('unable to locate global object');
};
var global = getGlobal();
var nodeFetch = global.fetch.bind(global);
const Headers = global.Headers;
const Request = global.Request;
const Response = global.Response;

var fetch = /*#__PURE__*/Object.freeze({
  __proto__: null,
  'default': nodeFetch,
  Headers: Headers,
  Request: Request,
  Response: Response
});

// native patch for: node-fetch, whatwg-fetch
// ref: https://github.com/tc39/proposal-global
var getGlobal$1 = function () {
  if (typeof self !== 'undefined') { return self; }
  if (typeof window !== 'undefined') { return window; }
  if (typeof global$1 !== 'undefined') { return global$1; }
  throw new Error('unable to locate global object');
};
var global$1 = getGlobal$1();
var whatwgFetch = global$1.fetch.bind(global$1);
const Headers$1 = global$1.Headers;
const Request$1 = global$1.Request;
const Response$1 = global$1.Response;

var fetch_ = /*#__PURE__*/Object.freeze({
  __proto__: null,
  'default': whatwgFetch,
  Headers: Headers$1,
  Request: Request$1,
  Response: Response$1
});

console.log(fetch, fetch_);
