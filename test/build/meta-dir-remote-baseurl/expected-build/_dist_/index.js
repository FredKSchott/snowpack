import __SNOWPACK_ENV__ from 'https://www.cdn.com/sub_path/static/snowpack/env.js';
import.meta.env = __SNOWPACK_ENV__;

import React from 'https://cdn.pika.dev/react@^16.13.1';

if (import.meta.hot) {
  import.meta.hot.accept();
}
