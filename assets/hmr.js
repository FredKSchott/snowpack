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
