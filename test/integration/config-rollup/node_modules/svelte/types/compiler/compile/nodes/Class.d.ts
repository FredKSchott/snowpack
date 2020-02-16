import Node from './shared/Node';
import Expression from './shared/Expression';
export default class Class extends Node {
    type: 'Class';
    name: string;
    expression: Expression;
    constructor(component: any, parent: any, scope: any, info: any);
}
