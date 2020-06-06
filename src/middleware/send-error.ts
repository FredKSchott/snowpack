import http from 'http';

export default function sendError(res: http.ServerResponse, status: number) {
  res.writeHead(status);
  res.end();
}
