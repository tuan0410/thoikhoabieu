const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { once } = require('node:events');
const { createApp } = require('../server.cjs');

function worker() {
  const handlers = {}, cached = [], matches = [];
  const context = vm.createContext({ URL,
    self: { location: { origin: 'https://lichhoc.example' }, clients: { claim: async () => {} }, addEventListener: (name, fn) => handlers[name] = fn },
    caches: { open: async () => ({ addAll: async files => cached.push(...files) }),
      keys: async () => [], delete: async () => {}, match: async key => { matches.push(key); return { cached: key }; } },
    fetch: async () => { throw new Error('offline'); }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../sw.js'), 'utf8'), context);
  return { handlers, cached, matches };
}

test('Service worker không chặn hoặc lưu API, POST và nguồn bên ngoài; mất mạng dùng trang thông báo', async () => {
  const { handlers, matches } = worker();
  for (const [url, method] of [
    ['https://lichhoc.example/api/data', 'GET'],
    ['https://lichhoc.example/api/auth/me', 'GET'],
    ['https://lichhoc.example/api/sync/status', 'GET'],
    ['https://lichhoc.example/', 'POST'],
    ['https://other.example/style.css', 'GET']
  ]) {
    handlers.fetch({ request: { url, method, mode: 'cors' }, respondWith: () => assert.fail('Không được can thiệp: ' + url) });
  }
  let response;
  handlers.fetch({ request: { url: 'https://lichhoc.example/', method: 'GET', mode: 'navigate' }, respondWith: promise => response = promise });
  assert.equal((await response).cached, '/offline.html');
  assert.deepEqual(matches, ['/offline.html']);
});

test('Manifest, icon và toàn bộ tài nguyên cài PWA được phục vụ đúng qua máy chủ', async t => {
  const server = createApp({ dbPath: ':memory:' });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const { handlers, cached } = worker();
  let installed;
  handlers.install({ waitUntil: promise => installed = promise });
  await installed;
  assert.ok(cached.length > 20);
  assert.ok(cached.every(file => !file.startsWith('/api/')));
  for (const asset of cached) {
    const response = await fetch(base + asset);
    assert.equal(response.status, 200, asset);
  }
  const manifestResponse = await fetch(base + '/manifest.webmanifest');
  assert.match(manifestResponse.headers.get('content-type'), /application\/manifest\+json/);
  const manifest = await manifestResponse.json();
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) {
    const response = await fetch(base + icon.src);
    assert.match(response.headers.get('content-type'), /image\/png/);
    const png = Buffer.from(await response.arrayBuffer());
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    const [width, height] = icon.sizes.split('x').map(Number);
    assert.equal(png.readUInt32BE(16), width);
    assert.equal(png.readUInt32BE(20), height);
  }
  const html = await (await fetch(base)).text();
  assert.match(html, /rel="manifest"/);
  assert.match(html, /apple-touch-icon/);
  assert.match(html, /js\/pwa\.js/);
});
