const REGISTERED_MODULES = {};

class HotModuleState {
  constructor(id) {
    this.id = id;
    this.disposeCallbacks = [];
  }
  lock() {
    this.isLocked = true;
  }
  dispose(cb) {
    this.disposeCallbacks.push(cb);
  }
  accept(cb = true) {
    if (!this.isLocked) {
      this.acceptCallback = cb;
    }
  }
}

function debug(...args) {
  console.log('[snowpack:hmr]', ...args);
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
  let state = null;
  const cssModuleState = REGISTERED_MODULES[id];
  if (cssModuleState && id.endsWith('.module.css')) {
    // const response = await import(id + `?mtime=${Date.now()}`);
    // cssModuleState({module: response});
    state = cssModuleState;
  }
  const proxyModuleListener = REGISTERED_MODULES[id + '.proxy.js'];
  if (!state && proxyModuleListener) {
    state = proxyModuleListener;
    // const response = await fetch(id);
    // const code = await response.text();
    // proxyModuleListener({code});
  }

  const moduleListener = REGISTERED_MODULES[id];
  if (!state && moduleListener && id.endsWith('.js')) {
    // const response = await import(id + `?mtime=${Date.now()}`);
    // moduleListener({module: response});
    state = moduleListener;
  }

  if (!state) {
    return false;
  }

  const acceptCallback = state.acceptCallback;
  const disposeCallbacks = state.disposeCallbacks;
  state.disposeCallbacks = [];
  // const disposeCallback = state.disposeCallback;
  // delete globalState.afterUpdateCallbacks[fileId];
  // delete globalState.beforeUpdateCallbacks[fileId];
  // delete state.acceptCallback;

  if (!acceptCallback) {
    return false;
  }
  let module;
  if (id.endsWith('.js') || id.endsWith('.module.css')) {
    module = await import(id + `?mtime=${Date.now()}`);
  } else {
    module = await import(id + '.proxy.js' + `?mtime=${Date.now()}`);
  }
  if (acceptCallback && acceptCallback !== true) {
    await acceptCallback({module});
  }
  await Promise.all(disposeCallbacks.map((cb) => cb()));
  return true;
}

const source = new EventSource('/livereload');
const reload = () => location.reload(true);
source.onerror = () => (source.onopen = reload);
source.onmessage = async (e) => {
  const data = JSON.parse(e.data);
  debug('message', e.data);
  if (data.reload || !data.url) {
    reload();
    return;
  }
  const id = data.url.split('?')[0];
  debug(id, Object.keys(REGISTERED_MODULES));

  applyUpdate(id)
    .then((ok) => {
      if (!ok) reload();
    })
    .catch((err) => {
      console.error(err);
      reload();
    });
};

debug('listening for file changes...');
