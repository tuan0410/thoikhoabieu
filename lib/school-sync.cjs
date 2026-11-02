'use strict';
const { createHash } = require('node:crypto');
const SCHOOLS = [
  { id: 'uth', name: 'UTH · Đại học Giao thông vận tải TP.HCM', portalUrl: 'https://portal.ut.edu.vn/', calendarUrl: 'https://portal.ut.edu.vn/calendar', enabled: true },
  { id: 'fpt-qn', name: 'FPT Quy Nhơn', portalUrl: 'https://fap.fpt.edu.vn/', calendarUrl: 'https://fap.fpt.edu.vn/', enabled: true },
  { id: 'other', name: 'Trường khác · sắp hỗ trợ', portalUrl: null, calendarUrl: null, enabled: false }
];
function error(message) { throw Object.assign(new Error(message), { status: 400 }); }
function iso(value) {
  if (typeof value !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(value)) error('Ngày lịch không hợp lệ.');
  const parsed = new Date(value + 'T00:00:00Z');
  if (isNaN(parsed) || parsed.toISOString().slice(0, 10) !== value) error('Ngày lịch không hợp lệ.');
  return value;
}
function str(value, max, required = true) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) error('Nội dung lịch không hợp lệ.');
  return value.trim();
}
const stableId = (prefix, value) => prefix + createHash('sha256').update(value).digest('hex').slice(0, 24);
function mergeSchoolSchedule(current, snapshot, provider) {
  if (snapshot?.mode === 'semester') {
    if (snapshot.schoolId !== provider || snapshot.complete !== true || !Array.isArray(snapshot.weeks) || snapshot.weeks.length < 1 || snapshot.weeks.length > 52) error('Dữ liệu học kỳ chưa đầy đủ.');
    let data = current, count = 0, replaced = 0, from, to;
    for (const week of snapshot.weeks) {
      if (week?.mode === 'semester') error('Không nhận học kỳ lồng nhau.');
      const result = mergeSchoolSchedule(data, week, provider);
      if (to) {
        const expected = new Date(to + 'T00:00:00Z'); expected.setUTCDate(expected.getUTCDate() + 1);
        if (result.summary.from !== expected.toISOString().slice(0, 10)) error('Học kỳ có tuần thiếu, trùng hoặc sai thứ tự.');
      }
      from ||= result.summary.from;
      to = result.summary.to;
      data = result.data; count += result.summary.count; replaced += result.summary.replaced;
    }
    return { data, summary: { schoolId: provider, mode: 'semester', weeks: snapshot.weeks.length, from, to, count, replaced } };
  }
  const school = SCHOOLS.find(s => s.id === provider && s.enabled);
  if (!school || !snapshot || snapshot.schoolId !== provider || snapshot.complete !== true || !Array.isArray(snapshot.days) || snapshot.days.length !== 7) error('Cần đọc đủ 7 ngày của một tuần trước khi đồng bộ.');
  const days = snapshot.days.map(iso).sort();
  const first = new Date(days[0] + 'T00:00:00Z');
  if (first.getUTCDay() !== 1) error('Lịch tuần phải bắt đầu từ thứ hai.');
  for (let i = 0; i < 7; i++) {
    const expected = new Date(first); expected.setUTCDate(first.getUTCDate() + i);
    if (expected.toISOString().slice(0, 10) !== days[i]) error('Các ngày phải thuộc cùng một tuần liên tiếp.');
  }
  if (!Array.isArray(snapshot.events) || snapshot.events.length > 100) error('Danh sách lịch học không hợp lệ.');
  const next = structuredClone(current);
  const removed = next.sessions.filter(s => s.provider === provider && days.includes(s.day)).length;
  next.sessions = next.sessions.filter(s => !(s.provider === provider && days.includes(s.day)));
  const seen = new Set();
  for (const row of snapshot.events) {
    if (!row || typeof row !== 'object') error('Buổi học không hợp lệ.');
    const day = iso(row.day);
    if (!days.includes(day)) error('Buổi học nằm ngoài tuần đang đồng bộ.');
    const name = str(row.name, 100), code = str(row.code || '', 30, false), room = str(row.room || '', 100, false);
    if (![row.start, row.end].every(t => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t)) || row.start >= row.end) error('Giờ buổi học không hợp lệ.');
    const courseId = stableId(provider + '_c_', code || name.toLocaleLowerCase('vi-VN'));
    const id = stableId(provider + '_s_', [courseId, day, row.start, row.end, room].join('|'));
    if (seen.has(id)) continue;
    seen.add(id);
    let course = next.courses.find(c => c.id === courseId);
    if (course && course.provider !== provider) error('Mã môn học trùng với dữ liệu nhập tay.');
    if (!course) {
      course = { id: courseId, name, code, teacher: '', credits: 0, color: `var(--c${next.courses.length % 7 + 1})`, provider };
      next.courses.push(course);
    } else { course.name = name; course.code = code; }
    next.sessions.push({ id, c: courseId, d: new Date(day + 'T00:00:00Z').getUTCDay() || 7,
      s: row.start, e: row.end, room, type: 'Lịch ' + school.name, day, provider });
  }
  next.settings.school = school.name;
  return { data: next, summary: { schoolId: provider, from: days[0], to: days[6], count: seen.size, replaced: removed } };
}
const mergeUthSchedule = (current, snapshot) => mergeSchoolSchedule(current, snapshot, 'uth');
module.exports = { SCHOOLS, mergeUthSchedule, mergeSchoolSchedule };
