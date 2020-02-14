/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
import { MDCComponent } from '@material/base/component';
import { MDCListFoundation } from './foundation';
import { MDCListIndex } from './types';
export declare type MDCListFactory = (el: Element, foundation?: MDCListFoundation) => MDCList;
export declare class MDCList extends MDCComponent<MDCListFoundation> {
    vertical: boolean;
    readonly listElements: Element[];
    wrapFocus: boolean;
    singleSelection: boolean;
    selectedIndex: MDCListIndex;
    static attachTo(root: Element): MDCList;
    private handleKeydown_;
    private handleClick_;
    private focusInEventListener_;
    private focusOutEventListener_;
    initialSyncWithDOM(): void;
    destroy(): void;
    layout(): void;
    /**
     * Initialize selectedIndex value based on pre-selected checkbox list items, single selection or radio.
     */
    initializeListType(): void;
    /**
     * Updates the list item at itemIndex to the desired isEnabled state.
     * @param itemIndex Index of the list item
     * @param isEnabled Sets the list item to enabled or disabled.
     */
    setEnabled(itemIndex: number, isEnabled: boolean): void;
    getDefaultFoundation(): MDCListFoundation;
    /**
     * Used to figure out which list item this event is targetting. Or returns -1 if
     * there is no list item
     */
    private getListItemIndex_;
    /**
     * Used to figure out which element was clicked before sending the event to the foundation.
     */
    private handleFocusInEvent_;
    /**
     * Used to figure out which element was clicked before sending the event to the foundation.
     */
    private handleFocusOutEvent_;
    /**
     * Used to figure out which element was focused when keydown event occurred before sending the event to the
     * foundation.
     */
    private handleKeydownEvent_;
    /**
     * Used to figure out which element was clicked before sending the event to the foundation.
     */
    private handleClickEvent_;
}
