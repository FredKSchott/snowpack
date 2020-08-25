import fs from 'fs';
import path from 'path';
import glob from 'glob';
import * as colors from 'kleur/colors';
import * as esbuild from 'esbuild';
import {init, parse} from 'es-module-lexer';
import PQueue from 'p-queue';
import {SnowpackConfig, SnowpackPlugin} from '../types/snowpack';
import {
  appendHTMLToBody,
  appendHTMLToHead,
  getExt,
  HTML_JS_REGEX,
  relativeURL,
  removeLeadingSlash,
} from '../util';

interface OptimizePluginOptions {
  exclude?: string | string[];
  minifyCSS?: boolean;
  minifyHTML?: boolean;
  minifyJS?: boolean;
}

/**
 * Default optimizer for Snawpack, unless another one is given
 */
export function optimize(config: SnowpackConfig, options: OptimizePluginOptions): SnowpackPlugin {
  const CONCURRENT_WORKERS = require('os').cpus().length;

  function isRemoteModule(specifier: string): boolean {
    return (
      specifier.startsWith('//') ||
      specifier.startsWith('http://') ||
      specifier.startsWith('https://')
    );
  }

  /** Scan a JS file for static imports */
  function scanForStaticImports({
    file,
    rootDir,
    scannedFiles,
    importList,
  }: {
    file: string;
    rootDir: string;
    scannedFiles: Set<string>;
    importList: Set<string>;
  }): Set<string> {
    try {
      // 1. scan file for static imports
      scannedFiles.add(file); // mark file as scanned
      importList.add(file); // also mark file as an import if it hasn’t been already
      let code = fs.readFileSync(file, 'utf-8');
      const [imports] = parse(code);
      imports
        .filter(({d}) => d === -1) // this is where we discard dynamic imports (> -1) and import.meta (-2)
        .forEach(({s, e}) => {
          const specifier = code.substring(s, e);
          importList.add(
            specifier.startsWith('/')
              ? path.join(rootDir, removeLeadingSlash(file))
              : path.resolve(path.dirname(file), specifier),
          );
        });

      // 2. recursively scan imports not yet scanned
      [...importList]
        .filter((fileLoc) => !scannedFiles.has(fileLoc)) // prevent infinite loop
        .forEach((fileLoc) => {
          scanForStaticImports({file: fileLoc, rootDir, scannedFiles, importList}).forEach(
            (newImport) => {
              importList.add(newImport);
            },
          );
        });

      return importList;
    } catch (err) {
      console.warn(
        colors.dim('[@snowpack/plugin-optimize]') +
          colors.yellow(
            ` module preload failed: could not locate "${path.relative(rootDir, file)}"`,
          ),
      );
      return importList;
    }
  }

  /** Given a set of HTML files, trace the imported JS */
  function preloadModulesInHTML(htmlFile, rootDir: string) {
    const originalEntries = new Set<string>(); // original entry files in HTML
    const allModules = new Set<string>(); // all modules required by this HTML file

    let code = fs.readFileSync(htmlFile, 'utf-8');
    const scriptMatches = code.match(new RegExp(HTML_JS_REGEX));
    if (!scriptMatches || !scriptMatches.length) return code; // if nothing matched, exit

    // 1. identify all entries in HTML
    scriptMatches
      .filter((script) => script.toLowerCase().includes('src')) // we only need to preload external "src" scripts; on-page scripts are already exposed
      .forEach((script) => {
        const scriptSrc = script.replace(/.*src="([^"]+).*/i, '$1');
        if (!scriptSrc || isRemoteModule(scriptSrc)) return; // if no src, or it’s remote, skip this tag
        const entry = scriptSrc.startsWith('/')
          ? path.join(rootDir, removeLeadingSlash(scriptSrc))
          : path.normalize(path.join(path.dirname(htmlFile), scriptSrc));
        originalEntries.add(entry);
      });

    // 2. scan entries for additional imports
    const scannedFiles = new Set<string>(); // keep track of files scanned so we don’t get stuck in a circular dependency
    originalEntries.forEach((entry) => {
      scanForStaticImports({
        file: entry,
        rootDir,
        scannedFiles,
        importList: allModules,
      }).forEach((file) => allModules.add(file));
    });

    // 3. add module preload to HTML (https://developers.google.com/web/updates/2017/12/modulepreload)
    const resolvedModules = [...allModules]
      .filter((m) => !originalEntries.has(m)) // don’t double-up preloading scripts that were already in the HTML
      .map((src) => relativeURL(rootDir, src).replace(/^\./, ''));
    if (!resolvedModules.length) return code; // don’t add useless whitespace

    resolvedModules.sort((a, b) => a.localeCompare(b));
    code = appendHTMLToHead(
      code,
      `  ` +
        resolvedModules.map((src) => `<link rel="modulepreload" href="${src}" />`).join('') +
        '\n  ',
    );
    code = appendHTMLToBody(
      code,
      `  ` +
        resolvedModules.map((src) => `<script type="module" src="${src}"></script>`).join('') +
        '\n  ',
    );

    // write file to disk
    return code;
  }

  async function optimizeFile({
    esbuildService,
    file,
    rootDir,
  }: {
    esbuildService: esbuild.Service;
    file: string;
    rootDir: string;
  }) {
    const {baseExt} = getExt(file);

    // optimize based on extension. if it’s not here, leave as-is
    switch (baseExt) {
      case '.css': {
        // TODO: minify CSS
        break;
      }
      case '.js':
      case '.mjs': {
        // minify if enabled
        if (options.minifyJS) {
          let code = fs.readFileSync(file, 'utf-8');
          const minified = await esbuildService.transform(code, {minify: true});
          code = minified.js;
          fs.writeFileSync(file, code);
        }
        break;
      }
      case '.html': {
        let code = preloadModulesInHTML(file, rootDir);
        // TODO: minify HTML
        fs.writeFileSync(file, code, 'utf-8');
        break;
      }
    }
  }

  return {
    name: '@snowpack/plugin-optimize',
    async optimize({buildDirectory}) {
      // 0. setup
      const esbuildService = await esbuild.startService();
      await init;

      // 1. scan directory
      const allFiles = glob
        .sync('**/*', {
          cwd: buildDirectory,
          ignore: [`${config.buildOptions.metaDir}/*`, ...((options && options.exclude) || [])],
          nodir: true,
        })
        .map((file) => path.join(buildDirectory, file)); // resolve to root dir

      // 2. optimize all files in parallel
      const parallelWorkQueue = new PQueue({concurrency: CONCURRENT_WORKERS});
      for (const file of allFiles) {
        parallelWorkQueue.add(() => optimizeFile({file, esbuildService, rootDir: buildDirectory}));
      }
      await parallelWorkQueue.onIdle();

      // 3. clean up
      esbuildService.stop();
    },
  };
}
