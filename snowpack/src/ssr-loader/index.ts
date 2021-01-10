import {existsSync, readFileSync} from 'fs';
import {resolve} from 'url';
import {sourcemap_stacktrace} from './sourcemaps';
import {transform} from './transform';

export interface SSRLoaderConfig {
  load: (url: string) => Promise<{contents: string}>;
}
export interface SSRLoader {
  importModule: <T = any>(url: string) => Promise<ESMRuntimeModule<T>>;
  invalidateModule: (url: string) => void;
}

export interface ESMRuntimeModule<T> {
  exports: T;
  css: string[];
}

// This function makes it possible to load modules from the snowpack server, for the sake of SSR.
export function createLoader({load}: SSRLoaderConfig): SSRLoader {
  const cache = new Map();
  const graph = new Map();

  function getModule(importer: string, imported: string, urlStack: string[]) {
    if (imported[0] === '/' || imported[0] === '.') {
      const pathname = resolve(importer, imported);
      if (!graph.has(pathname)) graph.set(pathname, new Set());
      graph.get(pathname).add(importer);
      return _load(pathname, urlStack);
    }
    return Promise.resolve(nodeRequire(imported));
  }

  function invalidateModule(path) {
    cache.delete(path);
    const dependents = graph.get(path);
    graph.delete(path);
    if (dependents) dependents.forEach(invalidateModule);
  }

  async function _load(url, urlStack) {
    if (urlStack.includes(url)) {
      console.warn(`Circular dependency: ${urlStack.join(' -> ')} -> ${url}`);
      return {};
    }
    if (cache.has(url)) {
      return cache.get(url);
    }
    const promise = load(url)
      .then((loaded) => initializeModule(url, loaded, urlStack.concat(url)))
      .catch((e) => {
        cache.delete(url);
        throw e;
      });
    cache.set(url, promise);
    return promise;
  }

  async function initializeModule(url: string, loaded: {contents: string}, urlStack: string[]) {
    const {code, deps, css, names} = transform(loaded.contents);

    const exports = {};
    const allCss = new Set(css.map((relative) => resolve(url, relative)));

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
          for (const name in mod) {
            Object.defineProperty(exports, name, {
              get: () => mod[name],
            });
          }
        },
      },
      {
        name: names.__import,
        value: (source) => getModule(url, source, urlStack).then((mod) => mod.exports),
      },
      {
        name: names.__import_meta,
        value: {url},
      },

      ...(await Promise.all(
        deps.map(async (dep) => {
          const module = await getModule(url, dep.source, urlStack);
          module.css.forEach((dep) => allCss.add(dep));

          return {
            name: dep.name,
            value: module.exports,
          };
        }),
      )),
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
      return _load(url, []);
    },
    invalidateModule: (url) => {
      invalidateModule(url);
    },
  };
}

function nodeRequire(source) {
  // mirror Rollup's interop by allowing both of these:
  //  import fs from 'fs';
  //  import { readFileSync } from 'fs';
  return {
    exports: new Proxy(require(source), {
      get(mod, prop) {
        if (prop === 'default') return mod;
        return mod[prop];
      },
    }),
    css: [],
  };
}
