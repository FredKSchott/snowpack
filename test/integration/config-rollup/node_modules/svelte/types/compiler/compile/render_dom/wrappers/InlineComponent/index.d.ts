import Wrapper from '../shared/Wrapper';
import Renderer from '../../Renderer';
import Block from '../../Block';
import InlineComponent from '../../../nodes/InlineComponent';
import FragmentWrapper from '../Fragment';
import TemplateScope from '../../../nodes/shared/TemplateScope';
import { Node, Identifier } from 'estree';
export default class InlineComponentWrapper extends Wrapper {
    var: Identifier;
    slots: Map<string, {
        block: Block;
        scope: TemplateScope;
        get_context?: Node;
        get_changes?: Node;
    }>;
    node: InlineComponent;
    fragment: FragmentWrapper;
    constructor(renderer: Renderer, block: Block, parent: Wrapper, node: InlineComponent, strip_whitespace: boolean, next_sibling: Wrapper);
    render(block: Block, parent_node: Identifier, parent_nodes: Identifier): void;
}
