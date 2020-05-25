function debug(...args) {
  console.log('[snowpack:hmr]', ...args);
}

function reload() {
  location.reload(true);
}

const REGISTERED_MODULES = {};
let SOCKET_MESSAGE_QUEUE = [];

const socket = new WebSocket('ws://localhost:12321/');
socket.addEventListener('open', () => {
  SOCKET_MESSAGE_QUEUE.forEach(_sendSocketMessage);
  SOCKET_MESSAGE_QUEUE = [];
});

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

class HotModuleState {
  constructor(id) {
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
  accept(callback = true) {
    if (this.isLocked) {
      return;
    }
    if (!this.isAccepted) {
      sendSocketMessage({id: this.id, type: 'hotAccept'});
      this.isAccepted = true;
    }
    this.acceptCallbacks.push(callback);
  }
}

export function createHotContext(fullUrl) {
  const id = new URL(fullUrl).pathname;
  const existing = REGISTERED_MODULES[id];
  if (existing) {
    existing.lock();
    return existing;
  }
  const state = new HotModuleState(id);
  REGISTERED_MODULES[id] = state;
  return state;
}

async function applyUpdate(id) {
  const state = REGISTERED_MODULES[id] || REGISTERED_MODULES[id + '.proxy.js'];
  if (!state) {
    return false;
  }
  if (state.isDeclined) {
    return false;
  }
  const data = {};
  const acceptCallbacks = state.acceptCallbacks;
  const disposeCallbacks = state.disposeCallbacks;
  state.disposeCallbacks = [];
  disposeCallbacks.map((callback) => callback({data}));
  if (acceptCallbacks.length > 0) {
    const module = await import(id + `?mtime=${Date.now()}`);
    acceptCallbacks.forEach((callback) => {
      if (callback === true) {
        // Do nothing, importing the module side-effects was enough.
      } else {
        callback({module, data});
      }
    });
  }
  return true;
}

socket.addEventListener('message', ({data: _data}) => {
  if (!_data) {
    return;
  }
  const data = JSON.parse(_data);
  debug('message', data);
  if (data.type === 'reload') {
    debug('message: reload');
    reload();
    return;
  }
  if (data.type !== 'update') {
    debug('message: unknown', data);
    return;
  }
  debug('message: update', data);
  debug(data.url, Object.keys(REGISTERED_MODULES));
  applyUpdate(data.url)
    .then((ok) => {
      if (!ok) {
        reload();
      }
    })
    .catch((err) => {
      console.error(err);
      reload();
    });
});

debug('listening for file changes...');
