import Component from '../Component';
import { Scope } from './scope';
import { Node } from 'estree';
export declare function invalidate(component: Component, scope: Scope, node: Node, names: Set<string>): any;
