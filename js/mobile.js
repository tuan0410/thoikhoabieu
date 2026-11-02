(function (LH) {
  'use strict';
  var preview = null, owner = null, values = {}, saving = false;
  function native() { return !!window.LHNative?.available(); }
  function fields(school) {
    if (!values[school]) {
      var start = LH.state.data?.settings?.start || '', end = new Date(start + 'T00:00:00Z');
      end.setUTCDate(end.getUTCDate() + (LH.state.data?.settings?.weeks || 15) * 7 - 1);
      values[school] = { mode: school === 'fpt-qn' ? 'semester' : 'week', start: start, end: isNaN(end) ? '' : end.toISOString().slice(0, 10) };
    }
    return values[school];
  }
  LH.mobile = {
    available: native,
    reset: function () { preview = null; owner = null; values = {}; },
    async connect(school) {
      if (!native()) throw new Error('Đồng bộ trực tiếp trên điện thoại cần bản app Android/iPhone. PWA không đọc được tab cổng trường.');
      var userId = LH.state.user.id, options = Object.assign({ schoolId: school.id }, fields(school.id));
      preview = null; owner = null;
      if (options.mode === 'semester') {
        var first = new Date(options.start + 'T00:00:00Z'), last = new Date(options.end + 'T00:00:00Z');
        if (isNaN(first) || isNaN(last) || first.getUTCDay() !== 1 || last.getUTCDay() !== 0 || last < first || (last - first) / 86400000 >= 364) throw new Error('Chọn thứ hai đầu kỳ và chủ nhật cuối kỳ, tối đa 52 tuần.');
      }
      var result = await window.LHNative.read(options);
      if (LH.state.user?.id !== userId) throw new Error('Tài khoản đã thay đổi. Hãy đọc lịch lại.');
      if (!result?.snapshot || result.snapshot.schoolId !== school.id || result.snapshot.complete !== true) throw new Error('Bản đọc lịch không hợp lệ.');
      preview = result.snapshot; owner = userId;
      LH.notice('Đã đọc lịch. Kiểm tra bản xem trước rồi bấm Lưu vào tài khoản.');
    },
    view: function (school) {
      if (!native()) return '<section class="card"><h2>Đồng bộ trên điện thoại</h2><p>Bản app Android/iPhone có bộ đọc cổng trường tích hợp. Bản web/PWA vẫn dùng chung tài khoản và lịch đã lưu. Bản app đang trong giai đoạn kiểm thử, chưa có gói phát hành.</p></section>';
      var v = fields(school), e = LH.esc;
      var html = '<section class="card"><h2>Nhập lịch từ điện thoại</h2><p>Tự đăng nhập tại cổng trường trong app, mở lịch rồi bấm Đọc lịch ở thanh trên cùng. Dữ liệu chỉ được lưu sau khi bạn xác nhận.</p><div class="field"><label for="mobileMode">Phạm vi</label><select id="mobileMode" data-mobile-field="mode"><option value="week"' + (v.mode === 'week' ? ' selected' : '') + '>Tuần đang mở</option>' + (school === 'fpt-qn' ? '<option value="semester"' + (v.mode === 'semester' ? ' selected' : '') + '>Cả học kỳ</option><option value="exams"' + (v.mode === 'exams' ? ' selected' : '') + '>Lịch thi đang hiển thị</option>' : '') + '</select></div>';
      if (v.mode === 'semester') html += '<div class="field"><label for="mobileStart">Thứ hai đầu kỳ</label><input id="mobileStart" type="date" data-mobile-field="start" value="' + e(v.start) + '"></div><div class="field"><label for="mobileEnd">Chủ nhật cuối kỳ</label><input id="mobileEnd" type="date" data-mobile-field="end" value="' + e(v.end) + '"></div>';
      html += '<p class="muted">FPT: hỗ trợ đọc cả kỳ và lịch thi. UTH: hiện đọc tuần đang mở. Đăng nhập qua Google có thể không được cổng trường cho phép trong app; nếu bị chặn, app sẽ không tự vượt qua bước đăng nhập.</p>';
      if (preview && owner === LH.state.user?.id && preview.schoolId === school) {
        var rows = preview.mode === 'semester' ? preview.weeks.flatMap(function (w) { return w.events; }) : preview.mode === 'exams' ? preview.exams : preview.events;
        html += '<h3>Bản xem trước: ' + rows.length + (preview.mode === 'exams' ? ' lịch thi' : ' buổi học') + '</h3>';
        if (preview.mode === 'semester') html += '<p>' + preview.weeks.length + ' tuần; ' + preview.weeks.filter(function (w) { return !w.events.length; }).length + ' tuần trống. Lịch FPT cũ trong khoảng nhập sẽ được thay thế, kể cả tuần trống.</p>';
        html += '<details><summary>Xem chi tiết trước khi lưu</summary><ul>' + rows.map(function (r) { return '<li>' + e([r.day, r.start || r.time, r.end || '', r.code, r.name || r.form, r.room].filter(Boolean).join(' · ')) + '</li>'; }).join('') + '</ul></details><button class="btn" data-mobile-save' + (saving ? ' disabled' : '') + '>Lưu vào tài khoản</button><button class="text-btn" data-mobile-discard>Bỏ bản đọc</button>';
      }
      return html + '</section>';
    },
    init: function (selectedSchool) {
      document.addEventListener('change', function (event) {
        var key = event.target.dataset?.mobileField;
        if (!['mode', 'start', 'end'].includes(key)) return;
        fields(selectedSchool())[key] = event.target.value; preview = null;
        if (key === 'mode') LH.render();
      });
      document.addEventListener('click', async function (event) {
        if (event.target.closest('[data-mobile-discard]')) { preview = null; LH.render(); return; }
        if (!event.target.closest('[data-mobile-save]') || saving || !preview || owner !== LH.state.user?.id) return;
        saving = true;
        try {
          var userId = owner, snapshot = preview;
          await LH.api('sync/mobile/import', 'POST', snapshot);
          if (LH.state.user?.id !== userId) return;
          preview = null;
          LH.applyData(await LH.api('data'));
          await LH.sync.refresh();
          LH.notice('Đã lưu lịch vào tài khoản. Web và app dùng chung dữ liệu.');
        } catch (error) { LH.notice(error.message, true); }
        finally { saving = false; LH.render(); }
      });
    }
  };
})(window.LH = window.LH || {});
