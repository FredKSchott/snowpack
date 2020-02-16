import MagicString from 'magic-string';
import { Node } from '../interfaces';
export declare function remove_indentation(code: MagicString, node: Node): void;
export declare function add_indentation(code: MagicString, node: Node, levels?: number): void;
