import {promises as fs} from 'fs';

interface AttemptLoadFile {
  attemptedFileLoads: string[];
  requestedFile: string;
}

export default function attemptLoadFile({
  attemptedFileLoads,
  requestedFile,
}: AttemptLoadFile): Promise<null | string> {
  if (attemptedFileLoads.includes(requestedFile)) {
    return Promise.resolve(null);
  }
  attemptedFileLoads.push(requestedFile);
  return fs
    .stat(requestedFile)
    .then((stat) => (stat.isFile() ? requestedFile : null))
    .catch(() => null /* ignore */);
}
