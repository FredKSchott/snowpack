/** React Refresh: Connect **/
if (import.meta.hot) {
  window.$RefreshReg$ = prevRefreshReg;
  window.$RefreshSig$ = prevRefreshSig;
  import.meta.hot.accept(() => {
    window.$RefreshRuntime$.performReactRefresh();
  });
}
