/* Trang Lịch thi: bảng lịch thi và số ngày còn lại. */
(function (LH) {
  "use strict";
  LH.views = LH.views || {};

  LH.views["lich-thi"] = function (now) {
    var rows = LH.EXAMS.slice().sort(function (a, b) { return (a.day + a.time).localeCompare(b.day + b.time); }).map(function (x) {
      var c = LH.course(x.c), d = new Date(x.date[0], x.date[1] - 1, x.date[2]), n = LH.dayDiff(d, now);
      var cls = n >= 0 && n <= 14 ? "warn" : "";
      var start = new Date(d);
      start.setMinutes(LH.mins(x.time));
      var end = new Date(start.getTime() + x.dur * 60000);
      var label = now >= end ? "Đã thi" : now >= start ? "Đang thi" : n === 0 ? "Hôm nay" : "Còn " + n + " ngày";
      if (now >= start && now < end) cls = "live";
      if (now >= end) cls = "";
      return '<tr style="--cc:' + c.color + '"><td><span class="cell"><i class="dot"></i>' + LH.esc(c.name) + '</span></td>' +
        '<td class="num">' + LH.DAY_NAMES[d.getDay()] + ', ' + LH.fmtDate(d) + '</td>' +
        '<td class="num">' + x.time + ' · ' + x.dur + ' phút</td><td>' + LH.esc(x.room) + '</td><td>' + LH.esc(x.form) + '</td>' +
        '<td><span class="pill ' + cls + '">' + label + '</span></td></tr>';
    }).join("");

    if (!rows) return '<section class="intro"><h2>Lịch kiểm tra và thi</h2></section><div class="empty">Bạn chưa thêm lịch kiểm tra. <a href="#quan-ly" data-go="quan-ly">Thêm lịch</a></div>';
    return '<section class="intro"><span class="eyebrow">Lịch cá nhân</span><h2>Lịch kiểm tra và thi</h2><span class="muted">Gồm lịch nhập tay và lịch đã đồng bộ. Hãy đối chiếu với thông báo chính thức của trường.</span><a href="#quan-ly" data-go="quan-ly">Thêm hoặc sửa lịch kiểm tra</a></section>' +
      '<div class="card lift"><div class="table-wrap"><table><thead><tr><th>Môn thi</th><th>Ngày</th><th>Giờ</th><th>Phòng</th><th>Hình thức</th><th>Còn lại</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  };
})(window.LH = window.LH || {});
