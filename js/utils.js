/* Tiện ích chung: lưu trữ, chuỗi, thời gian, biểu tượng. */
(function (LH) {
  "use strict";

  /* Lưu trữ nhẹ trên trình duyệt. store(key) đọc, store(key, value) ghi. */
  LH.store = function (key, val) {
    try {
      if (val === undefined) {
        var r = localStorage.getItem(key);
        return r ? JSON.parse(r) : null;
      }
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { /* trình duyệt chặn lưu trữ */ }
    return null;
  };

  LH.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };

  LH.mins = function (t) { var p = t.split(":"); return +p[0] * 60 + +p[1]; };
  LH.pad = function (n) { return n < 10 ? "0" + n : "" + n; };
  LH.sod = function (d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); };
  LH.dayDiff = function (a, b) { return Math.round((LH.sod(a) - LH.sod(b)) / 864e5); };
  LH.dow = function (d) { return d.getDay() === 0 ? 7 : d.getDay(); }; /* 1 = thứ hai ... 7 = chủ nhật */
  LH.fmtDate = function (d) { return LH.pad(d.getDate()) + "/" + LH.pad(d.getMonth() + 1) + "/" + d.getFullYear(); };
  LH.fmtShort = function (d) { return LH.pad(d.getDate()) + "/" + LH.pad(d.getMonth() + 1); };
  LH.fmtH = function (h) { return (Math.round(h * 10) / 10).toLocaleString("vi-VN"); };

  var ICONS = {
    home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    book: '<path d="M4 4h12a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3z"/><path d="M4 17a3 3 0 0 1 3-3h12"/>',
    task: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l3 3 5-6"/>',
    exam: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>'
  };
  LH.icon = function (name) {
    return '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + ICONS[name] + '</svg>';
  };
})(window.LH = window.LH || {});
