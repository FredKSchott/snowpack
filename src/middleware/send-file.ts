import chalk from 'chalk';
import compressible from 'compressible';
import etag from 'etag';
import http from 'http';
import mime from 'mime-types';
import stream from 'stream';
import zlib from 'zlib';

import {getEncodingType} from '../files';

interface SendFileOptions {
  req: http.IncomingMessage;
  res: http.ServerResponse;
  body: string | Buffer;
  ext: string;
}

export default function sendFile({req, res, body, ext}: SendFileOptions) {
  const ETag = etag(body, {weak: true});
  const headers: Record<string, string> = {
    'Content-Type': mime.contentType(ext) || 'application/octet-stream',
    'Access-Control-Allow-Origin': '*',
    ETag,
    Vary: 'Accept-Encoding',
  };

  if (req.headers['if-none-match'] === ETag) {
    res.writeHead(304, headers);
    res.end();
    return;
  }

  let acceptEncoding = (req.headers['accept-encoding'] as string) || '';
  if (
    req.headers['cache-control']?.includes('no-transform') ||
    ['HEAD', 'OPTIONS'].includes(req.method!) ||
    !compressible(mime.contentType(ext))
  ) {
    acceptEncoding = '';
  }

  function onError(err) {
    if (err) {
      res.end();
      console.error(
        chalk.red(`  ✘ An error occurred while compressing ${chalk.bold(req.url)}`),
        err,
      );
    }
  }

  if (/\bgzip\b/.test(acceptEncoding) && stream.Readable.from) {
    const bodyStream = stream.Readable.from([body]);
    headers['Content-Encoding'] = 'gzip';
    res.writeHead(200, headers);
    stream.pipeline(bodyStream, zlib.createGzip(), res, onError);
    return;
  }

  res.writeHead(200, headers);
  res.write(body, getEncodingType(ext));
  res.end();
}
