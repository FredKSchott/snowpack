export declare function append(target: Node, node: Node): void;
export declare function insert(target: Node, node: Node, anchor?: Node): void;
export declare function detach(node: Node): void;
export declare function destroy_each(iterations: any, detaching: any): void;
export declare function element<K extends keyof HTMLElementTagNameMap>(name: K): HTMLElementTagNameMap[K];
export declare function element_is<K extends keyof HTMLElementTagNameMap>(name: K, is: string): HTMLElementTagNameMap[K];
export declare function object_without_properties<T, K extends keyof T>(obj: T, exclude: K[]): Pick<T, Exclude<keyof T, K>>;
export declare function svg_element<K extends keyof SVGElementTagNameMap>(name: K): SVGElement;
export declare function text(data: string): Text;
export declare function space(): Text;
export declare function empty(): Text;
export declare function listen(node: Node, event: string, handler: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions | EventListenerOptions): () => void;
export declare function prevent_default(fn: any): (event: any) => any;
export declare function stop_propagation(fn: any): (event: any) => any;
export declare function self(fn: any): (event: any) => void;
export declare function attr(node: Element, attribute: string, value?: string): void;
export declare function set_attributes(node: Element & ElementCSSInlineStyle, attributes: {
    [x: string]: string;
}): void;
export declare function set_svg_attributes(node: Element & ElementCSSInlineStyle, attributes: {
    [x: string]: string;
}): void;
export declare function set_custom_element_data(node: any, prop: any, value: any): void;
export declare function xlink_attr(node: any, attribute: any, value: any): void;
export declare function get_binding_group_value(group: any): any[];
export declare function to_number(value: any): number;
export declare function time_ranges_to_array(ranges: any): any[];
export declare function children(element: any): unknown[];
export declare function claim_element(nodes: any, name: any, attributes: any, svg: any): any;
export declare function claim_text(nodes: any, data: any): any;
export declare function claim_space(nodes: any): any;
export declare function set_data(text: any, data: any): void;
export declare function set_input_value(input: any, value: any): void;
export declare function set_input_type(input: any, type: any): void;
export declare function set_style(node: any, key: any, value: any, important: any): void;
export declare function select_option(select: any, value: any): void;
export declare function select_options(select: any, value: any): void;
export declare function select_value(select: any): any;
export declare function select_multiple_value(select: any): any;
export declare function add_resize_listener(element: any, fn: any): {
    cancel: () => void;
};
export declare function toggle_class(element: any, name: any, toggle: any): void;
export declare function custom_event<T = any>(type: string, detail?: T): CustomEvent<T>;
export declare function query_selector_all(selector: string, parent?: HTMLElement): Element[];
export declare class HtmlTag {
    e: HTMLElement;
    n: ChildNode[];
    t: HTMLElement;
    a: HTMLElement;
    constructor(html: string, anchor?: HTMLElement);
    m(target: HTMLElement, anchor?: HTMLElement): void;
    u(html: string): void;
    p(html: string): void;
    d(): void;
}
