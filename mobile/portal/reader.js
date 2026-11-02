(function () {
  'use strict';
  window.__lhRead = async function (options) {
    if (options.schoolId === 'fpt-qn' && location.origin === 'https://fap.fpt.edu.vn') {
      if (options.mode === 'exams' && /^\/ExamSchedule\/?$/i.test(location.pathname)) return LichHocFptExams.readDocument(document);
      if (!/(?:\/WeeklyTimetable(?:\/|$)|\/ScheduleOfWeek\.aspx$)/i.test(location.pathname)) throw new Error('Hãy mở Weekly timetable trên FAP rồi bấm Đọc lịch.');
      if (options.mode === 'semester') return LichHocSemester.readSemester(document, location.href, options.start, options.end);
      if (options.mode === 'week') return LichHocFptParser.readDocument(document);
    }
    if (options.schoolId === 'uth' && options.mode === 'week' && location.origin === 'https://portal.ut.edu.vn' && /^\/calendar\/?$/.test(location.pathname)) return LichHocUthParser.readDocument(document);
    throw new Error('Hãy tự đăng nhập và mở đúng trang lịch của trường trước khi đọc.');
  };
})();
