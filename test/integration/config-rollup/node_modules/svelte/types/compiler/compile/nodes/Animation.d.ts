import Node from './shared/Node';
import Expression from './shared/Expression';
import Component from '../Component';
export default class Animation extends Node {
    type: 'Animation';
    name: string;
    expression: Expression;
    constructor(component: Component, parent: any, scope: any, info: any);
}
