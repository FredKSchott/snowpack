import Node from './shared/Node';
export default class Head extends Node {
    type: 'Head';
    children: any[];
    id: string;
    constructor(component: any, parent: any, scope: any, info: any);
}
