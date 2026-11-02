/* Trang Bài tập và deadline: form thêm bài, bộ lọc, danh sách. */
(function (LH) {
  "use strict";
  LH.views = LH.views || {};

  LH.views["bai-tap"] = function (now) {
    if (!LH.COURSES.length) return '<section class="intro"><h2>Bài tập và deadline</h2></section><div class="empty">Thêm môn học trước khi tạo bài tập. <a href="#quan-ly" data-go="quan-ly">Thêm môn học</a></div>';
    var editing = LH.editItem('tasks');
    var filter = LH.state.filter;
    var tasks = LH.allTasks(now);
    var shown = tasks.filter(function (t) { return filter === "all" || (filter === "open" ? !t.done : t.done); });

    var filters = [["all", "Tất cả"], ["open", "Chưa nộp"], ["done", "Đã nộp"]].map(function (x) {
      return '<button class="chip' + (filter === x[0] ? " sel" : "") + '" data-filter="' + x[0] + '" aria-pressed="' + (filter === x[0]) + '">' + x[1] + '</button>';
    }).join("");

    var opts = LH.courseOptions(editing.c);

    var d7 = LH.sod(now);
    d7.setDate(d7.getDate() + 7);
    var defaultDue = d7.getFullYear() + "-" + LH.pad(d7.getMonth() + 1) + "-" + LH.pad(d7.getDate());

    var openCount = tasks.filter(function (t) { return !t.done; }).length;

    return '<section class="intro"><span class="eyebrow">' + openCount + ' bài chưa nộp</span><h2>Bài tập và deadline</h2></section>' +
      '<div class="card"><div class="card-head"><h2>' + (editing.id ? 'Sửa bài tập' : 'Thêm bài tập') + '</h2><span class="sub">Lưu vào tài khoản của bạn</span></div>' +
      '<form class="form" id="taskForm" data-draft-key="tasks-' + (editing.id || 'new') + '"><div class="field"><label for="fTitle">Tên bài tập</label><input id="fTitle" name="fTitle" required maxlength="160" value="' + LH.esc(editing.title || '') + '" placeholder="Ví dụ: Bài tập chương 5"></div>' +
      '<div class="field"><label for="fCourse">Môn học</label><select id="fCourse" name="fCourse" required>' + opts + '</select></div>' +
      '<div class="field"><label for="fDue">Hạn nộp</label><input id="fDue" name="fDue" type="date" min="2000-01-01" max="2100-12-31" required value="' + (editing.due || defaultDue) + '"></div>' + LH.formButtons('tasks', editing) + '</form></div>' +
      '<div class="chips">' + filters + '</div>' +
      '<div class="card lift">' + (shown.length ? '<ul class="task-list">' + shown.map(function (t) { return LH.taskItem(t, now); }).join("") + '</ul>' : '<div class="empty">Chưa có bài nào trong mục này.</div>') + '</div>';
  };
})(window.LH = window.LH || {});
