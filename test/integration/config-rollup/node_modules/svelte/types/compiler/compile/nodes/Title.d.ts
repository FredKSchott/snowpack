import Node from './shared/Node';
import { Children } from './shared/map_children';
import Component from '../Component';
export default class Title extends Node {
    type: 'Title';
    children: Children;
    should_cache: boolean;
    constructor(component: Component, parent: any, scope: any, info: any);
}
