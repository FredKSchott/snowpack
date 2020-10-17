import {SnowpackSourceFile} from './types/snowpack';
import {HTML_JS_REGEX, CSS_REGEX} from './util';
import {matchDynamicImportValue} from './scan-imports';

const {parse} = require('es-module-lexer');

const WEBPACK_MAGIC_COMMENT_REGEX = /\/\*[\s\S]*?\*\//g;

function spliceString(source: string, withSlice: string, start: number, end: number) {
  return source.slice(0, start) + (withSlice || '') + source.slice(end);
}

export async function scanCodeImportsExports(code: string): Promise<any[]> {
  const [imports] = await parse(code);
  return imports.filter((imp: any) => {
    //imp.d = -2 = import.meta.url = we can skip this for now
    if (imp.d === -2) {
      return false;
    }
    // imp.d > -1 === dynamic import
    if (imp.d > -1) {
      const importStatement = code.substring(imp.s, imp.e);
      return !!matchDynamicImportValue(importStatement);
    }
    return true;
  });
}

export async function transformEsmImports(
  _code: string,
  replaceImport: (specifier: string) => string,
) {
  const imports = await scanCodeImportsExports(_code);
  let rewrittenCode = _code;
  for (const imp of imports.reverse()) {
    let spec = rewrittenCode.substring(imp.s, imp.e);
    let webpackMagicCommentMatches;
    if (imp.d > -1) {
      // Extracting comments from spec as they are stripped in `matchDynamicImportValue`
      webpackMagicCommentMatches = spec.match(WEBPACK_MAGIC_COMMENT_REGEX);
      spec = matchDynamicImportValue(spec) || '';
    }
    let rewrittenImport = replaceImport(spec);
    if (imp.d > -1) {
      rewrittenImport = webpackMagicCommentMatches
        ? `${webpackMagicCommentMatches.join(' ')} ${JSON.stringify(rewrittenImport)}`
        : JSON.stringify(rewrittenImport);
    }
    rewrittenCode = spliceString(rewrittenCode, rewrittenImport, imp.s, imp.e);
  }
  return rewrittenCode;
}

async function transformHtmlImports(code: string, replaceImport: (specifier: string) => string) {
  let rewrittenCode = code;
  let match;
  const importRegex = new RegExp(HTML_JS_REGEX);
  while ((match = importRegex.exec(rewrittenCode))) {
    const [, scriptTag, scriptCode] = match;
    // Only transform a script element if it contains inlined code / is not empty.
    if (scriptCode.trim()) {
      rewrittenCode = spliceString(
        rewrittenCode,
        await transformEsmImports(scriptCode, replaceImport),
        match.index + scriptTag.length,
        match.index + scriptTag.length + scriptCode.length,
      );
    }
  }
  return rewrittenCode;
}

async function transformCssImports(code: string, replaceImport: (specifier: string) => string) {
  let rewrittenCode = code;
  let match;
  const importRegex = new RegExp(CSS_REGEX);
  while ((match = importRegex.exec(rewrittenCode))) {
    const [fullMatch, spec] = match;
    // Only transform a script element if it contains inlined code / is not empty.
    rewrittenCode = spliceString(
      rewrittenCode,
      `@import "${replaceImport(spec)}";`,
      match.index,
      match.index + fullMatch.length,
    );
  }
  return rewrittenCode;
}

export async function transformFileImports(
  {baseExt, contents}: SnowpackSourceFile<string>,
  replaceImport: (specifier: string) => string,
) {
  if (baseExt.endsWith('.js')) {
    return transformEsmImports(contents, replaceImport);
  }
  if (baseExt.endsWith('.html')) {
    return transformHtmlImports(contents, replaceImport);
  }
  if (baseExt.endsWith('.css')) {
    return transformCssImports(contents, replaceImport);
  }
  throw new Error(
    `Incompatible filetype: cannot scan ${baseExt} files for ESM imports. This is most likely an error within Snowpack.`,
  );
}
