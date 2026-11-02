/* Trang Môn học: thẻ thông tin và tiến độ từng môn. */
(function (LH) {
  "use strict";
  LH.views = LH.views || {};

  LH.views["mon-hoc"] = function (now) {
    var tasks = LH.allTasks(now);

    var cards = LH.COURSES.map(function (c) {
      var ss = LH.SESSIONS.filter(function (s) { return s.c === c.id; }).sort(function (a, b) { return a.d - b.d; });
      var hrs = LH.weekSessions(now).filter(function (s) { return s.c === c.id; }).reduce(function (a, s) { return a + LH.sesHours(s); }, 0);
      var done = LH.sessionsDone(c.id, now), tot = LH.sessionsTotal(c.id);
      var pend = tasks.filter(function (t) { return t.c === c.id && !t.done; }).length;

      return '<article class="card course" style="--cc:' + c.color + '"><div><div class="code">' + LH.esc(c.code) + '</div><h3>' + LH.esc(c.name) + '</h3></div>' +
        '<dl class="kv"><dt>Giảng viên</dt><dd>' + LH.esc(c.teacher || 'Chưa cập nhật') + '</dd><dt>Số tín chỉ</dt><dd class="num">' + (c.provider && !c.credits ? 'Chưa cập nhật' : c.credits) + '</dd><dt>Giờ học tuần này</dt><dd class="num">' + LH.fmtH(hrs) + ' giờ</dd>' +
        '<dt>Lịch học</dt><dd>' + ss.map(function (s) { return (s.day ? LH.fmtShort(new Date(s.day + 'T00:00:00')) : s.d === 7 ? 'CN' : "T" + (s.d + 1)) + " " + s.s; }).join(", ") + '</dd><dt>Bài chưa nộp</dt><dd class="num">' + pend + '</dd></dl>' +
        '<div class="bar-row"><div class="bar-top"><span>Số buổi đã học</span><span class="muted num">' + done + '/' + tot + '</span></div><div class="track"><div class="fill" style="width:' + (tot ? Math.round(done / tot * 100) : 0) + '%"></div></div></div></article>';
    }).join("");

    var credits = LH.COURSES.reduce(function (a, c) { return a + c.credits; }, 0);
    return '<section class="intro"><span class="eyebrow">' + LH.COURSES.length + ' môn · ' + credits + ' tín chỉ</span><h2>Môn học kỳ này</h2><a href="#quan-ly" data-go="quan-ly">Thêm hoặc sửa môn học</a></section>' + (cards ? '<div class="course-grid">' + cards + '</div>' : '<div class="empty">Chưa có môn học.</div>');
  };
})(window.LH = window.LH || {});
