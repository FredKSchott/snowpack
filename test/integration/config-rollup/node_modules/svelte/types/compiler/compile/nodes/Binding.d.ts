import Node from './shared/Node';
import Expression from './shared/Expression';
import Component from '../Component';
import TemplateScope from './shared/TemplateScope';
import { Node as ESTreeNode } from 'estree';
export default class Binding extends Node {
    type: 'Binding';
    name: string;
    expression: Expression;
    raw_expression: ESTreeNode;
    is_contextual: boolean;
    is_readonly: boolean;
    constructor(component: Component, parent: any, scope: TemplateScope, info: any);
    is_readonly_media_attribute(): boolean;
}
