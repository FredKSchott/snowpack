import {existsSync, readFileSync} from 'fs';
import {resolve, pathToFileURL} from 'url';
import {ServerRuntime, ServerRuntimeConfig, LoadResult} from '../types';
import {sourcemap_stacktrace} from './sourcemaps';
import {transform} from './transform';
import {REQUIRE_OR_IMPORT} from '../util';

interface ModuleInstance {
  exports: any;
  css: string[];
}

type ModuleInitializer = () => Promise<ModuleInstance>;

// This function makes it possible to load modules from the snowpack server, for the sake of SSR.
export function createLoader({config, load}: ServerRuntimeConfig): ServerRuntime {
  const cache = new Map();
  const graph = new Map();

  async function getModule(importer: string, imported: string, urlStack: string[]) {
    if (imported[0] === '/' || imported[0] === '.') {
      const pathname = resolve(importer, imported);
      if (!graph.has(pathname)) graph.set(pathname, new Set());
      graph.get(pathname).add(importer);
      return _load(pathname, urlStack);
    }

    return async function() {
      const mod = await REQUIRE_OR_IMPORT(imported, {
        from: config.root || config.workspaceRoot || process.cwd(),
      });

      return {
        exports: mod,
        css: [],
      };
    }
  }

  function invalidateModule(path) {
    // If the cache doesn't have this path, check if it's a proxy file.
    if (!cache.has(path) && cache.has(path + '.proxy.js')) {
      path = path + '.proxy.js';
    }

    cache.delete(path);
    const dependents = graph.get(path);
    graph.delete(path);
    if (dependents) dependents.forEach(invalidateModule);
  }

  async function _load(url, urlStack): Promise<ModuleInitializer> {
    if (urlStack.includes(url)) {
      console.warn(`Circular dependency: ${urlStack.join(' -> ')} -> ${url}`);
      return async () => ({
        exports: null,
        css: []
      });
    }
    if (cache.has(url)) {
      return cache.get(url);
    }
    const promise = (async function() {
        const loaded = await load(url);
        return function() {
          try {
            return initializeModule(url, loaded, urlStack.concat(url));
          } catch(e) {
            cache.delete(url);
            throw e;
          }
        };

    })();
    cache.set(url, promise);
    return promise;
  }

  async function initializeModule(url: string, loaded: LoadResult<string>, urlStack: string[]): Promise<ModuleInstance> {
    const {code, deps, css, names} = transform(loaded.contents);

    const exports = {};
    const allCss = new Set(css.map((relative) => resolve(url, relative)));
    const fileURL = loaded.originalFileLoc ? pathToFileURL(loaded.originalFileLoc) : null;

    // Load dependencies but do not execute.
    const depsLoaded: Array<Promise<{ name: string, init: ModuleInitializer}>> = deps.map(async dep => {
      return {
        name: dep.name,
        init: await getModule(url, dep.source, urlStack)
      };
    });

    // Execute dependencies *in order*.
    const depValues: Array<{ name: string, value: any }> = [];
    for await(const {name, init} of depsLoaded) {
      const module = await init();
      module.css.forEach((dep) => allCss.add(dep));

      depValues.push({
        name: name,
        value: module.exports,
      });
    }

    const args = [
      {
        name: 'global',
        value: global,
      },
      {
        name: 'require',
        value: (id) => {
          // TODO can/should this restriction be relaxed?
          throw new Error(
            `Use import instead of require (attempted to load '${id}' from '${url}')`,
          );
        },
      },
      {
        name: names.exports,
        value: exports,
      },
      {
        name: names.__export,
        value: (name, get) => {
          Object.defineProperty(exports, name, {get});
        },
      },
      {
        name: names.__export_all,
        value: (mod) => {
          // Copy over all of the descriptors.
          const descriptors = Object.getOwnPropertyDescriptors(mod);
          Object.defineProperties(exports, descriptors);
        },
      },
      {
        name: names.__import,
        value: (source) => getModule(url, source, urlStack).then(fn => fn()).then((mod) => mod.exports),
      },
      {
        name: names.__import_meta,
        value: {url: fileURL},
      },
      ...depValues
    ];

    const fn = new Function(...args.map((d) => d.name), `${code}\n//# sourceURL=${url}`);

    try {
      fn(...args.map((d) => d.value));
    } catch (e) {
      e.stack = await sourcemap_stacktrace(e.stack, async (address) => {
        if (existsSync(address)) {
          // it's a filepath
          return readFileSync(address, 'utf-8');
        }

        try {
          const {contents} = await load(address);
          return contents;
        } catch {
          // fail gracefully
        }
      });

      throw e;
    }

    return {
      exports,
      css: Array.from(allCss),
    };
  }

  return {
    importModule: async (url) => {
      const init = await _load(url, []);
      const mod = await init();
      return mod;
    },
    invalidateModule: (url) => {
      invalidateModule(url);
    },
  };
}
