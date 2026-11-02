/* Bộ đọc độc lập: chỉ nhận ngày và giờ hiển thị, không đọc cookie, token hoặc mật khẩu. */
(function (root) {
  'use strict';
  const normalize = value => String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  function fail(message) { throw new Error(message); }
  function dateOf(text) {
    const matches = [...text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/g)];
    if (matches.length !== 1) return null;
    const [, day, month, year] = matches[0];
    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const date = new Date(iso + 'T00:00:00Z');
    return !isNaN(date) && date.toISOString().slice(0, 10) === iso ? iso : null;
  }
  function parse(records) {
    const byDate = new Map();
    for (const item of records.headers) {
      const label = normalize(item.text), day = dateOf(label);
      if (!day || !/(thứ\s*[2-7]|chủ\s*nhật)/i.test(label) || item.width <= 0 || item.height <= 0 || label.length > 100) continue;
      const old = byDate.get(day);
      if (!old || item.width * item.height < old.width * old.height) byDate.set(day, { ...item, day });
    }
    const headers = [...byDate.values()].sort((a, b) => a.day.localeCompare(b.day));
    if (headers.length !== 7) fail('Chưa nhận diện đủ 7 cột ngày. Hãy mở lịch tuần trên máy tính, chờ tải xong rồi đọc lại.');
    const first = new Date(headers[0].day + 'T00:00:00Z');
    if (first.getUTCDay() !== 1) fail('Không nhận diện được tuần từ thứ hai đến chủ nhật.');
    headers.forEach((header, i) => {
      const date = new Date(first); date.setUTCDate(date.getUTCDate() + i);
      if (header.day !== date.toISOString().slice(0, 10)) fail('Các cột ngày không thuộc cùng một tuần.');
    });
    if (!records.cards.length) fail('Chưa thấy thẻ lịch học để đọc. Nếu tuần trống, bản demo sẽ giữ nguyên dữ liệu đã nhập để tránh xóa nhầm.');
    const events = [], seen = new Set();
    for (const card of records.cards) {
      if (card.width <= 0 || card.height <= 0) continue;
      const text = normalize(card.text);
      const range = /\b([01]?\d|2[0-3]):([0-5]\d)\s*[-–—~]\s*([01]?\d|2[0-3]):([0-5]\d)\b/.exec(text);
      if (!range) fail('Có buổi học chưa đọc được giờ bắt đầu/kết thúc. Không nhập dữ liệu để tránh thiếu lịch.');
      const start = range[1].padStart(2, '0') + ':' + range[2], end = range[3].padStart(2, '0') + ':' + range[4];
      if (start >= end) fail('Phát hiện giờ học không hợp lệ.');
      const lines = card.lines.map(normalize).filter(Boolean);
      const name = lines.find(line => !/^(tiết\s*:|phòng\s*:|lms\b|\d{6,15}$)/i.test(line) && !/\d{1,2}:\d{2}/.test(line));
      if (!name || name.length > 100) fail('Chưa đọc được tên môn học.');
      const code = lines.find(line => /^\d{6,15}$/.test(line)) || '';
      const roomLine = lines.find(line => /^phòng\s*:/i.test(line));
      const room = roomLine ? roomLine.replace(/^phòng\s*:\s*/i, '') : '';
      const center = card.left + card.width / 2;
      const closest = headers.map(header => ({ ...header, distance: Math.abs(header.left + header.width / 2 - center) })).sort((a, b) => a.distance - b.distance);
      // Ambiguous placement is rejected instead of assigning a class to the wrong day.
      if (closest[0].distance > closest[0].width / 2 + 12 || (closest[1] && Math.abs(closest[1].distance - closest[0].distance) < 5)) fail('Không xác định chắc chắn ngày của một buổi học. Hãy mở rộng cửa sổ rồi đọc lại.');
      const event = { name, code, room, day: closest[0].day, start, end };
      const key = JSON.stringify(event);
      if (!seen.has(key)) { seen.add(key); events.push(event); }
    }
    if (!events.length) fail('Không có buổi học hợp lệ để nhập.');
    return { schoolId: 'uth', complete: true, days: headers.map(h => h.day), events };
  }
  function readDocument(doc) {
    const box = node => {
      const rect = node.getBoundingClientRect();
      return { text: node.innerText || '', left: rect.left, width: rect.width, height: rect.height };
    };
    const headers = [...doc.querySelectorAll('th, [role="columnheader"], p, span, div')].map(box);
    const signature = node => /tiết\s*:/i.test(node.innerText || '') && /phòng\s*:/i.test(node.innerText || '');
    const cards = [...doc.querySelectorAll('div')].filter(node => signature(node) && ![...node.querySelectorAll('div')].some(signature)).map(node => {
      let lines = [...node.querySelectorAll('p, span, a')].filter(child => !child.querySelector('p, span, a')).map(child => child.innerText || '');
      if (!lines.length) lines = (node.innerText || '').split(/\n/);
      return { ...box(node), lines };
    });
    return parse({ headers, cards });
  }
  const api = { parse, readDocument };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LichHocUthParser = api;
})(globalThis);
