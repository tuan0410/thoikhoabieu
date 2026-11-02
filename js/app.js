/* Điểm khởi động. Tài khoản và dữ liệu được nạp trước khi hiển thị lịch. */
(function (LH) {
  "use strict";
  LH.menu.init();
  LH.pwa.init();
  LH.theme.init();
  LH.bindEvents();
  LH.sync.init();
  LH.auth.init();
  setInterval(function () {
    if (!LH.state.user || LH.state.busy || document.querySelector('#view form')) return;
    var el = document.activeElement;
    if (!el || !el.matches('input, select, textarea, button, a, [contenteditable]')) LH.render();
  }, 60000);
})(window.LH = window.LH || {});
