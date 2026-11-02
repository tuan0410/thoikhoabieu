/* Trang Tổng quan: lịch hôm nay, bài cần nộp, biểu đồ tuần, tiến độ môn. */
(function (LH) {
  "use strict";
  LH.views = LH.views || {};

  LH.views["tong-quan"] = function (now) {
    if (!LH.COURSES.length) return '<section class="intro"><span class="eyebrow">Xin chào, ' + LH.esc(LH.state.user.name) + '</span><h2>Bắt đầu tạo lịch học của bạn</h2><p class="muted">Tài khoản của bạn chưa có dữ liệu. Hãy nhập học kỳ và thêm môn học đầu tiên.</p></section><section class="card"><h2>Lịch học theo cách của bạn</h2><p>Thêm môn học, lịch học hằng tuần, bài tập và lịch kiểm tra. Mọi thông tin được lưu riêng trong tài khoản.</p><a class="btn action-link" href="#quan-ly" data-go="quan-ly">Thiết lập lịch cá nhân</a></section>';
    var ts = LH.todaySessions(now), nowM = now.getHours() * 60 + now.getMinutes();
    var weekly = LH.weekSessions(now);
    var totalH = weekly.reduce(function (a, s) { return a + LH.sesHours(s); }, 0);
    var tasks = LH.allTasks(now);
    var upcoming = tasks.filter(function (t) { var n = LH.dayDiff(t.due, now); return !t.done && n >= 0 && n <= 7; });
    var open = tasks.filter(function (t) { return !t.done; }).slice(0, 5);
    var pct = LH.semesterProgress(now);
    var liveName = "";

    var tl = ts.map(function (s) {
      var c = LH.course(s.c), live = nowM >= LH.mins(s.s) && nowM < LH.mins(s.e), past = nowM >= LH.mins(s.e), st;
      if (live) {
        st = '<span class="pill live">Đang học · còn ' + (LH.mins(s.e) - nowM) + ' phút</span>';
        liveName = c.name;
      } else if (past) {
        st = '<span class="pill">Đã xong</span>';
      } else {
        var w = LH.mins(s.s) - nowM;
        st = '<span class="pill warn">Sau ' + (w >= 60 ? Math.floor(w / 60) + " giờ " + (w % 60 ? w % 60 + " phút" : "") : w + " phút") + '</span>';
      }
      return '<li class="tl-item' + (past ? " past" : "") + (live ? " now" : "") + '" style="--cc:' + c.color + '"><div class="tl-time num"><b>' + s.s + '</b>' + s.e + '</div>' +
        '<div><div class="tl-name"><i class="dot"></i>' + LH.esc(c.name) + '</div><div class="tl-meta">' + LH.esc(s.type) + ' · ' + LH.esc(s.room) + '</div></div>' + st + '</li>';
    }).join("");

    var greet = ts.length ? "Hôm nay bạn có " + ts.length + " buổi học" : "Hôm nay không có lịch học";

    var courseBars = LH.COURSES.map(function (c) {
      var done = LH.sessionsDone(c.id, now), tot = LH.sessionsTotal(c.id);
      return LH.bar(c.name, c.color, done + "/" + tot + " buổi", tot ? Math.round(done / tot * 100) : 0);
    }).join("");

    return '<section class="intro"><span class="eyebrow">' + LH.weekLabel(now) + '</span><h2>' + greet + '</h2><span class="muted">' + LH.DAY_NAMES[now.getDay()] + ', ' + LH.fmtDate(now) + (liveName ? ' · đang học ' + LH.esc(liveName) : "") + '</span></section>' +
      '<section class="stats">' +
      '<div class="stat"><span class="k">Môn học hôm nay</span><span class="v num">' + ts.length + '<small>buổi</small></span><span class="d">' + (ts.length ? "từ " + ts[0].s + " đến " + ts[ts.length - 1].e : "Ngày nghỉ") + '</span></div>' +
      '<div class="stat"><span class="k">Giờ học tuần này</span><span class="v num">' + LH.fmtH(totalH) + '<small>giờ</small></span><span class="d">' + weekly.length + ' buổi, ' + LH.COURSES.length + ' môn</span></div>' +
      '<div class="stat"><span class="k">Deadline 7 ngày tới</span><span class="v num">' + upcoming.length + '<small>bài</small></span><span class="d">' + (upcoming.length ? "Gần nhất: " + LH.fmtShort(upcoming[0].due) : "Không có bài sắp đến hạn") + '</span></div>' +
      '<div class="stat"><span class="k">Tiến độ học kỳ</span><span class="v num">' + pct + '<small>%</small></span><span class="d">Còn ' + Math.max(0, Math.min(LH.TOTAL_WEEKS, Math.ceil(LH.dayDiff(LH.semesterEnd(), now) / 7))) + ' tuần nữa</span></div></section>' +
      '<section class="grid-2"><div class="card lift"><div class="card-head"><h2>Lịch học hôm nay</h2><span class="sub">' + LH.DAY_NAMES[now.getDay()] + '</span></div>' +
      (ts.length ? '<ul class="timeline">' + tl + '</ul>' : '<div class="empty">Không có buổi học nào. Dùng thời gian này để làm bài tập.</div>') + '</div>' +
      '<div class="card lift"><div class="card-head"><h2>Việc cần nộp</h2><a class="sub" href="#bai-tap" data-go="bai-tap">Xem tất cả</a></div>' +
      (open.length ? '<ul class="task-list">' + open.map(function (t) { return LH.taskItem(t, now); }).join("") + '</ul>' : '<div class="empty">Không có bài tập chưa nộp.</div>') + '</div></section>' +
      '<section class="grid-2"><div class="card"><div class="card-head"><h2>Giờ học trong tuần</h2><span class="sub">Đơn vị: giờ</span></div>' + LH.weekChart(now) + '</div>' +
      '<div class="card"><div class="card-head"><h2>Số buổi đã học theo môn</h2><span class="sub">Tính đến hôm nay</span></div><div class="bars">' + courseBars + '</div></div></section>';
  };
})(window.LH = window.LH || {});
