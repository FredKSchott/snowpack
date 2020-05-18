function debug(...args) {
  console.log('[snowpack:hmr]', ...args);
}
function reload() {
  location.reload(true);
}
const REGISTERED_MODULES = {};
class HotModuleState {
  constructor(id) {
    this.isLocked = false;
    this.disposeCallbacks = [];
    this.id = id;
  }
  lock() {
    this.isLocked = true;
  }
  dispose(callback) {
    this.disposeCallbacks.push(callback);
  }
  accept(callback = true) {
    if (!this.isLocked) {
      this.acceptCallback = callback;
    }
    this.isLocked = true;
  }
  invalidate() {
    reload();
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
  const acceptCallback = state.acceptCallback;
  const disposeCallbacks = state.disposeCallbacks;
  state.disposeCallbacks = [];
  if (acceptCallback) {
    const module = await import(state.id + `?mtime=${Date.now()}`);
    if (acceptCallback === true) {
      // Do nothing, importing the module side-effects was enough.
    } else {
      await acceptCallback({module});
    }
  }
  await Promise.all(disposeCallbacks.map((cb) => cb()));
  return true;
}
const source = new EventSource('/livereload');
source.onerror = () => (source.onopen = reload);
source.onmessage = async (e) => {
  const data = JSON.parse(e.data);
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
};
debug('listening for file changes...');
