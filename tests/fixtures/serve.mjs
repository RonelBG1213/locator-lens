/**
 * Minimal static server for the fixture pages.
 *
 * The fixtures are served over http rather than opened as file:// URLs because
 * same-origin iframes behave differently under file://, and the frame-chain tests
 * depend on realistic frame behaviour.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 5178);

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

createServer(async (req, res) => {
  // Strip the query, then normalise. Compare before normalising: on Windows
  // normalize('/') yields '\\', which would never equal '/'.
  const pathname = decodeURIComponent((req.url ?? '/').split('?')[0]);
  const file = join(dir, normalize(pathname === '/' ? 'kitchen-sink.html' : pathname));

  if (!file.startsWith(dir)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(port, () => console.log(`fixtures on http://localhost:${port}`));
