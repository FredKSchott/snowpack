/** React Refresh: Setup **/
if (import.meta.hot) {
  if (!window.$RefreshReg$ || !window.$RefreshSig$ || !window.$RefreshRuntime$) {
    console.warn(
      '@snowpack/plugin-react-refresh: HTML setup script not run. React Fast Refresh only works when Snowpack serves your HTML routes. You may want to remove this plugin.',
    );
  } else {
    var prevRefreshReg = window.$RefreshReg$;
    var prevRefreshSig = window.$RefreshSig$;
    window.$RefreshReg$ = (type, id) => {
      window.$RefreshRuntime$.register(type, $$REGISTER_ID$$ + ' ' + id);
    };
    window.$RefreshSig$ = window.$RefreshRuntime$.createSignatureFunctionForTransform;
  }
}
