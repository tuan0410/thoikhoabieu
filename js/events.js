/* Thao tác trên dữ liệu cá nhân; chỉ cập nhật giao diện sau khi máy chủ đã lưu. */
(function (LH) {
  "use strict";
  var kinds = ['courses', 'sessions', 'exams', 'tasks'];
  function upsert(data, kind, item) {
    var index = data[kind].findIndex(function (row) { return row.id === item.id; });
    if (index < 0) data[kind].push(item); else data[kind][index] = item;
  }
  function focusEditor(kind) {
    var id = kind === 'tasks' ? 'taskForm' : kind + 'Form';
    var form = document.getElementById(id);
    if (form) { form.scrollIntoView({ behavior: 'smooth', block: 'center' }); form.querySelector('input, select').focus(); }
  }
  LH.bindEvents = function () {
    document.addEventListener('click', async function (e) {
      if (!LH.state.user || LH.state.busy) return;
      var go = e.target.closest('[data-go]');
      if (go) { e.preventDefault(); LH.go(go.getAttribute('data-go')); return; }
      var week = e.target.closest('[data-week]');
      if (week) {
        var step = Number(week.getAttribute('data-week'));
        LH.state.weekOffset = step ? Math.max(-104, Math.min(104, (LH.state.weekOffset || 0) + step)) : 0;
        LH.render(); return;
      }
      var edit = e.target.closest('[data-edit]');
      if (edit) {
        var kind = edit.getAttribute('data-edit');
        if (kinds.indexOf(kind) < 0) return;
        LH.state.editing[kind] = edit.getAttribute('data-id');
        LH.go(kind === 'tasks' ? 'bai-tap' : 'quan-ly');
        focusEditor(kind);
        return;
      }
      var cancel = e.target.closest('[data-cancel]');
      if (cancel) {
        delete LH.state.editing[cancel.getAttribute('data-cancel')];
        LH.render();
        return;
      }
      var del = e.target.closest('[data-delete]');
      if (del) {
        var removeKind = del.getAttribute('data-delete'), id = del.getAttribute('data-id');
        if (kinds.indexOf(removeKind) < 0) return;
        var item = LH.state.data[removeKind].find(function (row) { return row.id === id; });
        if (!item) return;
        var question = removeKind === 'courses'
          ? 'Xóa môn “' + item.name + '” cùng tất cả buổi học, bài tập và lịch kiểm tra của môn này?'
          : 'Xóa mục này khỏi tài khoản?';
        if (!window.confirm(question)) return;
        if (await LH.commit(function (data) {
          data[removeKind] = data[removeKind].filter(function (row) { return row.id !== id; });
          if (removeKind === 'courses') ['sessions', 'exams', 'tasks'].forEach(function (key) {
            data[key] = data[key].filter(function (row) { return row.c !== id; });
          });
        })) {
          LH.state.editing = {};
          LH.render();
        }
        return;
      }
      var check = e.target.closest('[data-check]');
      if (check) {
        var taskId = check.getAttribute('data-check');
        if (await LH.commit(function (data) {
          var task = data.tasks.find(function (row) { return row.id === taskId; });
          if (task) task.done = !task.done;
        })) LH.render();
        return;
      }
      var chip = e.target.closest('[data-chip]');
      if (chip) {
        var cid = chip.getAttribute('data-chip');
        LH.state.hidden[cid] = !LH.state.hidden[cid];
        LH.render();
        return;
      }
      var filter = e.target.closest('[data-filter]');
      if (filter) { LH.state.filter = filter.getAttribute('data-filter'); LH.render(); }
    });
    document.addEventListener('submit', async function (e) {
      var form = e.target;
      if (!['taskForm', 'settingsForm', 'coursesForm', 'sessionsForm', 'examsForm'].includes(form.id)) return;
      e.preventDefault();
      if (!LH.state.user || LH.state.busy) return;
      var values = new FormData(form), kind, item;
      var val = function (name) { return String(values.get(name) || '').trim(); };
      if (form.id === 'settingsForm') {
        if (new Date(val('start') + 'T00:00:00').getDay() !== 1) {
          LH.notice('Ngày bắt đầu học kỳ phải là thứ hai.', true); return;
        }
        var settings = { school: val('school'), name: val('semester'), start: val('start'), weeks: Number(val('weeks')) };
        if (await LH.commit(function (data) { data.settings = settings; })) LH.render();
        return;
      }
      if (form.id === 'coursesForm') {
        kind = 'courses';
        item = { name: val('courseName'), code: val('code'), teacher: val('teacher'), credits: Number(val('credits')), color: val('color') };
        if (LH.editItem('courses').provider) item.provider = LH.editItem('courses').provider;
      } else if (form.id === 'sessionsForm') {
        kind = 'sessions';
        if (val('from') >= val('to')) { LH.notice('Giờ kết thúc phải sau giờ bắt đầu.', true); return; }
        item = { c: val('c'), d: Number(val('d')), s: val('from'), e: val('to'), room: val('sessionRoom'), type: val('sessionType') };
        var oldSession = LH.editItem('sessions');
        if (oldSession.day) {
          item.day = oldSession.day;
          item.d = oldSession.d;
          if (oldSession.provider) item.provider = oldSession.provider;
        }
        var overlapping = LH.SESSIONS.find(function (s) {
          return s.id !== LH.state.editing.sessions && s.d === item.d && (!item.day || !s.day || s.day === item.day) && s.s < item.e && s.e > item.s;
        });
        if (overlapping) { LH.notice('Buổi học trùng giờ với môn ' + LH.course(overlapping.c).name + '. Hãy kiểm tra lại.', true); return; }
      } else if (form.id === 'examsForm') {
        kind = 'exams';
        item = { c: val('c'), day: val('examDay'), time: val('examTime'), dur: Number(val('duration')), room: val('examRoom'), form: val('examForm') };
      } else {
        kind = 'tasks';
        var previous = LH.editItem('tasks');
        item = { c: val('fCourse'), title: val('fTitle'), due: val('fDue'), done: !!previous.done };
      }
      item.id = LH.state.editing[kind] || LH.uid();
      if (await LH.commit(function (data) { upsert(data, kind, item); })) {
        delete LH.state.editing[kind];
        form.reset();
        LH.render();
        focusEditor(kind);
      }
    });
    window.addEventListener('hashchange', function () {
      var h = location.hash.slice(1);
      if (h !== LH.state.view) LH.go(h);
    });
  };
})(window.LH = window.LH || {});
