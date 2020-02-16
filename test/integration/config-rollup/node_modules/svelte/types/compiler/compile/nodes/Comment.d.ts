import Node from './shared/Node';
export default class Comment extends Node {
    type: 'Comment';
    data: string;
    ignores: string[];
    constructor(component: any, parent: any, scope: any, info: any);
}
