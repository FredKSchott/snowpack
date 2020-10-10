import {createHash} from 'crypto';
import {readFileSync} from 'fs';

const CRYPTO_HASH = 'sha384';

export const generateSRIForFile = ({
  filePath,
  hashAlgorithm = CRYPTO_HASH,
}: {
  filePath: string;
  hashAlgorithm?: string;
}) => {
  const hash = createHash(hashAlgorithm);
  const input = readFileSync(filePath);

  hash.setEncoding('base64');
  hash.update(input);
  hash.end();

  const digest = hash.digest('base64');
  return `${hashAlgorithm}-${digest}`;
};
