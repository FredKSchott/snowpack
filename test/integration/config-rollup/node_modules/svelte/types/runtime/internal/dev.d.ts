import { SvelteComponent } from './Component';
export declare function dispatch_dev<T = any>(type: string, detail?: T): void;
export declare function append_dev(target: Node, node: Node): void;
export declare function insert_dev(target: Node, node: Node, anchor?: Node): void;
export declare function detach_dev(node: Node): void;
export declare function detach_between_dev(before: Node, after: Node): void;
export declare function detach_before_dev(after: Node): void;
export declare function detach_after_dev(before: Node): void;
export declare function listen_dev(node: Node, event: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions | EventListenerOptions, has_prevent_default?: boolean, has_stop_propagation?: boolean): () => void;
export declare function attr_dev(node: Element, attribute: string, value?: string): void;
export declare function prop_dev(node: Element, property: string, value?: any): void;
export declare function dataset_dev(node: HTMLElement, property: string, value?: any): void;
export declare function set_data_dev(text: any, data: any): void;
declare type Props = Record<string, any>;
export interface SvelteComponentDev {
    $set(props?: Props): void;
    $on<T = any>(event: string, callback: (event: CustomEvent<T>) => void): () => void;
    $destroy(): void;
    [accessor: string]: any;
}
export declare class SvelteComponentDev extends SvelteComponent {
    constructor(options: {
        target: Element;
        anchor?: Element;
        props?: Props;
        hydrate?: boolean;
        intro?: boolean;
        $$inline?: boolean;
    });
}
export declare function loop_guard(timeout: any): () => void;
export {};
