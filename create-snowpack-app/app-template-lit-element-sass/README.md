# New Project

> ✨ Bootstrapped with Create Snowpack App (CSA).

## Available Scripts

### npm start

Runs the app in the development mode.
Open http://localhost:8080 to view it in the browser.

The page will reload if you make edits.
You will also see any lint errors in the console.

### npm run build

Builds the app for production to the `dist/` folder.
It correctly bundles React in production mode and optimizes the build for the best performance.

## Directives

In case you need to add a directive like `classMap` you should add the extension to the import:

```
import { classMap } from "lit-html/directives/class-map.js";
```

## Constructable Style Sheets

In order for the css/sass files to be loaded using import:
```
import styles from "./app-root.scss";
```
and that to resolve to a css result ``` css`...` ``` which can be used in: 
```
@customElement('app-root')
export class AppRoot extends LitElement {
  ...
  static get styles() {
    return [ ... , styles];
  }
  ...
```
you have to specify the correct css module proxy type in ```snowpack.config.js```
```
module.exports = {
  mount: {
    public: '/',
    src: '/_dist_',
  },
  ...
  buildOptions: {
    proxyType: [
      {match: /\.(css|scss|sass)$/, type: "lit-css"}
    ]
  },
  ...
};
```
| Name    |   Type    | Description                                                                     |
| :-----: | :-------: | :-----------------------------------------------------------------------------: |
| `match` | `RegExp`  | Only the ```src``` paths matching the regexp will use the specified proxy type. |
| `type`  | `string`  | Pass `lit-css` to specify using module proxies that exports a css result.       |

### Proxy type in the source code

Alternatively you can override the default behaviour in the source code by specifying the ```type``` as query parameter:
```
import styles from "./app-root.scss?type=lit-css";
```

