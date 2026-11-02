const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
function load() {
  const context = vm.createContext({ window: {}, Date, console });
  for (const file of ['data', 'utils', 'state', 'sync', 'schedule', 'components', 'views/overview', 'views/timetable', 'views/courses', 'views/tasks', 'views/exams', 'views/manage', 'views/sync', 'router']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../js', file + '.js'), 'utf8'), context);
  }
  const LH = context.window.LH;
  LH.state.user = { name: '<script>test</script>' };
  LH.applyData({ version: 0, data: {
    settings: { start: '2026-09-07', weeks: 15, name: 'Học kỳ của tôi', school: '' },
    courses: [], sessions: [], exams: [], tasks: []
  } });
  return { LH, context };
}
test('Tài khoản mới không chứa dữ liệu mẫu, các trang hiển thị được lịch trống', () => {
  const { LH } = load();
  const now = new Date(2026, 10, 2);
  assert.equal(LH.COURSES.length, 0);
  for (const view of LH.VIEWS) {
    const html = LH.views[view.id](now);
    assert.ok(html.length);
    assert.ok(!html.includes('NaN'), view.id);
    assert.ok(!html.includes('<script>test</script>'), view.id);
  }
  assert.equal(LH.isView('constructor'), false);
  assert.equal(LH.isView('__proto__'), false);
});
test('Lịch người dùng hỗ trợ chủ nhật, buổi tối, hạn cố định và tiến độ học kỳ', () => {
  const { LH } = load();
  LH.state.data.courses.push({ id: 'c1', name: '<img src=x>', code: '<svg onload=alert(1)>', teacher: 'GV', credits: 3, color: 'var(--c1)' });
  LH.state.data.sessions.push({ id: 's1', c: 'c1', d: 7, s: '18:30', e: '21:00', room: 'A', type: 'Thực hành' });
  LH.state.data.tasks.push({ id: 't1', c: 'c1', title: '<img src=x>', due: '2026-11-03', done: false });
  LH.state.data.exams.push({ id: 'e1', c: 'c1', day: '2026-11-15', time: '07:30', dur: 90, room: 'B', form: 'Giữa kỳ' });
  LH.applyData({ data: LH.state.data, version: 1 });
  assert.equal(LH.todaySessions(new Date(2026, 10, 8, 19)).length, 1);
  assert.equal(LH.todaySessions(new Date(2026, 8, 6, 19)).length, 0);
  assert.equal(LH.sessionsDone('c1', new Date(2026, 8, 6)), 0);
  assert.equal(LH.sessionsDone('c1', new Date(2026, 11, 21)), 15);
  assert.equal(LH.semesterProgress(new Date(2026, 8, 7)), 0);
  assert.equal(LH.semesterProgress(new Date(2026, 11, 21)), 100);
  assert.equal(LH.allTasks(new Date(2026, 10, 2))[0].due.getTime(), LH.allTasks(new Date(2026, 10, 5))[0].due.getTime());
  assert.equal(LH.dueInfo(LH.allTasks()[0], new Date(2026, 10, 5)).n, -2);
  const timetable = LH.views['thoi-khoa-bieu'](new Date(2026, 10, 8));
  assert.match(timetable, /Chủ nhật/);
  assert.match(timetable, /21:00/);
  for (const view of LH.VIEWS) {
    const html = LH.views[view.id](new Date(2026, 10, 8));
    assert.ok(!html.includes('NaN'), view.id);
    assert.ok(!html.includes('<img src=x>'), view.id);
    assert.ok(!html.includes('<svg onload='), view.id);
  }
  assert.match(LH.views['lich-thi'](new Date(2026, 10, 15, 7)), /Hôm nay/);
  assert.match(LH.views['lich-thi'](new Date(2026, 10, 15, 8)), /Đang thi/);
  assert.match(LH.views['lich-thi'](new Date(2026, 10, 15, 9)), /Đã thi/);
});
test('Vẽ lại giao diện giữ bản nháp, chuyển sang sửa mục khác không dùng nhầm bản nháp', () => {
  const { LH, context } = load();
  LH.state.view = 'quan-ly';
  let values = { courseName: { name: 'courseName', value: 'Môn đang nhập' } };
  let draftKey = 'courses-new';
  let switchEditor = false;
  function form() {
    const elements = Object.values(values);
    elements.namedItem = name => values[name];
    return { dataset: { draftKey }, elements };
  }
  const elements = { view: {}, pageTitle: {}, dateChip: {}, semesterName: {}, nav: {}, sideFoot: {} };
  Object.defineProperty(elements.view, 'innerHTML', { set() {
    if (switchEditor) draftKey = 'courses-other';
    values = { courseName: { name: 'courseName', value: switchEditor ? 'Môn cần sửa' : '' } };
  } });
  context.document = { getElementById: id => elements[id], querySelectorAll: () => [form()] };
  LH.render();
  assert.equal(values.courseName.value, 'Môn đang nhập');
  switchEditor = true;
  LH.render();
  assert.equal(values.courseName.value, 'Môn cần sửa');
});

test('Lịch nhập UTH chỉ xuất hiện đúng ngày, thống kê không nhân cả học kỳ và có chọn trường', () => {
  const { LH } = load();
  LH.state.data.courses.push({ id: 'c1', name: 'Môn UTH', code: '123456', teacher: '', credits: 0, color: 'var(--c1)', provider: 'uth' });
  LH.state.data.sessions.push({ id: 'uth1', c: 'c1', d: 1, s: '07:00', e: '09:00', day: '2026-11-02', room: 'A1', type: 'Lịch UTH', provider: 'uth' });
  LH.applyData({ data: LH.state.data, version: 1 });
  assert.equal(LH.todaySessions(new Date(2026, 10, 2)).length, 1);
  assert.equal(LH.todaySessions(new Date(2026, 10, 9)).length, 0);
  assert.equal(LH.sessionsTotal('c1'), 1);
  assert.equal(LH.sessionsDone('c1', new Date(2026, 10, 2, 8)), 0);
  assert.equal(LH.sessionsDone('c1', new Date(2026, 10, 2, 9)), 1);
  assert.equal(LH.weekSessions(new Date(2026, 10, 9)).length, 0);
  LH.schools = [{ id: 'uth', name: 'UTH', portalUrl: 'https://portal.ut.edu.vn/', enabled: true }, { id: 'other', name: 'Trường khác', enabled: false }];
  const html = LH.views['dong-bo']();
  assert.match(html, /value="uth"/);
  assert.match(html, /value="other"/);
  assert.match(html, /https:\/\/portal.ut.edu.vn\//);
  assert.match(html, /Kết nối và mở lịch UTH/);
});

test('Chọn FPT Quy Nhơn hiển thị đúng link FAP và hướng dẫn cơ sở', () => {
  const { LH, context } = load();
  const handlers = {};
  context.document = { addEventListener: (name, fn) => handlers[name] = fn };
  context.window.addEventListener = () => {};
  context.setInterval = () => {};
  LH.render = () => {};
  LH.schools = [
    { id: 'uth', name: 'UTH', portalUrl: 'https://portal.ut.edu.vn/', enabled: true },
    { id: 'fpt-qn', name: 'FPT Quy Nhơn', portalUrl: 'https://fap.fpt.edu.vn/', enabled: true }
  ];
  LH.sync.init();
  handlers.change({ target: { id: 'syncSchool', value: 'fpt-qn' } });
  const html = LH.sync.view();
  assert.match(html, /Kết nối và mở lịch FUQN/);
  assert.match(html, /href="https:\/\/fap.fpt.edu.vn\/"/);
  assert.match(html, /FU–Quy Nhơn/);
  assert.ok(!html.includes('Kết nối và mở lịch UTH'));
  assert.ok(!html.includes('tr??ng'));
});
