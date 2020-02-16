import Component from '../../../Component';
import Block from '../../Block';
import Binding from '../../../nodes/Binding';
import { Identifier } from 'estree';
export default function bind_this(component: Component, block: Block, binding: Binding, variable: Identifier): import("estree").Node[];
