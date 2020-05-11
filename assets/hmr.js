const listeners = {};
export function apply(url, callback) {
  const fullUrl = url.split('?')[0];
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
  if (!listeners[fullUrl]) {
    reload();
    return;
  }
  const listener = listeners[fullUrl];
  if (fullUrl.endsWith('.js')) {
    const response = await import(fullUrl + `?mtime=${Date.now()}`);
    listener({module: response});
  } else {
    const response = await fetch(fullUrl);
    const code = await response.text();
    listener({code});
  }
};

console.log('[snowpack] listening for file changes');
