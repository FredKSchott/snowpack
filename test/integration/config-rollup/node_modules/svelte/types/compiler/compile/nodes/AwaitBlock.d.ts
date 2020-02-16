import Node from './shared/Node';
import PendingBlock from './PendingBlock';
import ThenBlock from './ThenBlock';
import CatchBlock from './CatchBlock';
import Expression from './shared/Expression';
export default class AwaitBlock extends Node {
    type: 'AwaitBlock';
    expression: Expression;
    value: string;
    error: string;
    pending: PendingBlock;
    then: ThenBlock;
    catch: CatchBlock;
    constructor(component: any, parent: any, scope: any, info: any);
}
