/* Chuyển trang và vẽ lại giao diện: topbar, sidebar, nội dung. */
(function (LH) {
  "use strict";

  function renderNav(now) {
    var open = LH.allTasks(now).filter(function (t) { return !t.done; }).length;
    document.getElementById("nav").innerHTML = '<div class="nav-label">Trang</div>' + LH.VIEWS.map(function (v) {
      return '<a href="#' + v.id + '" data-go="' + v.id + '"' + (v.id === LH.state.view ? ' aria-current="page"' : "") + '>' +
        LH.icon(v.icon) + v.title + (v.id === "bai-tap" && open ? '<span class="badge num">' + open + '</span>' : "") + '</a>';
    }).join("");

    document.getElementById("sideFoot").innerHTML = '<b>' + LH.weekLabel(now) + '</b>' +
      '<div class="track"><div class="fill" style="width:' + LH.semesterProgress(now) + '%;background:var(--accent)"></div></div>' +
      '<span class="note">Học kỳ bắt đầu ' + LH.fmtDate(LH.SEM_START) + '</span>';
  }

  LH.render = function () {
    if (!LH.state.user || !LH.state.data) return;
    var now = new Date();
    var current = LH.VIEWS.filter(function (v) { return v.id === LH.state.view; })[0];
    var drafts = {};
    document.querySelectorAll('#view form[data-draft-key]').forEach(function (form) {
      drafts[form.dataset.draftKey] = Array.from(form.elements).filter(function (el) { return el.name; }).map(function (el) {
        return { name: el.name, value: el.value };
      });
    });
    document.getElementById("view").innerHTML = LH.views[LH.state.view](now);
    document.querySelectorAll('#view form[data-draft-key]').forEach(function (form) {
      (drafts[form.dataset.draftKey] || []).forEach(function (entry) {
        var el = form.elements.namedItem(entry.name);
        if (el) el.value = entry.value;
      });
    });
    document.getElementById("pageTitle").textContent = current.title;
    document.getElementById("dateChip").textContent = LH.DAY_NAMES[now.getDay()] + ", " + LH.fmtDate(now);
    document.getElementById("semesterName").textContent = LH.state.data.settings.name;
    renderNav(now);
  };

  LH.go = function (id) {
    if (!LH.state.user || LH.state.busy) return;
    if (!LH.isView(id)) id = "tong-quan";
    LH.state.view = id;
    LH.render();
    LH.menu.close();
    window.scrollTo(0, 0);
    if (location.hash !== '#' + id) location.hash = id;
  };

  LH.isView = function (id) {
    return LH.VIEWS.some(function (view) { return view.id === id; });
  };
})(window.LH = window.LH || {});
