import {ImportSpecifier, init as initESModuleLexer, parse} from 'es-module-lexer';
import fs from 'fs';
import glob from 'glob';
import * as colors from 'kleur/colors';
import mime from 'mime-types';
import nodePath from 'path';
import stripComments from 'strip-comments';
import validatePackageName from 'validate-npm-package-name';
import {SnowpackConfig, SnowpackSourceFile} from './config';
import {findMatchingMountScript, getExt, HTML_JS_REGEX, isTruthy} from './util';

const WEB_MODULES_TOKEN = 'web_modules/';
const WEB_MODULES_TOKEN_LENGTH = WEB_MODULES_TOKEN.length;

// [@\w] - Match a word-character or @ (valid package name)
// (?!.*(:\/\/)) - Ignore if previous match was a protocol (ex: http://)
const BARE_SPECIFIER_REGEX = /^[@\w](?!.*(:\/\/))/;

const ESM_IMPORT_REGEX = /import(?:["'\s]*([\w*${}\n\r\t, ]+)\s*from\s*)?\s*["'](.*?)["']/gm;
const ESM_DYNAMIC_IMPORT_REGEX = /import\((?:['"].+['"]|`[^$]+`)\)/gm;
const HAS_NAMED_IMPORTS_REGEX = /^[\w\s\,]*\{(.*)\}/s;
const STRIP_AS = /\s+as\s+.*/; // for `import { foo as bar }`, strips “as bar”
const DEFAULT_IMPORT_REGEX = /import\s+(\w)+(,\s\{[\w\s]*\})?\s+from/s;

/**
 * An install target represents information about a dependency to install.
 * The specifier is the key pointing to the dependency, either as a package
 * name or as an actual file path within node_modules. All other properties
 * are metadata about what is actually being imported.
 */
export type InstallTarget = {
  specifier: string;
  all: boolean;
  default: boolean;
  namespace: boolean;
  named: string[];
};

function stripJsExtension(dep: string): string {
  return dep.replace(/\.m?js$/i, '');
}

function createInstallTarget(specifier: string, all = true): InstallTarget {
  return {
    specifier,
    all,
    default: false,
    namespace: false,
    named: [],
  };
}

function removeSpecifierQueryString(specifier: string) {
  const queryStringIndex = specifier.indexOf('?');
  if (queryStringIndex >= 0) {
    specifier = specifier.substring(0, queryStringIndex);
  }
  return specifier;
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
  const importSpecifierMatch = importStatement.match(/^\s*['"](.*)['"]\s*$/m);
  return importSpecifierMatch ? importSpecifierMatch[1] : null;
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
  // Clean the specifier, remove any query params that may mess with matching
  const cleanedSpecifier = removeSpecifierQueryString(specifier);
  // Otherwise, check that it includes the "web_modules/" directory
  const webModulesIndex = cleanedSpecifier.indexOf(WEB_MODULES_TOKEN);
  if (webModulesIndex === -1) {
    return null;
  }

  // Check if this matches `@scope/package.js` or `package.js` format.
  // If it is, assume that this is a top-level pcakage that should be installed without the “.js”
  const resolvedSpecifier = cleanedSpecifier.substring(webModulesIndex + WEB_MODULES_TOKEN_LENGTH);
  const resolvedSpecifierWithoutExtension = stripJsExtension(resolvedSpecifier);
  if (validatePackageName(resolvedSpecifierWithoutExtension).validForNewPackages) {
    return resolvedSpecifierWithoutExtension;
  }
  // Otherwise, this is an explicit import to a file within a package.
  return resolvedSpecifier;
}

function parseImportStatement(code: string, imp: ImportSpecifier): null | InstallTarget {
  const webModuleSpecifier = parseWebModuleSpecifier(getWebModuleSpecifierFromCode(code, imp));
  if (!webModuleSpecifier) {
    return null;
  }

  const importStatement = code.substring(imp.ss, imp.se);
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

function parseCodeForInstallTargets({
  locOnDisk,
  baseExt,
  contents,
}: SnowpackSourceFile): InstallTarget[] {
  let imports: ImportSpecifier[];
  // Attempt #1: Parse the file as JavaScript. JSX and some decorator
  // syntax will break this.
  try {
    if (baseExt === '.jsx' || baseExt === '.tsx') {
      // We know ahead of time that this will almost certainly fail.
      // Just jump right to the secondary attempt.
      throw new Error('JSX must be cleaned before parsing');
    }
    [imports] = parse(contents) || [];
  } catch (err) {
    // Attempt #2: Parse only the import statements themselves.
    // This lets us guarentee we aren't sending any broken syntax to our parser,
    // but at the expense of possible false +/- caused by our regex extractor.
    try {
      contents = cleanCodeForParsing(contents);
      [imports] = parse(contents) || [];
    } catch (err) {
      // Another error! No hope left, just abort.
      console.error(colors.red(`! ${locOnDisk}`));
      throw err;
    }
  }
  const allImports: InstallTarget[] = imports
    .map((imp) => parseImportStatement(contents, imp))
    .filter(isTruthy)
    // Babel macros are not install targets!
    .filter((imp) => !/[./]macro(\.js)?$/.test(imp.specifier));
  return allImports;
}

export function scanDepList(depList: string[], cwd: string): InstallTarget[] {
  return depList
    .map((whitelistItem) => {
      if (!glob.hasMagic(whitelistItem)) {
        return [createInstallTarget(whitelistItem, true)];
      } else {
        const nodeModulesLoc = nodePath.join(cwd, 'node_modules');
        return scanDepList(glob.sync(whitelistItem, {cwd: nodeModulesLoc, nodir: true}), cwd);
      }
    })
    .reduce((flat, item) => flat.concat(item), []);
}

export async function scanImports(cwd: string, config: SnowpackConfig): Promise<InstallTarget[]> {
  await initESModuleLexer;
  const includeFileSets = await Promise.all(
    Object.keys(config.mount).map((fromDisk) => {
      const dirDisk = nodePath.resolve(cwd, fromDisk);
      return glob.sync(`**/*`, {
        ignore: config.exclude.concat(['**/web_modules/**/*']),
        cwd: dirDisk,
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
      // Always ignore dotfiles
      if (filePath.startsWith('.')) {
        return null;
      }

      switch (baseExt) {
        // Probably a license, a README, etc
        case '': {
          return null;
        }
        // Our import scanner can handle normal JS & even TypeScript without a problem.
        case '.js':
        case '.jsx':
        case '.mjs':
        case '.ts':
        case '.tsx': {
          return {
            baseExt,
            expandedExt,
            locOnDisk: filePath,
            contents: await fs.promises.readFile(filePath, 'utf-8'),
          };
        }
        case '.html':
        case '.vue':
        case '.svelte': {
          const result = await fs.promises.readFile(filePath, 'utf-8');
          // TODO: Replace with matchAll once Node v10 is out of TLS.
          // const allMatches = [...result.matchAll(new RegExp(HTML_JS_REGEX))];
          const allMatches: string[][] = [];
          let match;
          const regex = new RegExp(HTML_JS_REGEX);
          while ((match = regex.exec(result))) {
            allMatches.push(match);
          }
          return {
            baseExt,
            expandedExt,
            locOnDisk: filePath,
            // match[2] is the code inside the <script></script> element
            contents: allMatches
              .map((match) => match[2])
              .filter((s) => s.trim())
              .join('\n'),
          };
        }
      }

      // If we don't recognize the file type, it could be source. Warn just in case.
      if (!mime.lookup(baseExt)) {
        console.warn(
          colors.dim(`ignoring unsupported file "${nodePath.relative(process.cwd(), filePath)}"`),
        );
      }
      return null;
    }),
  );
  return scanImportsFromFiles(loadedFiles.filter(isTruthy), config);
}

export async function scanImportsFromFiles(
  loadedFiles: SnowpackSourceFile[],
  config: SnowpackConfig,
): Promise<InstallTarget[]> {
  return (
    loadedFiles
      .map(parseCodeForInstallTargets)
      .reduce((flat, item) => flat.concat(item), [])
      // Ignore source imports that match a mount directory.
      .filter((target) => !findMatchingMountScript(config.mount, target.specifier))
      .sort((impA, impB) => impA.specifier.localeCompare(impB.specifier))
  );
}
