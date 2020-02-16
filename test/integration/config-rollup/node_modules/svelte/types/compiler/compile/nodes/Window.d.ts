import Node from './shared/Node';
import Binding from './Binding';
import EventHandler from './EventHandler';
import Action from './Action';
export default class Window extends Node {
    type: 'Window';
    handlers: EventHandler[];
    bindings: Binding[];
    actions: Action[];
    constructor(component: any, parent: any, scope: any, info: any);
}
