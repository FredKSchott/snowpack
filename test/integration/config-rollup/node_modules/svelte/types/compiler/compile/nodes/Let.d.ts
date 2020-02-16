import Node from './shared/Node';
import Component from '../Component';
import { Identifier } from 'estree';
export default class Let extends Node {
    type: 'Let';
    name: Identifier;
    value: Identifier;
    names: string[];
    constructor(component: Component, parent: any, scope: any, info: any);
}
