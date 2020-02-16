import Node from './shared/Node';
import EventHandler from './EventHandler';
export default class Body extends Node {
    type: 'Body';
    handlers: EventHandler[];
    constructor(component: any, parent: any, scope: any, info: any);
}
