/* Trang Thời khóa biểu: lưới giờ x thứ, ẩn/hiện môn, đường giờ hiện tại. */
(function (LH) {
  "use strict";
  LH.views = LH.views || {};

  LH.views["thoi-khoa-bieu"] = function (now) {
    var actualNow = now;
    now = new Date(now); now.setDate(now.getDate() + (LH.state.weekOffset || 0) * 7);
    var pager = '<div class="week-pager"><button class="chip" data-week="-1">← Tuần trước</button><button class="chip" data-week="0">Tuần hiện tại</button><button class="chip" data-week="1">Tuần sau →</button></div>';
    if (!LH.SESSIONS.length) return '<section class="intro"><h2>Thời khóa biểu</h2></section><div class="empty">Bạn chưa có buổi học nào. <a href="#quan-ly" data-go="quan-ly">Thêm lịch học</a></div>';
    if (!LH.weekSessions(now).length) {
      return '<section class="intro"><span class="eyebrow">' + LH.fmtDate(LH.weekStart(now)) + '</span><h2>Thời khóa biểu</h2></section>' + pager + '<div class="empty">Không có lịch học trong tuần này.</div>';
    }
    var H0 = Math.min(7, Math.floor(Math.min.apply(null, LH.SESSIONS.map(function (s) { return LH.mins(s.s); })) / 60));
    var H1 = Math.max(18, Math.ceil(Math.max.apply(null, LH.SESSIONS.map(function (s) { return LH.mins(s.e); })) / 60)), PX = 60;
    var gridHeight = (H1 - H0) * PX;
    var today = LH.state.weekOffset ? 0 : LH.dow(actualNow), mon = LH.weekStart(now);
    var nm = now.getHours() * 60 + now.getMinutes();

    var chips = LH.COURSES.map(function (c) {
      return '<button class="chip" data-chip="' + c.id + '" aria-pressed="' + !LH.state.hidden[c.id] + '" style="--cc:' + c.color + '"><i class="dot"></i>' + LH.esc(c.name) + '</button>';
    }).join("");

    var mobile = '<div class="mobile-agenda">';
    var head = '<div class="tt-h"></div>', cols = '<div class="tt-hours" style="height:' + gridHeight + 'px">';
    for (var h = H0; h <= H1; h++) {
      cols += '<span class="num" style="top:' + ((h - H0) * PX) + 'px">' + (h < 10 ? "0" : "") + h + ':00</span>';
    }
    cols += '</div>';

    for (var d = 1; d <= 7; d++) {
      var dt = new Date(mon);
      dt.setDate(mon.getDate() + d - 1);
      head += '<div class="tt-h' + (d === today ? " today" : "") + '"><b>' + LH.DAY_NAMES[d % 7] + '</b><span class="num">' + LH.fmtShort(dt) + '</span></div>';

      var inner = "";
      var daily = LH.SESSIONS.filter(function (s) { return LH.sessionOn(s, dt) && !LH.state.hidden[s.c]; }).sort(function (a, b) { return a.s.localeCompare(b.s); });
      mobile += '<section class="card agenda-day' + (d === today ? ' today' : '') + '"><h3>' + LH.DAY_NAMES[d % 7] + ' <span class="num">' + LH.fmtShort(dt) + '</span></h3>' + (daily.length ? '<ul class="agenda-list">' : '<p class="muted">Không có buổi học.</p>');
      daily.forEach(function (s) {
        var c = LH.course(s.c);
        var top = (LH.mins(s.s) - H0 * 60) / 60 * PX;
        var hh = (LH.mins(s.e) - LH.mins(s.s)) / 60 * PX - 3;
        inner += '<div class="ses" style="--cc:' + c.color + ';top:' + top + 'px;height:' + hh + 'px"><b><i class="dot"></i>' + LH.esc(c.name) + '</b><span class="num">' + s.s + ' – ' + s.e + '</span><span>' + LH.esc(s.room) + '</span></div>';
        mobile += '<li style="--cc:' + c.color + '"><div class="num agenda-time">' + s.s + '<br>' + s.e + '</div><div><b>' + LH.esc(c.name) + '</b><div class="muted">' + LH.esc(s.room || 'Chưa có phòng') + ' · ' + LH.esc(s.type) + '</div></div></li>';
      });
      mobile += (daily.length ? '</ul>' : '') + '</section>';
      if (d === today && nm >= H0 * 60 && nm <= H1 * 60) {
        inner += '<div class="nowline" style="top:' + ((nm - H0 * 60) / 60 * PX) + 'px"></div>';
      }
      cols += '<div class="tt-col' + (d === today ? " today" : "") + '" style="height:' + gridHeight + 'px">' + inner + '</div>';
    }

    var sat = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
    return '<section class="intro"><span class="eyebrow">' + LH.fmtDate(mon) + ' – ' + LH.fmtDate(sat) + '</span><h2>Thời khóa biểu theo tuần</h2><span class="muted">Bấm vào tên môn để ẩn hoặc hiện trên lịch. Đường đỏ là giờ hiện tại.</span></section>' +
      pager + '<div class="chips">' + chips + '</div>' +
      '<div class="tt-scroll"><div class="tt">' + head + cols + '</div></div>' + mobile + '</div>';
  };
})(window.LH = window.LH || {});
