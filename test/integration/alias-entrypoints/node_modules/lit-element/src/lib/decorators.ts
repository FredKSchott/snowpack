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

import {LitElement} from '../lit-element.js';

import {PropertyDeclaration, UpdatingElement} from './updating-element.js';

export type Constructor<T> = {
  new (...args: unknown[]): T
};

// From the TC39 Decorators proposal
interface ClassDescriptor {
  kind: 'class';
  elements: ClassElement[];
  finisher?: <T>(clazz: Constructor<T>) => undefined | Constructor<T>;
}

// From the TC39 Decorators proposal
interface ClassElement {
  kind: 'field'|'method';
  key: PropertyKey;
  placement: 'static'|'prototype'|'own';
  initializer?: Function;
  extras?: ClassElement[];
  finisher?: <T>(clazz: Constructor<T>) => undefined | Constructor<T>;
  descriptor?: PropertyDescriptor;
}

const legacyCustomElement =
    (tagName: string, clazz: Constructor<HTMLElement>) => {
      window.customElements.define(tagName, clazz);
      // Cast as any because TS doesn't recognize the return type as being a
      // subtype of the decorated class when clazz is typed as
      // `Constructor<HTMLElement>` for some reason.
      // `Constructor<HTMLElement>` is helpful to make sure the decorator is
      // applied to elements however.
      // tslint:disable-next-line:no-any
      return clazz as any;
    };

const standardCustomElement =
    (tagName: string, descriptor: ClassDescriptor) => {
      const {kind, elements} = descriptor;
      return {
        kind,
        elements,
        // This callback is called once the class is otherwise fully defined
        finisher(clazz: Constructor<HTMLElement>) {
          window.customElements.define(tagName, clazz);
        }
      };
    };

/**
 * Class decorator factory that defines the decorated class as a custom element.
 *
 * @param tagName the name of the custom element to define
 */
export const customElement = (tagName: string) =>
    (classOrDescriptor: Constructor<HTMLElement>|ClassDescriptor) =>
        (typeof classOrDescriptor === 'function') ?
    legacyCustomElement(tagName, classOrDescriptor) :
    standardCustomElement(tagName, classOrDescriptor);

const standardProperty =
    (options: PropertyDeclaration, element: ClassElement) => {
      // When decorating an accessor, pass it through and add property metadata.
      // Note, the `hasOwnProperty` check in `createProperty` ensures we don't
      // stomp over the user's accessor.
      if (element.kind === 'method' && element.descriptor &&
          !('value' in element.descriptor)) {
        return {
          ...element,
          finisher(clazz: typeof UpdatingElement) {
            clazz.createProperty(element.key, options);
          }
        };
      } else {
        // createProperty() takes care of defining the property, but we still
        // must return some kind of descriptor, so return a descriptor for an
        // unused prototype field. The finisher calls createProperty().
        return {
          kind: 'field',
          key: Symbol(),
          placement: 'own',
          descriptor: {},
          // When @babel/plugin-proposal-decorators implements initializers,
          // do this instead of the initializer below. See:
          // https://github.com/babel/babel/issues/9260 extras: [
          //   {
          //     kind: 'initializer',
          //     placement: 'own',
          //     initializer: descriptor.initializer,
          //   }
          // ],
          initializer(this: {[key: string]: unknown}) {
            if (typeof element.initializer === 'function') {
              this[element.key as string] = element.initializer.call(this);
            }
          },
          finisher(clazz: typeof UpdatingElement) {
            clazz.createProperty(element.key, options);
          }
        };
      }
    };

const legacyProperty =
    (options: PropertyDeclaration, proto: Object, name: PropertyKey) => {
      (proto.constructor as typeof UpdatingElement)
          .createProperty(name, options);
    };

/**
 * A property decorator which creates a LitElement property which reflects a
 * corresponding attribute value. A `PropertyDeclaration` may optionally be
 * supplied to configure property features.
 *
 * @ExportDecoratedItems
 */
export function property(options?: PropertyDeclaration) {
  // tslint:disable-next-line:no-any decorator
  return (protoOrDescriptor: Object|ClassElement, name?: PropertyKey): any =>
             (name !== undefined) ?
      legacyProperty(options!, protoOrDescriptor as Object, name) :
      standardProperty(options!, protoOrDescriptor as ClassElement);
}

/**
 * A property decorator that converts a class property into a getter that
 * executes a querySelector on the element's renderRoot.
 *
 * @ExportDecoratedItems
 */
export function query(selector: string) {
  return (protoOrDescriptor: Object|ClassElement,
          // tslint:disable-next-line:no-any decorator
          name?: PropertyKey): any => {
    const descriptor = {
      get(this: LitElement) {
        return this.renderRoot.querySelector(selector);
      },
      enumerable: true,
      configurable: true,
    };
    return (name !== undefined) ?
        legacyQuery(descriptor, protoOrDescriptor as Object, name) :
        standardQuery(descriptor, protoOrDescriptor as ClassElement);
  };
}

/**
 * A property decorator that converts a class property into a getter
 * that executes a querySelectorAll on the element's renderRoot.
 *
 * @ExportDecoratedItems
 */
export function queryAll(selector: string) {
  return (protoOrDescriptor: Object|ClassElement,
          // tslint:disable-next-line:no-any decorator
          name?: PropertyKey): any => {
    const descriptor = {
      get(this: LitElement) {
        return this.renderRoot.querySelectorAll(selector);
      },
      enumerable: true,
      configurable: true,
    };
    return (name !== undefined) ?
        legacyQuery(descriptor, protoOrDescriptor as Object, name) :
        standardQuery(descriptor, protoOrDescriptor as ClassElement);
  };
}

const legacyQuery =
    (descriptor: PropertyDescriptor, proto: Object, name: PropertyKey) => {
      Object.defineProperty(proto, name, descriptor);
    };

const standardQuery = (descriptor: PropertyDescriptor, element: ClassElement) =>
    ({
      kind: 'method',
      placement: 'prototype',
      key: element.key,
      descriptor,
    });

const standardEventOptions =
    (options: AddEventListenerOptions, element: ClassElement) => {
      return {
        ...element,
        finisher(clazz: typeof UpdatingElement) {
          Object.assign(
              clazz.prototype[element.key as keyof UpdatingElement], options);
        }
      };
    };

const legacyEventOptions =
    // tslint:disable-next-line:no-any legacy decorator
    (options: AddEventListenerOptions, proto: any, name: PropertyKey) => {
      Object.assign(proto[name], options);
    };

/**
 * Adds event listener options to a method used as an event listener in a
 * lit-html template.
 *
 * @param options An object that specifis event listener options as accepted by
 * `EventTarget#addEventListener` and `EventTarget#removeEventListener`.
 *
 * Current browsers support the `capture`, `passive`, and `once` options. See:
 * https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Parameters
 *
 * @example
 *
 *     class MyElement {
 *
 *       clicked = false;
 *
 *       render() {
 *         return html`<div @click=${this._onClick}`><button></button></div>`;
 *       }
 *
 *       @eventOptions({capture: true})
 *       _onClick(e) {
 *         this.clicked = true;
 *       }
 *     }
 */
export const eventOptions = (options: AddEventListenerOptions) =>
    // Return value typed as any to prevent TypeScript from complaining that
    // standard decorator function signature does not match TypeScript decorator
    // signature
    // TODO(kschaaf): unclear why it was only failing on this decorator and not
    // the others
    ((protoOrDescriptor: Object|ClassElement, name?: string) =>
         (name !== undefined) ?
         legacyEventOptions(options, protoOrDescriptor as Object, name) :
         standardEventOptions(options, protoOrDescriptor as ClassElement)) as
        // tslint:disable-next-line:no-any decorator
        any;
