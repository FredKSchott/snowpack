import cheerio from 'cheerio';
import * as esbuild from 'esbuild';
import {promises as fs, readFileSync, unlinkSync, writeFileSync} from 'fs';
import {glob} from 'glob';
import mkdirp from 'mkdirp';
import path from 'path';
import {logger} from '../logger';
import {OptimizeOptions, SnowpackConfig} from '../types';
import {
  addLeadingSlash,
  addTrailingSlash,
  hasExtension,
  isRemoteUrl,
  isTruthy,
  removeLeadingSlash,
  removeTrailingSlash,
  deleteFromBuildSafe,
} from '../util';
import {getUrlForFile} from './file-urls';

interface ESBuildMetaInput {
  bytes: number;
  imports: {path: string}[];
}
interface ESBuildMetaOutput {
  imports: [];
  exports?: [];
  // unclear what this exact interface is, and we don't use it
  inputs: any;
  bytes: number;
}
interface ESBuildMetaManifest {
  inputs: Record<string, ESBuildMetaInput>;
  outputs?: Record<string, ESBuildMetaOutput>;
}

interface ScannedHtmlEntrypoint {
  file: string;
  root: cheerio.Root;
  getScripts: () => cheerio.Cheerio;
  getStyles: () => cheerio.Cheerio;
  getLinks: (rel: 'stylesheet') => cheerio.Cheerio;
}

// We want to output our bundled build directly into our build directory, but esbuild
// has a bug where it complains about overwriting source files even when write: false.
// We create a fake bundle directory for now. Nothing ever actually gets written here.
const FAKE_BUILD_DIRECTORY = path.join(process.cwd(), '~~bundle~~');
const FAKE_BUILD_DIRECTORY_REGEX = /.*\~\~bundle\~\~[\\\/]/;

/** Collect deep imports in the given set, recursively. */
function collectDeepImports(url: string, manifest: ESBuildMetaManifest, set: Set<string>): void {
  if (set.has(url)) {
    return;
  }
  set.add(url);
  const manifestEntry = manifest.inputs[url];
  if (!manifestEntry) {
    throw new Error('Not Found in manifest: ' + url);
  }
  manifestEntry.imports.forEach(({path}) => collectDeepImports(path, manifest, set));
  return;
}

/**
 * Scan a collection of HTML files for entrypoints. A file is deemed an "html entrypoint"
 * if it contains an <html> element. This prevents partials from being scanned.
 */
async function scanHtmlEntrypoints(htmlFiles: string[]): Promise<(ScannedHtmlEntrypoint | null)[]> {
  return Promise.all(
    htmlFiles.map(async (htmlFile) => {
      const code = await fs.readFile(htmlFile, 'utf8');
      const root = cheerio.load(code);
      const isHtmlFragment = root.html().startsWith('<html><head></head><body>');
      if (isHtmlFragment) {
        return null;
      }
      return {
        file: htmlFile,
        root,
        getScripts: () => root('script[type="module"]'),
        getStyles: () => root('style'),
        getLinks: (rel: 'stylesheet') => root(`link[rel="${rel}"]`),
      };
    }),
  );
}

async function extractBaseUrl(htmlData: ScannedHtmlEntrypoint, baseUrl: string): Promise<void> {
  const {root, getScripts, getLinks} = htmlData;
  if (!baseUrl || baseUrl === '/') {
    return;
  }
  getScripts().each((_, elem) => {
    const scriptRoot = root(elem);
    const scriptSrc = scriptRoot.attr('src');
    if (!scriptSrc || !scriptSrc.startsWith(baseUrl)) {
      return;
    }
    scriptRoot.attr('src', addLeadingSlash(scriptSrc.replace(baseUrl, '')));
    scriptRoot.attr('snowpack-baseurl', 'true');
  });
  getLinks('stylesheet').each((_, elem) => {
    const linkRoot = root(elem);
    const styleHref = linkRoot.attr('href');
    if (!styleHref || !styleHref.startsWith(baseUrl)) {
      return;
    }
    linkRoot.attr('href', addLeadingSlash(styleHref.replace(baseUrl, '')));
    linkRoot.attr('snowpack-baseurl', 'true');
  });
}

async function restitchBaseUrl(htmlData: ScannedHtmlEntrypoint, baseUrl: string): Promise<void> {
  const {root, getScripts, getLinks} = htmlData;
  getScripts()
    .filter('[snowpack-baseurl]')
    .each((_, elem) => {
      const scriptRoot = root(elem);
      const scriptSrc = scriptRoot.attr('src')!;
      scriptRoot.attr('src', removeTrailingSlash(baseUrl) + addLeadingSlash(scriptSrc));
      scriptRoot.removeAttr('snowpack-baseurl');
    });
  getLinks('stylesheet')
    .filter('[snowpack-baseurl]')
    .each((_, elem) => {
      const linkRoot = root(elem);
      const styleHref = linkRoot.attr('href')!;
      linkRoot.attr('href', removeTrailingSlash(baseUrl) + addLeadingSlash(styleHref));
      linkRoot.removeAttr('snowpack-baseurl');
    });
}

async function extractInlineScripts(htmlData: ScannedHtmlEntrypoint): Promise<void> {
  const {file, root, getScripts, getStyles} = htmlData;
  getScripts().each((i, elem) => {
    const scriptRoot = root(elem);
    const scriptContent = scriptRoot.contents().text();
    if (!scriptContent) {
      return;
    }
    scriptRoot.empty();
    writeFileSync(file + `.inline.${i}.js`, scriptContent);
    scriptRoot.attr('src', `./${path.basename(file)}.inline.${i}.js`);
    scriptRoot.attr('snowpack-inline', `true`);
  });
  getStyles().each((i, elem) => {
    const styleRoot = root(elem);
    const styleContent = styleRoot.contents().text();
    if (!styleContent) {
      return;
    }
    styleRoot.after(
      `<link rel="stylesheet" href="./${path.basename(
        file,
      )}.inline.${i}.css" snowpack-inline="true" />`,
    );
    styleRoot.remove();
    writeFileSync(file + `.inline.${i}.css`, styleContent);
  });
}

async function restitchInlineScripts(htmlData: ScannedHtmlEntrypoint): Promise<void> {
  const {file, root, getScripts, getLinks} = htmlData;
  getScripts()
    .filter('[snowpack-inline]')
    .each((_, elem) => {
      const scriptRoot = root(elem);
      const scriptFile = path.resolve(file, '..', scriptRoot.attr('src')!);
      const scriptContent = readFileSync(scriptFile, 'utf8');
      scriptRoot.text(scriptContent);
      scriptRoot.removeAttr('src');
      scriptRoot.removeAttr('snowpack-inline');
      unlinkSync(scriptFile);
    });
  getLinks('stylesheet')
    .filter('[snowpack-inline]')
    .each((_, elem) => {
      const linkRoot = root(elem);
      const styleFile = path.resolve(file, '..', linkRoot.attr('href')!);
      const styleContent = readFileSync(styleFile, 'utf8');
      const newStyleEl = root('<style></style>');
      newStyleEl.text(styleContent);
      linkRoot.after(newStyleEl);
      linkRoot.remove();
      unlinkSync(styleFile);
    });
}

/** Add new bundled CSS files to the HTML entrypoint file, if not already there. */
function addNewBundledCss(
  htmlData: ScannedHtmlEntrypoint,
  manifest: ESBuildMetaManifest,
  baseUrl: string,
): void {
  if (!manifest.outputs) {
    return;
  }
  for (const key of Object.keys(manifest.outputs)) {
    if (!hasExtension(key, '.css')) {
      continue;
    }
    const scriptKey = key.replace('.css', '.js');
    if (!manifest.outputs[scriptKey]) {
      continue;
    }
    const hasCssImportAlready = htmlData
      .getLinks('stylesheet')
      .toArray()
      .some((v) => v.attribs.href.includes(removeLeadingSlash(key)));
    const hasScriptImportAlready = htmlData
      .getScripts()
      .toArray()
      .some((v) => v.attribs.src.includes(removeLeadingSlash(scriptKey)));

    if (hasCssImportAlready || !hasScriptImportAlready) {
      continue;
    }
    const linkHref = removeTrailingSlash(baseUrl) + addLeadingSlash(key);
    htmlData.root('head').append(`<link rel="stylesheet" href="${linkHref}" />`);
  }
}

/**
 * Traverse the entrypoint for JS scripts, and add preload links to the HTML entrypoint.
 */
function preloadEntrypoint(
  htmlData: ScannedHtmlEntrypoint,
  manifest: ESBuildMetaManifest,
  config: SnowpackConfig,
): void {
  const {root, getScripts} = htmlData;
  const preloadScripts = getScripts()
    .map((_, elem) => elem.attribs.src)
    .get()
    .filter(isTruthy);
  const collectedDeepImports = new Set<string>();
  for (const preloadScript of preloadScripts) {
    const normalizedPreloadScript = removeLeadingSlash(
      path.posix.resolve('/', removeLeadingSlash(preloadScript)),
    );
    collectDeepImports(normalizedPreloadScript, manifest, collectedDeepImports);
  }
  const baseUrl = config.buildOptions.baseUrl;
  for (const imp of collectedDeepImports) {
    const preloadUrl = (baseUrl ? removeTrailingSlash(baseUrl) : '') + addLeadingSlash(imp);
    root('head').append(`<link rel="modulepreload" href="${preloadUrl}" />`);
  }
}

/**
 * Handle the many different user input formats to return an array of strings.
 * resolve "auto" mode here.
 */
async function getEntrypoints(
  entrypoints: OptimizeOptions['entrypoints'],
  allBuildFiles: string[],
) {
  if (entrypoints === 'auto') {
    // TODO: Filter allBuildFiles by HTML with head & body
    return allBuildFiles.filter((f) => hasExtension(f, '.html'));
  }
  if (Array.isArray(entrypoints)) {
    return entrypoints;
  }
  if (typeof entrypoints === 'function') {
    return entrypoints({files: allBuildFiles});
  }
  throw new Error('UNEXPECTED ENTRYPOINTS: ' + entrypoints);
}

/**
 * Resolve an array of string entrypoints to absolute file paths. Handle
 * source vs. build directory relative entrypoints here as well.
 */
async function resolveEntrypoints(
  entrypoints: string[],
  cwd: string,
  buildDirectoryLoc: string,
  config: SnowpackConfig,
) {
  return Promise.all(
    entrypoints.map(async (entrypoint) => {
      if (path.isAbsolute(entrypoint)) {
        return entrypoint;
      }
      const buildEntrypoint = path.resolve(buildDirectoryLoc, entrypoint);
      if (await fs.stat(buildEntrypoint).catch(() => null)) {
        return buildEntrypoint;
      }
      const resolvedSourceFile = path.resolve(cwd, entrypoint);
      let resolvedSourceEntrypoint: string | undefined;
      if (await fs.stat(resolvedSourceFile).catch(() => null)) {
        const resolvedSourceUrl = getUrlForFile(resolvedSourceFile, config);
        if (resolvedSourceUrl) {
          resolvedSourceEntrypoint = path.resolve(
            buildDirectoryLoc,
            removeLeadingSlash(resolvedSourceUrl),
          );
          if (await fs.stat(resolvedSourceEntrypoint).catch(() => null)) {
            return resolvedSourceEntrypoint;
          }
        }
      }
      logger.error(`Error: entrypoint "${entrypoint}" not found in either build or source:`, {
        name: 'optimize',
      });
      logger.error(`  ✘ Build Entrypoint: ${buildEntrypoint}`, {name: 'optimize'});
      logger.error(
        `  ✘ Source Entrypoint: ${resolvedSourceFile} ${
          resolvedSourceEntrypoint ? `-> ${resolvedSourceEntrypoint}` : ''
        }`,
        {name: 'optimize'},
      );
      throw new Error(`Optimize entrypoint "${entrypoint}" does not exist.`);
    }),
  );
}

/**
 * Process your entrypoints as either all JS or all HTML. If HTML,
 * scan those HTML files and add a Cheerio-powered root document
 * so that we can modify the HTML files as we go.
 */
async function processEntrypoints(
  originalEntrypointValue: OptimizeOptions['entrypoints'],
  entrypointFiles: string[],
  buildDirectoryLoc: string,
  baseUrl: string,
): Promise<{htmlEntrypoints: null | ScannedHtmlEntrypoint[]; bundleEntrypoints: string[]}> {
  // If entrypoints are JS:
  if (entrypointFiles.every((f) => hasExtension(f, '.js'))) {
    return {htmlEntrypoints: null, bundleEntrypoints: entrypointFiles};
  }
  // If entrypoints are HTML:
  if (entrypointFiles.every((f) => hasExtension(f, '.html'))) {
    const rawHtmlEntrypoints = await scanHtmlEntrypoints(entrypointFiles);
    const htmlEntrypoints = rawHtmlEntrypoints.filter(isTruthy);
    if (
      originalEntrypointValue !== 'auto' &&
      rawHtmlEntrypoints.length !== htmlEntrypoints.length
    ) {
      throw new Error('INVALID HTML ENTRYPOINTS: ' + originalEntrypointValue);
    }
    htmlEntrypoints.forEach((val) => extractBaseUrl(val, baseUrl));
    htmlEntrypoints.forEach(extractInlineScripts);
    const bundleEntrypoints = Array.from(
      htmlEntrypoints.reduce((all, val) => {
        val.getLinks('stylesheet').each((_, elem) => {
          if (!elem.attribs.href || isRemoteUrl(elem.attribs.href)) {
            return;
          }
          const resolvedCSS =
            elem.attribs.href[0] === '/'
              ? path.resolve(buildDirectoryLoc, removeLeadingSlash(elem.attribs.href))
              : path.resolve(val.file, '..', elem.attribs.href);
          all.add(resolvedCSS);
        });
        val.getScripts().each((_, elem) => {
          if (!elem.attribs.src || isRemoteUrl(elem.attribs.src)) {
            return;
          }
          const resolvedJS =
            elem.attribs.src[0] === '/'
              ? path.join(buildDirectoryLoc, removeLeadingSlash(elem.attribs.src))
              : path.join(val.file, '..', elem.attribs.src);
          all.add(resolvedJS);
        });
        return all;
      }, new Set<string>()),
    );
    return {htmlEntrypoints, bundleEntrypoints};
  }
  // If entrypoints are mixed or neither, throw an error.
  throw new Error('MIXED ENTRYPOINTS: ' + entrypointFiles);
}

/**
 * Run esbuild on the build directory. This is run regardless of bundle=true or false,
 * since we use the generated manifest in either case.
 */
async function runEsbuildOnBuildDirectory(
  bundleEntrypoints: string[],
  allFiles: string[],
  config: SnowpackConfig,
  esbuildService: esbuild.Service,
): Promise<{manifest: ESBuildMetaManifest; outputFiles: esbuild.OutputFile[]}> {
  const {outputFiles, warnings} = await esbuildService.build({
    entryPoints: bundleEntrypoints,
    outdir: FAKE_BUILD_DIRECTORY,
    outbase: config.buildOptions.out,
    write: false,
    bundle: true,
    splitting: config.optimize!.splitting,
    format: 'esm',
    platform: 'browser',
    metafile: path.join(config.buildOptions.out, 'build-manifest.json'),
    publicPath: config.buildOptions.baseUrl,
    minify: config.optimize!.minify,
    target: config.optimize!.target,
    external: Array.from(new Set(allFiles.map((f) => '*' + path.extname(f)))).filter(
      (ext) => ext !== '*.js' && ext !== '*.mjs' && ext !== '*.css',
    ),
  });
  const manifestFile = outputFiles!.find((f) => f.path.endsWith('build-manifest.json'))!;
  const manifestContents = manifestFile.text;
  const manifest = JSON.parse(manifestContents);
  if (!outputFiles) {
    throw new Error('EMPTY BUILD');
  }
  if (warnings.length > 0) {
    console.warn(warnings);
  }
  outputFiles.forEach(
    (f) =>
      (f.path = f.path.replace(
        FAKE_BUILD_DIRECTORY_REGEX,
        addTrailingSlash(config.buildOptions.out),
      )),
  );
  if (!config.optimize?.bundle) {
    delete manifest.outputs;
  } else {
    Object.entries(manifest.outputs).forEach(([f, val]) => {
      const newKey = f.replace(FAKE_BUILD_DIRECTORY_REGEX, '/');
      manifest.outputs[newKey] = val;
      delete manifest.outputs[f];
    });
  }
  logger.debug(`outputFiles: ${JSON.stringify(outputFiles)}`);
  logger.debug(`manifest: ${JSON.stringify(manifest)}`);

  return {outputFiles, manifest};
}

/** The main optimize function: runs optimization on a build directory. */
export async function runBuiltInOptimize(config: SnowpackConfig) {
  const originalCwd = process.cwd();
  const buildDirectoryLoc = config.buildOptions.out;
  const options = config.optimize;
  if (!options) {
    return;
  }

  // * Scan to collect all build files: We'll need this throughout.
  const allBuildFiles = glob.sync('**/*', {
    cwd: buildDirectoryLoc,
    nodir: true,
    absolute: true,
  });

  // * Resolve and validate your entrypoints: they may be JS or HTML
  const userEntrypoints = await getEntrypoints(options.entrypoints, allBuildFiles);
  logger.debug(JSON.stringify(userEntrypoints), {name: 'optimize.entrypoints'});
  const resolvedEntrypoints = await resolveEntrypoints(
    userEntrypoints,
    originalCwd,
    buildDirectoryLoc,
    config,
  );
  logger.debug('(resolved) ' + JSON.stringify(resolvedEntrypoints), {name: 'optimize.entrypoints'});
  const {htmlEntrypoints, bundleEntrypoints} = await processEntrypoints(
    options.entrypoints,
    resolvedEntrypoints,
    buildDirectoryLoc,
    config.buildOptions.baseUrl,
  );
  logger.debug(`htmlEntrypoints: ${JSON.stringify(htmlEntrypoints?.map((f) => f.file))}`);
  logger.debug(`bundleEntrypoints: ${JSON.stringify(bundleEntrypoints)}`);

  if (
    (!htmlEntrypoints || htmlEntrypoints.length === 0) &&
    bundleEntrypoints.length === 0 &&
    (options.bundle || options.preload)
  ) {
    throw new Error(
      '[optimize] No HTML entrypoints detected. Set "entrypoints" manually if your site HTML is generated outside of Snowpack (SSR, Rails, PHP, etc.).',
    );
  }

  // NOTE: esbuild has no `cwd` support, and assumes that you're always bundling the
  // current working directory. To get around this, we change the current working directory
  // for this run only, and then reset it on exit.
  process.chdir(buildDirectoryLoc);

  // * Run esbuild on the entire build directory. Even if you are not writing the result
  // to disk (bundle: false), we still use the bundle manifest as an in-memory representation
  // of our import graph, saved to disk.
  const esbuildService = await esbuild.startService();
  const {manifest, outputFiles} = await runEsbuildOnBuildDirectory(
    bundleEntrypoints,
    allBuildFiles,
    config,
    esbuildService,
  );

  // * BUNDLE: TRUE - Save the bundle result to the build directory, and clean up to remove all original
  // build files that now live in the bundles.
  if (options.bundle) {
    for (const bundledInput of Object.keys(manifest.inputs)) {
      if (!manifest.outputs![bundledInput]) {
        logger.debug(
          `Removing bundled source file: ${path.resolve(buildDirectoryLoc, bundledInput)}`,
        );
        await fs.unlink(path.resolve(buildDirectoryLoc, bundledInput));
      }
    }
    deleteFromBuildSafe(
      path.resolve(
        buildDirectoryLoc,
        removeLeadingSlash(path.posix.join(config.buildOptions.metaUrlPath, 'pkg')),
      ),
      config,
    );
    for (const outputFile of outputFiles!) {
      mkdirp.sync(path.dirname(outputFile.path));
      await fs.writeFile(outputFile.path, outputFile.contents);
    }
    if (htmlEntrypoints) {
      for (const htmlEntrypoint of htmlEntrypoints) {
        addNewBundledCss(htmlEntrypoint, manifest, config.buildOptions.baseUrl);
      }
    }
  }
  // * BUNDLE: FALSE - Just minifying & transform the CSS & JS files in place.
  else if (options.minify || options.target) {
    for (const f of allBuildFiles) {
      if (['.js', '.css'].includes(path.extname(f))) {
        let code = await fs.readFile(f, 'utf8');
        const minified = await esbuildService.transform(code, {
          sourcefile: path.basename(f),
          loader: path.extname(f).slice(1) as 'js' | 'css',
          minify: options.minify,
          target: options.target,
        });
        code = minified.code;
        await fs.writeFile(f, code);
      }
    }
  }

  // * Restitch any inline scripts into HTML entrypoints that had been split out
  // for the sake of bundling/manifest.
  if (htmlEntrypoints) {
    for (const htmlEntrypoint of htmlEntrypoints) {
      restitchInlineScripts(htmlEntrypoint);
    }
  }

  // * PRELOAD: TRUE - Add preload link elements for each HTML entrypoint, to flatten
  // and optimize any deep import waterfalls.
  if (options.preload) {
    if (options.bundle) {
      throw new Error('preload is not needed when bundle=true, and cannot be used in combination.');
    }
    if (!htmlEntrypoints || htmlEntrypoints.length === 0) {
      throw new Error('preload only works with HTML entrypoints.');
    }
    for (const htmlEntrypoint of htmlEntrypoints) {
      preloadEntrypoint(htmlEntrypoint, manifest, config);
    }
  }

  // * Restitch any inline scripts into HTML entrypoints that had been split out
  // for the sake of bundling/manifest.
  if (htmlEntrypoints) {
    for (const htmlEntrypoint of htmlEntrypoints) {
      restitchBaseUrl(htmlEntrypoint, config.buildOptions.baseUrl);
    }
  }

  // Write the final HTML entrypoints to disk (if they exist).
  if (htmlEntrypoints) {
    for (const htmlEntrypoint of htmlEntrypoints) {
      await fs.writeFile(htmlEntrypoint.file, htmlEntrypoint.root.html());
    }
  }

  // Write the final build manifest to disk.
  if (options.manifest) {
    await fs.writeFile(
      path.join(config.buildOptions.out, 'build-manifest.json'),
      JSON.stringify(manifest),
    );
  }

  // Cleanup and exit.
  esbuildService.stop();
  process.chdir(originalCwd);
  return;
}
