import slash from 'slash';
import {parseNpmSpec} from './util/npm';

export async function resolve(spec: string, origin: URL): Promise<URL> {
  const pkgInfo = parseNpmSpec(spec);
  if (pkgInfo) {
    const pkgLoc = require.resolve(pkgInfo.name);
    return new URL(pkgInfo.subpath, `file://${slash(pkgLoc)}/`);
  }
  return new URL(spec, origin);
}
