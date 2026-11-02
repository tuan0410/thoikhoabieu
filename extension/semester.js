(function (root) {
  'use strict';
  function weekStarts(start, end) {
    const date = value => {
      if (!/^20\d{2}-\d{2}-\d{2}$/.test(value || '')) throw new Error('Hãy chọn ngày bắt đầu và kết thúc học kỳ.');
      const parsed = new Date(value + 'T00:00:00Z');
      if (isNaN(parsed) || parsed.toISOString().slice(0, 10) !== value) throw new Error('Ngày không hợp lệ.');
      return parsed;
    };
    const first = date(start), last = date(end);
    if (first.getUTCDay() !== 1 || last.getUTCDay() !== 0 || last < first) throw new Error('Chọn thứ hai đầu kỳ và chủ nhật cuối kỳ.');
    const weeks = [];
    for (const cursor = new Date(first); cursor <= last; cursor.setUTCDate(cursor.getUTCDate() + 7)) {
      weeks.push(cursor.toISOString().slice(0, 10));
      if (weeks.length > 52) throw new Error('Chỉ hỗ trợ tối đa 52 tuần mỗi lần.');
    }
    return weeks;
  }
  function isoWeek(day) {
    const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 3);
    const year = d.getUTCFullYear();
    const number = Math.ceil((((d - new Date(Date.UTC(year, 0, 1))) / 86400000) + 1) / 7);
    return year + '-W' + String(number).padStart(2, '0');
  }
  async function collect(starts, loadWeek, onProgress, signal) {
    const weeks = [];
    for (let i = 0; i < starts.length; i++) {
      if (signal?.aborted) throw new Error('Đã hủy đọc học kỳ. Chưa gửi lịch nào.');
      onProgress?.(i, starts.length, starts[i]);
      let week;
      try { week = await loadWeek(starts[i], signal); }
      catch (error) { throw new Error('Không đọc được tuần ' + starts[i] + ': ' + error.message + ' Chưa gửi lịch nào.'); }
      if (week.schoolId !== 'fpt-qn' || week.complete !== true || week.days?.[0] !== starts[i]) throw new Error('FAP trả về sai tuần ' + starts[i] + '. Đã dừng; chưa gửi lịch nào.');
      weeks.push(week);
    }
    onProgress?.(starts.length, starts.length);
    return { mode: 'semester', schoolId: 'fpt-qn', complete: true, weeks };
  }
  function requestFor(doc, pageUrl, day) {
    const base = new URL(pageUrl);
    if (base.origin !== 'https://fap.fpt.edu.vn') throw new Error('Chỉ đọc lịch từ FAP chính thức.');
    const weekInput = doc.querySelector('input[type="week"]');
    if (weekInput) {
      const path = doc.getElementById('weekly-timetable-container')?.getAttribute('data-fetch-url') || base.pathname;
      const url = new URL(path, base);
      if (url.origin !== base.origin || !/\/WeeklyTimetable(?:\/|$)/i.test(url.pathname)) throw new Error('Đường dẫn lịch tuần chưa được hỗ trợ.');
      url.searchParams.set('week', isoWeek(day));
      return { url: url.href, options: { method: 'GET' } };
    }
    const select = [...doc.querySelectorAll('select')].find(el => /week/i.test(el.name || el.id));
    const option = select && [...select.options].find(el => {
      const m = /\b(\d{1,2})\/(\d{1,2})\b/.exec(el.textContent);
      return m && +m[1] === +day.slice(8) && +m[2] === +day.slice(5, 7);
    });
    const form = select?.closest('form');
    const target = /__doPostBack\(['"]([^'"]+)['"]/.exec(select?.getAttribute('onchange') || '')?.[1];
    if (!form || !option || !target || !select.name) throw new Error('Không tìm được lựa chọn tuần hoặc postback FAP. Cần mẫu trang thực tế để hỗ trợ giao diện này.');
    const url = new URL(form.getAttribute('action') || base.href, base);
    if (url.origin !== base.origin || !/\/ScheduleOfWeek\.aspx$/i.test(url.pathname)) throw new Error('Form không thuộc trang lịch tuần.');
    const body = new URLSearchParams();
    for (const el of form.elements) {
      if (!el.name || el.disabled || ['password', 'file', 'submit', 'button'].includes(el.type) || (['checkbox', 'radio'].includes(el.type) && !el.checked)) continue;
      body.append(el.name, el.value);
    }
    const year = [...doc.querySelectorAll('select')].find(el => /year/i.test(el.name || el.id));
    if (year && Number(year.value) !== +day.slice(0, 4)) throw new Error('Phải chọn đúng năm trên FAP trước khi đọc khoảng này.');
    body.set(select.name, option.value); body.set('__EVENTTARGET', target); body.set('__EVENTARGUMENT', '');
    return { url: url.href, options: { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() } };
  }
  async function readSemester(doc, pageUrl, start, end, onProgress, signal) {
    let current = doc;
    return collect(weekStarts(start, end), async day => {
      const request = requestFor(current, pageUrl, day);
      const response = await fetch(request.url, { ...request.options, credentials: 'same-origin', signal });
      if (!response.ok || new URL(response.url).origin !== 'https://fap.fpt.edu.vn') throw new Error('Phiên FAP hết hạn hoặc không tải được lịch.');
      const html = await response.text();
      const next = new DOMParser().parseFromString(html, 'text/html');
      // Partials may omit the year control; use the requested date as an explicit reference.
      let container = next.getElementById('weekly-timetable-container');
      if (!container) { container = next.createElement('div'); container.id = 'weekly-timetable-container'; next.body.appendChild(container); }
      if (!container.getAttribute('data-reference-date') && !next.querySelector('select[id*="year" i], select[name*="year" i]')) container.setAttribute('data-reference-date', day);
      const week = root.LichHocFptParser.readDocument(next, { allowEmpty: true });
      // The parser validates every displayed date against the requested reference.
      if (next.querySelector('form')) current = next;
      return week;
    }, onProgress, signal);
  }
  const api = { weekStarts, collect, requestFor, readSemester, isoWeek };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LichHocSemester = api;
})(globalThis);
