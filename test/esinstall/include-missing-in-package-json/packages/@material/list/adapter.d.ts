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
/**
 * Defines the shape of the adapter expected by the foundation.
 * Implement this adapter for your framework of choice to delegate updates to
 * the component in your framework of choice. See architecture documentation
 * for more details.
 * https://github.com/material-components/material-components-web/blob/master/docs/code/architecture.md
 */
export interface MDCListAdapter {
    /**
     * Returns the attribute value of list item at given `index`.
     */
    getAttributeForElementIndex(index: number, attr: string): string | null;
    getListItemCount(): number;
    getFocusedElementIndex(): number;
    setAttributeForElementIndex(index: number, attribute: string, value: string): void;
    addClassForElementIndex(index: number, className: string): void;
    removeClassForElementIndex(index: number, className: string): void;
    /**
     * Focuses list item at the index specified.
     */
    focusItemAtIndex(index: number): void;
    /**
     * Sets the tabindex to the value specified for all button/a element children of
     * the list item at the index specified.
     */
    setTabIndexForListItemChildren(listItemIndex: number, tabIndexValue: string): void;
    /**
     * @return true if radio button is present at given list item index.
     */
    hasRadioAtIndex(index: number): boolean;
    /**
     * @return true if checkbox is present at given list item index.
     */
    hasCheckboxAtIndex(index: number): boolean;
    /**
     * @return true if checkbox inside a list item is checked.
     */
    isCheckboxCheckedAtIndex(index: number): boolean;
    /**
     * @return true if root element is focused.
     */
    isRootFocused(): boolean;
    /**
     * @param index list item index.
     * @param className the name of the class whose presence is to be checked.
     * @return true if list item at `index` has class `className`.
     */
    listItemAtIndexHasClass(index: number, className: string): boolean;
    /**
     * Sets the checked status of checkbox or radio at given list item index.
     */
    setCheckedCheckboxOrRadioAtIndex(index: number, isChecked: boolean): void;
    /**
     * Notifies user action on list item.
     */
    notifyAction(index: number): void;
    /**
     * @return true when the current focused element is inside list root.
     */
    isFocusInsideList(): boolean;
    /**
     * @return the primary text content of the list item at index.
     */
    getPrimaryTextAtIndex(index: number): string;
}
