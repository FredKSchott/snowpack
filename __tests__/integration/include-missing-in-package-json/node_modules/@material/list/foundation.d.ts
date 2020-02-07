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
import { MDCFoundation } from '@material/base/foundation';
import { MDCListAdapter } from './adapter';
import { MDCListIndex } from './types';
export declare class MDCListFoundation extends MDCFoundation<MDCListAdapter> {
    static readonly strings: {
        ACTION_EVENT: string;
        ARIA_CHECKED: string;
        ARIA_CHECKED_CHECKBOX_SELECTOR: string;
        ARIA_CHECKED_RADIO_SELECTOR: string;
        ARIA_CURRENT: string;
        ARIA_DISABLED: string;
        ARIA_ORIENTATION: string;
        ARIA_ORIENTATION_HORIZONTAL: string;
        ARIA_ROLE_CHECKBOX_SELECTOR: string;
        ARIA_SELECTED: string;
        CHECKBOX_RADIO_SELECTOR: string;
        CHECKBOX_SELECTOR: string;
        CHILD_ELEMENTS_TO_TOGGLE_TABINDEX: string;
        FOCUSABLE_CHILD_ELEMENTS: string;
        RADIO_SELECTOR: string;
    };
    static readonly cssClasses: {
        LIST_ITEM_ACTIVATED_CLASS: string;
        LIST_ITEM_CLASS: string;
        LIST_ITEM_DISABLED_CLASS: string;
        LIST_ITEM_SELECTED_CLASS: string;
        ROOT: string;
    };
    static readonly numbers: {
        UNSET_INDEX: number;
    };
    static readonly defaultAdapter: MDCListAdapter;
    private wrapFocus_;
    private isVertical_;
    private isSingleSelectionList_;
    private selectedIndex_;
    private focusedItemIndex_;
    private useActivatedClass_;
    private ariaCurrentAttrValue_;
    private isCheckboxList_;
    private isRadioList_;
    constructor(adapter?: Partial<MDCListAdapter>);
    layout(): void;
    /**
     * Sets the private wrapFocus_ variable.
     */
    setWrapFocus(value: boolean): void;
    /**
     * Sets the isVertical_ private variable.
     */
    setVerticalOrientation(value: boolean): void;
    /**
     * Sets the isSingleSelectionList_ private variable.
     */
    setSingleSelection(value: boolean): void;
    /**
     * Sets the useActivatedClass_ private variable.
     */
    setUseActivatedClass(useActivated: boolean): void;
    getSelectedIndex(): MDCListIndex;
    setSelectedIndex(index: MDCListIndex): void;
    /**
     * Focus in handler for the list items.
     */
    handleFocusIn(_: FocusEvent, listItemIndex: number): void;
    /**
     * Focus out handler for the list items.
     */
    handleFocusOut(_: FocusEvent, listItemIndex: number): void;
    /**
     * Key handler for the list.
     */
    handleKeydown(evt: KeyboardEvent, isRootListItem: boolean, listItemIndex: number): void;
    /**
     * Click handler for the list.
     */
    handleClick(index: number, toggleCheckbox: boolean): void;
    /**
     * Focuses the next element on the list.
     */
    focusNextElement(index: number): number;
    /**
     * Focuses the previous element on the list.
     */
    focusPrevElement(index: number): number;
    focusFirstElement(): number;
    focusLastElement(): number;
    /**
     * @param itemIndex Index of the list item
     * @param isEnabled Sets the list item to enabled or disabled.
     */
    setEnabled(itemIndex: number, isEnabled: boolean): void;
    /**
     * Ensures that preventDefault is only called if the containing element doesn't
     * consume the event, and it will cause an unintended scroll.
     */
    private preventDefaultEvent_;
    private setSingleSelectionAtIndex_;
    /**
     * Sets aria attribute for single selection at given index.
     */
    private setAriaForSingleSelectionAtIndex_;
    /**
     * Toggles radio at give index. Radio doesn't change the checked state if it is already checked.
     */
    private setRadioAtIndex_;
    private setCheckboxAtIndex_;
    private setTabindexAtIndex_;
    /**
     * @return Return true if it is single selectin list, checkbox list or radio list.
     */
    private isSelectableList_;
    private setTabindexToFirstSelectedItem_;
    private isIndexValid_;
    private isIndexInRange_;
    /**
     * Sets selected index on user action, toggles checkbox / radio based on toggleCheckbox value.
     * User interaction should not toggle list item(s) when disabled.
     */
    private setSelectedIndexOnAction_;
    private toggleCheckboxAtIndex_;
}
export default MDCListFoundation;
