declare module "es-module-lexer" {
  export type Import = {
    s: number,
    e: number,
    ss: number,
    se: number,
    d: number
  };
  export function init(): Promise<any>;
  export function parse(code: string): [Array<Import>, Array<string>];
}