const hotStates = {};

class HotState {
  constructor(id) {
    this.id = id;
    this.data = {};
    this.disposeCallbacks = [];
  }
  lock() {
    this.isLocked = true;
  }
  dispose(cb) {
    this.disposeCallbacks.push(cb);
  }
  accept(cb = true) {
    if (this.isLocked) {
      return;
    }
    this.acceptCallback = cb;
  }
  // beforeUpdate(cb) {
  //   globalState.beforeUpdateCallbacks[this.id] = cb;
  // }
  // afterUpdate(cb) {
  //   globalState.afterUpdateCallbacks[this.id] = cb;
  // }
}

export const createHotContext = (fullUrl) => {
  const id = new URL(fullUrl).pathname;
  const existing = hotStates[id];
  if (existing) {
    existing.lock();
    return existing;
  }
  const state = new HotState(id);
  hotStates[id] = state;
  return state;
};

const serial = (f) => {
  let promise;
  return (...args) => (promise = promise ? promise.then(() => f(...args)) : f(...args));
};

const applyUpdate = serial(async (fullUrl) => {
  let state = null;
  const cssModuleState = hotStates[fullUrl];
  if (cssModuleState && fullUrl.endsWith('.module.css')) {
    // const response = await import(fullUrl + `?mtime=${Date.now()}`);
    // cssModuleState({module: response});
    state = cssModuleState;
  }
  const proxyModuleListener = hotStates[fullUrl + '.proxy.js'];
  if (!state && proxyModuleListener) {
    state = proxyModuleListener;
    // const response = await fetch(fullUrl);
    // const code = await response.text();
    // proxyModuleListener({code});
  }

  const moduleListener = hotStates[fullUrl];
  if (!state && moduleListener && fullUrl.endsWith('.js')) {
    // const response = await import(fullUrl + `?mtime=${Date.now()}`);
    // moduleListener({module: response});
    state = moduleListener;
  }

  if (!state) {
    return false;
  }

  const acceptCallback = state.acceptCallback;
  // const disposeCallback = state.disposeCallback;
  // delete globalState.afterUpdateCallbacks[fileId];
  // delete globalState.beforeUpdateCallbacks[fileId];
  // delete state.acceptCallback;

  await Promise.all(state.disposeCallbacks.map((cb) => cb(state.data)));
  state.disposeCallbacks = [];

  if (!acceptCallback) {
    return false;
  }
  if (acceptCallback === true) {
    return true;
  }
  if (fullUrl.endsWith('.js') || fullUrl.endsWith('.module.css')) {
    const response = await import(fullUrl + `?mtime=${Date.now()}`);
    await acceptCallback({module: response});
  } else {
    const response = await import(fullUrl + '.proxy.js' + `?mtime=${Date.now()}`);
    await acceptCallback({module: response});
  }
  return true;
});

const source = new EventSource('/livereload');
const reload = () => location.reload(true);
source.onerror = () => (source.onopen = reload);
source.onmessage = async (e) => {
  const data = JSON.parse(e.data);
  console.log(e.data);
  if (!data.url) {
    reload();
    return;
  }
  const fullUrl = data.url.split('?')[0];
  console.log(fullUrl, hotStates);

  applyUpdate(fullUrl)
    .then((ok) => {
      if (!ok) reload();
    })
    .catch((err) => {
      console.error(err);
      reload();
    });
};

console.log('[snowpack] listening for file changes');
