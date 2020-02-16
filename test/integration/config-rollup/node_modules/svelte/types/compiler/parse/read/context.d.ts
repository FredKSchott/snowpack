import { Parser } from '../index';
interface Identifier {
    start: number;
    end: number;
    type: 'Identifier';
    name: string;
}
interface Property {
    start: number;
    end: number;
    type: 'Property';
    kind: 'init' | 'rest';
    shorthand: boolean;
    key: Identifier;
    value: Context;
}
interface Context {
    start: number;
    end: number;
    type: 'Identifier' | 'ArrayPattern' | 'ObjectPattern' | 'RestIdentifier';
    name?: string;
    elements?: Context[];
    properties?: Property[];
}
export default function read_context(parser: Parser): Context;
export {};
