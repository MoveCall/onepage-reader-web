// Minimal zero-dependency HTTPS static server for LAN testing of the simulator.
//
// Why HTTPS: the embedded simulator needs cross-origin isolation (SharedArrayBuffer
// for threaded WASM). Service workers and SAB only work in a "secure context" —
// http://localhost qualifies, but http://<LAN-IP> does NOT, so the simulator can't
// start over plain-HTTP LAN. Serving over HTTPS (even self-signed) makes the LAN IP
// a secure context, and we also set the COOP/COEP headers directly here so isolation
// works without relying on the service worker at all.
//
// Usage:  node serve-https.mjs [port]      (default 4443, binds 0.0.0.0)
// Cert:   .cert/cert.pem + .cert/key.pem   (see README note or regenerate with openssl)

import { createServer } from 'node:https';
import { readFile } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, 'dist');
const PORT = Number(process.argv[2]) || 4443;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.epub': 'application/epub+zip',
};

const [cert, key] = await Promise.all([
  readFile(join(__dirname, '.cert/cert.pem')),
  readFile(join(__dirname, '.cert/key.pem')),
]);

createServer({ cert, key }, (req, res) => {
  // Cross-origin isolation for SharedArrayBuffer + let cross-origin fonts through.
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  let filePath = normalize(join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }
  if (urlPath.endsWith('/') || !extname(filePath)) {
    const idx = join(filePath, 'index.html');
    if (existsSync(idx)) filePath = idx;
  }
  if (!existsSync(filePath)) { res.writeHead(404).end('Not found'); return; }

  res.setHeader('Content-Type', TYPES[extname(filePath)] || 'application/octet-stream');
  createReadStream(filePath).pipe(res);
}).listen(PORT, '0.0.0.0', () => {
  console.log(`HTTPS static server on https://0.0.0.0:${PORT}/  (root: dist/)`);
  console.log(`LAN:   https://192.168.1.203:${PORT}/`);
  console.log(`Local: https://localhost:${PORT}/`);
});
