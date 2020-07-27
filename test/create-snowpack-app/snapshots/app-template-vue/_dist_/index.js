import __SNOWPACK_ENV__ from '/__snowpack__/env.js';
import.meta.env = __SNOWPACK_ENV__;

import {createApp} from "/web_modules/vue.js";
import App2 from "./App.js";
const app = createApp(App2);
app.mount("#app");
if (import.meta.hot) {
  import.meta.hot.accept();
  import.meta.hot.dispose(() => {
    app.unmount();
  });
}
