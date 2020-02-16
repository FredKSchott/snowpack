import ElseBlock from './ElseBlock';
import Expression from './shared/Expression';
import AbstractBlock from './shared/AbstractBlock';
export default class IfBlock extends AbstractBlock {
    type: 'IfBlock';
    expression: Expression;
    else: ElseBlock;
    constructor(component: any, parent: any, scope: any, info: any);
}
