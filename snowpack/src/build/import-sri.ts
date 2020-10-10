import {createHash} from 'crypto';

type SupportedSRIAlgorithm = 'sha512' | 'sha384' | 'sha256';
const DEFAULT_CRYPTO_HASH = 'sha384';
const EMPTY_BUFFER = Buffer.from('');

export const generateSRI = (
  buffer: Buffer = EMPTY_BUFFER,
  hashAlgorithm: SupportedSRIAlgorithm = DEFAULT_CRYPTO_HASH,
) => `${hashAlgorithm}-${createHash(hashAlgorithm).update(buffer).digest('base64')}`;
