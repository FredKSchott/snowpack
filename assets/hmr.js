const hotStates = {};

const globalState = {
  beforeUpdateCallbacks: {},
  afterUpdateCallbacks: {},
};

class HotState {
  constructor(id) {
    this.id = id;
    this.data = {}
  }

  dispose(cb) {
    this.disposeCallback = cb;
  }

  accept(cb = true) {
    this.acceptCallback = cb;
  }

  beforeUpdate(cb) {
    globalState.beforeUpdateCallbacks[this.id] = cb;
  }

  afterUpdate(cb) {
    globalState.afterUpdateCallbacks[this.id] = cb;
  }
}

const getHotState = id => {
  const existing = hotStates[id];
  if (existing) {
    return existing;
  }
  const state = new HotState(id);
  hotStates[id] = state;
  return state;
};

export const createHotContext = getHotState;

const serial = f => {
  let promise
  return (...args) => (promise = promise ? promise.then(() => f(...args)) : f(...args))
}

const applyUpdate = serial(async (event, id) => {
  if (event === 'add') {
    await import(id + `.proxy.js?mtime=${Date.now()}`);
    return true
  }

  const state = getHotState(id);
  const acceptCallback = state.acceptCallback;
  const disposeCallback = state.disposeCallback;

  delete globalState.afterUpdateCallbacks[id];
  delete globalState.beforeUpdateCallbacks[id];
  delete state.acceptCallback;
  delete state.disposeCallback;

  if (typeof disposeCallback === 'function') {
    await disposeCallback(state.data);
  }

  if (event === 'change') {
    if (!acceptCallback) return false;

    await import(id + `.proxy.js?mtime=${Date.now()}`);

    if (typeof acceptCallback === 'function') {
      await acceptCallback();
    }
  }

  return true;
})


const listeners = {};
export function apply(url, callback) {
  const fullUrl = new URL(url).pathname;
  listeners[fullUrl] = callback;
}

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
  console.log(fullUrl, listeners);
  const cssModuleListener = listeners[fullUrl];
  if (cssModuleListener && fullUrl.endsWith('.module.css')) {
    const response = await import(fullUrl + `?mtime=${Date.now()}`);
    cssModuleListener({module: response});
    return;
  }

  const proxyModuleListener = listeners[fullUrl + '.proxy.js'];
  if (proxyModuleListener) {
    const response = await fetch(fullUrl);
    const code = await response.text();
    proxyModuleListener({code});
    return;
  }

  const moduleListener = listeners[fullUrl];
  if (moduleListener && fullUrl.endsWith('.js')) {
    const response = await import(fullUrl + `?mtime=${Date.now()}`);
    moduleListener({module: response});
    return;
  }

  reload();
};

console.log('[snowpack] listening for file changes');
