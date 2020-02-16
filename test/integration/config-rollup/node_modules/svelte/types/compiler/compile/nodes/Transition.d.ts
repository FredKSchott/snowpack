import Node from './shared/Node';
import Expression from './shared/Expression';
import Component from '../Component';
export default class Transition extends Node {
    type: 'Transition';
    name: string;
    directive: string;
    expression: Expression;
    is_local: boolean;
    constructor(component: Component, parent: any, scope: any, info: any);
}
