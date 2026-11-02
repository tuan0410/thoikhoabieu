const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { once } = require('node:events');
const { createApp } = require('../server.cjs');

test('Mobile import uses authenticated account, preserves manual data, and rolls back invalid snapshots', async t => {
  const app = createApp({ dbPath: ':memory:' }); app.listen(0, '127.0.0.1'); await once(app, 'listening');
  t.after(() => new Promise(resolve => app.close(resolve)));
  const base = `http://127.0.0.1:${app.address().port}`;
  const request = (route, method = 'GET', data, cookie, origin = base) => fetch(base + '/api/' + route, { method,
    headers: { 'Content-Type': 'application/json', Origin: origin, 'X-Requested-With': 'LichHoc', ...(cookie ? { Cookie: cookie } : {}) },
    body: data === undefined ? undefined : JSON.stringify(data) });
  const credentials = { name: 'Mobile', email: 'mobile@example.test', password: 'mobile-test-password' };
  const a = await request('auth/register', 'POST', credentials); const cookie = a.headers.get('set-cookie').split(';')[0];
  const b = await request('auth/register', 'POST', { ...credentials, email: 'other@example.test' }); const other = b.headers.get('set-cookie').split(';')[0];
  const snapshot = { schoolId: 'fpt-qn', complete: true, days: ['2026-09-21','2026-09-22','2026-09-23','2026-09-24','2026-09-25','2026-09-26','2026-09-27'], events: [{ day: '2026-09-21', code: 'PRF192', name: 'Programming', start: '07:00', end: '09:00', room: 'A1' }] };
  assert.equal((await request('sync/mobile/import', 'POST', snapshot)).status, 401);
  assert.equal((await request('sync/mobile/import', 'POST', snapshot, cookie, 'https://evil.example')).status, 403);
  assert.equal((await request('sync/mobile/import', 'POST', snapshot, cookie)).status, 200);
  let saved = await (await request('data', 'GET', undefined, cookie)).json();
  saved.data.sessions.push({ id: 'manual', c: saved.data.courses[0].id, d: 1, s: '10:00', e: '11:00', room: '', type: 'Manual' });
  assert.equal((await request('data', 'PUT', saved, cookie)).status, 200);
  assert.equal((await request('sync/mobile/import', 'POST', snapshot, cookie)).status, 200);
  const before = await (await request('data', 'GET', undefined, cookie)).json();
  assert.equal(before.data.sessions.length, 2);
  assert.equal((await request('sync/mobile/import', 'POST', { ...snapshot, events: [{ ...snapshot.events[0], start: 'bad' }] }, cookie)).status, 400);
  assert.deepEqual(await (await request('data', 'GET', undefined, cookie)).json(), before);
  assert.equal((await (await request('data', 'GET', undefined, other)).json()).data.sessions.length, 0);
  assert.equal((await (await request('sync/status', 'GET', undefined, cookie)).json()).lastSync.count, 1);
});

test('Mobile reader returns a preview and discards results when the app account changes', async () => {
  let finish;
  const snapshot = { schoolId: 'fpt-qn', complete: true, events: [] };
  const LH = { state: { user: { id: 'one' }, data: { settings: { start: '2026-09-07', weeks: 15 } } }, notice() {}, esc: String };
  const window = { LH, LHNative: { available: () => true, read: () => new Promise(resolve => { finish = resolve; }) } };
  const context = vm.createContext({ window, Date });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/mobile.js'), 'utf8'), context);
  const pending = LH.mobile.connect({ id: 'fpt-qn' });
  LH.state.user.id = 'two'; finish({ snapshot });
  await assert.rejects(pending, /Tài khoản/);
  assert.doesNotMatch(LH.mobile.view('fpt-qn'), /data-mobile-save/);
});

test('App API uses native transport and preserves HTTP errors; browser transport stays separate', async () => {
  const calls = [], LH = {};
  const window = { LH, LHNative: { request: async (...args) => { calls.push(args); return { status: 401, payload: { error: 'Expired' } }; } } };
  const context = vm.createContext({ window });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/api.js'), 'utf8'), context);
  await assert.rejects(LH.api('data'), error => error.status === 401 && error.message === 'Expired');
  assert.equal(calls[0][0], 'data');
});

test('Generated mobile assets include only public UI and trusted reader code', () => {
  const { bundle, mobile } = require('../scripts/build-mobile.cjs').prepareAssets();
  new vm.Script(bundle);
  assert.match(fs.readFileSync(path.join(mobile, 'www/index.html'), 'utf8'), /js\/native-runtime.js/);
  for (const privateFile of ['server.cjs', 'data', '.env', 'lib']) assert.equal(fs.existsSync(path.join(mobile, 'www', privateFile)), false);
});
