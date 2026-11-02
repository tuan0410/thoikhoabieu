/* Giao diện sáng/tối: theo hệ thống mặc định, nút bấm để ghi đè và nhớ lựa chọn. */
(function (LH) {
  "use strict";

  var btn, mq;

  function isDark() {
    var t = document.documentElement.getAttribute("data-theme");
    return t ? t === "dark" : !!(mq && mq.matches);
  }

  function paint() {
    btn.innerHTML = LH.icon(isDark() ? "sun" : "moon");
    btn.title = isDark() ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối";
  }

  LH.theme = {
    init: function () {
      btn = document.getElementById("themeBtn");
      mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

      var saved = LH.store("lh-theme");
      if (saved === "dark" || saved === "light") document.documentElement.setAttribute("data-theme", saved);

      btn.addEventListener("click", function () {
        var next = isDark() ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        LH.store("lh-theme", next);
        paint();
      });
      if (mq && mq.addEventListener) mq.addEventListener("change", paint);
      paint();
    }
  };
})(window.LH = window.LH || {});
