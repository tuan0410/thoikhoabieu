const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { createApp } = require('../server.cjs');

test('Function handler supports parsed bodies, HTTPS cookies, private files and concurrent version checks', async t => {
  const origin = 'https://schedule-information.vercel.app';
  const app = createApp({ dbPath: ':memory:', origin, secure: true });
  const bridge = http.createServer(async (req, res) => {
    if (!['GET', 'HEAD'].includes(req.method)) {
      const chunks = []; for await (const chunk of req) chunks.push(chunk);
      req.body = JSON.parse(Buffer.concat(chunks).toString());
    }
    await app.handler(req, res);
  });
  bridge.listen(0, '127.0.0.1'); await once(bridge, 'listening');
  t.after(async () => { await new Promise(resolve => bridge.close(resolve)); app.emit('close'); });
  const base = `http://127.0.0.1:${bridge.address().port}`;
  const request = (url, method = 'GET', data, cookie) => fetch(base + url, {
    method, headers: { Origin: origin, 'X-Requested-With': 'LichHoc', 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: data === undefined ? undefined : JSON.stringify(data)
  });
  const credentials = { name: 'Vercel', email: 'vercel@example.test', password: 'a-long-password' };
  const registered = await request('/api/auth/register', 'POST', credentials);
  assert.equal(registered.status, 200);
  assert.match(registered.headers.get('set-cookie'), /; Secure/);
  const cookie = registered.headers.get('set-cookie').split(';')[0];
  assert.equal((await request('/api/auth/register', 'POST', credentials)).status, 409);
  const saved = await (await request('/api/data', 'GET', undefined, cookie)).json();
  const writes = await Promise.all([request('/api/data', 'PUT', saved, cookie), request('/api/data', 'PUT', saved, cookie)]);
  assert.deepEqual(writes.map(x => x.status).sort(), [200, 409]);
  for (const file of ['/server.cjs', '/lib/database.cjs', '/.env', '/data/lichhoc.sqlite', '/package.json']) assert.equal((await request(file)).status, 404);
  assert.equal((await request('/')).status, 200);
});
