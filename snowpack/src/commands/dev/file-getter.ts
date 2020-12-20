import * as path from 'path';
import type { SnowpackConfig } from '../../types';
import { getInputsFromOutput } from '../../build/build-pipeline';

export interface FoundFile {
  fileLoc: string;
  isStatic: boolean;
  isResolve: boolean;
}

export class FileGetter {
  constructor(
    private readonly config: SnowpackConfig,
    private readonly attemptLoadFile: (requestedFile: string) => Promise<null | string>,
  ) { }

  async getFileFromUrl(reqPath: string): Promise<FoundFile | null> {
    for (const [mountKey, mountEntry] of Object.entries(this.config.mount)) {
      let requestedFile: string;
      if (mountEntry.url === '/') {
        requestedFile = path.join(mountKey, reqPath);
      } else if (reqPath.startsWith(mountEntry.url)) {
        requestedFile = path.join(mountKey, reqPath.replace(mountEntry.url, './'));
      } else {
        continue;
      }
      const fileLocExact = await this.attemptLoadFile(requestedFile);
      if (fileLocExact) {
        return {
          fileLoc: fileLocExact,
          isStatic: mountEntry.static,
          isResolve: mountEntry.resolve,
        };
      }
      if (!mountEntry.static) {
        for (const potentialSourceFile of getInputsFromOutput(requestedFile, this.config.plugins)) {
          const fileLoc = await this.attemptLoadFile(potentialSourceFile);
          if (fileLoc) {
            return { fileLoc, isStatic: mountEntry.static, isResolve: mountEntry.resolve };
          }
        }
      }
    }
    return null;
  }
}
