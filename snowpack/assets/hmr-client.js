/**
 * esm-hmr/runtime.ts
 * A client-side implementation of the ESM-HMR spec, for reference.
 */

const isWindowDefined = typeof window !== 'undefined';

function log(...args) {
  console.log('[ESM-HMR]', ...args);
}
function reload() {
  if (!isWindowDefined) {
    return;
  }
  location.reload(true);
}
/** Clear all error overlays from the page */
function clearErrorOverlay() {
  if (!isWindowDefined) {
    return;
  }
  document.querySelectorAll('hmr-error-overlay').forEach((el) => el.remove());
}
/** Create an error overlay (if custom element exists on the page). */
function createNewErrorOverlay(data) {
  if (!isWindowDefined) {
    return;
  }
  const HmrErrorOverlay = customElements.get('hmr-error-overlay');
  if (HmrErrorOverlay) {
    const overlay = new HmrErrorOverlay(data);
    clearErrorOverlay();
    document.body.appendChild(overlay);
  }
}

let SOCKET_MESSAGE_QUEUE = [];
function _sendSocketMessage(msg) {
  socket.send(JSON.stringify(msg));
}
function sendSocketMessage(msg) {
  if (socket.readyState !== socket.OPEN) {
    SOCKET_MESSAGE_QUEUE.push(msg);
  } else {
    _sendSocketMessage(msg);
  }
}

let socketURL = isWindowDefined && window.HMR_WEBSOCKET_URL;
if (!socketURL) {
  const socketHost =
    isWindowDefined && window.HMR_WEBSOCKET_PORT && (window.HMR_WEBSOCKET_PORT !== 80)
      ? `${location.hostname}:${window.HMR_WEBSOCKET_PORT}`
      : location.host;
  socketURL = (location.protocol === 'http:' ? 'ws://' : 'wss://') + socketHost + '/';
}

const socket = new WebSocket(socketURL, 'esm-hmr');
socket.addEventListener('open', () => {
  SOCKET_MESSAGE_QUEUE.forEach(_sendSocketMessage);
  SOCKET_MESSAGE_QUEUE = [];
});
const REGISTERED_MODULES = {};
class HotModuleState {
  constructor(id) {
    this.data = {};
    this.isLocked = false;
    this.isDeclined = false;
    this.isAccepted = false;
    this.acceptCallbacks = [];
    this.disposeCallbacks = [];
    this.id = id;
  }
  lock() {
    this.isLocked = true;
  }
  dispose(callback) {
    this.disposeCallbacks.push(callback);
  }
  invalidate() {
    reload();
  }
  decline() {
    this.isDeclined = true;
  }
  accept(_deps, callback = true) {
    if (this.isLocked) {
      return;
    }
    if (!this.isAccepted) {
      sendSocketMessage({id: this.id, type: 'hotAccept'});
      this.isAccepted = true;
    }
    if (!Array.isArray(_deps)) {
      callback = _deps || callback;
      _deps = [];
    }
    if (callback === true) {
      callback = () => {};
    }
    const deps = _deps.map((dep) => {
      const ext = dep.split('.').pop();
      if (!ext) {
        dep += '.js';
      } else if (ext !== 'js') {
        dep += '.proxy.js';
      }
      return new URL(dep, `${window.location.origin}${this.id}`).pathname;
    });
    this.acceptCallbacks.push({
      deps,
      callback,
    });
  }
}
export function createHotContext(fullUrl) {
  const id = new URL(fullUrl).pathname;
  const existing = REGISTERED_MODULES[id];
  if (existing) {
    existing.lock();
    runModuleDispose(id);
    return existing;
  }
  const state = new HotModuleState(id);
  REGISTERED_MODULES[id] = state;
  return state;
}

/** Called when any CSS file is loaded. */
async function runCssStyleAccept({url: id}) {
  const nonce = Date.now();
  const oldLinkEl =
    document.head.querySelector(`link[data-hmr="${id}"]`) ||
    document.head.querySelector(`link[href="${id}"]`);
  if (!oldLinkEl) {
    return true;
  }
  const linkEl = oldLinkEl.cloneNode(false);
  linkEl.dataset.hmr = id;
  linkEl.type = 'text/css';
  linkEl.rel = 'stylesheet';
  linkEl.href = id + '?mtime=' + nonce;
  linkEl.addEventListener(
    'load',
    // Once loaded, remove the old link element (with some delay, to avoid FOUC)
    () => setTimeout(() => document.head.removeChild(oldLinkEl), 30),
    false,
  );
  oldLinkEl.parentNode.insertBefore(linkEl, oldLinkEl)
  return true;
}

/** Called when a new module is loaded, to pass the updated module to the "active" module */
async function runJsModuleAccept({url: id, bubbled}) {
  const state = REGISTERED_MODULES[id];
  if (!state) {
    return false;
  }
  if (state.isDeclined) {
    return false;
  }
  const acceptCallbacks = state.acceptCallbacks;
  const updateID = Date.now();
  for (const {deps, callback: acceptCallback} of acceptCallbacks) {
    const [module, ...depModules] = await Promise.all([
      import(id + `?mtime=${updateID}`),
      ...deps.map((d) => import(d + `?mtime=${updateID}`)),
    ]);
    acceptCallback({module, bubbled, deps: depModules});
  }
  return true;
}

/** Called when a new module is loaded, to run cleanup on the old module (if needed) */
async function runModuleDispose(id) {
  const state = REGISTERED_MODULES[id];
  if (!state) {
    return false;
  }
  if (state.isDeclined) {
    return false;
  }
  const disposeCallbacks = state.disposeCallbacks;
  state.disposeCallbacks = [];
  state.data = {};
  disposeCallbacks.map((callback) => callback());
  return true;
}
socket.addEventListener('message', ({data: _data}) => {
  if (!_data) {
    return;
  }
  const data = JSON.parse(_data);
  if (data.type === 'reload') {
    log('message: reload');
    reload();
    return;
  }
  if (data.type === 'error') {
    console.error(
      `[ESM-HMR] ${data.fileLoc ? data.fileLoc + '\n' : ''}`,
      data.title + '\n' + data.errorMessage,
    );
    createNewErrorOverlay(data);
    return;
  }
  if (data.type === 'update') {
    log('message: update', data);
    (data.url.endsWith('.css') ? runCssStyleAccept(data) : runJsModuleAccept(data))
      .then((ok) => {
        if (ok) {
          clearErrorOverlay();
        } else {
          reload();
        }
      })
      .catch((err) => {
        console.error('[ESM-HMR] Hot Update Error', err);
        // A failed import gives a TypeError, but invalid ESM imports/exports give a SyntaxError.
        // Failed build results already get reported via a better WebSocket update.
        // We only want to report invalid code like a bad import that doesn't exist.
        if (err instanceof SyntaxError) {
          createNewErrorOverlay({
            title: 'Hot Update Error',
            fileLoc: data.url,
            errorMessage: err.message,
            errorStackTrace: err.stack,
          });
        }
      });
    return;
  }
  log('message: unknown', data);
});
log('listening for file changes...');

/** Runtime error reporting: If a runtime error occurs, show it in an overlay. */
isWindowDefined && window.addEventListener('error', function (event) {
  if (window.snowpackHmrErrorOverlayIgnoreErrors) {
    const ignoreErrors = window.snowpackHmrErrorOverlayIgnoreErrors;
    for (const item of ignoreErrors) {
      if (event.message && event.message.match(item)) {
        console.warn('[ESM-HMR] Hmr Error Overlay Ignored', event.message);
        return
      }
    }
  }
  // Generate an "error location" string
  let fileLoc;
  if (event.filename) {
    fileLoc = event.filename;
    if (event.lineno !== undefined) {
      fileLoc += ` [:${event.lineno}`;
      if (event.colno !== undefined) {
        fileLoc += `:${event.colno}`;
      }
      fileLoc += `]`;
    }
  }
  let errorMessage = event.message;
  if (event.message === 'Uncaught ReferenceError: process is not defined') {
    errorMessage += `\n(Tip: Node's "process" global does not exist in Snowpack. Use "import.meta.env" instead of "process.env").`;
  }
  createNewErrorOverlay({
    title: 'Unhandled Runtime Error',
    fileLoc,
    errorMessage: errorMessage,
    errorStackTrace: event.error ? event.error.stack : undefined,
  });
});
