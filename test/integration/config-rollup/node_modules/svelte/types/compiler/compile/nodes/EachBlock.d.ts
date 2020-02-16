import ElseBlock from './ElseBlock';
import Expression from './shared/Expression';
import TemplateScope from './shared/TemplateScope';
import AbstractBlock from './shared/AbstractBlock';
import { Node, Identifier } from 'estree';
interface Context {
    key: Identifier;
    name?: string;
    modifier: (node: Node) => Node;
}
export default class EachBlock extends AbstractBlock {
    type: 'EachBlock';
    expression: Expression;
    context_node: Node;
    iterations: string;
    index: string;
    context: string;
    key: Expression;
    scope: TemplateScope;
    contexts: Context[];
    has_animation: boolean;
    has_binding: boolean;
    else?: ElseBlock;
    constructor(component: any, parent: any, scope: any, info: any);
}
export {};
