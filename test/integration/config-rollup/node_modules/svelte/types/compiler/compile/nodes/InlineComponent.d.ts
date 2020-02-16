import Node from './shared/Node';
import Attribute from './Attribute';
import Binding from './Binding';
import EventHandler from './EventHandler';
import Expression from './shared/Expression';
import Component from '../Component';
import Let from './Let';
import TemplateScope from './shared/TemplateScope';
import { INode } from './interfaces';
export default class InlineComponent extends Node {
    type: 'InlineComponent';
    name: string;
    expression: Expression;
    attributes: Attribute[];
    bindings: Binding[];
    handlers: EventHandler[];
    lets: Let[];
    children: INode[];
    scope: TemplateScope;
    constructor(component: Component, parent: any, scope: any, info: any);
}
