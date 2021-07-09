interface NpmInfo {
  name: string;
  subpath: string;
  namespace?: string;
  isScoped: boolean;
}

/** Given a spec, determine if it’s a valid npm spec or not */
export function parseNpmSpec(spec: string): NpmInfo | undefined {
  if (spec[0] === '.' || spec[0] === '/' || spec.includes('://')) return undefined; // relative spec, or remote spec

  let name = spec.replace(/^npm:/, ''); // remove namespace, if any

  // namespace
  let namespace: string | undefined;
  let namespaceMatch = name.match(/([a-zA-Z]+):(.*)/);
  if (namespaceMatch && namespaceMatch.length === 3) {
    namespace = namespaceMatch[1];
    name = namespaceMatch[2];
  }

  // scope
  let isScoped = false;
  if (name[0] === '@') isScoped = true;

  // subpath
  let parts = name.split('/');
  name = parts.shift() as string;
  if (isScoped) {
    name = parts.shift() as string;
  }
  let subpath = parts.join('/');
  if (subpath) subpath = '/' + subpath;
  if (!subpath) subpath = '.';

  return {
    name,
    namespace,
    isScoped,
    subpath: subpath,
  };
}
