import {SnowpackSourceFile} from './config';
import {HTML_JS_REGEX} from './util';

const {parse} = require('es-module-lexer');

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
      const importSpecifierMatch = importStatement.match(/^\s*['"](.*)['"]\s*$/m);
      return !!importSpecifierMatch;
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
    if (imp.d > -1) {
      const importSpecifierMatch = spec.match(/^\s*['"](.*)['"]\s*$/m);
      spec = importSpecifierMatch![1];
    }
    let rewrittenImport = replaceImport(spec);
    if (imp.d > -1) {
      rewrittenImport = JSON.stringify(rewrittenImport);
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

export async function transformFileImports(
  {baseExt, contents}: SnowpackSourceFile,
  replaceImport: (specifier: string) => string,
) {
  if (baseExt === '.js') {
    return transformEsmImports(contents, replaceImport);
  }
  if (baseExt === '.html') {
    return transformHtmlImports(contents, replaceImport);
  }
  throw new Error(
    `Incompatible filetype: cannot scan ${baseExt} files for ESM imports. This is most likely an error within Snowpack.`,
  );
}
