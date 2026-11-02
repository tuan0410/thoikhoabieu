/* Logic lịch học: tuần học, buổi học, tiến độ, bài tập và hạn nộp. */
(function (LH) {
  "use strict";

  LH.course = function (id) {
    for (var i = 0; i < LH.COURSES.length; i++) if (LH.COURSES[i].id === id) return LH.COURSES[i];
    return LH.COURSES[0];
  };

  LH.semesterEnd = function () {
    var end = LH.sod(LH.SEM_START);
    end.setDate(end.getDate() + LH.TOTAL_WEEKS * 7);
    return end;
  };

  LH.inSemester = function (now) {
    return now >= LH.SEM_START && now < LH.semesterEnd();
  };

  LH.semesterProgress = function (now) {
    return Math.max(0, Math.min(100, Math.floor(LH.dayDiff(now, LH.SEM_START) / (LH.TOTAL_WEEKS * 7) * 100)));
  };

  LH.weekLabel = function (now) {
    if (now < LH.SEM_START) return "Học kỳ chưa bắt đầu";
    if (now >= LH.semesterEnd()) return "Học kỳ đã kết thúc";
    return "Tuần " + LH.curWeek(now) + " / " + LH.TOTAL_WEEKS;
  };

  /* Tuần 0 trước học kỳ; giới hạn tối đa TOTAL_WEEKS. */
  LH.curWeek = function (now) {
    var w = Math.floor(LH.dayDiff(now, LH.SEM_START) / 7) + 1;
    return Math.max(0, Math.min(LH.TOTAL_WEEKS, w));
  };

  LH.sesHours = function (s) { return (LH.mins(s.e) - LH.mins(s.s)) / 60; };

  LH.isoDate = function (date) { return date.getFullYear() + '-' + LH.pad(date.getMonth() + 1) + '-' + LH.pad(date.getDate()); };
  LH.weekStart = function (date) {
    var monday = LH.sod(date); monday.setDate(monday.getDate() - LH.dow(date) + 1); return monday;
  };
  LH.sessionOn = function (session, date) {
    return session.day ? session.day === LH.isoDate(date) : LH.inSemester(date) && session.d === LH.dow(date);
  };
  LH.weekSessions = function (now) {
    var monday = LH.weekStart(now), sunday = new Date(monday); sunday.setDate(sunday.getDate() + 6);
    return LH.SESSIONS.filter(function (s) {
      if (s.day) return s.day >= LH.isoDate(monday) && s.day <= LH.isoDate(sunday);
      var day = new Date(monday); day.setDate(day.getDate() + s.d - 1); return LH.inSemester(day);
    });
  };

  LH.todaySessions = function (now) {
    return LH.SESSIONS
      .filter(function (s) { return LH.sessionOn(s, now); })
      .sort(function (a, b) { return LH.mins(a.s) - LH.mins(b.s); });
  };

  LH.perWeek = function (courseId, now) {
    return LH.weekSessions(now || new Date()).filter(function (s) { return s.c === courseId; }).length;
  };

  LH.sessionsTotal = function (courseId) {
    return LH.SESSIONS.filter(function (s) { return s.c === courseId; }).reduce(function (sum, s) {
      return sum + (s.day ? 1 : LH.TOTAL_WEEKS);
    }, 0);
  };

  /* Số buổi đã học của một môn tính đến hiện tại */
  LH.sessionsDone = function (courseId, now) {
    return LH.SESSIONS.filter(function (s) { return s.c === courseId; }).reduce(function (sum, s) {
      if (s.day) return sum + (new Date(s.day + 'T' + s.e + ':00') <= now ? 1 : 0);
      if (now < LH.SEM_START) return sum;
      if (now >= LH.semesterEnd()) return sum + LH.TOTAL_WEEKS;
      var completed = LH.curWeek(now) - 1;
      if (s.d < LH.dow(now) || (s.d === LH.dow(now) && LH.mins(s.e) <= now.getHours() * 60 + now.getMinutes())) completed++;
      return sum + completed;
    }, 0);
  };

  /* Bài tập thuộc tài khoản hiện tại, sắp theo hạn nộp. */
  LH.allTasks = function (now) {
    var list = LH.TASKS.map(function (t) {
      return { id: t.id, c: t.c, title: t.title, due: new Date(t.due + "T00:00:00"), done: t.done };
    });
    return list.sort(function (a, b) { return a.due - b.due; });
  };

  /* Nhãn và màu trạng thái hạn nộp */
  LH.dueInfo = function (t, now) {
    var n = LH.dayDiff(t.due, now);
    if (t.done) return { label: "Đã nộp", cls: "ok", n: n };
    if (n < 0) return { label: "Quá hạn " + (-n) + " ngày", cls: "crit", n: n };
    if (n === 0) return { label: "Hôm nay", cls: "crit", n: n };
    if (n === 1) return { label: "Ngày mai", cls: "warn", n: n };
    return { label: "Còn " + n + " ngày", cls: n <= 3 ? "warn" : "", n: n };
  };
})(window.LH = window.LH || {});
