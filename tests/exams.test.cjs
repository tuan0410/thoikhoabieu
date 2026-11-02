const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const parser = require('../extension/fpt-exams.js');
const { mergeSchoolSchedule } = require('../lib/school-sync.cjs');
const { createApp, emptyData } = require('../server.cjs');
const fixture = () => [{ date: '21/11/2026', time: '7h30 - 9h00', course: 'PRF192 - Programming Fundamentals', room: 'AL-R207', type: 'Final', exam: 'FE', form: 'Multiple choices' }];
test('Lịch thi: đọc ngày, giờ, thời lượng, loại thi; chặn ngày/giờ thiếu thay vì đoán', () => {
  const data = parser.parse(fixture());
  assert.equal(data.mode, 'exams');
  assert.equal(data.exams[0].day, '2026-11-21');
  assert.equal(data.exams[0].time, '07:30');
  assert.equal(data.exams[0].dur, 90);
  assert.match(data.exams[0].form, /FE/);
  assert.throws(() => parser.parse([{ ...fixture()[0], time: 'TBA' }]), /Không đoán/);
  assert.throws(() => parser.parse([{ ...fixture()[0], date: '31/02/2026' }]), /ngày thi/);
  const input = fixture(); input.push({ ...input[0], date: '22/11/2026' });
  assert.throws(() => parser.parse(input), /nhiều lịch/);
  assert.equal(parser.parse([{ ...fixture()[0], time: '08:00', duration: '120' }]).exams[0].dur, 120);
});
test('Đọc bảng theo tiêu đề VN hoặc data-label, mẫu chẩn đoán không chứa nội dung cá nhân', () => {
  const makeCell = (value, tagName = 'TD', label = null) => ({ textContent: value, tagName, getAttribute: () => label });
  const header = { children: ['Ngày', 'Thời gian', 'Phòng', 'Môn thi', 'Loại lịch', 'Kỳ thi', 'Hình thức thi'].map(v => makeCell(v, 'TH')) };
  const input = fixture()[0];
  const row = { children: [input.date, input.time, input.room, input.course, input.type, input.exam, input.form].map(v => makeCell(v)) };
  const table = { querySelectorAll: () => [header, row] };
  const doc = { querySelectorAll: () => [table] };
  assert.deepEqual(parser.readDocument(doc), parser.parse(fixture()));
  const json = JSON.stringify(parser.diagnostics(doc));
  assert.ok(!json.includes('PRF192'));
  assert.ok(!json.includes('AL-R207'));
  assert.ok(!json.includes('Programming Fundamentals'));
  assert.match(json, /21\/11\/2026/);
});
test('Nhập lại lịch thi đổi ngày/giờ/phòng cập nhật đúng mục; giữ lịch học và lịch thi nhập tay', () => {
  const first = mergeSchoolSchedule(emptyData(), parser.parse(fixture()), 'fpt-qn').data;
  first.exams.push({ id: 'manual', c: first.courses[0].id, day: '2026-11-20', time: '07:00', dur: 60, room: '', form: 'Nhập tay' });
  first.sessions.push({ id: 'class', c: first.courses[0].id, d: 1, s: '07:00', e: '09:00', room: 'A1', type: 'Lý thuyết' });
  const changed = fixture(); changed[0].date = '23/11/2026'; changed[0].time = '10:00-11:30'; changed[0].room = 'B1';
  const next = mergeSchoolSchedule(first, parser.parse(changed), 'fpt-qn').data;
  assert.equal(next.exams.length, 2);
  assert.equal(next.exams.find(x => x.provider === 'fpt-qn').day, '2026-11-23');
  assert.equal(next.exams.find(x => x.provider === 'fpt-qn').room, 'B1');
  assert.ok(next.exams.some(x => x.id === 'manual'));
  assert.equal(next.sessions.length, 1);
});
test('API lưu lịch thi vào tài khoản, giữ nguồn qua trình sửa và không chấp nhận dữ liệu thiếu', async t => {
  const server = createApp({ dbPath: ':memory:' }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`; let cookie;
  async function api(route, method = 'GET', data, ticket) {
    const response = await fetch(base + '/api/' + route, { method, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'LichHoc',
      Origin: ticket ? 'chrome-extension://' + 'a'.repeat(32) : base, ...(cookie ? { Cookie: cookie } : {}), ...(ticket ? { Authorization: 'Bearer ' + ticket } : {}) }, body: data === undefined ? undefined : JSON.stringify(data) });
    if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    return { status: response.status, data: await response.json() };
  }
  await api('auth/register', 'POST', { name: 'Exam Test', email: 'exams@example.test', password: 'a-test-password' });
  const ticket = (await api('sync/ticket', 'POST', { schoolId: 'fpt-qn' })).data.ticket;
  const payload = parser.parse(fixture());
  const invalid = structuredClone(payload); invalid.exams[0].dur = 0;
  assert.equal((await api('sync/fpt-qn/import', 'POST', invalid, ticket)).status, 400);
  assert.equal((await api('data')).data.data.exams.length, 0);
  const result = await api('sync/fpt-qn/import', 'POST', payload, ticket);
  assert.equal(result.status, 200);
  assert.equal(result.data.summary.mode, 'exams');
  const saved = (await api('data')).data;
  assert.equal(saved.data.exams[0].provider, 'fpt-qn');
  assert.equal((await api('data', 'PUT', saved)).status, 200);
  assert.equal((await api('data')).data.data.exams[0].provider, 'fpt-qn');
});
