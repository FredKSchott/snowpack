import { describe, expect, it } from '@jest/globals'
import type { SnowpackConfig } from '../../types';
import { FileGetter } from './file-getter';

describe('FileGetter#getFileFromUrl', () => {
  describe('no `mount` entries', () => {
    const config = { mount: {} } as SnowpackConfig;
    const fileGetter = new FileGetter(config, async () => null);
    it('returns null for any file request', async () => {
      const f = await fileGetter.getFileFromUrl('b')
      expect(f).toBeNull();
    })
  });

  describe('`attemptLoadFile` returning null', () => {
    const fileGetter = new FileGetter({ mount: {} } as any, async () => null);
    it('returns null for any file request', async () => {
      const f = await fileGetter.getFileFromUrl('b')
      expect(f).toBeNull();
    })
  });

  describe('with a `mount` entry that is also available from `attemptLoadFile`', () => {
    const config = { mount: { foo: { url: '/' } } } as any as SnowpackConfig;
    const fileGetter = new FileGetter(config, async (requested) => requested === 'foo/b' ? 'bar' : null);
    it('returns that file', async () => {
      const f = await fileGetter.getFileFromUrl('b')
      expect(f?.fileLoc).toBe('bar');
    })
  });
});
