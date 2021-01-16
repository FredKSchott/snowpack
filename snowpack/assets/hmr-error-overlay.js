/*
This license applies to parts of this file originating from the
https://github.com/vercel/next.js repository:

The MIT License (MIT)

Copyright (c) 2020 Vercel, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/*
Background: This file was copied from the rendered HTML output of the 
nextjs-error-overlay package / component. The source component was authored 
for React & JSX which we didn't want to add as dependencies, so we grab the
output itself here. 
*/

const ERROR_OVERLAY_TEMPLATE = `
    <style>
          :host {
            all: initial;

            /* the direction property is not reset by 'all' */
            direction: ltr;
          }

          /*!
           * Bootstrap Reboot v4.4.1 (https://getbootstrap.com/)
           * Copyright 2011-2019 The Bootstrap Authors
           * Copyright 2011-2019 Twitter, Inc.
           * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
           * Forked from Normalize.css, licensed MIT (https://github.com/necolas/normalize.css/blob/master/LICENSE.md)
           */
          *,
          *::before,
          *::after {
            box-sizing: border-box;
          }

          :host {
            font-family: sans-serif;
            line-height: 1.15;
            -webkit-text-size-adjust: 100%;
            -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
          }

          article,
          aside,
          figcaption,
          figure,
          footer,
          header,
          hgroup,
          main,
          nav,
          section {
            display: block;
          }

          :host {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
              'Helvetica Neue', Arial, 'Noto Sans', sans-serif,
              'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol',
              'Noto Color Emoji';
            font-size: 1rem;
            font-weight: 400;
            line-height: 1.5;
            color: #212529;
            text-align: left;
            background-color: #fff;
          }

          [tabindex='-1']:focus:not(:focus-visible) {
            outline: 0 !important;
          }

          hr {
            box-sizing: content-box;
            height: 0;
            overflow: visible;
          }

          h1,
          h2,
          h3,
          h4,
          h5,
          h6 {
            margin-top: 0;
            margin-bottom: 0.5rem;
          }

          p {
            margin-top: 0;
            margin-bottom: 1rem;
          }

          abbr[title],
          abbr[data-original-title] {
            text-decoration: underline;
            -webkit-text-decoration: underline dotted;
            text-decoration: underline dotted;
            cursor: help;
            border-bottom: 0;
            -webkit-text-decoration-skip-ink: none;
            text-decoration-skip-ink: none;
          }

          address {
            margin-bottom: 1rem;
            font-style: normal;
            line-height: inherit;
          }

          ol,
          ul,
          dl {
            margin-top: 0;
            margin-bottom: 1rem;
          }

          ol ol,
          ul ul,
          ol ul,
          ul ol {
            margin-bottom: 0;
          }

          dt {
            font-weight: 700;
          }

          dd {
            margin-bottom: 0.5rem;
            margin-left: 0;
          }

          blockquote {
            margin: 0 0 1rem;
          }

          b,
          strong {
            font-weight: bolder;
          }

          small {
            font-size: 80%;
          }

          sub,
          sup {
            position: relative;
            font-size: 75%;
            line-height: 0;
            vertical-align: baseline;
          }

          sub {
            bottom: -0.25em;
          }

          sup {
            top: -0.5em;
          }

          a {
            color: #007bff;
            text-decoration: none;
            background-color: transparent;
          }

          a:hover {
            color: #0056b3;
            text-decoration: underline;
          }

          a:not([href]) {
            color: inherit;
            text-decoration: none;
          }

          a:not([href]):hover {
            color: inherit;
            text-decoration: none;
          }

          pre,
          code,
          kbd,
          samp {
            font-family: SFMono-Regular, Menlo, Monaco, Consolas,
              'Liberation Mono', 'Courier New', monospace;
            font-size: 1em;
          }

          pre {
            margin-top: 0;
            margin-bottom: 1rem;
            overflow: auto;
          }

          figure {
            margin: 0 0 1rem;
          }

          img {
            vertical-align: middle;
            border-style: none;
          }

          svg {
            overflow: hidden;
            vertical-align: middle;
          }

          table {
            border-collapse: collapse;
          }

          caption {
            padding-top: 0.75rem;
            padding-bottom: 0.75rem;
            color: #6c757d;
            text-align: left;
            caption-side: bottom;
          }

          th {
            text-align: inherit;
          }

          label {
            display: inline-block;
            margin-bottom: 0.5rem;
          }

          button {
            border-radius: 0;
          }

          button:focus {
            outline: 1px dotted;
            outline: 5px auto -webkit-focus-ring-color;
          }

          input,
          button,
          select,
          optgroup,
          textarea {
            margin: 0;
            font-family: inherit;
            font-size: inherit;
            line-height: inherit;
          }

          button,
          input {
            overflow: visible;
          }

          button,
          select {
            text-transform: none;
          }

          select {
            word-wrap: normal;
          }

          button,
          [type='button'],
          [type='reset'],
          [type='submit'] {
            -webkit-appearance: button;
          }

          button:not(:disabled),
          [type='button']:not(:disabled),
          [type='reset']:not(:disabled),
          [type='submit']:not(:disabled) {
            cursor: pointer;
          }

          button::-moz-focus-inner,
          [type='button']::-moz-focus-inner,
          [type='reset']::-moz-focus-inner,
          [type='submit']::-moz-focus-inner {
            padding: 0;
            border-style: none;
          }

          input[type='radio'],
          input[type='checkbox'] {
            box-sizing: border-box;
            padding: 0;
          }

          input[type='date'],
          input[type='time'],
          input[type='datetime-local'],
          input[type='month'] {
            -webkit-appearance: listbox;
          }

          textarea {
            overflow: auto;
            resize: vertical;
          }

          fieldset {
            min-width: 0;
            padding: 0;
            margin: 0;
            border: 0;
          }

          legend {
            display: block;
            width: 100%;
            max-width: 100%;
            padding: 0;
            margin-bottom: 0.5rem;
            font-size: 1.5rem;
            line-height: inherit;
            color: inherit;
            white-space: normal;
          }

          progress {
            vertical-align: baseline;
          }

          [type='number']::-webkit-inner-spin-button,
          [type='number']::-webkit-outer-spin-button {
            height: auto;
          }

          [type='search'] {
            outline-offset: -2px;
            -webkit-appearance: none;
          }

          [type='search']::-webkit-search-decoration {
            -webkit-appearance: none;
          }

          ::-webkit-file-upload-button {
            font: inherit;
            -webkit-appearance: button;
          }

          output {
            display: inline-block;
          }

          summary {
            display: list-item;
            cursor: pointer;
          }

          template {
            display: none;
          }

          [hidden] {
            display: none !important;
          }
        </style><style>
          :host {
            --size-gap-half: 0.25rem; /* 4px */
            --size-gap: 0.5rem; /* 8px */
            --size-gap-double: 1rem; /* 16px */
            --size-gap-quad: 2rem; /* 32px */

            --size-font-small: 0.875rem; /* 14px */
            --size-font: 1rem; /* 16px */
            --size-font-big: 1.25rem; /* 20px */
            --size-font-bigger: 1.5rem; /* 24px */

            --color-accents-1: #808080;
            --color-accents-2: #222222;
            --color-accents-3: #404040;

            --font-stack-monospace: 'SFMono-Regular', Consolas,
              'Liberation Mono', Menlo, Courier, monospace;

            --color-ansi-selection: rgba(95, 126, 151, 0.48);
            --color-ansi-bg: #111111;
            --color-ansi-fg: #cccccc;

            --color-ansi-white: #777777;
            --color-ansi-black: #141414;
            --color-ansi-blue: #00aaff;
            --color-ansi-cyan: #88ddff;
            --color-ansi-green: #98ec65;
            --color-ansi-magenta: #aa88ff;
            --color-ansi-red: #ff5555;
            --color-ansi-yellow: #ffcc33;
            --color-ansi-bright-white: #ffffff;
            --color-ansi-bright-black: #777777;
            --color-ansi-bright-blue: #33bbff;
            --color-ansi-bright-cyan: #bbecff;
            --color-ansi-bright-green: #b6f292;
            --color-ansi-bright-magenta: #cebbff;
            --color-ansi-bright-red: #ff8888;
            --color-ansi-bright-yellow: #ffd966;
          }

          .mono {
            font-family: var(--font-stack-monospace);
          }

          h1,
          h2,
          h3,
          h4,
          h5,
          h6 {
            margin-bottom: var(--size-gap);
            font-weight: 500;
            line-height: 1.5;
          }

          h1 {
            font-size: 2.5rem;
          }
          h2 {
            font-size: 2rem;
          }
          h3 {
            font-size: 1.75rem;
          }
          h4 {
            font-size: 1.5rem;
          }
          h5 {
            font-size: 1.25rem;
          }
          h6 {
            font-size: 1rem;
          }
    </style><style>
                
        [data-nextjs-dialog-overlay] {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            overflow: auto;
            z-index: 9000;

            display: flex;
            align-content: center;
            align-items: center;
            flex-direction: column;
            padding: 10vh 15px 0;
        }

        @media (max-height: 812px) {
            [data-nextjs-dialog-overlay] {
            padding: 15px 15px 0;
            }
        }

        [data-nextjs-dialog-backdrop] {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            left: 0;
            background-color: rgba(42, 42, 42, 0.3);
            background: linear-gradient(to bottom, rgba(42, 42, 42, 0.2) 0%,rgba(20, 20, 20, 0.3) 100%);

            pointer-events: all;
            z-index: -1;
        }

        [data-nextjs-dialog-backdrop-fixed] {
            cursor: not-allowed;
            -webkit-backdrop-filter: blur(8px);
            backdrop-filter: blur(8px);
        }

                
        [data-nextjs-toast] {
            position: fixed;
            bottom: var(--size-gap-double);
            left: var(--size-gap-double);
            max-width: 420px;
            z-index: 9000;
        }

        @media (max-width: 440px) {
            [data-nextjs-toast] {
            max-width: 90vw;
            left: 5vw;
            }
        }

        [data-nextjs-toast-wrapper] {
            padding: 1rem;
            border-radius: var(--size-gap-half);
            font-weight: 500;
            color: var(--color-ansi-bright-white);
            background-color: var(--color-ansi-red);
            box-shadow: 0px var(--size-gap-double) var(--size-gap-quad)
            rgba(0, 0, 0, 0.25);
        }

                
        [data-nextjs-dialog] {
            display: flex;
            flex-direction: column;
            width: 100%;
            margin-right: auto;
            margin-left: auto;
            outline: none;
            background: white;
            border-radius: var(--size-gap);
            box-shadow: 0 var(--size-gap-half) var(--size-gap-double)
            rgba(0, 0, 0, 0.25);
            max-height: calc(100% - 3.5rem);
            overflow-y: hidden;
        }

        @media (max-height: 812px) {
            [data-nextjs-dialog-overlay] {
            max-height: calc(100% - 15px);
            }
        }

        @media (min-width: 576px) {
            [data-nextjs-dialog] {
            max-width: 540px;
            box-shadow: 0 var(--size-gap) var(--size-gap-quad) rgba(0, 0, 0, 0.25);
            }
        }

        @media (min-width: 768px) {
            [data-nextjs-dialog] {
            max-width: 720px;
            }
        }

        @media (min-width: 992px) {
            [data-nextjs-dialog] {
            max-width: 960px;
            }
        }

        [data-nextjs-dialog-banner] {
            position: relative;
        }
        [data-nextjs-dialog-banner].banner-warning {
            border-color: var(--color-ansi-yellow);
        }
        [data-nextjs-dialog-banner].banner-error {
            border-color: var(--color-ansi-red);
        }

        [data-nextjs-dialog-banner]::after {
            z-index: 2;
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 100%;
            /* banner width: */
            border-top-width: var(--size-gap-half);
            border-bottom-width: 0;
            border-top-style: solid;
            border-bottom-style: solid;
            border-top-color: inherit;
            border-bottom-color: transparent;
        }

        [data-nextjs-dialog-content] {
            overflow-y: auto;
            border: none;
            margin: 0;
            /* calc(padding + banner width offset) */
            padding: calc(var(--size-gap-double) + var(--size-gap-half))
            var(--size-gap-double);
            height: 100%;
            display: flex;
            flex-direction: column;
        }
        [data-nextjs-dialog-content] > [data-nextjs-dialog-header] {
            flex-shrink: 0;
            margin-bottom: var(--size-gap-double);
        }
        [data-nextjs-dialog-content] > [data-nextjs-dialog-body] {
            position: relative;
            flex: 1 1 auto;
        }

                
        [data-nextjs-dialog-left-right] {
            display: flex;
            flex-direction: row;
            align-content: center;
            align-items: center;
            justify-content: space-between;
        }
        [data-nextjs-dialog-left-right] > nav > button {
            display: inline-flex;
            align-items: center;
            justify-content: center;

            width: calc(var(--size-gap-double) + var(--size-gap));
            height: calc(var(--size-gap-double) + var(--size-gap));
            font-size: 0;
            border: none;
            background-color: rgba(255, 85, 85, 0.1);
            color: var(--color-ansi-red);
            cursor: pointer;
            transition: background-color 0.25s ease;
        }
        [data-nextjs-dialog-left-right] > nav > button > svg {
            width: auto;
            height: calc(var(--size-gap) + var(--size-gap-half));
        }
        [data-nextjs-dialog-left-right] > nav > button:hover {
            background-color: rgba(255, 85, 85, 0.2);
        }
        [data-nextjs-dialog-left-right] > nav > button:disabled {
            background-color: rgba(255, 85, 85, 0.1);
            color: rgba(255, 85, 85, 0.4);
            cursor: not-allowed;
        }

        [data-nextjs-dialog-left-right] > nav > button:first-of-type {
            border-radius: var(--size-gap-half) 0 0 var(--size-gap-half);
            margin-right: 1px;
        }
        [data-nextjs-dialog-left-right] > nav > button:last-of-type {
            border-radius: 0 var(--size-gap-half) var(--size-gap-half) 0;
        }

        [data-nextjs-dialog-left-right] > button:last-of-type {
            border: 0;
            padding: 0;

            background-color: transparent;
            appearance: none;

            opacity: 0.4;
            transition: opacity 0.25s ease;
        }
        [data-nextjs-dialog-left-right] > button:last-of-type:hover {
            opacity: 0.7;
        }

                
        [data-nextjs-codeframe] {
            border-radius: var(--size-gap-half);
            background-color: var(--color-ansi-bg);
            color: var(--color-ansi-fg);
        }
        [data-nextjs-codeframe]::selection,
        [data-nextjs-codeframe] *::selection {
            background-color: var(--color-ansi-selection);
        }
        [data-nextjs-codeframe] * {
            color: inherit;
            background-color: transparent;
            font-family: var(--font-stack-monospace);
            font-size: var(--size-font-small);
        }

        [data-nextjs-codeframe] > * {
            margin: 0;
            padding: calc(var(--size-gap) + var(--size-gap-half))
            calc(var(--size-gap-double) + var(--size-gap-half));
        }
        [data-nextjs-codeframe] > hr {
            margin: 0;
            padding: 0;

            border: none;
            border-style: solid;
            border-width: 0;
            border-bottom-width: 1px;
            border-color: var(--color-ansi-bright-black);
        }

        [data-nextjs-codeframe] > p {
            display: flex;
            align-items: center;
            justify-content: space-between;
            user-select: all;
        }
        [data-nextjs-codeframe] > p:hover {
            background: #FFF2;

        }
        [data-nextjs-codeframe] > p > svg {
            width: auto;
            height: 1em;
            margin-left: 0.5rem;
        }

                
        [data-nextjs-terminal] {
            border-radius: var(--size-gap-half);
            background-color: var(--color-ansi-bg);
            color: var(--color-ansi-fg);
        }
        [data-nextjs-terminal]::selection,
        [data-nextjs-terminal] *::selection {
            background-color: var(--color-ansi-selection);
        }
        [data-nextjs-terminal] * {
            color: inherit;
            background-color: transparent;
            font-family: var(--font-stack-monospace);
        }
        [data-nextjs-terminal] > * {
            margin: 0;
            padding: calc(var(--size-gap) + var(--size-gap-half))
            calc(var(--size-gap-double) + var(--size-gap-half));
        }

        [data-nextjs-terminal] pre {
            white-space: pre-wrap;
            word-break: break-word;
        }


                
        .nextjs-container-build-error-header > h4 {
            line-height: 1.5;
            margin: 0;
            padding: 0;
        }

        .nextjs-container-build-error-body footer {
            margin-top: var(--size-gap);
        }
        .nextjs-container-build-error-body footer p {
            margin: 0;
        }

        .nextjs-container-build-error-body small {
            color: #757575;
        }

                
        .nextjs-container-errors-header > h1 {
            font-size: var(--size-font-big);
            line-height: var(--size-font-bigger);
            font-weight: bold;
            margin: 0;
            margin-top: calc(var(--size-gap-double) + var(--size-gap-half));
        }
        .nextjs-container-errors-header small {
            font-size: var(--size-font-small);
            color: var(--color-accents-1);
            margin-left: var(--size-gap-double);
        }
        .nextjs-container-errors-header small > span {
            font-family: var(--font-stack-monospace);
        }
        .nextjs-container-errors-header > p {
            font-family: var(--font-stack-monospace);
            font-size: var(--size-font-small);
            line-height: var(--size-font-big);
            font-weight: bold;
            margin: 0;
            margin-top: var(--size-gap-half);
            color: var(--color-ansi-red);
            white-space: pre-wrap;
        }
        .nextjs-container-errors-header > div > small {
            margin: 0;
            margin-top: var(--size-gap-half);
        }
        .nextjs-container-errors-header > p > a {
            color: var(--color-ansi-red);
        }

        .nextjs-container-errors-body > h5:not(:first-child) {
            margin-top: calc(var(--size-gap-double) + var(--size-gap));
        }
        .nextjs-container-errors-body > h5 {
            margin-bottom: var(--size-gap);
        }

        .nextjs-toast-errors-parent {
            cursor: pointer;
            transition: transform 0.2s ease;
        }
        .nextjs-toast-errors-parent:hover {
            transform: scale(1.1);
        }
        .nextjs-toast-errors {
            display: flex;
            align-items: center;
            justify-content: flex-start;
        }
        .nextjs-toast-errors > svg {
            margin-right: var(--size-gap);
        }

                
        button[data-nextjs-data-runtime-error-collapsed-action] {
            background: none;
            border: none;
            padding: 0;
            font-size: var(--size-font-small);
            line-height: var(--size-font-bigger);
            color: var(--color-accents-3);
        }

        [data-nextjs-call-stack-frame]:not(:last-child) {
            margin-bottom: var(--size-gap-double);
        }

        [data-nextjs-call-stack-frame] > h6 {
            margin-top: 0;
            margin-bottom: var(--size-gap);
            font-family: var(--font-stack-monospace);
            color: #222;
        }
        [data-nextjs-call-stack-frame] > h6[data-nextjs-frame-expanded='false'] {
            color: #666;
        }
        [data-nextjs-call-stack-frame] > div {
            display: flex;
            align-items: center;
            padding-left: calc(var(--size-gap) + var(--size-gap-half));
            font-size: var(--size-font-small);
            color: #999;
        }
        [data-nextjs-call-stack-frame] > div > svg {
            width: auto;
            height: var(--size-font-small);
            margin-left: var(--size-gap);

            display: none;
        }

        [data-nextjs-call-stack-frame] > div[data-has-source] {
            cursor: pointer;
        }
        [data-nextjs-call-stack-frame] > div[data-has-source]:hover {
            text-decoration: underline dotted;
        }
        [data-nextjs-call-stack-frame] > div[data-has-source] > svg {
            display: unset;
        }

    </style>
    
    <div data-nextjs-dialog-overlay="true"><div data-nextjs-dialog-backdrop="true"></div><div data-nextjs-dialog="true" tabindex="-1" role="dialog" aria-labelledby="nextjs__container_errors_label" aria-describedby="nextjs__container_errors_desc" aria-modal="true"><div data-nextjs-dialog-banner="true" class="banner-error"></div><div data-nextjs-dialog-content="true"><div data-nextjs-dialog-header="true" class="nextjs-container-errors-header"><div data-nextjs-dialog-left-right="true">
    <nav>
        <button type="button" disabled="" aria-disabled="true"><svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.99996 1.16666L1.16663 6.99999L6.99996 12.8333M12.8333 6.99999H1.99996H12.8333Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg></button><button type="button" disabled="" aria-disabled="true"><svg viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.99996 1.16666L12.8333 6.99999L6.99996 12.8333M1.16663 6.99999H12H1.16663Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg></button>
        &nbsp;<small><span>1</span> of <span>1</span> unhandled error</small>
    </nav>
    <button id="close-button" type="button" aria-label="Close"><span aria-hidden="true"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg></span></button></div><h1 id="nextjs__container_errors_label">Error</h1><p id="nextjs__container_errors_desc"></p></div><div data-nextjs-dialog-body="true" class="nextjs-container-errors-body"><h5>Source</h5><div data-nextjs-codeframe="true">
    <p>
        <span id="error-file-loc">Loading...</span>
        <!--<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>-->
    </p>
    <hr><pre>Loading...</pre></div>
    </div></div></div></div>
`;

const template = document.createElement('template');
template.innerHTML = ERROR_OVERLAY_TEMPLATE;

customElements.define('hmr-error-overlay', class HmrErrorOverlay extends HTMLElement {
  constructor({ title, errorMessage, fileLoc, errorStackTrace }) {
    super();
    this.title = title;
    this.errorMessage = errorMessage;
    this.fileLoc = fileLoc;
    this.errorStackTrace = errorStackTrace;
    this.sr = this.attachShadow({ mode: 'open' });
    this.sr.appendChild(template.content.cloneNode(true));
    this.close = this.close.bind(this);
  }

  connectedCallback() {
    this.sr
      .getElementById('close-button')
      .addEventListener('click', this.close);
    this.sr
      .querySelector('[data-nextjs-dialog-backdrop]')
      .addEventListener('click', this.close);

    this.sr.getElementById(
      'nextjs__container_errors_label',
    ).innerText = this.title;
    this.sr.getElementById(
      'nextjs__container_errors_desc',
    ).innerText = this.errorMessage;
    if (this.fileLoc) {
      this.sr.getElementById('error-file-loc').innerText = this.fileLoc;
    } else {
      this.sr.getElementById('error-file-loc').innerText = 'No source file.';
    }
    if (this.errorStackTrace) {
      this.sr.querySelector('pre').innerText = this.errorStackTrace;
    } else {
      this.sr.querySelector('pre').style.display = 'none';
    }
  }

  disconnectedCallback() {
    this.sr
      .getElementById('close-button')
      .removeEventListener('click', this.close);
    this.sr
      .querySelector('[data-nextjs-dialog-backdrop]')
      .removeEventListener('click', this.close);
  }

  close() {
    this.parentNode.removeChild(this);
  }

  _watchEscape(event) {
    if (event.key === 'Escape') {
      this.close();
    }
  }
});