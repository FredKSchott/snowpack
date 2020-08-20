import type {InjectManifestResult, GenerateSWResult} from 'workbox-build'

export const pluginName = '@snowpack/plugin-workbox';

type Result = GenerateSWResult | InjectManifestResult
type Unpromisify<T> = T extends Promise<infer U> ? U : T

export const report = (swDest: string) => ({ count, size }: Unpromisify<Result>): void => {
  const prettySize = size //prettyBytes(size);

  console.log(`\nThe service worker file was written to ${swDest}`);
  console.log(`The service worker will precache ${count} URLs, totaling ${prettySize}.\n`);
};
