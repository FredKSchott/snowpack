/**
 * dat-gui JavaScript Controller Library
 * http://code.google.com/p/dat-gui
 *
 * Copyright 2011 Data Arts Team, Google Creative Lab
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 */

const css = {
  load: function(url, indoc) {
    const doc = indoc || document;
    const link = doc.createElement('link');
    link.type = 'text/css';
    link.rel = 'stylesheet';
    link.href = url;
    doc.getElementsByTagName('head')[0].appendChild(link);
  },

  inject: function(cssContent, indoc) {
    const doc = indoc || document;
    const injected = document.createElement('style');
    injected.type = 'text/css';
    injected.innerHTML = cssContent;
    const head = doc.getElementsByTagName('head')[0];
    try {
      head.appendChild(injected);
    } catch (e) { // Unable to inject CSS, probably because of a Content Security Policy
    }
  }
};

export default css;
