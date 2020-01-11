# dat.GUI API

Details about the classes, methods, and properties provided by dat.GUI. For more
hands-on examples, see the dat.GUI [tutorial](http://workshop.chromeexperiments.com/examples/gui).

<!--- API BEGIN --->

## Classes

<dl>
<dt><a href="#GUI">GUI</a></dt>
<dd><p>A lightweight controller library for JavaScript. It allows you to easily
manipulate variables and fire functions on the fly.</p>
</dd>
<dt><a href="#Controller">Controller</a></dt>
<dd><p>An &quot;abstract&quot; class that represents a given property of an object.</p>
</dd>
<dt><a href="#NumberController">NumberController</a> ⇐ <code>dat.controllers.Controller</code></dt>
<dd><p>Represents a given property of an object that is a number.</p>
</dd>
</dl>

<a name="GUI"></a>

## GUI
A lightweight controller library for JavaScript. It allows you to easily
manipulate variables and fire functions on the fly.

**Kind**: global class  

* [GUI](#GUI)
    * [new GUI([params])](#new_GUI_new)
    * [.domElement](#GUI+domElement) : <code>DOMElement</code>
    * [.parent](#GUI+parent) : <code>dat.gui.GUI</code>
    * [.autoPlace](#GUI+autoPlace) : <code>Boolean</code>
    * [.closeOnTop](#GUI+closeOnTop) : <code>Boolean</code>
    * [.preset](#GUI+preset) : <code>String</code>
    * [.width](#GUI+width) : <code>Number</code>
    * [.name](#GUI+name) : <code>String</code>
    * [.closed](#GUI+closed) : <code>Boolean</code>
    * [.load](#GUI+load) : <code>Object</code>
    * [.useLocalStorage](#GUI+useLocalStorage) : <code>Boolean</code>
    * [.add(object, property, [min], [max], [step])](#GUI+add) ⇒ [<code>Controller</code>](#Controller)
    * [.addColor(object, property)](#GUI+addColor) ⇒ [<code>Controller</code>](#Controller)
    * [.remove(controller)](#GUI+remove)
    * [.destroy()](#GUI+destroy)
    * [.addFolder(name)](#GUI+addFolder) ⇒ <code>dat.gui.GUI</code>
    * [.removeFolder(folder)](#GUI+removeFolder)
    * [.open()](#GUI+open)
    * [.close()](#GUI+close)
    * [.hide()](#GUI+hide)
    * [.show()](#GUI+show)
    * [.getRoot()](#GUI+getRoot) ⇒ <code>dat.gui.GUI</code>
    * [.getSaveObject()](#GUI+getSaveObject) ⇒ <code>Object</code>

<a name="new_GUI_new"></a>

### new GUI([params])

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [params] | <code>Object</code> |  |  |
| [params.name] | <code>String</code> |  | The name of this GUI. |
| [params.load] | <code>Object</code> |  | JSON object representing the saved state of this GUI. |
| [params.parent] | <code>dat.gui.GUI</code> |  | The GUI I'm nested in. |
| [params.autoPlace] | <code>Boolean</code> | <code>true</code> |  |
| [params.hideable] | <code>Boolean</code> | <code>true</code> | If true, GUI is shown/hidden by <kbd>h</kbd> keypress. |
| [params.closed] | <code>Boolean</code> | <code>false</code> | If true, starts closed |
| [params.closeOnTop] | <code>Boolean</code> | <code>false</code> | If true, close/open button shows on top of the GUI |

**Example**  
```js
// Creating a GUI with options.
var gui = new dat.GUI({name: 'My GUI'});
```
**Example**  
```js
// Creating a GUI and a subfolder.
var gui = new dat.GUI();
var folder1 = gui.addFolder('Flow Field');
```
<a name="GUI+domElement"></a>

### gui.domElement : <code>DOMElement</code>
Outermost DOM Element

**Kind**: instance property of [<code>GUI</code>](#GUI)  
<a name="GUI+parent"></a>

### gui.parent : <code>dat.gui.GUI</code>
The parent <code>GUI</code>

**Kind**: instance property of [<code>GUI</code>](#GUI)  
<a name="GUI+autoPlace"></a>

### gui.autoPlace : <code>Boolean</code>
Handles <code>GUI</code>'s element placement for you

**Kind**: instance property of [<code>GUI</code>](#GUI)  
<a name="GUI+closeOnTop"></a>

### gui.closeOnTop : <code>Boolean</code>
Handles <code>GUI</code>'s position of open/close button

**Kind**: instance property of [<code>GUI</code>](#GUI)  
<a name="GUI+preset"></a>

### gui.preset : <code>String</code>
The identifier for a set of saved values

**Kind**: instance property of [<code>GUI</code>](#GUI)  
<a name="GUI+width"></a>

### gui.width : <code>Number</code>
The width of <code>GUI</code> element

**Kind**: instance property of [<code>GUI</code>](#GUI)  
<a name="GUI+name"></a>

### gui.name : <code>String</code>
The name of <code>GUI</code>. Used for folders. i.e
a folder's name

**Kind**: instance property of [<code>GUI</code>](#GUI)  
<a name="GUI+closed"></a>

### gui.closed : <code>Boolean</code>
Whether the <code>GUI</code> is collapsed or not

**Kind**: instance property of [<code>GUI</code>](#GUI)  
<a name="GUI+load"></a>

### gui.load : <code>Object</code>
Contains all presets

**Kind**: instance property of [<code>GUI</code>](#GUI)  
<a name="GUI+useLocalStorage"></a>

### gui.useLocalStorage : <code>Boolean</code>
Determines whether or not to use <a href="https://developer.mozilla.org/en/DOM/Storage#localStorage">localStorage</a> as the means for
<code>remember</code>ing

**Kind**: instance property of [<code>GUI</code>](#GUI)  
<a name="GUI+add"></a>

### gui.add(object, property, [min], [max], [step]) ⇒ [<code>Controller</code>](#Controller)
Adds a new [Controller](#Controller) to the GUI. The type of controller created
is inferred from the initial value of <code>object[property]</code>. For
color properties, see [addColor](addColor).

**Kind**: instance method of [<code>GUI</code>](#GUI)  
**Returns**: [<code>Controller</code>](#Controller) - The controller that was added to the GUI.  

| Param | Type | Description |
| --- | --- | --- |
| object | <code>Object</code> | The object to be manipulated |
| property | <code>String</code> | The name of the property to be manipulated |
| [min] | <code>Number</code> | Minimum allowed value |
| [max] | <code>Number</code> | Maximum allowed value |
| [step] | <code>Number</code> | Increment by which to change value |

**Example**  
```js
// Add a string controller.
var person = {name: 'Sam'};
gui.add(person, 'name');
```
**Example**  
```js
// Add a number controller slider.
var person = {age: 45};
gui.add(person, 'age', 0, 100);
```
<a name="GUI+addColor"></a>

### gui.addColor(object, property) ⇒ [<code>Controller</code>](#Controller)
Adds a new color controller to the GUI.

**Kind**: instance method of [<code>GUI</code>](#GUI)  
**Returns**: [<code>Controller</code>](#Controller) - The controller that was added to the GUI.  

| Param |
| --- |
| object | 
| property | 

**Example**  
```js
var palette = {
  color1: '#FF0000', // CSS string
  color2: [ 0, 128, 255 ], // RGB array
  color3: [ 0, 128, 255, 0.3 ], // RGB with alpha
  color4: { h: 350, s: 0.9, v: 0.3 } // Hue, saturation, value
};
gui.addColor(palette, 'color1');
gui.addColor(palette, 'color2');
gui.addColor(palette, 'color3');
gui.addColor(palette, 'color4');
```
<a name="GUI+remove"></a>

### gui.remove(controller)
Removes the given controller from the GUI.

**Kind**: instance method of [<code>GUI</code>](#GUI)  

| Param | Type |
| --- | --- |
| controller | [<code>Controller</code>](#Controller) | 

<a name="GUI+destroy"></a>

### gui.destroy()
Removes the root GUI from the document and unbinds all event listeners.
For subfolders, use `gui.removeFolder(folder)` instead.

**Kind**: instance method of [<code>GUI</code>](#GUI)  
<a name="GUI+addFolder"></a>

### gui.addFolder(name) ⇒ <code>dat.gui.GUI</code>
Creates a new subfolder GUI instance.

**Kind**: instance method of [<code>GUI</code>](#GUI)  
**Returns**: <code>dat.gui.GUI</code> - The new folder.  
**Throws**:

- <code>Error</code> if this GUI already has a folder by the specified
name


| Param |
| --- |
| name | 

<a name="GUI+removeFolder"></a>

### gui.removeFolder(folder)
Removes a subfolder GUI instance.

**Kind**: instance method of [<code>GUI</code>](#GUI)  

| Param | Type | Description |
| --- | --- | --- |
| folder | <code>dat.gui.GUI</code> | The folder to remove. |

<a name="GUI+open"></a>

### gui.open()
Opens the GUI.

**Kind**: instance method of [<code>GUI</code>](#GUI)  
<a name="GUI+close"></a>

### gui.close()
Closes the GUI.

**Kind**: instance method of [<code>GUI</code>](#GUI)  
<a name="GUI+hide"></a>

### gui.hide()
Hides the GUI.

**Kind**: instance method of [<code>GUI</code>](#GUI)  
<a name="GUI+show"></a>

### gui.show()
Shows the GUI.

**Kind**: instance method of [<code>GUI</code>](#GUI)  
<a name="GUI+getRoot"></a>

### gui.getRoot() ⇒ <code>dat.gui.GUI</code>
**Kind**: instance method of [<code>GUI</code>](#GUI)  
**Returns**: <code>dat.gui.GUI</code> - the topmost parent GUI of a nested GUI.  
<a name="GUI+getSaveObject"></a>

### gui.getSaveObject() ⇒ <code>Object</code>
**Kind**: instance method of [<code>GUI</code>](#GUI)  
**Returns**: <code>Object</code> - a JSON object representing the current state of
this GUI as well as its remembered properties.  
<a name="Controller"></a>

## Controller
An "abstract" class that represents a given property of an object.

**Kind**: global class  

* [Controller](#Controller)
    * [new Controller(object, property)](#new_Controller_new)
    * [.domElement](#Controller+domElement) : <code>DOMElement</code>
    * [.object](#Controller+object) : <code>Object</code>
    * [.property](#Controller+property) : <code>String</code>
    * [.options(options)](#Controller+options) ⇒ [<code>Controller</code>](#Controller)
    * [.name(name)](#Controller+name) ⇒ [<code>Controller</code>](#Controller)
    * [.listen()](#Controller+listen) ⇒ [<code>Controller</code>](#Controller)
    * [.remove()](#Controller+remove) ⇒ [<code>Controller</code>](#Controller)
    * [.onChange(fnc)](#Controller+onChange) ⇒ [<code>Controller</code>](#Controller)
    * [.onFinishChange(fnc)](#Controller+onFinishChange) ⇒ [<code>Controller</code>](#Controller)
    * [.setValue(newValue)](#Controller+setValue)
    * [.getValue()](#Controller+getValue) ⇒ <code>Object</code>
    * [.updateDisplay()](#Controller+updateDisplay) ⇒ [<code>Controller</code>](#Controller)
    * [.isModified()](#Controller+isModified) ⇒ <code>Boolean</code>

<a name="new_Controller_new"></a>

### new Controller(object, property)

| Param | Type | Description |
| --- | --- | --- |
| object | <code>Object</code> | The object to be manipulated |
| property | <code>string</code> | The name of the property to be manipulated |

<a name="Controller+domElement"></a>

### controller.domElement : <code>DOMElement</code>
Those who extend this class will put their DOM elements in here.

**Kind**: instance property of [<code>Controller</code>](#Controller)  
<a name="Controller+object"></a>

### controller.object : <code>Object</code>
The object to manipulate

**Kind**: instance property of [<code>Controller</code>](#Controller)  
<a name="Controller+property"></a>

### controller.property : <code>String</code>
The name of the property to manipulate

**Kind**: instance property of [<code>Controller</code>](#Controller)  
<a name="Controller+options"></a>

### controller.options(options) ⇒ [<code>Controller</code>](#Controller)
**Kind**: instance method of [<code>Controller</code>](#Controller)  

| Param | Type |
| --- | --- |
| options | <code>Array</code> \| <code>Object</code> | 

<a name="Controller+name"></a>

### controller.name(name) ⇒ [<code>Controller</code>](#Controller)
Sets the name of the controller.

**Kind**: instance method of [<code>Controller</code>](#Controller)  

| Param | Type |
| --- | --- |
| name | <code>string</code> | 

<a name="Controller+listen"></a>

### controller.listen() ⇒ [<code>Controller</code>](#Controller)
Sets controller to listen for changes on its underlying object.

**Kind**: instance method of [<code>Controller</code>](#Controller)  
<a name="Controller+remove"></a>

### controller.remove() ⇒ [<code>Controller</code>](#Controller)
Removes the controller from its parent GUI.

**Kind**: instance method of [<code>Controller</code>](#Controller)  
<a name="Controller+onChange"></a>

### controller.onChange(fnc) ⇒ [<code>Controller</code>](#Controller)
Specify that a function fire every time someone changes the value with
this Controller.

**Kind**: instance method of [<code>Controller</code>](#Controller)  
**Returns**: [<code>Controller</code>](#Controller) - this  

| Param | Type | Description |
| --- | --- | --- |
| fnc | <code>function</code> | This function will be called whenever the value is modified via this Controller. |

<a name="Controller+onFinishChange"></a>

### controller.onFinishChange(fnc) ⇒ [<code>Controller</code>](#Controller)
Specify that a function fire every time someone "finishes" changing
the value wih this Controller. Useful for values that change
incrementally like numbers or strings.

**Kind**: instance method of [<code>Controller</code>](#Controller)  
**Returns**: [<code>Controller</code>](#Controller) - this  

| Param | Type | Description |
| --- | --- | --- |
| fnc | <code>function</code> | This function will be called whenever someone "finishes" changing the value via this Controller. |

<a name="Controller+setValue"></a>

### controller.setValue(newValue)
Change the value of <code>object[property]</code>

**Kind**: instance method of [<code>Controller</code>](#Controller)  

| Param | Type | Description |
| --- | --- | --- |
| newValue | <code>Object</code> | The new value of <code>object[property]</code> |

<a name="Controller+getValue"></a>

### controller.getValue() ⇒ <code>Object</code>
Gets the value of <code>object[property]</code>

**Kind**: instance method of [<code>Controller</code>](#Controller)  
**Returns**: <code>Object</code> - The current value of <code>object[property]</code>  
<a name="Controller+updateDisplay"></a>

### controller.updateDisplay() ⇒ [<code>Controller</code>](#Controller)
Refreshes the visual display of a Controller in order to keep sync
with the object's current value.

**Kind**: instance method of [<code>Controller</code>](#Controller)  
**Returns**: [<code>Controller</code>](#Controller) - this  
<a name="Controller+isModified"></a>

### controller.isModified() ⇒ <code>Boolean</code>
**Kind**: instance method of [<code>Controller</code>](#Controller)  
**Returns**: <code>Boolean</code> - true if the value has deviated from initialValue  
<a name="NumberController"></a>

## NumberController ⇐ <code>dat.controllers.Controller</code>
Represents a given property of an object that is a number.

**Kind**: global class  
**Extends**: <code>dat.controllers.Controller</code>  

* [NumberController](#NumberController) ⇐ <code>dat.controllers.Controller</code>
    * [new NumberController(object, property, [params])](#new_NumberController_new)
    * [.min(minValue)](#NumberController+min) ⇒ <code>dat.controllers.NumberController</code>
    * [.max(maxValue)](#NumberController+max) ⇒ <code>dat.controllers.NumberController</code>
    * [.step(stepValue)](#NumberController+step) ⇒ <code>dat.controllers.NumberController</code>

<a name="new_NumberController_new"></a>

### new NumberController(object, property, [params])

| Param | Type | Description |
| --- | --- | --- |
| object | <code>Object</code> | The object to be manipulated |
| property | <code>string</code> | The name of the property to be manipulated |
| [params] | <code>Object</code> | Optional parameters |
| [params.min] | <code>Number</code> | Minimum allowed value |
| [params.max] | <code>Number</code> | Maximum allowed value |
| [params.step] | <code>Number</code> | Increment by which to change value |

<a name="NumberController+min"></a>

### numberController.min(minValue) ⇒ <code>dat.controllers.NumberController</code>
Specify a minimum value for <code>object[property]</code>.

**Kind**: instance method of [<code>NumberController</code>](#NumberController)  
**Returns**: <code>dat.controllers.NumberController</code> - this  

| Param | Type | Description |
| --- | --- | --- |
| minValue | <code>Number</code> | The minimum value for <code>object[property]</code> |

<a name="NumberController+max"></a>

### numberController.max(maxValue) ⇒ <code>dat.controllers.NumberController</code>
Specify a maximum value for <code>object[property]</code>.

**Kind**: instance method of [<code>NumberController</code>](#NumberController)  
**Returns**: <code>dat.controllers.NumberController</code> - this  

| Param | Type | Description |
| --- | --- | --- |
| maxValue | <code>Number</code> | The maximum value for <code>object[property]</code> |

<a name="NumberController+step"></a>

### numberController.step(stepValue) ⇒ <code>dat.controllers.NumberController</code>
Specify a step value that dat.controllers.NumberController
increments by.

**Kind**: instance method of [<code>NumberController</code>](#NumberController)  
**Default**: <code>if minimum and maximum specified increment is 1% of the
difference otherwise stepValue is 1</code>  
**Returns**: <code>dat.controllers.NumberController</code> - this  

| Param | Type | Description |
| --- | --- | --- |
| stepValue | <code>Number</code> | The step value for dat.controllers.NumberController |

<!--- API END --->
