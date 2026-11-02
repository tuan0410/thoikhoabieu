const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../server.cjs');

test('Tài khoản thật: dữ liệu riêng, kiểm tra dữ liệu, phiên đăng nhập và bảo vệ API', async t => {
  const server = createApp({ dbPath: ':memory:' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(route, { method = 'GET', data, cookie, origin = base, headers = {} } = {}) {
    const response = await fetch(base + route, {
      method, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'LichHoc', Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: data === undefined ? undefined : JSON.stringify(data)
    });
    const type = response.headers.get('content-type');
    return { status: response.status, cookie: response.headers.get('set-cookie')?.split(';')[0],
      payload: type?.includes('json') ? await response.json() : await response.text(), headers: response.headers };
  }
  const creds = { email: 'first@example.test', password: 'a-secure-test-password', name: 'Sinh viên A' };
  let first, second, data;
  await t.test('Đăng ký tài khoản và bắt đầu với lịch trống', async () => {
    first = await request('/api/auth/register', { method: 'POST', data: creds });
    assert.equal(first.status, 200);
    assert.ok(first.cookie.startsWith('lh_session='));
    assert.match(first.headers.get('set-cookie'), /HttpOnly/);
    assert.match(first.headers.get('set-cookie'), /SameSite=Lax/);
    assert.equal(first.payload.user.name, creds.name);
    assert.equal(first.payload.user.password, undefined);
    const current = await request('/api/auth/me', { cookie: first.cookie });
    assert.equal(current.payload.user.id, first.payload.user.id);
    const loaded = await request('/api/data', { cookie: first.cookie });
    data = loaded.payload.data;
    assert.deepEqual(data.courses, []);
    assert.deepEqual(data.sessions, []);
    assert.deepEqual(data.exams, []);
    assert.deepEqual(data.tasks, []);
  });
  await t.test('Tạo đủ môn, buổi học, lịch kiểm tra và bài tập', async () => {
    data.settings = { school: 'Trường của người dùng', name: 'Học kỳ 1', start: '2026-09-07', weeks: 15 };
    data.courses.push({ id: 'c1', name: 'Lập trình', code: 'CS101', teacher: 'Giảng viên', credits: 3, color: 'var(--c3)' });
    data.sessions.push({ id: 's1', c: 'c1', d: 7, s: '18:30', e: '21:00', room: 'A1', type: 'Thực hành' });
    data.exams.push({ id: 'e1', c: 'c1', day: '2026-11-15', time: '08:00', dur: 90, room: 'B1', form: 'Giữa kỳ' });
    data.tasks.push({ id: 't1', c: 'c1', title: 'Bài tập tuần 1', due: '2026-11-10', done: false });
    const saved = await request('/api/data', { method: 'PUT', cookie: first.cookie, data: { data, version: 0 } });
    assert.equal(saved.status, 200);
    assert.equal(saved.payload.version, 1);
    const loaded = await request('/api/data', { cookie: first.cookie });
    assert.deepEqual(loaded.payload.data, data);
  });
  await t.test('Tài khoản khác không đọc được lịch của tài khoản đầu', async () => {
    second = await request('/api/auth/register', { method: 'POST', data: { ...creds, email: 'second@example.test' } });
    assert.equal(second.status, 200);
    const other = await request('/api/data?user_id=' + first.payload.user.id, { cookie: second.cookie });
    assert.equal(other.status, 200);
    assert.deepEqual(other.payload.data.courses, []);
    assert.equal((await request('/api/data')).status, 401);
  });
  await t.test('Sửa dữ liệu, trạng thái bài tập và chặn ghi đè phiên bản cũ', async () => {
    data.tasks[0].done = true;
    data.courses[0].name = 'Lập trình nâng cao';
    assert.equal((await request('/api/data', { method: 'PUT', cookie: first.cookie, data: { data, version: 1 } })).status, 200);
    assert.equal((await request('/api/data', { method: 'PUT', cookie: first.cookie, data: { data, version: 1 } })).status, 409);
    const loaded = await request('/api/data', { cookie: first.cookie });
    assert.equal(loaded.payload.data.tasks[0].done, true);
  });
  await t.test('Máy chủ từ chối dữ liệu sai và quan hệ môn học không hợp lệ', async () => {
    async function rejects(change) {
      const copy = structuredClone(data); change(copy);
      const response = await request('/api/data', { method: 'PUT', cookie: first.cookie, data: { data: copy, version: 2 } });
      assert.equal(response.status, 400, JSON.stringify(response.payload));
    }
    await rejects(copy => copy.settings.start = '2026-09-08');
    await rejects(copy => copy.tasks[0].due = '2026-02-30');
    await rejects(copy => copy.sessions[0].e = '17:00');
    await rejects(copy => copy.exams[0].time = '25:00');
    await rejects(copy => copy.tasks[0].c = 'someone-elses-course');
    await rejects(copy => copy.courses.push(copy.courses[0]));
    assert.equal((await request('/api/data', { method: 'PUT', cookie: first.cookie, data: null })).status, 400);
  });
  await t.test('Từ chối yêu cầu khác nguồn và bảo vệ file riêng tư', async () => {
    assert.equal((await request('/api/data', { method: 'PUT', cookie: first.cookie, origin: 'https://evil.example', data: { data, version: 2 } })).status, 403);
    assert.equal((await request('/api/data', { method: 'PUT', cookie: first.cookie, headers: { 'X-Requested-With': '' }, data: { data, version: 2 } })).status, 403);
    for (const file of ['/server.cjs', '/data/lichhoc.sqlite', '/package.json', '/tests/server.test.cjs', '/.env']) {
      assert.equal((await request(file)).status, 404);
    }
    assert.equal((await request('/')).status, 200);
    assert.equal((await request('/js/auth.js')).status, 200);
  });
  await t.test('Đăng xuất vô hiệu hóa phiên; đăng nhập lại khôi phục lịch', async () => {
    assert.equal((await request('/api/auth/logout', { method: 'POST', cookie: first.cookie, data: {} })).status, 200);
    assert.equal((await request('/api/data', { cookie: first.cookie })).status, 401);
    assert.equal((await request('/api/auth/login', { method: 'POST', data: { ...creds, password: 'wrong-password-value' } })).status, 401);
    const login = await request('/api/auth/login', { method: 'POST', data: creds });
    assert.equal(login.status, 200);
    const loaded = await request('/api/data', { cookie: login.cookie });
    assert.equal(loaded.payload.data.courses[0].name, 'Lập trình nâng cao');
    assert.equal(loaded.payload.data.tasks[0].done, true);
  });
});

test('SQLite giữ lịch và tài khoản sau khi khởi động lại máy chủ', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lichhoc-test-'));
  const dbPath = path.join(dir, 'test.sqlite');
  let server;
  t.after(async () => {
    if (server?.listening) await new Promise(resolve => server.close(resolve));
    for (const file of ['test.sqlite', 'test.sqlite-wal', 'test.sqlite-shm']) {
      const target = path.resolve(dir, file);
      assert.equal(path.dirname(target), dir);
      if (fs.existsSync(target)) fs.unlinkSync(target);
    }
    fs.rmdirSync(dir);
  });
  async function start() {
    server = createApp({ dbPath });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    return `http://127.0.0.1:${server.address().port}`;
  }
  let base = await start();
  const registered = await fetch(base + '/api/auth/register', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'LichHoc', Origin: base },
    body: JSON.stringify({ email: 'persist@example.test', name: 'Kiểm thử', password: 'persistence-password' })
  });
  assert.equal(registered.status, 200);
  const cookie = registered.headers.get('set-cookie').split(';')[0];
  const loaded = await fetch(base + '/api/data', { headers: { Cookie: cookie } });
  const payload = await loaded.json();
  payload.data.settings.school = 'Trường đã lưu';
  assert.equal((await fetch(base + '/api/data', {
    method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'LichHoc', Origin: base, Cookie: cookie }, body: JSON.stringify(payload)
  })).status, 200);
  await new Promise(resolve => server.close(resolve));
  base = await start();
  const restored = await fetch(base + '/api/data', { headers: { Cookie: cookie } });
  assert.equal(restored.status, 200);
  assert.equal((await restored.json()).data.settings.school, 'Trường đã lưu');
});
