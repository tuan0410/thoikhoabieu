(() => {
  'use strict';
  const fpt = location.hostname === 'fap.fpt.edu.vn';
  const label = fpt ? 'FPT Quy Nhơn' : 'UTH';
  const parser = fpt ? globalThis.LichHocFptParser : globalThis.LichHocUthParser;
  const onCalendar = () => fpt ? /(?:\/WeeklyTimetable(?:\/|$)|\/ScheduleOfWeek\.aspx$)/i.test(location.pathname) : /^\/calendar\/?$/.test(location.pathname);
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
  const header = create('header'); header.appendChild(create('h2', 'Lịch Học · ' + label));
  const toggle = create('button', 'Thu gọn'); toggle.type = 'button'; header.appendChild(toggle);
  const body = create('div', '', 'body');
  body.appendChild(create('p', fpt ? 'Chọn cơ sở FU–Quy Nhơn trên FAP, tự đăng nhập rồi mở Weekly timetable. Kiểm tra đúng lịch cá nhân trước khi gửi.' : 'Mở mục Lịch học trên UTH rồi đọc tuần đang hiển thị. Bạn sẽ xem trước trước khi gửi.'));
  const status = create('p', 'Hãy kết nối ' + label + ' từ web Lịch Học.', 'muted');
  const target = create('p', '', 'muted');
  const actions = create('div', '', 'actions');
  const scan = create('button', 'Đọc lịch tuần'); scan.type = 'button';
  const send = create('button', 'Gửi về Lịch Học', 'primary'); send.type = 'button'; send.disabled = true;
  const preview = create('ul');
  const scope = create('p', '', 'muted');
  const back = create('a', 'Quay lại web Lịch Học'); back.hidden = true; back.target = '_blank'; back.rel = 'noopener noreferrer';
  actions.append(scan, send); body.append(status, target, actions, scope, preview, back);
  panel.append(header, body); shadow.appendChild(panel); document.body.appendChild(host);
  let snapshot = null, connection = null;
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
  scan.addEventListener('click', async event => {
    if (!event.isTrusted) return;
    snapshot = null; send.disabled = true; scan.disabled = true; preview.replaceChildren(); back.hidden = true;
    try {
      if (!onCalendar()) throw new Error('Hãy tự đăng nhập rồi mở ' + (fpt ? 'Weekly timetable / Thời khóa biểu từng tuần trên FAP.' : 'mục Lịch học (/calendar) của UTH.'));
      connection = await ask('CONNECTION');
      snapshot = parser.readDocument(document);
      target.textContent = 'Tài khoản nhận: ' + connection.userName + ' · ' + connection.origin;
      scope.textContent = 'Chỉ cập nhật lịch ' + label + ' từ ' + snapshot.days[0] + ' đến ' + snapshot.days[6] + '. Lịch của trường này đã nhập trong tuần sẽ được thay thế bằng bản xem trước.';
      for (const row of snapshot.events) preview.appendChild(create('li', row.day + ' · ' + row.start + '–' + row.end + '\n' + row.name + (row.room ? ' · ' + row.room : '')));
      message('Đọc được ' + snapshot.events.length + ' buổi. Hãy kiểm tra tên môn, ngày và giờ trước khi gửi.');
      send.disabled = false;
    } catch (error) { message(error.message || 'Không đọc được lịch ' + label + '.', true); }
    finally { scan.disabled = false; }
  });
  send.addEventListener('click', async event => {
    if (!event.isTrusted || !snapshot) return;
    send.disabled = true; scan.disabled = true;
    try {
      const current = parser.readDocument(document);
      if (JSON.stringify(current) !== JSON.stringify(snapshot)) throw new Error('Lịch vừa thay đổi. Hãy bấm Đọc lịch tuần và kiểm tra lại bản xem trước.');
      const result = await ask('IMPORT', snapshot);
      message('Đã gửi ' + result.summary.count + ' buổi về tài khoản Lịch Học.');
      back.href = connection.origin + '/#dong-bo'; back.hidden = false;
      snapshot = null;
    } catch (error) { message(error.message || 'Không kết nối được máy chủ Lịch Học. Hãy kiểm tra máy chủ đang chạy.', true); }
    finally { scan.disabled = false; }
  });
})();
