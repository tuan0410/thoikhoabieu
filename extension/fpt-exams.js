(function (root) {
  'use strict';
  const text = value => String(value || '').replace(/\s+/g, ' ').trim();
  const normalize = value => text(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const aliases = {
    date: ['ngay', 'ngay thi', 'date', 'exam date'], time: ['thoi gian', 'gio', 'gio thi', 'time', 'exam time'],
    course: ['mon thi', 'mon hoc', 'mon', 'course', 'course code', 'subject', 'subject code'],
    room: ['phong', 'phong thi', 'room', 'location'], type: ['loai lich', 'type', 'schedule type'],
    exam: ['ky thi', 'exam', 'exam type'], form: ['hinh thuc thi', 'hinh thuc', 'form', 'format'],
    duration: ['thoi luong', 'duration', 'duration minutes']
  };
  const keyOf = value => Object.keys(aliases).find(key => aliases[key].includes(normalize(value)));
  function fail(message) { throw new Error(message); }
  function parse(records) {
    if (!Array.isArray(records) || !records.length) fail('Không có dòng lịch thi để nhập.');
    const exams = [], seen = new Map();
    records.forEach((row, index) => {
      const prefix = 'Dòng lịch thi ' + (index + 1) + ': ';
      const rawDate = text(row.date);
      const match = /\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/.exec(rawDate);
      const isoMatch = /\b(20\d{2})-(\d{2})-(\d{2})\b/.exec(rawDate);
      const day = match ? match[3] + '-' + match[2].padStart(2, '0') + '-' + match[1].padStart(2, '0') : isoMatch?.[0];
      const date = day ? new Date(day + 'T00:00:00Z') : null;
      if (!date || isNaN(date) || date.toISOString().slice(0, 10) !== day) fail(prefix + 'thiếu hoặc sai ngày thi đầy đủ năm.');
      const course = text(row.course), code = /\b[A-Z]{2,8}\d{2,4}[A-Za-z0-9]*\b/.exec(course)?.[0];
      if (!code) fail(prefix + 'không đọc được mã môn thi.');
      const rawTime = text(row.time).replace(/\s/g, '');
      const timePattern = '(?:[01]?\\d|2[0-3])(?:[:h.][0-5]\\d|h)?';
      const range = new RegExp('^(' + timePattern + ')[-–—~](' + timePattern + ')$', 'i').exec(rawTime);
      function mins(value) { const parts = value.replace(/h$/i, '').split(/[:h.]/i); return Number(parts[0]) * 60 + Number(parts[1] || 0); }
      let start, duration;
      if (range) { start = mins(range[1]); duration = mins(range[2]) - start; }
      else if (new RegExp('^' + timePattern + '$', 'i').test(rawTime) && /^\d{1,3}(?:\s*(?:phút|minutes|min))?$/i.test(text(row.duration))) {
        start = mins(rawTime); duration = parseInt(row.duration, 10);
      } else fail(prefix + 'chưa có đủ giờ bắt đầu/kết thúc hoặc thời lượng. Không đoán giờ thi.');
      if (!Number.isInteger(duration) || duration <= 0 || duration > 600 || start + duration > 1440) fail(prefix + 'thời lượng thi không hợp lệ.');
      const form = [row.type, row.exam, row.form].map(text).filter(Boolean).join(' · ');
      if (!form) fail(prefix + 'thiếu loại/kỳ/hình thức thi để phân biệt các lần thi.');
      const identity = code + '|' + form;
      const exam = { code, name: course, day, time: String(Math.floor(start / 60)).padStart(2, '0') + ':' + String(start % 60).padStart(2, '0'), dur: duration, room: text(row.room).replace(/^[-–—]$/, ''), form };
      const previous = seen.get(identity);
      if (previous && JSON.stringify(previous) !== JSON.stringify(exam)) fail(prefix + 'nhiều lịch cùng mã môn/loại thi; chưa xác định được lịch nào cần cập nhật.');
      if (!previous) { seen.set(identity, exam); exams.push(exam); }
    });
    return { mode: 'exams', schoolId: 'fpt-qn', complete: true, exams };
  }
  function extract(doc) {
    for (const table of doc.querySelectorAll('table')) {
      let mapping = null;
      const rows = [...table.querySelectorAll('tr')];
      for (const row of rows) {
        const cells = [...row.children].filter(cell => /^(TH|TD)$/.test(cell.tagName));
        const columns = {};
        cells.forEach((cell, index) => { const key = keyOf(cell.textContent); if (key) columns[key] = index; });
        if (['date', 'time', 'course'].every(key => columns[key] !== undefined)) { mapping = columns; break; }
      }
      const records = [];
      for (const row of rows) {
        const cells = [...row.children].filter(cell => cell.tagName === 'TD');
        if (!cells.length) continue;
        const record = {};
        cells.forEach((cell, index) => {
          const key = keyOf(cell.getAttribute('data-label')) || (mapping && Object.keys(mapping).find(key => mapping[key] === index));
          if (key) record[key] = text(cell.textContent);
        });
        if (keyOf(record.date) === 'date' || (!record.date && !record.course)) continue;
        if (record.date || record.course) records.push(record);
      }
      if (records.length) return records;
    }
    fail('Chưa nhận diện được bảng ExamSchedule. Bấm Xuất mẫu chẩn đoán rồi gửi file JSON để chỉnh bộ đọc; không cần ảnh.');
  }
  function diagnostics(doc) {
    return { version: 1, page: '/ExamSchedule', tables: [...doc.querySelectorAll('table')].map(table => ({
      rows: [...table.querySelectorAll('tr')].slice(0, 5).map(row => [...row.children].filter(cell => /^(TH|TD)$/.test(cell.tagName)).map(cell => ({
        tag: cell.tagName, label: keyOf(cell.getAttribute('data-label')) || null,
        heading: keyOf(cell.textContent) || null,
        date: /\b(?:\d{1,2}\/\d{1,2}\/20\d{2}|20\d{2}-\d{2}-\d{2})\b/.exec(text(cell.textContent))?.[0] || null,
        time: /^(?:\d{1,2}[:h.]\d{2})\s*[-–—]\s*(?:\d{1,2}[:h.]\d{2})$/.test(text(cell.textContent)) ? text(cell.textContent) : null
      })))
    })) };
  }
  const api = { parse, extract, readDocument: doc => parse(extract(doc)), diagnostics };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.LichHocFptExams = api;
})(globalThis);
