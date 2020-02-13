/**
 * @license
 * Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import { TemplateResult } from 'lit-html';
import { PropertyValues, UpdatingElement } from './lib/updating-element.js';
export * from './lib/updating-element.js';
export * from './lib/decorators.js';
export { html, svg, TemplateResult, SVGTemplateResult } from 'lit-html/lit-html.js';
import { CSSResult } from './lib/css-tag.js';
export * from './lib/css-tag.js';
declare global {
    interface Window {
        litElementVersions: string[];
    }
}
export interface CSSResultArray extends Array<CSSResult | CSSResultArray> {
}
export declare class LitElement extends UpdatingElement {
    /**
     * Ensure this class is marked as `finalized` as an optimization ensuring
     * it will not needlessly try to `finalize`.
     *
     * Note this property name is a string to prevent breaking Closure JS Compiler
     * optimizations. See updating-element.ts for more information.
     */
    protected static ['finalized']: boolean;
    /**
     * Render method used to render the lit-html TemplateResult to the element's
     * DOM.
     * @param {TemplateResult} Template to render.
     * @param {Element|DocumentFragment} Node into which to render.
     * @param {String} Element name.
     * @nocollapse
     */
    static render: (result: TemplateResult, container: Element | DocumentFragment | ShadowRoot, options: import("lit-html/lib/shady-render").ShadyRenderOptions) => void;
    /**
     * Array of styles to apply to the element. The styles should be defined
     * using the `css` tag function.
     */
    static styles?: CSSResult | CSSResultArray;
    private static _styles;
    /** @nocollapse */
    protected static finalize(): void;
    /** @nocollapse */
    private static _getUniqueStyles;
    private _needsShimAdoptedStyleSheets?;
    /**
     * Node or ShadowRoot into which element DOM should be rendered. Defaults
     * to an open shadowRoot.
     */
    readonly renderRoot: Element | DocumentFragment;
    /**
     * Performs element initialization. By default this calls `createRenderRoot`
     * to create the element `renderRoot` node and captures any pre-set values for
     * registered properties.
     */
    protected initialize(): void;
    /**
     * Returns the node into which the element should render and by default
     * creates and returns an open shadowRoot. Implement to customize where the
     * element's DOM is rendered. For example, to render into the element's
     * childNodes, return `this`.
     * @returns {Element|DocumentFragment} Returns a node into which to render.
     */
    protected createRenderRoot(): Element | ShadowRoot;
    /**
     * Applies styling to the element shadowRoot using the `static get styles`
     * property. Styling will apply using `shadowRoot.adoptedStyleSheets` where
     * available and will fallback otherwise. When Shadow DOM is polyfilled,
     * ShadyCSS scopes styles and adds them to the document. When Shadow DOM
     * is available but `adoptedStyleSheets` is not, styles are appended to the
     * end of the `shadowRoot` to [mimic spec
     * behavior](https://wicg.github.io/construct-stylesheets/#using-constructed-stylesheets).
     */
    protected adoptStyles(): void;
    connectedCallback(): void;
    /**
     * Updates the element. This method reflects property values to attributes
     * and calls `render` to render DOM via lit-html. Setting properties inside
     * this method will *not* trigger another update.
     * * @param _changedProperties Map of changed properties with old values
     */
    protected update(changedProperties: PropertyValues): void;
    /**
     * Invoked on each update to perform rendering tasks. This method must return
     * a lit-html TemplateResult. Setting properties inside this method will *not*
     * trigger the element to update.
     */
    protected render(): TemplateResult | void;
}
//# sourceMappingURL=lit-element.d.ts.map