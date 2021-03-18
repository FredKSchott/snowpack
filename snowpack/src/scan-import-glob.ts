import { keywordStart, checkIdent, isEOL } from './lexer-util';

export interface ImportGlobStatement {
  start: number;
  end: number;
  glob: string;
  isEager: boolean;
}

const enum ScannerState {
  idle,
  inImport,
  maybeImportMeta,
  onImportMeta,
  onImportMetaGlob,
  inSingleQuote,
  inDoubleQuote,
  inTemplateLiteral,
  inCall,
  inSingleLineComment,
  inMutliLineComment,
}

// Specifically NOT using /g here as it is stateful!
const IMPORT_META_GLOB_REGEX = /import\s*\.\s*meta\s*\.\s*glob/;

export function scanImportGlob(code: string) {
  if (!IMPORT_META_GLOB_REGEX.test(code)) return [];

  let pos = -1;
  let start = 0;
  let end = 0;
  let state = ScannerState.idle;

  let importGlobs: ImportGlobStatement[] = [];
  let importGlob: ImportGlobStatement|null = null;
  let glob: string = '';

  while (pos++ < code.length) {
    const ch = code.charAt(pos);
    
    if (isInQuote(state)) {
      switch (ch) {
        case '"':
        case "'":
        case '`': {
          state = ScannerState.idle;
          break;
        }
        default: {
          glob += ch;
        }
      }
      continue;
    }

    if (isInComment(state)) {
      if (state === ScannerState.inSingleLineComment && isEOL(code, pos)) {
         state = ScannerState.idle;
      } else if (state === ScannerState.inMutliLineComment && checkIdent(code, pos, '*/')) {
        state = ScannerState.idle;
      } else {
        continue;
      }
    }

    switch (ch) {
      case '/': {
        if (isInQuote(state)) continue;

        if (code[pos + 1] === '/') {
          state = ScannerState.inSingleLineComment;
        } else if (code[pos + 1] === '*') {
          state = ScannerState.inMutliLineComment;
        }
        break;
      }
      case 'i': {
        if (keywordStart(code, pos) && checkIdent(code, pos, 'import')) {
          state = ScannerState.inImport;
          start = pos;
        }
        break;
      }
      case '.': {
        if (state === ScannerState.inImport) {
          state = ScannerState.maybeImportMeta;
        }
        break;
      }
      case 'm': {
        if (state === ScannerState.maybeImportMeta && checkIdent(code, pos, 'meta')) {
          state = ScannerState.onImportMeta;
        }
        break;
      }
      case 'g': {
        if (state === ScannerState.onImportMeta && checkIdent(code, pos, 'glob')) {
          state = ScannerState.onImportMetaGlob;
          const isEager = checkIdent(code, pos, 'globEager');
          importGlob = { start, isEager } as any;
        }
        break;
      }
      case '"': {
        state = ScannerState.inDoubleQuote;
        glob = '';
        break;
      }
      case "'": {
        state = ScannerState.inSingleQuote;
        glob = '';
        break;
      }
      case "`": {
        state = ScannerState.inTemplateLiteral;
        glob = '';
        break;
      }
      case '(': {
        if (state === ScannerState.onImportMetaGlob) state = ScannerState.inCall;
        break;
      }
      case ')': {
        state = ScannerState.idle;
        end = pos + 1;
        if (importGlob) {
          Object.assign(importGlob, { glob, end });
          importGlobs.push(importGlob);
          importGlob = null;
          start = 0;
          end = 0;
        }
        break;
      }
    }
  }

  return importGlobs as ImportGlobStatement[];
}

function isInQuote(state: ScannerState): boolean {
  return state === ScannerState.inDoubleQuote || state === ScannerState.inSingleQuote || state === ScannerState.inTemplateLiteral
}

function isInComment(state: ScannerState): boolean {
  return state === ScannerState.inSingleLineComment || state === ScannerState.inMutliLineComment
}
