## Changelog

### 0.7.1
 * Fix listener cleanup in .destroy() and .removeFolder(). #177

### 0.7.0
 * Changed build system to Rollup, publishing ES6 and UMD modules. #172
 * Added .removeFolder(). #113 #158 
 * Added API documentation. #165
 * Improved touch support. #173

### 0.6.5
 * Add browserify support. #137

### 0.6.4
 * Fixed formatting issue on Windows. #136
 * Fixed issue with color selector getting chopped off at bottom of gui. #136

### 0.6.3
 * Added ability to put close button on top of the menu [ex: var gui = new dat.gui.GUI({closeOnTop:true})]. #106 #122
 * Fixed issue with layout not updating on page resize.
 * Fixed color picker showing in wrong position on user scroll (long menu). #105
 * Fixed checkbox weirdness while listening. #40
 * Fixed bower issues. #125

### 0.6.2
 * Fixed issue with color picker not returning correct values onFinishChange. #116 #117
 * Fixed issue with color picker not showing the correct label for color format. #117
 * Fixed NumberControllerBox onFinishChange event. #112
 * Fixed issue with GUI not being sized correct at start. #111

### 0.6.1
 * Fixed issue with color picker not working on a page that has scrolled. #37
 * Fixed issue with sliders created with min()/max() not remembering their name or to listen. #107

### 0.6.0
 * Ported to ES6
 * Exported using Universal Module Definition (UMD) for max compatibility (Commonjs, Requirejs, AMD, global var)
 * Now using webpack for build
 * Optional external CSS file (dat.gui.css) for use on CSP-enabled servers that block unsafe-inline 
 * Added updateDisplay() to GUI, to update all controls in all folders - https://github.com/dataarts/dat.gui/pull/97
 * Fixed GUI.destroy() to remove all window eventListeners - https://github.com/dataarts/dat.gui/pull/88
 * Fixed performance issue when rotated on tablet/mobile - https://github.com/dataarts/dat.gui/pull/91
 * Fixed issue that prevented user from changing values of controls that are listening - https://github.com/dataarts/dat.gui/issues/100
 * Fixed issues with onFinishChange callbacks on revert - https://github.com/dataarts/dat.gui/pull/103
 * Fixed issues with color selector formatting - https://github.com/dataarts/dat.gui/issues/73
 * Fixed issues with step parameters in sliders - https://github.com/dataarts/dat.gui/issues/74
 * Fixed an issue with colors based on arrays - https://github.com/dataarts/dat.gui/pull/57
 * Fixed factory.js, Step param was not used - https://github.com/dataarts/dat.gui/pull/45
 
### 0.5
 * Moved to requirejs for dependency management.
 * Changed global namespace from *DAT* to *dat* (lowercase).
 * Added support for color controllers. See [Color Controllers](http://workshop.chromeexperiments.com/examples/gui/#4--Color-Controllers).
 * Added support for folders. See [Folders](http://workshop.chromeexperiments.com/examples/gui/#3--Folders).
 * Added support for saving named presets.  See [Presets](http://workshop.chromeexperiments.com/examples/gui/examples/gui/#6--Presets).
 * Removed `height` parameter from GUI constructor. Scrollbar automatically induced when window is too short.
 * `dat.GUI.autoPlace` parameter removed. Use `new dat.GUI( { autoPlace: false } )`. See [Custom Placement](http://workshop.chromeexperiments.com/examples/gui/#9--Custom-Placement).
 * `gui.autoListen` and `gui.listenAll()` removed. See [Updating The Display Manually](http://workshop.chromeexperiments.com/examples/gui/#11--Updating-the-Display-Manually).
 * `dat.GUI.load` removed. See [Saving Values](http://workshop.chromeexperiments.com/examples/gui/#5--Saving-Values).
 * Made Controller code completely agnostic of GUI. Controllers can easily be created independent of a GUI panel.

### 0.4
 * Migrated from GitHub to Google Code.
