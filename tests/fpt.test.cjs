const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { parse, readDocument } = require('../extension/fpt-parser.js');
const { mergeSchoolSchedule, SCHOOLS } = require('../lib/school-sync.cjs');
const { createApp, emptyData } = require('../server.cjs');
function fixture() {
  return { headers: ['MON 02/11', 'TUE 03/11', 'WED 04/11', 'THU 05/11', 'FRI 06/11', 'SAT 07/11', 'SUN 08/11'], year: 2026,
    rows: [[{ text: 'PRF192-SE1901 at AL-R207 (not yet) (07:00-09:20)' }, ...Array.from({ length: 6 }, () => ({ text: '-' }))]] };
}
test('FPT Quy Nhơn: đọc bảng FAP cũ và giờ dạng h của giao diện mới', () => {
  const old = parse(fixture());
  assert.deepEqual(old.events[0], { code: 'PRF192', name: 'PRF192', room: 'AL-R207', day: '2026-11-02', start: '07:00', end: '09:20' });
  const modern = fixture();
  modern.rows[0][0] = { text: 'PRF192 - SE1901 7h00 – 9h20', title: 'PRF192 - SE1901', room: 'AL-R207' };
  assert.equal(parse(modern).events[0].start, '07:00');
  assert.equal(parse(modern).events[0].room, 'AL-R207');
  assert.equal(old.schoolId, 'fpt-qn');
});
test('FAP từ chối đoán năm/giờ, cột thiếu và ô không nhận diện', () => {
  let data = fixture(); delete data.year;
  assert.throws(() => parse(data), /năm/);
  data = fixture(); data.rows[0][0].text = 'PRF192 Slot 1 at A1';
  assert.throws(() => parse(data), /slot/);
  data = fixture(); data.headers.pop();
  assert.throws(() => parse(data), /7 ngày/);
  data = fixture(); data.rows[0][1] = { text: 'Nội dung không rõ' };
  assert.throws(() => parse(data), /chưa nhận diện/);
  data = fixture(); data.rows[0][0].text = 'PRF192 (07:00-09:20) (09:30-11:00)';
  assert.throws(() => parse(data), /nhiều khoảng giờ/);
});
test('Tuần giao năm FAP chỉ nhập khi có tham chiếu ngày chính xác', () => {
  const data = fixture();
  data.headers = ['MON 28/12', 'TUE 29/12', 'WED 30/12', 'THU 31/12', 'FRI 01/01', 'SAT 02/01', 'SUN 03/01'];
  assert.throws(() => parse(data), /giao năm/);
  data.referenceDate = '2027-01-01';
  assert.equal(parse(data).days[0], '2026-12-28');
  assert.equal(parse(data).days[6], '2027-01-03');
});
test('Thu thập DOM FAP lấy bảng lịch, năm và các ô theo cột', () => {
  const data = fixture();
  const headers = data.headers.map(value => ({ textContent: value }));
  const row = { children: [{ tagName: 'TD', textContent: 'Slot 1' }, ...data.rows[0].map(cell => ({
    tagName: 'TD', textContent: cell.text, innerText: cell.text, querySelectorAll: () => [], querySelector: () => null
  }))] };
  const header = { querySelectorAll: () => headers };
  const table = { querySelectorAll: selector => selector === 'table' ? [] : selector === 'thead tr' ? [header] : [row] };
  const doc = { getElementById: () => null, querySelectorAll: () => [table], querySelector: selector => selector.startsWith('select') ? { value: '2026' } : null };
  assert.deepEqual(readDocument(doc), parse(data));
});
test('Hai nguồn trường không xóa lẫn nhau; FPT nhập lại không tạo trùng', () => {
  const fpt = parse(fixture());
  const uth = { ...fpt, schoolId: 'uth' };
  let data = mergeSchoolSchedule(emptyData(), uth, 'uth').data;
  data = mergeSchoolSchedule(data, fpt, 'fpt-qn').data;
  data = mergeSchoolSchedule(data, fpt, 'fpt-qn').data;
  assert.equal(data.sessions.length, 2);
  assert.equal(data.courses.length, 2);
  assert.ok(data.sessions.some(s => s.provider === 'uth'));
  assert.ok(data.sessions.some(s => s.provider === 'fpt-qn'));
  assert.equal(data.settings.school, 'FPT Quy Nhơn');
});

test('Bảng FAP không có thead vẫn nhận được tiêu đề ngày trong tbody', () => {
  const data = fixture();
  const headers = data.headers.map(value => ({ textContent: value }));
  const header = { querySelectorAll: () => headers, children: [] };
  const cells = [{ tagName: 'TD', textContent: 'Slot 1' }, ...data.rows[0].map(cell => ({
    tagName: 'TD', textContent: cell.text, querySelectorAll: () => [], querySelector: () => null
  }))];
  const row = { children: cells, querySelectorAll: () => cells };
  const table = { querySelectorAll: selector => selector === 'table' || selector === 'thead tr' ? [] : [header, row] };
  const doc = { getElementById: () => null, querySelectorAll: () => [table], querySelector: selector => selector.startsWith('select') ? { value: '2026' } : null };
  assert.deepEqual(readDocument(doc), parse(data));
});
test('API FPT cấp vé đúng trường, chặn vé UTH và lưu metadata FPT qua trình sửa thường', async t => {
  const server = createApp({ dbPath: ':memory:' });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  let cookie;
  async function api(route, method = 'GET', body, ticket) {
    const response = await fetch(base + '/api/' + route, { method,
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'LichHoc',
        Origin: ticket ? 'chrome-extension://' + 'b'.repeat(32) : base,
        ...(cookie ? { Cookie: cookie } : {}), ...(ticket ? { Authorization: 'Bearer ' + ticket } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body) });
    if (response.headers.get('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0];
    return { status: response.status, data: await response.json() };
  }
  await api('auth/register', 'POST', { name: 'Demo FPT', email: 'fpt@example.test', password: 'a-secure-test-pass' });
  assert.ok((await api('schools')).data.schools.find(s => s.id === 'fpt-qn').enabled);
  const uth = (await api('sync/ticket', 'POST', { schoolId: 'uth' })).data.ticket;
  assert.equal((await api('sync/fpt-qn/import', 'POST', parse(fixture()), uth)).status, 403);
  const response = await api('sync/ticket', 'POST', { schoolId: 'fpt-qn' });
  assert.equal(response.data.calendarUrl, 'https://fap.fpt.edu.vn/');
  const ticket = response.data.ticket;
  assert.equal((await api('sync/uth/import', 'POST', { ...parse(fixture()), schoolId: 'uth' }, ticket)).status, 403);
  assert.equal((await api('sync/fpt-qn/import', 'POST', parse(fixture()), ticket)).status, 200);
  assert.equal((await api('sync/fpt-qn/import', 'POST', parse(fixture()), ticket)).status, 401);
  const saved = await api('data');
  assert.equal(saved.data.data.sessions[0].provider, 'fpt-qn');
  assert.equal((await api('data', 'PUT', saved.data)).status, 200);
  assert.equal((await api('data')).data.data.sessions[0].provider, 'fpt-qn');
  assert.equal((await api('sync/status')).data.lastSync.schoolId, 'fpt-qn');
  const batchTicket = (await api('sync/ticket', 'POST', { schoolId: 'fpt-qn' })).data.ticket;
  const first = parse(fixture());
  const second = { ...first, days: first.days.map(day => { const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 7); return d.toISOString().slice(0, 10); }), events: [] };
  const batch = { schoolId: 'fpt-qn', mode: 'semester', complete: true, weeks: [first, second] };
  const invalid = structuredClone(batch); invalid.weeks[1].days[0] = '2026-11-10';
  const before = (await api('data')).data;
  assert.equal((await api('sync/fpt-qn/import', 'POST', invalid, batchTicket)).status, 400);
  assert.deepEqual((await api('data')).data, before);
  const imported = await api('sync/fpt-qn/import', 'POST', batch, batchTicket);
  assert.equal(imported.status, 200);
  assert.equal(imported.data.summary.weeks, 2);
});
