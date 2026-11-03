(function (LH) {
  'use strict';
  var schoolId = 'uth', waiting = false, lastSeen = null, polling = false, syncError = '';
  function versionAtLeast(actual, minimum) {
    var a = String(actual || '').split('.').map(Number), b = minimum.split('.').map(Number);
    if (a.length !== 3 || a.some(function (n) { return !Number.isInteger(n) || n < 0; })) return false;
    for (var i = 0; i < 3; i++) { if (a[i] !== b[i]) return a[i] > b[i]; }
    return true;
  }
  LH.schools = [];
  LH.syncStatus = { lastSync: null, pendingUntil: null };
  function bridge(type, payload) {
    return new Promise(function (resolve, reject) {
      var requestId = crypto.randomUUID();
      var timeout = setTimeout(function () { window.removeEventListener('message', receive); reject(new Error('Chưa tìm thấy tiện ích Neon. Hãy cài tiện ích rồi tải lại trang này.')); }, 5000);
      function receive(event) {
        if (event.source !== window || event.origin !== location.origin || event.data?.channel !== 'LICHHOC_EXTENSION' || event.data.requestId !== requestId) return;
        clearTimeout(timeout); window.removeEventListener('message', receive);
        if (event.data.error) reject(new Error(event.data.error)); else resolve(event.data.result);
      }
      window.addEventListener('message', receive);
      window.postMessage({ channel: 'LICHHOC_WEB', requestId: requestId, type: type, payload: payload }, location.origin);
    });
  }
  LH.sync = {
    load: async function () {
      var responses = await Promise.all([LH.api('schools'), LH.api('sync/status')]);
      LH.schools = responses[0].schools;
      LH.syncStatus = responses[1];
      lastSeen = responses[1].lastSync?.importedAt || null;
    },
    reset: function () {
      LH.mobile?.reset();
      waiting = false; syncError = ''; lastSeen = null; LH.syncStatus = { lastSync: null, pendingUntil: null };
    },
    refresh: async function () {
      if (!LH.state.user || LH.state.busy || polling) return;
      polling = true;
      var userId = LH.state.user.id;
      try {
        var status = await LH.api('sync/status');
        if (LH.state.user?.id !== userId) return;
        LH.syncStatus = status;
        if (status.lastSync && status.lastSync.importedAt !== lastSeen) {
          var payload = await LH.api('data');
          if (LH.state.user?.id !== userId || LH.state.busy) return;
          LH.applyData(payload);
          lastSeen = status.lastSync.importedAt;
          var sourceName = LH.schools.find(function (s) { return s.id === status.lastSync.schoolId; })?.name || 'trường';
          LH.notice('Đã nhận ' + status.lastSync.count + (status.lastSync.mode === 'exams' ? ' lịch thi từ ' : ' buổi học từ ') + sourceName + '.');
          LH.render();
        } else if (LH.state.view === 'dong-bo') LH.render();
      } catch (error) { if (document.visibilityState === 'visible') LH.notice(error.message, true); }
      finally { polling = false; }
    },
    init: function () {
      LH.mobile?.init(function () { return schoolId; });
      document.addEventListener('change', function (event) {
        if (event.target.id !== 'syncSchool') return;
        schoolId = event.target.value;
        syncError = '';
        LH.render();
      });
      document.addEventListener('click', async function (event) {
        var action = event.target.closest('[data-sync-action]');
        if (!action || !LH.state.user || LH.state.busy || waiting) return;
        var type = action.dataset.syncAction;
        if (type === 'refresh') { await LH.sync.refresh(); return; }
        if (type === 'view-week') {
          if (LH.syncStatus.lastSync.mode === 'exams') { LH.go('lich-thi'); return; }
          var day = new Date(LH.syncStatus.lastSync.from + 'T00:00:00');
          LH.state.weekOffset = Math.round(LH.dayDiff(LH.weekStart(day), LH.weekStart(new Date())) / 7);
          LH.go('thoi-khoa-bieu'); return;
        }
        waiting = true;
        syncError = '';
        try {
          if (type === 'connect') {
            var selected = LH.schools.find(function (s) { return s.id === schoolId; });
            if (!selected?.enabled) throw new Error('Trường này chưa được hỗ trợ.');
            var requestedSchoolId = selected.id;
            action.disabled = true;
            LH.render();
            if (LH.mobile?.available()) { await LH.mobile.connect(selected); return; }
            if (LH.mobile?.phoneBrowser()) throw new Error('Bạn đang dùng web/PWA trên điện thoại. Để đọc lịch trường trực tiếp, hãy dùng bản app Android/iPhone có bộ đọc tích hợp. Điện thoại không cần cài tiện ích máy tính.');
            var extension = await bridge('PING');
            var minimum = location.origin === 'https://schedule-information.vercel.app' ? '0.4.2' : requestedSchoolId === 'fpt-qn' ? '0.4.0' : '0.1.0';
            if (!versionAtLeast(extension?.version, minimum)) throw new Error('Hãy cài tiện ích ' + minimum + ' trở lên, tải lại tiện ích rồi tải lại trang này.');
            var ticket = await LH.api('sync/ticket', 'POST', { schoolId: requestedSchoolId });
            try { await bridge('CONNECT', ticket); }
            catch (error) { await LH.api('sync/ticket', 'DELETE'); throw error; }
            LH.syncStatus.pendingUntil = ticket.expires;
            LH.syncStatus.pendingSchoolId = requestedSchoolId;
            LH.notice('Đã mở ' + selected.name + '. ' + (requestedSchoolId === 'fpt-qn' ? 'Chọn FU–Quy Nhơn, tự đăng nhập rồi vào Weekly timetable.' : 'Hãy tự đăng nhập rồi mở lịch tuần.') + ' Bấm Đọc lịch trong bảng Neon.');
          } else if (type === 'cancel') {
            await LH.api('sync/ticket', 'DELETE');
            bridge('DISCONNECT').catch(function () {});
            LH.syncStatus.pendingUntil = null;
            LH.notice('Đã hủy phiên đồng bộ.');
          }
        } catch (error) { syncError = error.message; LH.notice(error.message, true); }
        finally { waiting = false; LH.render(); }
      });
      setInterval(function () {
        if (LH.state.view === 'dong-bo' && document.visibilityState === 'visible') LH.sync.refresh();
      }, 4000);
      window.addEventListener('focus', function () { if (LH.state.view === 'dong-bo') LH.sync.refresh(); });
    },
    view: function () {
      var selected = LH.schools.find(function (s) { return s.id === schoolId; });
      var active = LH.syncStatus.pendingUntil > Date.now(), previous = LH.syncStatus.lastSync;
      var label = selected?.id === 'uth' ? 'UTH' : selected?.id === 'fpt-qn' ? 'FUQN' : selected?.name || 'trường';
      var pendingLabel = LH.schools.find(function (school) { return school.id === LH.syncStatus.pendingSchoolId; })?.name || label;
      var options = LH.schools.map(function (s) {
        return '<option value="' + LH.esc(s.id) + '"' + (s.id === schoolId ? ' selected' : '') + '>' + LH.esc(s.name) + '</option>';
      }).join('');
      return '<section class="intro"><span class="eyebrow">Kết nối trường của bạn</span><h2>Đồng bộ lịch học</h2><p class="muted">Chọn trường, đăng nhập tại cổng sinh viên và xem trước lịch trước khi nhập vào tài khoản này.</p></section>' +
        (LH.mobile ? LH.mobile.view(schoolId) : '') +
        '<section class="card sync-card"><div class="card-head"><h2>Chọn trường</h2><span class="pill">Demo · UTH & FPT</span></div><div class="field"><label for="syncSchool">Bạn là sinh viên trường nào?</label><select id="syncSchool">' + options + '</select></div>' +
        (syncError ? '<p class="note" role="alert">' + LH.esc(syncError) + '</p>' : '') +
        (selected?.enabled ? '<p class="muted">Cổng sinh viên: <a href="' + selected.portalUrl + '" target="_blank" rel="noopener noreferrer">' + LH.esc(selected.portalUrl) + '</a></p>' + (selected.id === 'fpt-qn' ? '<p class="note">Trên FAP, chọn FU–Quy Nhơn rồi mở Weekly timetable. Trong bảng tiện ích 0.4.4, chọn thứ hai đầu kỳ và chủ nhật cuối kỳ, bấm Đọc cả học kỳ. Chỉ gửi sau khi đã đọc đủ các tuần.</p>' : '') + '<div class="row-actions"><button class="btn" data-sync-action="connect"' + (waiting ? ' disabled' : '') + '>' + (waiting ? 'Đang kết nối…' : 'Kết nối và mở lịch ' + LH.esc(label)) + '</button>' + (active ? '<button class="text-btn" data-sync-action="cancel">Hủy phiên</button>' : '') + '</div>' : '<p class="muted">Trường này chưa có bộ kết nối trong bản demo. Bạn vẫn có thể <a href="#quan-ly" data-go="quan-ly">tự nhập lịch</a>. Các trường khác sẽ được bổ sung tại đây.</p>') + '</section>' +
        '<section class="card"><div class="card-head"><h2>Trạng thái đồng bộ</h2><button class="text-btn" data-sync-action="refresh">Kiểm tra lại</button></div>' +
        (active ? '<p class="pill warn">Đang chờ lịch từ ' + LH.esc(pendingLabel) + ' · phiên có hiệu lực 10 phút</p><p>Trên tab trường vừa mở, tự đăng nhập rồi vào lịch tuần. Trong bảng Neon, chọn Đọc lịch tuần → kiểm tra bản xem trước → Gửi về Neon.</p>' : '<p class="muted">' + (previous ? 'Phiên nhập lịch đã kết thúc. Kết nối lại để cập nhật tuần khác.' : 'Chưa nhập lịch từ trường.') + '</p>') +
        (previous ? '<div class="sync-result"><b>Đã nhập ' + previous.count + (previous.mode === 'exams' ? ' lịch thi' : ' buổi học') + '</b><p>Khoảng ngày ' + LH.fmtDate(new Date(previous.from + 'T00:00:00')) + ' – ' + LH.fmtDate(new Date(previous.to + 'T00:00:00')) + '</p><p class="muted">Lần nhận gần nhất: ' + LH.esc(new Date(previous.importedAt).toLocaleString('vi-VN')) + '</p><button class="btn" data-sync-action="view-week">' + (previous.mode === 'exams' ? 'Xem lịch thi' : 'Xem tuần vừa nhập') + '</button></div>' : '') + '</section>' +
        (LH.mobile?.available() ? '' : '<section class="card"><h2>Đồng bộ trên máy tính</h2><ol class="sync-steps"><li><a href="/downloads/lichhoc-schools-extension.zip" download>Tải tiện ích Neon 0.4.4 · UTH & FPT</a> và giải nén.</li><li>Mở <code>chrome://extensions</code> hoặc <code>edge://extensions</code>, bật Chế độ dành cho nhà phát triển.</li><li>Chọn Load unpacked, chọn thư mục chứa <code>manifest.json</code>. Khi cập nhật, tải ZIP mới rồi Reload tiện ích.</li><li>Tải lại trang, chọn trường và kết nối.</li></ol><p class="muted">Tiện ích này dành cho máy tính. Bản app mobile dùng bộ đọc tích hợp.</p></section>') +
        '<section class="card"><h2>Phạm vi bản demo</h2><p>Đọc tuần đang hiển thị trên cổng trường khi bạn bấm nút. Chỉ cập nhật lịch của trường đã chọn trong tuần đó, giữ lịch nhập tay và các tuần khác. Muốn nhập tuần khác, đổi tuần trên cổng trường rồi kết nối lại.</p><p class="muted">Chưa chạy đồng bộ nền hoặc đọc LMS. FPT hỗ trợ đọc lịch thi trên /ExamSchedule; chỉ đọc bảng đang hiển thị. Bộ đọc UTH/FAP cần được kiểm chứng trên tài khoản thật; nếu không nhận diện đủ ngày và giờ, tiện ích sẽ báo lỗi.</p></section>';
    }
  };
})(window.LH = window.LH || {});



