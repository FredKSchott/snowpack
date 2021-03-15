import {matchDynamicImportValue} from './scan-imports';
import {scanImportGlob} from './scan-import-glob';
import {CSS_REGEX, HTML_JS_REGEX, HTML_STYLE_REGEX} from './util';
import { logger } from './logger';

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

export function transformGlobImports(_code: string) {
  const importGlobs = scanImportGlob(_code);
  let rewrittenCode = _code;

  for (const impGlob of importGlobs.reverse()) {
    logger.warn(JSON.stringify(impGlob));
  }

  return rewrittenCode;
}

export async function transformEsmImports(
  _code: string,
  replaceImport: (specifier: string) => string | Promise<string>,
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
    let rewrittenImport = await replaceImport(spec);
    if (imp.d > -1) {
      rewrittenImport = webpackMagicCommentMatches
        ? `${webpackMagicCommentMatches.join(' ')} ${JSON.stringify(rewrittenImport)}`
        : JSON.stringify(rewrittenImport);
    }
    rewrittenCode = spliceString(rewrittenCode, rewrittenImport, imp.s, imp.e);
  }
  return rewrittenCode;
}

async function transformHtmlImports(
  code: string,
  replaceImport: (specifier: string) => string | Promise<string>,
) {
  let rewrittenCode = code;
  let match;
  const jsImportRegex = new RegExp(HTML_JS_REGEX);
  while ((match = jsImportRegex.exec(rewrittenCode))) {
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
  const cssImportRegex = new RegExp(HTML_STYLE_REGEX);
  while ((match = cssImportRegex.exec(rewrittenCode))) {
    const [, styleTag, styleCode] = match;
    // Only transform a script element if it contains inlined code / is not empty.
    if (styleCode.trim()) {
      rewrittenCode = spliceString(
        rewrittenCode,
        await transformCssImports(styleCode, replaceImport),
        match.index + styleTag.length,
        match.index + styleTag.length + styleCode.length,
      );
    }
  }
  return rewrittenCode;
}

async function transformCssImports(
  code: string,
  replaceImport: (specifier: string) => string | Promise<string>,
) {
  let rewrittenCode = code;
  let match;
  const importRegex = new RegExp(CSS_REGEX);
  while ((match = importRegex.exec(rewrittenCode))) {
    const [fullMatch, spec] = match;
    // Only transform a script element if it contains inlined code / is not empty.
    rewrittenCode = spliceString(
      rewrittenCode,
      // CSS doesn't support proxy files, so always point to the original file
      `@import "${(await replaceImport(spec)).replace('.proxy.js', '')}";`,
      match.index,
      match.index + fullMatch.length,
    );
  }
  return rewrittenCode;
}

export async function transformFileImports(
  {type, contents}: {type: string; contents: string},
  replaceImport: (specifier: string) => string | Promise<string>,
) {
  if (type === '.js') {
    return transformEsmImports(transformGlobImports(contents), replaceImport)
  }
  if (type === '.html') {
    return transformHtmlImports(contents, replaceImport);
  }
  if (type === '.css') {
    return transformCssImports(contents, replaceImport);
  }
  throw new Error(
    `Incompatible filetype: cannot scan ${type} files for ESM imports. This is most likely an error within Snowpack.`,
  );
}

export async function transformAddMissingDefaultExport(_code: string) {
  // We need to add a default export, just so that our re-importer doesn't break
  const [, allExports] = await parse(_code);
  if (!allExports.includes('default')) {
    return _code + '\n\nexport default null;';
  }
  return _code;
}
