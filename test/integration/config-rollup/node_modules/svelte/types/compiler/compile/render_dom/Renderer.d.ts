import Block from './Block';
import { CompileOptions, Var } from '../../interfaces';
import Component from '../Component';
import FragmentWrapper from './wrappers/Fragment';
import { Node, Identifier, MemberExpression, Literal, Expression } from 'estree';
interface ContextMember {
    name: string;
    index: Literal;
    is_contextual: boolean;
    is_non_contextual: boolean;
    variable: Var;
    priority: number;
}
export default class Renderer {
    component: Component;
    options: CompileOptions;
    context: ContextMember[];
    context_lookup: Map<string, ContextMember>;
    context_overflow: boolean;
    blocks: Array<Block | Node | Node[]>;
    readonly: Set<string>;
    meta_bindings: Array<Node | Node[]>;
    binding_groups: string[];
    block: Block;
    fragment: FragmentWrapper;
    file_var: Identifier;
    locate: (c: number) => {
        line: number;
        column: number;
    };
    constructor(component: Component, options: CompileOptions);
    add_to_context(name: string, contextual?: boolean): ContextMember;
    invalidate(name: string, value?: any): any;
    dirty(names: any, is_reactive_declaration?: boolean): Expression;
    reference(node: string | Identifier | MemberExpression): any;
}
export {};
