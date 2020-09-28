import {ImportSpecifier, init as initESModuleLexer, parse} from 'es-module-lexer';
import {InstallTarget} from 'esinstall';
import glob from 'glob';
import path from 'path';
import stripComments from 'strip-comments';
import {logger} from './logger';
import {SnowpackConfig, SnowpackSourceFile} from './types/snowpack';
import {
  CSS_REGEX,
  findMatchingAliasEntry,
  getExt,
  HTML_JS_REGEX,
  isTruthy,
  readFile,
  SVELTE_VUE_REGEX,
} from './util';

// [@\w] - Match a word-character or @ (valid package name)
// (?!.*(:\/\/)) - Ignore if previous match was a protocol (ex: http://)
const BARE_SPECIFIER_REGEX = /^[@\w](?!.*(:\/\/))/;

const ESM_IMPORT_REGEX = /import(?:["'\s]*([\w*${}\n\r\t, ]+)\s*from\s*)?\s*["'](.*?)["']/gm;
const ESM_DYNAMIC_IMPORT_REGEX = /(?<!\.)\bimport\((?:['"].+['"]|`[^$]+`)\)/gm;
const HAS_NAMED_IMPORTS_REGEX = /^[\w\s\,]*\{(.*)\}/s;
const STRIP_AS = /\s+as\s+.*/; // for `import { foo as bar }`, strips “as bar”
const DEFAULT_IMPORT_REGEX = /import\s+(\w)+(,\s\{[\w\s]*\})?\s+from/s;

function createInstallTarget(specifier: string, all = true): InstallTarget {
  return {
    specifier,
    all,
    default: false,
    namespace: false,
    named: [],
  };
}

export function matchDynamicImportValue(importStatement: string) {
  const matched = stripComments(importStatement).match(/^\s*('([^']+)'|"([^"]+)")\s*$/m);
  return matched?.[2] || matched?.[3] || null;
}

function getWebModuleSpecifierFromCode(code: string, imp: ImportSpecifier) {
  // import.meta: we can ignore
  if (imp.d === -2) {
    return null;
  }
  // Static imports: easy to parse
  if (imp.d === -1) {
    return code.substring(imp.s, imp.e);
  }
  // Dynamic imports: a bit trickier to parse. Today, we only support string literals.
  const importStatement = code.substring(imp.s, imp.e);
  return matchDynamicImportValue(importStatement);
}

/**
 * parses an import specifier, looking for a web modules to install. If a web module is not detected,
 * null is returned.
 */
function parseWebModuleSpecifier(specifier: string | null): null | string {
  if (!specifier) {
    return null;
  }
  // If specifier is a "bare module specifier" (ie: package name) just return it directly
  if (BARE_SPECIFIER_REGEX.test(specifier)) {
    return specifier;
  }
  return null;
}

function parseImportStatement(code: string, imp: ImportSpecifier): null | InstallTarget {
  const webModuleSpecifier = parseWebModuleSpecifier(getWebModuleSpecifierFromCode(code, imp));
  if (!webModuleSpecifier) {
    return null;
  }

  const importStatement = stripComments(code.substring(imp.ss, imp.se));
  if (/^import\s+type/.test(importStatement)) {
    return null;
  }

  const isDynamicImport = imp.d > -1;
  const hasDefaultImport = !isDynamicImport && DEFAULT_IMPORT_REGEX.test(importStatement);
  const hasNamespaceImport = !isDynamicImport && importStatement.includes('*');

  const namedImports = (importStatement.match(HAS_NAMED_IMPORTS_REGEX)! || [, ''])[1]
    .split(',') // split `import { a, b, c }` by comma
    .map((name) => name.replace(STRIP_AS, '').trim()) // remove “ as …” and trim
    .filter(isTruthy);

  return {
    specifier: webModuleSpecifier,
    all: isDynamicImport || (!hasDefaultImport && !hasNamespaceImport && namedImports.length === 0),
    default: hasDefaultImport,
    namespace: hasNamespaceImport,
    named: namedImports,
  };
}

function cleanCodeForParsing(code: string): string {
  code = stripComments(code);
  const allMatches: string[] = [];
  let match;
  const importRegex = new RegExp(ESM_IMPORT_REGEX);
  while ((match = importRegex.exec(code))) {
    allMatches.push(match);
  }
  const dynamicImportRegex = new RegExp(ESM_DYNAMIC_IMPORT_REGEX);
  while ((match = dynamicImportRegex.exec(code))) {
    allMatches.push(match);
  }
  return allMatches.map(([full]) => full).join('\n');
}

function parseJsForInstallTargets(contents: string): InstallTarget[] {
  let imports: ImportSpecifier[];
  // Attempt #1: Parse the file as JavaScript. JSX and some decorator
  // syntax will break this.
  try {
    [imports] = parse(contents) || [];
  } catch (err) {
    // Attempt #2: Parse only the import statements themselves.
    // This lets us guarentee we aren't sending any broken syntax to our parser,
    // but at the expense of possible false +/- caused by our regex extractor.
    contents = cleanCodeForParsing(contents);
    [imports] = parse(contents) || [];
  }
  return (
    imports
      .map((imp) => parseImportStatement(contents, imp))
      .filter(isTruthy)
      // Babel macros are not install targets!
      .filter((target) => !/[./]macro(\.js)?$/.test(target.specifier))
  );
}

function parseCssForInstallTargets(code: string): InstallTarget[] {
  const installTargets: InstallTarget[] = [];
  let match;
  const importRegex = new RegExp(CSS_REGEX);
  while ((match = importRegex.exec(code))) {
    const [, spec] = match;
    const webModuleSpecifier = parseWebModuleSpecifier(spec);
    if (webModuleSpecifier) {
      installTargets.push(createInstallTarget(webModuleSpecifier));
    }
  }
  return installTargets;
}

function parseFileForInstallTargets({
  locOnDisk,
  baseExt,
  contents,
}: SnowpackSourceFile<string>): InstallTarget[] {
  const relativeLoc = path.relative(process.cwd(), locOnDisk);

  try {
    switch (baseExt) {
      case '.css':
      case '.less':
      case '.sass':
      case '.scss': {
        logger.debug(`Scanning ${relativeLoc} for imports as CSS`);
        return parseCssForInstallTargets(contents);
      }
      case '.html':
      case '.svelte':
      case '.vue': {
        logger.debug(`Scanning ${relativeLoc} for imports as HTML`);
        return parseJsForInstallTargets(extractJSFromHTML({contents, baseExt}));
      }
      case '.js':
      case '.jsx':
      case '.mjs':
      case '.ts':
      case '.tsx': {
        logger.debug(`Scanning ${relativeLoc} for imports as JS`);
        return parseJsForInstallTargets(contents);
      }
      default: {
        logger.debug(
          `Skip scanning ${relativeLoc} for imports (unknown file extension ${baseExt})`,
        );
        return [];
      }
    }
  } catch (err) {
    // Another error! No hope left, just abort.
    logger.error(`! ${locOnDisk}`);
    throw err;
  }
}

/** Extract only JS within <script type="module"> tags (works for .svelte and .vue files, too) */
function extractJSFromHTML({contents, baseExt}: {contents: string; baseExt: string}): string {
  // TODO: Replace with matchAll once Node v10 is out of TLS.
  // const allMatches = [...result.matchAll(new RegExp(HTML_JS_REGEX))];
  const allMatches: string[][] = [];
  let match;
  let regex = new RegExp(HTML_JS_REGEX);
  if (baseExt === '.svelte' || baseExt === '.vue') {
    regex = new RegExp(SVELTE_VUE_REGEX); // scan <script> tags, not <script type="module">
  }
  while ((match = regex.exec(contents))) {
    allMatches.push(match);
  }

  return allMatches
    .map((match) => match[2]) // match[2] is the code inside the <script></script> element
    .filter((s) => s.trim())
    .join('\n');
}

export function scanDepList(depList: string[], cwd: string): InstallTarget[] {
  return depList
    .map((whitelistItem) => {
      if (!glob.hasMagic(whitelistItem)) {
        return [createInstallTarget(whitelistItem, true)];
      } else {
        const nodeModulesLoc = path.join(cwd, 'node_modules');
        return scanDepList(glob.sync(whitelistItem, {cwd: nodeModulesLoc, nodir: true}), cwd);
      }
    })
    .reduce((flat, item) => flat.concat(item), []);
}

export async function scanImports(config: SnowpackConfig): Promise<InstallTarget[]> {
  await initESModuleLexer;
  const includeFileSets = await Promise.all(
    Object.keys(config.mount).map((fromDisk) => {
      return glob.sync(`**/*`, {
        ignore: config.exclude.concat(['**/web_modules/**/*']),
        cwd: fromDisk,
        absolute: true,
        nodir: true,
      });
    }),
  );
  const includeFiles = Array.from(new Set(([] as string[]).concat.apply([], includeFileSets)));
  if (includeFiles.length === 0) {
    return [];
  }

  // Scan every matched JS file for web dependency imports
  const loadedFiles: (SnowpackSourceFile | null)[] = await Promise.all(
    includeFiles.map(async (filePath) => {
      const {baseExt, expandedExt} = getExt(filePath);
      return {
        baseExt,
        expandedExt,
        locOnDisk: filePath,
        contents: await readFile(filePath),
      };
    }),
  );

  return scanImportsFromFiles(loadedFiles.filter(isTruthy), config);
}

export async function scanImportsFromFiles(
  loadedFiles: SnowpackSourceFile[],
  config: SnowpackConfig,
): Promise<InstallTarget[]> {
  return loadedFiles
    .filter((sourceFile) => !Buffer.isBuffer(sourceFile.contents)) // filter out binary files from import scanning
    .map((sourceFile) => parseFileForInstallTargets(sourceFile as SnowpackSourceFile<string>))
    .reduce((flat, item) => flat.concat(item), [])
    .filter((target) => {
      const aliasEntry = findMatchingAliasEntry(config, target.specifier);
      return !aliasEntry || aliasEntry.type === 'package';
    })
    .sort((impA, impB) => impA.specifier.localeCompare(impB.specifier));
}
