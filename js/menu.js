/* Menu sidebar trên điện thoại: mở bằng nút, đóng khi bấm nền mờ. */
(function (LH) {
  "use strict";

  var sidebar, scrim;

  LH.menu = {
    close: function () {
      sidebar.classList.remove("open");
      scrim.classList.remove("show");
      document.getElementById("menuBtn").setAttribute("aria-expanded", "false");
    },
    open: function () {
      sidebar.classList.add("open");
      scrim.classList.add("show");
      document.getElementById("menuBtn").setAttribute("aria-expanded", "true");
    },
    init: function () {
      sidebar = document.getElementById("sidebar");
      scrim = document.getElementById("scrim");
      document.getElementById("menuBtn").addEventListener("click", LH.menu.open);
      scrim.addEventListener("click", LH.menu.close);
      document.addEventListener("keydown", function (e) { if (e.key === "Escape") LH.menu.close(); });
    }
  };
})(window.LH = window.LH || {});
