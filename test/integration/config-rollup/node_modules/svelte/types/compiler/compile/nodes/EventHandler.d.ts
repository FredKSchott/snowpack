import Node from './shared/Node';
import Expression from './shared/Expression';
import Component from '../Component';
import { Identifier } from 'estree';
export default class EventHandler extends Node {
    type: 'EventHandler';
    name: string;
    modifiers: Set<string>;
    expression: Expression;
    handler_name: Identifier;
    uses_context: boolean;
    can_make_passive: boolean;
    constructor(component: Component, parent: any, template_scope: any, info: any);
    readonly reassigned: boolean;
}
