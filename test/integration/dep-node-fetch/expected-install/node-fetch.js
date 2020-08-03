// native patch for: node-fetch, whatwg-fetch
// ref: https://github.com/tc39/proposal-global
var getGlobal = function () {
  if (typeof self !== 'undefined') { return self; }
  if (typeof window !== 'undefined') { return window; }
  if (typeof global !== 'undefined') { return global; }
  throw new Error('unable to locate global object');
};
var global = getGlobal();
var index = global.fetch.bind(global);
const Headers = global.Headers;
const Request = global.Request;
const Response = global.Response;

export default index;
export { Headers, Request, Response };
