import cacache from 'cacache';
import chokidar, {FSWatcher} from 'chokidar';
import http from 'http';
import http2 from 'http2';

import {EsmHmrEngine} from '../hmr-server-engine';
import {MiddlewareContext} from '.';
import {getUrlFromFile} from '../files';
import {BUILD_CACHE} from '../util';

interface HmrOptions {
  context: MiddlewareContext;
  server: http.Server | http2.Http2Server;
}

export interface MiddlewareHmr {
  watcher: FSWatcher;
  hmrEngine: EsmHmrEngine;
}

export default function hmr({context, server}: HmrOptions): MiddlewareHmr {
  const {
    commandOptions: {config},
    isLiveReloadPaused,
    mountedDirectories,
  } = context;
  const {inMemoryBuildCache, filesBeingDeleted} = context.cache;

  const hmrEngine = (context.hmrEngine = new EsmHmrEngine({server}));

  function updateOrBubble(url: string, visited: Set<string>) {
    if (visited.has(url)) {
      return;
    }
    visited.add(url);
    const node = hmrEngine.getEntry(url);
    if (node && node.isHmrEnabled) {
      hmrEngine.broadcastMessage({type: 'update', url});
    }
    if (node && node.isHmrAccepted) {
      // Found a boundary, no bubbling needed
    } else if (node && node.dependents.size > 0) {
      hmrEngine.markEntryForReplacement(node, true);
      node.dependents.forEach((dep) => updateOrBubble(dep, visited));
    } else {
      // We've reached the top, trigger a full page refresh
      hmrEngine.broadcastMessage({type: 'reload'});
    }
  }
  async function onWatchEvent(filePath) {
    let updateUrl = getUrlFromFile(mountedDirectories, filePath);
    if (updateUrl) {
      if (!updateUrl.endsWith('.js')) {
        updateUrl += '.proxy.js';
      }
      if (isLiveReloadPaused) {
        return;
      }
      // If no entry exists, file has never been loaded, safe to ignore
      if (hmrEngine.getEntry(updateUrl)) {
        updateOrBubble(updateUrl, new Set());
      }
    }
    inMemoryBuildCache.delete(filePath);
    filesBeingDeleted.add(filePath);
    await cacache.rm.entry(BUILD_CACHE, filePath);
    filesBeingDeleted.delete(filePath);
  }
  const watcher = chokidar.watch(
    mountedDirectories.map(([dirDisk]) => dirDisk),
    {
      ignored: config.exclude,
      persistent: true,
      ignoreInitial: true,
      disableGlobbing: false,
    },
  );
  watcher.on('add', (filePath) => onWatchEvent(filePath));
  watcher.on('change', (filePath) => onWatchEvent(filePath));
  watcher.on('unlink', (filePath) => onWatchEvent(filePath));

  return {watcher, hmrEngine};
}
