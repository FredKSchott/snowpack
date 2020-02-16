import Attribute from '../Attribute';
import Component from '../../Component';
import { INode } from '../interfaces';
export default class Node {
    readonly start: number;
    readonly end: number;
    readonly component: Component;
    readonly parent: INode;
    readonly type: string;
    prev?: INode;
    next?: INode;
    can_use_innerhtml: boolean;
    var: string;
    attributes: Attribute[];
    constructor(component: Component, parent: any, _scope: any, info: any);
    cannot_use_innerhtml(): void;
    find_nearest(selector: RegExp): any;
    get_static_attribute_value(name: string): string | true;
    has_ancestor(type: string): any;
}
