import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { URL } from 'node:url';
import process from 'node:process';

const root = resolve('.output/chrome-mv3');
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, 'http://localhost').pathname,
    );
    const path = resolve(root, `.${pathname}`);
    if (!path.startsWith(`${root}${sep}`))
      throw new Error('Outside build directory');
    const body = await readFile(path);
    response.writeHead(200, {
      'Content-Type': types[extname(path)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "script-src 'self'; object-src 'self'",
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});
server.listen(4174, '127.0.0.1', () =>
  process.stdout.write('Oasis UI fixture: http://127.0.0.1:4174/newtab.html\n'),
);
process.once('SIGTERM', () => server.close(() => process.exit(0)));
process.once('SIGINT', () => server.close(() => process.exit(0)));
