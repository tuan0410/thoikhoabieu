/* Các khối giao diện dùng lại ở nhiều trang: dòng bài tập, thanh tiến độ, biểu đồ tuần. */
(function (LH) {
  "use strict";

  LH.taskItem = function (t, now) {
    var c = LH.course(t.c), di = LH.dueInfo(t, now);
    return '<li class="task' + (t.done ? " done" : "") + '" style="--cc:' + c.color + '">' +
      '<button class="chk" data-check="' + LH.esc(t.id) + '" aria-pressed="' + t.done + '" aria-label="Đánh dấu đã nộp: ' + LH.esc(t.title) + '"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg></button>' +
      '<div><div class="task-title">' + LH.esc(t.title) + '</div><div class="task-sub"><span class="dot"></span>' + LH.esc(c.name) + '<span>·</span><span class="num">Hạn ' + LH.fmtShort(t.due) + '</span></div></div>' +
      '<div class="task-actions"><span class="pill ' + di.cls + '">' + di.label + '</span><button class="text-btn" data-edit="tasks" data-id="' + LH.esc(t.id) + '">Sửa</button><button class="text-btn danger" data-delete="tasks" data-id="' + LH.esc(t.id) + '">Xóa</button></div></li>';
  };

  LH.bar = function (label, color, valText, pct) {
    return '<div class="bar-row" style="--cc:' + color + '"><div class="bar-top"><span><i class="dot"></i>' + LH.esc(label) + '</span><span class="muted num">' + valText + '</span></div><div class="track"><div class="fill" style="width:' + pct + '%"></div></div></div>';
  };

  /* Biểu đồ cột: số giờ học mỗi ngày trong tuần */
  LH.weekChart = function (now) {
    var hrs = [0, 0, 0, 0, 0, 0, 0];
    LH.weekSessions(now).forEach(function (s) { hrs[s.d - 1] += LH.sesHours(s); });
    var max = Math.max.apply(null, hrs), top = Math.max(2, Math.ceil(max / 2) * 2);
    var W = 460, H = 210, L = 34, B = 30, T = 14, ph = H - B - T, bw = 38;
    var gap = (W - L - 8 - bw * 7) / 6, out = "";

    for (var g = 0; g <= top; g += 2) {
      var y = T + ph - (g / top) * ph;
      out += '<line class="grid" x1="' + L + '" x2="' + (W - 4) + '" y1="' + y + '" y2="' + y + '"/><text x="' + (L - 8) + '" y="' + (y + 4) + '" text-anchor="end">' + g + '</text>';
    }
    var today = LH.dow(now);
    hrs.forEach(function (h, i) {
      var x = L + 8 + i * (bw + gap), bh = (h / top) * ph, y2 = T + ph - bh, isT = (i + 1) === today;
      out += '<rect x="' + x + '" y="' + y2 + '" width="' + bw + '" height="' + bh + '" rx="6" style="fill:' + (isT ? "var(--accent)" : "var(--bar)") + '"/>' +
        '<text class="val" x="' + (x + bw / 2) + '" y="' + (y2 - 6) + '" text-anchor="middle">' + LH.fmtH(h) + '</text>' +
        '<text x="' + (x + bw / 2) + '" y="' + (H - 10) + '" text-anchor="middle" style="' + (isT ? "fill:var(--accent);font-weight:600" : "") + '">' + (i === 6 ? 'CN' : 'T' + (i + 2)) + '</text>';
    });
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Số giờ học mỗi ngày trong tuần">' + out + '</svg>';
  };
})(window.LH = window.LH || {});
