const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createApp } = require('../server.cjs');
const { mergeUthSchedule } = require('../lib/school-sync.cjs');
const { parse, readDocument } = require('../extension/uth-parser.js');

// Synthetic fixture based on the publicly described UTH week layout, not a live student calendar.
const days = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08'];
function records() {
  return {
    headers: days.map((day, index) => ({ text: (index === 6 ? 'Chủ nhật' : 'Thứ ' + (index + 2)) + '\n' + day.split('-').reverse().join('/'), left: index * 120, width: 120, height: 45 })),
    cards: [{ text: 'Lập trình Python\n123456\nTiết: 1-3\n07:00 - 09:30\nPhòng: A1',
      lines: ['Lập trình Python', '123456', 'Tiết: 1-3', '07:00 - 09:30', 'Phòng: A1'], left: 5, width: 110, height: 130 }]
  };
}
function snapshot() { return parse(records()); }

test('Parser UTH: nhận đúng ngày/giờ/phòng, loại thẻ trùng, từ chối lịch mơ hồ hoặc thiếu', () => {
  const fixture = records();
  fixture.cards.push(fixture.cards[0]);
  const result = parse(fixture);
  assert.equal(result.events.length, 1);
  assert.deepEqual(result.events[0], { name: 'Lập trình Python', code: '123456', room: 'A1', day: '2026-11-02', start: '07:00', end: '09:30' });
  const sunday = records(); sunday.cards[0].left = 725;
  assert.equal(parse(sunday).events[0].day, '2026-11-08');
  const noTime = records(); noTime.cards[0].text = 'Tiết: 1-3 Phòng: A1';
  assert.throws(() => parse(noTime), /giờ bắt đầu/);
  const noDay = records(); noDay.headers.pop();
  assert.throws(() => parse(noDay), /7 cột ngày/);
  const ambiguous = records(); ambiguous.cards[0].left = 65;
  assert.throws(() => parse(ambiguous), /chắc chắn ngày/);
  assert.throws(() => parse({ headers: records().headers, cards: [] }), /Chưa thấy thẻ/);
  const changedWeek = records(); changedWeek.headers[6].text = 'Chủ nhật 15/11/2026';
  assert.throws(() => parse(changedWeek), /cùng một tuần/);
});

test('Bộ thu thập DOM đọc thẻ lá và bỏ phần tử cha chứa nhiều ngày', () => {
  const fixture = records();
  function node(record, descendants = [], leaves = []) {
    return { innerText: record.text, getBoundingClientRect: () => record,
      querySelectorAll: selector => selector === 'div' ? descendants : leaves,
      querySelector: () => null };
  }
  const leaves = fixture.cards[0].lines.map(text => node({ text }));
  const card = node(fixture.cards[0], [], leaves);
  const parent = node({ text: fixture.cards[0].text, left: 0, width: 840, height: 500 }, [card]);
  const doc = { querySelectorAll: selector => selector === 'div' ? [parent, card] : fixture.headers.map(h => node(h)) };
  assert.deepEqual(readDocument(doc), snapshot());
});

test('Merge UTH chỉ thay lịch trong tuần được chọn, giữ lịch nhập tay và không tạo trùng', () => {
  const base = { settings: { school: '' }, courses: [], sessions: [], exams: [], tasks: [] };
  const first = mergeUthSchedule(base, snapshot()).data;
  const second = mergeUthSchedule(first, snapshot()).data;
  assert.equal(second.courses.length, 1);
  assert.equal(second.sessions.length, 1);
  second.sessions.push({ id: 'manual', c: second.courses[0].id, d: 1, s: '13:00', e: '15:00', room: '', type: 'Nhập tay' });
  second.sessions.push({ ...second.sessions[0], id: 'other-week', day: '2026-11-09' });
  const changed = snapshot(); changed.events[0].room = 'Phòng mới'; changed.events[0].start = '08:00';
  const merged = mergeUthSchedule(second, changed).data;
  assert.equal(merged.sessions.length, 3);
  assert.ok(merged.sessions.some(row => row.id === 'manual'));
  assert.ok(merged.sessions.some(row => row.id === 'other-week'));
  assert.equal(merged.sessions.find(row => row.day === days[0]).room, 'Phòng mới');
  assert.throws(() => mergeUthSchedule(base, { ...snapshot(), schoolId: 'other' }), /7 ngày/);
});

test('API đồng bộ: vé một lần, tách tài khoản, cập nhật nguyên tử, hủy vé và thu hồi khi đăng xuất', async t => {
  const server = createApp({ dbPath: ':memory:' });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function api(route, { method = 'GET', cookie, data, ticket, origin = base } = {}) {
    const response = await fetch(base + '/api/' + route, {
      method, headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Requested-With': 'LichHoc',
        ...(cookie ? { Cookie: cookie } : {}), ...(ticket ? { Authorization: 'Bearer ' + ticket } : {}) },
      body: data === undefined ? undefined : JSON.stringify(data)
    });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }
  const register = email => api('auth/register', { method: 'POST', data: { name: 'Người dùng demo', email, password: 'a-test-password' } });
  const user = await register('uth@example.test'), other = await register('other@example.test');
  const catalog = await api('schools', { cookie: user.cookie });
  assert.equal(catalog.body.schools.find(s => s.id === 'uth').calendarUrl, 'https://portal.ut.edu.vn/calendar');
  assert.equal(catalog.body.schools.find(s => s.id === 'other').enabled, false);
  assert.equal((await api('sync/ticket', { method: 'POST', cookie: user.cookie, data: { schoolId: 'other' } })).status, 400);
  async function issue() {
    const response = await api('sync/ticket', { method: 'POST', cookie: user.cookie, data: { schoolId: 'uth' } });
    assert.equal(response.status, 200);
    assert.match(response.body.ticket, /^[a-f0-9]{64}$/);
    assert.ok(response.body.expires <= Date.now() + 10 * 60000);
    return response.body.ticket;
  }
  const extensionOrigin = 'chrome-extension://' + 'a'.repeat(32);
  const upload = (ticket, data = snapshot(), origin = extensionOrigin) => api('sync/uth/import', { method: 'POST', ticket, data, origin });
  let ticket = await issue();
  assert.equal((await upload(ticket, snapshot(), 'https://untrusted.example')).status, 403);
  const invalid = snapshot(); invalid.events[0].start = '26:00';
  assert.equal((await upload(ticket, invalid)).status, 400);
  assert.equal((await api('data', { cookie: user.cookie })).body.data.sessions.length, 0);
  assert.equal((await upload(ticket)).status, 200);
  assert.equal((await upload(ticket)).status, 401);
  let own = await api('data', { cookie: user.cookie });
  assert.equal(own.body.data.sessions.length, 1);
  assert.equal(own.body.data.sessions[0].provider, 'uth');
  assert.equal(own.body.data.sessions[0].day, days[0]);
  assert.equal((await api('data', { cookie: other.cookie })).body.data.sessions.length, 0);
  assert.equal((await api('sync/status', { cookie: other.cookie })).body.lastSync, null);
  assert.equal((await api('sync/status', { cookie: user.cookie })).body.lastSync.count, 1);
  ticket = await issue();
  const concurrent = await Promise.all([upload(ticket), upload(ticket)]);
  assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 401]);
  own = await api('data', { cookie: user.cookie });
  assert.equal(own.body.data.sessions.length, 1);
  // Saving through the ordinary editor must preserve dated/provider metadata.
  assert.equal((await api('data', { method: 'PUT', cookie: user.cookie, data: own.body })).status, 200);
  assert.equal((await api('data', { cookie: user.cookie })).body.data.sessions[0].day, days[0]);
  ticket = await issue();
  await api('sync/ticket', { method: 'DELETE', cookie: user.cookie });
  assert.equal((await upload(ticket)).status, 401);
  ticket = await issue();
  await api('auth/logout', { method: 'POST', cookie: user.cookie, data: {} });
  assert.equal((await upload(ticket)).status, 401);
});
