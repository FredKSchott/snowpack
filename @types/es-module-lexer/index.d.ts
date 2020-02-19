declare module "es-module-lexer" {
  export type ImportSpecifier = {
    s: number,
    e: number,
    ss: number,
    se: number,
    d: number
  };
  export function init(): Promise<void>;
  export function parse(code: string): [Array<ImportSpecifier>, Array<string>];
}