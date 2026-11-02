(function (LH) {
  "use strict";
  LH.views = LH.views || {};
  LH.field = function (label, name, value, type, extra) {
    return '<div class="field"><label for="' + name + '">' + label + '</label><input id="' + name + '" name="' + name + '" type="' + (type || 'text') + '" value="' + LH.esc(value == null ? '' : value) + '" ' + (extra || '') + '></div>';
  };
  LH.courseOptions = function (selected) {
    return LH.COURSES.map(function (c) { return '<option value="' + c.id + '"' + (c.id === selected ? ' selected' : '') + '>' + LH.esc(c.name) + '</option>'; }).join('');
  };
  LH.editItem = function (kind) {
    return LH.state.data[kind].find(function (item) { return item.id === LH.state.editing[kind]; }) || {};
  };
  LH.editButtons = function (kind, id) {
    return '<div class="row-actions"><button class="text-btn" data-edit="' + kind + '" data-id="' + id + '">Sửa</button><button class="text-btn danger" data-delete="' + kind + '" data-id="' + id + '">Xóa</button></div>';
  };
  LH.formButtons = function (kind, item) {
    return '<div class="row-actions"><button class="btn" type="submit">' + (item.id ? 'Lưu thay đổi' : 'Thêm') + '</button>' + (item.id ? '<button type="button" class="text-btn" data-cancel="' + kind + '">Hủy sửa</button>' : '') + '</div>';
  };
  LH.views['quan-ly'] = function () {
    var settings = LH.state.data.settings;
    var c = LH.editItem('courses'), s = LH.editItem('sessions'), x = LH.editItem('exams');
    var days = '';
    for (var day = 1; day <= 7; day++) days += '<option value="' + day + '"' + (s.d === day ? ' selected' : '') + '>' + LH.DAY_NAMES[day % 7] + '</option>';
    var colors = '';
    for (var i = 1; i <= 7; i++) colors += '<option value="var(--c' + i + ')"' + (c.color === 'var(--c' + i + ')' ? ' selected' : '') + '>Màu ' + i + '</option>';
    var courseRows = LH.COURSES.map(function (item) {
      return '<li class="manage-row"><div><b>' + LH.esc(item.name) + '</b><div class="muted">' + LH.esc(item.code) + ' · ' + item.credits + ' tín chỉ</div></div>' + LH.editButtons('courses', item.id) + '</li>';
    }).join('');
    var sessionRows = LH.SESSIONS.slice().sort(function (a, b) { return a.d - b.d || a.s.localeCompare(b.s); }).map(function (item) {
      return '<li class="manage-row"><div><b>' + LH.esc(LH.course(item.c).name) + '</b><div class="muted">' + (item.day ? LH.fmtDate(new Date(item.day + 'T00:00:00')) : LH.DAY_NAMES[item.d % 7]) + ' · ' + item.s + '–' + item.e + ' · ' + LH.esc(item.room) + (item.provider ? ' · từ ' + (item.provider === 'fpt-qn' ? 'FPT Quy Nhơn' : 'UTH') : '') + '</div></div>' + LH.editButtons('sessions', item.id) + '</li>';
    }).join('');
    var examRows = LH.state.data.exams.slice().sort(function (a, b) { return (a.day + a.time).localeCompare(b.day + b.time); }).map(function (item) {
      return '<li class="manage-row"><div><b>' + LH.esc(LH.course(item.c).name) + '</b><div class="muted">' + LH.fmtDate(new Date(item.day + 'T00:00:00')) + ' · ' + item.time + ' · ' + LH.esc(item.form) + '</div></div>' + LH.editButtons('exams', item.id) + '</li>';
    }).join('');
    var selectCourse = function (id, chosen) { return '<div class="field"><label for="' + id + '">Môn học</label><select id="' + id + '" name="c" required>' + LH.courseOptions(chosen) + '</select></div>'; };
    return '<section class="intro"><span class="eyebrow">Thiết lập của bạn</span><h2>Quản lý lịch cá nhân</h2><p class="muted">Bắt đầu bằng thông tin học kỳ, thêm môn học, rồi điền buổi học và lịch kiểm tra. Các thay đổi được lưu theo tài khoản.</p></section>' +
      '<section class="card"><div class="card-head"><h2>1. Trường và học kỳ</h2></div><form id="settingsForm" class="manage-form" data-draft-key="settings">' +
      LH.field('Trường đang học', 'school', settings.school, 'text', 'maxlength="160" placeholder="Nhập tên trường của bạn"') +
      LH.field('Tên học kỳ', 'semester', settings.name, 'text', 'required maxlength="80"') +
      LH.field('Thứ hai bắt đầu học kỳ', 'start', settings.start, 'date', 'required min="2000-01-01" max="2100-12-31"') +
      LH.field('Số tuần học', 'weeks', settings.weeks, 'number', 'required min="1" max="52"') +
      '<button class="btn" type="submit">Lưu học kỳ</button></form></section>' +
      '<section class="card" id="coursesPanel"><div class="card-head"><h2>2. Môn học</h2></div><form id="coursesForm" class="manage-form" data-draft-key="courses-' + (c.id || 'new') + '">' +
      LH.field('Tên môn', 'courseName', c.name, 'text', 'required maxlength="100"') +
      LH.field('Mã môn', 'code', c.code, 'text', 'maxlength="30"') +
      LH.field('Giảng viên', 'teacher', c.teacher, 'text', 'maxlength="100"') +
      LH.field('Số tín chỉ', 'credits', c.credits == null ? 3 : c.credits, 'number', 'required min="0" max="30"') +
      '<div class="field"><label for="color">Màu môn học</label><select id="color" name="color">' + colors + '</select></div>' + LH.formButtons('courses', c) + '</form>' +
      '<ul class="manage-list">' + (courseRows || '<li class="muted">Chưa có môn học. Thêm môn đầu tiên để tạo lịch.</li>') + '</ul></section>' +
      '<section class="card" id="sessionsPanel"><div class="card-head"><h2>3. Buổi học hằng tuần</h2><span class="sub">Lặp lại mỗi tuần trong học kỳ</span></div>' +
      (LH.COURSES.length ? '<form id="sessionsForm" class="manage-form" data-draft-key="sessions-' + (s.id || 'new') + '">' + selectCourse('sessionCourse', s.c) +
      '<div class="field"><label for="day">' + (s.day ? 'Ngày ' + LH.fmtDate(new Date(s.day + 'T00:00:00')) : 'Thứ') + '</label><select id="day" name="d"' + (s.day ? ' disabled' : '') + '>' + days + '</select></div>' +
      LH.field('Giờ bắt đầu', 'from', s.s || '07:00', 'time', 'required') + LH.field('Giờ kết thúc', 'to', s.e || '09:00', 'time', 'required') +
      LH.field('Phòng học', 'sessionRoom', s.room, 'text', 'maxlength="100"') + LH.field('Loại buổi học', 'sessionType', s.type || 'Lý thuyết', 'text', 'required maxlength="60"') +
      LH.formButtons('sessions', s) + '</form>' : '<p class="muted">Thêm môn học trước khi tạo buổi học.</p>') +
      (s.provider ? '<p class="note">Buổi học này nhập từ cổng trường. Đồng bộ lại tuần này sẽ cập nhật theo lịch trường.</p>' : '') + '<ul class="manage-list">' + sessionRows + '</ul></section>' +
      '<section class="card" id="examsPanel"><div class="card-head"><h2>4. Lịch kiểm tra và thi</h2></div>' +
      (LH.COURSES.length ? '<form id="examsForm" class="manage-form" data-draft-key="exams-' + (x.id || 'new') + '">' + selectCourse('examCourse', x.c) +
      LH.field('Ngày kiểm tra / thi', 'examDay', x.day, 'date', 'required min="2000-01-01" max="2100-12-31"') + LH.field('Giờ bắt đầu', 'examTime', x.time || '07:30', 'time', 'required') +
      LH.field('Thời lượng (phút)', 'duration', x.dur || 90, 'number', 'required min="1" max="600"') +
      LH.field('Phòng', 'examRoom', x.room, 'text', 'maxlength="100"') + LH.field('Tên / hình thức kiểm tra', 'examForm', x.form || 'Kiểm tra giữa kỳ', 'text', 'required maxlength="100"') +
      LH.formButtons('exams', x) + '</form>' : '<p class="muted">Thêm môn học trước khi tạo lịch kiểm tra.</p>') +
      '<ul class="manage-list">' + examRows + '</ul></section>' +
      '<section class="card"><div class="card-head"><h2>Kết nối cổng sinh viên</h2><span class="pill">Demo UTH & FPT</span></div><p>Chọn trường và nhập lịch tuần từ cổng sinh viên bằng tiện ích trình duyệt.</p><a class="btn action-link" href="#dong-bo" data-go="dong-bo">Đồng bộ lịch trường</a></section>';
  };
})(window.LH = window.LH || {});
