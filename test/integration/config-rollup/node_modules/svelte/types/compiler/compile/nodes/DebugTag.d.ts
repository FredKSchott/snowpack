import Node from './shared/Node';
import Expression from './shared/Expression';
export default class DebugTag extends Node {
    type: 'DebugTag';
    expressions: Expression[];
    constructor(component: any, parent: any, scope: any, info: any);
}
