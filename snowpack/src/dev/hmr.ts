import http from 'http';
import http2 from 'http2';
import path from 'path';
import onProcessExit from 'signal-exit';
import {FileBuilder} from '../build/file-builder';
import {EsmHmrEngine} from '../hmr-server-engine';
import {SnowpackConfig} from '../types';
import {getCacheKey, hasExtension} from '../util';

export function startHmrEngine(
  inMemoryBuildCache: Map<string, FileBuilder>,
  server: http.Server | http2.Http2SecureServer | undefined,
  config: SnowpackConfig,
) {
  const {hmrDelay} = config.devOptions;
  const hmrPort = config.devOptions.hmrPort || config.devOptions.port;
  const hmrEngineOptions = Object.assign(
    {delay: hmrDelay},
    config.devOptions.hmrPort || !server ? {port: hmrPort} : {server, port: hmrPort},
  );
  const hmrEngine = new EsmHmrEngine(hmrEngineOptions);
  onProcessExit(() => {
    hmrEngine.disconnectAllClients();
  });

  // Live Reload + File System Watching
  function updateOrBubble(url: string, visited: Set<string>) {
    if (visited.has(url)) {
      return;
    }
    const node = hmrEngine.getEntry(url);
    const isBubbled = visited.size > 0;
    if (node && node.isHmrEnabled) {
      hmrEngine.broadcastMessage({type: 'update', url, bubbled: isBubbled});
    }
    visited.add(url);
    if (node && node.isHmrAccepted) {
      // Found a boundary, no bubbling needed
    } else if (node && node.dependents.size > 0) {
      node.dependents.forEach((dep) => {
        hmrEngine.markEntryForReplacement(node, true);
        updateOrBubble(dep, visited);
      });
    } else {
      // We've reached the top, trigger a full page refresh
      hmrEngine.broadcastMessage({type: 'reload'});
    }
  }

  function handleHmrUpdate(fileLoc: string, originalUrl: string) {
    // CSS files may be loaded directly in the client (not via JS import / .proxy.js)
    // so send an "update" event to live update if thats the case.
    if (hasExtension(originalUrl, '.css') && !hasExtension(originalUrl, '.module.css')) {
      hmrEngine.broadcastMessage({type: 'update', url: originalUrl, bubbled: false});
    }

    // Append ".proxy.js" to Non-JS files to match their registered URL in the
    // client app.
    let updatedUrl = originalUrl;
    if (!hasExtension(updatedUrl, '.js')) {
      updatedUrl += '.proxy.js';
    }

    // Check if a virtual file exists in the resource cache (ex: CSS from a
    // Svelte file) If it does, mark it for HMR replacement but DONT trigger a
    // separate HMR update event. This is because a virtual resource doesn't
    // actually exist on disk, so we need the main resource (the JS) to load
    // first. Only after that happens will the CSS exist.
    const virtualCssFileUrl = updatedUrl.replace(/.js$/, '.css');
    const virtualNode =
      virtualCssFileUrl.includes(path.basename(fileLoc)) &&
      hmrEngine.getEntry(`${virtualCssFileUrl}.proxy.js`);
    if (virtualNode) {
      hmrEngine.markEntryForReplacement(virtualNode, true);
    }

    // If the changed file exists on the page, trigger a new HMR update.
    if (hmrEngine.getEntry(updatedUrl)) {
      updateOrBubble(updatedUrl, new Set());
      return;
    }

    // Otherwise, reload the page if the file exists in our hot cache (which
    // means that the file likely exists on the current page, but is not
    // supported by HMR (HTML, image, etc)).
    if (inMemoryBuildCache.has(getCacheKey(fileLoc, {isSSR: false, env: process.env.NODE_ENV}))) {
      hmrEngine.broadcastMessage({type: 'reload'});
      return;
    }
  }

  return {hmrEngine, handleHmrUpdate};
}
