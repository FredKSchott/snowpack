import __SNOWPACK_ENV__ from '/static/__snowpack__/env.js';
import.meta.env = __SNOWPACK_ENV__;

import {flatten} from "/static/web_modules/array-flatten.js";

const {MODE} = import.meta.env;
export function consoleMode() {
  console.log(MODE);
}

export default function doNothing() {
}
