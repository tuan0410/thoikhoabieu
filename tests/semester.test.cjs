const { test } = require('node:test');
const assert = require('node:assert/strict');
const { weekStarts, collect, isoWeek, requestFor } = require('../extension/semester.js');
const { mergeSchoolSchedule } = require('../lib/school-sync.cjs');
const { emptyData } = require('../server.cjs');
const { parse } = require('../extension/fpt-parser.js');
function week(start, empty = false) {
  const date = new Date(start + 'T00:00:00Z');
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(date); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); });
  return { schoolId: 'fpt-qn', complete: true, days, events: empty ? [] : [{ day: start, name: 'PRF192', code: 'PRF192', room: 'A1', start: '07:00', end: '09:00' }] };
}
test('Khoảng học kỳ đúng tuần, kể cả giao năm, có giới hạn số tuần', () => {
  assert.deepEqual(weekStarts('2026-12-28', '2027-01-10'), ['2026-12-28', '2027-01-04']);
  assert.equal(isoWeek('2026-12-28'), '2026-W53');
  assert.equal(isoWeek('2027-01-04'), '2027-W01');
  assert.throws(() => weekStarts('2026-11-03', '2026-11-08'), /thứ hai/);
  assert.throws(() => weekStarts('2026-01-05', '2027-12-26'), /52 tuần/);
});
test('Đọc đủ tuần rồi mới trả học kỳ; không nhận dữ liệu tuần lặp/sai hoặc lỗi một phần', async () => {
  const starts = ['2026-11-02', '2026-11-09'];
  const result = await collect(starts, async day => week(day));
  assert.equal(result.weeks.length, 2);
  await assert.rejects(() => collect(starts, async () => week(starts[0])), /sai tuần/);
  await assert.rejects(() => collect(starts, async day => { if (day === starts[1]) throw new Error('hết phiên'); return week(day); }), /Chưa gửi lịch nào/);
  const control = new AbortController(); control.abort();
  await assert.rejects(() => collect(starts, async day => week(day), null, control.signal), /hủy/);
});
test('Học kỳ giữ lịch tay/UTH, xử lý tuần trống và không sửa dữ liệu gốc nếu có lỗi', () => {
  const snapshot = { mode: 'semester', schoolId: 'fpt-qn', complete: true, weeks: [week('2026-11-02'), week('2026-11-09')] };
  const current = mergeSchoolSchedule(emptyData(), snapshot, 'fpt-qn').data;
  current.sessions.push({ id: 'manual', c: current.courses[0].id, d: 1, s: '13:00', e: '14:00', type: 'Nhập tay', room: '' });
  const update = { ...snapshot, weeks: [week('2026-11-02'), week('2026-11-09', true)] };
  const changed = mergeSchoolSchedule(current, update, 'fpt-qn');
  assert.equal(changed.summary.weeks, 2);
  assert.equal(changed.summary.count, 1);
  assert.equal(changed.data.sessions.length, 2);
  assert.equal(current.sessions.length, 3);
  const invalid = { ...snapshot, weeks: [week('2026-11-02'), week('2026-11-16')] };
  assert.throws(() => mergeSchoolSchedule(current, invalid, 'fpt-qn'), /tuần thiếu/);
  assert.equal(current.sessions.length, 3);
});
test('Chỉ chấp nhận tuần trống khi có các hàng slot và đã đọc đủ ngày', () => {
  const data = { headers: week('2026-11-02').days.map(d => d.split('-').reverse().join('/')), rows: [Array.from({ length: 7 }, () => ({ text: '-' }))] };
  assert.equal(parse(data, { allowEmpty: true }).events.length, 0);
  assert.throws(() => parse({ ...data, rows: [] }, { allowEmpty: true }), /Không xác nhận/);
});
test('URL lịch hiện đại chỉ gọi FAP và chọn tuần yêu cầu', () => {
  const doc = { querySelector: () => ({ value: '2026-W45' }), getElementById: () => null };
  const request = requestFor(doc, 'https://fap.fpt.edu.vn/WeeklyTimetable', '2026-11-09');
  assert.equal(new URL(request.url).searchParams.get('week'), '2026-W46');
  assert.equal(new URL(request.url).pathname, '/WeeklyTimetable/WeekPartial');
  assert.equal(new URL(request.url).searchParams.get('referenceDate'), '2026-11-09');
  assert.equal(request.options.headers['X-Requested-With'], 'XMLHttpRequest');
  assert.throws(() => requestFor(doc, 'https://evil.example/WeeklyTimetable', '2026-11-09'), /FAP chính thức/);
});

test('FAP cũ gửi postback đổi tuần đúng form và bỏ trường mật khẩu/file', () => {
  const form = { getAttribute: () => '/Report/ScheduleOfWeek.aspx', elements: [
    { name: '__VIEWSTATE', value: 'view-state', type: 'hidden' },
    { name: 'password', value: 'never-send', type: 'password' },
    { name: 'file', value: 'never-send', type: 'file' }
  ] };
  const select = { name: 'ctl00$Main$drpSelectWeek', options: [{ textContent: '09/11 To 15/11', value: '46' }], closest: () => form,
    getAttribute: () => "__doPostBack('ctl00$Main$drpSelectWeek','')" };
  const year = { name: 'ddlYear', value: '2026' };
  const doc = { querySelector: () => null, querySelectorAll: () => [select, year] };
  const request = requestFor(doc, 'https://fap.fpt.edu.vn/Report/ScheduleOfWeek.aspx', '2026-11-09');
  const body = new URLSearchParams(request.options.body);
  assert.equal(request.options.method, 'POST');
  assert.equal(body.get(select.name), '46');
  assert.equal(body.get('__EVENTTARGET'), select.name);
  assert.equal(body.has('password'), false);
  assert.equal(body.has('file'), false);
});


test('Semester accepts unassigned weeks without a timetable and continues to later weeks', async () => {
  const { readDocument } = require('../extension/fpt-parser.js');
  const blankDoc = content => ({ body: { textContent: content }, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null });
  const empty = readDocument(blankDoc('No activities for this week'), { allowEmpty: true, requestedWeek: '2026-09-21', trustedPartial: true });
  assert.equal(empty.events.length, 0);
  assert.deepEqual(empty.days, week('2026-09-21').days);
  assert.equal(readDocument(blankDoc(''), { allowEmpty: true, requestedWeek: '2026-09-21', trustedPartial: true }).events.length, 0);
  const snapshot = await collect(['2026-09-14', '2026-09-21', '2026-09-28'], async day => day === '2026-09-21' ? empty : week(day));
  const merged = mergeSchoolSchedule(emptyData(), snapshot, 'fpt-qn');
  assert.equal(snapshot.weeks.length, 3);
  assert.equal(merged.summary.count, 2);
});

test('Missing tables do not silently accept expired sessions, error pages or unrecognized classes', () => {
  const { readDocument } = require('../extension/fpt-parser.js');
  const doc = (content, password = false) => ({ body: { textContent: content }, querySelector: selector => password && selector.includes('password') ? {} : null, querySelectorAll: () => [], getElementById: () => null });
  const options = { allowEmpty: true, requestedWeek: '2026-09-21', trustedPartial: true };
  for (const content of ['Sign in', 'Internal Server Error', 'No activities PRF192', 'Unknown markup']) assert.throws(() => readDocument(doc(content), options));
  assert.throws(() => readDocument(doc('No activities', true), options));
  assert.throws(() => readDocument(doc('No activities'), { allowEmpty: true }));
  assert.throws(() => readDocument(doc(''), { ...options, trustedPartial: false }));
});
