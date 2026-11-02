/* FAP weekly tables: read displayed dates/times; never infer a slot timetable. */
(function (root) {
  'use strict';
  const text = value => String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const fail = message => { throw new Error(message); };
  function iso(year, month, day) {
    const value = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const date = new Date(value + 'T00:00:00Z');
    return !isNaN(date) && date.toISOString().slice(0, 10) === value ? value : null;
  }
  function dates(headers, year, referenceDate) {
    if (headers.length !== 7) fail('FAP chưa hiển thị đủ 7 ngày của tuần.');
    const parts = headers.map(header => {
      const match = /\b(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}))?\b/.exec(header);
      if (!match) fail('Không đọc được ngày trên cột lịch FAP.');
      return { d: +match[1], m: +match[2], y: match[3] ? +match[3] : null };
    });
    const anchor = /^20\d{2}-\d{2}-\d{2}$/.test(referenceDate || '') ? referenceDate : null;
    if (!parts.every(p => p.y) && !anchor && !(Number.isInteger(year) && year >= 2000 && year <= 2099)) fail('Chưa xác định được năm của lịch. Hãy chọn năm trên FAP rồi đọc lại.');
    if (!anchor && !parts.every(p => p.y) && parts.some((p, i) => i && p.m < parts[i - 1].m)) fail('Tuần giao năm cần ngày tham chiếu hoặc ngày đầy đủ năm; không đoán năm lịch.');
    const first = parts[0];
    const baseYear = first.y || (anchor ? +anchor.slice(0, 4) : year);
    const candidates = (first.y || !anchor) ? [baseYear] : [baseYear - 1, baseYear, baseYear + 1];
    const valid = [];
    for (const candidate of candidates) {
      const start = iso(candidate, first.m, first.d);
      if (!start || new Date(start + 'T00:00:00Z').getUTCDay() !== 1) continue;
      const days = [];
      let matches = true;
      parts.forEach((part, index) => {
        const date = new Date(start + 'T00:00:00Z'); date.setUTCDate(date.getUTCDate() + index);
        if (date.getUTCMonth() + 1 !== part.m || date.getUTCDate() !== part.d || (part.y && date.getUTCFullYear() !== part.y)) matches = false;
        days.push(date.toISOString().slice(0, 10));
      });
      if (matches && (!anchor || (anchor >= days[0] && anchor <= days[6]))) valid.push(days);
    }
    if (valid.length !== 1) fail('Không xác định chắc chắn tuần và năm của lịch FAP.');
    return valid[0];
  }
  function parse(records, options = {}) {
    const days = dates(records.headers, records.year, records.referenceDate);
    const events = [], seen = new Set();
    for (const row of records.rows) {
      if (!Array.isArray(row) || row.length !== 7) fail('Hàng lịch FAP không đủ 7 cột ngày.');
      row.forEach((cell, index) => {
        const value = text(cell.text);
        if (!value || /^[-–—]+$/.test(value)) return;
        const code = /\b[A-Z]{2,8}\d{2,4}[A-Za-z0-9]*\b/.exec(cell.title || value)?.[0];
        if (!code) fail('Có ô lịch chứa nội dung chưa nhận diện được môn học.');
        const ranges = [...value.matchAll(/\b([01]?\d|2[0-3])[:h]([0-5]\d)\s*[-–—~]\s*([01]?\d|2[0-3])[:h]([0-5]\d)\b/gi)];
        if (ranges.length !== 1) fail('Một buổi học chưa có giờ rõ ràng hoặc chứa nhiều khoảng giờ. Không đoán giờ từ slot.');
        const range = ranges[0], start = range[1].padStart(2, '0') + ':' + range[2], end = range[3].padStart(2, '0') + ':' + range[4];
        if (start >= end) fail('Giờ kết thúc trên FAP không hợp lệ.');
        const room = text(cell.room || /\bat\s+([^()]+?)(?=\s+(?:attended|absent|not yet)|\s*\(|$)/i.exec(value)?.[1] || '');
        const name = text(cell.title || code);
        const event = { code, name, room, day: days[index], start, end };
        const key = JSON.stringify(event);
        if (!seen.has(key)) { seen.add(key); events.push(event); }
      });
    }
    if (!events.length && !(options.allowEmpty && records.rows.length > 0)) fail('Chưa thấy buổi học trên FAP. Không xác nhận được lịch tuần trống.');
    return { schoolId: 'fpt-qn', complete: true, days, events };
  }
  function readDocument(doc, options = {}) {
    const yearSelect = doc.querySelector('select[id*="year" i], select[name*="year" i]');
    const year = yearSelect ? Number(yearSelect.value) : null;
    const container = doc.getElementById('weekly-timetable-container');
    let referenceDate = container?.getAttribute('data-reference-date') || container?.getAttribute('data-date') || null;
    if (/^20\d{2}-\d{2}-\d{2}(?:T|$)/.test(referenceDate || '')) referenceDate = referenceDate.slice(0, 10);
    const week = doc.querySelector('input[type="week"]')?.value;
    if (!referenceDate && /^20\d{2}-W\d{2}$/.test(week || '')) {
      const january4 = new Date(Date.UTC(+week.slice(0, 4), 0, 4));
      january4.setUTCDate(january4.getUTCDate() - (january4.getUTCDay() || 7) + 1 + (+week.slice(6) - 1) * 7);
      referenceDate = january4.toISOString().slice(0, 10);
    }
    const tables = [...doc.querySelectorAll('table')].sort((a, b) => a.querySelectorAll('table').length - b.querySelectorAll('table').length);
    for (const table of tables) {
      // ASP.NET tables can place header rows directly in tbody, without a thead.
      const explicitHeaders = [...table.querySelectorAll('thead tr')];
      const headerRows = explicitHeaders.length ? explicitHeaders : [...table.querySelectorAll('tr')];
      const headerRow = headerRows.reverse().find(row => [...row.querySelectorAll('th,td')].filter(cell => /\b\d{1,2}\/\d{1,2}\b/.test(cell.textContent)).length === 7);
      if (!headerRow) continue;
      const headers = [...headerRow.querySelectorAll('th,td')].map(cell => text(cell.textContent)).filter(value => /\b\d{1,2}\/\d{1,2}\b/.test(value));
      const rows = [];
      const bodyRows = [...table.querySelectorAll('tbody tr')];
      for (const row of bodyRows.length ? bodyRows : table.querySelectorAll('tr')) {
        const cells = [...(row.children || [])].filter(cell => /^(TD|TH)$/.test(cell.tagName));
        if (!cells.length || !/^(?:slot\s*)?\d+\b/i.test(text(cells[0].textContent))) continue;
        if (cells.length !== 8) fail('Bảng FAP có cột gộp hoặc cấu trúc chưa được hỗ trợ.');
        rows.push(cells.slice(1).map(cell => {
          const titles = cell.querySelectorAll('.weekly-timetable-cell-title, [title="Lớp học"], [title="Class"], .text-primary.fw-semibold');
          const titleTexts = [...new Set([...titles].map(el => text(el.textContent)).filter(Boolean))];
          if (titleTexts.length > 1) fail('Một ô có nhiều lớp học; cần kiểm tra cấu trúc trước khi nhập.');
          const room = cell.querySelector('[title="Phòng"], [title="Room"]');
          return { text: cell.innerText || cell.textContent, title: titleTexts[0] || '', room: room?.textContent || '' };
        }));
      }
      return parse({ headers, year, referenceDate, rows }, options);
    }
    fail('Không tìm thấy bảng Weekly timetable của FAP. Hãy mở lịch tuần và chờ tải xong.');
  }
  const api = { parse, readDocument };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LichHocFptParser = api;
})(globalThis);
