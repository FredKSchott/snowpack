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
  inCall
}

export function scanImportGlob(code: string) {
  let pos = -1;
  let start = 0;
  let end = 0;
  let state = ScannerState.idle;

  let importGlobs: any[] = [];
  let importGlob: any;
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

    switch (ch) {
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
          importGlob = { start, isEager };
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
        end = pos;
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

  return importGlobs as any[];
}

function checkIdent(code: string, pos: number, text: string): boolean {
  return code.slice(pos, pos + text.length) === text;
}

function isInQuote(state: ScannerState): boolean {
  return state === ScannerState.inDoubleQuote || state === ScannerState.inSingleQuote || state === ScannerState.inTemplateLiteral
}

function isBrOrWsOrPunctuatorNotDot(ch: string): boolean {
  const c = ch.charCodeAt(0);
  return c > 8 && c < 14 || c == 32 || c == 160 || isPunctuator(ch) && ch != '.';
}

function isPunctuator(ch: string): boolean {
  const c = ch.charCodeAt(0);
  // 23 possible punctuator endings: !%&()*+,-./:;<=>?[]^{}|~
  return ch == '!' || ch == '%' || ch == '&' ||
    c > 39 && c < 48 || c > 57 && c < 64 ||
    ch == '[' || ch == ']' || ch == '^' ||
    c > 122 && c < 127;
}

function keywordStart (source: string, pos: number) {
  return pos === 0 || isBrOrWsOrPunctuatorNotDot(source.charAt(pos - 1));
}
