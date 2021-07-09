export const HTML = 'text/html';
export const CSS = 'text/css';
export const JS = 'application/javascript';
export const JSON = 'application/json';
export const TRANSFORMED_CONTENT_TYPES = new Map<string, string>([
  ['.astro', JS],
  ['.cjs', JS],
  ['.css', CSS],
  ['.html', HTML],
  ['.js', JS],
  ['.jsx', JS],
  ['.json', JSON],
  ['.mjs', JS],
  ['.sass', CSS],
  ['.scss', CSS],
  ['.svelte', JS],
  ['.ts', JS],
  ['.tsx', JS],
  ['.vue', JS],
]);

const BINARY_TYPES = new Set(['font', 'image', 'model', 'video']);
const STRING_SUBTYPES = new Set(['javascript', 'json', 'xml', 'yaml']);

export function isBinary(contentType: string = ''): boolean {
  // split MIME by the slash
  const [type, subtype] = contentType.split('/');

  // font/*, image/*, etc.: binary for sure
  if (BINARY_TYPES.has(type)) return true;

  // application/* can go either way
  if (type === 'application') {
    const subtypePlus = subtype.split('+')[1] || '';
    // application/javascript, application/atom+xml, etc.: string
    if (STRING_SUBTYPES.has(subtype) || STRING_SUBTYPES.has(subtypePlus)) return false;
    // application/pdf, application/zip, etc.: binary
    return true;
  }

  // everything else (text/*, dotfiles, no extension): string
  return false;
}
