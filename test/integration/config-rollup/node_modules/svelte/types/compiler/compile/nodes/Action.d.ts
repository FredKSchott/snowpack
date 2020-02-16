import Node from './shared/Node';
import Expression from './shared/Expression';
import Component from '../Component';
export default class Action extends Node {
    type: 'Action';
    name: string;
    expression: Expression;
    uses_context: boolean;
    constructor(component: Component, parent: any, scope: any, info: any);
}
