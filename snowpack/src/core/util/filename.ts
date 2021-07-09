import path from 'path';

/** Return very last file extension (note: path.extname() doesn’t work on dotfiles, but this does) */
export function ext(filePath: string): string {
  let basename = path.basename(filePath);
  if (isDotfile(filePath)) return basename;
  return path.extname(basename);
}

/** Return full, nested file extension (e.g. ".module.css") */
export function fullExt(filePath: string): string {
  let basename = path.basename(filePath);
  const dotIndex = basename.indexOf('.');
  return basename.substr(dotIndex);
}

/** Is this a dotfile? */
export function isDotfile(filePath: string): boolean {
  let basename = path.basename(filePath);
  return basename[0] === '.';
}
