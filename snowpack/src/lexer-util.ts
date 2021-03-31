export function checkIdent(code: string, pos: number, text: string): boolean {
  return code.slice(pos, pos + text.length) === text;
}

export function isEOL(code: string, pos: number): boolean {
  return code.charAt(pos) === '\n' || (code.charAt(pos) === '\r' && code.charAt(pos + 1) === '\n');
}

/*
 * Adopted from https://github.com/guybedford/es-module-lexer
 * Licensed under the
 *
 * MIT License
 * -----------
 *
 * Copyright (C) 2018-2019 Guy Bedford
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

export function isBrOrWsOrPunctuatorNotDot(ch: string): boolean {
  const c = ch.charCodeAt(0);
  return (c > 8 && c < 14) || c == 32 || c == 160 || (isPunctuator(ch) && ch != '.');
}

export function isPunctuator(ch: string): boolean {
  const c = ch.charCodeAt(0);
  // 23 possible punctuator endings: !%&()*+,-./:;<=>?[]^{}|~
  return (
    ch == '!' ||
    ch == '%' ||
    ch == '&' ||
    (c > 39 && c < 48) ||
    (c > 57 && c < 64) ||
    ch == '[' ||
    ch == ']' ||
    ch == '^' ||
    (c > 122 && c < 127)
  );
}

export function keywordStart(source: string, pos: number) {
  return pos === 0 || isBrOrWsOrPunctuatorNotDot(source.charAt(pos - 1));
}
