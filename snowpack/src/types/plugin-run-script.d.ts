// TODO: remove in 3.0.0
// note(drew): this is required because lerna build doesn’t seem to properly symlink types in snowpack.
declare module '@snowpack/plugin-run-script' {
  function PluginFactory(config: any, options: any): any;
  export default PluginFactory;
}
