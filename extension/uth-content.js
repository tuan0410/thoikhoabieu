(() => {
  'use strict';
  const fpt = location.hostname === 'fap.fpt.edu.vn';
  const label = fpt ? 'FPT Quy Nhơn' : 'UTH';
  const parser = fpt ? globalThis.LichHocFptParser : globalThis.LichHocUthParser;
  const onCalendar = () => fpt ? /(?:\/WeeklyTimetable(?:\/|$)|\/ScheduleOfWeek\.aspx$)/i.test(location.pathname) : /^\/calendar\/?$/.test(location.pathname);
  const onExam = () => fpt && /^\/ExamSchedule\/?$/i.test(location.pathname);
  const readSnapshot = () => onExam() ? LichHocFptExams.readDocument(document) : parser.readDocument(document);
  if (document.getElementById('lichhoc-uth-panel')) return;
  const host = document.createElement('div');
  host.id = 'lichhoc-uth-panel';
  host.style.cssText = 'position:fixed;bottom:16px;right:16px;z-index:2147483647;max-width:calc(100vw - 32px)';
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = ':host{all:initial;font:14px/1.5 system-ui,sans-serif;color:#17201d}*{box-sizing:border-box}.panel{width:380px;max-width:calc(100vw - 32px);background:#fff;border:1px solid #cbd4d0;border-radius:16px;box-shadow:0 10px 45px #0003;overflow:hidden}header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#eef2ff}h2{font-size:16px;margin:0}button{font:inherit;cursor:pointer;border:1px solid #bfc8d7;border-radius:8px;background:#fff;padding:8px 12px;color:#17201d}button:disabled{opacity:.5;cursor:wait}.primary{background:#2e49d0;color:#fff;border-color:#2e49d0}.body{padding:16px;max-height:65vh;overflow:auto}p{margin:0 0 12px}.muted{color:#58645f;font-size:12px}.error{color:#b3261e}.actions{display:flex;gap:8px;flex-wrap:wrap}ul{padding:0;list-style:none;margin:12px 0}li{border-top:1px solid #dce1dd;padding:8px 0;font-size:12px}a{color:#2e49d0}[hidden]{display:none!important}';
  shadow.appendChild(style);
  const create = (tag, text, className) => {
    const el = document.createElement(tag); if (text) el.textContent = text; if (className) el.className = className; return el;
  };
  const panel = create('section', '', 'panel');
  const header = create('header'); header.appendChild(create('h2', 'Neon · ' + label));
  const toggle = create('button', 'Thu gọn'); toggle.type = 'button'; header.appendChild(toggle);
  const body = create('div', '', 'body');
  body.appendChild(create('p', onExam() ? 'Đọc lịch thi đang hiển thị rồi kiểm tra bản xem trước. Nếu có nhiều trang hoặc bộ lọc, cần đọc từng phần; không tự xóa lịch cũ.' : fpt ? 'Chọn cơ sở FU–Quy Nhơn trên FAP, tự đăng nhập rồi mở Weekly timetable. Có thể chuyển sang lịch thi bằng liên kết bên dưới.' : 'Mở mục Lịch học trên UTH rồi đọc tuần đang hiển thị. Bạn sẽ xem trước trước khi gửi.'));
  const status = create('p', 'Hãy kết nối ' + label + ' từ web Neon.', 'muted');
  const target = create('p', '', 'muted');
  const actions = create('div', '', 'actions');
  const scan = create('button', onExam() ? 'Đọc lịch thi' : 'Đọc lịch tuần'); scan.type = 'button';
  const semester = create('button', 'Đọc cả học kỳ'); semester.type = 'button';
  semester.hidden = onExam();
  const cancelRead = create('button', 'Hủy đọc'); cancelRead.type = 'button'; cancelRead.hidden = true;
  const range = create('div'); range.hidden = !fpt || onExam();
  const startLabel = create('label', 'Thứ hai đầu kỳ '), startDate = create('input'); startDate.type = 'date'; startLabel.appendChild(startDate);
  const endLabel = create('label', 'Chủ nhật cuối kỳ '), endDate = create('input'); endDate.type = 'date'; endLabel.appendChild(endDate);
  range.append(startLabel, create('br'), endLabel, create('p', 'Chọn khoảng học kỳ rồi bấm Đọc cả học kỳ. Chỉ gửi sau khi tải đủ tất cả tuần.', 'muted'));
  const send = create('button', 'Gửi về Neon', 'primary'); send.type = 'button'; send.disabled = true;
  const preview = create('ul');
  const scope = create('p', '', 'muted');
  const back = create('a', 'Quay lại web Neon'); back.hidden = true; back.target = '_blank'; back.rel = 'noopener noreferrer';
  actions.append(scan); if (fpt) actions.append(semester, cancelRead); actions.append(send);
  body.append(status, target, range, actions, scope, preview, back);
  if (fpt) {
    const examLink = create('a', 'Mở lịch thi FAP'); examLink.href = '/ExamSchedule';
    const calendarLink = create('a', 'Mở lịch học FAP'); calendarLink.href = '/WeeklyTimetable';
    body.append(create('p'), examLink, create('br'), calendarLink);
    const diagnose = create('button', 'Xuất mẫu chẩn đoán lịch thi'); diagnose.type = 'button';
    body.append(create('p'), diagnose);
    diagnose.addEventListener('click', event => {
      if (!event.isTrusted || !onExam()) { message('Hãy mở /ExamSchedule trước khi xuất mẫu.', true); return; }
      const diagnostic = LichHocFptExams.diagnostics(document);
      const url = URL.createObjectURL(new Blob([JSON.stringify(diagnostic, null, 2)], { type: 'application/json' }));
      const link = create('a'); link.href = url; link.download = 'fap-exam-diagnostic.json'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      message('Đã xuất cấu trúc cột/ngày/giờ, không chứa mật khẩu, cookie, token, mã sinh viên hay tên môn. Có thể gửi file hoặc nội dung JSON để chỉnh bộ đọc.');
    });
  }
  panel.append(header, body); shadow.appendChild(panel); document.body.appendChild(host);
  let snapshot = null, connection = null;
  let readController = null;
  function message(value, isError) { status.textContent = value; status.className = isError ? 'error' : 'muted'; }
  async function ask(type, payload) {
    const response = await chrome.runtime.sendMessage({ type, payload });
    if (response?.error) throw new Error(response.error);
    if (!response?.result) throw new Error('Không nhận được phản hồi từ tiện ích. Hãy tải lại trang.');
    return response.result;
  }
  toggle.addEventListener('click', event => {
    if (!event.isTrusted) return;
    body.hidden = !body.hidden; toggle.textContent = body.hidden ? 'Mở' : 'Thu gọn';
  });
  cancelRead.addEventListener('click', event => { if (event.isTrusted) readController?.abort(); });
  semester.addEventListener('click', async event => {
    if (!event.isTrusted || !fpt) return;
    snapshot = null; send.disabled = true; scan.disabled = true; semester.disabled = true;
    cancelRead.hidden = false; preview.replaceChildren(); back.hidden = true;
    readController = new AbortController();
    try {
      if (!onCalendar()) throw new Error('Hãy mở Weekly timetable trên FAP trước.');
      connection = await ask('CONNECTION');
      snapshot = await LichHocSemester.readSemester(document, location.href, startDate.value, endDate.value, (done, total, day) => {
        message('Đang đọc ' + done + '/' + total + ' tuần' + (day ? ' · ' + day : '') + '. Chưa gửi dữ liệu.');
      }, readController.signal);
      const rows = snapshot.weeks.flatMap(week => week.events);
      target.textContent = 'Tài khoản nhận: ' + connection.userName + ' · ' + connection.origin;
      scope.textContent = 'Sẽ cập nhật lịch FPT từ ' + snapshot.weeks[0].days[0] + ' đến ' + snapshot.weeks.at(-1).days[6] + ', gồm ' + snapshot.weeks.length + ' tuần và ' + rows.length + ' buổi. Tuần đã xác nhận trống sẽ xóa lịch FPT cũ trong tuần đó.';
      for (const week of snapshot.weeks) {
        preview.appendChild(create('li', 'Tuần ' + week.days[0] + ': ' + week.events.length + ' buổi'));
        for (const row of week.events) preview.appendChild(create('li', row.day + ' · ' + row.start + '–' + row.end + ' · ' + row.name + ' · ' + row.room));
      }
      message('Đã đọc đủ học kỳ. Kiểm tra bản xem trước rồi bấm Gửi về Neon.');
      send.disabled = false;
    } catch (error) { snapshot = null; message(error.message, true); }
    finally { scan.disabled = false; semester.disabled = false; cancelRead.hidden = true; readController = null; }
  });
  scan.addEventListener('click', async event => {
    if (!event.isTrusted) return;
    snapshot = null; send.disabled = true; scan.disabled = true; semester.disabled = true; preview.replaceChildren(); back.hidden = true;
    try {
      if (!onCalendar() && !onExam()) throw new Error('Hãy tự đăng nhập rồi mở ' + (fpt ? 'Weekly timetable hoặc ExamSchedule trên FAP.' : 'mục Lịch học (/calendar) của UTH.'));
      connection = await ask('CONNECTION');
      snapshot = readSnapshot();
      target.textContent = 'Tài khoản nhận: ' + connection.userName + ' · ' + connection.origin;
      if (snapshot.mode === 'exams') {
        scope.textContent = 'Thêm/cập nhật ' + snapshot.exams.length + ' lịch thi FPT đang hiển thị. Giữ lịch thi nhập tay, lịch học và các lịch thi không có trong bản nhập. Nếu trang có phân trang/bộ lọc, chỉ đọc phần đang hiển thị.';
        for (const row of snapshot.exams) preview.appendChild(create('li', row.code + ' · ' + row.day + ' · ' + row.time + ' · ' + row.dur + ' phút · ' + (row.room || 'Chưa có phòng') + ' · ' + row.form));
        message('Đã đọc lịch thi. Kiểm tra bản xem trước rồi bấm Gửi về Neon.');
        send.disabled = false;
        return;
      }
      scope.textContent = 'Chỉ cập nhật lịch ' + label + ' từ ' + snapshot.days[0] + ' đến ' + snapshot.days[6] + '. Lịch của trường này đã nhập trong tuần sẽ được thay thế bằng bản xem trước.';
      for (const row of snapshot.events) preview.appendChild(create('li', row.day + ' · ' + row.start + '–' + row.end + '\n' + row.name + (row.room ? ' · ' + row.room : '')));
      message('Đọc được ' + snapshot.events.length + ' buổi. Hãy kiểm tra tên môn, ngày và giờ trước khi gửi.');
      send.disabled = false;
    } catch (error) { message(error.message || 'Không đọc được lịch ' + label + '.', true); }
    finally { scan.disabled = false; semester.disabled = false; }
  });
  send.addEventListener('click', async event => {
    if (!event.isTrusted || !snapshot) return;
    send.disabled = true; scan.disabled = true; semester.disabled = true;
    try {
      if (snapshot.mode !== 'semester') {
        const current = readSnapshot();
        if (JSON.stringify(current) !== JSON.stringify(snapshot)) throw new Error('Lịch vừa thay đổi. Hãy bấm Đọc lịch tuần và kiểm tra lại bản xem trước.');
      }
      const result = await ask('IMPORT', snapshot);
      message('Đã gửi ' + result.summary.count + (snapshot.mode === 'exams' ? ' lịch thi' : ' buổi học') + ' về tài khoản Neon.');
      back.href = connection.origin + (snapshot.mode === 'exams' ? '/#lich-thi' : '/#dong-bo'); back.hidden = false;
      snapshot = null;
    } catch (error) { message(error.message || 'Không kết nối được máy chủ Neon. Hãy kiểm tra máy chủ đang chạy.', true); }
    finally { scan.disabled = false; semester.disabled = false; }
  });
})();
